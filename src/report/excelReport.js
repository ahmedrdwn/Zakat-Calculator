import { fmt, fmtDate } from '../utils/index.js';
import { assetType } from '../models/index.js';
import { settingsSig, accountsSig, transactionsSig, activeLots } from '../state/store.js';

// Lazy-load SheetJS from CDN on first use — keeps bundle small.
let xlsxPromise = null;
function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (xlsxPromise) return xlsxPromise;
  xlsxPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => reject(new Error('فشل تحميل مكتبة Excel'));
    document.head.appendChild(s);
  });
  return xlsxPromise;
}

export async function downloadExcel(result) {
  try {
    const XLSX = await loadXLSX();
    const s = settingsSig.value;
    const accts = accountsSig.value;
    const acctById = Object.fromEntries(accts.map(a => [a.id, a]));
    const payer = s.payerName || '—';
    const date = new Date().toLocaleDateString('ar-EG');
    const ref = `PB-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000+Math.random()*9000)}`;

    const wb = XLSX.utils.book_new();
    const baseValue = result.mode === 'fifo' ? result.agedBase : result.pool;

    // Sheet 1: Zakat summary + assets
    const aoa = [
      ['تقرير الزكاة — البنك الشخصي'],
      ['دافع الزكاة', payer],
      ['تاريخ التقرير', date],
      ['رقم المرجع', ref],
      ['أسلوب الحول', result.mode === 'fifo' ? 'FIFO لكل بند' : 'الوعاء المُثبت'],
      [],
      ['ملخص النصاب والحول'],
      ['النصاب (ج.م)', +result.nisab.toFixed(2)],
      ['الوعاء الزكوي المؤهل (ج.م)', +baseValue.toFixed(2)],
      ...(result.mode === 'fifo' ? [['مبالغ لم يمر عليها الحول (ج.م)', +(result.youngPool || 0).toFixed(2)]] : []),
      ['بلوغ النصاب', result.reachedNisab ? 'نعم — واجبة' : 'لا — غير واجبة'],
      ['الزكاة المستحقة (ج.م)', +result.zakatDue.toFixed(2)],
      [],
      ['البنود المدرجة'],
      ['البند','التفاصيل','الحساب','تاريخ الاقتناء','القيمة (ج.م)','الزكاة 2.5%'],
      ...(result.contributing || []).map(l => {
        const t = assetType(l.assetType);
        return [
          `${t.label} — ${l.label || ''}`.trim(),
          l.karat ? `عيار ${l.karat}, ${l.weight} جم` : l.units ? `${l.units} وحدة` : '',
          acctById[l.accountId]?.name || '',
          l.acquiredAt || '',
          +l.valueEGP.toFixed(2),
          +(l.valueEGP * 0.025).toFixed(2),
        ];
      }),
      ['الإجمالي','','','',+baseValue.toFixed(2),+(baseValue*0.025).toFixed(2)],
    ];
    if (result.skipped && result.skipped.length) {
      aoa.push([], ['بنود مؤجلة — لم يُتمّ الحول']);
      aoa.push(['البند','تاريخ الاقتناء','باقٍ على الحول (يوم)','القيمة (ج.م)']);
      result.skipped.forEach(l => aoa.push([l.label || assetType(l.assetType).label, l.acquiredAt, l.daysToHawl, +l.valueEGP.toFixed(2)]));
    }
    const ws1 = XLSX.utils.aoa_to_sheet(aoa);
    ws1['!cols'] = [{ wch: 40 }, { wch: 30 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'الزكاة');

    // Sheet 2: All active lots
    const lotRows = [
      ['جميع الأصول النشطة'],
      ['نوع الأصل','الاسم','الحساب','تاريخ الاقتناء','المبلغ/الوزن/الوحدات','سعر الوحدة','القيمة الحالية (ج.م)','الغرض'],
      ...activeLots.value.map(l => [
        assetType(l.assetType).label,
        l.label || '',
        acctById[l.accountId]?.name || '',
        l.acquiredAt || '',
        l.amount || l.weight || l.units || 0,
        l.unitPrice || 0,
        +((l.currentValue) || 0).toFixed(2),
        l.purpose || '',
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(lotRows);
    ws2['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'الأصول');

    // Sheet 3: Transactions
    const txRows = [
      ['سجل الحركات'],
      ['التاريخ','النوع','من','إلى','المبلغ (ج.م)','التصنيف','ملاحظات','المرجع'],
      ...[...transactionsSig.value].sort((a,b) => (a.at||'').localeCompare(b.at||''))
        .map(t => [
          t.at || '',
          t.kind || '',
          acctById[t.fromAccountId]?.name || '',
          acctById[t.toAccountId]?.name || '',
          +(t.amount || 0).toFixed(2),
          t.category || '',
          t.notes || '',
          t.ref || '',
        ]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(txRows);
    ws3['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 30 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'الحركات');

    XLSX.writeFile(wb, `personal-bank-${ref}.xlsx`);
  } catch (e) {
    alert('تعذّر إنشاء ملف Excel: ' + e.message);
  }
}
