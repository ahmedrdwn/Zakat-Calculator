// UUID (RFC4122 v4-ish, no external deps)
export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'x'.repeat(8) + '-x'.repeat(4) + '-4xxx-yxxx-'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  }) + 'xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16));
}

// Money formatting — Arabic-Egyptian locale
export const fmt = n => (Number(n) || 0).toLocaleString('ar-EG', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});
export const fmtInt = n => (Number(n) || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 });

// Currency symbol
export const currencySym = c => ({
  EGP: 'ج.م', USD: '$', SAR: '﷼', EUR: '€', GBP: '£', AED: 'د.إ'
}[c] || c || 'ج.م');

// Dates
export const todayISO = () => new Date().toISOString().split('T')[0];
export const nowISO = () => new Date().toISOString();

// Days between two ISO dates (integer, absolute)
export function daysBetween(a, b) {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.floor((d2 - d1) / 86400000);
}
export function daysSince(iso) {
  return daysBetween(iso, todayISO());
}
export function isAged(iso, days = 365) {
  return daysSince(iso) >= days;
}

// Add days to an ISO date
export function addDays(iso, n) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Human-readable relative Arabic date
export function relArabic(iso) {
  const d = daysSince(iso);
  if (d < 1) return 'اليوم';
  if (d === 1) return 'أمس';
  if (d < 30) return `منذ ${d} يوم`;
  if (d < 365) return `منذ ${Math.floor(d / 30)} شهر`;
  const y = Math.floor(d / 365);
  return y === 1 ? 'منذ سنة' : `منذ ${y} سنوات`;
}

// Format ISO date to Arabic locale short date
export function fmtDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

// HTML escape
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Clamp
export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// Sum helper
export const sum = arr => arr.reduce((a, b) => a + (Number(b) || 0), 0);

// Deep clone (JSON-safe)
export const clone = x => JSON.parse(JSON.stringify(x));
