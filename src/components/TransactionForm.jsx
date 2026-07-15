import { useState } from 'preact/hooks';
import { Modal, Field } from './ui.jsx';
import { activeAccounts, activeLots, accountBalance,
  txDeposit, txIncome, txWithdraw, txExpense, txTransfer, txSell, txRevalue, txZakatPaid
} from '../state/store.js';
import { MASAREF } from '../models/index.js';
import { fmt, todayISO } from '../utils/index.js';

const KINDS = [
  { id: 'deposit',    label: '⬇ إيداع' },
  { id: 'income',     label: '➕ دخل' },
  { id: 'withdraw',   label: '⬆ سحب' },
  { id: 'expense',    label: '➖ مصروف' },
  { id: 'transfer',   label: '↔ تحويل' },
  { id: 'sell',       label: '💱 بيع أصل' },
  { id: 'revalue',    label: '📐 إعادة تقييم' },
  { id: 'zakat_paid', label: '🤲 زكاة مدفوعة' },
];

export function TransactionForm({ open, onClose, defaultKind, defaultAccountId }) {
  const [form, setForm] = useState({
    kind: defaultKind || 'deposit',
    at: todayISO(),
    fromAccountId: defaultAccountId || '',
    toAccountId: defaultAccountId || '',
    fromLotId: '',
    amount: 0,
    newUnitPrice: 0,
    category: '',
    notes: '',
    ref: '',
    masrafId: '',
    recipient: '',
  });
  const [error, setError] = useState('');

  const accts = activeAccounts.value;
  const lots = activeLots.value.filter(l => l.assetType !== 'cash' && l.assetType !== 'receivable');
  const patch = k => e => {
    const v = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setForm({ ...form, [k]: v });
    setError('');
  };

  const save = () => {
    try {
      const f = form;
      switch (f.kind) {
        case 'deposit':    txDeposit(f); break;
        case 'income':     txIncome(f); break;
        case 'withdraw':   txWithdraw(f); break;
        case 'expense':    txExpense(f); break;
        case 'zakat_paid': txZakatPaid(f); break;
        case 'transfer':   txTransfer(f); break;
        case 'sell':       txSell({ ...f, proceeds: f.amount }); break;
        case 'revalue':    txRevalue({ lotId: f.fromLotId, newUnitPrice: f.newUnitPrice, at: f.at, notes: f.notes }); break;
        default: throw new Error('نوع الحركة غير مدعوم');
      }
      onClose();
    } catch (e) {
      setError(e.message);
    }
  };

  const isDep = form.kind === 'deposit' || form.kind === 'income';
  const isOut = ['withdraw', 'expense', 'zakat_paid'].includes(form.kind);
  const isXfer = form.kind === 'transfer';
  const isSell = form.kind === 'sell';
  const isReval = form.kind === 'revalue';
  const isZakat = form.kind === 'zakat_paid';

  return (
    <Modal
      open={open}
      title="حركة جديدة"
      onClose={onClose}
      footer={<>
        <button class="btn btn-emerald" onClick={save} style="flex:1">💾 حفظ الحركة</button>
        <button class="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </>}
    >
      <div class="frow">
        <Field label="نوع الحركة">
          <select value={form.kind} onChange={patch('kind')}>
            {KINDS.map(k => <option value={k.id}>{k.label}</option>)}
          </select>
        </Field>
        <Field label="التاريخ">
          <input type="date" value={form.at} onInput={patch('at')} />
        </Field>
      </div>

      {isDep && (
        <div class="frow">
          <Field label="الحساب المستقبل">
            <select value={form.toAccountId} onChange={patch('toAccountId')}>
              <option value="">— اختر —</option>
              {accts.map(a => <option value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="المبلغ (ج.م)">
            <div class="iw"><input type="number" step="0.01" min="0" value={form.amount} onInput={patch('amount')} /><span class="unit">ج.م</span></div>
          </Field>
        </div>
      )}

      {isOut && (
        <div class="frow">
          <Field label="الحساب المصدر" hint={form.fromAccountId ? `الرصيد: ${fmt(accountBalance(form.fromAccountId))} ج.م` : ''}>
            <select value={form.fromAccountId} onChange={patch('fromAccountId')}>
              <option value="">— اختر —</option>
              {accts.map(a => <option value={a.id}>{a.name} — {fmt(accountBalance(a.id))} ج.م</option>)}
            </select>
          </Field>
          <Field label="المبلغ (ج.م)">
            <div class="iw"><input type="number" step="0.01" min="0" value={form.amount} onInput={patch('amount')} /><span class="unit">ج.م</span></div>
          </Field>
        </div>
      )}

      {isXfer && (
        <div class="frow">
          <Field label="من">
            <select value={form.fromAccountId} onChange={patch('fromAccountId')}>
              <option value="">— اختر —</option>
              {accts.map(a => <option value={a.id}>{a.name} — {fmt(accountBalance(a.id))} ج.م</option>)}
            </select>
          </Field>
          <Field label="إلى">
            <select value={form.toAccountId} onChange={patch('toAccountId')}>
              <option value="">— اختر —</option>
              {accts.map(a => <option value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="المبلغ (ج.م)">
            <div class="iw"><input type="number" step="0.01" min="0" value={form.amount} onInput={patch('amount')} /><span class="unit">ج.م</span></div>
          </Field>
        </div>
      )}

      {isSell && (
        <div class="frow">
          <Field label="الأصل المُباع">
            <select value={form.fromLotId} onChange={patch('fromLotId')}>
              <option value="">— اختر —</option>
              {lots.map(l => <option value={l.id}>{l.label || l.assetType} — {fmt(l.currentValue)} ج.م</option>)}
            </select>
          </Field>
          <Field label="حصيلة البيع (ج.م)">
            <div class="iw"><input type="number" step="0.01" min="0" value={form.amount} onInput={patch('amount')} /><span class="unit">ج.م</span></div>
          </Field>
          <Field label="الحساب الذي تدخله الحصيلة">
            <select value={form.toAccountId} onChange={patch('toAccountId')}>
              <option value="">— اختر —</option>
              {accts.map(a => <option value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
      )}

      {isReval && (
        <div class="frow">
          <Field label="الأصل">
            <select value={form.fromLotId} onChange={patch('fromLotId')}>
              <option value="">— اختر —</option>
              {lots.map(l => <option value={l.id}>{l.label || l.assetType} — {fmt(l.currentValue)} ج.م</option>)}
            </select>
          </Field>
          <Field label="سعر الوحدة الجديد (ج.م)">
            <div class="iw"><input type="number" step="0.01" min="0" value={form.newUnitPrice} onInput={patch('newUnitPrice')} /><span class="unit">ج.م</span></div>
          </Field>
        </div>
      )}

      {isZakat && (
        <div class="frow">
          <Field label="المصرف (وجه الصرف)" hint="أحد المصارف الشرعية الثمانية">
            <select value={form.masrafId} onChange={patch('masrafId')}>
              <option value="">— اختر —</option>
              {MASAREF.map(m => <option value={m.id}>{m.icon} {m.label}</option>)}
            </select>
          </Field>
          <Field label="اسم المستفيد">
            <input type="text" value={form.recipient} onInput={patch('recipient')} placeholder="اختياري — اسم أو وصف" />
          </Field>
        </div>
      )}

      <div class="frow">
        <Field label="التصنيف (اختياري)">
          <input type="text" value={form.category} onInput={patch('category')} placeholder="مثال: راتب، إيجار، طعام…" />
        </Field>
        <Field label="المرجع (اختياري)">
          <input type="text" value={form.ref} onInput={patch('ref')} />
        </Field>
      </div>
      <Field label="ملاحظات">
        <textarea value={form.notes} onInput={patch('notes')} />
      </Field>

      {error && <div class="banner warn" style="margin-top:12px"><span class="bicon">⚠️</span><p>{error}</p></div>}
    </Modal>
  );
}
