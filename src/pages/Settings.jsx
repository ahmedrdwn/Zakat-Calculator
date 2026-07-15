import { settingsSig, updateSettings } from '../state/store.js';
import { wipeAll } from '../data/storage.js';
import { Banner } from '../components/ui.jsx';

export function Settings() {
  const s = settingsSig.value;

  const set = k => e => {
    const v = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    updateSettings({ [k]: v });
  };

  const nisab = (s.goldPricePerGram || 0) * (s.nisabGoldGrams || 85);

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
        <div class="card-hd"><h3><span class="icon">⚖️</span>النصاب والحول</h3>
          {nisab > 0 && <span class="badge badge-gold">النصاب: {nisab.toLocaleString('ar-EG')} ج.م</span>}
        </div>
        <div class="card-body">
          <div class="frow">
            <div class="field">
              <label>سعر جرام الذهب عيار 24 (ج.م)</label>
              <div class="iw"><input type="number" step="0.01" value={s.goldPricePerGram || 0} onInput={set('goldPricePerGram')} /><span class="unit">ج.م</span></div>
            </div>
            <div class="field">
              <label>سعر جرام الفضة (ج.م)</label>
              <div class="iw"><input type="number" step="0.01" value={s.silverPricePerGram || 0} onInput={set('silverPricePerGram')} /><span class="unit">ج.م</span></div>
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
          <Banner tone="info">
            الأسعار تُستخدم لاحتساب النصاب وتقييم أصولك الذهبية والفضية. حدّثها دورياً بحسب السوق.
          </Banner>
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
