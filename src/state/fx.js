import { signal } from '@preact/signals';

// FX rates stored as USD-based: rates[X] = 1 USD in units of X.
// EGP conversion for currency C: amount * rates.EGP / rates[C].
export const fxRatesSig = signal({
  base: 'USD',
  rates: { EGP: 0 },   // seed empty; user runs refreshFxRates() to populate
  fetchedAt: null,
  provider: '',
  error: '',
});

const STALE_MS = 24 * 60 * 60 * 1000; // 24 h

export function ratesAvailable() {
  const r = fxRatesSig.value.rates || {};
  return !!(r.EGP && Object.keys(r).length > 1);
}

export function ratesAreStale() {
  const t = fxRatesSig.value.fetchedAt;
  if (!t) return true;
  return (Date.now() - new Date(t).getTime()) > STALE_MS;
}

// Public exchange-rate API — no key required, CORS-friendly.
// Powered by exchangerate-api.com's open endpoint (data updates daily).
const ENDPOINT = 'https://open.er-api.com/v6/latest/USD';

export async function refreshFxRates() {
  try {
    const res = await fetch(ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    if (j.result !== 'success') throw new Error(j['error-type'] || 'API error');
    if (!j.rates?.EGP) throw new Error('missing EGP rate in response');
    fxRatesSig.value = {
      base: 'USD',
      rates: j.rates,
      fetchedAt: j.time_last_update_utc || new Date().toISOString(),
      provider: j.provider || 'open.er-api.com',
      error: '',
    };
    return true;
  } catch (e) {
    fxRatesSig.value = { ...fxRatesSig.value, error: e.message || String(e) };
    console.warn('[fx] refresh failed:', e);
    return false;
  }
}

// Refresh once at startup if we have no rates or they're > 24h old.
export function refreshFxIfStale() {
  if (ratesAreStale()) refreshFxRates();
}

// Convert an amount in `currency` to EGP using current rates. Returns 0 if unavailable.
export function toEGP(amount, currency) {
  amount = Number(amount) || 0;
  if (!amount) return 0;
  if (!currency || currency === 'EGP') return amount;
  const r = fxRatesSig.value.rates || {};
  if (!r.EGP || !r[currency]) return 0;
  return amount * r.EGP / r[currency];
}
