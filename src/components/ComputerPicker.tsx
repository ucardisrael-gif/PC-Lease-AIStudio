import {FilterMenu} from './FilterMenu';
import React, {useState} from 'react';
import {createPortal} from 'react-dom';
import {CircleHelp, Laptop, Monitor, Plus, Sparkles, Trash2} from 'lucide-react';
import {Language, LaptopProduct} from '../types';
import {ProductImage} from './ProductImage';
import {ProductModal} from './ProductModal';
import {SpecChips} from './ProductSpecifications';

export function ComputerPicker({lang, products, selected, onSelect, onRemove}: {lang:Language; products:LaptopProduct[]; selected:string[]; onSelect:(product:LaptopProduct)=>void; onRemove?:(product:LaptopProduct)=>void}) {
  const [category,setCategory]=useState<'laptop'|'desktop'|null>(null);
  const [details,setDetails]=useState<LaptopProduct|null>(null);
  const [prices,setPrices]=useState<number[]>([]);
  const [processors,setProcessors]=useState<string[]>([]);
  const [screens,setScreens]=useState<number[]>([]);
  const [brands,setBrands]=useState<string[]>([]);
  const he=lang==='he';
  const available=products.filter(p=>(p.category||'laptop')===category);
  const cpu=(p:LaptopProduct)=>{const name=p.cpu.exactModel||p.cpu.family||'';return name.match(/(?:core\s*)?i[3579](?!\d)/i)?.[0]?.toUpperCase().replace(/CORE\s*/,'')||name.trim();};
  const priceOptions=[...new Set(available.filter(p=>p.leaseTermMonths===36&&Number.isFinite(p.leasePriceMonthly)).map(p=>p.leasePriceMonthly))].sort((a,b)=>a-b);
  const brandOptions=[...new Set(available.map(p=>p.manufacturer).filter(Boolean))].sort();
  const cpuOptions=[...new Set(available.map(cpu).filter(Boolean))].sort();
  const screenOptions=[...new Set(available.map(p=>p.screen.diagonalInches).filter(n=>Number.isFinite(n)&&n>0))].sort((a,b)=>a-b);
  const filtered=available.filter(p=>(!brands.length||brands.includes(p.manufacturer))&&(!prices.length||(p.leaseTermMonths===36&&prices.includes(p.leasePriceMonthly)))&&(!processors.length||processors.includes(cpu(p)))&&(!screens.length||screens.includes(p.screen.diagonalInches)));
  const toggle=<T,>(values:T[],value:T,setter:(next:T[])=>void)=>setter(values.includes(value)?values.filter(v=>v!==value):[...values,value]);
  return <div className="space-y-4">
    <p className="text-base sm:text-lg font-semibold text-[var(--text-secondary)]">{he?'בחרו סוג מחשב, ואז בחרו דגם. אפשר להוסיף גם מחשבים ניידים וגם נייחים.':'Choose a computer type, then a model. You can add both laptops and desktops.'}</p>
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {(['laptop','desktop'] as const).map(type=>{
        const Icon=type==='laptop'?Laptop:Monitor;
        const title=type==='laptop'?(he?'מחשבים ניידים':'Laptops'):(he?'מחשבים נייחים':'Desktops');
        return <button type="button" key={type} aria-pressed={category===type} onClick={()=>{setCategory(type);setPrices([]);setProcessors([]);setScreens([]);setBrands([]);}} className={`group relative overflow-hidden rounded-2xl border p-4 sm:p-5 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${category===type?'border-blue-500 ring-2 ring-blue-500/25':'border-[var(--border-line)] hover:border-sky-400'} ${type==='laptop'?'bg-gradient-to-br from-sky-100 via-blue-50 to-white dark:from-sky-950 dark:via-slate-800 dark:to-slate-900':'bg-gradient-to-br from-violet-100 via-amber-50 to-white dark:from-violet-950 dark:via-slate-800 dark:to-slate-900'}`}>
          <span className="absolute top-3 end-3 text-blue-500/60"><Sparkles className="h-4 w-4" aria-hidden="true"/></span>
          <span className="flex h-24 sm:h-32 items-center justify-center rounded-xl bg-white/55 dark:bg-slate-900/40"><Icon className="h-16 w-16 sm:h-20 sm:w-20 text-blue-600 drop-shadow-md" strokeWidth={1.4} aria-hidden="true"/></span>
          <span className="mt-4 block text-base sm:text-lg font-bold">{title}</span>
        </button>;
      })}
    </div>
    {category&&<div role="group" className="space-y-3" aria-label={he?'רשימת דגמים':'Models'}>
      <div className="relative z-20 flex flex-wrap items-start gap-2 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-surface)] p-3 shadow-sm">
        <FilterMenu label={he?'מחיר':'Price'}><fieldset><legend className="mb-3 text-sm font-bold">{he?'מחיר חודשי למחשב':'Monthly lease price per computer'}</legend><div className="grid gap-3"><button type="button" aria-pressed={!prices.length} onClick={()=>setPrices([])} className="text-start text-sm font-semibold text-blue-600">{he?'הכל':'All'}</button>{priceOptions.map(n=><label key={n} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={prices.includes(n)} onChange={()=>toggle(prices,n,setPrices)}/><bdi>₪{n}</bdi></label>)}</div></fieldset></FilterMenu>
        <FilterMenu label={he?'מעבד':'Processor'}><fieldset><legend className="mb-3 text-sm font-bold">{he?'מעבד':'Processor'}</legend><div className="grid gap-3"><button type="button" aria-pressed={!processors.length} onClick={()=>setProcessors([])} className="text-start text-sm font-semibold text-blue-600">{he?'הכל':'All'}</button>{cpuOptions.map(n=><label key={n} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={processors.includes(n)} onChange={()=>toggle(processors,n,setProcessors)}/><bdi>{n}</bdi></label>)}</div></fieldset></FilterMenu>
        {category==='laptop'&&<FilterMenu label={he?'גודל מסך':'Screen size'}><fieldset><legend className="mb-3 text-sm font-bold">{he?'גודל מסך':'Screen size'}</legend><div className="grid gap-3"><button type="button" aria-pressed={!screens.length} onClick={()=>setScreens([])} className="text-start text-sm font-semibold text-blue-600">{he?'הכל':'All'}</button>{screenOptions.map(n=><label key={n} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={screens.includes(n)} onChange={()=>toggle(screens,n,setScreens)}/><bdi>{n}″</bdi></label>)}</div></fieldset></FilterMenu>}
        <FilterMenu label={he?'מותג':'Brand'}><fieldset><legend className="mb-3 text-sm font-bold">{he?'מותג':'Brand'}</legend><div className="grid gap-3"><button type="button" aria-pressed={!brands.length} onClick={()=>setBrands([])} className="text-start text-sm font-semibold text-blue-600">{he?'הכל':'All'}</button>{brandOptions.map(n=><label key={n} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={brands.includes(n)} onChange={()=>toggle(brands,n,setBrands)}/>{n}</label>)}</div></fieldset></FilterMenu>
        <button type="button" onClick={()=>{setPrices([]);setProcessors([]);setScreens([]);setBrands([])}} className="min-h-11 rounded-xl border border-sky-300 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-sky-200">{he?'נקה סינון':'Clear filters'}</button>
      </div>
      {filtered.map((p,index)=>{

        const isSelected=selected.includes(p.slug);
        return <article key={p.slug} className={`rounded-2xl border border-sky-200/80 bg-gradient-to-br ${index%3===1?'from-amber-50 via-white to-sky-50':index%3===2?'from-violet-50 via-white to-blue-50':'from-sky-50 via-white to-blue-50'} p-3 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-24 w-28 sm:h-28 sm:w-36 shrink-0 overflow-hidden rounded-xl bg-white"><ProductImage product={p} lang={lang}/></div>
            <div className="min-w-[160px] flex-1"><h4 className="text-base font-bold"><bdi>{p.title[lang]}</bdi></h4><SpecChips product={p} lang={lang}/><p className="mt-2 font-bold text-blue-700 dark:text-sky-300">{p.leaseTermMonths===36&&Number.isFinite(p.leasePriceMonthly)?`₪${p.leasePriceMonthly} / ${he?'חודש':'month'}`:(he?'מחיר ליסינג לפי בקשה':'Lease price on request')}</p></div>
            <div className="flex items-center gap-2"><button type="button" onClick={()=>setDetails(p)} aria-label={`${he?'פרטי מוצר':'Product details'} ${p.title[lang]}`} className="shrink-0 rounded-full border border-sky-200 bg-white p-2 text-blue-600 hover:bg-sky-50 dark:bg-slate-800"><CircleHelp className="h-5 w-5" aria-hidden="true"/></button><button type="button" disabled={isSelected&&!onRemove} onClick={()=>isSelected?onRemove?.(p):onSelect(p)} aria-label={`${isSelected?(he?'הסרת':'Remove'):(he?'הוספת':'Add')} ${p.title[lang]}`} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${isSelected?'border border-sky-300 bg-sky-50 text-blue-700 dark:bg-slate-800 dark:text-sky-200':'bg-blue-600 text-white hover:bg-blue-700'}`}>{isSelected?<Trash2 className="h-4 w-4"/>:<Plus className="h-4 w-4"/>}{isSelected?(he?'הסרה':'Remove'):(he?'הוספה':'Add')}</button></div>
          </div>
        </article>;
      })}
      {!filtered.length&&<p className="text-sm text-[var(--text-secondary)]">{he?'אין דגמים התואמים לסינון שנבחר.':'No models match these filters.'}</p>}
    </div>}
    {details&&createPortal(<ProductModal lang={lang} product={details} detailsOnly onClose={()=>setDetails(null)} onProceedToQuote={p=>{onSelect(p);setDetails(null);}}/>,document.body)}
  </div>;
}
