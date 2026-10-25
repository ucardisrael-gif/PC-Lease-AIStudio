import React, { useState } from 'react';
import { Calculator, ArrowRight, ArrowLeft, Info, AlertCircle, Clock, Calendar, Check } from 'lucide-react';
import { AcquisitionMode, Language, LaptopProduct } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface PricingCalculatorProps {
  lang: Language;
  products: LaptopProduct[];
  selectedProduct: LaptopProduct;
  onSelectProduct: (product: LaptopProduct) => void;
  onContinueToQuote: (
    product: LaptopProduct,
    mode: AcquisitionMode,
    quantity: number,
    rentalDays?: number
  ) => void;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  lang,
  products,
  selectedProduct,
  onSelectProduct,
  onContinueToQuote,
}) => {
  const [mode, setMode] = useState<AcquisitionMode>('lease');
  const [rentalDays, setRentalDays] = useState<number>(30); // 1 to 365 days (1 year)
  const [quantity, setQuantity] = useState<number>(3);
  const [inputError, setInputError] = useState<string | null>(null);

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'he';

  const handleQuantityChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    if (isNaN(val) || val < 1 || val > 1000) {
      setInputError(t.calculator.validationError);
      setQuantity(isNaN(val) ? 0 : val);
    } else {
      setInputError(null);
      setQuantity(val);
    }
  };

  const handleDaysChange = (val: number) => {
    const clamped = Math.max(1, Math.min(365, val));
    setRentalDays(clamped);
  };

  const isValidQuantity = quantity >= 1 && quantity <= 1000 && !inputError;

  // -------------------------------------------------------------
  // PRICING LOGIC
  // 1. Lease (36 mo): 99 ILS / unit / month (before VAT)
  // 2. Short Rental (from 1 day up to 365 days / 1 year):
  //    - Ultra-short (1-6 days): 35 ILS / day / unit
  //    - Short term (7-29 days): 18 ILS / day / unit
  //    - Monthly (30-365 days): 149 ILS / 30 days (pro-rated: (days / 30) * 149)
  // 3. Purchase: 2000 ILS / unit (before VAT)
  // -------------------------------------------------------------
  const calculateRentalUnitCost = (days: number): number => {
    if (days <= 6) {
      return days * 35;
    } else if (days <= 29) {
      return days * 18;
    } else {
      return Math.round((days / 30) * 149);
    }
  };

  const unitRentalCost = calculateRentalUnitCost(rentalDays);
  const totalRentalCost = unitRentalCost * quantity;

  // Lease figures
  const leaseMonthlyRatePerUnit = selectedProduct.leasePriceMonthly;
  const leaseMonthlyTotal = quantity * leaseMonthlyRatePerUnit;
  const lease36Total = leaseMonthlyTotal * 36;

  // Purchase figures
  const purchaseTotal = quantity * selectedProduct.purchasePrice;

  // Quick preset days options
  const rentalPresets = [
    { days: 1, labelHe: 'יום 1', labelEn: '1 Day' },
    { days: 3, labelHe: '3 ימים', labelEn: '3 Days' },
    { days: 7, labelHe: 'שבוע (7 ימים)', labelEn: '1 Week (7d)' },
    { days: 14, labelHe: 'שבועיים (14 ימים)', labelEn: '2 Weeks (14d)' },
    { days: 30, labelHe: 'חודש (30 ימים)', labelEn: '1 Month (30d)' },
    { days: 90, labelHe: '3 חודשים', labelEn: '3 Months' },
    { days: 180, labelHe: '6 חודשים', labelEn: '6 Months' },
    { days: 365, labelHe: 'שנה (365 יום)', labelEn: '1 Year (365d)' },
  ];

  return (
    <section id="calculator" className="py-16 lg:py-24 border-b border-[var(--border-line)] bg-[var(--bg-page)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
            {t.calculator.kicker}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-primary)] mt-2">
            {t.calculator.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3">
            {t.calculator.subtitle}
          </p>
        </div>

        {/* Main Calculator Box */}
        <div className="max-w-4xl mx-auto rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] p-5 sm:p-8 lg:p-10 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Input Controls (Left Column) */}
            <div className="md:col-span-7 space-y-6">
              {/* 1. Device Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  {t.calculator.deviceLabel}
                </label>
                <select
                  value={selectedProduct.slug}
                  onChange={(e) => {
                    const match = products.find((p) => p.slug === e.target.value);
                    if (match) onSelectProduct(match);
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors cursor-pointer"
                >
                  {products.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.manufacturer} {p.model} ({p.cpu.family}, {p.ramGB}GB RAM)
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Acquisition Mode: 3 Options (Lease, Short-Term Rental from 1 day to 1 year, Purchase) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  {t.calculator.modeLabel}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: Lease (36 mo) */}
                  <button
                    type="button"
                    onClick={() => setMode('lease')}
                    className={`p-3 rounded-lg border text-start transition-all cursor-pointer ${
                      mode === 'lease'
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-600 dark:border-sky-400 text-sky-700 dark:text-sky-300 shadow-sm ring-1 ring-sky-500/20'
                        : 'bg-[var(--bg-surface)] border-[var(--border-line)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                      {t.calculator.leaseMode}
                    </div>
                    <div className="text-xs font-mono font-semibold text-sky-600 dark:text-sky-400 mt-1">
                      {t.calculator.leaseBadge}
                    </div>
                  </button>

                  {/* Option 2: Short-term Rental (1 day to 1 year) */}
                  <button
                    type="button"
                    onClick={() => setMode('short_rental')}
                    className={`p-3 rounded-lg border text-start transition-all cursor-pointer ${
                      mode === 'short_rental'
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-600 dark:border-sky-400 text-sky-700 dark:text-sky-300 shadow-sm ring-1 ring-sky-500/20'
                        : 'bg-[var(--bg-surface)] border-[var(--border-line)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center justify-between">
                      <span>{t.calculator.shortRentalMode}</span>
                      <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    </div>
                    <div className="text-xs font-mono font-semibold text-sky-600 dark:text-sky-400 mt-1">
                      {t.calculator.shortRentalBadge}
                    </div>
                  </button>

                  {/* Option 3: Outright Purchase */}
                  <button
                    type="button"
                    onClick={() => setMode('purchase')}
                    className={`p-3 rounded-lg border text-start transition-all cursor-pointer ${
                      mode === 'purchase'
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-600 dark:border-sky-400 text-sky-700 dark:text-sky-300 shadow-sm ring-1 ring-sky-500/20'
                        : 'bg-[var(--bg-surface)] border-[var(--border-line)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                      {t.calculator.purchaseMode}
                    </div>
                    <div className="text-xs font-mono font-semibold text-[var(--text-primary)] mt-1">
                      {t.calculator.purchaseBadge}
                    </div>
                  </button>
                </div>
              </div>

              {/* Sub-selector for Short-Term Rental: From 1 Day to 365 Days (1 Year) */}
              {mode === 'short_rental' && (
                <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-800 dark:text-sky-300">
                      <Calendar className="w-4 h-4 text-sky-600" />
                      <span>{t.calculator.rentalTermLabel}:</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono font-bold text-sm text-sky-700 dark:text-sky-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-sky-200 dark:border-sky-800">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={rentalDays}
                        onChange={(e) => handleDaysChange(parseInt(e.target.value, 10) || 1)}
                        className="w-14 text-center focus:outline-none bg-transparent"
                      />
                      <span className="text-xs font-sans font-medium text-[var(--text-secondary)]">
                        {isRtl ? 'ימים' : 'days'}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Duration Slider (1 to 365 days) */}
                  <div className="space-y-1.5">
                    <input
                      type="range"
                      min={1}
                      max={365}
                      value={rentalDays}
                      onChange={(e) => handleDaysChange(parseInt(e.target.value, 10))}
                      className="w-full accent-sky-600 h-2 bg-sky-200 dark:bg-sky-900 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-[var(--text-secondary)] font-mono">
                      <span>{isRtl ? 'יום 1' : '1 day'}</span>
                      <span>{isRtl ? 'חודש (30 יום)' : '1 mo (30d)'}</span>
                      <span>{isRtl ? '6 חודשים' : '6 mo'}</span>
                      <span>{isRtl ? 'שנה (365 יום)' : '1 year (365d)'}</span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons (1 day, 3 days, 1 week, 2 weeks, 1 mo, 3 mo, 6 mo, 1 yr) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {rentalPresets.map((preset) => (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => handleDaysChange(preset.days)}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-md border text-center transition-all cursor-pointer ${
                          rentalDays === preset.days
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-sky-200 dark:border-sky-900 text-slate-700 dark:text-slate-300 hover:border-sky-400'
                        }`}
                      >
                        {lang === 'he' ? preset.labelHe : preset.labelEn}
                      </button>
                    ))}
                  </div>

                  {/* Pricing Tier Notice */}
                  <div className="text-[11px] text-sky-800 dark:text-sky-300/90 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-sky-200/70 dark:border-sky-800/60 flex items-center justify-between">
                    <span>
                      {rentalDays <= 6
                        ? (isRtl ? 'תעריף השכרה יומית קצרה: ₪35 / יום למכשיר' : 'Daily rental rate: ₪35 / day per unit')
                        : rentalDays <= 29
                        ? (isRtl ? 'תעריף השכרה שבועית מוזלת: ₪18 / יום למכשיר' : 'Discounted weekly rate: ₪18 / day per unit')
                        : (isRtl ? 'תעריף השכרה חודשית: ₪149 / חודש למכשיר (כ-₪5 ליום)' : 'Monthly rate: ₪149 / mo per unit (~₪5/day)')}
                    </span>
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                      ₪{unitRentalCost} / {isRtl ? 'למכשיר' : 'unit'}
                    </span>
                  </div>
                </div>
              )}

              {/* 3. Quantity Input with Quick Stepper Buttons */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  {t.calculator.quantityLabel}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(String(Math.max(1, quantity - 1)))}
                    className="w-11 h-11 flex items-center justify-center rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-lg font-bold hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={quantity || ''}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-center text-lg font-bold rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(String(Math.min(1000, quantity + 1)))}
                    className="w-11 h-11 flex items-center justify-center rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-lg font-bold hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Quick preset chips */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[11px] text-[var(--text-secondary)]">בחירה מהירה:</span>
                  {[1, 3, 5, 10, 25].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuantityChange(String(preset))}
                      className="px-2.5 py-0.5 text-xs rounded bg-[var(--badge-bg)] hover:bg-[var(--border-line)] text-[var(--text-primary)] font-mono transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {inputError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{inputError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Real-time Calculation Result (Right Column) */}
            <div className="md:col-span-5 rounded-xl bg-[var(--bg-page)] border border-[var(--border-line)] p-6 flex flex-col justify-between space-y-6">
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-sky-600 dark:text-sky-400 mb-1">
                  סיכום עלויות משוער
                </div>

                <div className="text-xs text-[var(--text-secondary)] mb-4">
                  {selectedProduct.manufacturer} {selectedProduct.model} · {quantity} יחידות
                </div>

                {/* Primary Figure based on Mode */}
                {mode === 'purchase' ? (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-[var(--text-secondary)]">
                      {t.calculator.purchaseTotalLabel}
                    </div>
                    <div className="text-4xl font-black text-[var(--text-primary)] font-mono tabular-nums">
                      ₪{purchaseTotal.toLocaleString()}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      תשלום חד-פעמי לרכישה
                    </div>
                  </div>
                ) : mode === 'short_rental' ? (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-[var(--text-secondary)]">
                      {isRtl ? 'סה״כ להשכרה לתקופה המבוקשת' : 'Total Rental Period Cost'}
                    </div>
                    <div className="text-4xl font-black text-sky-600 dark:text-sky-400 font-mono tabular-nums">
                      ₪{totalRentalCost.toLocaleString()}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      עבור {quantity} מחשבים למשך {rentalDays} {rentalDays === 1 ? 'יום' : 'ימים'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-[var(--text-secondary)]">
                      {t.calculator.monthlyTotalLabel}
                    </div>
                    <div className="text-4xl font-black text-sky-600 dark:text-sky-400 font-mono tabular-nums">
                      ₪{leaseMonthlyTotal.toLocaleString()}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      לחודש (ליסינג עסקי ל-36 חודש)
                    </div>
                  </div>
                )}

                {/* Secondary Breakdown */}
                {mode === 'short_rental' ? (
                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-1.5">
                    <div className="flex justify-between">
                      <span>משך ההשכרה:</span>
                      <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
                        {rentalDays} {rentalDays === 1 ? 'יום' : 'ימים'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>עלות ליחידה בודדת:</span>
                      <span className="font-mono tabular-nums text-sky-600 dark:text-sky-400 font-bold">
                        ₪{unitRentalCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>תעריף יומי ממוצע:</span>
                      <span className="font-mono tabular-nums">
                        ₪{(unitRentalCost / rentalDays).toFixed(1)} / יום
                      </span>
                    </div>
                  </div>
                ) : mode === 'lease' ? (
                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-1">
                    <div className="flex justify-between">
                      <span>תעריף ליחידה:</span>
                      <span className="font-mono tabular-nums text-[var(--text-primary)] font-bold">
                        ₪{leaseMonthlyRatePerUnit} לחודש
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>תקופת הסכם:</span>
                      <span className="font-mono">36 חודשים</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[var(--text-secondary)]/80 pt-1">
                      <span>סה״כ ל-36 חודש:</span>
                      <span className="font-mono tabular-nums">₪{lease36Total.toLocaleString()}</span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Disclaimer */}
              <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                  <Info className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>{t.calculator.beforeVat}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {isRtl
                    ? 'מסלול השכרה ניתן לבחירה החל מיום בודד ועד שנה (365 יום). אספקה מיידית בהתאם לזמינות המלאי במעבדה.'
                    : 'Rentals available from 1 day up to 1 year (365 days). Immediate dispatch subject to laboratory inventory.'}
                </p>
              </div>

              {/* Submit CTA */}
              <button
                disabled={!isValidQuantity}
                onClick={() =>
                  onContinueToQuote(
                    selectedProduct,
                    mode,
                    quantity,
                    mode === 'short_rental' ? rentalDays : undefined
                  )
                }
                className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-bold text-white rounded-md shadow-md transition-all ${
                  isValidQuantity
                    ? 'bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 cursor-pointer active:scale-[0.99]'
                    : 'bg-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                <span>{t.calculator.continueCta}</span>
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
