import { useState } from 'react';
import { Language } from '../../types';
import { FinanceSummary } from './FinanceSummary';

export function RequestFinance({lang,requestId,onShowRecords}:{lang:Language;requestId:string;onShowRecords?:(id:string)=>void}) {
 const [open,setOpen]=useState(false);
 return <section className="border-t border-slate-200 dark:border-slate-700 pt-3">
   <button type="button" className="font-semibold text-blue-600 underline" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{lang==='he'?'סיכום רישומים כספיים':'Financial records summary'}</button>
   {open&&<div className="mt-3"><FinanceSummary lang={lang} requestId={requestId} onShowRecords={onShowRecords}/></div>}
 </section>;
}
