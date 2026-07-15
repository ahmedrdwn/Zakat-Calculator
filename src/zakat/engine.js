import { settingsSig, activeLots, zakatableLots, transactionsSig } from '../state/store.js';
import { fxRatesSig } from '../state/fx.js';
import { isLotZakatable, lotValueEGP } from '../models/index.js';
import { sum, isAged, daysSince, addDays } from '../utils/index.js';

const rates = () => fxRatesSig.value.rates || {};
const valueEGP = l => lotValueEGP(l, rates());

const ZAKAT_RATE = 0.025;

// Zakat payments (kind='zakat_paid') since a given ISO date (inclusive)
export function zakatPaidSince(sinceISO) {
  const bound = sinceISO || '';
  return transactionsSig.value
    .filter(t => t.kind === 'zakat_paid' && (!bound || (t.at || '') >= bound))
    .map(t => ({ ...t }));
}

// Start of the current zakat cycle, per mode
export function cycleStart(mode) {
  const s = settingsSig.value;
  mode = mode || s.hawlMode || 'fifo';
  if (mode === 'pool') {
    if (!s.poolHawlAnchor) return '';
    // last anniversary <= today
    let anchor = s.poolHawlAnchor;
    const hawl = s.hawlDays || 365;
    let a = anchor;
    // roll forward to the most recent anniversary that has already passed
    while (daysSince(addDays(a, hawl)) >= 0) a = addDays(a, hawl);
    return a;
  }
  // FIFO: rolling 12 months back from today
  return addDays(new Date().toISOString().slice(0,10), -(s.hawlDays || 365));
}

// Nisab (gold-based). Returns 0 if gold price not set.
export function nisabEGP() {
  const s = settingsSig.value;
  return (Number(s.goldPricePerGram) || 0) * (Number(s.nisabGoldGrams) || 85);
}

/**
 * FIFO mode: only lots aged >= hawlDays contribute to the base.
 * Returns:
 *  {
 *    mode, nisab, agedBase, youngPool, reachedNisab, zakatDue,
 *    contributing: [lots that count], skipped: [lots skipped because young]
 *  }
 */
export function computeFIFO() {
  const s = settingsSig.value;
  const hawlDays = s.hawlDays || 365;
  const nisab = nisabEGP();
  const contributing = [];
  const skipped = [];
  let agedBase = 0, youngPool = 0;
  for (const l of zakatableLots.value) {
    const v = valueEGP(l);
    if (isAged(l.acquiredAt, hawlDays)) {
      agedBase += v;
      contributing.push({ ...l, valueEGP: v });
    } else {
      youngPool += v;
      skipped.push({ ...l, valueEGP: v, daysToHawl: hawlDays - daysSince(l.acquiredAt) });
    }
  }
  const reachedNisab = nisab > 0 && agedBase >= nisab;
  const zakatDue = reachedNisab ? agedBase * ZAKAT_RATE : 0;
  return {
    mode: 'fifo', nisab, agedBase, youngPool,
    totalZakatable: agedBase + youngPool,
    reachedNisab, zakatDue, contributing, skipped,
  };
}

/**
 * Pool-anchored: user sets an anchor date (when the pool first hit nisab).
 * Anniversary = anchor + hawlDays. On or after anniversary, base = full current zakatable pool.
 * If anchor missing but pool currently >= nisab, suggest setting anchor to today.
 */
export function computePool() {
  const s = settingsSig.value;
  const hawlDays = s.hawlDays || 365;
  const nisab = nisabEGP();
  const anchor = s.poolHawlAnchor || '';
  const pool = sum(zakatableLots.value.map(lotValueEGP));
  const poolReachesNisab = nisab > 0 && pool >= nisab;

  const contributing = zakatableLots.value.map(l => ({ ...l, valueEGP: valueEGP(l) }));

  if (!anchor) {
    return {
      mode: 'pool', nisab, pool, reachedNisab: false, zakatDue: 0,
      needsAnchor: true, poolReachesNisab, contributing,
      suggestedAnchor: poolReachesNisab ? new Date().toISOString().slice(0,10) : null,
    };
  }
  const anniversary = addDays(anchor, hawlDays);
  const daysToAnniversary = -daysSince(anniversary); // positive = future
  const anniversaryReached = daysToAnniversary <= 0;
  const reachedNisab = anniversaryReached && poolReachesNisab;
  const zakatDue = reachedNisab ? pool * ZAKAT_RATE : 0;
  return {
    mode: 'pool', nisab, pool, anchor, anniversary,
    daysToAnniversary, anniversaryReached,
    poolReachesNisab, reachedNisab, zakatDue,
    contributing,
  };
}

export function computeZakat(mode) {
  mode = mode || settingsSig.value.hawlMode || 'fifo';
  const base = mode === 'pool' ? computePool() : computeFIFO();
  const start = cycleStart(mode);
  const paidTxs = zakatPaidSince(start);
  const paidInCycle = sum(paidTxs.map(t => t.amount));
  const remaining = Math.max(0, (base.zakatDue || 0) - paidInCycle);
  return { ...base, cycleStart: start, paidTxs, paidInCycle, remaining };
}

// Aggregate value by asset type for the contributing set
export function byAssetType(result) {
  const map = {};
  for (const l of result.contributing || []) {
    map[l.assetType] = (map[l.assetType] || 0) + l.valueEGP;
  }
  return map;
}
