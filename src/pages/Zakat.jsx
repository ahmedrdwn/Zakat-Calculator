import { useState } from 'preact/hooks';
import { settingsSig, updateSettings, activeLots } from '../state/store.js';
import { computeZakat, nisabEGP } from '../zakat/engine.js';
import { assetType } from '../models/index.js';
import { fmt, fmtDate, daysSince, todayISO } from '../utils/index.js';
import { Banner, EmptyState } from '../components/ui.jsx';

export function Zakat() {
  const s = settingsSig.value;
  const [mode, setMode] = useState(s.hawlMode || 'fifo');
  const nisab = nisabEGP();
  const result = computeZakat(mode);

  const setModePersist = m => { setMode(m); updateSettings({ hawlMode: m }); };

  return (
    <>
      <div class="page-title">
        <h1>احتساب الزكاة</h1>
        <span class="sub">اختر أسلوب الحول ثم راجع تفاصيل الحساب</span>
      </div>

      {nisab <= 0 && (
        <Banner tone="warn">
          <strong>سعر جرام الذهب غير مضبوط.</strong> بدونه لا يمكن حساب النصاب. اضبطه من صفحة <a href="#" onClick={e => { e.preventDefault(); window.location.hash = '#settings'; }} style="color:var(--gold)">الإعدادات</a>.
        </Banner>
      )}

      <div class="chip-row">
        <button class={'chip' + (mode === 'fifo' ? ' active' : '')} onClick={() => setModePersist('fifo')}>📅 FIFO — لكل مبلغ حوله</button>
        <button class={'chip' + (mode === 'pool' ? ' active' : '')} onClick={() => setModePersist('pool')}>⚓ الوعاء المُثبت — حول واحد للمجموع</button>
      </div>

      <Banner tone="info">
        {mode === 'fifo'
          ? <>«FIFO» — يحسب الزكاة فقط على الأصول التي مرّ عليها {s.hawlDays || 365} يوم أو أكثر (كل مبلغ يحسب حوله من تاريخ اقتنائه).</>
          : <>«الوعاء المُثبت» — تحدد أنت تاريخ الحول الأصلي (حين بلغ مالك النصاب أول مرة)، ثم عند كل ذكرى سنوية نحسب زكاة الوعاء الكامل الحاضر عندها.</>}
      </Banner>

      {/* Summary tiles */}
      <div class="stats">
        <div class="stat">
          <div class="lbl">النصاب</div>
          <div class="val">{fmt(nisab)} <small>ج.م</small></div>
          <div class="sub">85 جم ذهب</div>
        </div>
        {mode === 'fifo' ? <>
          <div class="stat">
            <div class="lbl">الوعاء المؤهل (أتمّ الحول)</div>
            <div class="val emerald">{fmt(result.agedBase)} <small>ج.م</small></div>
            <div class="sub">{result.contributing.length} بند</div>
          </div>
          <div class="stat">
            <div class="lbl">لم يُتمّ الحول بعد</div>
            <div class="val amber">{fmt(result.youngPool)} <small>ج.م</small></div>
            <div class="sub">{result.skipped.length} بند</div>
          </div>
        </> : <>
          <div class="stat">
            <div class="lbl">الوعاء الزكوي الحالي</div>
            <div class="val">{fmt(result.pool)} <small>ج.م</small></div>
            <div class="sub">{result.contributing.length} بند</div>
          </div>
          <div class="stat">
            <div class="lbl">تاريخ الحول</div>
            <div class="val" style="font-size:16px">{result.anchor ? fmtDate(result.anchor) : '—'}</div>
            <div class="sub">{result.anniversary ? `الذكرى: ${fmtDate(result.anniversary)}` : 'اضبط تاريخ الحول أدناه'}</div>
          </div>
        </>}
        <div class="stat">
          <div class="lbl">الزكاة المستحقة</div>
          <div class="val gold">{fmt(result.zakatDue)} <small>ج.م</small></div>
          <div class="sub">{result.reachedNisab ? '✓ الزكاة واجبة' : '— غير واجبة الآن'}</div>
        </div>
      </div>

      {mode === 'pool' && (
        <div class="card">
          <div class="card-hd"><h3><span class="icon">⚓</span>تاريخ الحول المُثبت</h3></div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-dim);margin-bottom:12px">
              حدد التاريخ الذي بلغ مالك فيه النصاب لأول مرة. عند كل ذكرى سنوية لهذا التاريخ تحسب الزكاة على مجموع الوعاء الحاضر عندئذٍ.
            </p>
            <div class="frow">
              <div class="field">
                <label>تاريخ بلوغ النصاب</label>
                <input type="date" value={s.poolHawlAnchor || ''} onInput={e => updateSettings({ poolHawlAnchor: e.target.value })} />
              </div>
              {result.suggestedAnchor && (
                <div class="field">
                  <label>&nbsp;</label>
                  <button class="btn btn-emerald btn-sm" onClick={() => updateSettings({ poolHawlAnchor: result.suggestedAnchor })}>
                    اقتراح: اضبطه على اليوم ({fmtDate(result.suggestedAnchor)})
                  </button>
                </div>
              )}
            </div>
            {result.anniversaryReached === false && result.anchor && (
              <Banner tone="info">
                <strong>باقٍ على الحول:</strong> {result.daysToAnniversary} يوماً حتى تاريخ {fmtDate(result.anniversary)}.
              </Banner>
            )}
          </div>
        </div>
      )}

      {/* Contributing lots */}
      <div class="card">
        <div class="card-hd"><h3><span class="icon">✅</span>البنود المُدرجة في الحساب</h3>
          <span class="badge badge-emerald">{result.contributing.length}</span>
        </div>
        <div class="card-body">
          {result.contributing.length === 0
            ? <EmptyState icon="🕊️" title="لا بنود مدرجة" message={mode === 'fifo' ? 'لم يُتمّ الحول على أيّ من أصولك بعد.' : 'أضف أصولاً إلى وعائك الزكوي.'} />
            : result.contributing.map(l => {
                const t = assetType(l.assetType);
                return (
                  <div class="row" key={l.id}>
                    <div class="rmain">
                      <div class="rname">{t.icon} {t.label} — {l.label || 'بند'}</div>
                      <div class="rmeta">اقتُنيَ {fmtDate(l.acquiredAt)} · منذ {daysSince(l.acquiredAt)} يوم</div>
                    </div>
                    <div class="rright"><div class="rval">{fmt(l.valueEGP)} ج.م</div></div>
                  </div>
                );
              })}
        </div>
      </div>

      {mode === 'fifo' && result.skipped.length > 0 && (
        <div class="card">
          <div class="card-hd"><h3><span class="icon">⏳</span>بنود لم يمر عليها الحول</h3>
            <span class="badge badge-amber">{result.skipped.length}</span>
          </div>
          <div class="card-body">
            {result.skipped.map(l => {
              const t = assetType(l.assetType);
              return (
                <div class="row" key={l.id}>
                  <div class="rmain">
                    <div class="rname">{t.icon} {t.label} — {l.label || 'بند'}</div>
                    <div class="rmeta">اقتُنيَ {fmtDate(l.acquiredAt)} · باقٍ {l.daysToHawl} يوم على الحول</div>
                  </div>
                  <div class="rright"><div class="rval" style="color:var(--amber)">{fmt(l.valueEGP)} ج.م</div></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
