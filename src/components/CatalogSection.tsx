import { hasRentalRates, rentalCost } from '../data/pricing';
import React, { useState, useMemo, useEffect } from 'react';
import { Search, RotateCcw, Cpu, HardDrive, Monitor, ArrowUpRight, Laptop, LayoutGrid, FileText, Shield, ShieldCheck, Box } from 'lucide-react';
import { Language, LaptopProduct } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { ProductImage, specsConfirmed } from './ProductImage';
import {CatalogExtras, CatalogAddon, CatalogPlan} from './CatalogExtras';

interface CatalogSectionProps {
  lang: Language;
  products: LaptopProduct[];
  onChooseAddon: (product:LaptopProduct, planId:string, addonId:string)=>void;
  onOpenProductDetails: (product: LaptopProduct) => void;
  onSelectForCalculator: (product: LaptopProduct) => void;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  lang,
  products,
  onOpenProductDetails,
  onSelectForCalculator,
  onChooseAddon,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All'|'laptop'|'desktop'|'screen'|'office'|'antivirus'|'insurance'|'other'>('All');
  const [options,setOptions]=useState<{plans:CatalogPlan[];addons:CatalogAddon[]}|null>(null);
  const [optionsError,setOptionsError]=useState(false);
  useEffect(()=>{const c=new AbortController();fetch('/api/lease-options',{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(setOptions).catch(()=>{if(!c.signal.aborted)setOptionsError(true)});return()=>c.abort()},[]);
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
        if (!specsConfirmed(p) || !p.cpu.family.toLowerCase().includes(selectedCpu.toLowerCase().replace('core ', ''))) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = p.title[lang].toLowerCase().includes(query);
        const modelMatch = p.model.toLowerCase().includes(query);
        const cpuMatch = specsConfirmed(p) && p.cpu.family.toLowerCase().includes(query);
        const storageMatch = specsConfirmed(p) && String(p.storage.capacityGB).includes(query);
        if (!titleMatch && !modelMatch && !cpuMatch && !storageMatch) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedCategory, selectedBrand, selectedCpu, searchQuery, lang]);

  const addons=(options?.addons||[]).filter(a=>{
    if(selectedBrand!=='All'||selectedCpu!=='All')return false;
    if(selectedCategory!=='All'&&selectedCategory!==a.category)return false;
    const q=searchQuery.trim().toLocaleLowerCase();
    return !q||[a.name_he,a.name_en,a.terms_he,a.terms_en,a.category].some(v=>v.toLocaleLowerCase().includes(q));
  });
  const categoryOptions=[['All',lang==='he'?'הכל':'All',LayoutGrid],['laptop',lang==='he'?'ניידים':'Laptops',Laptop],['desktop',lang==='he'?'נייחים':'Desktops',Monitor],['screen',lang==='he'?'מסכים':'Monitors',Monitor],['office',lang==='he'?'אופיס':'Office',FileText],['antivirus',lang==='he'?'אנטי וירוס':'Antivirus',ShieldCheck],['insurance',lang==='he'?'ביטוח':'Insurance',Shield],['other',lang==='he'?'נוספים':'Other',Box]] as const;
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedBrand('All');
    setSelectedCpu('All');
  };

  return (
    <section id="catalog" className="brand-wash brand-wash-violet py-6 lg:py-10 border-b border-[var(--border-line)] bg-[var(--bg-page)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-black mb-4">{lang==='he'?'קטלוג':'Catalogue'}</h1>
        <div role="group" aria-label={lang==='he'?'קטגוריות הקטלוג':'Catalogue categories'} className="flex flex-wrap gap-2 mb-5">{categoryOptions.map(([value,name,Icon])=><button key={value} type="button" aria-pressed={selectedCategory===value} onClick={()=>{setSelectedCategory(value);setSelectedBrand('All');setSelectedCpu('All');}} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${selectedCategory===value?'bg-blue-600 text-white border-blue-600':'bg-[var(--bg-surface)] border-[var(--border-line)] hover:border-blue-500'}`}><Icon aria-hidden="true" className="h-4 w-4"/>{name}</button>)}</div>
        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-sm mb-10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3.5 items-center">
            {/* Search Input */}
            <div className="md:col-span-7 relative">
              <Search className="w-4 h-4 text-[var(--text-secondary)] absolute top-1/2 start-3.5 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={lang==='he'?'חיפוש בכל הקטלוג':'Search catalogue'}
                placeholder={lang==='he'?'חיפוש מחשב, מוצר או שירות':'Search computers, products or services'}
                className="w-full ps-10 pe-4 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Brand Filter */}
            <div hidden={!['All','laptop','desktop'].includes(selectedCategory)} className="md:col-span-2">
              <select
                aria-label={lang==='he'?'יצרן':'Brand'}
                disabled={!['All','laptop','desktop'].includes(selectedCategory)}
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-40"
              >
                <option value="All">{t.catalog.allBrands}</option>
                <option value="Dell">Dell</option>
                <option value="HP">HP</option>
                <option value="Lenovo">Lenovo</option>
              </select>
            </div>

            {/* CPU Filter */}
            <div hidden={!['All','laptop','desktop'].includes(selectedCategory)} className="md:col-span-2">
              <select
                aria-label={lang==='he'?'מעבד':'Processor'}
                disabled={!['All','laptop','desktop'].includes(selectedCategory)}
                value={selectedCpu}
                onChange={(e) => setSelectedCpu(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-40"
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
              {lang==='he'?`נמצאו ${filteredProducts.length+addons.length} פריטים`:`${filteredProducts.length+addons.length} items found`}
            </span>
            <span className="font-medium text-sky-600 dark:text-sky-400">
              {lang === 'he'
                ? 'מחירים לפי דגם'
                : 'Prices vary by item'}
            </span>
          </div>
        </div>

        {/* Product Cards Grid with 3D Motion */}
        {filteredProducts.length === 0 && !options && !optionsError ? <p role="status" className="text-center py-8 text-[var(--text-secondary)]">{lang==='he'?'טוען קטלוג…':'Loading catalogue…'}</p> : filteredProducts.length === 0 && addons.length === 0 && !optionsError ? (
          <div className="text-center p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] max-w-lg mx-auto">
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {lang==='he'?'לא נמצאו פריטים מתאימים.':'No items match your search and filters.'}
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
                className="brand-card flex flex-col justify-between rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] p-6 shadow-sm hover:shadow-xl hover:border-sky-500/50 hover:-translate-y-1.5 transition-all duration-300 group"
              >
                <div>
                  {/* Card Header & Kicker */}
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-3">
                    <span className="font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      {product.manufacturer} · {product.category === 'desktop' ? (lang === 'he' ? 'מחשב נייח' : 'Desktop') : (lang === 'he' ? 'מחשב נייד' : 'Laptop')}
                    </span>
                    <span className="text-[11px] bg-[var(--badge-bg)] px-2 py-0.5 rounded font-medium">
                      {t.catalog.refurbishedBadge}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-[var(--text-primary)] leading-tight mb-4">
                    <bdi>{product.model}</bdi>
                  </h3>

                  {/* Image Presentation with Smooth Scale & Drop-Shadow Shift */}
                  <div className="relative aspect-[16/10] my-2 p-3 flex items-center justify-center overflow-hidden rounded-lg bg-[var(--bg-page)]/60">
                    <ProductImage product={product} lang={lang} />
                  </div>

                  {/* Key Specifications Pill List */}
                  {specsConfirmed(product) ? <div className="grid grid-cols-3 gap-1.5 py-3 border-y border-[var(--border-subtle)] text-center text-xs">
                    <div className="p-1.5 rounded bg-[var(--badge-bg)]/50">
                      <div className="text-[10px] text-[var(--text-secondary)]">{lang === 'he' ? 'מעבד' : 'Processor'}</div>
                      <div className="font-semibold text-[var(--text-primary)] font-mono text-[11px]">
                        <bdi>{product.cpu.family||'—'}</bdi>
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-[var(--badge-bg)]/50">
                      <div className="text-[10px] text-[var(--text-secondary)]">{lang === 'he' ? 'זיכרון' : 'Memory'}</div>
                      <div className="font-semibold text-[var(--text-primary)] font-mono text-[11px] tabular-nums">
                        {product.ramGB ? `${product.ramGB}GB` : '—'}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-[var(--badge-bg)]/50">
                      <div className="text-[10px] text-[var(--text-secondary)]">{lang === 'he' ? 'אחסון' : 'Storage'}</div>
                      <div className="font-semibold text-[var(--text-primary)] font-mono text-[11px] tabular-nums">
                        {product.storage.capacityGB ? `${product.storage.capacityGB}GB` : '—'}
                      </div>
                    </div>
                  </div> : <p className="py-3 text-sm text-[var(--text-secondary)]">{lang === 'he' ? 'המפרט יימסר לאחר אישור.' : 'Specifications will be provided after confirmation.'}</p>}
                </div>

                {/* Card Footer: Pricing & CTAs */}
                <div className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-start">
                    <div className="p-2 rounded bg-[var(--bg-page)] border border-[var(--border-subtle)]">
                      <div className="text-[10px] text-[var(--text-secondary)]">{product.leaseTermMonths === 36 ? (lang === 'he' ? 'ליסינג 36 חודשים' : 'Lease 36 months') : (lang === 'he' ? 'ליסינג לא זמין' : 'Lease unavailable')}</div>
                      <div className="text-sm font-black text-sky-600 dark:text-sky-400 font-mono tabular-nums">
                        {product.leaseTermMonths === 36 && (Number.isFinite(product.leasePriceMonthly) ? <>₪{product.leasePriceMonthly} <span className="text-[10px] font-normal">/ {lang === 'he' ? 'חודש' : 'month'}</span></> : (lang === 'he' ? 'מחיר לפי בקשה' : 'Price on request'))}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[var(--bg-page)] border border-[var(--border-subtle)]">
                      <div className="text-[10px] text-[var(--text-secondary)]">{lang === 'he' ? 'השכרה (מ־7 ימים עד שנה)' : 'Rental (7 days to one year)'}</div>
                      <div className="text-sm font-black text-sky-600 dark:text-sky-400 font-mono tabular-nums">
                        {hasRentalRates(product) ? <>₪{rentalCost(product,7)} <span className="text-[10px] font-normal">/ {lang === 'he' ? '7 ימים' : '7 days'} · ₪{product.rentalRates.monthly}/30 {lang === 'he' ? 'יום' : 'days'}</span></> : (lang === 'he' ? 'מחיר לפי בקשה' : 'Price on request')}
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
                      {lang === 'he' ? 'חישוב עלות' : 'Calculate cost'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {optionsError&&<p role="status" className="mt-5 text-sm text-[var(--text-secondary)]">{lang==='he'?'לא ניתן לטעון מוצרים ושירותים נוספים.':'Additional products and services could not be loaded.'}</p>}
        <CatalogExtras lang={lang} products={products} plans={options?.plans||[]} addons={addons} onChoose={onChooseAddon}/>
      </div>
    </section>
  );
};
