import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { Modal } from './ui.jsx';

// Deferred install prompt (Chromium browsers only)
const deferredPromptSig = signal(null);
const isStandaloneSig = signal(false);
const installedSig = signal(false);

if (typeof window !== 'undefined') {
  isStandaloneSig.value =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPromptSig.value = e;
  });
  window.addEventListener('appinstalled', () => {
    deferredPromptSig.value = null;
    installedSig.value = true;
  });
}

function detectPlatform() {
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';
  if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Mac/i.test(ua) && 'ontouchend' in (typeof document !== 'undefined' ? document : {})) return 'ios';
  return 'desktop';
}

export function InstallButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Hide entirely if we're already running as an installed PWA.
  if (isStandaloneSig.value || installedSig.value) return null;

  const platform = detectPlatform();
  const hasNativePrompt = !!deferredPromptSig.value;

  const onClick = async () => {
    if (hasNativePrompt) {
      setBusy(true);
      try {
        await deferredPromptSig.value.prompt();
        const { outcome } = await deferredPromptSig.value.userChoice;
        if (outcome === 'accepted') {
          deferredPromptSig.value = null;
          installedSig.value = true;
        }
      } catch (_) {}
      setBusy(false);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <button
        class="btn btn-sm btn-emerald"
        onClick={onClick}
        disabled={busy}
        title="ثبّت البنك الشخصي على جهازك ليعمل بدون إنترنت"
      >
        📲 <span style="margin-right:4px">ثبّت التطبيق</span>
      </button>
      <Modal
        open={open}
        title="تثبيت التطبيق على جهازك"
        onClose={() => setOpen(false)}
        footer={<button class="btn btn-gold" style="flex:1" onClick={() => setOpen(false)}>حسناً</button>}
      >
        {platform === 'ios' && <IOSInstructions />}
        {platform === 'android' && <AndroidInstructions />}
        {platform === 'desktop' && <DesktopInstructions />}
      </Modal>
    </>
  );
}

function InstallStep({ n, children }) {
  return (
    <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="min-width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--gold-dim),var(--gold));color:#0D1B12;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0">{n}</div>
      <div style="font-size:14px;line-height:1.7;color:var(--text)">{children}</div>
    </div>
  );
}

function IOSInstructions() {
  return (
    <>
      <p style="font-size:13px;color:var(--text-dim);margin-bottom:12px">
        على iPhone و iPad، افتح التطبيق في متصفح <strong style="color:var(--gold)">Safari</strong> ثم:
      </p>
      <InstallStep n={1}>اضغط زر <strong>المشاركة</strong> في شريط Safari السفلي
        <span style="color:var(--text-dim);font-size:12px"> (المربع الذي يخرج منه سهم للأعلى ⬆)</span>
      </InstallStep>
      <InstallStep n={2}>اختر <strong>«إضافة إلى الشاشة الرئيسية»</strong>
        <span style="color:var(--text-dim);font-size:12px"> (Add to Home Screen)</span>
      </InstallStep>
      <InstallStep n={3}>اضغط <strong>«إضافة»</strong> في الأعلى — سيظهر أيقونة التطبيق على شاشتك الرئيسية.</InstallStep>
      <p style="font-size:12px;color:var(--text-muted);margin-top:12px">
        ⚠ في متصفحات غير Safari مثل Chrome على iOS يجب فتح الرابط في Safari أولاً — قيود من Apple.
      </p>
    </>
  );
}

function AndroidInstructions() {
  return (
    <>
      <p style="font-size:13px;color:var(--text-dim);margin-bottom:12px">
        على Android، افتح التطبيق في <strong style="color:var(--gold)">Chrome</strong> أو Edge:
      </p>
      <InstallStep n={1}>اضغط زر القائمة <strong>⋮</strong> أعلى المتصفح.</InstallStep>
      <InstallStep n={2}>اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.</InstallStep>
      <InstallStep n={3}>أكّد التثبيت — سيظهر التطبيق كأيقونة مستقلة على شاشتك.</InstallStep>
      <p style="font-size:12px;color:var(--text-muted);margin-top:12px">
        إذا كان زر التثبيت لم يظهر في هذه الصفحة، حاول تحديث الصفحة ثم اضغط الزر مرة أخرى.
      </p>
    </>
  );
}

function DesktopInstructions() {
  return (
    <>
      <p style="font-size:13px;color:var(--text-dim);margin-bottom:12px">
        في متصفحات الكمبيوتر (Chrome / Edge):
      </p>
      <InstallStep n={1}>ابحث عن أيقونة <strong>تثبيت</strong> في شريط العناوين
        <span style="color:var(--text-dim);font-size:12px"> (⊕ أو مربع مع سهم)</span>
      </InstallStep>
      <InstallStep n={2}>اضغطها ثم أكّد التثبيت — سيصبح التطبيق نافذة مستقلة.</InstallStep>
      <p style="font-size:12px;color:var(--text-muted);margin-top:12px">
        Firefox لا يدعم التثبيت التلقائي؛ استخدم Chrome أو Edge للحصول على تجربة تطبيق كامل.
      </p>
    </>
  );
}
