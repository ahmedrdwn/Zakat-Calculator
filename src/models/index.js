import { uid, nowISO, todayISO } from '../utils/index.js';

// Merge patch into defaults, ignoring undefined values so factories can supply real defaults.
function withDefaults(defaults, patch = {}) {
  const out = { ...defaults };
  for (const k in patch) if (patch[k] !== undefined) out[k] = patch[k];
  return out;
}

// ── Account kinds ─────────────────────────────────────────
// bank      → traditional bank account
// cash      → physical cash on hand
// wallet    → e-wallet (Vodafone Cash, Instapay, PayPal …)
// broker    → broker holding stocks/funds
// safe      → gold/silver storage (locker, safe deposit)
// realestate→ rental property (informational + income lots)
// business  → business bucket (inventory + biz cash + receivables)
export const ACCOUNT_KINDS = [
  { id: 'bank',       label: 'حساب بنكي',   icon: '🏦' },
  { id: 'cash',       label: 'نقد',          icon: '💵' },
  { id: 'wallet',     label: 'محفظة إلكترونية', icon: '📱' },
  { id: 'broker',     label: 'حساب وسيط',    icon: '📈' },
  { id: 'safe',       label: 'خزنة',         icon: '🔐' },
  { id: 'realestate', label: 'عقار',         icon: '🏘️' },
  { id: 'business',   label: 'نشاط تجاري',   icon: '🏪' },
];
export const accountKind = id => ACCOUNT_KINDS.find(k => k.id === id) || ACCOUNT_KINDS[0];

// ── Asset types (what a lot holds) ─────────────────────────
export const ASSET_TYPES = [
  { id: 'cash',       label: 'نقد',       icon: '💵', zakatDefault: true  },
  { id: 'gold',       label: 'ذهب',       icon: '🥇', zakatDefault: true  },
  { id: 'silver',     label: 'فضة',       icon: '🥈', zakatDefault: true  },
  { id: 'stock',      label: 'أسهم',      icon: '📈', zakatDefault: true  },
  { id: 'fund',       label: 'صندوق',     icon: '📊', zakatDefault: true  },
  { id: 'receivable', label: 'دين لك',    icon: '📩', zakatDefault: true  },
  { id: 'inventory',  label: 'بضاعة',     icon: '📦', zakatDefault: true  },
  { id: 'realestate', label: 'عقار',      icon: '🏘️', zakatDefault: false },
  { id: 'personal',   label: 'أصول شخصية', icon: '💎', zakatDefault: false },
];
export const assetType = id => ASSET_TYPES.find(t => t.id === id) || ASSET_TYPES[0];

// ── Masaref (eight lawful zakat recipients) ───────────────
export const MASAREF = [
  { id: 'fuqara',    label: 'الفقراء',        def: 'الذين لا يجدون ما يكفيهم', icon: '🤲' },
  { id: 'masakin',   label: 'المساكين',       def: 'الذين يجدون بعض الكفاية',   icon: '🏠' },
  { id: 'amilin',    label: 'العاملين عليها', def: 'جامعو الزكاة وموزعوها',      icon: '📋' },
  { id: 'muallafa',  label: 'المؤلفة قلوبهم', def: 'لتأليف القلوب على الإسلام',  icon: '💚' },
  { id: 'riqab',     label: 'في الرقاب',      def: 'تحرير الأرقاء',              icon: '⛓' },
  { id: 'gharimin',  label: 'الغارمين',       def: 'المدينون العاجزون عن السداد', icon: '💸' },
  { id: 'sabilillah',label: 'في سبيل الله',  def: 'الأعمال الخيرية',            icon: '🌟' },
  { id: 'ibnussabil',label: 'ابن السبيل',    def: 'المسافر المنقطع عن ماله',    icon: '🧳' },
];
export const masraf = id => MASAREF.find(m => m.id === id) || null;

// ── Lot purpose (informs default zakat treatment) ─────────
// zakat  → included in zakat base (default)
// wear   → jewelry meant to be worn (not zakated per some views — user can override)
// use    → personal use (car, home)
// trade  → intended for resale (زكاة عروض التجارة)
// invest → long-term investment
export const LOT_PURPOSES = [
  { id: 'zakat',  label: 'للزكاة (وعاء زكوي)' },
  { id: 'trade',  label: 'للمتاجرة' },
  { id: 'invest', label: 'للاستثمار' },
  { id: 'wear',   label: 'للاستعمال / الحلي' },
  { id: 'use',    label: 'للاستخدام الشخصي' },
];

// ── Transaction kinds ─────────────────────────────────────
export const TX_KINDS = [
  { id: 'deposit',    label: 'إيداع',         icon: '⬇' },
  { id: 'withdraw',   label: 'سحب',           icon: '⬆' },
  { id: 'transfer',   label: 'تحويل',         icon: '↔' },
  { id: 'buy',        label: 'شراء أصل',      icon: '🛒' },
  { id: 'sell',       label: 'بيع أصل',       icon: '💱' },
  { id: 'income',     label: 'دخل',           icon: '➕' },
  { id: 'expense',    label: 'مصروف',         icon: '➖' },
  { id: 'revalue',    label: 'إعادة تقييم',   icon: '📐' },
  { id: 'zakat_paid', label: 'زكاة مدفوعة',   icon: '🤲' },
  { id: 'adjust',     label: 'تسوية',         icon: '✏️' },
];
export const txKind = id => TX_KINDS.find(k => k.id === id) || TX_KINDS[0];

// ── Factories ─────────────────────────────────────────────
export function newAccount(patch = {}) {
  return withDefaults({
    id: uid(),
    name: '',
    kind: 'bank',
    currency: 'EGP',
    color: '#C9A84C',
    archived: false,
    notes: '',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }, patch);
}

/**
 * A lot: a dated acquisition unit.
 * amount:   for cash + receivable lots (in the account's currency)
 * remaining: how much of the amount is still un-consumed (FIFO)
 * weight:   grams (gold, silver)
 * karat:    18 / 21 / 22 / 24 (gold only)
 * units:    shares (stock) / units (fund) / count (inventory)
 * unitPrice: per gram / per share / per unit — current market
 * costBasis: total price paid at acquisition
 * currentValue: last computed market value in EGP-equivalent
 */
export function newLot(patch = {}) {
  return withDefaults({
    id: uid(),
    accountId: '',
    assetType: 'cash',
    acquiredAt: todayISO(),
    amount: 0,
    remaining: 0,
    weight: 0,
    karat: 24,
    units: 0,
    unitPrice: 0,
    costBasis: 0,
    currentValue: 0,
    label: '',
    purpose: 'zakat',
    zakatable: null,   // null → derive from purpose + assetType; boolean → user override
    disposedAt: null,
    notes: '',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }, patch);
}

export function newTransaction(patch = {}) {
  return withDefaults({
    id: uid(),
    at: todayISO(),
    kind: 'deposit',
    fromAccountId: null,
    toAccountId: null,
    fromLotId: null,
    toLotId: null,
    amount: 0,
    category: '',
    notes: '',
    ref: '',
    consumed: [],       // for FIFO: [{lotId, amount}]
    masrafId: null,     // for zakat_paid: one of MASAREF ids
    recipient: '',      // for zakat_paid: beneficiary name / description
    createdAt: nowISO(),
  }, patch);
}

// Effective zakatable flag: user override wins; else purpose + assetType default
export function isLotZakatable(lot) {
  if (lot.zakatable === true) return true;
  if (lot.zakatable === false) return false;
  if (lot.purpose === 'use' || lot.purpose === 'wear') return false;
  const t = assetType(lot.assetType);
  return t.zakatDefault;
}

// Current EGP-equivalent value of a lot (uses `remaining` for cash to reflect FIFO)
export function lotValueEGP(lot) {
  if (lot.disposedAt) return 0;
  switch (lot.assetType) {
    case 'cash':
    case 'receivable':
      return Number(lot.remaining ?? lot.amount) || 0;
    case 'gold':
    case 'silver':
      return (Number(lot.weight) || 0) * (Number(lot.unitPrice) || 0);
    case 'stock':
    case 'fund':
    case 'inventory':
      return (Number(lot.units) || 0) * (Number(lot.unitPrice) || 0);
    case 'realestate':
    case 'personal':
      return Number(lot.currentValue) || 0;
    default:
      return Number(lot.currentValue) || 0;
  }
}
