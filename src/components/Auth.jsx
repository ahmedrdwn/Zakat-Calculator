import { useState } from 'preact/hooks';
import { Modal, Field, Banner } from './ui.jsx';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../data/sync.js';
import { supabaseEnabled } from '../data/supabase.js';

export function AuthModal({ open, onClose }) {
  const [mode, setMode] = useState('signin');   // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async () => {
    if (!email || !password) { setError('أدخل البريد الإلكتروني وكلمة المرور'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        onClose();
      } else {
        await signUpWithEmail(email, password);
        setNotice('تم إنشاء الحساب. تحقق من بريدك للتفعيل ثم عد للدخول.');
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true); setError('');
    try { await signInWithGoogle(); }
    catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <Modal
      open={open}
      title={mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب'}
      onClose={onClose}
      maxWidth="440px"
      footer={<>
        <button class="btn btn-gold" style="flex:1" disabled={busy} onClick={submit}>
          {busy ? '…' : (mode === 'signin' ? 'دخول' : 'تسجيل')}
        </button>
        <button class="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </>}
    >
      {!supabaseEnabled && (
        <Banner tone="warn">
          <strong>Supabase غير مضبوط.</strong> يجب ضبط متغيّرَي البيئة
          <code style="color:var(--gold);margin:0 4px">VITE_SUPABASE_URL</code> و
          <code style="color:var(--gold);margin:0 4px">VITE_SUPABASE_ANON_KEY</code>
          في إعدادات Vercel.
        </Banner>
      )}
      {supabaseEnabled && <>
        <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-bottom:14px;padding:11px" disabled={busy} onClick={google}>
          <svg width="18" height="18" viewBox="0 0 48 48" style="vertical-align:middle;margin-left:8px">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.7 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4c-7.5 0-14 4.2-17.7 10.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-1.9 1.4-4.4 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.3-.4-3.5z"/>
          </svg>
          الدخول بحساب Google
        </button>
        <div style="text-align:center;font-size:11px;color:var(--text-muted);margin-bottom:14px">— أو باستخدام البريد —</div>
        <div class="frow">
          <Field label="البريد الإلكتروني">
            <input type="email" value={email} onInput={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
          </Field>
          <Field label="كلمة المرور">
            <input type="password" value={password} onInput={e => setPassword(e.target.value)} placeholder="٦ أحرف فأكثر" />
          </Field>
        </div>
        <div style="text-align:center;margin-top:10px;font-size:12.5px;color:var(--text-dim)">
          {mode === 'signin'
            ? <>لا حساب لديك؟ <a href="#" onClick={e => { e.preventDefault(); setMode('signup'); setError(''); }} style="color:var(--gold)">أنشئ حساباً</a></>
            : <>لديك حساب؟ <a href="#" onClick={e => { e.preventDefault(); setMode('signin'); setError(''); }} style="color:var(--gold)">سجّل دخولك</a></>}
        </div>
        {error && <Banner tone="warn">{error}</Banner>}
        {notice && <Banner tone="ok">{notice}</Banner>}
      </>}
    </Modal>
  );
}
