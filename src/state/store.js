import { signal, computed } from '@preact/signals';
import { newAccount, newLot, newTransaction, isLotZakatable, lotValueEGP } from '../models/index.js';
import { nowISO, sum, isAged, uid } from '../utils/index.js';

// ── PRIMARY SIGNALS ──────────────────────────────────────
export const accountsSig     = signal([]);
export const lotsSig         = signal([]);
export const transactionsSig = signal([]);
export const settingsSig     = signal({
  payerName: '',
  goldPricePerGram: 0,     // for nisab + gold revaluation
  silverPricePerGram: 0,
  nisabGoldGrams: 85,
  nisabSilverGrams: 595,
  hawlDays: 365,
  hawlMode: 'fifo',        // 'fifo' | 'pool'
  poolHawlAnchor: '',      // ISO date user sets when pool first hit nisab
  defaultCurrency: 'EGP',
});

// UI signals (not persisted)
export const routeSig = signal('dashboard');

// ── DERIVED (computed) ───────────────────────────────────
export const activeAccounts = computed(() =>
  accountsSig.value.filter(a => !a.archived)
);
export const activeLots = computed(() =>
  lotsSig.value.filter(l => !l.disposedAt)
);

export const netWorthEGP = computed(() =>
  sum(activeLots.value.map(lotValueEGP))
);

export const zakatableLots = computed(() =>
  activeLots.value.filter(isLotZakatable)
);
export const zakatableEGP = computed(() =>
  sum(zakatableLots.value.map(lotValueEGP))
);

export const byAssetType = computed(() => {
  const map = {};
  for (const l of activeLots.value) {
    map[l.assetType] = (map[l.assetType] || 0) + lotValueEGP(l);
  }
  return map;
});

export const accountBalance = accountId => sum(
  activeLots.value.filter(l => l.accountId === accountId).map(lotValueEGP)
);

// Aging bucket (in EGP) using zakatable lots only
export const hawlAging = computed(() => {
  const days = settingsSig.value.hawlDays || 365;
  let aged = 0, young = 0;
  for (const l of zakatableLots.value) {
    const v = lotValueEGP(l);
    if (isAged(l.acquiredAt, days)) aged += v;
    else young += v;
  }
  return { aged, young, total: aged + young };
});

// ── MUTATIONS ────────────────────────────────────────────
export function addAccount(patch = {}) {
  const a = newAccount(patch);
  accountsSig.value = [...accountsSig.value, a];
  return a;
}
export function updateAccount(id, patch) {
  accountsSig.value = accountsSig.value.map(a =>
    a.id === id ? { ...a, ...patch, updatedAt: nowISO() } : a
  );
}
export function deleteAccount(id) {
  // Refuse if there are active lots in it
  if (activeLots.value.some(l => l.accountId === id)) {
    throw new Error('لا يمكن حذف حساب يحوي أصولاً — انقل أصوله أو صفّها أولاً.');
  }
  accountsSig.value = accountsSig.value.filter(a => a.id !== id);
}

export function addLot(patch = {}) {
  const l = newLot(patch);
  // remaining = amount for cash/receivable
  if (l.assetType === 'cash' || l.assetType === 'receivable') {
    l.remaining = l.amount;
  }
  // costBasis default to current value if not provided
  if (!l.costBasis) l.costBasis = lotValueEGP(l);
  l.currentValue = lotValueEGP(l);
  lotsSig.value = [...lotsSig.value, l];
  return l;
}
export function updateLot(id, patch) {
  lotsSig.value = lotsSig.value.map(l => {
    if (l.id !== id) return l;
    const merged = { ...l, ...patch, updatedAt: nowISO() };
    if ('amount' in patch && (merged.assetType === 'cash' || merged.assetType === 'receivable')) {
      // if user manually edits amount, sync remaining if it exceeds
      merged.remaining = Math.min(merged.amount, merged.remaining ?? merged.amount);
    }
    merged.currentValue = lotValueEGP(merged);
    return merged;
  });
}
export function deleteLot(id) {
  lotsSig.value = lotsSig.value.filter(l => l.id !== id);
}

// ── TRANSACTIONS (mutate lots) ───────────────────────────
// Deposit: create a new cash lot in `toAccountId`
export function txDeposit({ toAccountId, amount, at, notes, category, ref }) {
  amount = Number(amount) || 0;
  if (amount <= 0) throw new Error('أدخل مبلغاً موجباً');
  if (!toAccountId) throw new Error('اختر الحساب المستقبل');
  const lot = addLot({
    accountId: toAccountId,
    assetType: 'cash',
    acquiredAt: at || nowISO().slice(0, 10),
    amount, remaining: amount,
    costBasis: amount, currentValue: amount,
    label: 'إيداع', notes, purpose: 'zakat',
  });
  const tx = newTransaction({
    kind: 'deposit', at, toAccountId, toLotId: lot.id,
    amount, notes, category, ref,
  });
  transactionsSig.value = [...transactionsSig.value, tx];
  return tx;
}

// Income: same as deposit, semantically labeled
export function txIncome({ toAccountId, amount, at, notes, category, ref }) {
  const tx = txDeposit({ toAccountId, amount, at, notes, category, ref });
  const patched = { ...tx, kind: 'income' };
  transactionsSig.value = transactionsSig.value.map(t => t.id === tx.id ? patched : t);
  return patched;
}

// FIFO consume `amount` of cash lots in `accountId`. Returns array [{lotId, consumed}].
// Mutates lots in place (via updateLot). If not enough available, throws.
function fifoConsume(accountId, amount, at) {
  amount = Number(amount);
  const eligible = activeLots.value
    .filter(l => l.accountId === accountId && l.assetType === 'cash' && (l.remaining || 0) > 0)
    .sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt));
  const available = sum(eligible.map(l => l.remaining));
  if (amount > available + 0.005) {
    throw new Error(`لا يوجد رصيد كافٍ في الحساب (المتاح ${available.toFixed(2)} ج.م).`);
  }
  const consumed = [];
  let need = amount;
  const now = at || nowISO();
  const newLots = lotsSig.value.map(l => l);   // shallow copy for mutation
  const idxOf = new Map(newLots.map((l, i) => [l.id, i]));
  for (const l of eligible) {
    if (need <= 0.0001) break;
    const take = Math.min(need, l.remaining);
    const i = idxOf.get(l.id);
    const updated = { ...l, remaining: +(l.remaining - take).toFixed(6), updatedAt: now };
    if (updated.remaining <= 0.0001) { updated.remaining = 0; updated.disposedAt = now; }
    updated.currentValue = updated.remaining;
    newLots[i] = updated;
    consumed.push({ lotId: l.id, acquiredAt: l.acquiredAt, consumed: take });
    need -= take;
  }
  lotsSig.value = newLots;
  return consumed;
}

// Withdraw / Expense: FIFO consume from fromAccountId
export function txWithdraw({ fromAccountId, amount, at, notes, category, ref, kind = 'withdraw' }) {
  amount = Number(amount) || 0;
  if (amount <= 0) throw new Error('أدخل مبلغاً موجباً');
  if (!fromAccountId) throw new Error('اختر الحساب المصدر');
  const consumed = fifoConsume(fromAccountId, amount, at);
  const tx = newTransaction({
    kind, at, fromAccountId, amount, notes, category, ref, consumed,
  });
  transactionsSig.value = [...transactionsSig.value, tx];
  return tx;
}
export const txExpense = args => txWithdraw({ ...args, kind: 'expense' });
export const txZakatPaid = args => txWithdraw({ ...args, kind: 'zakat_paid' });

// Transfer: FIFO consume from source, create matching lots in destination preserving acquiredAt
export function txTransfer({ fromAccountId, toAccountId, amount, at, notes, ref }) {
  amount = Number(amount) || 0;
  if (amount <= 0) throw new Error('أدخل مبلغاً موجباً');
  if (!fromAccountId || !toAccountId) throw new Error('اختر الحساب المصدر والمستقبل');
  if (fromAccountId === toAccountId) throw new Error('الحسابان متطابقان');
  const consumed = fifoConsume(fromAccountId, amount, at);
  // Create new cash lot(s) in destination preserving acquiredAt of each consumed portion
  const newLots = [];
  for (const c of consumed) {
    const lot = newLot({
      accountId: toAccountId, assetType: 'cash',
      acquiredAt: c.acquiredAt,
      amount: c.consumed, remaining: c.consumed,
      costBasis: c.consumed, currentValue: c.consumed,
      label: 'تحويل وارد',
      notes: notes ? `تحويل — ${notes}` : 'تحويل',
      purpose: 'zakat',
    });
    newLots.push(lot);
  }
  lotsSig.value = [...lotsSig.value, ...newLots];
  const tx = newTransaction({
    kind: 'transfer', at, fromAccountId, toAccountId, amount, notes, ref,
    consumed, createdLots: newLots.map(l => l.id),
  });
  transactionsSig.value = [...transactionsSig.value, tx];
  return tx;
}

// Buy asset: consume cash from fromAccountId, create asset lot with type/price
export function txBuy({ fromAccountId, toAccountId, assetType, at, notes, ref, amount, ...assetFields }) {
  amount = Number(amount) || 0;
  if (amount <= 0) throw new Error('أدخل سعر الشراء');
  fifoConsume(fromAccountId, amount, at);
  const lot = addLot({
    accountId: toAccountId || fromAccountId,
    assetType,
    acquiredAt: at || nowISO().slice(0, 10),
    costBasis: amount,
    notes,
    ...assetFields,   // weight, karat, units, unitPrice, label, purpose
  });
  const tx = newTransaction({
    kind: 'buy', at, fromAccountId, toAccountId, toLotId: lot.id,
    amount, notes, ref,
  });
  transactionsSig.value = [...transactionsSig.value, tx];
  return tx;
}

// Sell asset lot: dispose the lot, deposit proceeds into toAccountId
export function txSell({ fromLotId, toAccountId, proceeds, at, notes, ref }) {
  proceeds = Number(proceeds) || 0;
  if (proceeds <= 0) throw new Error('أدخل صافي البيع');
  const lot = lotsSig.value.find(l => l.id === fromLotId);
  if (!lot) throw new Error('الأصل غير موجود');
  const now = at || nowISO();
  updateLot(fromLotId, { disposedAt: now, remaining: 0, currentValue: 0 });
  const proceedsLot = addLot({
    accountId: toAccountId || lot.accountId,
    assetType: 'cash',
    acquiredAt: (at || nowISO()).slice(0, 10),
    amount: proceeds, remaining: proceeds,
    costBasis: proceeds, currentValue: proceeds,
    label: `بيع ${lot.label || ''}`.trim(),
    notes,
  });
  const tx = newTransaction({
    kind: 'sell', at, fromLotId, toAccountId, toLotId: proceedsLot.id,
    amount: proceeds, notes, ref,
  });
  transactionsSig.value = [...transactionsSig.value, tx];
  return tx;
}

// Revalue: change unitPrice of a lot (e.g., gold went up)
export function txRevalue({ lotId, newUnitPrice, newCurrentValue, at, notes }) {
  const lot = lotsSig.value.find(l => l.id === lotId);
  if (!lot) throw new Error('الأصل غير موجود');
  const patch = {};
  if (newUnitPrice != null) patch.unitPrice = Number(newUnitPrice) || 0;
  if (newCurrentValue != null) patch.currentValue = Number(newCurrentValue) || 0;
  updateLot(lotId, patch);
  const tx = newTransaction({ kind: 'revalue', at, fromLotId: lotId, notes });
  transactionsSig.value = [...transactionsSig.value, tx];
  return tx;
}

// Delete a transaction (does NOT reverse effects — that would require complex undo)
// We add a compensating adjustment note instead. For MVP: allow only if it was the LAST tx.
export function deleteTransaction(id) {
  transactionsSig.value = transactionsSig.value.filter(t => t.id !== id);
}

// ── SETTINGS ─────────────────────────────────────────────
export function updateSettings(patch) {
  settingsSig.value = { ...settingsSig.value, ...patch };
}
