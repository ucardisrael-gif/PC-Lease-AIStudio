import React, { useState } from 'react';
import { X, CheckCircle, ShieldAlert, FileText, Send, Building } from 'lucide-react';
import { AcquisitionMode, Language, LaptopProduct, QuoteRequest } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface CheckoutModalProps {
  lang: Language;
  isOpen: boolean;
  product: LaptopProduct;
  mode: AcquisitionMode;
  quantity: number;
  rentalDays?: number;
  onClose: () => void;
  onSubmitQuote: (req: QuoteRequest) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  lang,
  isOpen,
  product,
  mode,
  quantity,
  rentalDays = 30,
  onClose,
  onSubmitQuote,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  if (!isOpen) return null;

  const t = TRANSLATIONS[lang];

  // Rental calculation formula
  const calculateRentalUnitCost = (days: number): number => {
    if (days <= 6) return days * 35;
    if (days <= 29) return days * 18;
    return Math.round((days / 30) * 149);
  };

  const rentalUnitCost = calculateRentalUnitCost(rentalDays);
  const rentalTotalCost = quantity * rentalUnitCost;

  const unitMonthly = mode === 'lease' ? product.leasePriceMonthly : rentalUnitCost;
  const monthlyTotal = quantity * product.leasePriceMonthly;
  const purchaseTotal = quantity * product.purchasePrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactName.trim() || !email.trim() || !phone.trim()) {
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const refCode = `PCL-2026-${randomSuffix}`;

      const quoteReq: QuoteRequest = {
        id: refCode,
        createdAt: new Date().toISOString(),
        productSlug: product.slug,
        productTitle: `${product.manufacturer} ${product.model}`,
        mode,
        quantity,
        rentalDays: mode === 'short_rental' ? rentalDays : undefined,
        monthlyPerUnit: mode === 'lease' ? product.leasePriceMonthly : rentalUnitCost,
        totalMonthly: mode === 'lease' ? monthlyTotal : rentalTotalCost,
        oneTimePerUnit: product.purchasePrice,
        totalOneTime: purchaseTotal,
        companyName,
        contactName,
        email,
        phone,
        taxId,
        city,
        notes,
        status: 'pending_review',
      };

      setIsSubmitting(false);
      setSubmittedRef(refCode);
      onSubmitQuote(quoteReq);
    }, 600);
  };

  const handleResetAndClose = () => {
    setSubmittedRef(null);
    onClose();
  };

  const getModeLabel = () => {
    if (mode === 'lease') return t.checkout.lease36;
    if (mode === 'short_rental') {
      return `${lang === 'he' ? 'השכרה' : 'Rental'} (${rentalDays} ${rentalDays === 1 ? (lang === 'he' ? 'יום' : 'day') : (lang === 'he' ? 'ימים' : 'days')})`;
    }
    return t.checkout.directBuy;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-2xl p-5 sm:p-8 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-4 end-4 p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedRef ? (
          /* Success Screen */
          <div className="text-center py-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              {t.checkout.successTitle}
            </h3>

            <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              {t.checkout.successDesc}
            </p>

            <div className="p-4 rounded-xl bg-[var(--bg-page)] border border-sky-500/30 max-w-xs mx-auto">
              <span className="text-xs uppercase font-bold text-[var(--text-secondary)] block">
                {t.checkout.refNumber}
              </span>
              <span className="text-2xl font-mono font-black text-sky-600 dark:text-sky-400 mt-1 block">
                {submittedRef}
              </span>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 rounded-md shadow transition-colors cursor-pointer"
              >
                {t.checkout.closeBtn}
              </button>
            </div>
          </div>
        ) : (
          /* Order & Quotation Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25 mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-sky-500" />
                <span>{t.checkout.demoBadge}</span>
              </div>

              <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                {t.checkout.modalTitle}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                {t.checkout.subtitle}
              </p>
            </div>

            {/* Selected Preset Summary Strip */}
            <div className="p-4 rounded-xl bg-[var(--bg-page)] border border-[var(--border-line)] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-[var(--text-secondary)] block">דגם נבחר:</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">
                  <bdi>{product.manufacturer} {product.model}</bdi>
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-secondary)] block">סוג מסלול:</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  {getModeLabel()}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-secondary)] block">כמות:</span>
                <span className="font-bold text-[var(--text-primary)] font-mono tabular-nums">
                  {quantity} יחידות
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-secondary)] block">עלות (לפני מע״מ):</span>
                <span className="font-black text-sky-600 dark:text-sky-400 font-mono tabular-nums">
                  {mode === 'purchase'
                    ? `₪${purchaseTotal.toLocaleString()}`
                    : mode === 'short_rental'
                    ? `₪${rentalTotalCost.toLocaleString()}`
                    : `₪${monthlyTotal.toLocaleString()}/חודש`}
                </span>
              </div>
            </div>

            {/* Customer Details Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {t.checkout.companyName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="שם החברה / עסק בע״מ"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {t.checkout.contactName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="שם מלא של איש הקשר"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {t.checkout.email} *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {t.checkout.phone} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="050-1234567"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {t.checkout.taxId}
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="51-XXXXXXX-X"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {t.checkout.city}
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="למשל: תל אביב, הרצליה, חיפה"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  {t.checkout.notes}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="דרישות למשלוח, מועד אספקה רצוי או תצורת תוכנה..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {t.checkout.cancelBtn}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 rounded-md shadow transition-all active:scale-[0.98] cursor-pointer"
              >
                {isSubmitting ? (
                  <span>{t.checkout.submitting}</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t.checkout.submitBtn}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
