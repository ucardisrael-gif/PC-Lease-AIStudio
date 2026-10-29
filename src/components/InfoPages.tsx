import React, { useState } from 'react';
import { ArrowUpRight, Mail, MessageSquare, Phone } from 'lucide-react';
import { Language, LaptopProduct } from '../types';
import { sectionDefaults } from '../data/section-defaults.mjs';

export type AboutBlock = { content: typeof sectionDefaults.about; version: number };
export type ContactBlock = { content: typeof sectionDefaults.contact; version: number };

type PendingInquiry = {id:string;name:string;email:string;phone:string;message:string;company:string;quantity:number|null;source:'contact'|'product';productSlug:string|null};
const inquiryStorageKey='pc-lease-contact-pending-v1';
function readPendingInquiry():PendingInquiry|null {
  try { const raw=sessionStorage.getItem(inquiryStorageKey); if(!raw)return null;const value=JSON.parse(raw);return value&&typeof value.id==='string'&&typeof value.name==='string'&&typeof value.email==='string'&&typeof value.phone==='string'&&typeof value.message==='string'&&typeof value.company==='string'&&(value.quantity===null||typeof value.quantity==='number')&&['contact','product'].includes(value.source)&&(value.productSlug===null||typeof value.productSlug==='string')?value:null; } catch { return null; }
}

export function AboutPage({ lang, block }: { lang: Language; block: AboutBlock }) {
  const c = block.content, he = lang === 'he';
  if (!c.visible) return null;
  return <main className="min-h-[65vh] py-16 sm:py-24 bg-[var(--bg-page)]"><div className="max-w-[1280px] mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-10 items-center">
    <div className="space-y-6"><span className="text-sm font-bold tracking-widest text-sky-600">{he ? c.kickerHe : c.kickerEn}</span>
      <h1 className="text-4xl sm:text-5xl font-black leading-tight text-[var(--text-primary)]">{he ? c.titleHe : c.titleEn}</h1>
      <p className="text-lg leading-relaxed text-[var(--text-secondary)]">{he ? c.bodyHe : c.bodyEn}</p>
      <p className="leading-relaxed text-[var(--text-secondary)]">{he ? c.detailHe : c.detailEn}</p>
      <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-700 text-white font-bold">{he ? c.ctaHe : c.ctaEn}<ArrowUpRight className="w-4 h-4" /></a>
    </div><div className="rounded-3xl overflow-hidden border border-[var(--border-line)] shadow-xl aspect-[16/10]"><img src={c.imageUrl} alt={lang === 'he' ? c.imageAltHe : c.imageAltEn} className="w-full h-full object-cover" /></div>
  </div></main>;
}

export function ContactPage({ lang, block, products, catalogStatus }: { lang: Language; block: ContactBlock; products:LaptopProduct[]; catalogStatus:'loading'|'ready'|'error' }) {
  const c = block.content, he = lang === 'he';
  const [pending,setPending]=useState<PendingInquiry|null>(readPendingInquiry);
  const [name, setName] = useState(()=>pending?.name||''), [email, setEmail] = useState(()=>pending?.email||''), [phone, setPhone] = useState(()=>pending?.phone||''), [message, setMessage] = useState(()=>pending?.message||'');
  const [company,setCompany]=useState(()=>pending?.company||''),[quantity,setQuantity]=useState(()=>pending?.quantity?.toString()||'');
  const [productSlug,setProductSlug]=useState(()=>pending?(pending.productSlug||''):(new URLSearchParams(window.location.search).get('product')||''));
  const product=products.find(item=>item.slug===productSlug);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'saved' | 'error' | 'uncertain'>(()=>pending?'uncertain':'idle');
  const [requestId,setRequestId] = useState(()=>crypto.randomUUID());
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (status === 'sending'||(!pending&&productSlug&&!product)) return; if(!email.trim()&&!phone.trim()){setStatus('error');return;}
    const payload:PendingInquiry=pending||{id:requestId,name,email,phone,message,company,quantity:quantity?Number(quantity):null,source:productSlug?'product':'contact',productSlug:productSlug||null};
    try {const stored=sessionStorage.getItem(inquiryStorageKey);if(stored&&stored!==JSON.stringify(payload)){setStatus('uncertain');return;}sessionStorage.setItem(inquiryStorageKey,JSON.stringify(payload));}catch{setStatus('error');return;}
    setPending(payload);setStatus('sending');
    try { const response = await fetch('/api/contact', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); if(response.status>=500)throw Error();if(!response.ok){if(!pending){sessionStorage.removeItem(inquiryStorageKey);setPending(null);setStatus('error');}else setStatus('uncertain');return;} const result=await response.json();if(result.received!==true)throw Error();sessionStorage.removeItem(inquiryStorageKey);setPending(null);setStatus(result.notification==='sent'?'sent':'saved'); setRequestId(crypto.randomUUID()); setName(''); setEmail(''); setPhone(''); setMessage(''); setCompany(''); setQuantity(''); }
    catch { setStatus('uncertain'); }
  };
  if(!c.visible){
    if(!pending&&status!=='sent'&&status!=='saved')return null;
    return <main className="min-h-[65vh] py-16 px-5"><form onSubmit={submit} className="max-w-xl mx-auto p-6 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-surface)] space-y-5">
      {pending?<><p role="alert">{he?'טופס יצירת הקשר אינו זמין כעת. ניתן לבדוק אם ההודעה הקודמת נשמרה.':'The contact form is currently unavailable. You can check whether your previous message was saved.'}</p>{status==='uncertain'&&<p>{he?'עדיין לא התקבל אישור.':'Confirmation has not yet been received.'}</p>}<button disabled={status==='sending'} className="px-7 py-3 rounded-lg bg-blue-700 text-white font-bold disabled:opacity-50">{status==='sending'?(he?'שולח…':'Checking…'):(he?'בדיקת ההודעה':'Check message')}</button><button type="button" disabled={status==='sending'} className="block underline text-sm" onClick={()=>{if(!window.confirm(he?'ייתכן שההודעה כבר נשמרה. למחוק את הניסיון מהדפדפן?':'The message may already have been saved. Remove this attempt from the browser?'))return;try{sessionStorage.removeItem(inquiryStorageKey);}catch{return;}setPending(null);setStatus('idle');}}>{he?'מחיקת הניסיון מהדפדפן':'Remove attempt from this browser'}</button></>:<p role="status">{status==='sent'?(he?c.successHe:c.successEn):(he?c.savedHe:c.savedEn)}</p>}
    </form></main>;
  }
  const input = 'w-full mt-2 px-4 py-3 rounded-xl border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-2 focus:outline-blue-600';
  return <main className="min-h-[65vh] py-16 sm:py-20 bg-[var(--bg-page)]"><div className="max-w-[1120px] mx-auto px-5 sm:px-8 grid lg:grid-cols-5 gap-10">
    <div className="lg:col-span-2 space-y-5"><div className="w-14 h-14 grid place-items-center bg-sky-500/10 text-sky-600 rounded-2xl"><MessageSquare /></div><h1 className="text-4xl sm:text-5xl font-black text-[var(--text-primary)]">{he ? c.titleHe : c.titleEn}</h1><p className="text-lg text-[var(--text-secondary)] leading-relaxed">{he ? c.bodyHe : c.bodyEn}</p>{c.publicEmail && <a href={`mailto:${c.publicEmail}`} className="flex items-center gap-2 text-sky-600"><Mail className="w-5 h-5" /><bdi>{c.publicEmail}</bdi></a>}{c.publicPhone && <a href={`tel:${c.publicPhone.replace(/[^+0-9]/g, '')}`} className="flex items-center gap-2 text-sky-600"><Phone className="w-5 h-5" /><bdi>{c.publicPhone}</bdi></a>}{c.publicWhatsApp && <a href={`https://wa.me/${c.publicWhatsApp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sky-600"><MessageSquare className="w-5 h-5" /><span>WhatsApp</span></a>}</div>
    <form onSubmit={submit} className="lg:col-span-3 p-6 sm:p-8 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-surface)] shadow-lg space-y-5">
      <fieldset disabled={!!pending||status==='sending'} className="space-y-5 disabled:opacity-75">
      {productSlug&&<div className="rounded-xl border border-[var(--border-line)] p-3 text-sm">{product?<p>{he?'שאלה על הדגם':'Question about model'}: <bdi>{product.model}</bdi></p>:<p>{catalogStatus==='loading'?(he?'טוען את הדגם…':'Loading model…'):(he?'לא ניתן לזהות את הדגם. ניתן להסירו ולהמשיך.':'The model could not be identified. Remove it to continue.')}</p>}<button type="button" className="underline text-blue-600" onClick={()=>setProductSlug('')}>{he?'הסרת הדגם':'Remove model'}</button></div>}
      <label className="block font-semibold text-sm text-[var(--text-primary)]">{he ? c.nameHe : c.nameEn} *<input className={input} required maxLength={200} value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label>
      <p className="text-sm">{he?'יש למלא דוא״ל או טלפון.':'Enter an email address or phone number.'}</p><div className="grid sm:grid-cols-2 gap-5"><label className="block font-semibold text-sm text-[var(--text-primary)]">{he ? c.emailHe : c.emailEn}<input className={input} type="email" maxLength={200} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" dir="ltr" /></label><label className="block font-semibold text-sm text-[var(--text-primary)]">{he ? c.phoneHe : c.phoneEn}<input className={input} type="tel" maxLength={80} value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" dir="ltr" /></label></div>
      <div className="grid sm:grid-cols-2 gap-5"><label className="block font-semibold text-sm text-[var(--text-primary)]">{he?c.companyHe:c.companyEn}<input className={input} maxLength={200} value={company} onChange={e=>setCompany(e.target.value)} autoComplete="organization" /></label><label className="block font-semibold text-sm text-[var(--text-primary)]">{he?c.quantityHe:c.quantityEn}<input className={input} type="number" min="1" max="100000" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} /></label></div>
      <label className="block font-semibold text-sm text-[var(--text-primary)]">{he ? c.messageHe : c.messageEn} *<textarea className={input} required maxLength={4000} rows={5} value={message} onChange={e => setMessage(e.target.value)} /></label>
      </fieldset>
      {status === 'sent' && <p role="status" className="text-emerald-600">{he ? c.successHe : c.successEn}</p>}{status === 'saved' && <p role="status" className="text-amber-700">{he ? c.savedHe : c.savedEn}</p>}{status === 'error' && <p role="alert" className="text-red-600">{he ? c.errorHe : c.errorEn}</p>}
      {status==='uncertain'&&<p role="alert" className="text-amber-700">{he?'לא התקבל אישור. ייתכן שההודעה נשמרה. נסו שוב כדי לבדוק את אותה הודעה בלי ליצור כפילות.':'Confirmation was not received. The message may have been saved. Retry the same message to check without creating a duplicate.'}</p>}
      <button disabled={status === 'sending'||!pending&&!!productSlug&&!product} className="inline-flex min-h-12 items-center justify-center px-7 py-3 rounded-lg bg-blue-700 text-white font-bold disabled:opacity-50">{status === 'sending' ? (he ? 'שולח…' : 'Sending…') : pending?(he?'ניסיון חוזר':'Retry message'):(he ? c.submitHe : c.submitEn)}</button>
      {pending&&status!=='sending'&&<button type="button" className="block underline text-sm" onClick={()=>{if(!window.confirm(he?'ייתכן שההודעה כבר נשמרה. התחלת הודעה חדשה עלולה ליצור כפילות. להמשיך?':'The message may already have been saved. Starting a new message could create a duplicate. Continue?'))return;try{sessionStorage.removeItem(inquiryStorageKey);}catch{return;}setPending(null);setRequestId(crypto.randomUUID());setStatus('idle');}}>{he?'התחלת הודעה חדשה':'Start a new message'}</button>}
    </form>
  </div></main>;
}
