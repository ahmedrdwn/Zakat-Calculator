import { useState } from 'preact/hooks';
import { downloadBackup, restoreBackup, wipeAll } from '../data/storage.js';

export function Header() {
  const [busy, setBusy] = useState(false);

  const onImport = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    restoreBackup(f)
      .then(() => alert('تمّت الاستعادة بنجاح.'))
      .catch(err => alert('فشل الاستعادة: ' + err.message))
      .finally(() => { setBusy(false); e.target.value = ''; });
  };

  return (
    <header class="app-hdr">
      <div class="hdr-inner">
        <a href="#" class="logo" onClick={e => e.preventDefault()}>
          <span class="logo-icon">☪</span>
          <div>
            <div class="logo-title">البنك الشخصي</div>
            <div class="logo-sub">سجل الأصول والزكاة</div>
          </div>
        </a>
        <div class="hdr-spacer" />
        <div class="hdr-actions">
          <button class="btn btn-ghost btn-sm" onClick={downloadBackup} disabled={busy}>💾 نسخة</button>
          <label class="btn btn-ghost btn-sm" style="cursor:pointer">
            📥 استعادة
            <input type="file" accept="application/json" style="display:none" onChange={onImport} />
          </label>
        </div>
      </div>
    </header>
  );
}
