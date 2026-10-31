import { rentalCost, hasRentalRates } from '../data/pricing';
import React, { useState, useEffect } from 'react';
import { X, Check, Cpu, HardDrive, Monitor, Shield, ArrowRight, ArrowLeft, Clock, Calendar } from 'lucide-react';
import { AcquisitionMode, Language, LaptopProduct } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { ProductImage, specsConfirmed } from './ProductImage';

interface ProductModalProps {
  lang: Language;
  product: LaptopProduct | null;
  onClose: () => void;
  contactLabel?: string;
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
  contactLabel,
  onProceedToQuote,
}) => {
  const [mode, setMode] = useState<AcquisitionMode>('lease');
  const [quantity, setQuantity] = useState<number>(1);
  const [rentalDays, setRentalDays] = useState<number>(30);
  const [photo,setPhoto]=useState('');
  useEffect(()=>setPhoto(''),[product?.id]);

  if (!product) return null;

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'he';
  const leaseAvailable = product.leaseTermMonths === 36;
  const selectedMode = mode === 'lease' && !leaseAvailable ? 'short_rental' : mode;

  const calculateRentalUnitCost = (days: number) => rentalCost(product, days);

  const rentalUnitCost = calculateRentalUnitCost(rentalDays);
  const rentalTotalCost = rentalUnitCost === null ? null : quantity * rentalUnitCost;

  const leaseMonthlyCost = Number.isFinite(product.leasePriceMonthly) ? quantity * product.leasePriceMonthly : null;
  const purchaseCost = Number.isFinite(product.purchasePrice) ? quantity * product.purchasePrice : null;

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
          className="absolute z-10 top-4 end-4 p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-8 sm:pt-2">
          {/* Photo Column with 3D Motion */}
          <div
            className="md:col-span-5 relative aspect-[4/3] rounded-xl bg-gradient-to-b from-[var(--bg-page)] to-[var(--bg-surface)] p-4 flex items-center justify-center border border-[var(--border-subtle)] overflow-hidden group"
          >
            <div className="absolute inset-0 bg-sky-500/10 rounded-xl blur-lg opacity-40 group-hover:opacity-80 transition duration-500 pointer-events-none" />
            <ProductImage product={photo?{...product,imagePath:photo,imageVerified:true}:product} lang={lang} />
          </div>

          {/* Details Column */}
          <div className="md:col-span-7 space-y-5">
            {product.imageVerified && !!product.gallery?.length && <div className="flex flex-wrap gap-2">{[...new Set([product.imagePath,...product.gallery].filter(Boolean))].map((path,i)=><button type="button" key={path} onClick={()=>setPhoto(path)} aria-label={isRtl?`תמונה ${i+1}`:`Photo ${i+1}`} aria-pressed={(photo||product.imagePath)===path} className={`w-16 h-14 rounded-lg border bg-white p-1 ${(photo||product.imagePath)===path?'border-blue-600 ring-2 ring-blue-300':'border-slate-300'}`}><img src={path} alt="" className="w-full h-full object-contain"/></button>)}</div>}
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
                <span>{product.manufacturer}</span>
                <span>·</span>
                <span>{isRtl ? 'מחשב מחודש' : 'Refurbished computer'}</span>
              </div>
              <h2 className="text-2xl font-black text-[var(--text-primary)]">
                <bdi>{product.model}</bdi>
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                {specsConfirmed(product) ? product.description[lang] : (isRtl ? 'המפרט והזמינות יימסרו לאחר אישור.' : 'Specifications and availability will be provided after confirmation.')}
              </p>
            </div>

            {specsConfirmed(product)&&!!product.customSpecs?.length&&<dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-[var(--bg-page)] p-3">{product.customSpecs.map((spec,i)=><div key={i}><dt className="text-xs text-[var(--text-secondary)]">{isRtl?spec.nameHe:spec.nameEn}</dt><dd className="text-sm font-semibold">{isRtl?spec.valueHe:spec.valueEn}</dd></div>)}</dl>}
            {/* Specifications Matrix */}
            {specsConfirmed(product) && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg bg-[var(--bg-page)] border border-[var(--border-subtle)] text-xs">
              <div className="flex items-start gap-2">
                <Cpu className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{isRtl ? 'מעבד' : 'Processor'}</div>
                  <div className="font-bold text-[var(--text-primary)] font-mono">
                    <bdi>{product.cpu.family||'—'}{product.cpu.generation ? ` (Gen ${product.cpu.generation})` : ''}</bdi>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <HardDrive className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{isRtl ? 'זיכרון ואחסון' : 'Memory and storage'}</div>
                  <div className="font-bold text-[var(--text-primary)] font-mono tabular-nums">
                    {product.ramGB ? `${product.ramGB}GB RAM` : '—'} / {product.storage.capacityGB ? `${product.storage.capacityGB}GB ${product.storage.type || ''}` : '—'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Monitor className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{isRtl ? 'תצוגה ומסך' : 'Display'}</div>
                  <div className="font-bold text-[var(--text-primary)] font-mono tabular-nums">
                    {product.screen.diagonalInches ? `${product.screen.diagonalInches}″ ${product.screen.touch ? '(Touch)' : ''}` : '—'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{isRtl ? 'מערכת הפעלה' : 'Operating system'}</div>
                  <div className="font-bold text-[var(--text-primary)] font-mono">
                    <bdi>{product.operatingSystem||'—'}</bdi>
                  </div>
                </div>
              </div>
            </div>}


            {/* Mode & Quantity Selector (3 Options) */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!leaseAvailable}
                  onClick={() => setMode('lease')}
                  className={`p-2.5 rounded-lg border text-start transition-all cursor-pointer ${
                    selectedMode === 'lease'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-600 dark:text-sky-400 font-bold'
                      : 'border-[var(--border-line)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="text-[11px]">{leaseAvailable ? (isRtl ? 'ליסינג (36 חודשים)' : 'Lease (36 months)') : (isRtl ? 'ליסינג לא זמין' : 'Lease unavailable')}</div>
                  <div className="text-xs font-mono tabular-nums font-bold">{leaseAvailable && (Number.isFinite(product.leasePriceMonthly) ? `₪${product.leasePriceMonthly} / ${isRtl ? 'חודש' : 'month'}` : (isRtl ? 'מחיר לפי בקשה' : 'Price on request'))}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('short_rental')}
                  className={`p-2.5 rounded-lg border text-start transition-all cursor-pointer ${
                    selectedMode === 'short_rental'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-600 dark:text-sky-400 font-bold'
                      : 'border-[var(--border-line)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="text-[11px]">{isRtl ? 'השכרה (מ־7 ימים עד שנה)' : 'Rental (7 days to one year)'}</div>
                  <div className="text-xs font-mono tabular-nums font-bold">{hasRentalRates(product) ? `₪${rentalCost(product,7)}/${isRtl ? '7 ימים' : '7 days'} · ₪${rentalCost(product,30)}/30 ${isRtl ? 'יום' : 'days'}` : (isRtl ? 'מחיר לפי בקשה' : 'Price on request')}</div>
                </button>
              </div>

              {/* Sub-duration if Rental is selected */}
              {selectedMode === 'short_rental' && (
                <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-sky-800 dark:text-sky-300">{isRtl ? 'משך השכרה:' : 'Rental period:'}</span>
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-400">
                      {rentalDays} {isRtl ? (rentalDays === 1 ? 'יום' : 'ימים') : (rentalDays === 1 ? 'day' : 'days')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { d: 7, l: isRtl ? 'שבוע' : '7 days' },
                      { d: 14, l: isRtl ? 'שבועיים' : '14 days' },
                      { d: 30, l: isRtl ? '30 יום' : '30 days' },
                      { d: 90, l: isRtl ? '90 יום' : '90 days' },
                      { d: 180, l: isRtl ? '180 יום' : '180 days' },
                      { d: 365, l: isRtl ? '365 יום' : '365 days' },
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
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{isRtl ? 'כמות מכשירים:' : 'Quantity:'}</span>
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

            {contactLabel&&<a className="inline-block text-sky-600 underline" href={`/contact?product=${encodeURIComponent(product.slug)}`}>{contactLabel}</a>}
            {/* Total Summary & Action */}
            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {selectedMode === 'purchase'
                    ? (isRtl ? 'סה״כ רכישה:' : 'Purchase total:')
                    : selectedMode === 'short_rental'
                    ? (isRtl ? `סה״כ להשכרה (${rentalDays} ימים):` : `Rental total (${rentalDays} days):`)
                    : (isRtl ? 'סה״כ חודשי:' : 'Monthly total:')}
                </div>
                <div className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono tabular-nums">
                  {(selectedMode === 'purchase' ? purchaseCost : selectedMode === 'short_rental' ? rentalTotalCost : leaseMonthlyCost) === null
                    ? (isRtl ? 'מחיר לפי בקשה' : 'Price on request')
                    : `₪${(selectedMode === 'purchase' ? purchaseCost : selectedMode === 'short_rental' ? rentalTotalCost : leaseMonthlyCost)!.toLocaleString()}`}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProceedToQuote(product, selectedMode, quantity, selectedMode === 'short_rental' ? rentalDays : undefined);
                }}
                className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 rounded-md shadow-md transition-all cursor-pointer"
              >
                <span>{isRtl ? 'המשך לבקשת הצעה' : 'Continue to quote request'}</span>
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
