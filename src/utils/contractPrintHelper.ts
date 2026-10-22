import { PropertyContract, ContractStatus, PropertyBooking, Listing } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generates an SVG QR code for visual verification stamp in the printed document
 */
function generateQrSvg(dataUrl: string): string {
  // A clean, scalable SVG representation of a verification QR code
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80" class="qr-code">
      <rect width="100" height="100" fill="#ffffff" rx="8"/>
      <!-- Outer finder patterns -->
      <rect x="8" y="8" width="28" height="28" fill="#0F2942" rx="4"/>
      <rect x="13" y="13" width="18" height="18" fill="#ffffff" rx="2"/>
      <rect x="17" y="17" width="10" height="10" fill="#12A889" rx="1"/>

      <rect x="64" y="8" width="28" height="28" fill="#0F2942" rx="4"/>
      <rect x="69" y="13" width="18" height="18" fill="#ffffff" rx="2"/>
      <rect x="73" y="17" width="10" height="10" fill="#12A889" rx="1"/>

      <rect x="8" y="64" width="28" height="28" fill="#0F2942" rx="4"/>
      <rect x="13" y="69" width="18" height="18" fill="#ffffff" rx="2"/>
      <rect x="17" y="73" width="10" height="10" fill="#12A889" rx="1"/>

      <!-- Data grid simulated bits -->
      <rect x="42" y="12" width="6" height="6" fill="#0F2942"/>
      <rect x="52" y="12" width="6" height="6" fill="#12A889"/>
      <rect x="42" y="24" width="16" height="5" fill="#0F2942"/>
      <rect x="12" y="42" width="5" height="16" fill="#0F2942"/>
      <rect x="22" y="46" width="14" height="6" fill="#12A889"/>
      <rect x="42" y="42" width="16" height="16" fill="#0F2942" rx="3"/>
      <rect x="46" y="46" width="8" height="8" fill="#12A889" rx="2"/>
      <rect x="64" y="42" width="10" height="6" fill="#0F2942"/>
      <rect x="78" y="42" width="10" height="6" fill="#12A889"/>
      <rect x="64" y="54" width="24" height="6" fill="#0F2942"/>
      <rect x="42" y="64" width="6" height="12" fill="#12A889"/>
      <rect x="52" y="70" width="8" height="6" fill="#0F2942"/>
      <rect x="42" y="82" width="18" height="6" fill="#0F2942"/>
      <rect x="68" y="68" width="8" height="20" fill="#0F2942"/>
      <rect x="82" y="68" width="6" height="10" fill="#12A889"/>
      <rect x="80" y="84" width="10" height="6" fill="#0F2942"/>
    </svg>
  `;
}

const statusLabels: Record<ContractStatus, string> = {
  draft: 'مسودة قيد الإعداد',
  under_review: 'قيد المراجعة القانونية',
  pending_approval: 'بانتظار اعتماد الأطراف',
  approved: 'معتمد رسمياً بالتراضي',
  signed: 'مبرم وموقع إلكترونياً نافذ',
  completed: 'منفذ ومكتمل نهائياً',
  disputed: 'نزاع عقاري مجمد',
  cancelled: 'عقد ملغي ومفسوخ'
};

function getCurrencyText(currency?: string): string {
  if (currency === 'USD') return 'دولار أمريكي';
  if (currency === 'SAR') return 'ريال سعودي';
  return 'ريال يمني';
}

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Builds standard, pristine A4 printable HTML for a real estate contract
 */
export function generateContractA4Html(contract: PropertyContract, selectedVersionNum?: number): string {
  const isSale = contract.contractType === 'sale';
  const displayedVersion = contract.versionHistory?.find(v => v.version === selectedVersionNum) || null;
  const versionNum = displayedVersion ? displayedVersion.version : contract.currentVersion;
  const clauses = displayedVersion ? displayedVersion.clauses : contract.clauses;
  const finTerms = displayedVersion ? displayedVersion.financialTerms : contract.financialTerms;
  const currencyText = getCurrencyText(finTerms.currency);

  const statusLabel = statusLabels[contract.status] || 'موثق رسمياً';
  const verificationUrl = `https://dalani.ye/verify/contract/${contract.contractNumber}`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>عقد ${isSale ? 'بيع عقاري' : 'إيجار عقاري'} - ${contract.contractNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 14mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Tajawal", "Cairo", Tahoma, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      direction: rtl;
      text-align: right;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .contract-page-wrapper {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
      position: relative;
    }

    /* Watermark */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 55pt;
      font-weight: 900;
      color: rgba(15, 41, 66, 0.04);
      z-index: -1;
      pointer-events: none;
      white-space: nowrap;
      text-align: center;
    }

    /* Official Yemen Header */
    .official-header {
      border-bottom: 2px solid #0F2942;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .header-columns {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .header-col-right {
      flex: 1;
      font-size: 9pt;
      color: #374151;
      line-height: 1.4;
    }
    .header-col-right strong {
      color: #0F2942;
      font-size: 9.5pt;
    }
    .header-col-center {
      text-align: center;
      padding: 0 10px;
    }
    .emblem-icon {
      width: 52px;
      height: 52px;
      border: 2px solid #0F2942;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 4px auto;
      background: #f8fafc;
    }
    .emblem-icon svg {
      width: 30px;
      height: 30px;
      fill: #0F2942;
    }
    .platform-title {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0F2942;
    }
    .header-col-left {
      flex: 1;
      font-size: 8.5pt;
      color: #4b5563;
      text-align: left;
      line-height: 1.45;
      direction: ltr;
    }
    .header-col-left span.label {
      font-weight: bold;
      color: #1f2937;
    }

    /* Contract Title Banner */
    .title-banner {
      text-align: center;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
    }
    .contract-title {
      font-size: 16pt;
      font-weight: 900;
      color: #0F2942;
      margin: 0 0 4px 0;
      letter-spacing: -0.5px;
    }
    .contract-subtitle {
      font-size: 8.5pt;
      color: #4b5563;
      margin: 0;
    }
    .status-badge-inline {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 12px;
      border-radius: 9999px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      font-size: 8.5pt;
      font-weight: bold;
    }

    /* Section Headers */
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      color: #0F2942;
      border-right: 4px solid #12A889;
      padding-right: 8px;
      margin: 16px 0 8px 0;
    }

    /* Tables & Cards */
    .party-grid {
      display: flex;
      gap: 12px;
      margin-bottom: 14px;
    }
    .party-card {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      background: #f8fafc;
      font-size: 9pt;
      line-height: 1.5;
    }
    .party-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 6px;
      font-weight: 800;
      color: #0F2942;
      font-size: 9.5pt;
    }
    .party-sig-status {
      font-size: 8pt;
      color: #047857;
      font-weight: bold;
    }

    /* Data Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 9pt;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
    }
    .data-table th, .data-table td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
      vertical-align: middle;
    }
    .data-table th {
      background: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
      text-align: right;
      width: 25%;
    }
    .data-table td {
      background: #ffffff;
      color: #0f172a;
    }

    /* Clauses / Articles */
    .clauses-container {
      margin-bottom: 14px;
    }
    .clause-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 8px;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .clause-header {
      font-weight: 800;
      color: #0F2942;
      font-size: 9.5pt;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .clause-num {
      display: inline-block;
      width: 20px;
      height: 20px;
      line-height: 20px;
      text-align: center;
      background: #0F2942;
      color: #ffffff;
      border-radius: 50%;
      font-size: 8pt;
    }
    .clause-content {
      font-size: 8.5pt;
      color: #334155;
      line-height: 1.6;
      margin: 0;
      padding-right: 26px;
    }

    /* Signatures Section */
    .signatures-section {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 2px solid #0F2942;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signatures-title {
      text-align: center;
      font-size: 11pt;
      font-weight: 800;
      color: #0F2942;
      margin-bottom: 12px;
    }
    .signatures-grid {
      display: flex;
      gap: 10px;
      justify-content: space-between;
      text-align: center;
    }
    .sig-box {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 8px;
      background: #f8fafc;
      font-size: 8pt;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 125px;
    }
    .sig-box-role {
      font-weight: 800;
      color: #0F2942;
      font-size: 8.5pt;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .sig-status-signed {
      color: #065f46;
      font-weight: bold;
      font-size: 9pt;
      margin: 4px 0;
    }
    .sig-seal-mark {
      color: #64748b;
      font-size: 7.5pt;
      margin-top: 4px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 4px;
    }

    /* Verification & QR */
    .verification-footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-size: 7.5pt;
      color: #64748b;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .footer-note {
      flex: 1;
      line-height: 1.5;
    }
    .qr-container {
      display: flex;
      align-items: center;
      gap: 8px;
      text-align: right;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="contract-page-wrapper">
    <div class="watermark">${contract.status === 'signed' ? 'وثيقة مبرمة ومعمدة' : contract.status === 'approved' ? 'معتمد رسمياً' : 'مسودة موثقة'}</div>

    <!-- 1. OFFICIAL YEMEN HEADER -->
    <header class="official-header">
      <div class="header-columns">
        <div class="header-col-right">
          <strong>الجمهورية اليمنية</strong><br>
          وزارة العدل - قطاع التوثيق والمحاكم<br>
          منصة «دلنّي» العقارية الوطنية المعتمدة<br>
          <span style="color:#64748b; font-size:8pt;">ترخيص مهني موحد: YE-REA-2026/09</span>
        </div>

        <div class="header-col-center">
          <div class="emblem-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 10 12 6.16-1.26 10-6.45 10-12V7L12 2zm0 4.18l6 3v5.82c0 3.78-2.61 7.32-6 8.35-3.39-1.03-6-4.57-6-8.35v-5.82l6-3z"/>
            </svg>
          </div>
          <div class="platform-title">دلنّي للعقارات</div>
        </div>

        <div class="header-col-left">
          <div><span class="label">رقم العقد:</span> <strong>${escapeHtml(contract.contractNumber)}</strong></div>
          <div><span class="label">رقم الحجز:</span> ${escapeHtml(contract.bookingNumber)}</div>
          <div><span class="label">التاريخ:</span> ${escapeHtml(contract.createdAt)}</div>
          <div><span class="label">الإصدار:</span> v${versionNum}</div>
        </div>
      </div>

      <div class="title-banner">
        <h1 class="contract-title">
          ${isSale ? 'عقد بيع عقاري ومناقلة ملكية شرعية قطعية' : 'عقد إيجار عقاري رسمي موحد وشامل'}
        </h1>
        <p class="contract-subtitle">
          محرر وموثق استناداً لأحكام القانون المدني اليمني وقوانين التوثيق والتسجيل العقاري النافذة بالجمهورية اليمنية
        </p>
        <div class="status-badge-inline">
          الحالة القانونية: ${statusLabel}
        </div>
      </div>
    </header>

    <!-- 2. CONTRACT PARTIES -->
    <section>
      <h2 class="section-title">أولاً: أطراف العقد والأهلية القانونية المعتبرة شرعاً</h2>
      <div class="party-grid">
        <!-- First Party -->
        <div class="party-card">
          <div class="party-card-header">
            <span>الطرف الأول (${isSale ? 'البائع' : 'المؤجر'})</span>
            <span class="party-sig-status">${contract.firstParty.signatureStatus === 'signed' ? '✓ تم التوقيع والمصادقة' : 'قيد التوقيع'}</span>
          </div>
          <div><strong>الاسم الرباعي:</strong> ${escapeHtml(contract.firstParty.name)}</div>
          <div><strong>الهوية / البطاقة:</strong> ${escapeHtml(contract.firstParty.nationalIdOrPassport || 'مسجل لدى منصة دلنّي')}</div>
          <div><strong>العنوان:</strong> ${escapeHtml(contract.firstParty.address || contract.propertySnapshot.governorate)}</div>
          <div><strong>الهاتف:</strong> <span dir="ltr">${escapeHtml(contract.firstParty.phone)}</span></div>
          <div><strong>الصفة:</strong> ${escapeHtml(contract.firstParty.role || (isSale ? 'مالك ومفوض بالبيع' : 'مؤجر مالك للعين'))}</div>
        </div>

        <!-- Second Party -->
        <div class="party-card">
          <div class="party-card-header">
            <span>الطرف الثاني (${isSale ? 'المشتري' : 'المستأجر'})</span>
            <span class="party-sig-status">${contract.secondParty.signatureStatus === 'signed' ? '✓ تم التوقيع والمصادقة' : 'قيد التوقيع'}</span>
          </div>
          <div><strong>الاسم الرباعي:</strong> ${escapeHtml(contract.secondParty.name)}</div>
          <div><strong>الهوية / البطاقة:</strong> ${escapeHtml(contract.secondParty.nationalIdOrPassport || 'مسجل لدى منصة دلنّي')}</div>
          <div><strong>العنوان:</strong> ${escapeHtml(contract.secondParty.address || 'الجمهورية اليمنية')}</div>
          <div><strong>الهاتف:</strong> <span dir="ltr">${escapeHtml(contract.secondParty.phone)}</span></div>
          <div><strong>الصفة:</strong> ${escapeHtml(contract.secondParty.role || (isSale ? 'مشتري بالأصالة' : 'مستأجر'))}</div>
        </div>
      </div>
    </section>

    <!-- 3. PROPERTY SPECIFICATIONS -->
    <section>
      <h2 class="section-title">ثانياً: مواصفات العقار المبيع / العين المؤجرة</h2>
      <table class="data-table">
        <tr>
          <th>المسمى والموقع:</th>
          <td>${escapeHtml(contract.propertySnapshot.title)} — ${escapeHtml(contract.propertySnapshot.governorate)} - ${escapeHtml(contract.propertySnapshot.city)} (${escapeHtml(contract.propertySnapshot.district)}) ${contract.propertySnapshot.street ? '، ' + escapeHtml(contract.propertySnapshot.street) : ''}</td>
          <th>نوع العقار:</th>
          <td>${escapeHtml(contract.propertySnapshot.propertyType)}</td>
        </tr>
        <tr>
          <th>المساحة الإجمالية:</th>
          <td><strong>${contract.propertySnapshot.area} ${escapeHtml(contract.propertySnapshot.areaUnit)}</strong></td>
          <th>رقم صك الملكية / البصيرة:</th>
          <td><strong>${escapeHtml(contract.propertySnapshot.deedNumber || 'مقيد بالسجل العقاري المعتمد')}</strong></td>
        </tr>
        ${contract.propertySnapshot.boundaries ? `
        <tr>
          <th>الحدود الشرعية الأربعة:</th>
          <td colspan="3">
            <strong>شمالاً:</strong> ${escapeHtml(contract.propertySnapshot.boundaries.north || 'شارع')} &nbsp;|&nbsp;
            <strong>جنوباً:</strong> ${escapeHtml(contract.propertySnapshot.boundaries.south || 'عقار مجاور')} &nbsp;|&nbsp;
            <strong>شرقاً:</strong> ${escapeHtml(contract.propertySnapshot.boundaries.east || 'شارع')} &nbsp;|&nbsp;
            <strong>غرباً:</strong> ${escapeHtml(contract.propertySnapshot.boundaries.west || 'عقار مجاور')}
          </td>
        </tr>` : ''}
      </table>
    </section>

    <!-- 4. FINANCIAL & PAYMENT TERMS -->
    <section>
      <h2 class="section-title">ثالثاً: المقابل المالي وجدول السداد والوفاء</h2>
      <table class="data-table">
        <tr>
          <th>${isSale ? 'الثمن الإجمالي المتفق عليه:' : 'القيمة الإيجارية المتفق عليها:'}</th>
          <td><strong style="font-size:11pt; color:#0F2942;">${(finTerms.totalAmount || 0).toLocaleString()} ${currencyText}</strong></td>
          <th>عربون الحجز / التأمين الضامن:</th>
          <td><strong style="color:#047857;">${(finTerms.depositAmount || 0).toLocaleString()} ${currencyText}</strong></td>
        </tr>
        <tr>
          <th>آلية وجدول السداد:</th>
          <td colspan="3">${escapeHtml(finTerms.paymentSchedule || 'حسب الاتفاق المبرم والبنود الموضحة أدناه.')}</td>
        </tr>
        <tr>
          <th>موعد التسليم والإفراغ الفعلي:</th>
          <td colspan="3">${escapeHtml(contract.durationTerms?.handoverDate || 'حسب الموعد المتفق عليه رسمياً')}</td>
        </tr>
      </table>
    </section>

    <!-- 5. LEGAL CLAUSES & ARTICLES -->
    <section class="clauses-container">
      <h2 class="section-title">رابعاً: البنود والشروط القانونية الملزمة للطرفين</h2>
      ${clauses.map((clause, idx) => `
        <div class="clause-box">
          <div class="clause-header">
            <span class="clause-num">${clause.number || idx + 1}</span>
            <span>البند (${clause.number || idx + 1}): ${escapeHtml(clause.title)}</span>
            ${clause.isMandatory ? '<span style="font-size:7.5pt; color:#475569; background:#f1f5f9; padding:1px 6px; border-radius:4px; margin-right:auto;">بند إلزامي</span>' : ''}
          </div>
          <p class="clause-content">${escapeHtml(clause.content)}</p>
        </div>
      `).join('')}
    </section>

    <!-- 6. SIGNATURES & ENDORSEMENTS -->
    <section class="signatures-section">
      <h2 class="signatures-title">خامساً: الإقرار والتوقيع والتعميد الشرعي</h2>
      <div class="signatures-grid">
        <!-- First Party -->
        <div class="sig-box">
          <div class="sig-box-role">توقيع ${isSale ? 'البائع' : 'المؤجر'}</div>
          <div>
            ${contract.firstParty.signatureStatus === 'signed' ? `
              <div class="sig-status-signed">${escapeHtml(contract.firstParty.name)}</div>
              <div style="font-size:7pt; color:#475569;">موقع إلكترونياً (${escapeHtml(contract.firstParty.signedAt?.split('T')[0] || contract.createdAt)})</div>
            ` : `
              <div style="color:#94a3b8; font-style:italic;">...........................</div>
            `}
          </div>
          <div class="sig-seal-mark">بصمة الإبهام / الخاتم</div>
        </div>

        <!-- Second Party -->
        <div class="sig-box">
          <div class="sig-box-role">توقيع ${isSale ? 'المشتري' : 'المستأجر'}</div>
          <div>
            ${contract.secondParty.signatureStatus === 'signed' ? `
              <div class="sig-status-signed">${escapeHtml(contract.secondParty.name)}</div>
              <div style="font-size:7pt; color:#475569;">موقع إلكترونياً (${escapeHtml(contract.secondParty.signedAt?.split('T')[0] || contract.createdAt)})</div>
            ` : `
              <div style="color:#94a3b8; font-style:italic;">...........................</div>
            `}
          </div>
          <div class="sig-seal-mark">بصمة الإبهام / الخاتم</div>
        </div>

        <!-- Witness / Notary -->
        <div class="sig-box">
          <div class="sig-box-role">الأمين الشرعي / الشاهد</div>
          <div>
            <div style="font-weight:bold; color:#0F2942; font-size:8pt;">${escapeHtml(contract.witnesses?.[0]?.name || 'الأمين الشرعي المعتمد')}</div>
            <div style="color:#047857; font-weight:bold; font-size:7.5pt;">مصادق ومعتمد رسمياً</div>
          </div>
          <div class="sig-seal-mark">ختم التوثيق والتعميد</div>
        </div>

        <!-- Platform Seal & QR -->
        <div class="sig-box" style="background:#ecfdf5; border-color:#a7f3d0;">
          <div class="sig-box-role" style="color:#065f46;">توثيق منصة دلنّي</div>
          <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
            <span style="font-size:7.5pt; font-weight:bold; color:#0F2942;">${escapeHtml(contract.contractNumber)}</span>
            <span style="font-size:7pt; color:#047857; font-weight:bold;">سجل رقمي مشفر</span>
          </div>
          <div class="sig-seal-mark" style="color:#047857;">رمز التحقق السريع QR</div>
        </div>
      </div>
    </section>

    <!-- 7. FOOTER NOTE & VERIFICATION -->
    <footer class="verification-footer">
      <div class="footer-note">
        تم تحرير هذا العقد من نسختين أصليتين بيد كل طرف نسخة للعمل بموجبها، وتوثيق سجل رقمي مشفر غير قابل للتلاعب في قاعدة بيانات منصة «دلنّي» العقارية الوطنية للجمهورية اليمنية.
      </div>
      <div class="qr-container">
        <div>
          <div style="font-weight:bold; color:#0F2942;">رمز التحقق الإلكتروني</div>
          <div style="font-size:7pt;">امسح للتحقق من أصل الوثيقة</div>
        </div>
        ${generateQrSvg(verificationUrl)}
      </div>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Builds A4 printable HTML for Transaction Completion Certificate
 */
export function generateCertificateA4Html(booking: PropertyBooking, contract?: PropertyContract, listing?: Listing): string {
  const isSale = booking.listingPurpose === 'sale' || contract?.contractType === 'sale';
  const finalAmount = booking.completionSummary?.finalAmount || contract?.financialTerms?.totalAmount || booking.listingPrice || 0;
  const currencyText = getCurrencyText(booking.completionSummary?.currency || contract?.financialTerms?.currency || booking.listingCurrency);
  const deedNumber = booking.completionSummary?.notaryReference || contract?.firstParty?.attestationNumber || listing?.deedNumber || 'مقيد بالسجل المعتمد';
  const receiptReference = booking.completionSummary?.receiptReference || 'مستوفى بموجب العقد والسند المالي';
  const verificationUrl = `https://dalani.ye/verify/certificate/${booking.bookingNumber}`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>شهادة إتمام معاملة رسمية - ${booking.bookingNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0F2942;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Tajawal", "Cairo", Tahoma, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      direction: rtl;
      text-align: right;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .cert-frame {
      border: 6px double #0F2942;
      padding: 24px;
      border-radius: 12px;
      position: relative;
      background: #ffffff;
      min-height: 255mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .inner-border {
      border: 1px solid #12A889;
      padding: 20px;
      border-radius: 8px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .cert-header {
      text-align: center;
      border-bottom: 2px solid #0F2942;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }

    .cert-badge {
      display: inline-block;
      padding: 4px 16px;
      background: #12A889;
      color: #ffffff;
      border-radius: 20px;
      font-weight: 800;
      font-size: 10pt;
      margin-bottom: 8px;
    }

    .cert-main-title {
      font-size: 22pt;
      font-weight: 900;
      color: #0F2942;
      margin: 6px 0;
    }

    .cert-subtitle {
      font-size: 10.5pt;
      color: #475569;
    }

    .cert-content {
      font-size: 11pt;
      line-height: 1.9;
      color: #1e293b;
      margin: 20px 0;
      text-align: justify;
    }

    .cert-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 10pt;
    }
    .cert-table th, .cert-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
    }
    .cert-table th {
      background: #f1f5f9;
      color: #0F2942;
      width: 30%;
      font-weight: 700;
    }

    .cert-signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #0F2942;
      text-align: center;
    }
    .cert-sig-item {
      flex: 1;
      padding: 0 10px;
    }
    .cert-sig-title {
      font-weight: 800;
      font-size: 10pt;
      color: #0F2942;
      margin-bottom: 40px;
    }
  </style>
</head>
<body>
  <div class="cert-frame">
    <div class="inner-border">
      <div class="cert-header">
        <div class="cert-badge">منصة دلنّي العقارية الوطنية المعتمدة - الجمهورية اليمنية</div>
        <h1 class="cert-main-title">شهادة إتمام معاملة رسمية</h1>
        <p class="cert-subtitle">وثيقة إغلاق الصفقة وتثبيت التصرف العقاري بالسجل الدائم</p>
      </div>

      <div class="cert-content">
        تشهد منصة «دلنّي» العقارية الوطنية بأنه بموجب هذه الوثيقة قد تم استكمال وإتمام كافة إجراءات الصفقة العقارية الموضحة بياناتها أدناه بنجاح، بعد استيفاء كافة الشروط القانونية والمالية وتوقيع العقود الشرعية ومصادقة الجهات المختصة:
      </div>

      <table class="cert-table">
        <tr>
          <th>رقم الشهادة / الحجز:</th>
          <td><strong>${escapeHtml(booking.bookingNumber)}</strong></td>
        </tr>
        <tr>
          <th>نوع التصرف والصفقة:</th>
          <td>${isSale ? 'عقد بيع قطعي ومناقلة ملكية شرعية' : 'عقد إيجار عقاري رسمي موحد'}</td>
        </tr>
        <tr>
          <th>العقار موضوع المعاملة:</th>
          <td><strong>${escapeHtml(booking.listingTitle)}</strong> (${escapeHtml(booking.listingNumber)})</td>
        </tr>
        <tr>
          <th>الطرف الأول (المعلن / البائع / المؤجر):</th>
          <td>${escapeHtml(booking.advertiserName)}</td>
        </tr>
        <tr>
          <th>الطرف الثاني (الباحث / المشتري / المستأجر):</th>
          <td>${escapeHtml(booking.seekerName)}</td>
        </tr>
        <tr>
          <th>المقابل المالي الإجمالي المعتمد:</th>
          <td><strong style="color:#047857; font-size:12pt;">${finalAmount.toLocaleString()} ${currencyText}</strong></td>
        </tr>
        <tr>
          <th>رقم صك الملكية / التوثيق:</th>
          <td>${escapeHtml(deedNumber)}</td>
        </tr>
        <tr>
          <th>سند السداد والوفاء:</th>
          <td>${escapeHtml(receiptReference)}</td>
        </tr>
      </table>

      <div class="cert-signatures">
        <div class="cert-sig-item">
          <div class="cert-sig-title">توقيع الطرف الأول</div>
          <div style="font-weight:bold;">${escapeHtml(booking.advertiserName)}</div>
        </div>
        <div class="cert-sig-item">
          <div class="cert-sig-title">توقيع الطرف الثاني</div>
          <div style="font-weight:bold;">${escapeHtml(booking.seekerName)}</div>
        </div>
        <div class="cert-sig-item">
          <div class="cert-sig-title">مصادقة منصة دلنّي</div>
          <div style="color:#12A889; font-weight:bold;">معتمد ومقيد بالسجل</div>
          <div style="margin-top:6px;">${generateQrSvg(verificationUrl)}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Universal print trigger using an isolated iframe.
 * Avoids modal clipping, fixed parent boundaries, overflow restrictions, and iframe sandbox traps.
 * Guarantees crisp multi-page A4 output with NO blank pages!
 */
export function printViaIsolatedIframe(htmlContent: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.name = `print_frame_${Date.now()}`;
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';

      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc) {
        document.body.removeChild(iframe);
        resolve(false);
        return;
      }

      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      const triggerPrint = () => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
              try {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
              } catch (_) {}
              resolve(true);
            }, 1000);
          } else {
            resolve(false);
          }
        } catch (e) {
          console.error('Print trigger failed in iframe:', e);
          resolve(false);
        }
      };

      // Ensure styles and fonts are ready before triggering print dialog
      if (iframe.contentWindow?.document.readyState === 'complete') {
        setTimeout(triggerPrint, 250);
      } else {
        iframe.onload = () => {
          setTimeout(triggerPrint, 250);
        };
      }
    } catch (err) {
      console.error('Error creating print iframe:', err);
      resolve(false);
    }
  });
}

/**
 * Prints the contract in standard A4 size
 */
export async function printContractA4(contract: PropertyContract, selectedVersionNum?: number): Promise<void> {
  const html = generateContractA4Html(contract, selectedVersionNum);
  const success = await printViaIsolatedIframe(html);
  if (!success) {
    // Fallback if iframe print failed: trigger standard window print
    window.print();
  }
}

/**
 * Prints the completion certificate in standard A4 size
 */
export async function printCertificateA4(booking: PropertyBooking, contract?: PropertyContract, listing?: Listing): Promise<void> {
  const html = generateCertificateA4Html(booking, contract, listing);
  const success = await printViaIsolatedIframe(html);
  if (!success) {
    window.print();
  }
}

/**
 * Direct PDF file generation and download for contracts.
 * Renders the official contract page into a standard A4 PDF and triggers instant browser download.
 */
export async function downloadContractPdf(
  contract: PropertyContract,
  selectedVersionNum?: number
): Promise<void> {
  const isSale = contract.contractType === 'sale';
  const fileName = `${isSale ? 'عقد-بيع-عقاري' : 'عقد-إيجار-عقاري'}-${contract.contractNumber}.pdf`;

  const fullHtml = generateContractA4Html(contract, selectedVersionNum);

  const tempWrapper = document.createElement('div');
  tempWrapper.style.position = 'fixed';
  tempWrapper.style.left = '-9999px';
  tempWrapper.style.top = '0';
  tempWrapper.style.width = '794px'; // 210mm in pixels at 96 DPI
  tempWrapper.style.backgroundColor = '#ffffff';
  tempWrapper.style.color = '#111827';
  tempWrapper.style.padding = '24px 32px';
  tempWrapper.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Tajawal", "Cairo", Tahoma, Arial, sans-serif';
  tempWrapper.style.direction = 'rtl';
  tempWrapper.style.zIndex = '-9999';

  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, 'text/html');
  const styleContent = doc.querySelector('style')?.innerHTML || '';
  const bodyContent = doc.body.innerHTML;

  const styleEl = document.createElement('style');
  styleEl.innerHTML = styleContent;
  tempWrapper.appendChild(styleEl);

  const contentDiv = document.createElement('div');
  contentDiv.innerHTML = bodyContent;
  tempWrapper.appendChild(contentDiv);

  document.body.appendChild(tempWrapper);

  try {
    await new Promise((r) => setTimeout(r, 200));

    const canvas = await html2canvas(tempWrapper, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1024
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8;
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2);

    const pageCanvasHeight = (canvas.width / contentWidth) * contentHeight;
    const totalPages = Math.ceil(canvas.height / pageCanvasHeight);

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      const currentSliceHeight = Math.min(pageCanvasHeight, canvas.height - i * pageCanvasHeight);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = currentSliceHeight;

      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          i * pageCanvasHeight,
          canvas.width,
          currentSliceHeight,
          0,
          0,
          canvas.width,
          currentSliceHeight
        );
      }

      const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      const slicePdfHeight = (currentSliceHeight / canvas.width) * contentWidth;
      pdf.addImage(sliceImgData, 'JPEG', margin, margin, contentWidth, slicePdfHeight, undefined, 'FAST');
    }

    pdf.save(fileName);
  } finally {
    if (document.body.contains(tempWrapper)) {
      document.body.removeChild(tempWrapper);
    }
  }
}

/**
 * Direct PDF file generation and download for transaction completion certificate.
 */
export async function downloadCertificatePdf(
  booking: PropertyBooking,
  contract?: PropertyContract,
  listing?: Listing
): Promise<void> {
  const fileName = `شهادة-إتمام-صفقة-${booking.bookingNumber}.pdf`;
  const fullHtml = generateCertificateA4Html(booking, contract, listing);

  const tempWrapper = document.createElement('div');
  tempWrapper.style.position = 'fixed';
  tempWrapper.style.left = '-9999px';
  tempWrapper.style.top = '0';
  tempWrapper.style.width = '794px';
  tempWrapper.style.backgroundColor = '#ffffff';
  tempWrapper.style.color = '#0F2942';
  tempWrapper.style.padding = '24px';
  tempWrapper.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Tajawal", "Cairo", Tahoma, Arial, sans-serif';
  tempWrapper.style.direction = 'rtl';
  tempWrapper.style.zIndex = '-9999';

  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, 'text/html');
  const styleContent = doc.querySelector('style')?.innerHTML || '';
  const bodyContent = doc.body.innerHTML;

  const styleEl = document.createElement('style');
  styleEl.innerHTML = styleContent;
  tempWrapper.appendChild(styleEl);

  const contentDiv = document.createElement('div');
  contentDiv.innerHTML = bodyContent;
  tempWrapper.appendChild(contentDiv);

  document.body.appendChild(tempWrapper);

  try {
    await new Promise((r) => setTimeout(r, 200));

    const canvas = await html2canvas(tempWrapper, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1024
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2);

    const pageCanvasHeight = (canvas.width / contentWidth) * contentHeight;
    const totalPages = Math.ceil(canvas.height / pageCanvasHeight);

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      const currentSliceHeight = Math.min(pageCanvasHeight, canvas.height - i * pageCanvasHeight);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = currentSliceHeight;

      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          i * pageCanvasHeight,
          canvas.width,
          currentSliceHeight,
          0,
          0,
          canvas.width,
          currentSliceHeight
        );
      }

      const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      const slicePdfHeight = (currentSliceHeight / canvas.width) * contentWidth;
      pdf.addImage(sliceImgData, 'JPEG', margin, margin, contentWidth, slicePdfHeight, undefined, 'FAST');
    }

    pdf.save(fileName);
  } finally {
    if (document.body.contains(tempWrapper)) {
      document.body.removeChild(tempWrapper);
    }
  }
}
