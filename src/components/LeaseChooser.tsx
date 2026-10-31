import React, {useEffect, useState} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, Laptop, Sparkles} from 'lucide-react';
import {LaptopProduct, Language} from '../types';
import {sectionDefaults} from '../data/section-defaults.mjs';
import {ProductImage} from './ProductImage';

type Plan = {id:string; name:string; monthly_price:number; description_he:string; description_en:string; productSlugs:string[]};

export function LeaseChooser({lang, products, labels, path, onPathChange, onBack, onChoose}: {lang:Language; products:LaptopProduct[]; labels:typeof sectionDefaults.calculator; path:'budget'|'model'|null; onPathChange:(path:'budget'|'model')=>void; onBack:()=>void; onChoose:(product:LaptopProduct, planId:string)=>void;}) {
  const [plans,setPlans]=useState<Plan[]>([]);
  const [loading,setLoading]=useState(true);
  const [chosen,setChosen]=useState('');
  useEffect(()=>{const controller=new AbortController();fetch('/api/lease-options',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(Array.isArray(data.plans))setPlans(data.plans);}).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[]);
  const plan=plans.find(p=>p.id===chosen);
  const models=products.filter(p=>p.published && p.leaseTermMonths===36 && plan?.productSlugs.includes(p.slug));
  const availablePlans=plans.some(p=>products.some(x=>x.published&&x.leaseTermMonths===36&&p.productSlugs.includes(x.slug)));
  const he=lang==='he';
  return <section className="brand-wash brand-wash-violet mx-auto max-w-[1600px] rounded-3xl px-5 sm:px-8 py-10" aria-label={he?'בחירת מסלול ליסינג':'Choose a lease plan'}>
    <h2 className="text-3xl font-black text-center mb-6">{he?labels.pathTitleHe:labels.pathTitleEn}</h2>
    <div id="path-options" className="grid gap-4 md:grid-cols-2">
      <button type="button" aria-expanded={path==='budget'} onClick={()=>onPathChange('budget')} className={`brand-path rounded-2xl border p-7 text-start ${path==='budget'?'border-blue-500 bg-blue-50 dark:bg-slate-800':'border-[var(--border-line)] bg-[var(--bg-surface)]'}`}><span className="text-xl font-bold">{he?labels.budgetChoiceHe:labels.budgetChoiceEn}</span></button>
      <button type="button" aria-expanded={path==='model'} onClick={()=>onPathChange('model')} className={`brand-path rounded-2xl border p-7 text-start ${path==='model'?'border-blue-500 bg-blue-50 dark:bg-slate-800':'border-[var(--border-line)] bg-[var(--bg-surface)]'}`}><span className="text-xl font-bold">{he?labels.modelChoiceHe:labels.modelChoiceEn}</span></button>
    </div>
    {path==='budget'&&<div id="budget-path-content" className="mt-5 space-y-6">
      <div className="px-1"><h3 className="text-xl font-bold">{he?labels.budgetChoiceHe:labels.budgetChoiceEn}</h3><p className="mt-2 text-[var(--text-secondary)]">{he?labels.budgetPathBodyHe:labels.budgetPathBodyEn}</p></div>
      {loading?<p role="status" className="text-[var(--text-secondary)]">{he?'טוען מסלולים…':'Loading plans…'}</p>:!availablePlans&&<p role="status" className="text-[var(--text-secondary)]">{he?'אין כרגע מסלולים זמינים. ניתן לבחור מחשב ישירות.':'No plans are currently available. You can choose a computer directly.'}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {plans.map((p,index)=>{
          const example=products.find(x=>x.published&&x.leaseTermMonths===36&&p.productSlugs.includes(x.slug));
          const selected=chosen===p.id;
          const colors=index%3===1?'from-amber-400/20 via-blue-500/5 to-transparent':index%3===2?'from-violet-400/20 via-sky-400/10 to-transparent':'from-sky-400/20 via-blue-500/5 to-transparent';
          return <button key={p.id} type="button" aria-pressed={selected} disabled={!example} onClick={()=>setChosen(p.id)} className={`group relative overflow-hidden rounded-3xl border p-5 sm:p-6 text-start flex flex-col bg-[var(--bg-surface)] transition duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 ${selected?'border-blue-500 shadow-lg ring-2 ring-blue-500/20':'border-[var(--border-line)] shadow-sm hover:border-sky-400'}`}>
            <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-52 bg-gradient-to-br ${colors} pointer-events-none`}/>
            <div className="relative w-full flex justify-between items-start gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-bold text-blue-700 dark:text-sky-300"><Sparkles className="w-3.5 h-3.5" aria-hidden="true"/>{he?'מסלול ליסינג':'LEASE PLAN'}</span><ArrowUpRight className="w-5 h-5 text-blue-600 transition-transform motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:translate-x-1" aria-hidden="true"/></div>
            <div className="relative mt-4 w-full h-36 sm:h-44 rounded-2xl overflow-hidden bg-white/80 flex justify-center items-center">{example?<ProductImage product={example} lang={lang}/>:<Laptop className="w-14 h-14 text-slate-400" aria-hidden="true"/>}</div>
            <div className="relative mt-5 w-full flex flex-wrap items-end justify-between gap-2"><h4 className="text-2xl font-black"><bdi>{p.name}</bdi></h4><span className="text-2xl font-black text-blue-600"><bdi>₪{p.monthly_price}</bdi><span className="text-sm font-medium text-[var(--text-secondary)]"> / {he?'חודש':'month'}</span></span></div>
            <p className="relative w-full mt-4 whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)] flex-1">{(he?p.description_he:p.description_en)|| (he?'פרטי המסלול יימסרו לאחר אישור.':'Plan details will be provided after confirmation.')}</p>
            <span className={`relative mt-6 inline-flex rounded-xl px-4 py-2 text-sm font-bold ${selected?'bg-blue-600 text-white':'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-sky-300'}`}>{selected?(he?'המסלול נבחר':'Selected'):(he?'לבחירת מחשב':'Choose a computer')}</span>
          </button>;
        })}
      </div>
      {plan&&<div className="rounded-2xl border border-blue-200 bg-[var(--bg-surface)] p-5 sm:p-6 shadow-sm space-y-3"><h4 className="text-lg font-bold">{he?'בחרו מחשב במסלול':'Choose a computer in'} <bdi>{plan.name}</bdi></h4><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{models.map(p=><button key={p.id} type="button" onClick={()=>onChoose(p,plan.id)} className="rounded-xl border border-[var(--border-line)] px-4 py-3 text-start font-semibold hover:border-blue-500 hover:text-blue-600"><bdi>{p.title[lang]}</bdi> · {he?'להמשך':'Continue'} →</button>)}</div></div>}
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] px-5 py-3 font-semibold text-blue-600 hover:border-blue-500">{he?<ArrowRight aria-hidden="true" className="h-4 w-4"/>:<ArrowLeft aria-hidden="true" className="h-4 w-4"/>}{he?'חזרה לבחירת מסלול':'Back to choose a path'}</button>
    </div>}
  </section>;
}
