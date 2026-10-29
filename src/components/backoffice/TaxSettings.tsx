import React, { useEffect, useState } from 'react';
import {TaxHistory} from './TaxHistory';

export function TaxSettings({lang,onUnprotectedChange}:{lang:string;onUnprotectedChange:(value:boolean)=>void}) {
  const he=lang==='he';
  const [value,setValue]=useState('');
  const [version,setVersion]=useState<number|null>(null);
  const [original,setOriginal]=useState('');
  const [uncertain,setUncertain]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const load=async()=>{
    setBusy(true);
    try { const r=await fetch('/api/admin/tax-settings'); if(!r.ok)throw Error(); const d=await r.json();const current=String(d.settings.vat_basis_points/100);setValue(current);setOriginal(current);setVersion(d.settings.version);setUncertain(false);setMessage(''); }
    catch {setVersion(null);setMessage(he?'לא ניתן לטעון את ההגדרות.':'Could not load settings.');} finally{setBusy(false);}
  };
  useEffect(()=>{void load();},[]);
  const unprotected=busy||uncertain||(version!==null&&value!==original);
  useEffect(()=>{onUnprotectedChange(unprotected);return()=>onUnprotectedChange(false);},[unprotected,onUnprotectedChange]);
  useEffect(()=>{if(!unprotected)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[unprotected]);
  const save=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(busy||uncertain||version===null)return;
    if(!/^\d{1,3}(?:\.\d{1,2})?$/.test(value)||Number(value)>100){setMessage(he?'יש להזין שיעור בין 0 ל־100 עם עד שתי ספרות אחרי הנקודה.':'Enter a rate between 0 and 100 with at most two decimal places.');return;}
    setBusy(true);setMessage('');
    try {const r=await fetch('/api/admin/tax-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vatBasisPoints:Math.round(Number(value)*100),version})});if(r.status===409){setVersion(null);setUncertain(true);setMessage(he?'ההגדרות השתנו. טענו מחדש לפני שמירה.':'Settings changed elsewhere. Reload before saving.');return;}if(r.status>=500)throw Error();if(!r.ok){setMessage(he?'לא ניתן לשמור הגדרות. בדקו את הנתונים וההרשאות.':'Could not save settings. Check the details and access.');return;}const d=await r.json();const current=String(d.settings.vat_basis_points/100);setVersion(d.settings.version);setValue(current);setOriginal(current);setUncertain(false);setMessage(he?'ההגדרות נשמרו.':'Settings saved.');}
    catch {setVersion(null);setUncertain(true);setMessage(he?'השמירה לא אומתה. טענו מחדש לפני ניסיון נוסף.':'Save not confirmed. Reload settings before trying again.');}finally{setBusy(false);}
  };
  return <section className="space-y-4 max-w-xl"><h2 className="font-bold text-xl">{he?'שיעור מע״מ':'VAT rate'}</h2><p className="text-sm text-slate-500">{he?'המחירים נשארים סופיים וכוללים מע״מ. השינוי חל על פירוט המס בחישובים חדשים בלבד; הזמנות קודמות לא משתנות.':'Prices remain final and include VAT. Changes affect the tax breakdown in new calculations only; saved orders remain unchanged.'}</p><form onSubmit={save} className="space-y-4"><label className="block">{he?'שיעור מע״מ באחוזים':'VAT rate (%)'}<input className="block w-full rounded border p-2 dark:bg-slate-900" inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)} disabled={busy||version===null} required /></label><button className="rounded bg-blue-600 text-white px-4 py-2" disabled={busy||version===null}>{he?'שמירה':'Save settings'}</button></form>{message&&<p role="status">{message}</p>}{version===null&&!busy&&<button className="underline" onClick={()=>{if(!uncertain||window.confirm(he?'לטעון את הערך הנוכחי מהשרת ולהחליף את הקלט?':'Load the current server value and replace your input?'))void load();}}>{he?'טעינה מחדש':'Reload settings'}</button>}<TaxHistory he={he} revision={version}/></section>;
}
