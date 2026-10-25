import React, { useState } from 'react';
import { X, Check, Cpu, HardDrive, Monitor, Shield, ArrowRight, ArrowLeft, Clock, Calendar } from 'lucide-react';
import { AcquisitionMode, Language, LaptopProduct } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface ProductModalProps {
  lang: Language;
  product: LaptopProduct | null;
  onClose: () => void;
  onProceedToQuote: (
    product: LaptopProduct,
    mode: AcquisitionMode,
    quantity: number,
    rentalDays?: number
  ) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  lang,
  product,
  onClose,
  onProceedToQuote,
}) => {
  const [mode, setMode] = useState<AcquisitionMode>('lease');
  const [quantity, setQuantity] = useState<number>(1);
  const [rentalDays, setRentalDays] = useState<number>(30);
  const [isImgHovered, setIsImgHovered] = useState(false);

  if (!product) return null;

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'he';

  const calculateRentalUnitCost = (days: number): number => {
    if (days <= 6) return days * 35;
    if (days <= 29) return days * 18;
    return Math.round((days / 30) * 149);
  };

  const rentalUnitCost = calculateRentalUnitCost(rentalDays);
  const rentalTotalCost = quantity * rentalUnitCost;

  const leaseMonthlyCost = quantity * product.leasePriceMonthly;
  const purchaseCost = quantity * product.purchasePrice;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-2xl p-5 sm:p-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-2">
          {/* Photo Column with 3D Motion */}
          <div
            onMouseEnter={() => setIsImgHovered(true)}
            onMouseLeave={() => setIsImgHovered(false)}
            className="md:col-span-5 relative aspect-[4/3] rounded-xl bg-gradient-to-b from-[var(--bg-page)] to-[var(--bg-surface)] p-4 flex items-center justify-center border border-[var(--border-subtle)] overflow-hidden group"
          >
            <div className="absolute inset-0 bg-sky-500/10 rounded-xl blur-lg opacity-40 group-hover:opacity-80 transition duration-500 pointer-events-none" />
            <img
              src={product.imagePath}
              alt={product.title[lang]}
              className={`w-full h-full object-contain filter drop-shadow-xl transition-transform duration-500 ease-out ${
                isImgHovered ? 'scale-110 -translate-y-1' : 'scale-100'
              }`}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Details Column */}
          <div className="md:col-span-7 space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
                <span>{product.manufacturer}</span>
                <span>·</span>
                <span>Refurbished Enterprise Class</span>
              </div>
              <h2 className="text-2xl font-black text-[var(--text-primary)] font-mono">
                <bdi>{product.model}</bdi>
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                {product.description[lang]}
              </p>
            </div>

            {/* Specifications Matrix */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-[var(--bg-page)] border border-[var(--border-subtle)] text-xs">
              <div className="flex items-start gap-2">
                <Cpu className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-[var(--text-secondary)]">מעבד</div>
                  <div className="font-bold text-[var(--text-primary)] font-mono">
                    <bdi>{product.cpu.family}</bdi> (Gen {product.cpu.generation})
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <HardDrive className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-[var(--text-secondary)]">זיכרון ואחסון</div>
                  <div className="font-bold text-[var(--text-primary)] font-mono tabular-nums">
                    {product.ramGB}GB RAM / {product.storage.capacityGB}GB SSD
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Monitor className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-[var(--text-secondary)]">תצוגה ומסך</div>
                  <div className="font-bold text-[var(--text-primary)] font-mono tabular-nums">
                    {product.category === 'desktop'
                      ? 'Micro Desktop Unit'
                      : `${product.screen.diagonalInches}″ FHD ${product.screen.touch ? '(Touch)' : '(Anti-Glare)'}`}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-[var(--text-secondary)]">מערכת הפעלה</div>
                  <div className="font-bold text-[var(--text-primary)] font-mono">
                    Windows 11 Pro
                  </div>
                </div>
              </div>
            </div>

            {/* Mode & Quantity Selector (3 Options) */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('lease')}
                  className={`p-2.5 rounded-lg border text-start transition-all cursor-pointer ${
                    mode === 'lease'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-600 dark:text-sky-400 font-bold'
                      : 'border-[var(--border-line)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="text-[11px]">ליסינג (36 חודש)</div>
                  <div className="text-xs font-mono tabular-nums font-bold">₪99 / חודש</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('short_rental')}
                  className={`p-2.5 rounded-lg border text-start transition-all cursor-pointer ${
                    mode === 'short_rental'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-600 dark:text-sky-400 font-bold'
                      : 'border-[var(--border-line)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="text-[11px]">השכרה (מיום עד שנה)</div>
                  <div className="text-xs font-mono tabular-nums font-bold">החל מ-₪35/יום</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('purchase')}
                  className={`p-2.5 rounded-lg border text-start transition-all cursor-pointer ${
                    mode === 'purchase'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-600 dark:text-sky-400 font-bold'
                      : 'border-[var(--border-line)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="text-[11px]">רכישה ישירה</div>
                  <div className="text-xs font-mono tabular-nums font-bold">₪2,000</div>
                </button>
              </div>

              {/* Sub-duration if Rental is selected */}
              {mode === 'short_rental' && (
                <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-sky-800 dark:text-sky-300">משך השכרה:</span>
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-400">
                      {rentalDays} {rentalDays === 1 ? 'יום' : 'ימים'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { d: 1, l: 'יום 1' },
                      { d: 7, l: 'שבוע' },
                      { d: 14, l: 'שבועיים' },
                      { d: 30, l: 'חודש' },
                      { d: 90, l: '3 חודשים' },
                      { d: 180, l: '6 חודשים' },
                      { d: 365, l: 'שנה' },
                    ].map((item) => (
                      <button
                        key={item.d}
                        type="button"
                        onClick={() => setRentalDays(item.d)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                          rentalDays === item.d
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white dark:bg-slate-900 border-sky-200 dark:border-sky-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">כמות מכשירים:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded border border-[var(--border-line)] font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold font-mono tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(100, quantity + 1))}
                    className="w-8 h-8 rounded border border-[var(--border-line)] font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Total Summary & Action */}
            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {mode === 'purchase'
                    ? 'סה״כ רכישה (לפני מע״מ):'
                    : mode === 'short_rental'
                    ? `סה״כ להשכרה (${rentalDays} ימים, לפני מע״מ):`
                    : 'סה״כ חודשי (לפני מע״מ):'}
                </div>
                <div className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono tabular-nums">
                  ₪
                  {mode === 'purchase'
                    ? purchaseCost.toLocaleString()
                    : mode === 'short_rental'
                    ? rentalTotalCost.toLocaleString()
                    : leaseMonthlyCost.toLocaleString()}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProceedToQuote(product, mode, quantity, mode === 'short_rental' ? rentalDays : undefined);
                }}
                className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 rounded-md shadow-md transition-all cursor-pointer"
              >
                <span>המשך להצעת מחיר</span>
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
