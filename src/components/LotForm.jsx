import { useState, useMemo } from 'preact/hooks';
import { Modal, Field } from './ui.jsx';
import { ASSET_TYPES, LOT_PURPOSES, currencyByCode } from '../models/index.js';
import { addLot, updateLot, activeAccounts, settingsSig } from '../state/store.js';
import { todayISO } from '../utils/index.js';

export function LotForm({ open, onClose, existing, defaultAccountId, defaultAssetType }) {
  const isEdit = !!existing;
  const [form, setForm] = useState(() => existing || {
    accountId: defaultAccountId || '',
    assetType: defaultAssetType || 'cash',
    acquiredAt: todayISO(),
    amount: 0, weight: 0, karat: 24, units: 0,
    unitPrice: 0, costBasis: 0, currentValue: 0,
    label: '', purpose: 'zakat', notes: '',
  });
  const accts = activeAccounts.value;
  const at = useMemo(() => ASSET_TYPES.find(t => t.id === form.assetType), [form.assetType]);
  const s = settingsSig.value;

  const patch = k => e => {
    const v = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setForm({ ...form, [k]: v });
  };

  const save = () => {
    if (!form.accountId) { alert('اختر الحساب'); return; }
    if (!form.acquiredAt) { alert('اختر تاريخ الاقتناء'); return; }
    const asset = at.id;
    const patched = { ...form };
    // Cash/receivable lots inherit their currency from the account so
    // FIFO consumption and FX conversion stay consistent.
    if (asset === 'cash' || asset === 'receivable') {
      const acct = accts.find(a => a.id === form.accountId);
      patched.currency = acct?.currency || 'EGP';
    }
    if ((asset === 'cash' || asset === 'receivable') && !(patched.amount > 0)) { alert('أدخل مبلغاً موجباً'); return; }
    if ((asset === 'gold' || asset === 'silver') && !(patched.weight > 0)) { alert('أدخل وزناً موجباً'); return; }
    if ((asset === 'stock' || asset === 'fund' || asset === 'inventory') && !(patched.units > 0)) { alert('أدخل عدداً موجباً'); return; }
    if (isEdit) updateLot(existing.id, patched);
    else addLot(patched);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'تعديل أصل' : 'إضافة أصل'}
      onClose={onClose}
      footer={<>
        <button class="btn btn-gold" onClick={save} style="flex:1">💾 حفظ</button>
        <button class="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </>}
    >
      {(() => {
        // Label the holder-picker per asset type so it matches the mental
        // model — gold sits in a safe, stocks with a broker, cash at a bank.
        const holder = {
          cash:       { label: 'الحساب البنكي / المحفظة', hint: 'المكان الذي يحتفظ به المال' },
          receivable: { label: 'مسجَّل تحت', hint: 'حساب أو محفظة يظهر الدين ضمن أصولها' },
          gold:       { label: 'مكان الحفظ', hint: 'أين هذا الذهب؟ خزنة، بنك، أو غيرها — لا يشترط أن يكون بنكاً' },
          silver:     { label: 'مكان الحفظ', hint: 'أين هذه الفضة؟ خزنة أو مكان محفوظ' },
          stock:      { label: 'حساب الوسيط', hint: 'الوسيط الذي يُحتفظ لديه بالأسهم' },
          fund:       { label: 'حساب الوسيط', hint: 'الوسيط الذي يُحتفظ لديه بوحدات الصندوق' },
          inventory:  { label: 'النشاط التجاري', hint: 'المتجر أو النشاط الذي تعود إليه البضاعة' },
          realestate: { label: 'التصنيف', hint: 'مجموعة العقارات (اختر أو أنشئ مجموعة)' },
          personal:   { label: 'التصنيف', hint: 'مجموعة الأصول الشخصية' },
        }[at.id] || { label: 'الحافظة', hint: '' };
        return (
          <div class="frow">
            <Field label={holder.label} hint={holder.hint}>
              <select value={form.accountId} onChange={patch('accountId')}>
                <option value="">— اختر —</option>
                {accts.map(a => <option value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="نوع الأصل">
              <select value={form.assetType} onChange={patch('assetType')} disabled={isEdit}>
                {ASSET_TYPES.map(t => <option value={t.id}>{t.icon} {t.label}</option>)}
              </select>
            </Field>
            <Field label="تاريخ الاقتناء" hint="يُستخدم لحساب الحول">
              <input type="date" value={form.acquiredAt} onInput={patch('acquiredAt')} />
            </Field>
          </div>
        );
      })()}

      {/* Type-specific fields */}
      {(at.id === 'cash' || at.id === 'receivable') && (() => {
        const acctCurrency = accts.find(a => a.id === form.accountId)?.currency || 'EGP';
        const cur = currencyByCode(acctCurrency);
        return (
          <div class="frow">
            <Field label={`المبلغ (${cur.code})`} hint={acctCurrency !== 'EGP' ? 'يُحسب بالجنيه المصري تلقائياً حسب سعر الصرف' : undefined}>
              <div class="iw"><input type="number" step="0.01" min="0" value={form.amount} onInput={patch('amount')} /><span class="unit">{cur.symbol}</span></div>
            </Field>
            <Field label={at.id === 'receivable' ? 'المدين' : 'اسم / وصف'}>
              <input type="text" value={form.label} onInput={patch('label')} placeholder="اختياري" />
            </Field>
          </div>
        );
      })()}
      {(at.id === 'gold' || at.id === 'silver') && (
        <div class="frow">
          <Field label="الوزن (جرام)">
            <input type="number" step="0.01" min="0" value={form.weight} onInput={patch('weight')} />
          </Field>
          {at.id === 'gold' && (
            <Field label="العيار">
              <select value={form.karat} onChange={patch('karat')}>
                <option value="24">24</option><option value="22">22</option>
                <option value="21">21</option><option value="18">18</option>
              </select>
            </Field>
          )}
          <Field label="سعر الجرام (ج.م)" hint={at.id === 'gold' ? `مرجعي: ${s.goldPricePerGram || '—'}` : `مرجعي: ${s.silverPricePerGram || '—'}`}>
            <div class="iw">
              <input type="number" step="0.01" min="0"
                value={form.unitPrice || (at.id === 'gold' ? s.goldPricePerGram : s.silverPricePerGram) || 0}
                onInput={patch('unitPrice')} />
              <span class="unit">ج.م</span>
            </div>
          </Field>
        </div>
      )}
      {(at.id === 'stock' || at.id === 'fund' || at.id === 'inventory') && (
        <div class="frow">
          <Field label={at.id === 'stock' ? 'رمز السهم' : at.id === 'fund' ? 'اسم الصندوق' : 'اسم البضاعة'}>
            <input type="text" value={form.label} onInput={patch('label')} />
          </Field>
          <Field label={at.id === 'stock' ? 'عدد الأسهم' : at.id === 'fund' ? 'عدد الوحدات' : 'الكمية'}>
            <input type="number" step="0.01" min="0" value={form.units} onInput={patch('units')} />
          </Field>
          <Field label="سعر الوحدة (ج.م)">
            <div class="iw"><input type="number" step="0.01" min="0" value={form.unitPrice} onInput={patch('unitPrice')} /><span class="unit">ج.م</span></div>
          </Field>
        </div>
      )}
      {(at.id === 'realestate' || at.id === 'personal') && (
        <div class="frow">
          <Field label="الوصف">
            <input type="text" value={form.label} onInput={patch('label')} placeholder="مثل: شقة الإسكندرية، سيارة تويوتا …" />
          </Field>
          <Field label="القيمة السوقية الحالية (ج.م)">
            <div class="iw"><input type="number" step="0.01" min="0" value={form.currentValue} onInput={patch('currentValue')} /><span class="unit">ج.م</span></div>
          </Field>
        </div>
      )}

      <div class="frow">
        <Field label="الغرض" hint="يحدد ما إذا كان الأصل ضمن الوعاء الزكوي">
          <select value={form.purpose} onChange={patch('purpose')}>
            {LOT_PURPOSES.map(p => <option value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="تكلفة الاقتناء (اختياري)" hint="السعر الذي دفعته وقت الشراء">
          <div class="iw"><input type="number" step="0.01" min="0" value={form.costBasis} onInput={patch('costBasis')} /><span class="unit">ج.م</span></div>
        </Field>
      </div>
      <Field label="ملاحظات">
        <textarea value={form.notes} onInput={patch('notes')} />
      </Field>
    </Modal>
  );
}
