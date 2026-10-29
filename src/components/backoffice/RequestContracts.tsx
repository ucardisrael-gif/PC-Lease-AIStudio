import { useEffect, useState } from 'react';
import { Language } from '../../types';
import { ContractDocuments } from './ContractDocuments';

type Draft = { id:string; title:string; version:number; updated_at:string; reviews:{version:number;actor_email:string;created_at:string}[] };
export function RequestContracts({lang,account,requestId,onManage,onOpen}:{lang:Language;account:string;requestId:string;onManage:()=>void;onOpen:(id:string)=>void}) {
  const he=lang==='he';
  const [open,setOpen]=useState(false),[rows,setRows]=useState<Draft[]>([]),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(false),[reload,setReload]=useState(0);
  const [cursors,setCursors]=useState<string[]>(['']),[cursorSupported,setCursorSupported]=useState(false),[invalidCursor,setInvalidCursor]=useState(false);
  useEffect(()=>{setOffset(0);setCursors(['']);},[requestId]);
  useEffect(()=>{
    if(!open)return;
    const c=new AbortController();setLoading(true);setError(false);setRows([]);setMore(false);
    const cursor=cursorSupported&&offset>0?cursors[offset/25]:'';const query=new URLSearchParams({requestId,offset:String(cursor?0:offset)});if(cursor)query.set('before',cursor);
    fetch(`/api/admin/contracts?${query}`,{signal:c.signal}).then(r=>{if(!r.ok){if(!c.signal.aborted&&r.status===400&&!!cursor)setInvalidCursor(true);throw Error();}return r.json();}).then(data=>{if(c.signal.aborted)return;setInvalidCursor(false);setCursorSupported(data.cursorSupported===true);setRows(data.drafts);setMore(data.hasMore);setLoading(false);}).catch(()=>{if(!c.signal.aborted){setError(true);setLoading(false);}});
    return()=>c.abort();
  },[open,requestId,offset,reload]);
  return <section className="border-t border-slate-200 dark:border-slate-700 pt-3">
    <button type="button" className="font-semibold text-blue-600 underline" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{he?'טיוטות חוזה להזמנה':'Contract drafts for this order'}</button>
    {open&&<div className="mt-3 space-y-3"><button type="button" className="underline text-blue-600" onClick={onManage}>{he?'ניהול טיוטות להזמנה':'Manage drafts for this order'}</button><p className="text-slate-500">{he?'טיוטות פנימיות בלבד, אינן חוזים חתומים.':'Internal drafts only; these are not signed contracts.'}</p>
      {loading&&<p role="status">{he?'טוען…':'Loading…'}</p>}{error&&<p role="alert" className="text-red-600">{he?'לא ניתן לטעון טיוטות.':'Could not load drafts.'} <button type="button" className="underline" onClick={()=>{if(invalidCursor){setOffset(0);setCursors(['']);setInvalidCursor(false);}setReload(n=>n+1);}}>{he?'נסה שוב':'Retry'}</button></p>}
      {!loading&&!error&&!rows.length&&<p>{he?'אין טיוטות להזמנה זו.':'No drafts for this order.'}</p>}
      {!loading&&!error&&rows.map(d=>{const review=d.reviews.find(r=>r.version===d.version);return <div key={d.id} className="rounded border p-3"><p className="font-semibold">{d.title||(he?'טיוטה ללא כותרת':'Untitled draft')}</p><button type="button" className="underline text-blue-600" onClick={()=>onOpen(d.id)}>{he?'פתיחת טיוטה':'Open draft'}</button><p>{he?'גרסה':'Version'} {d.version} · {new Date(d.updated_at).toLocaleString()}</p><p>{review?<>{he?'גרסה זו נבדקה באופן פנימי':'This version was internally reviewed'} · <bdi>{review.actor_email}</bdi> · {new Date(review.created_at).toLocaleString()}</>:(he?'גרסה זו טרם נבדקה פנימית':'This version has not been internally reviewed')}</p><p className="text-sm text-slate-500">{he?'בדיקה פנימית אינה חתימה או אישור משפטי.':'Internal review is not a signature or legal approval.'}</p><a className="text-blue-600 underline" href={`/api/admin/contracts/${d.id}/versions/${d.version}/pdf?lang=${lang}`}>{he?'הורדת טיוטה PDF':'Download draft PDF'}</a><ContractDocuments key={`${d.id}-${d.version}`} lang={lang} account={account} contractId={d.id} version={d.version}/></div>})}
      {!loading&&!error&&(offset>0||more)&&<nav className="flex gap-3"><button type="button" disabled={!offset||loading} onClick={()=>setOffset(n=>Math.max(0,n-25))}>{he?'הקודם':'Previous'}</button><button type="button" disabled={!more||loading} onClick={()=>{if(cursorSupported&&rows.length)setCursors(old=>[...old.slice(0,offset/25+1),rows[rows.length-1].id]);setOffset(n=>n+25);}}>{he?'הבא':'Next'}</button></nav>}
    </div>}
  </section>;
}
