import React, { useState } from 'react';
import { Cpu, HardDrive, Monitor, Shield, ArrowUpRight, Calculator, Clock, Laptop } from 'lucide-react';
import { Language, LaptopProduct } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface DeviceSelectorProps {
  lang: Language;
  products: LaptopProduct[];
  selectedProduct: LaptopProduct;
  onSelectProduct: (product: LaptopProduct) => void;
  onProceedToCalculator: (product: LaptopProduct) => void;
  onOpenProductDetails: (product: LaptopProduct) => void;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  lang,
  products,
  selectedProduct,
  onSelectProduct,
  onProceedToCalculator,
  onOpenProductDetails,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'laptop' | 'desktop'>('all');
  const [isHovered, setIsHovered] = useState(false);
  const t = TRANSLATIONS[lang];

  const visibleProducts = products.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  return (
    <section id="models" className="py-16 lg:py-24 border-b border-[var(--border-line)] bg-[var(--bg-page)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
            {t.deviceSelector.kicker}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-primary)] mt-2">
            {t.deviceSelector.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3">
            {lang === 'he'
              ? 'בחרו מתוך נבחרת המחשבים הניידים ועמדות העבודה השולחניות לעסק'
              : 'Choose from our verified fleet of business laptops and desktop micro-workstations'}
          </p>
        </div>

        {/* Category Switcher (All / Laptops / Desktops) */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-line)] hover:text-[var(--text-primary)]'
            }`}
          >
            {lang === 'he' ? 'כל הציוד' : 'All Hardware'}
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('laptop')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'laptop'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-line)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>{lang === 'he' ? 'מחשבים ניידים' : 'Laptops'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('desktop')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'desktop'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-line)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{lang === 'he' ? 'תחנות עבודה דסקטופ' : 'Desktop Mini PCs'}</span>
          </button>
        </div>

        {/* Model Tabs */}
        <div
          role="tablist"
          aria-label="Model Selection"
          className="flex items-center justify-start sm:justify-center overflow-x-auto pb-4 gap-2.5 mb-8 no-scrollbar"
        >
          {visibleProducts.map((product) => {
            const isSelected = product.slug === selectedProduct.slug;
            return (
              <button
                key={product.slug}
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectProduct(product)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap shrink-0 border cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-500 shadow-md ring-1 ring-sky-500/30'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-line)] hover:text-[var(--text-primary)] hover:border-sky-400'
                }`}
              >
                <span>{product.manufacturer}</span>
                <span className="font-mono"><bdi>{product.model}</bdi></span>
              </button>
            );
          })}
        </div>

        {/* Device Stage with 3D Motion (Zero CLS) */}
        <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] p-6 sm:p-10 shadow-lg min-h-[500px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Visual Showcase (3D Hover & Float Container) */}
          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="lg:col-span-6 relative aspect-[16/11] max-w-[500px] mx-auto w-full flex items-center justify-center p-4 rounded-xl bg-gradient-to-b from-[var(--bg-page)]/40 to-transparent group"
          >
            {/* Ambient Cyan Glow */}
            <div className="absolute inset-0 bg-sky-500/10 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <img
              key={selectedProduct.slug}
              src={selectedProduct.imagePath}
              alt={selectedProduct.title[lang]}
              className={`w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(2,132,199,0.2)] transition-all duration-500 ease-out ${
                isHovered ? 'scale-108 -translate-y-2' : 'scale-100'
              }`}
              referrerPolicy="no-referrer"
              loading="eager"
            />
          </div>

          {/* Model Information & Pricing Breakdown */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
                <span>{selectedProduct.manufacturer}</span>
                <span>·</span>
                <span>{selectedProduct.category === 'desktop' ? 'Enterprise Desktop Workstation' : 'Enterprise Laptop'}</span>
                <span>·</span>
                <span>Refurbished Grade A</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight font-mono">
                <bdi>{selectedProduct.title[lang]}</bdi>
              </h3>

              <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                {selectedProduct.description[lang]}
              </p>
            </div>

            {/* Structured Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-[var(--border-subtle)]">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <Cpu className="w-3.5 h-3.5 text-sky-500" />
                  <span>{t.deviceSelector.cpu}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono">
                  <bdi>{selectedProduct.cpu.family}</bdi>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  דור {selectedProduct.cpu.generation}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <Monitor className="w-3.5 h-3.5 text-sky-500" />
                  <span>{t.deviceSelector.screen}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono tabular-nums">
                  {selectedProduct.category === 'desktop' ? 'Micro Unit' : `${selectedProduct.screen.diagonalInches}″ FHD`}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  {selectedProduct.category === 'desktop' ? 'חיבור למספר מסכים' : selectedProduct.screen.touch ? t.deviceSelector.touch : t.deviceSelector.nonTouch}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <HardDrive className="w-3.5 h-3.5 text-sky-500" />
                  <span>{t.deviceSelector.ram} / {t.deviceSelector.storage}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono tabular-nums">
                  {selectedProduct.ramGB}GB RAM
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                  {selectedProduct.storage.capacityGB}GB {selectedProduct.storage.type || 'SSD'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <Shield className="w-3.5 h-3.5 text-sky-500" />
                  <span>{t.deviceSelector.os}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono">
                  Win 11 Pro
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  רישיון עסקי
                </div>
              </div>
            </div>

            {/* Pricing Comparison: 3 Tier Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[var(--bg-page)] border border-[var(--border-subtle)]">
                <span className="text-xs font-semibold text-[var(--text-secondary)] block">
                  ליסינג (36 חודש)
                </span>
                <div className="text-lg font-black text-sky-600 dark:text-sky-400 tabular-nums font-mono mt-0.5">
                  {t.deviceSelector.leaseRate}
                </div>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  לפני מע״מ
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-page)] border border-sky-500/30">
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 block flex items-center justify-between">
                  <span>{lang === 'he' ? 'השכרה (מיום עד שנה)' : 'Rental (1d to 1yr)'}</span>
                  <Clock className="w-3 h-3" />
                </span>
                <div className="text-lg font-black text-sky-600 dark:text-sky-400 tabular-nums font-mono mt-0.5">
                  {lang === 'he' ? 'החל מ-₪35 / יום' : 'From ₪35 / day'}
                </div>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {lang === 'he' ? 'או ₪149/חודש · לפני מע״מ' : 'or ₪149/mo · Excl. VAT'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-page)] border border-[var(--border-subtle)]">
                <span className="text-xs font-semibold text-[var(--text-secondary)] block">
                  רכישה ישירה
                </span>
                <div className="text-lg font-black text-[var(--text-primary)] tabular-nums font-mono mt-0.5">
                  {t.deviceSelector.buyRate}
                </div>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  לפני מע״מ
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onProceedToCalculator(selectedProduct)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 rounded-md shadow-sm transition-all cursor-pointer"
              >
                <Calculator className="w-4 h-4" />
                <span>{t.deviceSelector.calculateCta}</span>
              </button>

              <button
                onClick={() => onOpenProductDetails(selectedProduct)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-3 text-xs sm:text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--badge-bg)] border border-[var(--border-line)] rounded-md transition-all cursor-pointer"
              >
                <span>{t.deviceSelector.viewDetails}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              {t.deviceSelector.statusNote}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
