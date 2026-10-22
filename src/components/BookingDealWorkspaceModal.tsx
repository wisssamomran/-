import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  PropertyBooking,
  PropertyRequest,
  Listing,
  DealTerms,
  TermsRevision,
  DealMessage,
  InspectionVisit,
  InspectionResult,
  DealStage,
  Currency,
  PropertyContract,
  ContractClause,
  ContractVersion
} from '../types';
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Building2,
  User,
  Phone,
  MessageCircle,
  FileText,
  Calendar,
  Send,
  ShieldCheck,
  Check,
  ArrowRight,
  Eye,
  Edit3,
  DollarSign,
  AlertCircle,
  History,
  MapPin,
  ChevronRight,
  RefreshCw,
  Sparkles,
  HelpCircle,
  BadgeAlert,
  CalendarCheck,
  FileCheck,
  Scale,
  FileWarning,
  Printer,
  Download,
  ShieldAlert,
  Award
} from 'lucide-react';
import { ContractDocumentModal } from './ContractDocumentModal';
import { printCertificateA4, downloadCertificatePdf } from '../utils/contractPrintHelper';

interface BookingDealWorkspaceModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectListing?: (listing: Listing) => void;
}

export const BookingDealWorkspaceModal: React.FC<BookingDealWorkspaceModalProps> = ({
  bookingId,
  isOpen,
  onClose,
  onSelectListing
}) => {
  const {
    currentUser,
    bookings,
    listings,
    contracts,
    fetchDealWorkspace,
    sendDealMessage,
    proposeDealTerms,
    respondToDealTerms,
    updateDealInspection,
    updateDealStage,
    completeBooking,
    checkDealCompletionReadiness,
    failBooking,
    disputeBooking,
    cancelBooking,
    extendBooking,
    generateContractFromBooking,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'terms' | 'inspection' | 'chat' | 'overview' | 'contract'>('terms');
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showContractDocumentModal, setShowContractDocumentModal] = useState(false);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Propose Terms Form State
  const [showProposeTermsModal, setShowProposeTermsModal] = useState(false);
  const [termsFormPrice, setTermsFormPrice] = useState<number>(0);
  const [termsFormCurrency, setTermsFormCurrency] = useState<Currency>('USD');
  const [termsFormPaymentMethod, setTermsFormPaymentMethod] = useState<string>('certified_check');
  const [termsFormDeposit, setTermsFormDeposit] = useState<number>(0);
  const [termsFormHandoverDate, setTermsFormHandoverDate] = useState<string>('');
  const [termsFormFeeBy, setTermsFormFeeBy] = useState<'shared_equally' | 'buyer_only' | 'seller_only' | 'tenant_only'>('shared_equally');
  const [termsFormSpecialConditions, setTermsFormSpecialConditions] = useState<string[]>([]);
  const [newConditionInput, setNewConditionInput] = useState('');
  const [termsFormNotes, setTermsFormNotes] = useState('');
  const [isSubmittingTerms, setIsSubmittingTerms] = useState(false);

  // Respond Terms State
  const [respondModalRevision, setRespondModalRevision] = useState<TermsRevision | null>(null);
  const [respondAction, setRespondAction] = useState<'accept' | 'reject'>('accept');
  const [respondNotes, setRespondNotes] = useState('');
  const [isRespondingTerms, setIsRespondingTerms] = useState(false);

  // Inspection Form State
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionAction, setInspectionAction] = useState<'request' | 'confirm' | 'complete'>('request');
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionTime, setInspectionTime] = useState('16:00');
  const [inspectionLocationNotes, setInspectionLocationNotes] = useState('');
  const [inspectionResult, setInspectionResult] = useState<InspectionResult>('satisfied');
  const [inspectionResultNotes, setInspectionResultNotes] = useState('');
  const [isSubmittingInspection, setIsSubmittingInspection] = useState(false);

  // Complete & Readiness Modals State (Requirement 1, 2, 3, 4, 5)
  const [showCompleteDealModal, setShowCompleteDealModal] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeReceiptRef, setCompleteReceiptRef] = useState('');
  const [completeNotaryRef, setCompleteNotaryRef] = useState('');
  const [completeHandoverDate, setCompleteHandoverDate] = useState('');
  const [completeForceOverride, setCompleteForceOverride] = useState(false);
  const [readinessData, setReadinessData] = useState<any>(null);
  const [isLoadingReadiness, setIsLoadingReadiness] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Fail Deal State (Requirement 10)
  const [showFailModal, setShowFailModal] = useState(false);
  const [failCategory, setFailCategory] = useState<'deed_flaw' | 'financial_default' | 'inspection_defect' | 'legal_impediment' | 'other'>('deed_flaw');
  const [failReason, setFailReason] = useState('');
  const [isFailing, setIsFailing] = useState(false);

  // Dispute Deal State (Requirement 10)
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReasonInput, setDisputeReasonInput] = useState('');
  const [isDisputing, setIsDisputing] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const loadData = async () => {
    if (!bookingId) return;
    setIsLoading(true);
    const res = await fetchDealWorkspace(bookingId);
    if (res.success && res.data) {
      setWorkspaceData(res.data);
      // Pre-fill terms form
      const booking: PropertyBooking = res.data.booking;
      const initialTerms = booking.currentTerms || booking.agreedTerms;
      if (initialTerms) {
        setTermsFormPrice(initialTerms.price || booking.listingPrice || 0);
        setTermsFormCurrency(initialTerms.currency || booking.listingCurrency || 'USD');
        setTermsFormPaymentMethod(initialTerms.paymentMethod || 'certified_check');
        setTermsFormDeposit(initialTerms.depositAmount || Math.round((initialTerms.price || 0) * 0.05));
        setTermsFormHandoverDate(initialTerms.handoverDate || '');
        setTermsFormFeeBy(initialTerms.feeResponsibility || 'shared_equally');
        setTermsFormSpecialConditions(initialTerms.specialConditions || []);
        setTermsFormNotes(initialTerms.notes || '');
      } else {
        setTermsFormPrice(booking.listingPrice || 0);
        setTermsFormCurrency(booking.listingCurrency || 'USD');
        setTermsFormPaymentMethod(booking.paymentMethod || 'certified_check');
        setTermsFormDeposit(Math.round((booking.listingPrice || 0) * 0.05));
        setTermsFormHandoverDate('');
        setTermsFormFeeBy('shared_equally');
        setTermsFormSpecialConditions([
          'فحص وثائق الملكية والبصيرة الشرعية قبل سداد الدفعة النهائية',
          'سداد كافة فواتير الخدمات السابقة حتى تاريخ استلام العقار'
        ]);
        setTermsFormNotes('');
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen && bookingId) {
      loadData();
    }
  }, [isOpen, bookingId]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, workspaceData?.booking?.messages]);

  if (!isOpen) return null;

  // Real-time booking representation
  const booking: PropertyBooking | undefined = workspaceData?.booking || bookings.find(b => b.id === bookingId);
  const listing: Listing | undefined = workspaceData?.listing || listings.find(l => l.id === booking?.listingId);
  const currentContract = workspaceData?.contract || contracts.find(c => (booking?.id && c.bookingId === booking.id) || (booking?.contractId && c.id === booking.contractId));
  const hasContract = Boolean(currentContract || booking?.contractId);
  const userRoleInDeal = workspaceData?.userRoleInDeal || 'seeker';

  const isSeeker = booking?.seekerId === currentUser.id;
  const isAdvertiser = booking?.advertiserId === currentUser.id || listing?.advertiser?.id === currentUser.id;
  const isOrgManager = currentUser.role === 'org_manager' && Boolean(currentUser.orgId && listing?.advertiser?.orgId === currentUser.orgId);
  const isAssignedAgent = listing?.assignedAgentId === currentUser.id;
  const isSysAdmin = currentUser.role === 'system_admin';
  const isManagingParty = isAdvertiser || isOrgManager || isAssignedAgent || isSysAdmin;

  const isSale = booking?.listingPurpose === 'sale' || listing?.purpose === 'sale' || (booking && booking.listingPrice > 20000 && !booking.rentalUsageType);
  const isBookingActive = booking?.status === 'active';
  const isBookingCompleted = booking?.status === 'completed';
  const isTermsApproved = booking?.termsStatus === 'accepted' && Boolean(booking?.agreedTerms);
  const isTermsPendingReapproval = booking?.termsStatus === 'pending_reapproval';

  const stagesList: { key: DealStage; label: string; desc: string }[] = [
    { key: 'request_submitted', label: 'تقديم الطلب', desc: 'استلام رغبة الباحث ومراجعة المعلن' },
    { key: 'booking_exclusive', label: 'الحجز الحصري', desc: 'قفل العقار وحجبه عن الجمهور' },
    { key: 'inspection_deed', label: 'المعاينة والوثائق', desc: 'التحري الميداني وفحص صك البصيرة' },
    { key: 'terms_negotiation', label: 'اعتماد الشروط', desc: 'الاتفاق على السعر والعربون وموعد الإفراغ' },
    { key: 'contract_completed', label: 'إتمام الصفقة', desc: 'إبرام العقد النهائي ونقل الملكية' }
  ];

  const currentStageIndex = stagesList.findIndex(s => s.key === (booking?.dealStage || 'booking_exclusive'));

  // Handle Send Chat Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !booking) return;

    setIsSendingMessage(true);
    const textToSend = messageInput.trim();
    setMessageInput('');
    try {
      const res = await sendDealMessage(booking.id, textToSend);
      if (res.success) {
        await loadData();
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Quick Suggestion Click
  const handleQuickPrompt = (prompt: string) => {
    setMessageInput(prompt);
  };

  // Add Special Condition item
  const handleAddCondition = () => {
    if (newConditionInput.trim()) {
      setTermsFormSpecialConditions(prev => [...prev, newConditionInput.trim()]);
      setNewConditionInput('');
    }
  };

  // Remove Special Condition item
  const handleRemoveCondition = (index: number) => {
    setTermsFormSpecialConditions(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Propose Terms
  const handleSubmitProposeTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    if (termsFormPrice <= 0) {
      showToast('يرجى تحديد سعر صالح للعقار', 'error');
      return;
    }

    setIsSubmittingTerms(true);
    try {
      const termsPayload: DealTerms = {
        price: Number(termsFormPrice),
        currency: termsFormCurrency,
        paymentMethod: termsFormPaymentMethod,
        depositAmount: Number(termsFormDeposit) || undefined,
        depositCurrency: termsFormCurrency,
        handoverDate: termsFormHandoverDate || undefined,
        feeResponsibility: termsFormFeeBy,
        specialConditions: termsFormSpecialConditions,
        notes: termsFormNotes || undefined
      };

      const res = await proposeDealTerms(booking.id, termsPayload);
      if (res.success) {
        setShowProposeTermsModal(false);
        await loadData();
      }
    } finally {
      setIsSubmittingTerms(false);
    }
  };

  // Submit Respond to Terms
  const handleConfirmRespondTerms = async () => {
    if (!booking || !respondModalRevision) return;
    setIsRespondingTerms(true);
    try {
      const res = await respondToDealTerms(booking.id, respondModalRevision.id, respondAction, respondNotes);
      if (res.success) {
        setRespondModalRevision(null);
        await loadData();
      }
    } finally {
      setIsRespondingTerms(false);
    }
  };

  // Submit Inspection Update
  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setIsSubmittingInspection(true);
    try {
      const res = await updateDealInspection(booking.id, {
        action: inspectionAction,
        requestedDate: inspectionDate || undefined,
        requestedTime: inspectionTime || undefined,
        locationNotes: inspectionLocationNotes || undefined,
        result: inspectionAction === 'complete' ? inspectionResult : undefined,
        resultNotes: inspectionAction === 'complete' ? inspectionResultNotes : undefined
      });
      if (res.success) {
        setShowInspectionModal(false);
        await loadData();
      }
    } finally {
      setIsSubmittingInspection(false);
    }
  };

  // Fetch Readiness Checklist (Requirement 1, 2, 3, 4)
  const fetchReadiness = async (targetBookingId?: string) => {
    const bId = targetBookingId || booking?.id || bookingId;
    if (!bId) return;
    setIsLoadingReadiness(true);
    try {
      const res = await checkDealCompletionReadiness(bId);
      if (res.success && res.readiness) {
        setReadinessData(res.readiness);
      }
    } finally {
      setIsLoadingReadiness(false);
    }
  };

  const handleOpenCompleteModal = async () => {
    setShowCompleteDealModal(true);
    if (booking) {
      if (!completeNotaryRef) {
        setCompleteNotaryRef(currentContract?.firstParty?.attestationNumber || listing?.deedNumber || '');
      }
      if (!completeHandoverDate) {
        setCompleteHandoverDate(currentContract?.durationTerms?.handoverDate || booking.agreedTerms?.handoverDate || '');
      }
      if (!completeReceiptRef) {
        setCompleteReceiptRef('سند سداد مالي معتمد برقم ' + Math.floor(100000 + Math.random() * 900000));
      }
      await fetchReadiness(booking.id);
    }
  };

  // Submit Complete Deal (Requirement 4, 5, 6, 7, 8)
  const handleConfirmCompleteDeal = async () => {
    if (!booking) return;
    setIsCompleting(true);
    try {
      const res = await completeBooking(booking.id, {
        receiptReference: completeReceiptRef.trim() || undefined,
        notaryReference: completeNotaryRef.trim() || undefined,
        handoverDate: completeHandoverDate.trim() || undefined,
        notes: completeNotes.trim() || undefined,
        forceOverride: isSysAdmin ? completeForceOverride : false
      });
      if (res.success) {
        setShowCompleteDealModal(false);
        await loadData();
      } else if (res.checklist || res.unmetRequirements) {
        setReadinessData({
          isReady: false,
          unmetRequirements: res.unmetRequirements || [],
          checklist: res.checklist || {}
        });
      }
    } finally {
      setIsCompleting(false);
    }
  };

  // Submit Fail Deal (Requirement 10)
  const handleConfirmFailDeal = async () => {
    if (!booking) return;
    if (!failReason.trim()) {
      showToast('يرجى ذكر سبب ومبرر تعذر إتمام المعاملة', 'error');
      return;
    }
    setIsFailing(true);
    try {
      const res = await failBooking(booking.id, failCategory, failReason.trim());
      if (res.success) {
        setShowFailModal(false);
        await loadData();
      }
    } finally {
      setIsFailing(false);
    }
  };

  // Submit Dispute Deal (Requirement 10)
  const handleConfirmDisputeDeal = async () => {
    if (!booking) return;
    if (!disputeReasonInput.trim()) {
      showToast('يرجى كتابة تفاصيل ووقائع النزاع العقاري', 'error');
      return;
    }
    setIsDisputing(true);
    try {
      const res = await disputeBooking(booking.id, disputeReasonInput.trim());
      if (res.success) {
        setShowDisputeModal(false);
        await loadData();
      }
    } finally {
      setIsDisputing(false);
    }
  };

  // Submit Cancel Booking
  const handleConfirmCancelBooking = async () => {
    if (!booking) return;
    setIsCancelling(true);
    try {
      const res = await cancelBooking(booking.id, cancelReason || 'إلغاء باتفاق الطرفين');
      if (res.success) {
        setShowCancelModal(false);
        await loadData();
      }
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle Generate Contract Draft from Booking (Requirement 1, 2, 3)
  const handleGenerateContract = async () => {
    if (!booking) return;
    setIsGeneratingContract(true);
    try {
      const res = await generateContractFromBooking(booking.id);
      if (res.success && res.contract) {
        showToast(res.message || 'تم إنشاء مسودة العقد بنجاح واستيراد كافة بيانات الحجز والشروط', 'success');
        await loadData();
        setShowContractDocumentModal(true);
      } else {
        showToast(res.message || 'تعذر إنشاء مسودة العقد', 'error');
      }
    } finally {
      setIsGeneratingContract(false);
    }
  };

  const [isPrintingCert, setIsPrintingCert] = useState(false);

  const handlePrintCertificate = async () => {
    if (!booking) return;
    setIsPrintingCert(true);
    try {
      showToast('جاري إنشاء وتنزيل شهادة إتمام المعاملة بصيغة PDF...', 'info');
      await downloadCertificatePdf(booking, currentContract, listing);
      showToast('تم تنزيل شهادة إتمام المعاملة PDF بنجاح!', 'success');
    } catch (err) {
      console.error('Error downloading certificate PDF:', err);
      showToast('جاري التحويل لطباعة الشهادة...', 'warning');
      await printCertificateA4(booking, currentContract, listing);
    } finally {
      setIsPrintingCert(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* ================= MODAL HEADER ================= */}
        <div className="bg-[#16324F] text-white p-4 sm:p-5 flex flex-col gap-3 relative shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#12A889]/20 border border-[#12A889]/40 flex items-center justify-center text-[#12A889] shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 text-white">
                    {booking?.bookingNumber || 'BKG-2026-XXXX'}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    isSale ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30' : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  }`}>
                    {isSale ? 'صفقة بيع عقاري' : 'صفقة إيجار عقاري'}
                  </span>
                  <span className="text-[11px] text-slate-300">
                    رقم الإعلان: <span className="font-mono font-bold text-white">{booking?.listingNumber}</span>
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white mt-1 line-clamp-1">
                  مساحة متابعة الحجز والاتفاق: {booking?.listingTitle}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="إغلاق مساحة المتابعة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Exclusivity Lock & Security Banner (Requirement 9) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {isBookingActive
                  ? 'العقار محجوز حصرياً ومحجوب عن الباحثين وقوائم العرض العامة طوال سريان الحجز.'
                  : isBookingCompleted
                  ? 'تمت الصفقة بنجاح وتم إغلاق الإعلان نهائياً من العرض العام.'
                  : 'الحجز غير نشط حالياً.'}
              </span>
            </div>

            {isBookingActive && booking?.expiresAt && (
              <div className="flex items-center gap-2 font-mono text-xs bg-white/10 px-3 py-1 rounded-xl border border-white/10 self-start sm:self-auto">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>ينتهي الحجز في: {new Date(booking.expiresAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
            )}
          </div>
        </div>

        {/* ================= PIPELINE & NEXT STEP (Requirement 5) ================= */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 shrink-0 space-y-3">
          {/* 5-Step Pipeline */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {stagesList.map((stg, idx) => {
              const isPast = idx < currentStageIndex || isBookingCompleted;
              const isCurrent = idx === currentStageIndex && !isBookingCompleted;
              return (
                <div
                  key={stg.key}
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    isCurrent
                      ? 'bg-emerald-50 border-[#12A889] text-[#16324F] shadow-2xs ring-2 ring-[#12A889]/30'
                      : isPast
                      ? 'bg-white border-emerald-200 text-emerald-900'
                      : 'bg-white/60 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-[#12A889] text-white animate-pulse'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isPast ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold truncate w-full">{stg.label}</span>
                </div>
              );
            })}
          </div>

          {/* Dynamic Next Step Banner */}
          {workspaceData?.nextStep && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="font-extrabold text-amber-950 flex items-center gap-2">
                    <span>الخطوة التالية المطلوبة:</span>
                    <span className="underline decoration-amber-400 font-black">{workspaceData.nextStep.title}</span>
                  </div>
                  <p className="text-amber-800 text-[11px] mt-0.5">{workspaceData.nextStep.description}</p>
                </div>
              </div>

              {/* Action shortcut buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                {isBookingActive && !isTermsApproved && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('terms');
                      setShowProposeTermsModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white font-bold text-xs shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تقديم / تعديل الشروط</span>
                  </button>
                )}

                {isBookingActive && (hasContract || isTermsApproved) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (hasContract) {
                        setShowContractDocumentModal(true);
                      } else {
                        setActiveTab('contract');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#16324F] hover:bg-[#0f2438] text-white font-bold text-xs shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-[#12A889]" />
                    <span>{hasContract ? 'عرض وثيقة العقد والاعتمادات' : 'إنشاء وثيقة العقد'}</span>
                  </button>
                )}

                {isBookingActive && isManagingParty && (
                  <button
                    type="button"
                    onClick={handleOpenCompleteModal}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1 cursor-pointer ring-2 ring-emerald-400/50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>فحص وإتمام الصفقة رسمياً</span>
                  </button>
                )}

                {isBookingActive && (
                  <button
                    type="button"
                    onClick={() => setShowDisputeModal(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    title="تسجيل نزاع عقاري وتجميد الإجراءات"
                  >
                    <Scale className="w-3.5 h-3.5 text-amber-600" />
                    <span>تسجيل نزاع</span>
                  </button>
                )}

                {isBookingActive && (isManagingParty || isSeeker) && (
                  <button
                    type="button"
                    onClick={() => setShowFailModal(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    title="تسجيل تعذر استكمال الصفقة (عيب في الصك / تعثر مالي / مانع قانوني)"
                  >
                    <FileWarning className="w-3.5 h-3.5 text-rose-600" />
                    <span>تعذر الإتمام</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================= TAB NAVIGATION ================= */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-slate-200 bg-white shrink-0 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'terms'
                ? 'border-[#12A889] text-[#12A889]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>الشروط والتفاوض المالي</span>
            {isTermsApproved ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="شروط معتمدة" />
            ) : isTermsPendingReapproval ? (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" title="تعديل قيد الاعتماد" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inspection')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'inspection'
                ? 'border-[#12A889] text-[#12A889]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>المعاينة الميدانية والوثائق</span>
            {booking?.inspectionVisit?.status === 'confirmed' && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">موعد مؤكد</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'chat'
                ? 'border-[#12A889] text-[#12A889]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>المحادثة وسجل التواصل</span>
            {booking?.messages && booking.messages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
                {booking.messages.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-[#12A889] text-[#12A889]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>تفاصيل العقار والطرفين والضوابط</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contract')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'contract'
                ? 'border-[#12A889] text-[#12A889]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>العقد والتوثيق الرسمي</span>
            {hasContract ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {currentContract?.status === 'signed' ? 'موقع رسمياً' : currentContract?.status === 'approved' ? 'معتمد' : 'مسودة موثقة'}
              </span>
            ) : isTermsApproved ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold animate-pulse">
                جاهز للإنشاء
              </span>
            ) : null}
          </button>
        </div>

        {/* ================= TAB CONTENTS ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {isLoading && !workspaceData ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#12A889]" />
              <p className="text-sm font-bold">جاري تحميل بيانات مساحة متابعة الصفقة...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: DEAL TERMS & NEGOTIATION */}
              {activeTab === 'terms' && (
                <div className="space-y-6">
                  {/* Approved Core Terms Certified Card (Requirement 7 & 8) */}
                  {isTermsApproved && booking?.agreedTerms ? (
                    <div className="bg-emerald-50/90 border-2 border-emerald-400 rounded-3xl p-5 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-emerald-950 text-sm sm:text-base">
                                الشروط الأساسية المعتمدة للاتفاق المبدئي
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white text-[11px] font-bold">
                                معتمدة وملزمة مبدئياً
                              </span>
                            </div>
                            <p className="text-emerald-800 text-xs mt-0.5">
                              تم اعتماد هذه البنود صراحة من الطرفين في{' '}
                              <span className="font-bold">
                                {booking.agreedTermsApprovedAt
                                  ? new Date(booking.agreedTermsApprovedAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })
                                  : 'الجلسة الموثقة'}
                              </span>
                              . أي تعديل عليها لا يمكن أن يتم بصمت.
                            </p>
                          </div>
                        </div>

                        {isBookingActive && (
                          <button
                            type="button"
                            onClick={() => setShowProposeTermsModal(true)}
                            className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>طلب تعديل الشروط المعتمدة</span>
                          </button>
                        )}
                      </div>

                      {/* Terms Key Data Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/80 p-4 rounded-2xl border border-emerald-200/80 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">السعر النهائي المتفق عليه:</span>
                          <span className="font-black text-emerald-900 text-base font-mono">
                            {booking.agreedTerms.price.toLocaleString()} {booking.agreedTerms.currency}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block mb-0.5">طريقة الدفع المعتمدة:</span>
                          <span className="font-bold text-slate-800">
                            {booking.agreedTerms.paymentMethod === 'certified_check' ? 'شيك مصرفي مصدق' :
                             booking.agreedTerms.paymentMethod === 'cash' ? 'نقداً بالكامل' :
                             booking.agreedTerms.paymentMethod === 'installments' ? 'أقساط ودفعات' :
                             booking.agreedTerms.paymentMethod || 'نقداً'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block mb-0.5">مبلغ العربون المقيد:</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {booking.agreedTerms.depositAmount
                              ? `${booking.agreedTerms.depositAmount.toLocaleString()} ${booking.agreedTerms.depositCurrency || booking.agreedTerms.currency}`
                              : 'حسب العقد المبرم'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block mb-0.5">موعد الإفراغ / التسليم:</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {booking.agreedTerms.handoverDate || 'خلال 14 يوماً من توقيع العقد'}
                          </span>
                        </div>
                      </div>

                      {/* Special Conditions List */}
                      {booking.agreedTerms.specialConditions && booking.agreedTerms.specialConditions.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-xs font-bold text-emerald-950 block">البنود والشروط الخاصة المتفق عليها:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {booking.agreedTerms.specialConditions.map((cond, cIdx) => (
                              <div key={cIdx} className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-emerald-200/60 text-xs text-slate-800">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{cond}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : isTermsPendingReapproval ? (
                    /* Anti-Silent Modification Warning Banner (Requirement 8) */
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <BadgeAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-black text-amber-950 text-sm sm:text-base">
                            تنبيه: تم تعليق الشروط المعتمدة لوجود طلب تعديل جديد (منع التعديل الصامت)
                          </h4>
                          <p className="text-amber-800 text-xs mt-1">
                            تم اقتراح تعديل على الشروط السابقة. بموجب ضوابط المنصة الصارمة، لا يمكن سريان أي تعديل بصمت، ويلزم مراجعة واعتماد الطرف الآخر للنسخة الجديدة رقم #{booking?.termsHistory?.[0]?.version}.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Header: Action to Propose New Terms */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">سجل عروض ومسودات الشروط (التفاوض المالي)</h4>
                      <p className="text-slate-500 text-xs mt-0.5">
                        يوثق كل عرض مالي أو تعديل مع التاريخ وهوية من قام بالاقتراح والرد.
                      </p>
                    </div>

                    {isBookingActive && (
                      <button
                        type="button"
                        onClick={() => setShowProposeTermsModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>اقتراح مسودة شروط جديدة</span>
                      </button>
                    )}
                  </div>

                  {/* Revisions History List (Requirement 4) */}
                  <div className="space-y-3">
                    {(!booking?.termsHistory || booking.termsHistory.length === 0) ? (
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
                        <FileText className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-bold">لم يتم تسجيل مسودات شروط بعد في هذه العملية.</p>
                        {isBookingActive && (
                          <button
                            type="button"
                            onClick={() => setShowProposeTermsModal(true)}
                            className="text-[#12A889] text-xs font-bold underline cursor-pointer"
                          >
                            ابدأ الآن باقتراح مسودة الشروط الأولى
                          </button>
                        )}
                      </div>
                    ) : (
                      booking.termsHistory.map((rev, revIdx) => {
                        const isLatest = revIdx === 0;
                        const isProposerMe = rev.proposedBy.id === currentUser.id;
                        const canIRespond = isBookingActive && isLatest && !isProposerMe && (rev.status === 'pending_approval' || rev.status === 'pending_reapproval');

                        return (
                          <div
                            key={rev.id}
                            className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all space-y-3 ${
                              rev.status === 'accepted'
                                ? 'border-emerald-300 bg-emerald-50/20 shadow-2xs'
                                : rev.status === 'pending_approval' || rev.status === 'pending_reapproval'
                                ? 'border-amber-300 ring-2 ring-amber-100 shadow-2xs'
                                : 'border-slate-200 opacity-80'
                            }`}
                          >
                            {/* Revision Top Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold bg-[#16324F] text-white px-2 py-0.5 rounded-lg">
                                  إصدار #{rev.version}
                                </span>
                                <span className="text-xs font-bold text-slate-800">
                                  بواسطة: {rev.proposedBy.name} ({rev.proposedBy.role === 'seeker' ? 'الباحث' : 'المعلن'})
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  🕒 {rev.proposedAt}
                                </span>
                              </div>

                              {/* Status Badge */}
                              <div>
                                {rev.status === 'accepted' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>معتمد رسمياً</span>
                                  </span>
                                ) : rev.status === 'pending_approval' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>قيد مراجعة الطرف الآخر</span>
                                  </span>
                                ) : rev.status === 'pending_reapproval' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-200 text-amber-950 font-bold text-xs">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                                    <span>تعديل معلق لإعادة الاعتماد</span>
                                  </span>
                                ) : rev.status === 'rejected' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 font-bold text-xs">
                                    <X className="w-3.5 h-3.5 text-rose-600" />
                                    <span>مرفوض</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
                                    تم استبداله بإصدار أحدث
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Terms Snapshot */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                              <div>
                                <span className="text-slate-400 block mb-0.5">السعر:</span>
                                <span className="font-black text-slate-900 font-mono text-sm">
                                  {rev.terms.price.toLocaleString()} {rev.terms.currency}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-0.5">طريقة السداد:</span>
                                <span className="font-bold text-slate-800">
                                  {rev.terms.paymentMethod === 'certified_check' ? 'شيك مصدق' :
                                   rev.terms.paymentMethod === 'cash' ? 'نقداً' :
                                   rev.terms.paymentMethod === 'installments' ? 'أقساط' : rev.terms.paymentMethod}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-0.5">العربون:</span>
                                <span className="font-bold text-slate-800 font-mono">
                                  {rev.terms.depositAmount ? `${rev.terms.depositAmount.toLocaleString()} ${rev.terms.depositCurrency || rev.terms.currency}` : 'غير محدد'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-0.5">موعد التسليم:</span>
                                <span className="font-bold text-slate-800 font-mono">
                                  {rev.terms.handoverDate || 'حسب الاتفاق'}
                                </span>
                              </div>
                            </div>

                            {/* Special Conditions of this revision */}
                            {rev.terms.specialConditions && rev.terms.specialConditions.length > 0 && (
                              <div className="text-xs space-y-1">
                                <span className="text-slate-500 font-bold">الشروط المحددة:</span>
                                <ul className="list-disc list-inside text-slate-700 space-y-0.5 pr-2">
                                  {rev.terms.specialConditions.map((c, i) => (
                                    <li key={i}>{c}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Response details if responded */}
                            {rev.responseBy && (
                              <div className="bg-slate-100/70 p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2">
                                <span className="text-slate-600">
                                  الرد بواسطة: <span className="font-bold text-slate-900">{rev.responseBy.name}</span> في {rev.responseAt}
                                  {rev.responseNotes && ` — ملاحظات: "${rev.responseNotes}"`}
                                </span>
                              </div>
                            )}

                            {/* Counterparty Accept / Reject Action Bar */}
                            {canIRespond && (
                              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRespondModalRevision(rev);
                                    setRespondAction('accept');
                                    setRespondNotes('موافق ومعتمد لكافة البنود المذكورة');
                                  }}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>قبول واعتماد هذه الشروط رسمياً</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setRespondModalRevision(rev);
                                    setRespondAction('reject');
                                    setRespondNotes('');
                                  }}
                                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200 font-bold text-xs transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>رفض الشروط</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: INSPECTION VISIT & DEED VERIFICATION (Requirement 6) */}
              {activeTab === 'inspection' && (
                <div className="space-y-6">
                  {/* Current Inspection Status Card */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                          <CalendarCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-base">
                            حالة المعاينة الميدانية ومطابقة البصيرة
                          </h3>
                          <p className="text-slate-500 text-xs mt-0.5">
                            التنسيق للمعاينة على الطبيعة ومطابقة أصول الصكوك الشرعية مع الأمين المعتمد.
                          </p>
                        </div>
                      </div>

                      {/* Inspection Status Badge */}
                      <div>
                        {booking?.inspectionVisit?.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 font-bold text-xs border border-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>تمت المعاينة الميدانية بنجاح</span>
                          </span>
                        ) : booking?.inspectionVisit?.status === 'confirmed' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-950 font-bold text-xs border border-blue-300">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>الموعد مؤكد بين الطرفين</span>
                          </span>
                        ) : booking?.inspectionVisit?.status === 'requested' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-950 font-bold text-xs border border-amber-300">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span>طلب معاينة قيد تأكيد المعلن</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
                            لم يُحدد موعد معاينة بعد
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Inspection Details View */}
                    {booking?.inspectionVisit && booking.inspectionVisit.status !== 'not_scheduled' ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
                          <div>
                            <span className="text-slate-400 block mb-0.5">التاريخ والوقت المحدد:</span>
                            <span className="font-black text-slate-900 font-mono text-sm">
                              {booking.inspectionVisit.requestedDate || 'غير محدد'} — {booking.inspectionVisit.requestedTime || ''}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block mb-0.5">مكان ونقطة اللقاء:</span>
                            <span className="font-bold text-slate-800">
                              {booking.inspectionVisit.locationNotes || 'أمام مدخل العقار مباشرة'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block mb-0.5">المُنسق:</span>
                            <span className="font-bold text-slate-800">
                              {booking.inspectionVisit.scheduledBy || booking.seekerName}
                            </span>
                          </div>
                        </div>

                        {/* Completed Result Box */}
                        {booking.inspectionVisit.status === 'completed' && (
                          <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                            booking.inspectionVisit.result === 'satisfied'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                              : booking.inspectionVisit.result === 'needs_negotiation'
                              ? 'bg-amber-50 border-amber-300 text-amber-950'
                              : 'bg-rose-50 border-rose-300 text-rose-950'
                          }`}>
                            <div className="flex items-center gap-2 font-black">
                              <span>نتيجة المعاينة المسجلة:</span>
                              <span>
                                {booking.inspectionVisit.result === 'satisfied' ? '✅ معاينة ناجحة ومطابقة للمواصفات وصك البصيرة' :
                                 booking.inspectionVisit.result === 'needs_negotiation' ? '⚠️ توجد ملاحظات تستدعي تعديل السعر أو الشروط' :
                                 '❌ عدم الرغبة بعد المعاينة'}
                              </span>
                            </div>
                            {booking.inspectionVisit.resultNotes && (
                              <p className="text-slate-700 text-xs mt-1">
                                ملاحظات المعاينة: "{booking.inspectionVisit.resultNotes}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action buttons on inspection */}
                        {isBookingActive && (
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                            {booking.inspectionVisit.status === 'requested' && isManagingParty && (
                              <button
                                type="button"
                                onClick={() => {
                                  setInspectionAction('confirm');
                                  setInspectionDate(booking.inspectionVisit?.requestedDate || '');
                                  setInspectionTime(booking.inspectionVisit?.requestedTime || '16:00');
                                  setInspectionLocationNotes(booking.inspectionVisit?.locationNotes || '');
                                  setShowInspectionModal(true);
                                }}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>تأكيد موعد المعاينة المقترح</span>
                              </button>
                            )}

                            {booking.inspectionVisit.status === 'confirmed' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setInspectionAction('complete');
                                  setInspectionResult('satisfied');
                                  setInspectionResultNotes('العقار مطابق للوصف وصك البصيرة الشرعية سليم');
                                  setShowInspectionModal(true);
                                }}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تسجيل إتمام المعاينة والنتيجة</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setInspectionAction('request');
                                setInspectionDate('');
                                setInspectionTime('16:00');
                                setInspectionLocationNotes('');
                                setShowInspectionModal(true);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 cursor-pointer"
                            >
                              <span>تغيير الموعد / إعادة التنسيق</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* No Inspection Scheduled Yet */
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-3">
                        <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">لم يتم تحديد موعد معاينة ميدانية بعد</h4>
                          <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                            يُفضل تحديد موعد للمعاينة على الطبيعة لفحص العقار ومطابقة بصيرة الملكية قبل اعتماد الشروط وتوقيع العقد.
                          </p>
                        </div>
                        {isBookingActive && (
                          <button
                            type="button"
                            onClick={() => {
                              setInspectionAction('request');
                              setInspectionDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
                              setInspectionTime('16:30');
                              setInspectionLocationNotes('أمام بوابة العقار - التنسيق المسبق هاتفياً');
                              setShowInspectionModal(true);
                            }}
                            className="px-5 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white font-bold text-xs shadow-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <CalendarCheck className="w-4 h-4" />
                            <span>طلب موعد معاينة ميدانية الآن</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: CHAT & COMMUNICATION (Requirement 2) */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-[520px] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                    {(!booking?.messages || booking.messages.length === 0) ? (
                      <div className="py-12 text-center text-slate-400 space-y-2">
                        <MessageCircle className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-bold">لا توجد رسائل سابقة. ابدأ المحادثة الآن!</p>
                      </div>
                    ) : (
                      booking.messages.map(msg => {
                        const isSystem = msg.type === 'system' || msg.type === 'terms_proposal' || msg.type === 'terms_accepted' || msg.type === 'terms_modified' || msg.type === 'inspection_update';
                        const isMine = msg.senderId === currentUser.id;

                        if (isSystem) {
                          return (
                            <div key={msg.id} className="flex justify-center my-2">
                              <div className="max-w-md bg-slate-100 text-slate-700 text-xs px-3.5 py-1.5 rounded-xl border border-slate-200 text-center space-y-0.5 shadow-2xs">
                                <span className="font-mono text-[10px] text-slate-400 block">{msg.timestamp}</span>
                                <span className="font-medium">{msg.text}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMine ? 'items-start' : 'items-end'}`}
                          >
                            <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                              <span className="font-bold text-slate-700">{msg.senderName}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600">
                                {msg.senderRole === 'seeker' ? 'باحث' : msg.senderRole === 'system_admin' ? 'مدير نظام' : 'معلن'}
                              </span>
                              <span className="font-mono text-[10px]">{msg.timestamp}</span>
                            </div>

                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs font-medium shadow-2xs ${
                                isMine
                                  ? 'bg-[#12A889] text-white rounded-br-xs'
                                  : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Prompts Bar */}
                  {isBookingActive && (
                    <div className="bg-slate-100/80 px-3 py-2 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold text-slate-700 shrink-0">
                      <span className="text-slate-400 shrink-0">مقترحات:</span>
                      {[
                        'أرغب في تحديد موعد لمعاينة العقار على الطبيعة',
                        'تم الاطلاع على وثائق الملكية، نود مناقشة شروط الدفع',
                        'نحن جاهزون لسداد العربون وتجهيز صك البيع المبدئي',
                        'يرجى إرسال نسخة من عقد الإيجار المقترح للمراجعة'
                      ].map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleQuickPrompt(prompt)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#12A889] hover:text-[#12A889] shrink-0 transition-colors cursor-pointer text-right"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input Form */}
                  {isBookingActive ? (
                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                        placeholder="اكتب رسالتك بخصوص هذا العقار والحجز..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isSendingMessage || !messageInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5 rotate-180" />
                        <span>إرسال</span>
                      </button>
                    </form>
                  ) : (
                    <div className="p-3 bg-slate-100 text-slate-500 text-xs text-center font-bold">
                      تم إغلاق المحادثة لانتهاء أو اكتمال الحجز.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: OVERVIEW & PROPERTY SPECS (Requirement 1, 6, 7, 8, 10) */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* TRANSACTION COMPLETION CERTIFICATE (Requirement 8 & 6) */}
                  {isBookingCompleted && (
                    <div className="bg-gradient-to-br from-emerald-950 via-[#16324F] to-emerald-900 text-white rounded-3xl p-6 shadow-xl border-2 border-emerald-400/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/15 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0 shadow-inner">
                            <Award className="w-7 h-7 text-emerald-300" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold bg-emerald-500/20 text-emerald-200 px-2.5 py-0.5 rounded-lg border border-emerald-400/30">
                                شهادة إتمام معاملة رسمية
                              </span>
                              <span className="text-xs font-bold text-amber-300">
                                {isSale ? 'عقد بيع قطعي ومناقلة ملكية' : 'عقد إيجار شرعي موثق'}
                              </span>
                            </div>
                            <h3 className="font-black text-lg sm:text-xl text-white mt-1">
                              تم إغلاق الصفقة ونقل المعاملة إلى السجل الدائم بنجاح
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                          <button
                            type="button"
                            onClick={handlePrintCertificate}
                            disabled={isPrintingCert}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#0F2942] text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-md disabled:opacity-50"
                            title="تنزيل شهادة الإتمام مباشرة بصيغة PDF مقاس A4"
                          >
                            <Download className="w-4 h-4 text-[#0F2942]" />
                            <span>{isPrintingCert ? 'جاري إنشاء PDF...' : 'تنزيل الشهادة PDF'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (!booking) return;
                              setIsPrintingCert(true);
                              try {
                                showToast('جاري تجهيز الشهادة للطباعة الورقية...', 'info');
                                await printCertificateA4(booking, currentContract, listing);
                              } catch (e) {
                                window.print();
                              } finally {
                                setIsPrintingCert(false);
                              }
                            }}
                            disabled={isPrintingCert}
                            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                            title="طباعة الشهادة على طابعة ورقية A4"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-300" />
                            <span className="hidden sm:inline">طباعة ورقية</span>
                          </button>
                        </div>
                      </div>

                      {/* Certificate Core Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white/10 p-3 rounded-2xl border border-white/10 space-y-1">
                          <span className="text-emerald-300 text-[10px] block font-bold">النتيجة النهائية للعقار:</span>
                          <span className="font-black text-sm text-white">
                            {listing?.status === 'sold' || isSale ? 'تم البيع رسمياً (مباع)' : 'تم التأجير رسمياً (مؤجر)'}
                          </span>
                        </div>

                        <div className="bg-white/10 p-3 rounded-2xl border border-white/10 space-y-1">
                          <span className="text-emerald-300 text-[10px] block font-bold">المبلغ الإجمالي المعتمد:</span>
                          <span className="font-black text-sm text-white font-mono">
                            {(booking.completionSummary?.finalAmount || currentContract?.financialTerms?.totalAmount || booking.listingPrice).toLocaleString()} {booking.completionSummary?.currency || currentContract?.financialTerms?.currency || booking.listingCurrency}
                          </span>
                        </div>

                        <div className="bg-white/10 p-3 rounded-2xl border border-white/10 space-y-1">
                          <span className="text-emerald-300 text-[10px] block font-bold">رقم قيد/صك التوثيق:</span>
                          <span className="font-bold text-xs text-emerald-100 truncate block">
                            {booking.completionSummary?.notaryReference || currentContract?.firstParty?.attestationNumber || listing?.deedNumber || 'مقيد بالسجل المعتمد'}
                          </span>
                        </div>

                        <div className="bg-white/10 p-3 rounded-2xl border border-white/10 space-y-1">
                          <span className="text-emerald-300 text-[10px] block font-bold">سند السداد المالي:</span>
                          <span className="font-bold text-xs text-emerald-100 truncate block">
                            {booking.completionSummary?.receiptReference || 'مستوفى بموجب العقد'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-xs text-emerald-100 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-emerald-200 font-mono">
                          <span>المعتمد المنفذ: {booking.completionSummary?.completedBy || booking.completedBy || 'النظام'}</span>
                          <span>تاريخ التنفيذ: {booking.completedAt ? new Date(booking.completedAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' }) : 'معتمد'}</span>
                        </div>
                        <p className="text-[11px] text-slate-200 mt-1">
                          ملاحظات الإتمام: {booking.completionSummary?.notes || booking.completionNotes || 'تم استيفاء كامل الإجراءات التعاقدية والشرعية.'}
                        </p>
                      </div>

                      <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-[11px] text-emerald-200 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span>
                          العقار محمي نظامياً ولا يعود لقوائم التوفر تلقائياً بعد إتمام البيع أو التأجير لحماية السوق العقاري وحقوق المالك الجديد.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* DISPUTE STATUS ALERT BANNER (Requirement 10) */}
                  {booking?.status === 'disputed' && (
                    <div className="p-4 rounded-3xl bg-amber-50 border-2 border-amber-400 text-amber-950 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                        <Scale className="w-5 h-5 text-amber-600" />
                        <span>قضية نزاع عقاري مسجلة - المعاملة مجمدة رسمياً</span>
                      </div>
                      <p className="text-xs leading-relaxed text-amber-900">
                        سبب النزاع المقيد: <span className="font-bold">{booking.disputeReason || 'خلاف على بنود التعاقد أو صحة الوثائق'}</span>
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-amber-800 pt-1 border-t border-amber-200">
                        <span>قُيد بواسطة: {booking.disputedBy || 'أحد الأطراف'}</span>
                        <span>بتاريخ: {booking.disputedAt ? new Date(booking.disputedAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
                      </div>
                    </div>
                  )}

                  {/* FAILED COMPLETION ALERT BANNER (Requirement 10) */}
                  {booking?.status === 'failed_completion' && (
                    <div className="p-4 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2">
                      <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
                        <FileWarning className="w-5 h-5 text-rose-600" />
                        <span>تعذر إتمام المعاملة العقارية رسمياً</span>
                      </div>
                      <p className="text-xs leading-relaxed text-rose-900">
                        سبب التعذر: <span className="font-bold">{booking.failureReason || 'تعذر استكمال متطلبات المعاملة'}</span>
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-rose-800 pt-1 border-t border-rose-200">
                        <span>التصنيف: {booking.failureCategory || 'أسباب قانونية/مالية'}</span>
                        <span>المسجل: {booking.failedBy || 'إدارة النظام'}</span>
                      </div>
                    </div>
                  )}

                  {/* Property Card Full Details */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {booking?.listingImage && (
                        <img
                          src={booking.listingImage}
                          alt={booking.listingTitle}
                          className="w-full sm:w-44 h-32 rounded-2xl object-cover border border-slate-200 shrink-0"
                        />
                      )}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                            {booking?.listingNumber}
                          </span>
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            {isSale ? 'للبيع' : 'للإيجار'}
                          </span>
                          {booking?.listingGovernorate && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{booking.listingGovernorate}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-slate-900 text-base sm:text-lg">{booking?.listingTitle}</h3>
                        <div className="text-base font-black text-[#12A889] font-mono">
                          السعر المعلن: {booking?.listingPrice.toLocaleString()} {booking?.listingCurrency}
                        </div>
                        {listing && (
                          <p className="text-xs text-slate-600 line-clamp-2 mt-1">{listing.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Parties Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                      {/* Seeker Card */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">طرف الباحث:</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                            مقدم الطلب
                          </span>
                        </div>
                        <div className="font-extrabold text-slate-900 text-sm">{booking?.seekerName}</div>
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700" dir="ltr">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{booking?.seekerPhone}</span>
                        </div>
                      </div>

                      {/* Advertiser Card */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">طرف المعلن المسؤول:</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            معلن موثق
                          </span>
                        </div>
                        <div className="font-extrabold text-slate-900 text-sm">{booking?.advertiserName}</div>
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700" dir="ltr">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{booking?.advertiserPhone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Platform Governance & Guarantee Banner */}
                    <div className="bg-slate-100/70 p-3.5 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
                      <div className="font-bold text-[#16324F] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#12A889]" />
                        <span>حوكمة دلنّي لحماية صفقات العقار اليمني</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        يتم تشفير وتوثيق كل مرحلة، وحجب العقار المحجوز عن السوق العام، ومنع أي تعديل صامت على الشروط المعتمدة لضمان حقوق الباحث والمعلن.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: CONTRACT & OFFICIAL DOCUMENTATION (منظومة العقود والتوثيق) */}
              {activeTab === 'contract' && (
                <div className="space-y-6">
                  {currentContract ? (
                    <>
                      {/* 1. CONTRACT MAIN STATUS BANNER */}
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                              <FileCheck className="w-6 h-6 text-[#12A889]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-slate-900 text-base">
                                  {currentContract.contractType === 'sale'
                                    ? 'وثيقة عقد بيع عقار شرعي قطعي'
                                    : 'وثيقة عقد إيجار عقار سكني/تجاري موثق'}
                                </span>
                                <span className="font-mono text-xs font-black bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200">
                                  {currentContract.contractNumber}
                                </span>
                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  إصدار (v{currentContract.currentVersion})
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                موثق رسمياً وفق أحكام قانون المعاملات المدنية والشرعية اليمنية ومحكوم بضوابط حماية الصفقات
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => setShowContractDocumentModal(true)}
                              className="px-4 py-2.5 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white font-black text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <FileText className="w-4 h-4" />
                              <span>فتح وثيقة العقد للمراجعة والطباعة</span>
                            </button>
                          </div>
                        </div>

                        {/* Anti-Silent Modification Warning if pending approval */}
                        {currentContract.isModificationPendingApproval && (
                          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-black text-amber-900">
                                تنبيه حوكمة صارم (تعديل قيد الاعتماد - منع التعديل الصامت):
                              </div>
                              <p className="text-[11px] leading-relaxed mt-0.5">
                                تم تقديم مسودة تعديل جديدة على هذا العقد المعتمد، وقد عُلّق سريان الاعتماد السابق تلقائياً لحين موافقة الطرفين صراحةً على التعديلات وتوثيق الإصدار الجديد.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Contract Lifecycle and Status Badges */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                            <div className="text-slate-400 text-[10px] font-bold">حالة العقد القانونية:</div>
                            <div className="font-black flex items-center gap-1.5">
                              {currentContract.status === 'signed' ? (
                                <span className="text-teal-700 font-extrabold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> موقع رسمياً
                                </span>
                              ) : currentContract.status === 'approved' ? (
                                <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> معتمد من الطرفين
                                </span>
                              ) : currentContract.status === 'pending_approval' ? (
                                <span className="text-purple-700 font-extrabold flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> بانتظار الاعتماد
                                </span>
                              ) : currentContract.status === 'cancelled' ? (
                                <span className="text-rose-700 font-extrabold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> ملغي ومؤرشف
                                </span>
                              ) : (
                                <span className="text-amber-700 font-extrabold flex items-center gap-1">
                                  <Edit3 className="w-3.5 h-3.5" /> مسودة قيد التدقيق
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                            <div className="text-slate-400 text-[10px] font-bold">إجمالي قيمة الصفقة:</div>
                            <div className="font-black text-slate-900 font-mono">
                              {currentContract.financialTerms.totalAmount.toLocaleString()} {currentContract.financialTerms.currency}
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                            <div className="text-slate-400 text-[10px] font-bold">العربون المعتمد:</div>
                            <div className="font-black text-slate-900 font-mono">
                              {currentContract.financialTerms.depositAmount
                                ? `${currentContract.financialTerms.depositAmount.toLocaleString()} ${currentContract.financialTerms.currency}`
                                : 'لا يوجد عربون'}
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                            <div className="text-slate-400 text-[10px] font-bold">إصدارات العقد المسجلة:</div>
                            <div className="font-black text-slate-900">
                              {currentContract.versions.length} إصدارات موثقة
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. PARTIES AND APPROVALS CARD */}
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                        <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                          <User className="w-4 h-4 text-[#12A889]" />
                          <span>أطراف العقد والاعتمادات والتوقيعات الرسمية</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* First Party (Seller/Lessor) */}
                          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <span className="font-extrabold text-slate-800">
                                الطرف الأول ({currentContract.firstParty.role === 'seller' ? 'البائع / المالك' : 'المؤجر'})
                              </span>
                              <div className="flex items-center gap-1.5">
                                {currentContract.firstParty.signatureStatus === 'signed' ? (
                                  <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> تم التوقيع الإلكتروني
                                  </span>
                                ) : currentContract.firstPartyApproval ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                                    <Check className="w-3 h-3" /> معتمد
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    قيد المراجعة
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5 text-slate-700">
                              <div className="font-bold text-slate-900 text-sm">
                                {currentContract.firstParty.name}
                              </div>
                              <div className="flex items-center gap-2 text-slate-500 font-mono" dir="ltr">
                                <Phone className="w-3.5 h-3.5" />
                                <span>{currentContract.firstParty.phone}</span>
                              </div>
                              {currentContract.firstParty.signedAt && (
                                <div className="text-[10px] text-teal-800 font-medium">
                                  وُقّع في: {new Date(currentContract.firstParty.signedAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Second Party (Buyer/Lessee) */}
                          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <span className="font-extrabold text-slate-800">
                                الطرف الثاني ({currentContract.secondParty.role === 'buyer' ? 'المشتري' : 'المستأجر'})
                              </span>
                              <div className="flex items-center gap-1.5">
                                {currentContract.secondParty.signatureStatus === 'signed' ? (
                                  <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> تم التوقيع الإلكتروني
                                  </span>
                                ) : currentContract.secondPartyApproval ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                                    <Check className="w-3 h-3" /> معتمد
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    قيد المراجعة
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5 text-slate-700">
                              <div className="font-bold text-slate-900 text-sm">
                                {currentContract.secondParty.name}
                              </div>
                              <div className="flex items-center gap-2 text-slate-500 font-mono" dir="ltr">
                                <Phone className="w-3.5 h-3.5" />
                                <span>{currentContract.secondParty.phone}</span>
                              </div>
                              {currentContract.secondParty.signedAt && (
                                <div className="text-[10px] text-teal-800 font-medium">
                                  وُقّع في: {new Date(currentContract.secondParty.signedAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. LEGAL CLAUSES SUMMARY & PREVIEW */}
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#12A889]" />
                            <span>بنود العقد المستوردة والاشتراطات الخاصة ({currentContract.clauses.length} بنود)</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => setShowContractDocumentModal(true)}
                            className="text-xs font-bold text-[#12A889] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>مراجعة وتعديل الصياغة</span>
                            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                          </button>
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {currentContract.clauses.map((clause: ContractClause, idx: number) => (
                            <div
                              key={clause.id || idx}
                              className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                            >
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono shrink-0">
                                  {clause.number || idx + 1}
                                </span>
                                <span>{clause.title}</span>
                                {clause.isMandatory && (
                                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                                    بند نظامي
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2 pr-7">
                                {clause.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 4. AUDIT TRAIL AND VERSIONS CARD */}
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                            <History className="w-4 h-4 text-purple-600" />
                            <span>سجل الإصدارات الموثقة وتاريخ التعديلات</span>
                          </h4>
                          <span className="text-xs text-slate-400 font-mono">
                            {currentContract.versions.length} نسخ محفوظة
                          </span>
                        </div>

                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-xs">
                          {currentContract.versions.slice().reverse().map((ver: ContractVersion) => (
                            <div
                              key={ver.version}
                              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                                ver.version === currentContract.currentVersion
                                  ? 'bg-emerald-50/60 border-emerald-200'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                  <span>الإصدار رقم (v{ver.version})</span>
                                  {ver.version === currentContract.currentVersion && (
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                                      الإصدار الساري
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-600 text-[11px]">
                                  {ver.summaryOfChanges || 'إنشاء أو تعديل مسودة العقد'}
                                </p>
                              </div>

                              <div className="text-left text-[10px] text-slate-400 font-mono shrink-0">
                                <div>{ver.createdBy?.name || 'النظام'}</div>
                                <div>{new Date(ver.createdAt).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* NO CONTRACT YET - CALL TO ACTION */
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-5 shadow-xs">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-[#12A889] border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
                        <FileCheck className="w-8 h-8" />
                      </div>

                      <div className="max-w-md mx-auto space-y-2">
                        <h3 className="font-black text-slate-900 text-lg">
                          إنشاء مسودة العقد الرسمي المعتمد
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          يمكنك تحويل هذا الحجز إلى مسودة عقد رسمية (عقد بيع قطعي أو عقد إيجار موثق) مع استيراد كافة بيانات العقار والطرفين والشروط المتفق عليها تلقائياً دون إعادة إدخالها.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-xs text-right">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#12A889]" />
                            <span>استيراد أوتوماتيكي شامل</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            يتم سحب السعر، العملة، جدول الدفعات، أطوال وحدود البصيرة، وتاريخ الاستلام.
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#12A889]" />
                            <span>حوكمة ومنع التعديل الصامت</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            حفظ كافة الإصدارات، وتوثيق موافقة الطرفين، ومنع أي تغيير على النسخة المعتمدة دون إشعار صريح.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={isGeneratingContract}
                          onClick={handleGenerateContract}
                          className="px-6 py-3.5 rounded-2xl bg-[#12A889] hover:bg-[#0f8e74] text-white font-black text-sm shadow-md hover:shadow-lg flex items-center gap-2 mx-auto transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-5 h-5" />
                          <span>{isGeneratingContract ? 'جاري تحرير مسودة العقد واستيراد البيانات...' : 'إنشاء مسودة العقد الرسمي الآن'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ================= MODAL FOOTER ACTIONS (Requirement 10) ================= */}
        <div className="bg-white border-t border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">دورك في هذه العملية:</span>
            <span className="text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">
              {isSysAdmin ? 'مدير نظام المنصة' : isSeeker ? 'الباحث المشتري/المستأجر' : 'المعلن المسؤول عن العقار'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Complete Deal Button */}
            {isBookingActive && isManagingParty && (
              <button
                type="button"
                onClick={() => setShowCompleteDealModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>إتمام الصفقة وإغلاق الإعلان</span>
              </button>
            )}

            {/* Cancel Booking Button */}
            {isBookingActive && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
              >
                <span>إلغاء الحجز والعملية</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              <span>إغلاق النافذة</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= ACTION MODALS ================= */}

      {/* 1. PROPOSE / EDIT TERMS MODAL (Requirement 3 & 8) */}
      {showProposeTermsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#12A889]" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {isTermsApproved ? 'طلب تعديل الشروط المعتمدة (تعليق الاعتماد)' : 'اقتراح مسودة شروط الاتفاق'}
                </h3>
              </div>
              <button onClick={() => setShowProposeTermsModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Anti-silent modification warning if editing approved terms */}
            {isTermsApproved && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-black flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>تنبيه حوكمة صارم (منع التعديل الصامت):</span>
                </div>
                <p>
                  نظراً لأن الشروط السابقة كانت معتمدة صراحة، فإن تقديم أي تعديل جديد سيعلق الاعتماد المسبق فوراً ويتطلب موافقة صريحة من الطرف الآخر.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmitProposeTerms} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">السعر المقترح:</label>
                  <input
                    type="number"
                    value={termsFormPrice}
                    onChange={e => setTermsFormPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:border-[#12A889] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">العملة:</label>
                  <select
                    value={termsFormCurrency}
                    onChange={e => setTermsFormCurrency(e.target.value as Currency)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                  >
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">طريقة السداد:</label>
                  <select
                    value={termsFormPaymentMethod}
                    onChange={e => setTermsFormPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                  >
                    <option value="certified_check">شيك مصرفي مصدق</option>
                    <option value="cash">نقداً بالكامل</option>
                    <option value="installments">أقساط ودفعات مرحلية</option>
                    <option value="bank_finance">تسهيل وتمويل بنكي</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">مبلغ العربون المبدئي:</label>
                  <input
                    type="number"
                    value={termsFormDeposit}
                    onChange={e => setTermsFormDeposit(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:border-[#12A889] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">موعد الإفراغ / استلام المفاتيح:</label>
                  <input
                    type="date"
                    value={termsFormHandoverDate}
                    onChange={e => setTermsFormHandoverDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">تحمل رسوم السعاية والتوثيق:</label>
                  <select
                    value={termsFormFeeBy}
                    onChange={e => setTermsFormFeeBy(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                  >
                    <option value="shared_equally">مناصفة بين الطرفين</option>
                    <option value="buyer_only">على المشتري / المستأجر بالكامل</option>
                    <option value="seller_only">على المالك / المعلن بالكامل</option>
                  </select>
                </div>
              </div>

              {/* Special Conditions List Builder */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">بنود وشروط خاصة إضافية:</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={newConditionInput}
                    onChange={e => setNewConditionInput(e.target.value)}
                    placeholder="أضف بنداً مثل: سداد فواتير الكهرباء، تسليم البصيرة الأصلية..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCondition();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer shrink-0"
                  >
                    إضافة بند
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {termsFormSpecialConditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span>{cond}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات توضيحية:</label>
                <textarea
                  value={termsFormNotes}
                  onChange={e => setTermsFormNotes(e.target.value)}
                  placeholder="أي تفاصيل أو اشتراطات إضافية ترغب بمشاركتها مع الطرف الآخر..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProposeTermsModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTerms}
                  className="px-5 py-2 rounded-xl bg-[#12A889] hover:bg-[#0f8e74] text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {isSubmittingTerms ? 'جاري الإرسال...' : 'إرسال الشروط المقترحة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RESPOND TO TERMS MODAL */}
      {respondModalRevision && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {respondAction === 'accept' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <X className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-extrabold text-slate-900 text-base">
                  {respondAction === 'accept' ? 'تأكيد اعتماد الشروط النهائية' : 'رفض مسودة الشروط'}
                </h3>
              </div>
              <button onClick={() => setRespondModalRevision(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {respondAction === 'accept'
                ? `هل أنت متأكد من اعتماد الشروط المقترحة في الإصدار #${respondModalRevision.version} بسعر [${respondModalRevision.terms.price.toLocaleString()} ${respondModalRevision.terms.currency}]؟ هذا القرار ملزم مبدئياً لكلا الطرفين.`
                : `يرجى كتابة سبب رفض الشروط لمساعدة الطرف الآخر في تقديم مقترح ملائم.`}
            </p>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">ملاحظاتك المسجلة:</label>
              <textarea
                value={respondNotes}
                onChange={e => setRespondNotes(e.target.value)}
                placeholder={respondAction === 'accept' ? 'تمت الموافقة بدون تعديل...' : 'سبب الرفض والمطلوب تعديله...'}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRespondModalRevision(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmRespondTerms}
                disabled={isRespondingTerms}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-xs cursor-pointer ${
                  respondAction === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isRespondingTerms ? 'جاري الحفظ...' : respondAction === 'accept' ? 'اعتماد الشروط رسمياً' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. INSPECTION SCHEDULE / RESULT MODAL */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {inspectionAction === 'complete' ? 'تسجيل نتيجة المعاينة الميدانية' : inspectionAction === 'confirm' ? 'تأكيد موعد المعاينة' : 'تحديد موعد معاينة ميدانية'}
                </h3>
              </div>
              <button onClick={() => setShowInspectionModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitInspection} className="space-y-4 text-xs">
              {inspectionAction !== 'complete' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">تاريخ المعاينة:</label>
                      <input
                        type="date"
                        value={inspectionDate}
                        onChange={e => setInspectionDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">وقت الزيارة:</label>
                      <input
                        type="time"
                        value={inspectionTime}
                        onChange={e => setInspectionTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">مكان ونقطة اللقاء وملاحظات التنسيق:</label>
                    <textarea
                      value={inspectionLocationNotes}
                      onChange={e => setInspectionLocationNotes(e.target.value)}
                      placeholder="أمام البوابة الرئيسية للعقار، التنسيق مع الحارس..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">نتيجة المعاينة:</label>
                    <select
                      value={inspectionResult}
                      onChange={e => setInspectionResult(e.target.value as InspectionResult)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-[#12A889] outline-none cursor-pointer"
                    >
                      <option value="satisfied">✅ معاينة ناجحة ومطابقة للمواصفات وصك البصيرة</option>
                      <option value="needs_negotiation">⚠️ توجد ملاحظات تستدعي تعديل السعر أو الشروط</option>
                      <option value="not_interested">❌ عدم الرغبة بعد المعاينة الميدانية</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ملاحظات وتقرير المعاينة:</label>
                    <textarea
                      value={inspectionResultNotes}
                      onChange={e => setInspectionResultNotes(e.target.value)}
                      placeholder="تفاصيل حالة العقار، مطابقة أوراق البصيرة، أطوال الحدود..."
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInspectionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInspection}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {isSubmittingInspection ? 'جاري الحفظ...' : 'حفظ بيانات المعاينة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. COMPLETE DEAL GOVERNANCE INSPECTOR MODAL (Requirement 1, 2, 3, 4, 5, 6, 7, 8) */}
      {showCompleteDealModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">فحص متطلبات الحوكمة وإتمام المعاملة نهائياً</h3>
                  <p className="text-xs text-slate-500">التحقق الإلزامي من استيفاء شروط القانون والتوثيق قبل الإغلاق النهائي</p>
                </div>
              </div>
              <button onClick={() => setShowCompleteDealModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Checklist & Readiness Assessment */}
            {isLoadingReadiness ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#12A889]" />
                <span className="text-xs font-bold">جاري تدقيق متطلبات اكتمال المعاملة وسجلات التوثيق...</span>
              </div>
            ) : readinessData ? (
              <div className="space-y-4">
                {/* Readiness Banner */}
                {readinessData.isReady ? (
                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300 text-emerald-950 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold text-emerald-900 text-sm">كافة المتطلبات القانونية والتعاقدية مستوفاة بالكامل</div>
                      <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
                        تم التحقق من تحرير العقد، اعتماد النسخة الأخيرة من الطرفين، التوقيع بالهويات الوطنية، وسلامة المعاينة والشروط المالية. يمكنك إدخال بيانات التوثيق الشرعي أدناه وإتمام الصفقة.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-300 text-rose-950 text-xs flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-extrabold text-rose-900 text-sm">
                        المعاملة غير مكتملة - توجد شروط تعاقدية وقانونية غير مستوفاة ({readinessData.unmetRequirements?.length || 0})
                      </div>
                      <p className="text-rose-800 text-[11px] leading-relaxed">
                        وفق ضوابط حماية الصفقات وقانون الإثبات والتوثيق، لا يمكن إتمام الصفقة بمجرد الموافقة المبدئية حتى يتم استيفاء جميع المتطلبات المحددة أدناه لمنع التعديل الصامت وحفظ حقوق الطرفين.
                      </p>
                    </div>
                  </div>
                )}

                {/* 7-Point Requirements Grid */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="text-xs font-black text-slate-800 flex items-center justify-between border-b border-slate-200 pb-2">
                    <span>قائمة متطلبات الإتمام القانونية لنوع المعاملة ({isSale ? 'بيع عقاري' : 'إيجار'}):</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {Object.values(readinessData.checklist || {}).filter(Boolean).length} / 7 مستوفى
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      readinessData.checklist?.contractExists
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}>
                      {readinessData.checklist?.contractExists ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <X className="w-4 h-4 text-rose-500 shrink-0" />}
                      <span className="font-bold">تحرير مسودة العقد الرسمي</span>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      readinessData.checklist?.bothPartiesApprovedLatestVersion
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}>
                      {readinessData.checklist?.bothPartiesApprovedLatestVersion ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <X className="w-4 h-4 text-rose-500 shrink-0" />}
                      <span className="font-bold">اعتماد الطرفين للنسخة الأخيرة v{readinessData.details?.currentVersion || 1}</span>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      readinessData.checklist?.bothPartiesLegallySigned
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}>
                      {readinessData.checklist?.bothPartiesLegallySigned ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <X className="w-4 h-4 text-rose-500 shrink-0" />}
                      <span className="font-bold">توقيع الطرفين وتوثيق الهويات الشخصية</span>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      readinessData.checklist?.inspectionVerified
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}>
                      {readinessData.checklist?.inspectionVerified ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                      <span className="font-bold">{isSale ? 'فحص صك البصيرة والمعاينة الميدانية' : 'المعاينة ومطابقة المواصفات'}</span>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      readinessData.checklist?.financialSettled
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}>
                      {readinessData.checklist?.financialSettled ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <X className="w-4 h-4 text-rose-500 shrink-0" />}
                      <span className="font-bold">اعتماد جدول السداد والمبلغ المتفق عليه</span>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      readinessData.checklist?.deedOrKeyHandedOver
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}>
                      {readinessData.checklist?.deedOrKeyHandedOver ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                      <span className="font-bold">تحديد موعد تسليم العقار / الإفراغ</span>
                    </div>

                    <div className={`p-2.5 rounded-xl border sm:col-span-2 flex items-center gap-2 ${
                      readinessData.checklist?.notaryAttested
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      {readinessData.checklist?.notaryAttested ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <Clock className="w-4 h-4 text-slate-400 shrink-0" />}
                      <span className="font-bold">التوثيق لدى الأمين الشرعي / رقم الصك والسجل</span>
                    </div>
                  </div>

                  {/* List of Unmet Requirements with action shortcut */}
                  {readinessData.unmetRequirements && readinessData.unmetRequirements.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="text-[11px] font-bold text-rose-800">النواقص الملزمة التي تمنع الإتمام:</div>
                      <div className="space-y-1.5">
                        {readinessData.unmetRequirements.map((unmet: any) => (
                          <div key={unmet.id} className="p-2 rounded-xl bg-white border border-rose-200 text-[11px] flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-rose-900 block">{unmet.title}</span>
                              <span className="text-slate-600 text-[10px] leading-relaxed">{unmet.description}</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[9px] shrink-0">
                              {unmet.severity === 'blocking' ? 'إلزامي مانع' : 'تنبيه'}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-slate-500">لاستكمال اعتمادات وتوقيعات العقد:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCompleteDealModal(false);
                            if (hasContract) {
                              setShowContractDocumentModal(true);
                            } else {
                              setActiveTab('contract');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#16324F] hover:bg-[#0f2438] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#12A889]" />
                          <span>فتح وثيقة العقد للاعتماد والتوقيع</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Force override option for System Admin */}
                {isSysAdmin && !readinessData.isReady && (
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-950 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="adminForceOverride"
                      checked={completeForceOverride}
                      onChange={e => setCompleteForceOverride(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                    <label htmlFor="adminForceOverride" className="font-bold cursor-pointer">
                      تجاوز إداري استثنائي (صلاحيات مدير النظام): أؤكد التحقق الورقي اليدوي من اكتمال التوقيعات الشرعية والصك وسداد الثمن.
                    </label>
                  </div>
                )}
              </div>
            ) : null}

            {/* Completion Inputs */}
            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#12A889]" />
                <span>بيانات محضر التوثيق الشرعي ومستندات الإغلاق النهائي:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    رقم صك البصيرة الشرعية / قيد التوثيق لدى الأمين:
                  </label>
                  <input
                    type="text"
                    value={completeNotaryRef}
                    onChange={e => setCompleteNotaryRef(e.target.value)}
                    placeholder="مثال: مقيد بسجل توثيق محكمة بني الحارث برقم 1042/2026"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    رقم سند الاستيفاء المالي / الشيك المصرفي:
                  </label>
                  <input
                    type="text"
                    value={completeReceiptRef}
                    onChange={e => setCompleteReceiptRef(e.target.value)}
                    placeholder="مثال: شيك مصرفي مصدق رقم 009412 - بنك اليمن الدولي"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ تسليم العقار / الإفراغ الفعلي:</label>
                  <input
                    type="text"
                    value={completeHandoverDate}
                    onChange={e => setCompleteHandoverDate(e.target.value)}
                    placeholder="مثال: تم تسليم المفتاح بتاريخ اليوم 2026-10-21"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ملاحظات الإتمام وسجل المعاملة:</label>
                  <input
                    type="text"
                    value={completeNotes}
                    onChange={e => setCompleteNotes(e.target.value)}
                    placeholder="تم استيفاء الثمن بالكامل وإفراغ العين دون موانع..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Permanent status notice */}
            <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <p className="font-black text-emerald-900">الآثار القانونية والنظامية للإغلاق النهائي:</p>
              <ul className="list-disc list-inside space-y-0.5 text-emerald-800 text-[11px] pr-1">
                <li>نقل حالة العقار والإعلان بصورة دائمة إلى ({isSale ? 'مباع' : 'مؤجر'}) وإغلاقه من البحث.</li>
                <li>منع إعادة العقار المباع أو المؤجر إلى قوائم التوفر تلقائياً تحت أي ظرف لحماية السوق.</li>
                <li>توليد شهادة إتمام المعاملة وأرشفة العقد وسجل الإجراءات للرجوع إليها مستقبلاً.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCompleteDealModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmCompleteDeal}
                disabled={isCompleting || (!readinessData?.isReady && !(isSysAdmin && completeForceOverride))}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
              >
                {isCompleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري التوثيق والإتمام...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>تأكيد إتمام المعاملة وإغلاق الإعلان نهائياً</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAIL DEAL MODAL (Requirement 10) */}
      {showFailModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-slate-900 text-base">تسجيل تعذر إتمام المعاملة العقارية</h3>
              </div>
              <button onClick={() => setShowFailModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              يُستخدم هذا الإجراء عند ثبوت تعذر استكمال الصفقة لسبب مشروع (كظهور عيب في صك البصيرة، أو تعثر التمويل، أو مانع قانوني)، وسيتم توثيق التعذر في سجل التدقيق وفك القفل.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">تصنيف سبب التعذر: <span className="text-rose-500">*</span></label>
                <select
                  value={failCategory}
                  onChange={e => setFailCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:border-rose-500 outline-none cursor-pointer"
                >
                  <option value="deed_flaw">عدم سلامة صك الملكية / البصيرة الشرعية أو نزاع ملكية</option>
                  <option value="financial_default">تعذر التمويل أو عجز عن سداد الثمن المتفق عليه</option>
                  <option value="inspection_defect">عيوب جوهرية في المعاينة الميدانية أو عدم مطابقة الوصف</option>
                  <option value="legal_impediment">مانع قانوني أو قضائي أو عدم موافقة الورثة/الشركاء</option>
                  <option value="other">أسباب تعذر أخرى</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">تفاصيل ومبررات التعذر: <span className="text-rose-500">*</span></label>
                <textarea
                  value={failReason}
                  onChange={e => setFailReason(e.target.value)}
                  placeholder="بيان أسباب عدم إمكانية إتمام الصفقة، مستندات الفحص، وما تم الاتفاق عليه..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-rose-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFailModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmFailDeal}
                disabled={isFailing || !failReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isFailing ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                <span>تأكيد تسجيل التعذر وفك الحجز</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPUTE DEAL MODAL (Requirement 10) */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-base">تسجيل نزاع عقاري وتجميد المعاملة</h3>
              </div>
              <button onClick={() => setShowDisputeModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 text-amber-950 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>إجراء تحفظي وتجميد رسمي</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                سيؤدي تسجيل النزاع إلى قفل العقار في حالة نزاع قانوني وتجميد الإجراءات فوراً مع الاحتفاظ بكافة مسودات العقود، سجلات التدقيق، وسجل المحادثات لإحالتها للجنة التحكيم العقاري والجهات المختصة.
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">
                شرح وقائع النزاع وتفاصيل الخلاف: <span className="text-amber-600">*</span>
              </label>
              <textarea
                value={disputeReasonInput}
                onChange={e => setDisputeReasonInput(e.target.value)}
                placeholder="تفاصيل الإخلال بالاتفاق، التراجع غير المبرر، أو الخلاف على صحة الوثائق أو السعر..."
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-amber-500 outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmDisputeDeal}
                disabled={isDisputing || !disputeReasonInput.trim()}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isDisputing ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                <span>تأكيد تسجيل النزاع وتجميد الإجراءات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CANCEL BOOKING MODAL (Requirement 10) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-slate-900 text-base">إلغاء الحجز والعملية</h3>
              </div>
              <button onClick={() => setShowCancelModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              سيؤدي إلغاء الحجز إلى فك القفل الحصري فوراً وإعادة إتاحة العقار في البحث وقوائم العرض العامة لجميع الباحثين.
            </p>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">سبب الإلغاء (إلزامي):</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="عدم الاتفاق على السعر، تعذر مطابقة الوثائق، أو رغبة أحد الطرفين..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-[#12A889] outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelBooking}
                disabled={isCancelling || !cancelReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                {isCancelling ? 'جاري الإلغاء...' : 'تأكيد إلغاء الحجز'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CONTRACT DOCUMENT & PRINT MODAL */}
      {showContractDocumentModal && (
        <ContractDocumentModal
          bookingId={booking?.id}
          contractId={currentContract?.id || booking?.contractId}
          isOpen={showContractDocumentModal}
          onClose={() => {
            setShowContractDocumentModal(false);
            loadData();
          }}
          onSelectListing={onSelectListing}
        />
      )}
    </div>
  );
};
