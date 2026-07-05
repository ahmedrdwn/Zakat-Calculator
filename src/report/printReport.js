import { fmt, fmtDate, esc, daysSince } from '../utils/index.js';
import { assetType } from '../models/index.js';
import { settingsSig, accountsSig } from '../state/store.js';

function reportRef() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PB-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${rand}`;
}

/**
 * Open the Arabic Zakat report in a new window and trigger print.
 * `result` is the zakat engine result (from computeZakat()).
 */
export function openPrintReport(result) {
  const w = window.open('', '_blank');
  if (!w) { alert('يرجى السماح بالنوافذ المنبثقة لعرض التقرير.'); return; }
  w.document.open();
  w.document.write(buildHTML(result));
  w.document.close();
}

function buildHTML(result) {
  const s = settingsSig.value;
  const accts = accountsSig.value;
  const date = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  const ref = reportRef();
  const payer = esc(s.payerName || '');

  const acctById = Object.fromEntries(accts.map(a => [a.id, a]));

  const contribRows = (result.contributing || []).map(l => {
    const t = assetType(l.assetType);
    const a = acctById[l.accountId];
    return `<tr>
      <td class="r-name">${t.icon} ${esc(t.label)} — ${esc(l.label || '')}</td>
      <td class="r-detail">${a ? esc(a.name) + ' · ' : ''}${l.karat ? 'عيار ' + l.karat + ' · ' : ''}${l.weight ? l.weight + ' جم · ' : ''}${l.units ? l.units + ' وحدة · ' : ''}اقتُنيَ ${esc(fmtDate(l.acquiredAt))}</td>
      <td class="r-num">${fmt(l.valueEGP)}</td>
      <td class="r-num r-zak">${fmt(l.valueEGP * 0.025)}</td>
    </tr>`;
  }).join('');

  const skipRows = (result.skipped || []).map(l => {
    const t = assetType(l.assetType);
    return `<tr>
      <td class="r-name">${t.icon} ${esc(l.label || t.label)}</td>
      <td class="r-detail">اقتُنيَ ${esc(fmtDate(l.acquiredAt))} · باقٍ ${l.daysToHawl} يوم على الحول</td>
      <td class="r-num">${fmt(l.valueEGP)}</td>
    </tr>`;
  }).join('');

  const modeText = result.mode === 'fifo' ? 'FIFO (لكل مبلغ حوله)' : 'الوعاء المُثبت (حول واحد)';
  const baseValue = result.mode === 'fifo' ? result.agedBase : result.pool;
  const anchorNote = result.mode === 'pool' && result.anchor
    ? `تاريخ الحول: <strong>${esc(fmtDate(result.anchor))}</strong> · الذكرى: <strong>${esc(fmtDate(result.anniversary))}</strong>`
    : '';

  const verdictText = result.reachedNisab
    ? 'بلغ المال النصاب — الزكاة واجبة'
    : (result.mode === 'pool' && result.needsAnchor
        ? 'لم يُثبَّت تاريخ الحول بعد — لا يمكن الحكم'
        : 'الزكاة غير واجبة على الوعاء الحالي');

  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>تقرير الزكاة — ${ref}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Amiri:wght@700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Tajawal',sans-serif;background:#e9e9e6;color:#1e1e1e;line-height:1.55;}
.toolbar{position:sticky;top:0;z-index:9;display:flex;gap:8px;justify-content:center;padding:12px;background:#0D1B12;}
.toolbar button{font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;padding:9px 22px;border:none;border-radius:7px;cursor:pointer;}
.toolbar button.primary{background:#C9A84C;color:#0D1B12;}
.toolbar button.ghost{background:transparent;color:#C9A84C;border:1px solid #C9A84C;}
.page{max-width:820px;margin:20px auto;background:#fff;padding:34px 38px;box-shadow:0 4px 26px rgba(0,0,0,.16);}
.rhead{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:3px solid #C9A84C;padding-bottom:16px;margin-bottom:22px;}
.rhead-title{display:flex;gap:13px;align-items:center;}
.logo{width:50px;height:50px;border-radius:11px;background:linear-gradient(135deg,#1A6B3C,#0D1B12);color:#C9A84C;display:flex;align-items:center;justify-content:center;font-size:27px;flex-shrink:0;}
.rhead h1{font-family:'Amiri',serif;font-size:25px;color:#0D1B12;}
.rhead-title p{font-size:12px;color:#666;margin-top:2px;}
.rhead-meta{font-size:11.5px;text-align:left;white-space:nowrap;}
.rhead-meta div{margin-bottom:4px;}
.rhead-meta span{color:#999;margin-left:6px;}
.rhead-meta strong{color:#0D1B12;}
section{margin-bottom:22px;}
h2{font-size:15px;color:#1A6B3C;border-right:4px solid #C9A84C;padding-right:10px;margin-bottom:12px;}
.verdict{padding:11px 15px;border-radius:8px;font-weight:700;font-size:14px;margin-bottom:13px;}
.verdict-ok{background:#e7f5ec;color:#16683a;border:1px solid #aedcbf;}
.verdict-no{background:#fdeceb;color:#b5362a;border:1px solid #f0b8b2;}
.tbl{width:100%;border-collapse:collapse;font-size:12.5px;}
.tbl th{background:#0D1B12;color:#E8D08A;font-weight:700;padding:8px 10px;text-align:right;font-size:11.5px;}
.tbl td{padding:7px 10px;border-bottom:1px solid #eee;vertical-align:top;}
.tbl tbody tr:nth-child(even){background:#faf8f1;}
.tbl tfoot td{background:#f3edd9;font-weight:800;border-top:2px solid #C9A84C;}
.tbl.kv td:first-child{color:#555;}
.r-num{text-align:left;font-weight:700;white-space:nowrap;}
.r-zak{color:#16683a;}
.r-name{font-weight:700;}
.r-detail{color:#777;font-size:11px;}
.r-empty{text-align:center;color:#999;padding:15px;}
.row-strong td{background:#f3edd9;font-weight:800;border-top:1px solid #C9A84C;}
.note{background:#fbf7e8;border:1px solid #e7d9a8;border-radius:7px;padding:9px 13px;font-size:11.5px;color:#7a6418;margin-top:11px;}
.zakat-final{display:flex;align-items:center;justify-content:center;gap:20px;background:#0D1B12;border-radius:12px;padding:18px 26px;flex-wrap:wrap;}
.zf-calc{color:#8A9080;font-size:14px;font-weight:700;}
.zf-calc b{color:#E8D08A;font-weight:700;}
.zf-box{text-align:center;}
.zf-label{color:#8A9080;font-size:12px;margin-bottom:2px;}
.zf-amount{color:#C9A84C;font-size:31px;font-weight:800;font-family:'Amiri',serif;line-height:1;}
.zf-amount small{font-size:14px;}
.fineprint{font-size:10.5px;color:#999;margin-top:7px;}
.rfoot{border-top:1px solid #ddd;padding-top:13px;margin-top:26px;text-align:center;font-size:10.5px;color:#999;}
.rfoot p{margin-bottom:3px;}
@media print{
  body{background:#fff;}
  .page{box-shadow:none;margin:0;max-width:none;padding:0;}
  .no-print{display:none!important;}
  section,.zakat-final{page-break-inside:avoid;}
  @page{margin:14mm;}
}
</style>
</head><body>
<div class="toolbar no-print">
  <button class="primary" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  <button class="ghost" onclick="window.close()">إغلاق</button>
</div>
<div class="page">
  <header class="rhead">
    <div class="rhead-title">
      <div class="logo">☪</div>
      <div>
        <h1>تقرير الزكاة السنوية</h1>
        <p>البنك الشخصي — احتساب دقيق يراعي الحول</p>
      </div>
    </div>
    <div class="rhead-meta">
      ${payer ? `<div><span>دافع الزكاة</span><strong>${payer}</strong></div>` : ''}
      <div><span>تاريخ التقرير</span><strong>${date}</strong></div>
      <div><span>رقم المرجع</span><strong>${ref}</strong></div>
      <div><span>أسلوب الحول</span><strong>${modeText}</strong></div>
    </div>
  </header>

  <section>
    <h2>١ · ملخص النصاب والحول</h2>
    <div class="verdict ${result.reachedNisab ? 'verdict-ok' : 'verdict-no'}">${result.reachedNisab ? '✓' : '✕'} ${verdictText}</div>
    <table class="tbl kv"><tbody>
      <tr><td>النصاب (قيمة 85 جم ذهب)</td><td class="r-num">${fmt(result.nisab)} ج.م</td></tr>
      <tr><td>الوعاء ${result.mode === 'fifo' ? 'المؤهل (أتمّ الحول)' : 'الحالي'}</td><td class="r-num">${fmt(baseValue)} ج.م</td></tr>
      ${result.mode === 'fifo' ? `<tr><td>مبالغ لم يمر عليها الحول</td><td class="r-num">${fmt(result.youngPool || 0)} ج.م</td></tr>` : ''}
      <tr class="row-strong"><td>معدل الزكاة × الوعاء = الزكاة المستحقة</td><td class="r-num">${fmt(result.zakatDue)} ج.م</td></tr>
    </tbody></table>
    ${anchorNote ? `<div class="note">${anchorNote}</div>` : ''}
  </section>

  <section>
    <h2>٢ · البنود المدرجة في الحساب</h2>
    <table class="tbl">
      <thead><tr><th>البند</th><th>التفاصيل</th><th>القيمة (ج.م)</th><th>الزكاة 2.5%</th></tr></thead>
      <tbody>${contribRows || '<tr><td colspan="4" class="r-empty">لا بنود مدرجة</td></tr>'}</tbody>
      <tfoot><tr><td colspan="2">الإجمالي</td><td class="r-num">${fmt(baseValue)}</td><td class="r-num">${fmt(baseValue * 0.025)}</td></tr></tfoot>
    </table>
  </section>

  ${skipRows ? `<section>
    <h2>٣ · بنود مؤجلة (لم يُتمّ الحول)</h2>
    <table class="tbl">
      <thead><tr><th>البند</th><th>التفاصيل</th><th>القيمة (ج.م)</th></tr></thead>
      <tbody>${skipRows}</tbody>
    </table>
  </section>` : ''}

  <section class="zakat-final">
    <div class="zf-calc"><b>${fmt(baseValue)} ج.م</b> × <b>2.5%</b> =</div>
    <div class="zf-box">
      <div class="zf-label">الزكاة المستحقة</div>
      <div class="zf-amount">${fmt(result.zakatDue)} <small>ج.م</small></div>
    </div>
  </section>

  <footer class="rfoot">
    <p>هذا التقرير لأغراض الاسترشاد فقط. للتأكد من الأحكام الشرعية يُرجى مراجعة عالم أو جهة فتوى مختصة.</p>
    <p>تم الإنشاء بواسطة البنك الشخصي · رقم المرجع ${ref}</p>
  </footer>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){try{window.print();}catch(e){}},450);});<\/script>
</body></html>`;
}
