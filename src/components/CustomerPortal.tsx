import React, { useState } from 'react';
import {
  X,
  Laptop,
  FileText,
  Wrench,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Download,
  Plus,
  RefreshCw,
  ShieldCheck,
  User,
  Building,
  Calendar,
  Check,
  ExternalLink,
  ChevronRight,
  Send,
  Sparkles,
  HelpCircle,
  Truck,
  HardDrive
} from 'lucide-react';
import { Language } from '../types';
import { LeaseContract, PhysicalAsset, ServiceTicket, UserAccount } from '../domain/schema';
import { SEEDED_ASSETS, SEEDED_CONTRACTS, SEEDED_TICKETS } from '../data/mockDatabase';

interface CustomerPortalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  lang,
  isOpen,
  onClose,
  currentUser,
}) => {
  const isRtl = lang === 'he';

  // Active Tab
  type TabKey = 'devices' | 'tickets' | 'contracts' | 'billing' | 'end_of_lease';
  const [activeTab, setActiveTab] = useState<TabKey>('devices');

  // Client Data State
  const [assignedAssets] = useState<PhysicalAsset[]>(
    SEEDED_ASSETS.filter((a) => a.currentAssignment?.customerOrganizationName.includes('אקמי') || a.status === 'rented')
  );

  const [tickets, setTickets] = useState<ServiceTicket[]>(SEEDED_TICKETS);
  const [contracts] = useState<LeaseContract[]>(SEEDED_CONTRACTS);

  // New Ticket Modal State
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedSerialForTicket, setSelectedSerialForTicket] = useState(assignedAssets[0]?.serialNumber || '');
  const [ticketCategory, setTicketCategory] = useState<'hardware_failure' | 'screen_damage' | 'battery_performance' | 'upgrade_request'>('screen_damage');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketSuccessMessage, setTicketSuccessMessage] = useState(false);

  // End of Lease Decision Modal State (A09)
  const [selectedAssetForEndOfLease, setSelectedAssetForEndOfLease] = useState<PhysicalAsset | null>(null);
  const [endOfLeaseChoice, setEndOfLeaseChoice] = useState<'buyout' | 'upgrade' | 'return' | null>(null);
  const [endOfLeaseConfirmed, setEndOfLeaseConfirmed] = useState(false);

  // Active Invoice View
  const [viewingContract, setViewingContract] = useState<LeaseContract | null>(null);

  if (!isOpen) return null;

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAsset = assignedAssets.find((a) => a.serialNumber === selectedSerialForTicket) || assignedAssets[0];

    const newTicket: ServiceTicket = {
      id: `tck_${Date.now()}`,
      ticketNumber: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      organizationName: 'אקמי טכנולוגיות בע״מ',
      contactName: currentUser?.fullName || 'יונתן ברקוביץ׳',
      contactPhone: currentUser?.phone || '050-9988123',
      assetSerialNumber: targetAsset?.serialNumber || 'PF-3X92KL-IL',
      deviceModel: targetAsset?.modelName || 'Dell Latitude 7420',
      rentalMonthNumber: 8,
      supplierWarrantyEndDate: targetAsset?.supplier.warrantyEndDate || '2027-01-15',
      routing: 'company_sla_direct', // Managed by SLA
      issueCategory: ticketCategory,
      description: ticketDescription,
      status: 'new',
    };

    setTickets([newTicket, ...tickets]);
    setTicketSuccessMessage(true);
    setTimeout(() => {
      setTicketSuccessMessage(false);
      setIsNewTicketOpen(false);
      setTicketDescription('');
      setActiveTab('tickets');
    }, 1500);
  };

  const handleConfirmEndOfLease = () => {
    setEndOfLeaseConfirmed(true);
    setTimeout(() => {
      setEndOfLeaseConfirmed(false);
      setSelectedAssetForEndOfLease(null);
      setEndOfLeaseChoice(null);
    }, 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-6xl h-[92vh] flex flex-col rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-2xl overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-[var(--border-line)] bg-[var(--bg-page)]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {isRtl ? 'פורטל לקוחות עסקיים' : 'Customer Workspace'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {isRtl ? 'חשבון פעיל' : 'Active Account'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {isRtl ? 'אקמי טכנולוגיות בע״מ · ח.פ 51-584920-1' : 'Acme Technologies Ltd · Tax ID 51-584920-1'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewTicketOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'פתיחת קריאת שירות (SLA 4H)' : 'Open Service Ticket'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-line)]/40 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 px-6 pt-3 border-b border-[var(--border-line)] bg-[var(--bg-surface)] overflow-x-auto">
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'devices'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-500/5'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>{isRtl ? 'מכשירים פעילים וסריאליים' : 'Active Devices & Serials'}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {assignedAssets.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'tickets'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-500/5'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>{isRtl ? 'קריאות שירות ותיקונים' : 'Service & Repairs'}</span>
            {tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'contracts'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-500/5'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{isRtl ? 'הסכמים ונספחי מסירה' : 'Contracts & Handover Acts'}</span>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'billing'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-500/5'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{isRtl ? 'לוח תשלומים וחשבוניות' : 'Invoices & Billing Schedule'}</span>
          </button>

          <button
            onClick={() => setActiveTab('end_of_lease')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'end_of_lease'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-500/5'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>{isRtl ? 'אפשרויות סיום תקופה (A09)' : 'End-of-Lease Options'}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/30">
              90d
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-page)]/30">
          
          {/* TAB 1: ACTIVE DEVICES & SERIAL NUMBERS (§ 4, § 9, § 10) */}
          {activeTab === 'devices' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-600 text-white">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      {isRtl ? 'חבילת שירות VIP 4 שעות פעילה' : 'VIP 4-Hour Replacement SLA Active'}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {isRtl
                        ? 'בכל תקלה או נזק מגיע שליח עם מחשב חלופי מקביל תוך 4 שעות בגוש דן, ללא השבתת העובד.'
                        : 'On any hardware failure or accidental damage, a replacement unit is delivered within 4h.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsNewTicketOpen(true)}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all cursor-pointer whitespace-nowrap"
                >
                  {isRtl ? '+ פתח קריאה למכשיר' : '+ Open Ticket for Device'}
                </button>
              </div>

              {/* Hardware List Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedAssets.map((asset, index) => {
                  const assignedEmployees = [
                    'יונתן ברקוביץ׳ (מנכ״ל)',
                    'עמית כהן (Fullstack Dev)',
                    'נועה לוי (Product Manager)',
                    'דניאל גולד (DevOps Engineer)'
                  ];
                  const employee = assignedEmployees[index % assignedEmployees.length];

                  return (
                    <div
                      key={asset.id}
                      className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--text-secondary)]">
                              Grade {asset.grade}
                            </span>
                            <h5 className="font-bold text-sm text-[var(--text-primary)] mt-1">
                              {asset.modelName}
                            </h5>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>פעיל בליסינג</span>
                          </span>
                        </div>

                        {/* Specs & Serial */}
                        <div className="space-y-2 text-xs text-[var(--text-secondary)] border-y border-[var(--border-line)] py-3 my-3">
                          <div className="flex justify-between items-center">
                            <span>מספר סריאלי (S/N):</span>
                            <span className="font-mono font-bold text-[var(--text-primary)] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded border border-sky-300 dark:border-sky-800">
                              {asset.serialNumber}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span>עובד מוקצה:</span>
                            <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{employee}</span>
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span>עלות חודשית:</span>
                            <span className="font-bold text-[var(--text-primary)] font-mono">
                              ₪99 / חודש + מע״מ
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span>תום 36 חודשים:</span>
                            <span className="font-mono text-slate-500">
                              15.11.2028 (31 חודשים נותרו)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => {
                            setSelectedSerialForTicket(asset.serialNumber);
                            setIsNewTicketOpen(true);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>פתח קריאת שירות</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedAssetForEndOfLease(asset);
                            setActiveTab('end_of_lease');
                          }}
                          title="אפשרויות סיום תקופה"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[var(--text-primary)] border border-[var(--border-line)] hover:bg-[var(--border-line)]/40 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SERVICE TICKETS & REPAIRS (§ 15, A06, A07, A08) */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-[var(--text-primary)]">
                    {isRtl ? 'קריאות שירות ומעקב החלפות' : 'Support Tickets & Repair Tracking'}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {isRtl
                      ? 'כל פנייה מטופלת לפי אמנת שירות SLA עם איסוף והחלפה מהירה. תקלות מסך וחומרה מקבלות עדיפות עליונה.'
                      : 'All inquiries tracked under company SLA with 4-hour swap dispatch.'}
                  </p>
                </div>

                <button
                  onClick={() => setIsNewTicketOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRtl ? 'קריאה חדשה' : 'New Ticket'}</span>
                </button>
              </div>

              {/* Tickets Table / List */}
              <div className="rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
                <table className="w-full text-start text-xs">
                  <thead className="bg-[var(--bg-page)] text-[var(--text-secondary)] border-b border-[var(--border-line)] uppercase">
                    <tr>
                      <th className="py-3 px-4 text-start font-semibold">מספר קריאה</th>
                      <th className="py-3 px-4 text-start font-semibold">מכשיר וסריאלי</th>
                      <th className="py-3 px-4 text-start font-semibold">סוג תקלה</th>
                      <th className="py-3 px-4 text-start font-semibold">מסלול אחריות (A06/A07)</th>
                      <th className="py-3 px-4 text-start font-semibold">סטטוס</th>
                      <th className="py-3 px-4 text-start font-semibold">תאריך פתיחה</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-line)]">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-[var(--border-line)]/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                          {t.ticketNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[var(--text-primary)]">{t.deviceModel}</div>
                          <div className="font-mono text-[11px] text-[var(--text-secondary)]">S/N: {t.assetSerialNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {t.issueCategory === 'screen_damage'
                              ? 'סדק במסך (A08 נזק פיזי)'
                              : t.issueCategory === 'hardware_failure'
                              ? 'תקלת לוח אם / הדלקה'
                              : 'סוללה / מטען'}
                          </span>
                          <div className="text-[11px] text-[var(--text-secondary)] truncate max-w-xs">{t.description}</div>
                        </td>
                        <td className="py-3 px-4">
                          {t.routing === 'supplier_covered' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <span>אחריות יבואן שנה 1</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              <span>כיסוי חברה 3 שנים (SLA 4H)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              t.status === 'resolved' || t.status === 'closed'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : t.status === 'repairing' || t.status === 'replacing'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            <span>
                              {t.status === 'new'
                                ? 'נקלטה במוקד'
                                : t.status === 'in_diagnosis'
                                ? 'בבדיקת מעבדה'
                                : t.status === 'replacing'
                                ? 'שליח החלפה יצא'
                                : t.status === 'resolved'
                                ? 'טופל בהצלחה'
                                : t.status}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">
                          {new Date(t.createdAt).toLocaleDateString('he-IL')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CONTRACTS & HANDOVER ACTS (§ 11, § 16, A17) */}
          {activeTab === 'contracts' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    {isRtl ? 'הסכמי שכירות ונספחי ציוד חתומים דיגיטלית' : 'Signed Master Lease Agreements'}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {isRtl
                      ? 'כל הסכם מכיל תמונת מחיר קבועה (Immutable Pricing Snapshot) שלא משתנה עם תנודות השוק.'
                      : 'Immutable pricing snapshots recorded at time of contract execution.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {contracts.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-sm hover:border-sky-500/40 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-line)]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm">
                            {c.contractNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            {c.state === 'active' ? 'הסכם פעיל ומחייב' : c.state}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                          מורשה חתימה: {c.signatoryName} · טלפון {c.signatoryPhone}
                        </div>
                      </div>

                      <div className="text-end">
                        <div className="text-xs text-[var(--text-secondary)]">חיוב חודשי קבוע:</div>
                        <div className="font-mono font-bold text-base text-[var(--text-primary)]">
                          ₪{c.pricingSnapshot.monthlyRateBeforeVatILS} <span className="text-xs font-normal text-slate-500">+ מע״מ</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                      <div>
                        <span className="text-[var(--text-secondary)]">סריאליים כלולים בהסכם:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.assignedSerialNumbers.map((sn) => (
                            <span key={sn} className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--text-primary)]">
                              {sn}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[var(--text-secondary)]">חתימה אלקטרונית ואימות:</span>
                        <div className="mt-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>OTP Verified ({c.signatureAudit?.signedAt?.slice(0, 10)})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                          SHA256: {c.signatureAudit?.documentSha256}
                        </div>
                      </div>

                      <div className="flex items-center sm:justify-end gap-2">
                        <button
                          onClick={() => setViewingContract(c)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-line)] hover:bg-[var(--border-line)]/40 text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>צפה בהסכם</span>
                        </button>

                        <button
                          onClick={() => {
                            window.print();
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>הורד נספח מסירה (PDF)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: BILLING & PAYMENT SCHEDULE (§ 12, A04, A05) */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
                  <span className="text-xs text-[var(--text-secondary)]">חוב בפיגור נוכחי (Debt):</span>
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    ₪0.00
                  </div>
                  <span className="text-[11px] text-slate-400">אין תשלומים פתוחים בפיגור</span>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
                  <span className="text-xs text-[var(--text-secondary)]">חיוב חודשי הבא (15.11.2026):</span>
                  <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
                    ₪347.49
                  </div>
                  <span className="text-[11px] text-slate-400">כולל מע״מ (17%) בהוראת קבע</span>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
                  <span className="text-xs text-[var(--text-secondary)]">יתרת התחייבות עתידית (31 חודשים):</span>
                  <div className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1">
                    ₪9,207
                  </div>
                  <span className="text-[11px] text-slate-400">מוצג בנפרד לפי סעיף 12 ב-ТЗ</span>
                </div>
              </div>

              {/* 36-Month Timeline Table */}
              <div className="rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-[var(--border-line)] bg-[var(--bg-page)]/50 flex justify-between items-center">
                  <h5 className="font-bold text-xs text-[var(--text-primary)]">
                    {isRtl ? 'פירוט תשלומים וחשבוניות מס קבלה' : 'Payment Installment Ledger'}
                  </h5>
                  <span className="text-[11px] text-[var(--text-secondary)]">הוראת קבע בנקאית מאושרת</span>
                </div>

                <div className="divide-y divide-[var(--border-line)] text-xs">
                  {[
                    { month: 'חודש 1 (15.08.2026)', amount: 347.49, status: 'שולם בהעברה בנקאית', inv: 'INV-1092', receipt: 'REC-9912' },
                    { month: 'חודש 2 (15.09.2026)', amount: 347.49, status: 'שולם בהוראת קבע', inv: 'INV-1144', receipt: 'REC-9958' },
                    { month: 'חודש 3 (15.10.2026)', amount: 347.49, status: 'שולם בהוראת קבע', inv: 'INV-1201', receipt: 'REC-1002' },
                    { month: 'חודש 4 (15.11.2026)', amount: 347.49, status: 'מתוזמן לחיוב אוטומטי', inv: 'טיוטה', receipt: 'טרם חויב' },
                    { month: 'חודש 5 (15.12.2026)', amount: 347.49, status: 'עתידי', inv: 'עתידי', receipt: 'עתידי' },
                  ].map((row, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-[var(--border-line)]/20">
                      <div>
                        <div className="font-bold text-[var(--text-primary)]">{row.month}</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">חשבונית: {row.inv} · קבלה: {row.receipt}</div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="font-mono font-bold text-sm text-[var(--text-primary)]">
                          ₪{row.amount}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          row.status.includes('שולם')
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {row.status}
                        </span>
                        {row.status.includes('שולם') && (
                          <button
                            title="הורד חשבונית"
                            onClick={() => alert(`הורדת חשבונית ${row.inv}`)}
                            className="p-1 rounded text-slate-400 hover:text-sky-600 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: END-OF-LEASE DECISION (§ 10, A09) */}
          {activeTab === 'end_of_lease' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-600 text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    {isRtl ? 'אשף סיום תקופת ליסינג (בדיקת קבלה A09)' : 'End-of-Lease Decision Flow (A09)'}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {isRtl
                      ? 'בסיום תקופת 36 חודשים (או 60-90 יום לפני), הארגון בוחר באחת מ-3 חלופות רשמיות.'
                      : 'Choose between residual buyout, next-generation upgrade, or secure return.'}
                  </p>
                </div>
              </div>

              {/* 3 Decision Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Option 1: Buyout */}
                <div
                  onClick={() => setEndOfLeaseChoice('buyout')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    endOfLeaseChoice === 'buyout'
                      ? 'border-sky-500 bg-sky-500/5 shadow-md'
                      : 'border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-slate-400'
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center mb-3">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-base text-[var(--text-primary)]">
                      {isRtl ? '1. רכישה במחיר שיורי' : '1. Residual Buyout'}
                    </h5>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                      {isRtl
                        ? 'תשלום סמלי חד-פעמי של ₪290 למכשיר והעברת הבעלות המלאה לחברה לצמיתות.'
                        : 'Pay nominal residual price and retain full equipment ownership.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-line)] mt-4">
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400 font-mono">
                      ₪290 בלבד למחשב
                    </span>
                  </div>
                </div>

                {/* Option 2: Upgrade & Renew */}
                <div
                  onClick={() => setEndOfLeaseChoice('upgrade')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    endOfLeaseChoice === 'upgrade'
                      ? 'border-purple-500 bg-purple-500/5 shadow-md'
                      : 'border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-slate-400'
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mb-3">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-base text-[var(--text-primary)]">
                      {isRtl ? '2. שדרוג לדגם חדש' : '2. Upgrade & Renew'}
                    </h5>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                      {isRtl
                        ? 'קבלת מחשבי דור חדש עם 10% הנחת נאמנות, ואיסוף המחשבים הישנים ללא עלות.'
                        : 'Swap for brand new generation laptops with a 10% customer loyalty discount.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-line)] mt-4">
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      10% הנחה לחוזה חדש
                    </span>
                  </div>
                </div>

                {/* Option 3: Return */}
                <div
                  onClick={() => setEndOfLeaseChoice('return')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    endOfLeaseChoice === 'return'
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-md'
                      : 'border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-slate-400'
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-3">
                      <Truck className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-base text-[var(--text-primary)]">
                      {isRtl ? '3. החזרה ומחיקה מאובטחת' : '3. Secure Return'}
                    </h5>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                      {isRtl
                        ? 'שליח אוסף את הציוד, ומעבדת החברה מנפיקה תעודת מחיקת מידע מאובטחת (DoD 5220.22-M).'
                        : 'Free pickup with certified DoD security data wipe certification.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-line)] mt-4">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      אישור מחיקה רשמי
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              {endOfLeaseChoice && (
                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-between animate-in fade-in">
                  <div className="text-xs text-[var(--text-primary)]">
                    נבחרה אפשרות:{' '}
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      {endOfLeaseChoice === 'buyout'
                        ? 'רכישה במחיר שיורי'
                        : endOfLeaseChoice === 'upgrade'
                        ? 'שדרוג לדגם חדש'
                        : 'החזרה ומחיקה'}
                    </span>
                  </div>

                  <button
                    onClick={handleConfirmEndOfLease}
                    disabled={endOfLeaseConfirmed}
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-md cursor-pointer flex items-center gap-2"
                  >
                    {endOfLeaseConfirmed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>ההחלטה נקלטה בהצלחה!</span>
                      </>
                    ) : (
                      <>
                        <span>אשר והפק מסמך סיום (A09)</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal: New Service Ticket (§ 15 / A08) */}
        {isNewTicketOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-2xl p-6">
              <button
                onClick={() => setIsNewTicketOpen(false)}
                className="absolute top-4 end-4 p-1.5 rounded-lg text-slate-400 hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-lg bg-sky-600 text-white">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                    פתיחת קריאת שירות (SLA 4H)
                  </h3>
                  <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold">
                    החלפה תוך 4 שעות במרכז הארץ
                  </span>
                </div>
              </div>

              {ticketSuccessMessage ? (
                <div className="p-6 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">הקריאה נפתחה בהצלחה!</h4>
                  <p className="text-xs text-[var(--text-secondary)]">שליח עם מכשיר חלופי יתואם איתכם בדקות הקרובות.</p>
                </div>
              ) : (
                <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-[var(--text-primary)] mb-1">
                      בחר מכשיר תקול (לפי מספר סידורי):
                    </label>
                    <select
                      value={selectedSerialForTicket}
                      onChange={(e) => setSelectedSerialForTicket(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] font-mono"
                    >
                      {assignedAssets.map((a) => (
                        <option key={a.id} value={a.serialNumber}>
                          {a.modelName} (S/N: {a.serialNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[var(--text-primary)] mb-1">
                      סוג התקלה / קטגוריה:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'screen_damage', label: 'סדק במסך / שבר (A08)' },
                        { id: 'hardware_failure', label: 'תקלת חומרה / לא נדלק' },
                        { id: 'battery_performance', label: 'סוללה / מטען פגום' },
                        { id: 'upgrade_request', label: 'בקשת שדרוג חומרה' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setTicketCategory(cat.id as any)}
                          className={`p-2.5 rounded-lg border text-start transition-all cursor-pointer ${
                            ticketCategory === cat.id
                              ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold'
                              : 'border-[var(--border-line)] text-[var(--text-secondary)] hover:border-slate-400'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[var(--text-primary)] mb-1">
                      תיאור התקלה והוראות הגעה לשליח:
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={ticketDescription}
                      onChange={(e) => setTicketDescription(e.target.value)}
                      placeholder="לדוגמה: המחשב קיבל מכה והמסך נסדק (בדיקת מקרה A08). נא לתאם החלפה מול יונתן 050-9988123."
                      className="w-full p-2.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)]"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-[var(--border-line)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                    <span>מוקד חירום ושירות:</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400 font-mono">03-912-8800</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsNewTicketOpen(false)}
                      className="px-4 py-2 rounded-lg border border-[var(--border-line)] text-[var(--text-secondary)] hover:bg-[var(--border-line)]/40 cursor-pointer"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer"
                    >
                      שגר קריאה לשליח
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal: View Contract Preview (§ 11) */}
        {viewingContract && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-2xl rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
              <button
                onClick={() => setViewingContract(null)}
                className="absolute top-4 end-4 p-1.5 rounded-lg text-slate-400 hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center pb-4 border-b border-[var(--border-line)]">
                <span className="text-xs uppercase tracking-wider text-sky-600 font-bold">הסכם ליסינג תפעולי</span>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  חוזה שכירות מחשוב עסקי #{viewingContract.contractNumber}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  נחתם דיגיטלית בתאריך {viewingContract.signatureAudit?.signedAt?.slice(0, 10)}
                </span>
              </div>

              <div className="space-y-4 text-xs py-4 text-[var(--text-secondary)] leading-relaxed">
                <div className="p-3 rounded-lg bg-[var(--bg-page)] space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-[var(--text-primary)]">שוכר:</span>
                    <span>{viewingContract.organizationName} (ח.פ {viewingContract.taxId})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-[var(--text-primary)]">משכיר:</span>
                    <span>פי.סי ליס ישראל בע״מ (ח.פ 51-690214-4)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-[var(--text-primary)]">תקופת שכירות:</span>
                    <span>36 חודשים מיום המסירה בפועל</span>
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-[var(--text-primary)] mb-1">נספח ציוד וסריאליים:</h5>
                  <div className="p-2.5 rounded border border-[var(--border-line)] font-mono text-[11px] space-y-1">
                    {viewingContract.assignedSerialNumbers.map((sn) => (
                      <div key={sn} className="flex justify-between">
                        <span>Dell Latitude 7420 Business Grade-A</span>
                        <span className="text-sky-600 font-bold">{sn}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-[var(--text-primary)] mb-1">תמונת מחיר קבועה (Immutable Pricing Snapshot):</h5>
                  <p className="text-[11px]">
                    התשלום החודשי בסך ₪{viewingContract.pricingSnapshot.monthlyRateBeforeVatILS} לפני מע״מ הינו סופי ובלתי ניתן לשינוי חד-צדדי.
                    הסכם זה מוגן על פי סעיף 6 ו-A12 ב-ТЗ.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-line)]">
                <button
                  onClick={() => setViewingContract(null)}
                  className="px-4 py-2 rounded-lg border border-[var(--border-line)] text-xs text-[var(--text-secondary)] hover:bg-[var(--border-line)]/40 cursor-pointer"
                >
                  סגור
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>הדפס / שמור כ-PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
