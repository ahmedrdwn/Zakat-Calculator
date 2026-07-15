import { computeZakat } from '../zakat/engine.js';
import { settingsSig } from '../state/store.js';
import { fmt, fmtDate } from '../utils/index.js';
import { openPrintReport } from '../report/printReport.js';
import { downloadExcel } from '../report/excelReport.js';

export function Reports() {
  const s = settingsSig.value;
  const result = computeZakat();

  return (
    <>
      <div class="page-title">
        <h1>التقارير</h1>
        <span class="sub">تقرير زكاة عربي كامل قابل للطباعة أو حفظه PDF، بالإضافة إلى Excel تفصيلي</span>
      </div>

      <div class="two-col">
        <div class="card">
          <div class="card-hd"><h3><span class="icon">🖨️</span>تقرير الزكاة (PDF)</h3></div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-dim);margin-bottom:14px">
              تقرير عربي كامل — ملخص النصاب والحول، تفصيل بند بند، الزكاة المستحقة، وسجل التوزيع.
            </p>
            <button class="btn btn-gold" style="width:100%" onClick={() => openPrintReport(result)}>🖨️ توليد تقرير PDF</button>
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><h3><span class="icon">📊</span>تقرير Excel</h3></div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-dim);margin-bottom:14px">
              ثلاث أوراق: ملخص وحساب الزكاة، سجل الحركات، وملخص المصارف — للتصدير والتخزين طويل الأمد.
            </p>
            <button class="btn btn-emerald" style="width:100%" onClick={() => downloadExcel(result)}>📥 تنزيل Excel</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-hd"><h3><span class="icon">📝</span>معاينة الأرقام قبل التصدير</h3></div>
        <div class="card-body">
          <div class="row"><div class="rmain"><div class="rname">دافع الزكاة</div></div><div class="rright"><div class="rval">{s.payerName || '—'}</div></div></div>
          <div class="row"><div class="rmain"><div class="rname">أسلوب الحول</div></div><div class="rright"><div class="rval">{result.mode === 'fifo' ? 'FIFO' : 'وعاء مُثبت'}</div></div></div>
          <div class="row"><div class="rmain"><div class="rname">النصاب</div></div><div class="rright"><div class="rval">{fmt(result.nisab)} ج.م</div></div></div>
          <div class="row"><div class="rmain"><div class="rname">الوعاء الزكوي المؤهل</div></div><div class="rright"><div class="rval">{fmt(result.mode === 'fifo' ? result.agedBase : result.pool)} ج.م</div></div></div>
          <div class="row"><div class="rmain"><div class="rname">الزكاة المستحقة</div></div><div class="rright"><div class="rval">{fmt(result.zakatDue)} ج.م</div></div></div>
        </div>
      </div>
    </>
  );
}
