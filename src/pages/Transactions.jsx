import { useState, useMemo } from 'preact/hooks';
import { transactionsSig, accountsSig, lotsSig, deleteTransaction } from '../state/store.js';
import { txKind, TX_KINDS } from '../models/index.js';
import { fmt, fmtDate } from '../utils/index.js';
import { EmptyState, ConfirmButton } from '../components/ui.jsx';
import { TransactionForm } from '../components/TransactionForm.jsx';

export function Transactions() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const accts = accountsSig.value;
  const accById = useMemo(() => Object.fromEntries(accts.map(a => [a.id, a])), [accts]);

  const txs = transactionsSig.value;
  const filtered = useMemo(() => {
    let arr = [...txs].sort((a,b) => (b.at || '').localeCompare(a.at || ''));
    if (filter !== 'all') arr = arr.filter(t => t.kind === filter);
    if (q.trim()) {
      const s = q.trim();
      arr = arr.filter(t =>
        (t.notes || '').includes(s) || (t.category || '').includes(s) ||
        (t.ref || '').includes(s) || (accById[t.fromAccountId]?.name || '').includes(s) ||
        (accById[t.toAccountId]?.name || '').includes(s)
      );
    }
    return arr;
  }, [txs, filter, q, accById]);

  const label = t => {
    const k = txKind(t.kind);
    let side = '';
    if (t.fromAccountId) side += `من: ${accById[t.fromAccountId]?.name || '—'} `;
    if (t.toAccountId) side += `إلى: ${accById[t.toAccountId]?.name || '—'}`;
    return { icon: k.icon, name: k.label, side };
  };

  return (
    <>
      <div class="page-title">
        <h1>سجل الحركات</h1>
        <span class="sub">الإيداعات، السحوبات، التحويلات، وكل ما مرّ عبر بنكك الشخصي</span>
      </div>

      <div class="frow" style="margin-bottom:14px">
        <div class="field">
          <label>تصفية النوع</label>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">كل الأنواع</option>
            {TX_KINDS.map(k => <option value={k.id}>{k.icon} {k.label}</option>)}
          </select>
        </div>
        <div class="field">
          <label>بحث</label>
          <input type="text" value={q} onInput={e => setQ(e.target.value)} placeholder="ملاحظات، تصنيف، مرجع، حساب…" />
        </div>
        <div class="field">
          <label>&nbsp;</label>
          <button class="btn btn-emerald" onClick={() => setOpen(true)}>➕ حركة جديدة</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📒"
          title={txs.length === 0 ? 'لا حركات بعد' : 'لا نتائج مطابقة'}
          message={txs.length === 0 ? 'سجّل أول حركة — إيداع، سحب، أو تحويل بين حساباتك.' : 'جرّب توسيع التصفية.'}
          action={txs.length === 0 && <button class="btn btn-emerald" onClick={() => setOpen(true)}>➕ حركة جديدة</button>}
        />
      ) : (
        filtered.map(t => {
          const l = label(t);
          return (
            <div class="row" key={t.id}>
              <div style="width:36px;height:36px;border-radius:8px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:16px;border:1px solid var(--gold-border);flex-shrink:0">{l.icon}</div>
              <div class="rmain">
                <div class="rname">{l.name}{t.category ? ` · ${t.category}` : ''}</div>
                <div class="rmeta">{fmtDate(t.at)}{l.side ? ' · ' + l.side : ''}{t.notes ? ' — ' + t.notes : ''}</div>
              </div>
              <div class="rright">
                <div class={'rval ' + (t.kind === 'expense' || t.kind === 'withdraw' || t.kind === 'zakat_paid' ? 'red' : 'emerald')}>
                  {t.amount ? fmt(t.amount) + ' ج.م' : ''}
                </div>
                {t.ref && <div class="rsub">مرجع: {t.ref}</div>}
              </div>
              <div class="ractions">
                <ConfirmButton onConfirm={() => deleteTransaction(t.id)} />
              </div>
            </div>
          );
        })
      )}

      <TransactionForm open={open} onClose={() => setOpen(false)} />
    </>
  );
}
