import { signal, computed } from '@preact/signals';
import { fxRatesSig } from './fx.js';

// Live spot gold/silver in USD per troy ounce, refreshed periodically from a
// free public API and combined with the USD→EGP FX rate to produce prices in
// EGP per gram. Nisab and asset revaluation prefer these live prices when the
// user hasn't entered a manual override in Settings.
const OUNCE_TO_GRAM = 31.1034768;
const REFRESH_MS = 15 * 60 * 1000; // 15 minutes

export const metalPricesSig = signal({
  goldUSDPerOz: 0,
  silverUSDPerOz: 0,
  fetchedAt: null,
  provider: '',
  error: '',
});

// Derived: EGP per gram (live). Zero if either the metal price or the FX rate
// isn't loaded yet — callers should treat 0 as "unknown" and fall back to a
// manual entry.
export const goldEGPPerGram = computed(() => {
  const usd = metalPricesSig.value.goldUSDPerOz;
  const rate = fxRatesSig.value.rates?.EGP;
  if (!usd || !rate) return 0;
  return usd / OUNCE_TO_GRAM * rate;
});

export const silverEGPPerGram = computed(() => {
  const usd = metalPricesSig.value.silverUSDPerOz;
  const rate = fxRatesSig.value.rates?.EGP;
  if (!usd || !rate) return 0;
  return usd / OUNCE_TO_GRAM * rate;
});

async function fetchMetal(metal) {
  // gold-api.com — free, no key, CORS-friendly. XAU / XAG codes.
  const res = await fetch(`https://api.gold-api.com/price/${metal}`);
  if (!res.ok) throw new Error(`${metal} HTTP ${res.status}`);
  const j = await res.json();
  const price = Number(j?.price);
  if (!price) throw new Error(`${metal}: no price in response`);
  return price;
}

export async function refreshMetalPrices() {
  try {
    const [gold, silver] = await Promise.all([fetchMetal('XAU'), fetchMetal('XAG')]);
    metalPricesSig.value = {
      goldUSDPerOz: gold,
      silverUSDPerOz: silver,
      fetchedAt: new Date().toISOString(),
      provider: 'gold-api.com',
      error: '',
    };
    return true;
  } catch (e) {
    metalPricesSig.value = { ...metalPricesSig.value, error: e.message || String(e) };
    // eslint-disable-next-line no-console
    console.warn('[metals] refresh failed:', e);
    return false;
  }
}

export function ratesAreStale() {
  const t = metalPricesSig.value.fetchedAt;
  if (!t) return true;
  return (Date.now() - new Date(t).getTime()) > REFRESH_MS;
}

export function refreshMetalsIfStale() {
  if (ratesAreStale()) refreshMetalPrices();
}

let intervalHandle = null;
export function startMetalsAutoRefresh() {
  if (intervalHandle || typeof window === 'undefined') return;
  intervalHandle = setInterval(() => { refreshMetalPrices(); }, REFRESH_MS);
  // Also refresh on tab focus so a phone waking up shows current prices.
  window.addEventListener('focus', refreshMetalsIfStale);
  document.addEventListener?.('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshMetalsIfStale();
  });
}
