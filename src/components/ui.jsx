import { useEffect, useState } from 'preact/hooks';

export function Modal({ open, title, onClose, footer, children, maxWidth }) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div class="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div class="modal" style={maxWidth ? { maxWidth } : undefined}>
        <div class="modal-hd">
          <h3>{title}</h3>
          <button class="modal-close" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>
        <div class="modal-body">{children}</div>
        {footer && <div class="modal-ft">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, full }) {
  return (
    <div class={'field' + (full ? ' full' : '')}>
      {label && <label>{label}</label>}
      {children}
      {hint && <div class="hint">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon = '🕊️', title, message, action }) {
  return (
    <div class="empty">
      <div class="eicon">{icon}</div>
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function Banner({ tone = 'info', children, icon }) {
  const ic = icon ?? (tone === 'warn' ? '⚠️' : tone === 'ok' ? '✅' : 'ℹ️');
  return (
    <div class={'banner ' + tone}>
      <span class="bicon">{ic}</span>
      <p>{children}</p>
    </div>
  );
}

export function ConfirmButton({ onConfirm, label = '🗑', title = 'تأكيد الحذف', className = 'btn btn-icon' }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      class={className + (armed ? ' btn-danger' : '')}
      title={armed ? 'اضغط مرة أخرى للتأكيد' : title}
      onClick={() => {
        if (!armed) { setArmed(true); return; }
        onConfirm(); setArmed(false);
      }}
    >{armed ? '؟' : label}</button>
  );
}
