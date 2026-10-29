import { useState } from 'react';
import { Language } from '../../types';
import { Reservations } from './Reservations';

export function RequestInventory({lang,requestId,account}:{lang:Language;requestId:string;account:string}) {
  const [open,setOpen] = useState(false);
  return <section className="border-t border-slate-200 dark:border-slate-700 pt-3">
    <button type="button" className="font-semibold text-blue-600 underline" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{lang==='he'?'מלאי ומסירה להזמנה':'Inventory and handover for this order'}</button>
    {open && <div className="mt-3"><Reservations lang={lang} requestId={requestId} account={account}/></div>}
  </section>;
}
