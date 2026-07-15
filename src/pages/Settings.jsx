import { useState } from 'preact/hooks';
import { settingsSig, updateSettings, activeAccounts } from '../state/store.js';
import { fxRatesSig, refreshFxRates } from '../state/fx.js';
import { metalPricesSig, refreshMetalPrices,
  goldEGPPerGram, silverEGPPerGram } from '../state/metals.js';
import { CURRENCIES } from '../models/index.js';
import { fmt, fmtDate, relArabic } from '../utils/index.js';
import { wipeAll } from '../data/storage.js';
import { Banner } from '../components/ui.jsx';

export function Settings() {
  const s = settingsSig.value;
  const fx = fxRatesSig.value;
  const [refreshing, setRefreshing] = useState(false);

  const set = k => e => {
    const v = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    updateSettings({ [k]: v });
  };

  const nisabPrice = Number(s.goldPricePerGram) || goldEGPPerGram.value || 0;
  const nisab = nisabPrice * (s.nisabGoldGrams || 85);

  // Currencies actually used by user's accounts (to show relevant rates)
  const usedCurrencies = new Set(activeAccounts.value.map(a => a.currency).filter(c => c && c !== 'EGP'));
  const displayRates = CURRENCIES
    .filter(c => c.code !== 'EGP' && (usedCurrencies.has(c.code) || ['USD','EUR','GBP','CAD','SAR'].includes(c.code)))
    .map(c => {
      const r = fx.rates?.[c.code];
      const egp = fx.rates?.EGP;
      // 1 foreign = X EGP
      const oneUnitInEGP = (r && egp) ? egp / r : null;
      return { ...c, oneUnitInEGP };
    });

  const doRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshFxRates(), refreshMetalPrices()]);
    setRefreshing(false);
  };

  const metals = metalPricesSig.value;
  const goldLive = goldEGPPerGram.value;
  const silverLive = silverEGPPerGram.value;
  const [refreshingMetals, setRefreshingMetals] = useState(false);
  const doRefreshMetals = async () => {
    setRefreshingMetals(true);
    await refreshMetalPrices();
    setRefreshingMetals(false);
  };

  return (
    <>
      <div class="page-title">
        <h1>الإعدادات</h1>
        <span class="sub">النصاب، الحول، اسم دافع الزكاة، وأدوات النسخ الاحتياطي</span>
      </div>

      <div class="card">
        <div class="card-hd"><h3><span class="icon">👤</span>الملف الشخصي</h3></div>
        <div class="card-body">
          <div class="frow">
            <div class="field">
              <label>اسم دافع الزكاة</label>
              <input type="text" value={s.payerName || ''} onInput={set('payerName')} placeholder="يظهر في التقارير" />
            </div>
            <div class="field">
              <label>العملة الافتراضية</label>
              <select value={s.defaultCurrency || 'EGP'} onChange={set('defaultCurrency')}>
                <option value="EGP">جنيه مصري</option>
                <option value="USD">دولار</option>
                <option value="SAR">ريال سعودي</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-hd">
          <h3><span class="icon">🥇</span>أسعار الذهب والفضة اللحظية</h3>
          <div style="display:flex;align-items:center;gap:8px">
            {metals.fetchedAt && <span class="badge badge-emerald" title={fmtDate(metals.fetchedAt)}>🔴 مباشر · {relArabic(metals.fetchedAt)}</span>}
            <button class="btn btn-ghost btn-sm" disabled={refreshingMetals} onClick={doRefreshMetals}>
              {refreshingMetals ? '⏳' : '↻'} تحديث
            </button>
          </div>
        </div>
        <div class="card-body">
          <Banner tone="info">
            السعر اللحظي يُجلب من سوق المعادن العالمي ويُحوَّل إلى الجنيه المصري عبر سعر صرف الدولار. يتحدّث تلقائياً كل ١٥ دقيقة وعند فتح التطبيق.
          </Banner>
          {metals.error && !metals.fetchedAt && (
            <Banner tone="warn">تعذّر جلب أسعار المعادن: {metals.error}. يمكنك إدخال السعر يدوياً أدناه.</Banner>
          )}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
            <div class="row" style="margin-bottom:0">
              <div class="rmain">
                <div class="rname">🥇 جرام ذهب عيار 24</div>
                <div class="rmeta">${fmt(metals.goldUSDPerOz)} للأونصة</div>
              </div>
              <div class="rright">
                <div class="rval">{goldLive > 0 ? fmt(goldLive) : '—'} ج.م</div>
                <div class="rsub">لحظي</div>
              </div>
            </div>
            <div class="row" style="margin-bottom:0">
              <div class="rmain">
                <div class="rname">🥈 جرام فضة</div>
                <div class="rmeta">${fmt(metals.silverUSDPerOz)} للأونصة</div>
              </div>
              <div class="rright">
                <div class="rval">{silverLive > 0 ? fmt(silverLive) : '—'} ج.م</div>
                <div class="rsub">لحظي</div>
              </div>
            </div>
          </div>
          <p style="font-size:11.5px;color:var(--text-muted);margin-top:12px;text-align:center">
            هذه أسعار السبك (24 عيار) بدون مصنعية. لعياري 21 أو 22 نُحسب النسبة تلقائياً عند تقييم الأصل.
          </p>
        </div>
      </div>

      <div class="card">
        <div class="card-hd"><h3><span class="icon">⚖️</span>النصاب والحول</h3>
          {nisab > 0 && <span class="badge badge-gold">النصاب: {nisab.toLocaleString('ar-EG')} ج.م</span>}
        </div>
        <div class="card-body">
          <div class="frow">
            <div class="field">
              <label>سعر جرام الذهب عيار 24 (يدوي، اختياري)</label>
              <div class="iw"><input type="number" step="0.01" value={s.goldPricePerGram || 0} onInput={set('goldPricePerGram')} placeholder={goldLive > 0 ? String(Math.round(goldLive)) : '0'} /><span class="unit">ج.م</span></div>
              <div class="hint">{goldLive > 0 && !s.goldPricePerGram ? `يُستخدم السعر اللحظي: ${fmt(goldLive)} ج.م` : 'اترك 0 لاستخدام السعر اللحظي'}</div>
            </div>
            <div class="field">
              <label>سعر جرام الفضة (يدوي، اختياري)</label>
              <div class="iw"><input type="number" step="0.01" value={s.silverPricePerGram || 0} onInput={set('silverPricePerGram')} placeholder={silverLive > 0 ? String(Math.round(silverLive * 100) / 100) : '0'} /><span class="unit">ج.م</span></div>
              <div class="hint">{silverLive > 0 && !s.silverPricePerGram ? `يُستخدم السعر اللحظي: ${fmt(silverLive)} ج.م` : 'اترك 0 لاستخدام السعر اللحظي'}</div>
            </div>
            <div class="field">
              <label>نصاب الذهب (جرام)</label>
              <input type="number" step="1" value={s.nisabGoldGrams || 85} onInput={set('nisabGoldGrams')} />
            </div>
            <div class="field">
              <label>مدة الحول (يوم)</label>
              <input type="number" step="1" value={s.hawlDays || 365} onInput={set('hawlDays')} />
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-hd">
          <h3><span class="icon">💱</span>أسعار صرف العملات</h3>
          <div style="display:flex;align-items:center;gap:8px">
            {fx.fetchedAt && <span class="badge badge-muted">آخر تحديث: {fmtDate(fx.fetchedAt)}</span>}
            <button class="btn btn-ghost btn-sm" disabled={refreshing} onClick={doRefresh}>
              {refreshing ? '⏳ يحدّث…' : '↻ تحديث'}
            </button>
          </div>
        </div>
        <div class="card-body">
          <Banner tone="info">
            حسابات العملات الأجنبية تُحوَّل تلقائياً إلى الجنيه المصري لاحتساب صافي الثروة والزكاة.
            الأسعار تُجلب من <code style="color:var(--gold)">exchangerate-api.com</code> — مفتوحة ومجانية وتُحدَّث يومياً.
          </Banner>
          {fx.error && <Banner tone="warn">تعذّر جلب الأسعار: {fx.error}. سيتم استخدام آخر أسعار محفوظة.</Banner>}
          {!fx.fetchedAt && !fx.error && (
            <Banner tone="warn">لم يتم جلب أسعار الصرف بعد. اضغط «تحديث» لجلبها.</Banner>
          )}
          {fx.fetchedAt && displayRates.length > 0 && (
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:12px">
              {displayRates.map(c => (
                <div class="row" style="margin-bottom:0" key={c.code}>
                  <div class="rmain">
                    <div class="rname">{c.code} — {c.symbol}</div>
                    <div class="rmeta">{c.label}</div>
                  </div>
                  <div class="rright">
                    <div class="rval">{c.oneUnitInEGP != null ? fmt(c.oneUnitInEGP) : '—'} ج.م</div>
                    <div class="rsub">لكل 1 {c.code}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div class="card">
        <div class="card-hd"><h3><span class="icon">💾</span>البيانات والاسترداد</h3></div>
        <div class="card-body">
          <Banner tone="warn">
            <strong>ملاحظة:</strong> بياناتك محفوظة محلياً في هذا المتصفح فقط. صدّر نسخة احتياطية بانتظام لتجنب فقدها.
          </Banner>
          <button class="btn btn-danger" onClick={() => {
            if (confirm('هل أنت متأكد من مسح كل البيانات؟ لا يمكن التراجع.')) wipeAll();
          }}>🗑️ مسح كل البيانات</button>
        </div>
      </div>

      <div class="card">
        <div class="card-hd"><h3><span class="icon">ℹ️</span>حول التطبيق</h3></div>
        <div class="card-body">
          <p style="font-size:13px;color:var(--text-dim);line-height:1.7">
            <strong style="color:var(--gold)">البنك الشخصي</strong> — تطبيق يعمل داخل متصفحك بالكامل لتسجيل ثروتك عبر جميع حساباتك وأشكال الأصول، مع احتساب زكاة دقيق يراعي الحول لكل بند.
            جميع البيانات محفوظة محلياً في متصفحك ولا تُرسل إلى أي خادم.
            <br /><br />
            هذا التطبيق أداة مساعدة، ولا يغني عن مراجعة أهل العلم للمسائل الشرعية.
          </p>
        </div>
      </div>
    </>
  );
}
