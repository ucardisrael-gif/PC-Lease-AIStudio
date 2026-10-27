import React, { useState } from 'react';
import {
  X,
  Building,
  DollarSign,
  Users,
  Copy,
  Check,
  ExternalLink,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Percent,
  FileText,
  CreditCard,
  QrCode,
  Share2
} from 'lucide-react';
import { Language } from '../types';
import { DealerAccount, UserAccount } from '../domain/schema';
import { SEEDED_DEALERS } from '../data/mockDatabase';

interface DealerPortalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
}

export const DealerPortal: React.FC<DealerPortalProps> = ({
  lang,
  isOpen,
  onClose,
  currentUser,
}) => {
  const isRtl = lang === 'he';

  // Seeded dealer data
  const dealer: DealerAccount = SEEDED_DEALERS[0] || {
    id: 'dlr_01',
    dealerCode: 'DLR-TLV-09',
    companyName: 'אפסילון פתרונות מחשוב וענן בע״מ',
    contactName: 'עופר שפירא',
    email: 'ofer@epsilon-it.co.il',
    phone: '054-8899221',
    commissionRatePercent: 7.5,
    attributedOrganizationsCount: 14,
    totalEarnedILS: 42800,
    pendingPayoutILS: 8750,
    status: 'active',
  };

  type TabKey = 'clients' | 'ledger' | 'referral';
  const [activeTab, setActiveTab] = useState<TabKey>('clients');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  if (!isOpen) return null;

  const referralUrl = `https://pc-lease.co.il/?ref=${dealer.dealerCode}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRequestPayout = (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutSuccess(true);
    setTimeout(() => {
      setPayoutSuccess(false);
      setIsPayoutModalOpen(false);
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {isRtl ? 'פורטל שותפים ודילרים' : 'Partner & Dealer Workspace'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  קוד דילר: {dealer.dealerCode}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {dealer.companyName} · איש קשר: {dealer.contactName} ({dealer.phone})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPayoutModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-all cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              <span>{isRtl ? 'משיכת עמלות (₪8,750)' : 'Request Payout'}</span>
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
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[var(--border-line)] bg-[var(--bg-surface)] overflow-x-auto">
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'clients'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isRtl ? 'לקוחות משויכים (14)' : 'Attributed Clients'}</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{isRtl ? 'ספר עמלות והחזרים (A10)' : 'Commission Ledger & A10 Reversal'}</span>
          </button>

          <button
            onClick={() => setActiveTab('referral')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'referral'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>{isRtl ? 'קישור שותף וערכת שיווק' : 'Affiliate Link & Tools'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-page)]/30 space-y-6">
          
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>שיעור עמלה מוסכם (§ 14)</span>
                <Percent className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1">
                {dealer.commissionRatePercent}%
              </div>
              <span className="text-[11px] text-slate-400">מהתקבולים המאושרים ללא מע״מ</span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>עמלות זמינות למשיכה</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                ₪{dealer.pendingPayoutILS.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400">מאושר להעברה לחשבון בנק</span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>מחזור ליסינג פעיל</span>
                <TrendingUp className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
                ₪45,600 / חודש
              </div>
              <span className="text-[11px] text-slate-400">צי מחשבים מניב של 14 לקוחות</span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>סה״כ עמלות ששולמו עד כה</span>
                <CheckCircle2 className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
                ₪{dealer.totalEarnedILS.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400">מצטבר היסטורי מאומת</span>
            </div>
          </div>

          {/* TAB 1: ATTRIBUTED CLIENTS */}
          {activeTab === 'clients' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>בידוד נתונים מוחלט (§ 14 & § 29):</strong> הינך רואה אך ורק לקוחות המשויכים לקוד השותף שלך. פרטי לקוחות אחרים חסומים לחלוטין.
                  </span>
                </div>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60">
                  Audit: Strict Tenant Isolation
                </span>
              </div>

              <div className="rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
                <table className="w-full text-start text-xs">
                  <thead className="bg-[var(--bg-page)] text-[var(--text-secondary)] border-b border-[var(--border-line)] uppercase">
                    <tr>
                      <th className="py-3 px-4 text-start font-semibold">ארגון / לקוח</th>
                      <th className="py-3 px-4 text-start font-semibold">ח.פ / ע.מ</th>
                      <th className="py-3 px-4 text-start font-semibold">מחשבים פעילים</th>
                      <th className="py-3 px-4 text-start font-semibold">חיוב חודשי</th>
                      <th className="py-3 px-4 text-start font-semibold">עמלת דילר חודשית (7.5%)</th>
                      <th className="py-3 px-4 text-start font-semibold">סטטוס חוזה</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-line)]">
                    {[
                      { org: 'משרד עו״ד רוטנברג ושות׳', tax: '51-610294-1', pcs: 12, monthly: 1188, comm: 89.1, status: 'פעיל (חודש 11/36)' },
                      { org: 'סייבר-נקסט בע״מ', tax: '51-789012-3', pcs: 25, monthly: 3475, comm: 260.6, status: 'פעיל (חודש 6/36)' },
                      { org: 'קליניק-טק מרכזים רפואיים', tax: '51-445566-7', pcs: 18, monthly: 1962, comm: 147.1, status: 'פעיל (חודש 19/36)' },
                      { org: 'אלפא דיגיטל סטודיו', tax: '55-891230-0', pcs: 8, monthly: 872, comm: 65.4, status: 'פעיל (חודש 4/36)' },
                      { org: 'לוגיסטיקה ישירה בע״מ', tax: '51-990011-2', pcs: 15, monthly: 1485, comm: 111.3, status: 'ממתין לחתימה (Draft)' },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-[var(--border-line)]/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                          {row.org}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">
                          {row.tax}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                          {row.pcs} יחידות
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-[var(--text-primary)]">
                          ₪{row.monthly} + מע״מ
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                          ₪{row.comm.toFixed(1)} / חודש
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            row.status.includes('פעיל')
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: COMMISSION LEDGER & TEST A10 REVERSAL */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>בדיקת קבלה A10 (Acceptance Test A10 - Reversal on Refund):</span>
                </div>
                <p className="leading-relaxed">
                  עמלות מחושבות אך ורק מתקבולים מאושרים בפועל. במידה ולקוח מקבל החזר כספי (Refund), המערכת אינה מוחקת שורות קודמות, אלא מייצרת שורת קיזוז נגדית (Reversal) שקופה לחלוטין בספר התנועות.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
                <table className="w-full text-start text-xs">
                  <thead className="bg-[var(--bg-page)] text-[var(--text-secondary)] border-b border-[var(--border-line)] uppercase">
                    <tr>
                      <th className="py-3 px-4 text-start font-semibold">תאריך</th>
                      <th className="py-3 px-4 text-start font-semibold">לקוח / אסמכתא</th>
                      <th className="py-3 px-4 text-start font-semibold">בסיס תקבול (ללא מע״מ)</th>
                      <th className="py-3 px-4 text-start font-semibold">שיעור</th>
                      <th className="py-3 px-4 text-start font-semibold">סכום עמלה</th>
                      <th className="py-3 px-4 text-start font-semibold">סטטוס בספר החשבונות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-line)]">
                    {[
                      { date: '15.10.2026', client: 'סייבר-נקסט בע״מ (INV-1201)', base: 3475, rate: 7.5, amount: 260.62, status: 'earned' },
                      { date: '15.10.2026', client: 'משרד עו״ד רוטנברג (INV-1198)', base: 1188, rate: 7.5, amount: 89.10, status: 'earned' },
                      { date: '02.10.2026', client: 'אלפא דיגיטל (זיכוי והחזר - REF-04)', base: -500, rate: 7.5, amount: -37.50, status: 'reversed' },
                      { date: '01.10.2026', client: 'משיכת עמלות לחשבון בנק (PAY-8821)', base: 0, rate: 0, amount: -4500.00, status: 'paid' },
                      { date: '15.09.2026', client: 'קליניק-טק (INV-1144)', base: 1962, rate: 7.5, amount: 147.15, status: 'paid' },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-[var(--border-line)]/20 transition-colors">
                        <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">
                          {row.date}
                        </td>
                        <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                          {row.client}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {row.base === 0 ? '-' : `₪${row.base.toLocaleString()}`}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {row.rate > 0 ? `${row.rate}%` : '-'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className={row.amount < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}>
                            {row.amount < 0 ? `-₪${Math.abs(row.amount).toFixed(2)}` : `+₪${row.amount.toFixed(2)}`}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            row.status === 'earned'
                              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                              : row.status === 'paid'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-500/15 text-red-600 dark:text-red-400'
                          }`}>
                            {row.status === 'reversed' ? 'Reversal (A10 קיזוז החזר)' : row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REFERRAL LINK & MARKETING TOOLS */}
          {activeTab === 'referral' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-4">
                <h4 className="font-bold text-base text-[var(--text-primary)]">
                  קישור השותף הרשמי שלך להפניה
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  שתף קישור זה עם לקוחות עסקיים. כל לקוח שיכנס דרך הקישור יקבל חודש ניסיון חינם בליסינג, וקוד הדילר שלך ייקשר אוטומטית לכל החוזים העתידיים שלו (עם הגנה מדורסת כפולה לפי סעיף 14).
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full p-3 rounded-xl border border-[var(--border-line)] bg-[var(--bg-page)] font-mono text-xs text-sky-600 dark:text-sky-400 select-all truncate">
                    {referralUrl}
                  </div>

                  <button
                    onClick={handleCopyLink}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer whitespace-nowrap"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>הועתק ללוח!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>העתק קישור להפצה</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Marketing Kit Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-2">
                  <FileText className="w-6 h-6 text-sky-600" />
                  <h5 className="font-bold text-sm text-[var(--text-primary)]">מצגת הסבר ללקוח (PDF)</h5>
                  <p className="text-xs text-[var(--text-secondary)]">דף מוצר ממותג להצגת יתרונות הליסינג ושימור תזרים המזומנים.</p>
                  <button onClick={() => window.print()} className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1 pt-2 cursor-pointer">
                    <Download className="w-3.5 h-3.5" />
                    <span>הורד PDF ממותג</span>
                  </button>
                </div>

                <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-2">
                  <QrCode className="w-6 h-6 text-purple-600" />
                  <h5 className="font-bold text-sm text-[var(--text-primary)]">קוד QR לפגישות שטח</h5>
                  <p className="text-xs text-[var(--text-secondary)]">סריקה מהירה מהנייד של הלקוח לפתיחת הצעת מחיר מיידית.</p>
                  <button onClick={() => alert('קוד ה-QR הופק')} className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1 pt-2 cursor-pointer">
                    <span>הצג QR להדפסה</span>
                  </button>
                </div>

                <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-2">
                  <Percent className="w-6 h-6 text-emerald-600" />
                  <h5 className="font-bold text-sm text-[var(--text-primary)]">מחשבון עמלות מהיר</h5>
                  <p className="text-xs text-[var(--text-secondary)]">הזן מספר מחשבים בעסקה וראה את סך העמלה הצפויה ל-36 חודשים.</p>
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 pt-2">
                    20 מחשבים = ₪5,940 עמלה
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal: Request Payout */}
        {isPayoutModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-2xl p-6">
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="absolute top-4 end-4 p-1.5 rounded-lg text-slate-400 hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-lg bg-amber-600 text-white">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                    בקשת משיכת עמלות
                  </h3>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    יתרה מאושרת: ₪8,750.00
                  </span>
                </div>
              </div>

              {payoutSuccess ? (
                <div className="p-6 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">בקשת המשיכה נקלטה בהצלחה!</h4>
                  <p className="text-xs text-[var(--text-secondary)]">העברה בנקאית תבוצע תוך 2 ימי עסקים כנגד חשבונית מס.</p>
                </div>
              ) : (
                <form onSubmit={handleRequestPayout} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-[var(--text-primary)] mb-1">
                      סכום למשיכה (₪):
                    </label>
                    <input
                      type="number"
                      required
                      defaultValue={8750}
                      max={8750}
                      min={100}
                      className="w-full p-2.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[var(--text-primary)] mb-1">
                      פרטי חשבון בנק להעברה:
                    </label>
                    <div className="p-2.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[11px] space-y-1 font-mono text-[var(--text-secondary)]">
                      <div>בנק הפועלים (12) · סניף 612</div>
                      <div>חשבון: 492014 על שם {dealer.companyName}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                    * התשלום יועבר כנגד המצאת חשבונית מס ואישור ניכוי מס במקור בתוקף.
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsPayoutModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-[var(--border-line)] text-[var(--text-secondary)] hover:bg-[var(--border-line)]/40 cursor-pointer"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
                    >
                      אישור ושליחה לביצוע
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
