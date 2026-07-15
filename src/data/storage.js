import { effect } from '@preact/signals';
import { accountsSig, lotsSig, transactionsSig, settingsSig } from '../state/store.js';
import { fxRatesSig } from '../state/fx.js';
import { metalPricesSig } from '../state/metals.js';

const KEY = 'personalBank.v1';
const SCHEMA_VERSION = 1;

// Read the persisted state (called once at startup)
export function hydrate() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.accounts) accountsSig.value = parsed.accounts;
    if (parsed.lots) lotsSig.value = parsed.lots;
    if (parsed.transactions) transactionsSig.value = parsed.transactions;
    if (parsed.settings) settingsSig.value = { ...settingsSig.value, ...parsed.settings };
    if (parsed.fxRates) fxRatesSig.value = { ...fxRatesSig.value, ...parsed.fxRates };
    if (parsed.metalPrices) metalPricesSig.value = { ...metalPricesSig.value, ...parsed.metalPrices };
  } catch (e) {
    console.warn('hydrate failed:', e);
  }
}

// Auto-save on any change (debounced by microtask)
let saveScheduled = false;
export function installAutoSave() {
  effect(() => {
    // read all signals so the effect tracks them
    const snap = snapshot();
    if (saveScheduled) return;
    saveScheduled = true;
    queueMicrotask(() => {
      saveScheduled = false;
      try { localStorage.setItem(KEY, JSON.stringify(snap)); }
      catch (e) { console.warn('save failed:', e); }
    });
  });
}

export function snapshot() {
  return {
    schema: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    accounts: accountsSig.value,
    lots: lotsSig.value,
    transactions: transactionsSig.value,
    settings: settingsSig.value,
    fxRates: fxRatesSig.value,
    metalPrices: metalPricesSig.value,
  };
}

// ── JSON backup: download and restore ─────────────────────
export function downloadBackup() {
  const data = snapshot();
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `personal-bank-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function restoreBackup(fileOrText, { merge = false } = {}) {
  return new Promise((resolve, reject) => {
    const apply = text => {
      try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') return reject(new Error('ملف غير صالح'));
        if (merge) {
          // merge by id (skip duplicates)
          const mergeArr = (cur, add) => {
            const ids = new Set(cur.map(x => x.id));
            return [...cur, ...(add || []).filter(x => !ids.has(x.id))];
          };
          accountsSig.value = mergeArr(accountsSig.value, parsed.accounts);
          lotsSig.value = mergeArr(lotsSig.value, parsed.lots);
          transactionsSig.value = mergeArr(transactionsSig.value, parsed.transactions);
        } else {
          if (Array.isArray(parsed.accounts)) accountsSig.value = parsed.accounts;
          if (Array.isArray(parsed.lots)) lotsSig.value = parsed.lots;
          if (Array.isArray(parsed.transactions)) transactionsSig.value = parsed.transactions;
          if (parsed.settings) settingsSig.value = { ...settingsSig.value, ...parsed.settings };
        }
        resolve(true);
      } catch (e) { reject(e); }
    };
    if (typeof fileOrText === 'string') return apply(fileOrText);
    const reader = new FileReader();
    reader.onload = () => apply(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(fileOrText);
  });
}

export function wipeAll() {
  accountsSig.value = [];
  lotsSig.value = [];
  transactionsSig.value = [];
}
