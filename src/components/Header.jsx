import { useState } from 'preact/hooks';
import { downloadBackup, restoreBackup } from '../data/storage.js';
import { userSig, signOut, pushToCloud, pullFromCloud } from '../data/sync.js';
import { supabaseEnabled } from '../data/supabase.js';
import { AuthModal } from './Auth.jsx';
import { InstallButton } from './Install.jsx';
import { SyncStatusBadge } from './SyncStatus.jsx';

export function Header() {
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const onImport = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    restoreBackup(f)
      .then(() => alert('تمّت الاستعادة بنجاح.'))
      .catch(err => alert('فشل الاستعادة: ' + err.message))
      .finally(() => { setBusy(false); e.target.value = ''; });
  };

  const user = userSig.value;

  return (
    <header class="app-hdr">
      <div class="hdr-inner">
        <a href="#" class="logo" onClick={e => e.preventDefault()}>
          <img src="/logo.svg" alt="" class="logo-mark" width="38" height="38" />
          <div>
            <div class="logo-title">البنك الشخصي</div>
            <div class="logo-sub">سجل الأصول والزكاة</div>
          </div>
        </a>
        <div class="hdr-spacer" />
        <div class="hdr-actions">
          <SyncStatusBadge />
          <InstallButton />
          {!user && (
            <button
              class={'btn btn-sm ' + (supabaseEnabled ? 'btn-gold' : 'btn-ghost')}
              onClick={() => setAuthOpen(true)}
              title={supabaseEnabled ? 'تسجيل الدخول' : 'المزامنة السحابية غير مُفعّلة — انقر لمعرفة السبب'}
            >
              🔐 {supabaseEnabled ? 'تسجيل الدخول' : 'مزامنة سحابية'}
            </button>
          )}
          {user && (
            <div style="position:relative">
              <button class="btn btn-ghost btn-sm" onClick={() => setMenuOpen(!menuOpen)}>
                👤 {user.email?.split('@')[0] || 'الحساب'}
              </button>
              {menuOpen && (
                <div style="position:absolute;top:calc(100% + 6px);left:0;background:var(--card);border:1px solid var(--gold-border);border-radius:10px;box-shadow:var(--shadow-lg);padding:6px;min-width:200px;z-index:210">
                  <div style="padding:8px 12px;font-size:12px;color:var(--text-dim);border-bottom:1px solid var(--border);margin-bottom:4px">{user.email}</div>
                  <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:flex-start;margin-bottom:2px" onClick={() => { pullFromCloud(); setMenuOpen(false); }}>⬇ سحب من السحابة</button>
                  <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:flex-start;margin-bottom:2px" onClick={() => { pushToCloud(); setMenuOpen(false); }}>⬆ رفع للسحابة</button>
                  <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:flex-start;margin-bottom:2px" onClick={downloadBackup}>💾 تنزيل نسخة</button>
                  <label class="btn btn-ghost btn-sm" style="width:100%;justify-content:flex-start;cursor:pointer;margin-bottom:2px">
                    📥 استعادة من ملف
                    <input type="file" accept="application/json" style="display:none" onChange={onImport} />
                  </label>
                  <button class="btn btn-danger" style="width:100%;justify-content:flex-start" onClick={() => { signOut(); setMenuOpen(false); }}>🚪 تسجيل الخروج</button>
                </div>
              )}
            </div>
          )}
          {!user && (
            <>
              <button class="btn btn-ghost btn-sm" onClick={downloadBackup} disabled={busy}>💾</button>
              <label class="btn btn-ghost btn-sm" style="cursor:pointer">
                📥
                <input type="file" accept="application/json" style="display:none" onChange={onImport} />
              </label>
            </>
          )}
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
