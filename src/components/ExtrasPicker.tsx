import {ZoomImage} from './ZoomImage';
import {FilterMenu} from './FilterMenu';
import React, {useState} from 'react';
import {FileText, Monitor, PackagePlus, Shield, ShieldCheck, SlidersHorizontal} from 'lucide-react';
import {Language} from '../types';

export type ExtraProduct={id:string;version:number;category:string;image_path?:string;name_he:string;name_en:string;terms_he:string;terms_en:string;price:number;billing:'month'|'once'};
export type SelectedExtra={id:string;version:number;quantity:number};
const categoryLabels:Record<string,[string,string]>={screen:['מסכים','Monitors'],office:['תוכנות משרד','Office software'],antivirus:['אנטי וירוס','Antivirus'],insurance:['ביטוח','Insurance']};

export function ExtrasPicker({lang,addons,selected,onChange}:{lang:Language;addons:ExtraProduct[];selected:SelectedExtra[];onChange:(items:SelectedExtra[])=>void}) {
  const [category,setCategory]=useState<string[]>([]);const he=lang==='he';
  const categories=[...new Set(addons.map(a=>a.category))];
  const filtered=category.length?addons.filter(a=>category.includes(a.category)):addons;
  return <section aria-label={he?'מוצרים ושירותים נוספים':'Optional products and services'} className="space-y-5 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-surface)] p-4 sm:p-6">
    <div><h3 className="text-xl font-bold">{he?'מוצרים ושירותים נוספים':'Optional products and services'}</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">{he?'הוסיפו מוצרים ושירותים לפי הצורך.':'Add products and services to suit your needs.'}</p></div>
    <div className="relative z-20 flex flex-wrap gap-2 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-surface)] p-3 shadow-sm">
      <FilterMenu label={he?'קטגוריה':'Category'}><div role="group" aria-label={he?'קטגוריה':'Category'} className="grid gap-3"><button type="button" aria-pressed={!category.length} onClick={()=>setCategory([])} className="text-start text-sm font-semibold text-blue-600">{he?'הכל':'All'}</button>{categories.map(id=><label key={id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={category.includes(id)} onChange={e=>setCategory(e.target.checked?[...category,id]:category.filter(x=>x!==id))}/>{categoryLabels[id]?.[he?0:1]||id}</label>)}</div></FilterMenu>
      {categories.map(id=>{const Icon=id==='screen'?Monitor:id==='office'?FileText:id==='antivirus'?ShieldCheck:id==='insurance'?Shield:PackagePlus;return <button type="button" key={id} aria-pressed={category.includes(id)} onClick={()=>setCategory(category.includes(id)?category.filter(x=>x!==id):[...category,id])} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${category.includes(id)?'border-blue-500 bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-sky-200':'border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-primary)]'}`}><Icon className="h-4 w-4 text-blue-600" aria-hidden="true"/>{categoryLabels[id]?.[he?0:1]||id}</button>})}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((a,index)=>{const item=selected.find(x=>x.id===a.id);const Icon=a.category==='screen'?Monitor:a.category==='office'?FileText:a.category==='antivirus'?ShieldCheck:a.category==='insurance'?Shield:PackagePlus;const name=he?a.name_he:a.name_en;const terms=(he?a.terms_he:a.terms_en).trim();const tint=index%3===1?'from-amber-50 via-white to-sky-50':index%3===2?'from-violet-50 via-white to-sky-50':'from-sky-50 via-white to-blue-50';return <article key={a.id} className={`flex flex-col rounded-2xl border p-4 shadow-sm bg-gradient-to-br dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 ${tint} ${item?'border-blue-500 ring-2 ring-blue-500/20':'border-[var(--border-line)]'}`}>
        <div className="flex h-36 items-center justify-center rounded-xl bg-white/80 dark:bg-slate-900/60">{a.image_path?<ZoomImage src={a.image_path} alt={name} lang={lang} className="h-full w-full object-contain p-2"/>:<Icon className="h-16 w-16 text-blue-600" strokeWidth={1.4} aria-hidden="true"/>}</div>
        <div className="mt-4 flex-1"><h4 className="text-lg font-bold">{name}</h4><p className="mt-1 text-lg font-black text-blue-600"><bdi>₪{a.price}</bdi><span className="text-sm font-medium text-[var(--text-secondary)]"> / {a.billing==='month'?(he?'חודש':'month'):(he?'חד פעמי':'one time')}</span></p><p className="mt-3 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{terms||(he?'התנאים יימסרו לאחר בירור.':'Terms are subject to confirmation.')}</p></div>
        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-bold text-blue-700 dark:bg-slate-800 dark:text-sky-200"><input type="checkbox" checked={!!item} onChange={e=>onChange(e.target.checked?[...selected,{id:a.id,version:a.version,quantity:1}]:selected.filter(x=>x.id!==a.id))}/><Icon className="h-4 w-4" aria-hidden="true"/>{name}</label>
        {item&&<label className="mt-3 text-sm font-semibold">{he?'כמות':'Quantity'} <input className="w-20 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] p-2" type="number" min="1" max="1000" value={item.quantity||''} required onChange={e=>onChange(selected.map(x=>x.id===a.id?{...x,quantity:Number(e.target.value)}:x))}/></label>}
      </article>})}
    </div>
  </section>;
}
