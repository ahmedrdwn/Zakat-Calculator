import { settingsSig, activeLots, zakatableLots } from '../state/store.js';
import { isLotZakatable, lotValueEGP } from '../models/index.js';
import { sum, isAged, daysSince, addDays } from '../utils/index.js';

const ZAKAT_RATE = 0.025;

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
    const v = lotValueEGP(l);
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

  const contributing = zakatableLots.value.map(l => ({ ...l, valueEGP: lotValueEGP(l) }));

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
  return mode === 'pool' ? computePool() : computeFIFO();
}

// Aggregate value by asset type for the contributing set
export function byAssetType(result) {
  const map = {};
  for (const l of result.contributing || []) {
    map[l.assetType] = (map[l.assetType] || 0) + l.valueEGP;
  }
  return map;
}
