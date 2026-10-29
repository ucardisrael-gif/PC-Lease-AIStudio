import { hasRentalRates } from '../data/pricing';
import React, { useEffect, useRef, useState } from 'react';
import { Cpu, HardDrive, Monitor, Shield, ArrowUpRight, Clock, Laptop, ChevronLeft, ChevronRight } from 'lucide-react';
import { Language, LaptopProduct } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { sectionDefaults } from '../data/section-defaults.mjs';
import { ProductImage, specsConfirmed } from './ProductImage';

export type FeaturedContent = typeof sectionDefaults.featured;
export type FeaturedBlock = { content: FeaturedContent; version: number };

interface DeviceSelectorProps {
  lang: Language;
  content?: FeaturedContent;
  products: LaptopProduct[];
  selectedProduct: LaptopProduct;
  onSelectProduct: (product: LaptopProduct) => void;
  onProceedToCalculator: (product: LaptopProduct) => void;
  onOpenProductDetails: (product: LaptopProduct) => void;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  lang,
  content = sectionDefaults.featured,
  products,
  selectedProduct,
  onSelectProduct,
  onProceedToCalculator,
  onOpenProductDetails,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'laptop' | 'desktop'>('all');
  const [featuredId, setFeaturedId] = useState(selectedProduct.id);
  const [interacting, setInteracting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);
  const touchTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(touchTimer.current), []);

  useEffect(() => { setFeaturedId(selectedProduct.id); }, [selectedProduct.id]);
  const t = TRANSLATIONS[lang];
  const v = (key: 'kicker' | 'title' | 'body' | 'all' | 'laptop' | 'desktop' | 'details' | 'status') => content[`${key}${lang === 'he' ? 'He' : 'En'}`];

  const visibleProducts = products.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });
  const currentIndex = Math.max(0, visibleProducts.findIndex(p => p.id === featuredId));
  const activeProduct = visibleProducts[currentIndex] ?? selectedProduct;
  const featuredProducts = visibleProducts.slice(Math.floor(currentIndex / 4) * 4, Math.floor(currentIndex / 4) * 4 + 4);
  useEffect(() => {
    if (!content.visible || interacting || hovered || touchPaused || visibleProducts.length < 2) return;
    const timer = window.setTimeout(() => {
      setFeaturedId(visibleProducts[(currentIndex + 1) % visibleProducts.length].id);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [content.visible, interacting, hovered, touchPaused, featuredId, selectedCategory, products]);
  const selectCategory = (category: 'all' | 'laptop' | 'desktop') => {
    setSelectedCategory(category);
    const filtered = category === 'all' ? products : products.filter(p => p.category === category);
    if (filtered.length && !filtered.some(p => p.id === featuredId)) {
      setFeaturedId(filtered[0].id);
      onSelectProduct(filtered[0]);
    }
  };
  const selectProduct = (product: LaptopProduct) => {
    setFeaturedId(product.id);
    onSelectProduct(product);
  };
  const move = (step: number) => {
    if (visibleProducts.length) selectProduct(visibleProducts[(currentIndex + step + visibleProducts.length) % visibleProducts.length]);
  };

  if (!content.visible) return null;
  return (
    <section id="models" onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHovered(false); }} onTouchStart={() => { window.clearTimeout(touchTimer.current); setTouchPaused(true); }} onTouchEnd={() => { touchTimer.current = window.setTimeout(() => setTouchPaused(false), 10000); }} onTouchCancel={() => { touchTimer.current = window.setTimeout(() => setTouchPaused(false), 10000); }} onFocusCapture={(event) => setInteracting(event.target.matches(':focus-visible'))} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }} className="py-10 lg:py-12 border-b border-[var(--border-line)] bg-[var(--bg-page)]">
      <div className="max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-5">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
            {v('kicker')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-primary)] mt-2">
            {v('title')}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3">
            {v('body')}
          </p>
        </div>

        {/* Category Switcher (All / Laptops / Desktops) */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => selectCategory('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-line)] hover:text-[var(--text-primary)]'
            }`}
          >
            {v('all')}
          </button>

          <button
            type="button"
            onClick={() => selectCategory('laptop')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'laptop'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-line)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>{v('laptop')}</span>
          </button>

          <button
            type="button"
            onClick={() => selectCategory('desktop')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'desktop'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-line)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{v('desktop')}</span>
          </button>
        </div>

        {/* Featured models */}
        <div
          role="tablist"
          aria-label="Model Selection"
          className="flex overflow-x-auto gap-3 mb-2 pb-2 snap-x snap-mandatory"
        >
          {featuredProducts.map((product) => {
            const isSelected = product.slug === activeProduct.slug;
            return (
              <button
                key={product.slug}
                role="tab"
                aria-selected={isSelected}
                onClick={() => selectProduct(product)}
                className={`flex shrink-0 w-[210px] lg:w-[calc((100%-2.25rem)/4)] snap-start flex-wrap items-center gap-2 min-h-14 px-4 py-3 rounded-lg text-sm font-semibold text-start transition-all duration-200 border cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isSelected
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-500 shadow-md ring-1 ring-sky-500/30'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-line)] hover:text-[var(--text-primary)] hover:border-sky-400'
                }`}
              >
                <span>{product.manufacturer}</span>
                <span><bdi>{product.model}</bdi></span>
              </button>
            );
          })}
        </div>
        {visibleProducts.length > 1 && <div className="flex items-center justify-center gap-4 mb-2" aria-label={lang === 'he' ? 'מעבר בין דגמים' : 'Browse models'}>
          <button type="button" onClick={() => move(-1)} aria-label={lang === 'he' ? 'הדגם הקודם' : 'Previous model'} className="grid place-items-center w-11 h-11 rounded-full border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-sky-500"><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-sm font-semibold text-[var(--text-secondary)]" aria-live="off">{currentIndex + 1} / {visibleProducts.length}</span>
          <button type="button" onClick={() => move(1)} aria-label={lang === 'he' ? 'הדגם הבא' : 'Next model'} className="grid place-items-center w-11 h-11 rounded-full border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-sky-500"><ChevronRight className="w-5 h-5" /></button>
        </div>}
        <div className="mb-3 text-center"><a href="/catalog" className="inline-flex min-h-11 items-center px-4 text-sm font-semibold text-blue-700 dark:text-sky-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{lang === 'he' ? 'לכל הקטלוג' : 'View full catalogue'}</a></div>

        {/* Device Stage with 3D Motion (Zero CLS) */}
        {visibleProducts.length === 0 ? <p role="status" className="text-center text-[var(--text-secondary)]">{lang === 'he' ? 'אין דגמים נבחרים בקטגוריה זו.' : 'No featured models in this category.'}</p> : <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] p-5 sm:p-7 shadow-lg grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center">
          {/* Visual Showcase (3D Hover & Float Container) */}
          <div
            className="lg:col-span-6 relative aspect-[16/10] max-w-[440px] mx-auto w-full flex items-center justify-center p-4 rounded-xl bg-gradient-to-b from-[var(--bg-page)]/40 to-transparent group"
          >
            {/* Ambient Cyan Glow */}
            <div className="absolute inset-0 bg-sky-500/10 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <ProductImage product={activeProduct} lang={lang} />
          </div>

          {/* Model Information & Pricing Breakdown */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
                <span>{activeProduct.manufacturer}</span>
                <span>·</span>
                <span>{activeProduct.category === 'desktop' ? (lang === 'he' ? 'מחשב נייח' : 'Desktop computer') : (lang === 'he' ? 'מחשב נייד' : 'Laptop')}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                <bdi>{activeProduct.title[lang]}</bdi>
              </h3>

              <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                {specsConfirmed(activeProduct) ? activeProduct.description[lang] : (lang === 'he' ? 'המפרט והזמינות יימסרו לאחר אישור.' : 'Specifications and availability will be provided after confirmation.')}
              </p>
            </div>

            {/* Structured Specifications Grid */}
            {specsConfirmed(activeProduct) && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-[var(--border-subtle)]">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <Cpu className="w-3.5 h-3.5 text-sky-500" />
                  <span>{t.deviceSelector.cpu}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono">
                  <bdi>{activeProduct.cpu.family||'—'}</bdi>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  {activeProduct.cpu.generation ? `${lang === 'he' ? 'דור' : 'Generation'} ${activeProduct.cpu.generation}` : ''}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <Monitor className="w-3.5 h-3.5 text-sky-500" />
                  <span>{t.deviceSelector.screen}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono tabular-nums">
                  {activeProduct.screen.diagonalInches ? `${activeProduct.screen.diagonalInches}″` : '—'}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  {activeProduct.screen.touch ? t.deviceSelector.touch : ''}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <HardDrive className="w-3.5 h-3.5 text-sky-500" />
                  <span>{t.deviceSelector.ram} / {t.deviceSelector.storage}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono tabular-nums">
                  {activeProduct.ramGB ? `${activeProduct.ramGB}GB RAM` : '—'}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                  {activeProduct.storage.capacityGB ? `${activeProduct.storage.capacityGB}GB ${activeProduct.storage.type || ''}` : '—'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <Shield className="w-3.5 h-3.5 text-sky-500" />
                  <span>{t.deviceSelector.os}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono">
                  <bdi>{activeProduct.operatingSystem||'—'}</bdi>
                </div>
              </div>
            </div>}

            {/* Pricing Comparison: 3 Tier Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[var(--bg-page)] border border-[var(--border-subtle)]">
                <span className="text-xs font-semibold text-[var(--text-secondary)] block">
                  {activeProduct.leaseTermMonths === 36 ? (lang === 'he' ? 'ליסינג (36 חודשים)' : 'Lease (36 months)') : (lang === 'he' ? 'ליסינג לא זמין' : 'Lease unavailable')}
                </span>
                <div className="text-lg font-black text-sky-600 dark:text-sky-400 tabular-nums font-mono mt-0.5">
                  {activeProduct.leaseTermMonths === 36 && (Number.isFinite(activeProduct.leasePriceMonthly) ? `₪${activeProduct.leasePriceMonthly} / ${lang === 'he' ? 'חודש' : 'month'}` : (lang === 'he' ? 'מחיר לפי בקשה' : 'Price on request'))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-page)] border border-sky-500/30">
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 block flex items-center justify-between">
                  <span>{lang === 'he' ? 'השכרה (מיום עד שנה)' : 'Rental (1d to 1yr)'}</span>
                  <Clock className="w-3 h-3" />
                </span>
                <div className="text-lg font-black text-sky-600 dark:text-sky-400 tabular-nums font-mono mt-0.5">
                  {hasRentalRates(activeProduct) ? `₪${activeProduct.rentalRates.dailyShort} / ${lang === 'he' ? 'יום' : 'day'}` : (lang === 'he' ? 'מחיר לפי בקשה' : 'Price on request')}
                </div>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {hasRentalRates(activeProduct) ? `₪${activeProduct.rentalRates.monthly} / 30 ${lang === 'he' ? 'יום' : 'days'}` : ''}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-page)] border border-[var(--border-subtle)]">
                <span className="text-xs font-semibold text-[var(--text-secondary)] block">
                  {lang === 'he' ? 'רכישה ישירה' : 'Direct purchase'}
                </span>
                <div className="text-lg font-black text-[var(--text-primary)] tabular-nums font-mono mt-0.5">
                  {Number.isFinite(activeProduct.purchasePrice) ? `₪${activeProduct.purchasePrice.toLocaleString()}` : (lang === 'he' ? 'מחיר לפי בקשה' : 'Price on request')}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onOpenProductDetails(activeProduct)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 rounded-md shadow-sm transition-all cursor-pointer"
              >
                <span>{v('details')}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              {v('status')}
            </p>
          </div>
        </div>}
      </div>
    </section>
  );
};
