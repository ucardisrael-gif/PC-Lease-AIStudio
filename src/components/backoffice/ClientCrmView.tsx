import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  FileCheck2,
  Send,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Percent,
  Sliders,
  DollarSign,
  Package,
  QrCode,
  ShieldCheck,
  Tag,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { AcquisitionMode, Language, LaptopProduct, QuoteRequest, QuoteStatus, Theme } from '../../types';
import { LeaseContract, PhysicalAsset } from '../../domain/schema';

interface ClientCrmViewProps {
  lang: Language;
  theme: Theme;
  quotes: QuoteRequest[];
  products: LaptopProduct[];
  assets: PhysicalAsset[];
  contracts: LeaseContract[];
  onUpdateQuotes: (quotes: QuoteRequest[]) => void;
  onUpdateContracts: (contracts: LeaseContract[]) => void;
  onUpdateAssets: (assets: PhysicalAsset[]) => void;
  onNavigateToContractsTab?: () => void;
  onShowToast: (msg: string) => void;
}

export const ClientCrmView: React.FC<ClientCrmViewProps> = ({
  lang,
  theme,
  quotes,
  products,
  assets,
  contracts,
  onUpdateQuotes,
  onUpdateContracts,
  onUpdateAssets,
  onNavigateToContractsTab,
  onShowToast,
}) => {
  const isRtl = lang === 'he';
  const isDark = theme === 'dark';

  // Filters state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isManualQuoteOpen, setIsManualQuoteOpen] = useState(false);
  const [rejectingQuote, setRejectingQuote] = useState<QuoteRequest | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [allocatingQuote, setAllocatingQuote] = useState<QuoteRequest | null>(null);
  const [editingTermsQuote, setEditingTermsQuote] = useState<QuoteRequest | null>(null);
  const [discountPercentInput, setDiscountPercentInput] = useState<number>(0);
  const [customRateInput, setCustomRateInput] = useState<number>(0);

  // Manual Quote Form state
  const [manualCompany, setManualCompany] = useState('');
  const [manualTaxId, setManualTaxId] = useState('');
  const [manualContact, setManualContact] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualCity, setManualCity] = useState('תל אביב');
  const [manualProductSlug, setManualProductSlug] = useState(products[0]?.slug || 'thinkpad-x1-carbon-gen9');
  const [manualMode, setManualMode] = useState<AcquisitionMode>('lease');
  const [manualQty, setManualQty] = useState(5);
  const [manualRentalDays, setManualRentalDays] = useState(30);
  const [manualNotes, setManualNotes] = useState('');

  // Normalize status for filtering
  const normalizeStatus = (status: QuoteStatus): 'pending' | 'approved' | 'rejected' => {
    if (status === 'approved') return 'approved';
    if (status === 'rejected') return 'rejected';
    return 'pending';
  };

  // Filtered quotes
  const filteredQuotes = quotes.filter((q) => {
    const norm = normalizeStatus(q.status);
    if (statusFilter !== 'all' && norm !== statusFilter) return false;
    if (modeFilter !== 'all' && q.mode !== modeFilter) return false;
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      const matchCompany = q.companyName.toLowerCase().includes(qLower);
      const matchContact = q.contactName.toLowerCase().includes(qLower);
      const matchEmail = q.email.toLowerCase().includes(qLower);
      const matchPhone = q.phone.includes(searchQuery);
      const matchId = q.id.toLowerCase().includes(qLower);
      const matchTax = q.taxId ? q.taxId.includes(searchQuery) : false;
      return matchCompany || matchContact || matchEmail || matchPhone || matchId || matchTax;
    }
    return true;
  });

  // KPI Metrics
  const totalInquiries = quotes.length;
  const pendingCount = quotes.filter((q) => normalizeStatus(q.status) === 'pending').length;
  const approvedCount = quotes.filter((q) => normalizeStatus(q.status) === 'approved').length;
  const rejectedCount = quotes.filter((q) => normalizeStatus(q.status) === 'rejected').length;

  const pipelineMRR = quotes
    .filter((q) => q.mode === 'lease' && normalizeStatus(q.status) !== 'rejected')
    .reduce((sum, q) => sum + (q.customMonthlyRateILS || q.totalMonthly), 0);

  // Quick Action: Approve Quote
  const handleApproveQuote = (quote: QuoteRequest) => {
    const updated = quotes.map((q) =>
      q.id === quote.id ? { ...q, status: 'approved' as QuoteStatus } : q
    );
    onUpdateQuotes(updated);
    onShowToast(
      isRtl
        ? `פנייה ${quote.id} עבור ${quote.companyName} אושרה בהצלחה!`
        : `Quote ${quote.id} for ${quote.companyName} was approved!`
    );
  };

  // Quick Action: Generate Lease Contract
  const handleGenerateContract = (quote: QuoteRequest) => {
    // Generate new unique contract ID
    const nextNum = contracts.length + 82;
    const contractId = `cnt-${String(nextNum).padStart(3, '0')}`;
    const contractNumber = `CNT-2026-${String(nextNum).padStart(3, '0')}`;
    const orderId = quote.orderId || `ord-${Math.floor(1000 + Math.random() * 9000)}`;

    const monthlyBeforeVat = quote.customMonthlyRateILS || quote.totalMonthly;
    const vatRate = 17;
    const monthlyTotal = Math.round(monthlyBeforeVat * 1.17 * 100) / 100;
    const buyoutPerUnit = 250;
    const totalBuyout = buyoutPerUnit * quote.quantity;

    const newContract: LeaseContract = {
      id: contractId,
      contractNumber,
      orderId,
      organizationName: quote.companyName,
      taxId: quote.taxId || '51-584920-1',
      signatoryName: quote.contactName,
      signatoryEmail: quote.email,
      signatoryPhone: quote.phone,
      state: 'draft',
      termMonths: 36,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      pricingSnapshot: {
        monthlyRateBeforeVatILS: monthlyBeforeVat,
        vatRatePercent: vatRate,
        monthlyRateTotalILS: monthlyTotal,
        buyoutOptionPriceILS: totalBuyout,
        earlyTerminationTerms: 'דמי יציאה מופחתים בהתראה של 60 יום מראש לפי סעיף 10 ב-ТЗ',
      },
      assignedSerialNumbers: quote.assignedSerialNumbers || [],
      slaPackage: 'business_standard',
    };

    onUpdateContracts([newContract, ...contracts]);

    // Update quote with contract link and approved status
    const updated = quotes.map((q) =>
      q.id === quote.id
        ? {
            ...q,
            status: 'approved' as QuoteStatus,
            contractId,
            orderId,
          }
        : q
    );
    onUpdateQuotes(updated);

    onShowToast(
      isRtl
        ? `חוזה ליסינג ${contractNumber} הופק בהצלחה עם Pricing Snapshot קבוע!`
        : `Lease Contract ${contractNumber} successfully drafted with locked Pricing Snapshot!`
    );
  };

  // Quick Action: Send OTP Signature Request
  const handleSendOtpSignature = (quote: QuoteRequest) => {
    let linkedContract = contracts.find((c) => c.id === quote.contractId);

    if (!linkedContract) {
      // Auto-generate contract first
      handleGenerateContract(quote);
      return;
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const nowIso = new Date().toISOString();

    // Move contract state to awaiting_signature
    const updatedContracts = contracts.map((c) =>
      c.id === linkedContract.id ? { ...c, state: 'awaiting_signature' as const } : c
    );
    onUpdateContracts(updatedContracts);

    // Update quote record
    const updatedQuotes = quotes.map((q) =>
      q.id === quote.id
        ? {
            ...q,
            otpSentAt: nowIso,
            otpCode,
          }
        : q
    );
    onUpdateQuotes(updatedQuotes);

    onShowToast(
      isRtl
        ? `קישור חתימה ב-OTP נשלח ל-${quote.phone} (${quote.contactName})! קוד אימות: ${otpCode}`
        : `OTP e-sign link dispatched to ${quote.phone}! Verification code: ${otpCode}`
    );
  };

  // Quick Action: Confirm Rejection with Reason
  const handleConfirmRejection = () => {
    if (!rejectingQuote) return;
    const reason = rejectionReasonText.trim() || 'סירוב עקב מדיניות אשראי או חוסר התאמת מלאי';

    const updated = quotes.map((q) =>
      q.id === rejectingQuote.id
        ? {
            ...q,
            status: 'rejected' as QuoteStatus,
            rejectionReason: reason,
          }
        : q
    );
    onUpdateQuotes(updated);
    setRejectingQuote(null);
    setRejectionReasonText('');
    onShowToast(
      isRtl
        ? `פנייה ${rejectingQuote.id} עודכנה כנדחית.`
        : `Quote ${rejectingQuote.id} was rejected.`
    );
  };

  // Quick Action: Allocate Hardware Assets
  const handleAllocateSerialToQuote = (assetId: string) => {
    if (!allocatingQuote) return;
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    // Update asset to reserved
    const updatedAssets = assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            status: 'reserved' as const,
            currentAssignment: {
              orderId: allocatingQuote.orderId || `ord-${allocatingQuote.id}`,
              contractId: allocatingQuote.contractId,
              customerOrganizationName: allocatingQuote.companyName,
              customerTaxId: allocatingQuote.taxId || '51-000000-0',
              assignedAt: new Date().toISOString().split('T')[0],
              handoverActSigned: false,
            },
          }
        : a
    );
    onUpdateAssets(updatedAssets);

    // Update quote assigned serials
    const currentSerials = allocatingQuote.assignedSerialNumbers || [];
    const newSerials = currentSerials.includes(asset.serialNumber)
      ? currentSerials
      : [...currentSerials, asset.serialNumber];

    const updatedQuotes = quotes.map((q) =>
      q.id === allocatingQuote.id ? { ...q, assignedSerialNumbers: newSerials } : q
    );
    onUpdateQuotes(updatedQuotes);

    // If there is a linked contract, update its assigned serials too
    if (allocatingQuote.contractId) {
      const updatedContracts = contracts.map((c) =>
        c.id === allocatingQuote.contractId
          ? {
              ...c,
              assignedSerialNumbers: newSerials,
            }
          : c
      );
      onUpdateContracts(updatedContracts);
    }

    setAllocatingQuote({ ...allocatingQuote, assignedSerialNumbers: newSerials });
    onShowToast(
      isRtl
        ? `מחשב מס' סידורי ${asset.serialNumber} שוריין בהצלחה לחוזה!`
        : `Asset SN ${asset.serialNumber} reserved for this contract!`
    );
  };

  // Quick Action: Save Term Adjustments / Discount
  const handleSaveTermsAdjustment = () => {
    if (!editingTermsQuote) return;

    const discount = Math.max(0, Math.min(50, discountPercentInput));
    let adjustedMonthly = customRateInput > 0 ? customRateInput : editingTermsQuote.totalMonthly;
    if (discount > 0 && customRateInput <= 0) {
      adjustedMonthly = Math.round(editingTermsQuote.totalMonthly * (1 - discount / 100));
    }

    const updated = quotes.map((q) =>
      q.id === editingTermsQuote.id
        ? {
            ...q,
            approvedDiscountPercent: discount,
            customMonthlyRateILS: adjustedMonthly,
          }
        : q
    );
    onUpdateQuotes(updated);
    setEditingTermsQuote(null);
    onShowToast(
      isRtl
        ? `תנאי העסקה עודכנו: ₪${adjustedMonthly}/חודש (${discount}% הנחה)`
        : `Terms adjusted: ₪${adjustedMonthly}/mo (${discount}% discount)`
    );
  };

  // Create Manual Quote
  const handleCreateManualQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCompany.trim() || !manualContact.trim() || !manualPhone.trim()) {
      return;
    }

    const selProduct = products.find((p) => p.slug === manualProductSlug) || products[0];
    const unitLeaseMonthly = selProduct.leasePriceMonthly;
    const unitPurchase = selProduct.purchasePrice;

    // Rental cost formula
    const rentalPerDay = manualRentalDays <= 6 ? 35 : manualRentalDays <= 29 ? 18 : Math.round(149 / 30);
    const unitRentalTotal = rentalPerDay * manualRentalDays;

    const totalMonthly =
      manualMode === 'lease'
        ? unitLeaseMonthly * manualQty
        : manualMode === 'short_rental'
        ? unitRentalTotal * manualQty
        : 0;

    const totalOneTime = manualMode === 'purchase' ? unitPurchase * manualQty : 0;

    const newQuote: QuoteRequest = {
      id: `PCL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      productSlug: selProduct.slug,
      productTitle: `${selProduct.manufacturer} ${selProduct.model}`,
      mode: manualMode,
      quantity: manualQty,
      rentalDays: manualMode === 'short_rental' ? manualRentalDays : undefined,
      monthlyPerUnit: manualMode === 'lease' ? unitLeaseMonthly : unitRentalTotal,
      totalMonthly,
      oneTimePerUnit: unitPurchase,
      totalOneTime,
      companyName: manualCompany.trim(),
      taxId: manualTaxId.trim() || undefined,
      contactName: manualContact.trim(),
      email: manualEmail.trim(),
      phone: manualPhone.trim(),
      city: manualCity.trim(),
      notes: manualNotes.trim() || undefined,
      status: 'pending',
    };

    onUpdateQuotes([newQuote, ...quotes]);
    setIsManualQuoteOpen(false);

    // Reset fields
    setManualCompany('');
    setManualTaxId('');
    setManualContact('');
    setManualEmail('');
    setManualPhone('');
    setManualNotes('');

    onShowToast(
      isRtl
        ? `הצעת מחיר ${newQuote.id} נוצרה ונרשמה ב-CRM!`
        : `Quote ${newQuote.id} created and logged into CRM!`
    );
  };

  // Available physical assets for allocation dialog
  const availableAssets = assets.filter((a) => a.status === 'available');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
            <Building className="w-4 h-4" />
            <span>{isRtl ? 'מערכת CRM וניהול פניות (ТЗ סעיף 7)' : 'B2B Client CRM & Proposals (ТЗ Sec 7)'}</span>
          </div>
          <h1 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
            {isRtl ? 'דשבורד פניות, לידים וחוזים' : 'Inbound Inquiries & Lease CRM'}
          </h1>
          <p className="text-sm mt-0.5 text-slate-600 dark:text-slate-400">
            {isRtl
              ? 'צפייה בפניות מהאתר ובקשות טלפוניות, מעקב סטטוס (ממתין, מאושר, נדחה), הפקת חוזי ליסינג 36 חודשים ואימות OTP.'
              : 'Live tracking of inbound quote inquiries, status pipeline, 36-month lease contract generation, and OTP e-signature workflow.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsManualQuoteOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isRtl ? 'הצעת מחיר חדשה' : 'New Manual Quote'}</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Quotes */}
        <div className="p-4 rounded-xl border transition-colors bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isRtl ? 'סך הכל פניות ב-CRM' : 'Total Inquiries'}
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono mt-1 text-slate-900 dark:text-white">
            {totalInquiries}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isRtl ? 'כולל פניות אתר ורכש ישיר' : 'Site configurator & direct sales'}
          </div>
        </div>

        {/* Pending Quotes */}
        <div className="p-4 rounded-xl border transition-colors bg-white dark:bg-slate-950 border-amber-200 dark:border-amber-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {isRtl ? 'ממתינות לבדיקה (Pending)' : 'Pending Review'}
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">
            {pendingCount}
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-300/80 mt-1">
            {isRtl ? 'דורשות אישור מנהל או מענה' : 'Awaiting manager approval'}
          </div>
        </div>

        {/* Pipeline MRR */}
        <div className="p-4 rounded-xl border transition-colors bg-white dark:bg-slate-950 border-emerald-200 dark:border-emerald-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {isRtl ? 'צבר ליסינג מאושר (MRR)' : 'Approved Pipeline MRR'}
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            ₪{pipelineMRR.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600/80 dark:text-emerald-300/80 mt-1">
            {isRtl ? 'פוטנציאל הכנסה חודשית' : 'Monthly recurring potential'}
          </div>
        </div>

        {/* Approval Conversion */}
        <div className="p-4 rounded-xl border transition-colors bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isRtl ? 'שיעור המרה וסגירה' : 'Approval Conversion'}
            </span>
            <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono mt-1 text-slate-900 dark:text-white">
            {totalInquiries > 0 ? Math.round((approvedCount / totalInquiries) * 100) : 0}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isRtl
              ? `${approvedCount} מאושרות / ${rejectedCount} נדחו`
              : `${approvedCount} approved / ${rejectedCount} rejected`}
          </div>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="p-3 sm:p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isRtl ? 'כל הפניות' : 'All Quotes'} ({quotes.length})
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isRtl ? 'ממתינות (Pending)' : 'Pending'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20">
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isRtl ? 'מאושרות (Approved)' : 'Approved'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20">
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('rejected')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>{isRtl ? 'נדחו (Rejected)' : 'Rejected'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20">
              {rejectedCount}
            </span>
          </button>
        </div>

        {/* Search & Mode dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">{isRtl ? 'כל המסלולים' : 'All Modes'}</option>
            <option value="lease">{isRtl ? 'ליסינג 36 חודש' : '36m Lease'}</option>
            <option value="short_rental">{isRtl ? 'השכרה קצרה' : 'Short Rental'}</option>
            <option value="purchase">{isRtl ? 'רכישה מלאה' : 'Direct Purchase'}</option>
          </select>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute top-2.5 start-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'חיפוש חברה, איש קשר, טלפון, מזהה...' : 'Search company, contact, ID...'}
              className="w-full ps-8 pe-3 py-1.5 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 4. Quotes Pipeline Grid / Table */}
      {filteredQuotes.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40">
          <Building className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {isRtl ? 'לא נמצאו פניות התואמות לסינון' : 'No quotes match current filter'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isRtl ? 'נסה להסיר מילות חיפוש או לבחור בלשונית אחרת.' : 'Try adjusting search query or status filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredQuotes.map((quote) => {
            const normStatus = normalizeStatus(quote.status);
            const linkedContract = contracts.find((c) => c.id === quote.contractId);
            const monthlyBeforeVat = quote.customMonthlyRateILS || quote.totalMonthly;
            const monthlyWithVat = Math.round(monthlyBeforeVat * 1.17 * 100) / 100;
            const isAssigned = (quote.assignedSerialNumbers || []).length > 0;

            return (
              <div
                key={quote.id}
                className="p-5 rounded-xl border transition-all bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 space-y-4"
              >
                {/* Header row: ID, Mode, Date, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                      {quote.id}
                    </span>

                    {/* Mode Badge */}
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {quote.mode === 'lease'
                        ? isRtl
                          ? 'ליסינג 36 חודש'
                          : '36-Mo Lease'
                        : quote.mode === 'short_rental'
                        ? `${isRtl ? 'השכרה' : 'Rental'} (${quote.rentalDays || 30} ${isRtl ? 'יום' : 'days'})`
                        : isRtl
                        ? 'רכישה ישירה'
                        : 'Outright Sale'}
                    </span>

                    {/* Status Badge */}
                    {normStatus === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                        <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                        <span>{isRtl ? 'ממתין לבדיקה (Pending)' : 'Pending'}</span>
                      </span>
                    )}

                    {normStatus === 'approved' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{isRtl ? 'אושר (Approved)' : 'Approved'}</span>
                      </span>
                    )}

                    {normStatus === 'rejected' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                        <XCircle className="w-3 h-3 text-rose-500" />
                        <span>{isRtl ? 'נדחה (Rejected)' : 'Rejected'}</span>
                      </span>
                    )}

                    {/* Linked Contract pill if exists */}
                    {linkedContract && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50">
                        <FileCheck2 className="w-3 h-3 text-violet-500" />
                        <span>
                          {linkedContract.contractNumber} ({linkedContract.state.toUpperCase()})
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(quote.createdAt).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US')}</span>
                  </div>
                </div>

                {/* Main Details Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Col 1: Customer Organization */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {isRtl ? 'פרטי הלקוח והארגון' : 'Customer & Org'}
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span>{quote.companyName}</span>
                    </div>
                    {quote.taxId && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {isRtl ? 'ח.פ / ע.מ:' : 'Tax ID:'} {quote.taxId}
                      </div>
                    )}
                    <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{quote.contactName}</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`tel:${quote.phone}`} className="hover:underline text-blue-600 dark:text-blue-400">
                        {quote.phone}
                      </a>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`mailto:${quote.email}`} className="hover:underline text-blue-600 dark:text-blue-400">
                        {quote.email}
                      </a>
                    </div>
                    {quote.city && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{quote.city}</span>
                      </div>
                    )}
                  </div>

                  {/* Col 2: Requested Hardware */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {isRtl ? 'מפרט וכמות חומרה' : 'Hardware & Fleet'}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {quote.productTitle}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold font-mono">
                        {quote.quantity} {isRtl ? 'יחידות' : 'Units'}
                      </span>
                      {quote.mode === 'lease' && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          36 {isRtl ? 'חודשים קבוע' : 'months fixed'}
                        </span>
                      )}
                    </div>

                    {/* Allocated Serials display */}
                    <div className="pt-1">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        {isRtl ? 'סריאלים משוריינים מהמחסן:' : 'Reserved Hardware Serials:'}
                      </div>
                      {quote.assignedSerialNumbers && quote.assignedSerialNumbers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {quote.assignedSerialNumbers.map((sn) => (
                            <span
                              key={sn}
                              className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono font-bold"
                            >
                              {sn}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          {isRtl ? 'טרם הוקצו מספרים סידוריים' : 'No serials allocated yet'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Col 3: Financial Pricing Snapshot */}
                  <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {isRtl ? 'תמחור וערך עסקה (ILS)' : 'Pricing & TCV (ILS)'}
                    </div>

                    {quote.mode === 'lease' ? (
                      <>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {isRtl ? 'תשלום חודשי (לפני מע״מ):' : 'Monthly (excl. VAT):'}
                          </span>
                          <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                            ₪{monthlyBeforeVat.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">
                            {isRtl ? 'סה״כ חודשי (כולל מע״מ 17%):' : 'Monthly (incl. 17% VAT):'}
                          </span>
                          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            ₪{monthlyWithVat.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400">
                            {isRtl ? 'ערך חוזה מלא (36 חודש TCV):' : '36-Mo TCV:'}
                          </span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                            ₪{(monthlyBeforeVat * 36).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">
                            {isRtl ? 'אופציית выкуп בתום התקופה:' : 'Buyout option at 36m:'}
                          </span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            ₪{(250 * quote.quantity).toLocaleString()}
                          </span>
                        </div>
                      </>
                    ) : quote.mode === 'short_rental' ? (
                      <>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {isRtl ? 'עלות השכרה כוללת:' : 'Rental Total:'}
                          </span>
                          <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                            ₪{quote.totalMonthly.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {quote.rentalDays || 30} {isRtl ? 'ימי השכרה' : 'days rental'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {isRtl ? 'מחיר מכירה (לפני מע״מ):' : 'Sale Price (excl. VAT):'}
                          </span>
                          <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                            ₪{quote.totalOneTime.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}

                    {quote.approvedDiscountPercent && quote.approvedDiscountPercent > 0 ? (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>
                          {quote.approvedDiscountPercent}% {isRtl ? 'הנחה מאושרת הופעלה' : 'discount applied'}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Notes or Rejection Reason box */}
                {quote.notes && (
                  <div className="p-2.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-slate-200">
                      {isRtl ? 'הערות הלקוח / מנהל: ' : 'Customer Notes: '}
                    </span>
                    {quote.notes}
                  </div>
                )}

                {quote.rejectionReason && (
                  <div className="p-2.5 rounded-lg text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{isRtl ? 'סיבת דחיית הפנייה: ' : 'Rejection Reason: '}</span>
                      <span>{quote.rejectionReason}</span>
                    </div>
                  </div>
                )}

                {/* OTP Dispatch audit info */}
                {quote.otpSentAt && (
                  <div className="p-2 rounded-lg text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-blue-500" />
                      <span>
                        {isRtl ? 'נשלח SMS עם קוד OTP לחתימה ב:' : 'OTP e-sign SMS sent at:'}{' '}
                        {new Date(quote.otpSentAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {quote.otpCode && (
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 text-xs">
                        OTP: {quote.otpCode}
                      </span>
                    )}
                  </div>
                )}

                {/* 5. Quick Actions Toolbar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Approve Action */}
                    {normStatus === 'pending' && (
                      <button
                        onClick={() => handleApproveQuote(quote)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'אשר פנייה' : 'Approve Quote'}</span>
                      </button>
                    )}

                    {/* Generate Contract Action */}
                    {quote.mode === 'lease' && !quote.contractId && (
                      <button
                        onClick={() => handleGenerateContract(quote)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'הפק חוזה ליסינג' : 'Generate Lease Contract'}</span>
                      </button>
                    )}

                    {/* Send OTP Signature Request */}
                    {quote.contractId && (
                      <button
                        onClick={() => handleSendOtpSignature(quote)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'שלח חתימה ב-OTP' : 'Send OTP E-Sign'}</span>
                      </button>
                    )}

                    {/* Allocate Assets */}
                    <button
                      onClick={() => setAllocatingQuote(quote)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isRtl ? 'הקצה חומרה מהמחסן' : 'Allocate Hardware'}</span>
                    </button>

                    {/* Edit Terms / Discount */}
                    <button
                      onClick={() => {
                        setEditingTermsQuote(quote);
                        setDiscountPercentInput(quote.approvedDiscountPercent || 0);
                        setCustomRateInput(quote.customMonthlyRateILS || quote.totalMonthly);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-blue-500" />
                      <span>{isRtl ? 'תנאים / הנחה' : 'Terms & Discount'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* If contract exists, navigate to it */}
                    {quote.contractId && onNavigateToContractsTab && (
                      <button
                        onClick={onNavigateToContractsTab}
                        className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isRtl ? 'צפה בחוזה במאגר החוזים' : 'View in Contracts Registry'}</span>
                        {isRtl ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                      </button>
                    )}

                    {/* Reject Action */}
                    {normStatus !== 'rejected' && (
                      <button
                        onClick={() => {
                          setRejectingQuote(quote);
                          setRejectionReasonText('');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800/40 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'דחה פנייה' : 'Reject'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Create Manual Quote */}
      {isManualQuoteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-xl rounded-2xl border p-6 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold">
                  {isRtl ? 'הזנת הצעת מחיר ידנית / פנייה טלפונית' : 'New Manual Quote / Phone Lead'}
                </h3>
              </div>
              <button
                onClick={() => setIsManualQuoteOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualQuoteSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'שם חברה / ארגון *' : 'Company Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    placeholder="לדוגמה: אקמי טכנולוגיות בע״מ"
                    className="w-full px-3 py-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'מספר ח.פ / ע.מ' : 'Tax ID (ח.פ)'}
                  </label>
                  <input
                    type="text"
                    value={manualTaxId}
                    onChange={(e) => setManualTaxId(e.target.value)}
                    placeholder="51-XXXXXX-X"
                    className="w-full px-3 py-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'שם איש קשר *' : 'Contact Person *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={manualContact}
                    onChange={(e) => setManualContact(e.target.value)}
                    placeholder="ישראל ישראלי"
                    className="w-full px-3 py-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'טלפון להתקשרות *' : 'Phone *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="050-1234567"
                    className="w-full px-3 py-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'אימייל לקבלת חוזה' : 'Email'}
                  </label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="contact@company.co.il"
                    className="w-full px-3 py-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'עיר אספקה' : 'Delivery City'}
                  </label>
                  <input
                    type="text"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    placeholder="תל אביב"
                    className="w-full px-3 py-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Hardware & Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'דגם מחשב' : 'Hardware Model'}
                  </label>
                  <select
                    value={manualProductSlug}
                    onChange={(e) => setManualProductSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
                  >
                    {products.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.manufacturer} {p.model} (₪{p.leasePriceMonthly}/חודש)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'כמות יחידות' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={manualQty}
                    onChange={(e) => setManualQty(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'מסלול עסקה' : 'Acquisition Plan'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualMode('lease')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      manualMode === 'lease'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isRtl ? 'ליסינג 36 חודש' : '36m Lease'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualMode('short_rental')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      manualMode === 'short_rental'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isRtl ? 'השכרה קצרה' : 'Short Rental'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualMode('purchase')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      manualMode === 'purchase'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isRtl ? 'רכישה מלאה' : 'Purchase'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'הערות מיוחדות / בקשות הלקוח' : 'Special Notes'}
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder={isRtl ? 'דרישות מיוחדות, תנאי תשלום, שדרוגי זיכרון...' : 'Any special terms...'}
                  className="w-full px-3 py-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualQuoteOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {isRtl ? 'ביטול' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer"
                >
                  {isRtl ? 'צור הצעת מחיר' : 'Save & Log Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Reject Quote with Reason */}
      {rejectingQuote && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-2xl border p-5 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold">
                {isRtl ? 'דחיית פנייה / הצעת מחיר' : 'Reject Proposal'}
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {isRtl
                ? `בחר או פרט את הסיבה לדחיית הפנייה של ${rejectingQuote.companyName} (${rejectingQuote.id}):`
                : `Specify rejection rationale for ${rejectingQuote.companyName} (${rejectingQuote.id}):`}
            </p>

            {/* Quick Reason Presets */}
            <div className="space-y-1.5">
              {[
                'בדיקת BDI שלילית - סיכון אשראי גבוה ללא ערבות אישית',
                'הלקוח ביטל / בחר ספק אחר',
                'מלאי דגם זה אזל זמנית / מפרט לא זמין',
                'דרישת מחיר נמוכה מרף הרווחיות המינימלי',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRejectionReasonText(preset)}
                  className="w-full text-start p-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={rejectionReasonText}
              onChange={(e) => setRejectionReasonText(e.target.value)}
              placeholder={isRtl ? 'הקלד סיבה מפורטת לדחייה...' : 'Custom rejection reason...'}
              className="w-full px-3 py-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingQuote(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {isRtl ? 'ביטול' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer"
              >
                {isRtl ? 'אשר דחייה' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Allocate Hardware Assets */}
      {allocatingQuote && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-2xl rounded-2xl border p-6 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-bold">
                    {isRtl ? 'הקצאת מחשבים ומספרים סידוריים מהמחסן' : 'Allocate Serialized Fleet from Warehouse'}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {allocatingQuote.companyName} · {allocatingQuote.quantity} {isRtl ? 'יחידות נדרשות' : 'units needed'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setAllocatingQuote(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current allocated list */}
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                {isRtl ? 'מכשירים שכבר שוריינו להזמנה זו:' : 'Currently Assigned Hardware:'}
              </div>
              {allocatingQuote.assignedSerialNumbers && allocatingQuote.assignedSerialNumbers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allocatingQuote.assignedSerialNumbers.map((sn) => (
                    <div
                      key={sn}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{sn}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  {isRtl ? 'טרם שוריינו מכשירים. בחר מכשירים זמינים להלן:' : 'None yet. Pick available units below:'}
                </p>
              )}
            </div>

            {/* Available Assets in Warehouse */}
            <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isRtl ? 'מכשירים זמינים במחסן (Status: Available):' : 'Available Warehouse Units:'}
              </div>

              {availableAssets.length === 0 ? (
                <p className="text-xs text-amber-500">
                  {isRtl ? 'אין כרגע מכשירים במצב Available במחסן.' : 'No available hardware in stock.'}
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pe-1">
                  {availableAssets.map((asset) => {
                    const isAlreadyAssigned = (allocatingQuote.assignedSerialNumbers || []).includes(asset.serialNumber);
                    return (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-900 dark:text-white">
                            <span>{asset.serialNumber}</span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px]">
                              Grade {asset.grade}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {asset.modelName} · {asset.warehouseLocation}
                          </div>
                        </div>

                        {isAlreadyAssigned ? (
                          <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                            {isRtl ? 'שוריין' : 'Allocated'}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAllocateSerialToQuote(asset.id)}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                          >
                            {isRtl ? 'שריין להסכם' : 'Reserve Asset'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAllocatingQuote(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white cursor-pointer"
              >
                {isRtl ? 'סיום והחלת הקצאה' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit Terms / Discount Override */}
      {editingTermsQuote && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-2xl border p-5 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Sliders className="w-5 h-5" />
              <h3 className="text-base font-bold">
                {isRtl ? 'עריכת תנאים, הנחה ודריסת תעריף' : 'Adjust Commercial Terms & Discount'}
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {editingTermsQuote.companyName} · {editingTermsQuote.quantity} {isRtl ? 'יחידות' : 'units'}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'אחוז הנחה מאושר (%):' : 'Discount Percentage (%):'}
                </label>
                <div className="flex items-center gap-2">
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercentInput(pct)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        discountPercentInput === pct
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'תשלום חודשי קבוע כולל לכל הצי (לפני מע״מ ₪):' : 'Fixed Monthly Total ILS (excl. VAT):'}
                </label>
                <input
                  type="number"
                  value={customRateInput}
                  onChange={(e) => setCustomRateInput(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg text-xs border bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingTermsQuote(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {isRtl ? 'ביטול' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveTermsAdjustment}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer"
              >
                {isRtl ? 'שמור תנאים' : 'Apply Terms'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
