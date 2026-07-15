import { useState } from 'preact/hooks';
import { Modal, Field } from './ui.jsx';
import { ACCOUNT_KINDS, CURRENCIES } from '../models/index.js';
import { addAccount, updateAccount } from '../state/store.js';

export function AccountForm({ open, onClose, existing }) {
  const isEdit = !!existing;
  const [form, setForm] = useState(() => existing || {
    name: '', kind: 'bank', currency: 'EGP', notes: '',
  });

  const save = () => {
    if (!form.name.trim()) { alert('أدخل اسم الحساب'); return; }
    if (isEdit) updateAccount(existing.id, form);
    else addAccount(form);
    onClose();
  };

  const patch = k => e => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal
      open={open}
      title={isEdit ? 'تعديل حساب' : 'حساب جديد'}
      onClose={onClose}
      footer={<>
        <button class="btn btn-gold" onClick={save} style="flex:1">💾 حفظ</button>
        <button class="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </>}
    >
      <div class="frow">
        <Field label="اسم الحساب">
          <input type="text" value={form.name} onInput={patch('name')} placeholder="مثال: بنك القاهرة — الجاري" autoFocus />
        </Field>
        <Field label="نوع الحساب">
          <select value={form.kind} onChange={patch('kind')}>
            {ACCOUNT_KINDS.map(k => <option value={k.id}>{k.icon} {k.label}</option>)}
          </select>
        </Field>
      </div>
      <div class="frow">
        <Field label="العملة" hint="الحسابات بالعملات الأجنبية تُقيَّم بالجنيه المصري تلقائياً حسب سعر الصرف في الإعدادات.">
          <select value={form.currency} onChange={patch('currency')}>
            {CURRENCIES.map(c => <option value={c.code}>{c.label} ({c.code})</option>)}
          </select>
        </Field>
      </div>
      <Field label="ملاحظات">
        <textarea value={form.notes} onInput={patch('notes')} placeholder="اختياري" />
      </Field>
    </Modal>
  );
}
