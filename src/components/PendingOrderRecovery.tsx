import React,{useState} from 'react';
import {Language} from '../types';
import {PendingOrder,clearPendingOrder} from '../domain/pendingOrder';

export function PendingOrderRecovery({lang,pending,onCleared}:{lang:Language;pending:PendingOrder;onCleared:()=>void}){
 const he=lang==='he';const [busy,setBusy]=useState(false),[error,setError]=useState(false),[result,setResult]=useState<{id:string;orderNumber:string|null;pdf:string}|null>(null);
 const retry=async()=>{if(busy)return;setBusy(true);setError(false);try{
  const r=await fetch('/api/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending)});if(!r.ok)throw Error();
  const data=await r.json();if(data.id!==pending.id||typeof data.pdf!=='string')throw Error();
  clearPendingOrder();setResult({id:data.id,orderNumber:data.orderNumber||null,pdf:data.pdf});
 }catch{setError(true);}finally{setBusy(false);}};
 const discard=()=>{if(!window.confirm(he?'ההזמנה עשויה כבר להיות שמורה. בדקו עמנו לפני יצירת הזמנה חדשה. למחוק את הניסיון השמור בדפדפן?':'The order may already be saved. Check with us before placing a new order. Remove this saved attempt from the browser?'))return;try{clearPendingOrder();onCleared();}catch{setError(true);}};
 const download=()=>{if(!result)return;const bytes=Uint8Array.from(atob(result.pdf),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download=`pc-lease-${result.orderNumber||result.id}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <section role="status" className="p-3 text-center bg-amber-100 text-slate-900 space-y-2">
  {result?<><p>{he?'ההזמנה אושרה ונשמרה.':'The order was confirmed and saved.'} {result.orderNumber&&<bdi>#{result.orderNumber}</bdi>}</p><button type="button" className="underline me-4" onClick={download}>{he?'הורדת PDF':'Download PDF'}</button><button type="button" className="underline" onClick={onCleared}>{he?'סגירה':'Dismiss'}</button></>:<><p>{he?'יש ניסיון הזמנה שלא אושר. הפרטים שמורים זמנית בלשונית זו; אפשר לנסות שוב בלי ליצור הזמנה כפולה.':'An order attempt was not confirmed. Its details are temporarily saved in this tab; retry it without creating a duplicate.'}</p><button type="button" className="underline me-4" disabled={busy} onClick={()=>void retry()}>{busy?(he?'בודק…':'Checking…'):(he?'בדיקה חוזרת של ההזמנה':'Retry the same order')}</button><button type="button" className="underline" disabled={busy} onClick={discard}>{he?'מחיקת הניסיון מהדפדפן':'Remove saved attempt'}</button>{error&&<p role="alert">{he?'לא ניתן לאשר את ההזמנה. בדקו עמנו לפני יצירת הזמנה חדשה.':'The order could not be confirmed. Check with us before placing a new order.'}</p>}</>}
 </section>;
}
