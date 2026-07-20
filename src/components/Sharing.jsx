import { useState } from 'preact/hooks';
import { Banner, ConfirmButton } from './ui.jsx';
import { userSig, syncTargetSig, targetOwnerSig, sharedWithSig,
  addSharedEmail, removeSharedEmail, isOwner } from '../data/sync.js';
import { supabaseEnabled } from '../data/supabase.js';

export function SharingCard() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const user = userSig.value;
  const owner = targetOwnerSig.value;
  const owned = isOwner();
  const shared = sharedWithSig.value || [];

  if (!supabaseEnabled) {
    return (
      <div class="card">
        <div class="card-hd"><h3><span class="icon">👨‍👩‍👧</span>المشاركة العائلية</h3></div>
        <div class="card-body">
          <Banner tone="warn">
            المشاركة تحتاج تفعيل السحابة أولاً (متغيرات Supabase في Vercel). راجع <code style="color:var(--gold)">SUPABASE_SETUP.md</code>.
          </Banner>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div class="card">
        <div class="card-hd"><h3><span class="icon">👨‍👩‍👧</span>المشاركة العائلية</h3></div>
        <div class="card-body">
          <Banner tone="info">
            سجّل دخولك أولاً من زرّ «🔐 تسجيل الدخول» في أعلى الصفحة، ثم ستتمكن من مشاركة سجلّك مع زوجتك أو أحد أفراد أسرتك.
          </Banner>
        </div>
      </div>
    );
  }

  const doAdd = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      await addSharedEmail(email);
      setNotice(`تمت دعوة ${email}. اطلب منها/منه تسجيل الدخول بنفس البريد.`);
      setEmail('');
    } catch (e) {
      setError(e.message || String(e));
    } finally { setBusy(false); }
  };

  const doRemove = async (e) => {
    try { await removeSharedEmail(e); } catch (err) { alert(err.message); }
  };

  return (
    <div class="card">
      <div class="card-hd">
        <h3><span class="icon">👨‍👩‍👧</span>المشاركة العائلية</h3>
        <span class={'badge ' + (owned ? 'badge-gold' : 'badge-emerald')}>
          {owned ? '🏠 أنت المالك' : '🤝 تشارك سجل ' + (owner?.slice(0,6) || '') + '…'}
        </span>
      </div>
      <div class="card-body">
        <Banner tone="info">
          {owned
            ? <>يمكنك دعوة زوجتك أو أحد أفراد أسرتك للدخول <strong>لنفس السجل</strong> والمشاركة في إدخال البيانات. تضيف بريدها هنا، ثم تدخل هي بنفس البريد عبر Google أو كلمة المرور — سترى نفس الحسابات والأصول وتستطيع تعديلها.</>
            : <>أنت الآن ضمن سجل مشترك مع مالك آخر. جميع التعديلات التي تجريها تُحفظ في السجل المشترك ويراها الطرف الآخر فور المزامنة.</>}
        </Banner>

        {owned && (
          <>
            <div style="display:flex;gap:8px;margin-top:14px;align-items:flex-end;flex-wrap:wrap">
              <div class="field" style="flex:1;min-width:200px">
                <label>بريد الشخص المُشارَك</label>
                <input
                  type="email"
                  value={email}
                  onInput={e => { setEmail(e.target.value); setError(''); setNotice(''); }}
                  placeholder="wife@example.com"
                  onKeyDown={e => e.key === 'Enter' && doAdd()}
                />
              </div>
              <button class="btn btn-gold" disabled={busy || !email} onClick={doAdd}>
                {busy ? '⏳' : '➕'} دعوة
              </button>
            </div>
            {error && <div style="margin-top:10px"><Banner tone="warn">{error}</Banner></div>}
            {notice && <div style="margin-top:10px"><Banner tone="ok">{notice}</Banner></div>}
          </>
        )}

        {shared.length > 0 && (
          <div style="margin-top:16px">
            <div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">المشاركون في هذا السجل ({shared.length}):</div>
            {shared.map(e => (
              <div class="row" key={e}>
                <div class="rmain">
                  <div class="rname">👤 {e}</div>
                  <div class="rmeta">يستطيع القراءة والتعديل</div>
                </div>
                {owned && (
                  <div class="ractions">
                    <ConfirmButton onConfirm={() => doRemove(e)} label="✕" title="إزالة المشاركة" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);font-size:11.5px;color:var(--text-muted);line-height:1.7">
          <strong style="color:var(--text-dim)">كيف تعمل المشاركة؟</strong><br />
          • تدخل بريد الشخص هنا وتضغط <strong>دعوة</strong>.<br />
          • يفتح هو/هي التطبيق ويسجّل الدخول بنفس البريد (Google أو كلمة مرور).<br />
          • عند أول دخول يظهر لديه سجلك المشترك بدل سجله الفارغ، ويستطيع الإضافة والتعديل — كل التغييرات تُحفظ لديك أيضاً بعد ثوانٍ.<br />
          • تحتاج تحديث سكربت Supabase من <code style="color:var(--gold)">SHARING_SETUP.md</code> إذا لم تكن قد شغّلته من قبل.
        </div>
      </div>
    </div>
  );
}
