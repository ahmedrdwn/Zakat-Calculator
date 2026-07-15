import { useState } from 'preact/hooks';
import { activeAccounts, activeLots, accountBalance, accountNativeBalance, deleteAccount } from '../state/store.js';
import { accountKind, currencyByCode } from '../models/index.js';
import { fmt } from '../utils/index.js';
import { AccountForm } from '../components/AccountForm.jsx';
import { LotForm } from '../components/LotForm.jsx';
import { EmptyState, ConfirmButton } from '../components/ui.jsx';

export function Accounts() {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [addLotFor, setAddLotFor] = useState(null);

  const accts = activeAccounts.value;

  const remove = a => {
    try { deleteAccount(a.id); }
    catch (e) { alert(e.message); }
  };

  return (
    <>
      <div class="page-title">
        <h1>الحسابات والحوافظ</h1>
        <span class="sub">بنوك، محافظ، خزائن، وسطاء — كل مكان تحفظ فيه أموالك</span>
      </div>

      {accts.length === 0 ? (
        <EmptyState
          icon="🏦"
          title="لا توجد حسابات بعد"
          message="أنشئ حساباً بنكياً، محفظة إلكترونية، خزنة، أو أي مكان تحفظ فيه أموالك."
          action={<button class="btn btn-gold" onClick={() => setAddOpen(true)}>➕ حساب جديد</button>}
        />
      ) : (
        <>
          {accts.map(a => {
            const k = accountKind(a.kind);
            const bal = accountBalance(a.id);
            const native = accountNativeBalance(a.id);
            const cur = currencyByCode(a.currency);
            const lots = activeLots.value.filter(l => l.accountId === a.id);
            const isForeign = a.currency !== 'EGP';
            return (
              <div class="card" key={a.id}>
                <div class="card-hd">
                  <h3><span class="icon">{k.icon}</span>{a.name}</h3>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div style="text-align:left">
                      {isForeign && <div style="font-weight:800;color:var(--text)">{fmt(native)} <span style="color:var(--text-dim);font-size:12px">{cur.symbol}</span></div>}
                      <div class="badge badge-gold">{fmt(bal)} ج.م{isForeign ? ' ≈' : ''}</div>
                    </div>
                    <button class="btn btn-icon" title="تعديل" onClick={() => setEditing(a)}>✏️</button>
                    <ConfirmButton onConfirm={() => remove(a)} />
                  </div>
                </div>
                <div class="card-body">
                  <div style="display:flex;gap:8px;font-size:12px;color:var(--text-dim);margin-bottom:10px">
                    <span>{k.label}</span>·
                    <span>{cur.label} ({a.currency})</span>·
                    <span>{lots.length} أصل</span>
                  </div>
                  {a.notes && <p style="font-size:12.5px;color:var(--text-dim);margin-bottom:12px">{a.notes}</p>}
                  <button class="btn btn-add-dashed" onClick={() => setAddLotFor(a.id)}>➕ إضافة أصل إلى هذا الحساب</button>
                </div>
              </div>
            );
          })}
          <button class="btn btn-add-dashed" onClick={() => setAddOpen(true)}>➕ حساب جديد</button>
        </>
      )}

      <AccountForm open={addOpen} onClose={() => setAddOpen(false)} />
      <AccountForm open={!!editing} existing={editing} onClose={() => setEditing(null)} />
      <LotForm open={!!addLotFor} onClose={() => setAddLotFor(null)} defaultAccountId={addLotFor} />
    </>
  );
}
