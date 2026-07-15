import { useState } from 'preact/hooks';
import { Modal, Banner } from './ui.jsx';
import { syncStatusSig, syncErrorSig, syncErrorDetailSig,
  pullFromCloud, pushToCloud, userSig } from '../data/sync.js';

const SETUP_SQL = `create table if not exists user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  accounts jsonb not null default '[]'::jsonb,
  lots jsonb not null default '[]'::jsonb,
  transactions jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table user_data enable row level security;
create policy "own_row_read"   on user_data for select using (auth.uid() = user_id);
create policy "own_row_insert" on user_data for insert with check (auth.uid() = user_id);
create policy "own_row_update" on user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_row_delete" on user_data for delete using (auth.uid() = user_id);`;

export function SyncStatusBadge() {
  const [open, setOpen] = useState(false);
  const status = syncStatusSig.value;
  if (status === 'idle') return null;
  const label = {
    pulling: '⏳ يجلب…',
    pushing: '⏳ يحفظ…',
    synced: '✓ محفوظ سحابياً',
    error: '⚠ خطأ مزامنة',
  }[status];
  const tone = status === 'error' ? 'badge-red' : status === 'synced' ? 'badge-emerald' : 'badge-muted';
  const isError = status === 'error';
  return (
    <>
      <button
        type="button"
        class={'badge ' + tone}
        onClick={() => setOpen(true)}
        style="border:none;cursor:pointer;align-self:center;font-family:'Tajawal',sans-serif;font-size:11.5px;"
        title={isError ? 'انقر لعرض تفاصيل الخطأ' : (status === 'synced' ? 'انقر لمزامنة يدوية' : '')}
      >
        {label}
      </button>
      <SyncStatusModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SyncStatusModal({ open, onClose }) {
  const [copied, setCopied] = useState(false);
  const status = syncStatusSig.value;
  const errMsg = syncErrorSig.value;
  const detail = syncErrorDetailSig.value;
  const user = userSig.value;

  const copySQL = async () => {
    try { await navigator.clipboard.writeText(SETUP_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch {}
  };

  const retry = async () => {
    await pullFromCloud();
    if (syncStatusSig.value !== 'error') onClose();
  };

  const isError = status === 'error';
  return (
    <Modal
      open={open}
      title={isError ? '⚠ خطأ في المزامنة السحابية' : '☁ حالة المزامنة'}
      onClose={onClose}
      footer={<>
        {isError && <button class="btn btn-gold" style="flex:1" onClick={retry}>↻ إعادة المحاولة</button>}
        {!isError && <button class="btn btn-emerald" style="flex:1" onClick={() => pushToCloud().then(onClose)}>⬆ رفع الآن</button>}
        <button class="btn btn-ghost" onClick={onClose}>إغلاق</button>
      </>}
    >
      {user && (
        <div style="font-size:12.5px;color:var(--text-dim);margin-bottom:12px;padding:8px 12px;background:var(--bg3);border-radius:8px">
          الحساب: <strong style="color:var(--text)">{user.email}</strong>
        </div>
      )}

      {isError && (
        <>
          {detail?.hint && (
            <Banner tone="warn">
              <strong>السبب المرجّح:</strong> {detail.hint}
            </Banner>
          )}
          <div style="margin-top:12px">
            <div style="font-size:12px;color:var(--text-dim);margin-bottom:5px">رسالة الخطأ الفعلية:</div>
            <pre style="background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px;font-size:11.5px;color:var(--red-l);white-space:pre-wrap;word-break:break-word;font-family:monospace;direction:ltr;text-align:left">{errMsg || 'unknown error'}</pre>
            {detail?.code && <div style="font-size:11px;color:var(--text-muted);margin-top:4px">الرمز: <code>{detail.code}</code> · حدث في: <code>{detail.where}</code></div>}
          </div>

          {(detail?.hint?.includes('user_data') || detail?.hint?.includes('RLS')) && (
            <div style="margin-top:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <strong style="font-size:13px;color:var(--gold)">سكربت الإعداد المطلوب</strong>
                <button class="btn btn-ghost btn-sm" onClick={copySQL}>{copied ? '✓ نُسِخ' : '📋 نسخ'}</button>
              </div>
              <p style="font-size:12px;color:var(--text-dim);margin-bottom:8px">
                افتح Supabase Dashboard → SQL Editor → الصق ونفّذ:
              </p>
              <pre style="background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:10px;font-size:10.5px;color:var(--text);white-space:pre;overflow-x:auto;max-height:220px;overflow-y:auto;font-family:monospace;direction:ltr;text-align:left">{SETUP_SQL}</pre>
            </div>
          )}
        </>
      )}

      {!isError && (
        <p style="font-size:13px;color:var(--text-dim)">
          {status === 'synced' && 'كل التعديلات مرفوعة إلى السحابة. يمكنك رفع أو سحب البيانات يدوياً من هنا.'}
          {status === 'pulling' && 'جارٍ جلب بياناتك من السحابة…'}
          {status === 'pushing' && 'جارٍ حفظ التغييرات في السحابة…'}
        </p>
      )}
    </Modal>
  );
}
