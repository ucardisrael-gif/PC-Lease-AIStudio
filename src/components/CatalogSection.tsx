import React, { useState, useMemo } from 'react';
import { Search, RotateCcw, Cpu, HardDrive, Monitor, ArrowUpRight, Laptop } from 'lucide-react';
import { Language, LaptopProduct } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface CatalogSectionProps {
  lang: Language;
  products: LaptopProduct[];
  onOpenProductDetails: (product: LaptopProduct) => void;
  onSelectForCalculator: (product: LaptopProduct) => void;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  lang,
  products,
  onOpenProductDetails,
  onSelectForCalculator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'laptop' | 'desktop'>('All');
  const [selectedBrand, setSelectedBrand] = useState<'All' | 'Dell' | 'HP' | 'Lenovo'>('All');
  const [selectedCpu, setSelectedCpu] = useState<'All' | 'Core i5' | 'Core i7'>('All');

  const t = TRANSLATIONS[lang];

  // Filtering logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.published) return false;

      // Category filter
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false;
      }

      // Brand filter
      if (selectedBrand !== 'All' && p.manufacturer !== selectedBrand) {
        return false;
      }

      // CPU filter
      if (selectedCpu !== 'All') {
        if (!p.cpu.family.toLowerCase().includes(selectedCpu.toLowerCase().replace('core ', ''))) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = p.title[lang].toLowerCase().includes(query);
        const modelMatch = p.model.toLowerCase().includes(query);
        const cpuMatch = p.cpu.family.toLowerCase().includes(query);
        const storageMatch = String(p.storage.capacityGB).includes(query);
        if (!titleMatch && !modelMatch && !cpuMatch && !storageMatch) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedCategory, selectedBrand, selectedCpu, searchQuery, lang]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedBrand('All');
    setSelectedCpu('All');
  };

  return (
    <section id="catalog" className="py-16 lg:py-24 border-b border-[var(--border-line)] bg-[var(--bg-page)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
            {t.catalog.kicker}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-primary)] mt-2">
            {t.catalog.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3">
            {lang === 'he'
              ? 'כל המחשבים הניידים ותחנות העבודה השולחניות לעסקים — נבדקו בקפידה במעבדה עם רישיון Windows 11 Pro'
              : 'All enterprise business laptops and compact desktop workstations — thoroughly bench-tested with Windows 11 Pro'}
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-sm mb-10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3.5 items-center">
            {/* Search Input */}
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-[var(--text-secondary)] absolute top-1/2 start-3.5 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.catalog.searchPlaceholder}
                className="w-full ps-10 pe-4 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Category Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="All">{lang === 'he' ? 'כל הסוגים (ניידים + דסקטופ)' : 'All Hardware Types'}</option>
                <option value="laptop">{lang === 'he' ? 'מחשבים ניידים בלבד' : 'Laptops Only'}</option>
                <option value="desktop">{lang === 'he' ? 'תחנות עבודה דסקטופ' : 'Desktop Mini PCs'}</option>
              </select>
            </div>

            {/* Brand Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="All">{t.catalog.allBrands}</option>
                <option value="Dell">Dell</option>
                <option value="HP">HP</option>
                <option value="Lenovo">Lenovo</option>
              </select>
            </div>

            {/* CPU Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedCpu}
                onChange={(e) => setSelectedCpu(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="All">{t.catalog.allCpus}</option>
                <option value="Core i5">Intel Core i5</option>
                <option value="Core i7">Intel Core i7</option>
              </select>
            </div>

            {/* Reset Action */}
            <div className="md:col-span-1 flex justify-end">
              <button
                type="button"
                onClick={resetFilters}
                title={t.catalog.resetFilters}
                className="p-2.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Results Counter */}
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
            <span>
              {t.catalog.resultsCount.replace('{count}', String(filteredProducts.length))}
            </span>
            <span className="font-medium text-sky-600 dark:text-sky-400">
              {lang === 'he'
                ? 'ליסינג 36 חודש: ₪99 | השכרה (מיום עד שנה): החל מ-₪35/יום · ₪149/חודש | רכישה: ₪2,000'
                : '36-Mo Lease: ₪99 | Rental (1d–1yr): from ₪35/day · ₪149/mo | Purchase: ₪2,000'}
            </span>
          </div>
        </div>

        {/* Product Cards Grid with 3D Motion */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] max-w-lg mx-auto">
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {t.catalog.noResults}
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-semibold text-sky-600 bg-sky-50 dark:bg-sky-950/60 rounded-md border border-sky-300 dark:border-sky-800 transition-colors"
            >
              {t.catalog.resetFilters}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.slug}
                className="flex flex-col justify-between rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] p-6 shadow-sm hover:shadow-xl hover:border-sky-500/50 hover:-translate-y-1.5 transition-all duration-300 group"
              >
                <div>
                  {/* Card Header & Kicker */}
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-3">
                    <span className="font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      {product.manufacturer} · {product.category === 'desktop' ? 'Desktop Workstation' : 'Laptop'}
                    </span>
                    <span className="text-[11px] bg-[var(--badge-bg)] px-2 py-0.5 rounded font-medium">
                      {t.catalog.refurbishedBadge}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-[var(--text-primary)] font-mono leading-tight mb-4">
                    <bdi>{product.model}</bdi>
                  </h3>

                  {/* Image Presentation with Smooth Scale & Drop-Shadow Shift */}
                  <div className="relative aspect-[16/10] my-2 p-3 flex items-center justify-center overflow-hidden rounded-lg bg-[var(--bg-page)]/60">
                    <img
                      src={product.imagePath}
                      alt={product.title[lang]}
                      className="w-full h-full object-contain filter drop-shadow group-hover:scale-110 group-hover:drop-shadow-[0_12px_24px_rgba(2,132,199,0.25)] transition-all duration-500 ease-out"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  </div>

                  {/* Key Specifications Pill List */}
                  <div className="grid grid-cols-3 gap-1.5 py-3 border-y border-[var(--border-subtle)] text-center text-xs">
                    <div className="p-1.5 rounded bg-[var(--badge-bg)]/50">
                      <div className="text-[10px] text-[var(--text-secondary)]">מעבד</div>
                      <div className="font-semibold text-[var(--text-primary)] font-mono text-[11px]">
                        <bdi>{product.cpu.family}</bdi>
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-[var(--badge-bg)]/50">
                      <div className="text-[10px] text-[var(--text-secondary)]">זיכרון</div>
                      <div className="font-semibold text-[var(--text-primary)] font-mono text-[11px] tabular-nums">
                        {product.ramGB}GB
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-[var(--badge-bg)]/50">
                      <div className="text-[10px] text-[var(--text-secondary)]">אחסון</div>
                      <div className="font-semibold text-[var(--text-primary)] font-mono text-[11px] tabular-nums">
                        {product.storage.capacityGB}GB
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Pricing & CTAs */}
                <div className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-start">
                    <div className="p-2 rounded bg-[var(--bg-page)] border border-[var(--border-subtle)]">
                      <div className="text-[10px] text-[var(--text-secondary)]">ליסינג 36 חודש</div>
                      <div className="text-sm font-black text-sky-600 dark:text-sky-400 font-mono tabular-nums">
                        ₪99 <span className="text-[10px] font-normal">/ חודש</span>
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[var(--bg-page)] border border-[var(--border-subtle)]">
                      <div className="text-[10px] text-[var(--text-secondary)]">השכרה (מיום עד שנה)</div>
                      <div className="text-sm font-black text-sky-600 dark:text-sky-400 font-mono tabular-nums">
                        ₪35 <span className="text-[10px] font-normal">/ יום (₪149/ח׳)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenProductDetails(product)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold rounded border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      <span>{t.catalog.detailsBtn}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectForCalculator(product)}
                      className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 rounded transition-colors shadow-sm cursor-pointer"
                    >
                      {t.catalog.orderBtn}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
