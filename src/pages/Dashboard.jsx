import { useState } from 'preact/hooks';
import { activeAccounts, activeLots, netWorthEGP, byAssetType, hawlAging,
  accountBalance, settingsSig, routeSig, addAccount } from '../state/store.js';
import { fmt, fmtInt } from '../utils/index.js';
import { ASSET_TYPES, assetType } from '../models/index.js';
import { computeZakat, nisabEGP } from '../zakat/engine.js';
import { EmptyState, Banner } from '../components/ui.jsx';
import { LotForm } from '../components/LotForm.jsx';
import { TransactionForm } from '../components/TransactionForm.jsx';
import { AccountForm } from '../components/AccountForm.jsx';

// Quick-add chips — most-used asset types get a one-tap surface on the dashboard.
const QUICK = [
  { id: 'cash',       label: 'نقد',    icon: '💵', defaultAcct: { name: 'نقد يدوي',  kind: 'cash' } },
  { id: 'gold',       label: 'ذهب',    icon: '🥇', defaultAcct: { name: 'خزنة الذهب', kind: 'safe' } },
  { id: 'silver',     label: 'فضة',    icon: '🥈', defaultAcct: { name: 'خزنة الفضة', kind: 'safe' } },
  { id: 'stock',      label: 'أسهم',   icon: '📈', defaultAcct: { name: 'حساب الوسيط', kind: 'broker' } },
  { id: 'fund',       label: 'صندوق',  icon: '📊', defaultAcct: { name: 'حساب الوسيط', kind: 'broker' } },
  { id: 'receivable', label: 'دين لك', icon: '📩', defaultAcct: { name: 'ديون مستحقة', kind: 'cash' } },
];

export function Dashboard() {
  const [showLot, setShowLot] = useState(false);
  const [quickAsset, setQuickAsset] = useState(null);
  const [quickAcctId, setQuickAcctId] = useState('');
  const [showTx, setShowTx] = useState(false);
  const [showAcc, setShowAcc] = useState(false);

  const nw = netWorthEGP.value;
  const cat = byAssetType.value;
  const aging = hawlAging.value;
  const nisab = nisabEGP();
  const z = computeZakat();
  const s = settingsSig.value;
  const accts = activeAccounts.value;
  const noData = activeLots.value.length === 0 && accts.length === 0;

  // Tap a quick-add chip → open LotForm pre-set to that asset type.
  // If a matching holder already exists (same kind), reuse it silently.
  // Otherwise auto-create a sensible default so the user doesn't have to
  // bounce to the Accounts tab first.
  const openQuickAdd = q => {
    const match = accts.find(a => a.kind === q.defaultAcct.kind);
    let acctId;
    if (match) {
      acctId = match.id;
    } else {
      const created = addAccount({ name: q.defaultAcct.name, kind: q.defaultAcct.kind, currency: 'EGP' });
      acctId = created.id;
    }
    setQuickAcctId(acctId);
    setQuickAsset(q.id);
  };

  return (
    <>
      <div class="page-title">
        <h1>لوحة الثروة</h1>
        <span class="sub">{s.payerName ? `مرحباً ${s.payerName}` : 'أهلاً بك في بنكك الشخصي'}</span>
      </div>

      {noData && (
        <>
          <EmptyState
            icon="🌱"
            title="ابدأ ببناء بنكك الشخصي"
            message="اضغط أحد الأصول أدناه لإضافته مباشرةً — سننشئ لك الحساب المناسب تلقائياً — أو أنشئ حساباً بنكياً / محفظة أولاً."
            action={<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
              <button class="btn btn-ghost" onClick={() => setShowAcc(true)}>➕ حساب مخصّص</button>
              <button class="btn btn-ghost" onClick={() => routeSig.value = 'settings'}>⚙️ إعدادات النصاب</button>
            </div>}
          />
          <QuickAddChips onPick={openQuickAdd} />
        </>
      )}

      {!noData && (
        <QuickAddChips onPick={openQuickAdd} />
      )}

      {!noData && (
        <>
          {/* Stat tiles */}
          <div class="stats">
            <div class="stat">
              <div class="lbl">صافي الثروة</div>
              <div class="val gold">{fmt(nw)} <small>ج.م</small></div>
              <div class="sub">{accts.length} حسابات · {activeLots.value.length} أصل</div>
            </div>
            <div class="stat">
              <div class="lbl">النصاب الحالي</div>
              <div class="val">{nisab > 0 ? fmt(nisab) : '—'} <small>ج.م</small></div>
              <div class="sub">{nisab > 0 ? '85 جم ذهب × سعر الجرام' : 'أدخل سعر الذهب في الإعدادات'}</div>
            </div>
            <div class="stat">
              <div class="lbl">مال أتم الحول</div>
              <div class="val emerald">{fmt(aging.aged)} <small>ج.م</small></div>
              <div class="sub">{aging.total > 0 ? `${Math.round(aging.aged / aging.total * 100)}% من الوعاء` : '—'}</div>
            </div>
            <div class="stat">
              <div class="lbl">الزكاة المستحقة</div>
              <div class="val gold">{fmt(z.zakatDue)} <small>ج.م</small></div>
              <div class="sub">{z.mode === 'fifo' ? 'حساب FIFO — الأصول التي أتمت السنة' : 'حساب الحول المُثبت'}</div>
            </div>
          </div>

          {/* Hawl aging bar */}
          <div class="card">
            <div class="card-hd"><h3><span class="icon">⏳</span>عمر الوعاء الزكوي</h3>
              <span class="badge badge-muted">حول = {s.hawlDays || 365} يوم</span>
            </div>
            <div class="card-body">
              {aging.total > 0 ? <>
                <div class="aging">
                  {aging.aged > 0 && <div class="seg aged" style={`flex:${aging.aged}`}>أتمّ الحول · {fmt(aging.aged)} ج.م</div>}
                  {aging.young > 0 && <div class="seg young" style={`flex:${aging.young}`}>لم يُتمّ · {fmt(aging.young)} ج.م</div>}
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11.5px;color:var(--text-dim)">
                  <span>💰 الوعاء الزكوي: {fmt(aging.total)} ج.م</span>
                  <span>النصاب: {nisab > 0 ? fmt(nisab) : '—'} ج.م</span>
                </div>
              </> : <div class="empty" style="padding:20px">لا توجد أصول ضمن الوعاء الزكوي بعد.</div>}
            </div>
          </div>

          {/* By asset type */}
          <div class="card">
            <div class="card-hd"><h3><span class="icon">📊</span>توزيع الأصول</h3></div>
            <div class="card-body">
              {ASSET_TYPES.map(t => {
                const v = cat[t.id] || 0;
                if (v <= 0) return null;
                const pct = nw > 0 ? v / nw * 100 : 0;
                return (
                  <div key={t.id} style="margin-bottom:12px">
                    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">
                      <span>{t.icon} {t.label}</span>
                      <span style="color:var(--gold);font-weight:700">{fmt(v)} ج.م <span style="color:var(--text-dim);font-size:11px">({pct.toFixed(1)}%)</span></span>
                    </div>
                    <div class="prog"><div class="prog-fill" style={`width:${pct}%`} /></div>
                  </div>
                );
              })}
              {Object.keys(cat).length === 0 && <div class="empty" style="padding:20px">لا أصول بعد — أضف أصلاً لبدء متابعة ثروتك.</div>}
            </div>
          </div>

          {/* Accounts summary */}
          <div class="card">
            <div class="card-hd"><h3><span class="icon">🏦</span>الحسابات</h3>
              <button class="btn btn-ghost btn-sm" onClick={() => routeSig.value = 'accounts'}>عرض الكل ←</button>
            </div>
            <div class="card-body">
              {accts.slice(0, 5).map(a => (
                <div class="row" key={a.id}>
                  <div class="rmain">
                    <div class="rname">{a.name}</div>
                    <div class="rmeta">{a.currency} · {a.kind}</div>
                  </div>
                  <div class="rright">
                    <div class="rval">{fmt(accountBalance(a.id))} ج.م</div>
                  </div>
                </div>
              ))}
              {accts.length === 0 && <div class="empty" style="padding:16px">لا حسابات — أضف الأول.</div>}
            </div>
          </div>
        </>
      )}

      {/* Sticky quick actions */}
      <div class="sticky-total">
        <div class="sticky-inner">
          <div>
            <div class="lbl">صافي الثروة</div>
            <div class="big"><span class="cur">ج.م</span>{fmt(nw)}</div>
          </div>
          <div class="actions">
            <button class="btn btn-ghost" onClick={() => setShowAcc(true)}>➕ حساب</button>
            <button class="btn btn-gold" onClick={() => setShowLot(true)}>➕ أصل</button>
            <button class="btn btn-emerald" onClick={() => setShowTx(true)}>💱 حركة</button>
          </div>
        </div>
      </div>

      <AccountForm open={showAcc} onClose={() => setShowAcc(false)} />
      <LotForm open={showLot} onClose={() => setShowLot(false)} />
      <LotForm
        open={!!quickAsset}
        defaultAssetType={quickAsset}
        defaultAccountId={quickAcctId}
        onClose={() => { setQuickAsset(null); setQuickAcctId(''); }}
      />
      <TransactionForm open={showTx} onClose={() => setShowTx(false)} />
    </>
  );
}

function QuickAddChips({ onPick }) {
  return (
    <div class="card">
      <div class="card-hd">
        <h3><span class="icon">➕</span>أضف بسرعة</h3>
        <span class="badge badge-muted">اختر نوع الأصل</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px">
          {QUICK.map(q => (
            <button
              key={q.id}
              class="btn btn-ghost"
              onClick={() => onPick(q)}
              style="flex-direction:column;padding:16px 10px;gap:8px;height:auto;border:1.5px solid var(--gold-border);background:var(--bg3);"
            >
              <span style="font-size:28px;line-height:1">{q.icon}</span>
              <span style="font-size:13px;font-weight:700;color:var(--text)">{q.label}</span>
            </button>
          ))}
        </div>
        <p style="font-size:11.5px;color:var(--text-muted);margin-top:12px;text-align:center">
          سيُسجَّل التاريخ تلقائياً — كل بند له حوله الخاص من يوم الاقتناء.
        </p>
      </div>
    </div>
  );
}
