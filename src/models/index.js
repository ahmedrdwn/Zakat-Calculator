import { uid, nowISO, todayISO } from '../utils/index.js';

// Merge patch into defaults, ignoring undefined values so factories can supply real defaults.
function withDefaults(defaults, patch = {}) {
  const out = { ...defaults };
  for (const k in patch) if (patch[k] !== undefined) out[k] = patch[k];
  return out;
}

// ── Currencies ────────────────────────────────────────────
// Base is EGP; all foreign amounts convert to EGP-equivalent for zakat.
export const CURRENCIES = [
  { code: 'EGP', label: 'الجنيه المصري',    symbol: 'ج.م' },
  { code: 'USD', label: 'الدولار الأمريكي',  symbol: '$'   },
  { code: 'CAD', label: 'الدولار الكندي',    symbol: 'C$'  },
  { code: 'EUR', label: 'اليورو',            symbol: '€'   },
  { code: 'GBP', label: 'الجنيه الاسترليني', symbol: '£'   },
  { code: 'AUD', label: 'الدولار الأسترالي', symbol: 'A$'  },
  { code: 'CHF', label: 'الفرنك السويسري',   symbol: 'Fr'  },
  { code: 'JPY', label: 'الين الياباني',     symbol: '¥'   },
  { code: 'CNY', label: 'اليوان الصيني',     symbol: '¥'   },
  { code: 'SAR', label: 'الريال السعودي',    symbol: '﷼'   },
  { code: 'AED', label: 'الدرهم الإماراتي',  symbol: 'د.إ' },
  { code: 'KWD', label: 'الدينار الكويتي',   symbol: 'د.ك' },
  { code: 'QAR', label: 'الريال القطري',     symbol: 'ر.ق' },
  { code: 'BHD', label: 'الدينار البحريني',  symbol: 'د.ب' },
  { code: 'OMR', label: 'الريال العماني',    symbol: 'ر.ع' },
  { code: 'JOD', label: 'الدينار الأردني',   symbol: 'د.أ' },
  { code: 'LBP', label: 'الليرة اللبنانية',  symbol: 'ل.ل' },
  { code: 'TRY', label: 'الليرة التركية',    symbol: '₺'   },
  { code: 'INR', label: 'الروبية الهندية',   symbol: '₹'   },
  { code: 'PKR', label: 'الروبية الباكستانية', symbol: '₨' },
  { code: 'MYR', label: 'الرينغيت الماليزي',  symbol: 'RM' },
  { code: 'IDR', label: 'الروبية الإندونيسية', symbol: 'Rp'},
];
export const currencyByCode = code => CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
export const currencyLabel = code => (currencyByCode(code).label + ' (' + code + ')');

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
    currency: 'EGP',   // for cash / receivable lots; ignored for gold/silver/stock (priced in EGP)
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

// Native (own-currency) value of a cash/receivable lot; EGP value for other assets.
export function lotNativeValue(lot) {
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

// Convert to EGP using a USD-based rates map: rates[X] = "1 USD in X units".
// If the lot is cash/receivable in a non-EGP currency, convert via USD.
// Non-cash lots are already EGP-native (unitPrice is EGP).
export function lotValueEGP(lot, rates) {
  const v = lotNativeValue(lot);
  if (!v) return 0;
  const t = lot.assetType;
  if (t !== 'cash' && t !== 'receivable') return v;
  const cur = lot.currency || 'EGP';
  if (cur === 'EGP') return v;
  if (!rates || !rates.EGP || !rates[cur]) return 0;
  // amount in `cur` → USD (÷ rates[cur]) → EGP (× rates.EGP)
  return v * rates.EGP / rates[cur];
}
