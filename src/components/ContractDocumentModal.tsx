import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  PropertyContract,
  ContractClause,
  ContractVersion,
  ContractParty,
  ContractStatus,
  ContractType,
  Listing
} from '../types';
import {
  X,
  Printer,
  FileText,
  CheckCircle2,
  AlertTriangle,
  History,
  Edit3,
  ShieldCheck,
  Building2,
  User,
  Phone,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Clock,
  ArrowRight,
  PenTool,
  Check,
  FileCheck,
  AlertCircle,
  HelpCircle,
  Copy,
  ExternalLink,
  Lock,
  Download,
  Sparkles
} from 'lucide-react';

interface ContractDocumentModalProps {
  contractId?: string;
  bookingId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectListing?: (listing: Listing) => void;
}

export const ContractDocumentModal: React.FC<ContractDocumentModalProps> = ({
  contractId,
  bookingId,
  isOpen,
  onClose,
  onSelectListing
}) => {
  const {
    currentUser,
    contracts,
    bookings,
    fetchContractById,
    fetchContractByBookingId,
    generateContractFromBooking,
    updateContractDraft,
    approveContract,
    signContract,
    proposeContractAmendment,
    respondToContractAmendment,
    cancelContract,
    showToast
  } = useApp();

  const [contract, setContract] = useState<PropertyContract | null>(null);
  const [activeTab, setActiveTab] = useState<'document' | 'edit' | 'versions' | 'amend'>('document');
  const [isLoading, setIsLoading] = useState(true);

  // Contract Generation From Booking State
  const [generatingFromBooking, setGeneratingFromBooking] = useState(false);
  const [chosenContractType, setChosenContractType] = useState<ContractType>('sale');

  // Selected Version for historical comparison
  const [selectedVersionNum, setSelectedVersionNum] = useState<number | null>(null);

  // Edit Draft Form State
  const [editClauses, setEditClauses] = useState<ContractClause[]>([]);
  const [editTotalAmount, setEditTotalAmount] = useState<number>(0);
  const [editDepositAmount, setEditDepositAmount] = useState<number>(0);
  const [editPaymentSchedule, setEditPaymentSchedule] = useState<string>('');
  const [editHandoverDate, setEditHandoverDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editSummaryOfChanges, setEditSummaryOfChanges] = useState<string>('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Approve / Sign Modal State
  const [showSignModal, setShowSignModal] = useState(false);
  const [signerNationalId, setSignerNationalId] = useState('');
  const [signerPartyRole, setSignerPartyRole] = useState<'firstParty' | 'secondParty' | 'witness'>('firstParty');
  const [signatureMethod, setSignatureMethod] = useState<'electronic_declaration' | 'in_person_notary' | 'biometric_attested' | 'qualified_digital'>('electronic_declaration');
  const [attestationNumber, setAttestationNumber] = useState('');
  const [attestationOffice, setAttestationOffice] = useState('');
  const [legalDeclarationAccepted, setLegalDeclarationAccepted] = useState(true);
  const [isSigning, setIsSigning] = useState(false);

  // Amend Modal State
  const [amendSummary, setAmendSummary] = useState('');
  const [isSubmittingAmend, setIsSubmittingAmend] = useState(false);

  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Load contract data
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoading(true);

    const load = async () => {
      let found: PropertyContract | null = null;
      if (contractId) {
        found = await fetchContractById(contractId);
      } else if (bookingId) {
        found = await fetchContractByBookingId(bookingId);
      }

      if (!found && contractId) {
        found = contracts.find(c => c.id === contractId) || null;
      }
      if (!found && bookingId) {
        found = contracts.find(c => c.bookingId === bookingId) || null;
      }

      if (isMounted) {
        setContract(found);
        if (found) {
          initEditForm(found);
          setSelectedVersionNum(found.currentVersion);
        }
        setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [isOpen, contractId, bookingId, contracts, fetchContractById, fetchContractByBookingId]);

  const initEditForm = (targetContract: PropertyContract) => {
    setEditClauses(targetContract.clauses.map(c => ({ ...c })));
    setEditTotalAmount(targetContract.financialTerms.totalAmount || 0);
    setEditDepositAmount(targetContract.financialTerms.depositAmount || 0);
    setEditPaymentSchedule(targetContract.financialTerms.paymentSchedule || '');
    setEditHandoverDate(targetContract.durationTerms?.handoverDate || '');
    setEditNotes(targetContract.notes || '');
    setEditSummaryOfChanges('');
  };

  if (!isOpen) return null;

  // Permissions calculation
  const isFirstParty = contract?.firstParty?.id === currentUser.id;
  const isSecondParty = contract?.secondParty?.id === currentUser.id;
  const isWitness = Boolean(contract?.witnesses?.some(w => w.id === currentUser.id));
  const isSysAdmin = currentUser.role === 'system_admin';
  const isOrgManager = currentUser.role === 'org_manager';

  const canEdit = (isFirstParty || isSecondParty || isOrgManager || isSysAdmin) && contract?.status !== 'signed';
  const canApprove = (isFirstParty || isSecondParty || isSysAdmin) && contract?.status !== 'cancelled';
  const canSign = (isFirstParty || isSecondParty || isWitness || isSysAdmin) && (contract?.status === 'approved' || contract?.status === 'pending_approval' || contract?.status === 'under_review');
  const canCancel = (isFirstParty || isSecondParty || isOrgManager || isSysAdmin) && contract?.status !== 'signed';

  // Has the current user approved/signed?
  const currentUserSigned =
    (isFirstParty && contract?.firstParty?.signatureStatus === 'signed') ||
    (isSecondParty && contract?.secondParty?.signatureStatus === 'signed');

  const targetBooking = bookingId ? bookings.find(b => b.id === bookingId) : undefined;

  useEffect(() => {
    if (targetBooking) {
      if (targetBooking.listingPurpose === 'rent' || targetBooking.rentalUsageType) {
        setChosenContractType('lease');
      } else {
        setChosenContractType('sale');
      }
    }
  }, [targetBooking]);

  // Handle Generate Contract Draft directly from Modal
  const handleGenerateFromModal = async () => {
    if (!bookingId) return;
    setGeneratingFromBooking(true);
    try {
      const res = await generateContractFromBooking(bookingId, { customType: chosenContractType });
      if (res.success && res.contract) {
        setContract(res.contract);
        initEditForm(res.contract);
        setSelectedVersionNum(res.contract.currentVersion);
        setActiveTab('document');
      }
    } finally {
      setGeneratingFromBooking(false);
    }
  };

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  // Handle Copy Full Contract Text
  const handleCopyContractText = () => {
    if (!contract) return;
    const isSaleContract = contract.contractType === 'sale';
    const textLines = [
      `بسم الله الرحمن الرحيم`,
      `الجمهورية اليمنية - وزارة العدل - قطاع التوثيق الشرعي`,
      `منصة دلنّي العقارية الوطنية`,
      `=======================================================`,
      isSaleContract ? 'عقد بيع عقاري ومناقلة ملكية شرعية قطعية' : 'عقد إيجار عقاري موحد وشامل',
      `رقم العقد: ${contract.contractNumber} | الإصدار: (v${contract.currentVersion})`,
      `رقم الحجز المرتبط: ${contract.bookingNumber} | تاريخ التحرير: ${contract.createdAt}`,
      `حالة العقد القانونية: ${statusBadges[contract.status].label}`,
      `=======================================================`,
      `أولاً: أطراف العقد والتعاقد:`,
      `1. الطرف الأول (${isSaleContract ? 'البائع' : 'المؤجر'}): ${contract.firstParty.name} - هاتف: ${contract.firstParty.phone} - الصفة: ${contract.firstParty.role}`,
      `2. الطرف الثاني (${isSaleContract ? 'المشتري' : 'المستأجر'}): ${contract.secondParty.name} - هاتف: ${contract.secondParty.phone} - الصفة: ${contract.secondParty.role}`,
      `-------------------------------------------------------`,
      `ثانياً: مواصفات العقار المبيع / العين المؤجرة:`,
      `اسم العقار: ${contract.propertySnapshot.title}`,
      `الموقع: ${contract.propertySnapshot.governorate} - ${contract.propertySnapshot.city} (${contract.propertySnapshot.district}) - ${contract.propertySnapshot.street || ''}`,
      `النوع: ${contract.propertySnapshot.propertyType} | المساحة: ${contract.propertySnapshot.area} ${contract.propertySnapshot.areaUnit}`,
      `رقم صك الملكية/البصيرة: ${contract.propertySnapshot.deedNumber || 'مقيد بالسجل العقاري المعتمد'}`,
      contract.propertySnapshot.boundaries ? `الحدود الشرعية: شمالاً [${contract.propertySnapshot.boundaries.north || 'شارع'}]، جنوباً [${contract.propertySnapshot.boundaries.south || 'عقار'}]، شرقاً [${contract.propertySnapshot.boundaries.east || 'شارع'}]، غرباً [${contract.propertySnapshot.boundaries.west || 'عقار'}]` : '',
      `-------------------------------------------------------`,
      `ثالثاً: المقابل المالي وجدول السداد:`,
      `المبلغ الإجمالي: ${(contract.financialTerms.totalAmount || 0).toLocaleString()} ${currencySymbol}`,
      `العربون / التأمين: ${(contract.financialTerms.depositAmount || 0).toLocaleString()} ${currencySymbol}`,
      `آلية وجدول السداد: ${contract.financialTerms.paymentSchedule}`,
      `موعد التسليم: ${contract.durationTerms?.handoverDate || 'حسب الاتفاق'}`,
      `-------------------------------------------------------`,
      `رابعاً: البنود والشروط القانونية الملزمة:`,
      ...contract.clauses.map(c => `البند (${c.number}) ${c.title}:\n${c.content}\n`),
      `-------------------------------------------------------`,
      `خامساً: حالة التوثيق والتوقيعات:`,
      `توقيع الطرف الأول: ${contract.firstParty.signatureStatus === 'signed' ? `تم التوقيع إلكترونياً (${contract.firstParty.signedAt || contract.createdAt})` : 'بانتظار التوقيع'}`,
      `توقيع الطرف الثاني: ${contract.secondParty.signatureStatus === 'signed' ? `تم التوقيع إلكترونياً (${contract.secondParty.signedAt || contract.createdAt})` : 'بانتظار التوقيع'}`,
      `الأمين الشرعي: ${contract.witnesses?.[0]?.name || 'الأمين الشرعي المعتمد'}`,
      `=======================================================`,
      `تم استخراج وتوثيق هذه النسخة إلكترونياً عبر منصة دلنّي العقارية - الجمهورية اليمنية`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(textLines).then(() => {
      showToast('تم نسخ نص العقد كاملاً مع البنود إلى الحافظة بنجاح', 'success');
    }).catch(() => {
      showToast('فشل النسخ إلى الحافظة', 'error');
    });
  };

  // Handle Export Contract as Structured JSON Archive
  const handleExportContractJson = () => {
    if (!contract) return;
    const exportData = {
      meta: {
        platform: 'دلنّي - المنصة العقارية اليمنية',
        documentType: 'Official Real Estate Contract',
        exportedAt: new Date().toISOString(),
        contractNumber: contract.contractNumber,
        version: contract.currentVersion,
        legalNotice: 'وثيقة عقد عقاري رسمي موثق ومحمي إلكترونياً'
      },
      contract
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dalani-contract-${contract.contractNumber}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('تم تصدير ملف العقد بنجاح بصيغة JSON المعتمدة', 'success');
  };

  // Add Clause in Edit Mode
  const handleAddClause = () => {
    const newNumber = editClauses.length + 1;
    const newClause: ContractClause = {
      id: `cls-custom-${Date.now()}`,
      number: newNumber,
      title: `البند ${newNumber}: شرط إضافي متفق عليه`,
      content: '',
      isMandatory: false
    };
    setEditClauses([...editClauses, newClause]);
  };

  const handleUpdateClause = (id: string, field: 'title' | 'content', value: string) => {
    setEditClauses(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleDeleteClause = (id: string) => {
    const updated = editClauses
      .filter(c => c.id !== id)
      .map((c, idx) => ({ ...c, number: idx + 1 }));
    setEditClauses(updated);
  };

  // Save Edit Draft
  const handleSaveDraft = async () => {
    if (!contract) return;
    if (editClauses.some(c => !c.title.trim() || !c.content.trim())) {
      showToast('يرجى تعبئة عناوين ونصوص كافة البنود أو حذف البنود الفارغة', 'error');
      return;
    }

    setIsSavingDraft(true);
    try {
      const res = await updateContractDraft(contract.id, {
        clauses: editClauses,
        financialTerms: {
          totalAmount: editTotalAmount,
          depositAmount: editDepositAmount,
          paymentSchedule: editPaymentSchedule
        },
        durationTerms: {
          handoverDate: editHandoverDate
        },
        notes: editNotes,
        summaryOfChanges: editSummaryOfChanges.trim() || 'تحديث بنود وصياغة مسودة العقد'
      });

      if (res.success && res.contract) {
        setContract(res.contract);
        initEditForm(res.contract);
        setSelectedVersionNum(res.contract.currentVersion);
        setActiveTab('document');
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Handle Approve (Requirement 1, 2)
  const handleApprove = async () => {
    if (!contract) return;
    try {
      const partyType = isFirstParty ? 'firstParty' : isSecondParty ? 'secondParty' : 'admin';
      const curVer = contract.currentVersion || 1;
      const res = await approveContract(contract.id, partyType, `اعتماد ومصادقة على بنود وصياغة النسخة (v${curVer})`);
      if (res.success && res.contract) {
        setContract(res.contract);
        showToast(`تم تسجيل اعتمادك على النسخة (${res.contract.currentVersion}) بنجاح. ملاحظة: هذا اعتماد للمسودة ويلزم استكمال التوقيع المعتمد بالهوية لإتمام العملية.`, 'info');
      }
    } catch {
      // handled in context
    }
  };

  // Handle Sign (Requirement 2, 3)
  const handleConfirmSignature = async () => {
    if (!contract) return;
    if (!signerNationalId.trim()) {
      showToast('يرجى إدخال رقم البطاقة الشخصية أو جواز السفر لتوثيق التوقيع المعتمد', 'error');
      return;
    }
    if (!legalDeclarationAccepted) {
      showToast('يلزم الإقرار بالمسؤولية القانونية والالتزام الشرعي لإتمام التوقيع', 'error');
      return;
    }
    setIsSigning(true);
    try {
      const res = await signContract(contract.id, signerPartyRole, {
        nationalId: signerNationalId.trim(),
        legalDeclarationAccepted: true,
        attestationNumber: attestationNumber.trim() || undefined,
        attestationOffice: attestationOffice.trim() || undefined,
        signatureMethod
      });
      if (res.success && res.contract) {
        setContract(res.contract);
        setShowSignModal(false);
      }
    } finally {
      setIsSigning(false);
    }
  };

  // Handle Submit Amendment
  const handleSubmitAmendment = async () => {
    if (!contract || !amendSummary.trim()) {
      showToast('يرجى كتابة سبب وملخص التعديل المطلوب', 'error');
      return;
    }
    setIsSubmittingAmend(true);
    try {
      const res = await proposeContractAmendment(contract.id, amendSummary.trim(), editClauses);
      if (res.success && res.contract) {
        setContract(res.contract);
        initEditForm(res.contract);
        setSelectedVersionNum(res.contract.currentVersion);
        setActiveTab('document');
        setAmendSummary('');
      }
    } finally {
      setIsSubmittingAmend(false);
    }
  };

  // Handle Respond to Amendment
  const handleRespondAmendment = async (accept: boolean) => {
    if (!contract) return;
    try {
      const res = await respondToContractAmendment(contract.id, accept);
      if (res.success && res.contract) {
        setContract(res.contract);
      }
    } catch {
      // handled
    }
  };

  // Handle Cancel Contract
  const handleConfirmCancel = async () => {
    if (!contract || !cancelReason.trim()) {
      showToast('يرجى ذكر سبب إلغاء العقد', 'error');
      return;
    }
    setIsCancelling(true);
    try {
      const res = await cancelContract(contract.id, cancelReason.trim());
      if (res.success && res.contract) {
        setContract(res.contract);
        setShowCancelModal(false);
      }
    } finally {
      setIsCancelling(false);
    }
  };

  // Selected version data for history comparison
  const displayedVersion: ContractVersion | undefined =
    contract?.versionHistory?.find(v => v.version === selectedVersionNum) ||
    contract?.versionHistory?.[contract.versionHistory.length - 1];

  const displayedClauses =
    activeTab === 'versions' && displayedVersion
      ? displayedVersion.clauses
      : contract?.clauses || [];

  const displayedFinancialTerms =
    activeTab === 'versions' && displayedVersion
      ? displayedVersion.financialTerms
      : contract?.financialTerms;

  const isSale = contract?.contractType === 'sale';
  const currencySymbol =
    contract?.financialTerms.currency === 'USD'
      ? '$ دولار'
      : contract?.financialTerms.currency === 'SAR'
      ? 'ريال سعودي'
      : 'ريال يمني';

  const statusBadges: Record<ContractStatus, { label: string; color: string }> = {
    draft: { label: 'مسودة قيد الإعداد', color: 'bg-slate-100 text-slate-800 border-slate-300' },
    under_review: { label: 'قيد المراجعة القانونية', color: 'bg-amber-50 text-amber-900 border-amber-300' },
    pending_approval: { label: 'بانتظار اعتماد الأطراف', color: 'bg-blue-50 text-blue-900 border-blue-300' },
    approved: { label: 'معتمد رسمياً بالتراضي', color: 'bg-emerald-50 text-emerald-900 border-emerald-300' },
    signed: { label: 'مبرم وموقع إلكترونياً نافذ', color: 'bg-[#12A889]/15 text-[#0F2942] border-[#12A889]/40' },
    completed: { label: 'منفذ ومكتمل نهائياً', color: 'bg-emerald-100 text-emerald-950 border-emerald-400' },
    disputed: { label: 'نزاع عقاري مجمد', color: 'bg-amber-100 text-amber-950 border-amber-400' },
    cancelled: { label: 'عقد ملغي ومفسوخ', color: 'bg-rose-50 text-rose-900 border-rose-300' }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Print-specific style overrides */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #official-contract-print-area, #official-contract-print-area * {
            visibility: visible;
          }
          #official-contract-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* HEADER BAR (hidden in print) */}
        <div className="no-print bg-[#0F2942] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#12A889]/20 border border-[#12A889]/30 flex items-center justify-center text-[#12A889]">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {isSale ? 'عقد بيع عقاري ومناقلة ملكية شرعية' : 'عقد إيجار عقاري رسمي موحد'}
                </h2>
                {contract && (
                  <span className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded-lg text-[#12A889]">
                    {contract.contractNumber}
                  </span>
                )}
                {contract && (
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-lg text-slate-300">
                    الإصدار (v{contract.currentVersion})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                منظومة العقود والتوثيق الرسمي - منصة دلنّي العقارية للجمهورية اليمنية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {contract && (
              <>
                <button
                  onClick={handleCopyContractText}
                  type="button"
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
                  title="نسخ نص العقد كاملاً مع البنود والأطراف"
                >
                  <Copy className="w-3.5 h-3.5 text-[#12A889]" />
                  <span className="hidden sm:inline">نسخ النص</span>
                </button>

                <button
                  onClick={handleExportContractJson}
                  type="button"
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
                  title="تصدير ملف العقد الموثق كأرشيف JSON"
                >
                  <Download className="w-3.5 h-3.5 text-[#12A889]" />
                  <span className="hidden sm:inline">تصدير JSON</span>
                </button>
              </>
            )}

            <button
              onClick={handlePrint}
              type="button"
              className="px-3.5 py-2 rounded-xl bg-[#12A889] hover:bg-[#0fa37f] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="طباعة وتصدير العقد PDF"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / PDF</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ANTI-SILENT MODIFICATION NOTICE BANNER (if modification requested) */}
        {contract?.isModificationPendingApproval && (
          <div className="no-print bg-amber-500 text-slate-950 px-6 py-2.5 text-xs font-bold flex items-center justify-between gap-4 border-b border-amber-600">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                تنبيه حوكمة: توجد مسودة تعديل مقترحة من قبل [{contract.modificationRequestedBy}] قيد انتظار موافقة الطرف المقابل. (السبب: {contract.modificationReason || 'تعديل بنود'})
              </span>
            </div>
            {((isFirstParty && contract.secondPartyApprovedAt) || (isSecondParty && contract.firstPartyApprovedAt) || isSysAdmin) && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRespondAmendment(true)}
                  className="px-3 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  قبول التعديل
                </button>
                <button
                  onClick={() => handleRespondAmendment(false)}
                  className="px-3 py-1 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  رفض
                </button>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE NAVIGATION TABS (hidden in print) */}
        <div className="no-print bg-slate-50 border-b border-slate-200 px-6 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('document')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'document'
                  ? 'bg-white text-[#0F2942] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-[#12A889]" />
              <span>وثيقة العقد الرسمية</span>
            </button>

            {canEdit && (
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'edit'
                    ? 'bg-white text-[#0F2942] shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span>مراجعة وتعديل البنود (مسودة)</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('versions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'versions'
                  ? 'bg-white text-[#0F2942] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4 text-indigo-600" />
              <span>سجل الإصدارات والاعتمادات ({contract?.versionHistory?.length || 1})</span>
            </button>

            {contract?.status === 'approved' && canEdit && (
              <button
                onClick={() => setActiveTab('amend')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'amend'
                    ? 'bg-white text-[#0F2942] shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-purple-600" />
                <span>طلب تعديل رسمي</span>
              </button>
            )}
          </div>

          {/* Quick status & workflow indicators */}
          {contract && (
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadges[contract.status].color}`}>
                {statusBadges[contract.status].label}
              </span>

              {/* Action Buttons in Header */}
              {canApprove && contract.status !== 'signed' && contract.status !== 'approved' && !currentUserSigned && (
                <button
                  onClick={handleApprove}
                  type="button"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>اعتماد العقد</span>
                </button>
              )}

              {canSign && !currentUserSigned && (
                <button
                  onClick={() => {
                    setSignerPartyRole(isFirstParty ? 'firstParty' : isSecondParty ? 'secondParty' : 'witness');
                    setShowSignModal(true);
                  }}
                  type="button"
                  className="px-3.5 py-1.5 rounded-xl bg-[#0F2942] hover:bg-[#16324F] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ring-2 ring-[#12A889]/30 shadow-xs"
                >
                  <PenTool className="w-3.5 h-3.5 text-[#12A889]" />
                  <span>توقيع إلكتروني</span>
                </button>
              )}

              {canCancel && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  type="button"
                  className="px-3 py-1.5 rounded-xl text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                >
                  <span>إلغاء</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* MAIN BODY AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 print:bg-white print:p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
              <Clock className="w-8 h-8 animate-spin text-[#12A889]" />
              <p className="text-sm font-bold">جاري تحميل وثيقة العقد وسجل التوثيق...</p>
            </div>
          ) : !contract ? (
            targetBooking ? (
              <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 max-w-2xl mx-auto shadow-sm space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-[#12A889] border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
                    <FileCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    إنشاء مسودة العقد الرسمي من بيانات الحجز
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    سيتم استيراد كافة بيانات العقار والأطراف وقيمة العملية وشروطها المتفق عليها في الحجز <span className="font-mono font-bold text-slate-700">[{targetBooking.bookingNumber}]</span> تلقائياً دون الحاجة لإعادة الإدخال.
                  </p>
                </div>

                {/* Imported Property & Deal Summary Preview */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
                  <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#12A889]" />
                      <span>{targetBooking.listingTitle}</span>
                    </span>
                    <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                      {targetBooking.listingNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">الطرف الأول (المعلن):</span>
                      <span className="font-bold text-slate-800">{targetBooking.advertiserName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">الطرف الثاني (الباحث):</span>
                      <span className="font-bold text-slate-800">{targetBooking.seekerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">القيمة الإجمالية:</span>
                      <span className="font-mono font-bold text-emerald-800">
                        {(targetBooking.agreedTerms?.price || targetBooking.listingPrice || 0).toLocaleString()} {targetBooking.agreedTerms?.currency || targetBooking.listingCurrency || 'USD'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contract Type Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    نوع العقد المطلوب إنشاؤه:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setChosenContractType('sale')}
                      className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex items-start gap-3 ${
                        chosenContractType === 'sale'
                          ? 'bg-[#12A889]/10 border-[#12A889] ring-2 ring-[#12A889]/30'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        chosenContractType === 'sale' ? 'border-[#12A889] bg-[#12A889]' : 'border-slate-300'
                      }`}>
                        {chosenContractType === 'sale' && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-slate-900">عقد بيع قطعي ومناقلة ملكية شرعية</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          يشمل إثبات صك البصيرة الشرعية، الثمن الإجمالي، العربون، الإفراغ، والتعميد لدى الأمين الشرعي.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChosenContractType('lease')}
                      className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex items-start gap-3 ${
                        chosenContractType === 'lease'
                          ? 'bg-[#12A889]/10 border-[#12A889] ring-2 ring-[#12A889]/30'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        chosenContractType === 'lease' ? 'border-[#12A889] bg-[#12A889]' : 'border-slate-300'
                      }`}>
                        {chosenContractType === 'lease' && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-slate-900">عقد إيجار عقاري موحد وشامل</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          يشمل مدة الإيجار، قيمة الأجرة، التأمين، فواتير الخدمات، وشروط الصيانة والإخلاء.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={generatingFromBooking}
                    onClick={handleGenerateFromModal}
                    className="px-6 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0fa37f] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {generatingFromBooking ? <Clock className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{generatingFromBooking ? 'جاري إنشاء واستيراد العقد...' : 'إنشاء مسودة العقد الآن'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center max-w-md mx-auto shadow-sm border border-slate-200">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800 mb-1">لم يتم العثور على عقد مرتبط</h3>
                <p className="text-xs text-slate-500 mb-4">
                  لا يوجد عقد مفعل بعد لهذا الحجز. يمكنك العودة لغرفة المتابعة وإنشاء المسودة مباشرة.
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            )
          ) : activeTab === 'document' || activeTab === 'versions' ? (
            /* ========================================================================= */
            /* 1. OFFICIAL DOCUMENT VIEW (MATCHING YEMENI REAL ESTATE LEGAL FORM)         */
            /* ========================================================================= */
            <div
              id="official-contract-print-area"
              className="bg-white rounded-2xl shadow-md border border-slate-300 max-w-4xl mx-auto p-8 sm:p-12 relative text-slate-900 font-sans leading-relaxed"
            >
              {/* WATERMARK STAMP FOR DRAFT OR APPROVED */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none opacity-5 rotate-[-25deg] text-6xl font-black text-slate-900 tracking-widest text-center">
                {contract.status === 'signed' ? 'وثيقة مبرمة ومعمدة' : contract.status === 'approved' ? 'معتمد رسمياً' : 'مسودة قيد المراجعة'}
              </div>

              {/* YEMEN LEGAL OFFICIAL HEADER */}
              <div className="border-b-2 border-slate-900 pb-6 mb-8 text-center relative">
                <div className="flex items-center justify-between">
                  <div className="text-right text-xs space-y-1 text-slate-700">
                    <p className="font-bold text-slate-900">الجمهورية اليمنية</p>
                    <p>وزارة العدل - قطاع التوثيق</p>
                    <p>منصة «دلنّي» العقارية الوطنية</p>
                    <p className="font-mono text-[11px] text-slate-500">رقم الترخيص: YE-REA-2026/09</p>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-800 flex items-center justify-center p-2 mb-1">
                      <Building2 className="w-10 h-10 text-[#0F2942]" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 tracking-wider">دلنّي للعقارات</span>
                  </div>

                  <div className="text-left text-xs space-y-1 text-slate-700">
                    <p><span className="font-bold">رقم العقد:</span> <span className="font-mono font-bold text-slate-900">{contract.contractNumber}</span></p>
                    <p><span className="font-bold">رقم الحجز:</span> <span className="font-mono text-slate-600">{contract.bookingNumber}</span></p>
                    <p><span className="font-bold">التاريخ:</span> {contract.createdAt}</p>
                    <p><span className="font-bold">الإصدار:</span> v{displayedVersion?.version || contract.currentVersion}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200">
                  <h1 className="text-xl sm:text-2xl font-black text-[#0F2942] tracking-wide">
                    {isSale ? 'عقد بيع عقاري ومناقلة ملكية شرعية' : 'عقد إيجار عقاري موحد وشامل'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    محرر وموثق استناداً إلى أحكام القانون المدني اليمني وقوانين التوثيق والتسجيل العقاري النافذة
                  </p>
                </div>
              </div>

              {/* CONTRACT PARTIES TABLE */}
              <div className="mb-8">
                <h3 className="text-sm font-black text-[#0F2942] border-r-4 border-[#12A889] pr-2 mb-3">
                  أولاً: أطراف العقد والأهلية القانونية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Party */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-black text-slate-900 text-sm">
                        الطرف الأول ({isSale ? 'البائع' : 'المؤجر'}):
                      </span>
                      {contract.firstParty.signatureStatus === 'signed' ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>موقع ومصادق</span>
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold text-[11px]">قيد التوقيع</span>
                      )}
                    </div>
                    <p><span className="text-slate-500 font-bold">الاسم الرباعي:</span> <span className="font-bold text-slate-800">{contract.firstParty.name}</span></p>
                    <p><span className="text-slate-500 font-bold">الهوية/البطاقة:</span> {contract.firstParty.nationalIdOrPassport || 'مسجل لدى المنصة'}</p>
                    <p><span className="text-slate-500 font-bold">العنوان:</span> {contract.firstParty.address || contract.propertySnapshot.governorate}</p>
                    <p><span className="text-slate-500 font-bold">الهاتف:</span> <span className="font-mono" dir="ltr">{contract.firstParty.phone}</span></p>
                  </div>

                  {/* Second Party */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-black text-slate-900 text-sm">
                        الطرف الثاني ({isSale ? 'المشتري' : 'المستأجر'}):
                      </span>
                      {contract.secondParty.signatureStatus === 'signed' ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>موقع ومصادق</span>
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold text-[11px]">قيد التوقيع</span>
                      )}
                    </div>
                    <p><span className="text-slate-500 font-bold">الاسم الرباعي:</span> <span className="font-bold text-slate-800">{contract.secondParty.name}</span></p>
                    <p><span className="text-slate-500 font-bold">الهوية/البطاقة:</span> {contract.secondParty.nationalIdOrPassport || 'مسجل لدى المنصة'}</p>
                    <p><span className="text-slate-500 font-bold">العنوان:</span> {contract.secondParty.address || 'الجمهورية اليمنية'}</p>
                    <p><span className="text-slate-500 font-bold">الهاتف:</span> <span className="font-mono" dir="ltr">{contract.secondParty.phone}</span></p>
                  </div>
                </div>
              </div>

              {/* PROPERTY SPECIFICATIONS SNAPSHOT */}
              <div className="mb-8">
                <h3 className="text-sm font-black text-[#0F2942] border-r-4 border-[#12A889] pr-2 mb-3">
                  ثانياً: مواصفات العقار المبيع / العين المؤجرة
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-slate-500 font-bold block">العنوان:</span>
                      <span className="font-bold text-slate-800">
                        {contract.propertySnapshot.governorate} - {contract.propertySnapshot.city} ({contract.propertySnapshot.district})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">نوع العقار:</span>
                      <span className="font-bold text-slate-800">
                        {contract.propertySnapshot.propertyType}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">المساحة الإجمالية:</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {contract.propertySnapshot.area} {contract.propertySnapshot.areaUnit}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">رقم الصك/البصيرة:</span>
                      <span className="font-bold text-slate-800 font-mono text-[11px]">
                        {contract.propertySnapshot.deedNumber || 'مقيد بالسجل العقاري'}
                      </span>
                    </div>
                  </div>

                  {/* Boundaries if available */}
                  {contract.propertySnapshot.boundaries && (
                    <div className="text-[11px] text-slate-700">
                      <span className="font-bold block mb-1 text-slate-900">الحدود الأربعة الشرعية:</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                        <p><span className="font-bold text-slate-500">شمالاً:</span> {contract.propertySnapshot.boundaries.north || 'شارع'}</p>
                        <p><span className="font-bold text-slate-500">جنوباً:</span> {contract.propertySnapshot.boundaries.south || 'عقار مجاور'}</p>
                        <p><span className="font-bold text-slate-500">شرقاً:</span> {contract.propertySnapshot.boundaries.east || 'شارع'}</p>
                        <p><span className="font-bold text-slate-500">غرباً:</span> {contract.propertySnapshot.boundaries.west || 'عقار مجاور'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FINANCIAL & DURATION TERMS */}
              <div className="mb-8">
                <h3 className="text-sm font-black text-[#0F2942] border-r-4 border-[#12A889] pr-2 mb-3">
                  ثالثاً: المقابل المالي وجدول السداد
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-slate-500 font-bold block">{isSale ? 'الثمن الإجمالي:' : 'الأجرة المتفق عليها:'}</span>
                      <span className="text-base font-black text-[#0F2942] font-mono">
                        {(displayedFinancialTerms?.totalAmount || 0).toLocaleString()} {currencySymbol}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">عربون الحجز / التأمين:</span>
                      <span className="text-base font-black text-emerald-800 font-mono">
                        {(displayedFinancialTerms?.depositAmount || 0).toLocaleString()} {currencySymbol}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">موعد التسليم والإفراغ:</span>
                      <span className="font-bold text-slate-800">
                        {contract.durationTerms?.handoverDate || 'حسب الاتفاق'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">آلية وجدول الوفاء:</span>
                    <p className="font-bold text-slate-800 leading-relaxed">
                      {displayedFinancialTerms?.paymentSchedule || 'وفقاً للشروط المحددة بالبنود أدناه.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* CONTRACT CLAUSES ARTICLES */}
              <div className="mb-8 space-y-4">
                <h3 className="text-sm font-black text-[#0F2942] border-r-4 border-[#12A889] pr-2 mb-3">
                  رابعاً: البنود والشروط الملزمة قانونياً
                </h3>
                <div className="space-y-3">
                  {displayedClauses.map((clause, index) => (
                    <div
                      key={clause.id || index}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#0F2942] text-white flex items-center justify-center text-[10px]">
                            {clause.number || index + 1}
                          </span>
                          <span>{clause.title}</span>
                        </h4>
                        {clause.isMandatory && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            بند إلزامي
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 leading-relaxed pr-7">
                        {clause.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SIGNATURES AND STAMPS BLOCK */}
              <div className="mt-10 pt-6 border-t-2 border-slate-900">
                <h3 className="text-sm font-black text-[#0F2942] text-center mb-6">
                  خامساً: الإقرار والتوقيع والتعميد الشرعي
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
                  {/* First Party Signature */}
                  <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/70 flex flex-col justify-between min-h-[130px]">
                    <span className="font-bold text-slate-700 block">
                      توقيع {isSale ? 'البائع' : 'المؤجر'}
                    </span>
                    <div className="my-2">
                      {contract.firstParty.signatureStatus === 'signed' ? (
                        <div className="text-emerald-700">
                          <div className="font-serif italic font-bold text-sm tracking-wider">
                            {contract.firstParty.name}
                          </div>
                          <span className="text-[10px] font-mono block text-slate-500">
                            موقع إلكترونياً ({contract.firstParty.signedAt?.split('T')[0] || contract.createdAt})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">.....................</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">بصمة الإبهام / الخاتم</span>
                  </div>

                  {/* Second Party Signature */}
                  <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/70 flex flex-col justify-between min-h-[130px]">
                    <span className="font-bold text-slate-700 block">
                      توقيع {isSale ? 'المشتري' : 'المستأجر'}
                    </span>
                    <div className="my-2">
                      {contract.secondParty.signatureStatus === 'signed' ? (
                        <div className="text-emerald-700">
                          <div className="font-serif italic font-bold text-sm tracking-wider">
                            {contract.secondParty.name}
                          </div>
                          <span className="text-[10px] font-mono block text-slate-500">
                            موقع إلكترونياً ({contract.secondParty.signedAt?.split('T')[0] || contract.createdAt})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">.....................</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">بصمة الإبهام / الخاتم</span>
                  </div>

                  {/* Witness 1 */}
                  <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/70 flex flex-col justify-between min-h-[130px]">
                    <span className="font-bold text-slate-700 block">
                      الشاهد الأول / الأمين الشرعي
                    </span>
                    <div className="my-2 text-slate-800">
                      <p className="font-bold text-[11px]">{contract.witnesses?.[0]?.name || 'الأمين الشرعي المعتمد'}</p>
                      <span className="text-[10px] text-emerald-700 font-bold block">مصادق ومعتمد</span>
                    </div>
                    <span className="text-[10px] text-slate-500">ختم التوثيق الشرعي</span>
                  </div>

                  {/* Dalani Digital Seal */}
                  <div className="border border-[#12A889]/30 rounded-xl p-3 bg-[#12A889]/5 flex flex-col justify-between min-h-[130px]">
                    <span className="font-bold text-[#0F2942] block">
                      توثيق منصة دلنّي
                    </span>
                    <div className="my-1 flex flex-col items-center">
                      <ShieldCheck className="w-6 h-6 text-[#12A889]" />
                      <span className="text-[10px] font-mono font-bold text-slate-800">
                        {contract.contractNumber}
                      </span>
                      <span className="text-[9px] text-emerald-800 font-bold">
                        رقمي مشفر ومحمي
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500">رمز التحقق السريع QR</span>
                  </div>
                </div>
              </div>

              {/* FOOTER NOTICE */}
              <div className="mt-6 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
                تم تحرير هذا العقد من نسختين أصليتين، بيد كل طرف نسخة للعمل بموجبها، وتم توثيق نسخة رقمية غير قابلة للتلاعب في سجل منصة دلنّي العقارية.
              </div>
            </div>
          ) : activeTab === 'edit' ? (
            /* ========================================================================= */
            /* 2. EDIT DRAFT TAB (REVIEW & EDIT CLAUSES WITH VERSION COMMIT)             */
            /* ========================================================================= */
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm mb-1">مراجعة وتعديل مسودة العقد</h4>
                  <p className="leading-relaxed">
                    يمكنك تعديل بنود العقد، الشروط المالية، ومواعيد التسليم. عند الحفظ سيتم إنشاء إصدار جديد موثق (v{(contract.currentVersion || 1) + 1}) مع تسجيل هويتك ووقت التعديل لضمان الشفافية ومنع أي تعديل صامت.
                  </p>
                </div>
              </div>

              {/* Financial Terms Edit */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
                  تعديل الشروط المالية والمواعيد
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الثمن الإجمالي ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      value={editTotalAmount}
                      onChange={e => setEditTotalAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-[#12A889] outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      العربون / التأمين ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      value={editDepositAmount}
                      onChange={e => setEditDepositAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-[#12A889] outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      موعد الاستلام والإفراغ
                    </label>
                    <input
                      type="text"
                      value={editHandoverDate}
                      onChange={e => setEditHandoverDate(e.target.value)}
                      placeholder="مثال: 2026-11-01"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#12A889] outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    طريقة وجدول الوفاء بالثمن
                  </label>
                  <textarea
                    rows={2}
                    value={editPaymentSchedule}
                    onChange={e => setEditPaymentSchedule(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#12A889] outline-hidden"
                  />
                </div>
              </div>

              {/* Clauses Editor */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">بنود ومواد العقد ({editClauses.length})</h3>
                    <p className="text-xs text-slate-500">يمكنك تعديل نصوص البنود، أو إضافة شروط خاصة إضافية</p>
                  </div>
                  <button
                    onClick={handleAddClause}
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#12A889]" />
                    <span>إضافة بند جديد</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {editClauses.map((clause, idx) => (
                    <div key={clause.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-6 h-6 rounded-full bg-[#0F2942] text-white flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={clause.title}
                            onChange={e => handleUpdateClause(clause.id, 'title', e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#12A889] outline-hidden bg-white"
                          />
                        </div>
                        {!clause.isMandatory && (
                          <button
                            onClick={() => handleDeleteClause(clause.id)}
                            type="button"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف هذا البند"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        value={clause.content}
                        onChange={e => handleUpdateClause(clause.id, 'content', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs leading-relaxed focus:ring-2 focus:ring-[#12A889] outline-hidden bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Commit Summary (Mandatory for Version Tracking & Anti-Silent Mod) */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
                <label className="block text-xs font-bold text-slate-900">
                  ملخص التعديلات وسبب الإصدار الجديد <span className="text-rose-500">* (توثيق الحوكمة)</span>
                </label>
                <input
                  type="text"
                  value={editSummaryOfChanges}
                  onChange={e => setEditSummaryOfChanges(e.target.value)}
                  placeholder="مثال: تعديل موعد التسليم وإضافة شرط فحص عدادات المياه"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#12A889] outline-hidden"
                />

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    onClick={() => setActiveTab('document')}
                    type="button"
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    إلغاء التعديل
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    type="button"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isSavingDraft ? <Clock className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                    <span>حفظ وتوثيق كإصدار جديد (v{(contract.currentVersion || 1) + 1})</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'amend' ? (
            /* ========================================================================= */
            /* 3. PROPOSE AMENDMENT FOR APPROVED CONTRACT                                */
            /* ========================================================================= */
            <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">اقتراح تعديل على عقد معتمد</h3>
                  <p className="text-xs text-slate-500">
                    العقد معتمد حالياً. أي تعديل يتم تقديمه سيُعلق الاعتماد ويتطلب موافقة الطرف الآخر الصريحة.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  سبب التعديل والبنود المطلوب تغييرها:
                </label>
                <textarea
                  rows={4}
                  value={amendSummary}
                  onChange={e => setAmendSummary(e.target.value)}
                  placeholder="اشرح بدقة التعديل المطلوب، على سبيل المثال: طلب تأجيل موعد الإفراغ لمدة أسبوع وتعديل طريقة سداد الدفعة الثانية..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs leading-relaxed focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  onClick={() => setActiveTab('document')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  onClick={handleSubmitAmendment}
                  disabled={isSubmittingAmend}
                  className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingAmend ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>إرسال مقترح التعديل للأطراف</span>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* 4. VERSION HISTORY TAB                                                    */
            /* ========================================================================= */
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">سجل إصدارات العقد والتوثيق</h3>
                    <p className="text-xs text-slate-500">
                      كل تعديل يتم تسجيله تلقائياً بنسخة مستقلة غير قابلة للحذف، لضمان النزاهة وحماية حقوق الأطراف.
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                    إجمالي الإصدارات: {contract.versionHistory?.length || 1}
                  </span>
                </div>

                <div className="space-y-4">
                  {contract.versionHistory?.map(v => {
                    const isSelected = v.version === selectedVersionNum;
                    return (
                      <div
                        key={v.version}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-[#12A889]/5 border-[#12A889] shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#0F2942] text-white font-mono text-xs font-bold">
                              v{v.version}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              بواسطة: {v.createdBy?.name || 'النظام'} ({v.createdBy?.role || 'مستخدم'})
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-500 font-mono">
                              {v.createdAt}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedVersionNum(v.version);
                                setActiveTab('document');
                              }}
                              className="px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                            >
                              عرض نص هذه النسخة
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed mb-2">
                          <span className="font-bold text-slate-900">ملخص التغيير:</span> {v.summaryOfChanges || 'إنشاء أو تعديل المسودة'}
                        </p>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                          <span>عدد البنود: {v.clauses?.length || 0}</span>
                          <span>•</span>
                          <span>المبلغ: {v.financialTerms?.totalAmount?.toLocaleString()} {currencySymbol}</span>
                          <span>•</span>
                          <span>الحالة عند الإصدار: {v.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS (hidden in print) */}
        <div className="no-print bg-white border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#12A889]" />
            <span>وثيقة معتمدة ومحمية رقمياً وفق الضوابط الشرعية والقانونية</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة العقد</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {/* ELECTRONIC SIGNATURE & LEGAL ATTESTATION MODAL (Requirement 2, 3) */}
      {showSignModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <div className="w-11 h-11 rounded-2xl bg-[#12A889]/10 text-[#12A889] flex items-center justify-center shrink-0">
                <PenTool className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">التوقيع والتوثيق القانوني المعتمد</h3>
                <p className="text-xs text-slate-500">إثبات الرضا التعاقدي وفق قانون المعاملات المدنية وقانون الإثبات والتوثيق</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    صفة الموقّع في العقد: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={signerPartyRole}
                    onChange={e => setSignerPartyRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#12A889] outline-hidden cursor-pointer"
                  >
                    <option value="firstParty">الطرف الأول ({isSale ? 'البائع / المالك' : 'المؤجر'})</option>
                    <option value="secondParty">الطرف الثاني ({isSale ? 'المشتري' : 'المستأجر'})</option>
                    <option value="witness">شاهد إثبات / أمين شرعي معتمد</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    آلية التوقيع والإثبات: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={signatureMethod}
                    onChange={e => setSignatureMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#12A889] outline-hidden cursor-pointer"
                  >
                    <option value="electronic_declaration">إقرار وتوقيع إلكتروني معتمد بالهوية</option>
                    <option value="in_person_notary">توثيق حضوري لدى الأمين الشرعي</option>
                    <option value="biometric_attested">مصادقة رقمية وبصمة شرعية</option>
                    <option value="qualified_digital">شهادة توقيع رقمي معتمد</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم البطاقة الشخصية الآلية / جواز السفر: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={signerNationalId}
                  onChange={e => setSignerNationalId(e.target.value)}
                  placeholder="مثال: بطاقة شخصية آلية رقم 01010049281 صادرة من صنعاء"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#12A889] outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم محضر/قيد التوثيق أو ترخيص الأمين:
                  </label>
                  <input
                    type="text"
                    value={attestationNumber}
                    onChange={e => setAttestationNumber(e.target.value)}
                    placeholder="رقم القيد أو السجل لدى الأمين"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#12A889] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    مكتب التوثيق الشرعي / المحكمة:
                  </label>
                  <input
                    type="text"
                    value={attestationOffice}
                    onChange={e => setAttestationOffice(e.target.value)}
                    placeholder="قلم التوثيق بمحكمة الاختصاص"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#12A889] outline-hidden"
                  />
                </div>
              </div>

              {/* Legal Declaration Checkbox */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={legalDeclarationAccepted}
                    onChange={e => setLegalDeclarationAccepted(e.target.checked)}
                    className="w-4 h-4 text-[#12A889] rounded cursor-pointer mt-0.5"
                  />
                  <span className="text-[11px] text-slate-800 font-bold leading-relaxed">
                    أقر وأتعهد بكامل أهليتي الشرعية والقانونية المعتبرة، وبموافقتي التامة وغير المشروطة على جميع بنود وشروط هذا العقد (الإصدار v{contract?.currentVersion || 1}) ومسؤوليتي التامة عنه.
                  </span>
                </label>
              </div>

              {/* Statutory Notice */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed space-y-1">
                <span className="font-black block text-amber-950">تنبيه قانوني ومسؤولية تعاقدية:</span>
                <p>
                  وفق أحكام القانون المدني وقانون الإثبات والتوثيق اليمني، يوثق هذا الإجراء الرضا والالتزام المالي والتعاقدي بين الطرفين، ولا يعتبر التوقيع نافذاً لنقل الملكية العقارية العينية إلا بالقيد لدى الأمين الشرعي المختص والسجل العقاري.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSignModal(false)}
                type="button"
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmSignature}
                disabled={isSigning || !signerNationalId.trim() || !legalDeclarationAccepted}
                type="button"
                className="px-5 py-2.5 rounded-xl bg-[#0F2942] hover:bg-[#16324F] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                {isSigning ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-[#12A889]" />}
                <span>توثيق التوقيع المعتمد والإقرار الشرعي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONTRACT MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">إلغاء وفسخ مسودة العقد</h3>
                <p className="text-xs text-slate-500">سيتم تسجيل سبب الإلغاء في سجل التدقيق</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                سبب الإلغاء: <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="اذكر سبب فسخ أو إلغاء العقد بالتراضي أو لعدم الاتفاق..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                type="button"
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                type="button"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                {isCancelling ? <Clock className="w-4 h-4 animate-spin" /> : null}
                <span>تأكيد الإلغاء</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
