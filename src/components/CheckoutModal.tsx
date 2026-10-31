import React, { useState, useRef, useEffect } from 'react';
import { X, CheckCircle, ShieldAlert, FileText, Send, Building } from 'lucide-react';
import { AcquisitionMode, Language, LaptopProduct } from '../types';
import { TRANSLATIONS } from '../data/translations';
import {PendingOrder,writePendingOrder,clearPendingOrder} from '../domain/pendingOrder';

interface CheckoutModalProps {
  lang: Language;
  isOpen: boolean;
  product: LaptopProduct;
  products: LaptopProduct[];
  mode: AcquisitionMode;
  quantity: number;
  rentalDays?: number;
  initialPlanId?: string;
  initialAddonId?: string;
  initialLines?: {productSlug:string; productVersion?:number; mode:AcquisitionMode; quantity:number; rentalDays:number}[];
  onPendingChange: (order:PendingOrder|null)=>void;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  lang,
  isOpen,
  product,
  products,
  mode,
  quantity,
  rentalDays = 30,
  initialPlanId = '',
  initialAddonId = '',
  initialLines,
  onPendingChange,
  onClose,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submittedNumber,setSubmittedNumber]=useState<string|null>(null);
  const [submitError, setSubmitError] = useState(false);
  const [submitUncertain, setSubmitUncertain] = useState(false);
  const [storageError,setStorageError]=useState(false);
  const [priceChanged, setPriceChanged] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const [lines, setLines] = useState(() => initialLines?.length ? initialLines : [{ productSlug: product.slug, productVersion: product.editVersion, mode: mode === 'lease' && product.leaseTermMonths !== 36 ? 'short_rental' as AcquisitionMode : mode, quantity, rentalDays }]);
  const [addingModel,setAddingModel]=useState(false);
  type Plan={id:string;name:string;version:number;monthly_price:number;description_he:string;description_en:string;productSlugs:string[]};
  type Addon={id:string;version:number;name_he:string;name_en:string;terms_he:string;terms_en:string;price:number;billing:'month'|'once'};
  const [options,setOptions]=useState<{plans:Plan[];addons:Addon[]}|null>(null),[planId,setPlanId]=useState(initialPlanId),[selectedAddons,setSelectedAddons]=useState<{id:string;version:number;quantity:number}[]>([]);
  useEffect(()=>{const c=new AbortController();fetch('/api/lease-options',{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject()).then(setOptions).catch(()=>{});return()=>c.abort();},[]);
  const selectedPlan=options?.plans.find(p=>p.id===planId);
  const initialAddonApplied=useRef(false);
  useEffect(()=>{if(initialAddonApplied.current||!selectedPlan||!options||!initialAddonId)return;initialAddonApplied.current=true;const addon=options.addons.find(a=>a.id===initialAddonId);if(addon)setSelectedAddons([{id:addon.id,version:addon.version,quantity:1}]);},[initialAddonId,options,selectedPlan]);
  const selection=selectedPlan?{planId:selectedPlan.id,planVersion:selectedPlan.version,addons:selectedAddons}:undefined;
  type Preview = { totalMinor: number | null; monthlyMinor?:number|null;oneTimeMinor?:number;items: { periodTotalMinor: number | null; contractTotalMinor: number | null; period: string; termMonths: number | null }[] };
  const [previewState, setPreviewState] = useState<{key:string;data:Preview}|null>(null);
  const [previewFailure, setPreviewFailure] = useState<{key:string;error:string}|null>(null);
  const linesKey=JSON.stringify({lines,selection});
  const preview=previewState?.key===linesKey?previewState.data:null;
  const previewError=previewFailure?.key===linesKey?previewFailure.error:'';
  const [pdfData, setPdfData] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [offerStatus, setOfferStatus] = useState<'idle' | 'busy' | 'sent' | 'error' | 'invalid_email'>('idle');
  const offerMarker='pc-lease:offer-email-unconfirmed';
  const [offerUncertain,setOfferUncertain]=useState(()=>{try{return sessionStorage.getItem(offerMarker)==='1';}catch{return false;}});
  const [offerStorageError,setOfferStorageError]=useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setPreviewState(null); setPreviewFailure(null);
    if (planId && !selectedPlan) return () => controller.abort();
    fetch(selection?'/api/lease-selection/preview':'/api/quote/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selection?{...selection,lines}:{lines}), signal: controller.signal })
      .then(async r => { const data = await r.json(); if (!r.ok) throw Error(data.error || 'unavailable'); return data; })
      .then(data => { if (!controller.signal.aborted) setPreviewState({key:linesKey,data:selection?{...data.quote,monthlyMinor:data.monthlyMinor,oneTimeMinor:data.oneTimeMinor}:data}); }).catch(error => { if (!controller.signal.aborted) setPreviewFailure({key:linesKey,error:error.message || 'unavailable'}); });
    return () => controller.abort();
  }, [linesKey]);

  useEffect(() => {
    if (!isSubmitting && !submitUncertain) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isSubmitting, submitUncertain]);

  if (!isOpen) return null;

  const t = TRANSLATIONS[lang];
  const displayAmount = (amount: number | null) => amount === null ? (lang === 'he' ? 'מחיר לפי בקשה' : 'Price on request') : `₪${(amount / 100).toLocaleString()}`;
  const groupAmount = (mode: AcquisitionMode, days?: number) => {
    const items = preview?.items.filter((_, i) => lines[i]?.mode === mode && (mode !== 'short_rental' || lines[i]?.rentalDays === days)) ?? [];
    return items.some(item => item.periodTotalMinor === null) ? null : items.reduce((sum, item) => sum + (item.periodTotalMinor ?? 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addingModel || isSubmitting || offerStatus === 'busy' || (planId && !selectedPlan) || !preview || !companyName.trim() || !contactName.trim() || !email.trim() || !phone.trim()) return;
    const id = requestId.current ?? crypto.randomUUID();
    requestId.current = id;
    if(lines.some(line=>!Number.isInteger(line.productVersion)||!line.productVersion))return;
    const attempt:PendingOrder={id,lines:lines.map(line=>({...line,productVersion:line.productVersion!})),lang,source:'website',companyName,contactName,email,phone,taxId,city,notes,...(selection?{leaseSelection:selection}:{})};
    try{writePendingOrder(attempt);}catch{setStorageError(true);return;}
    onPendingChange(attempt);setStorageError(false);setIsSubmitting(true);setSubmitError(false);
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt),
      });
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && !submitUncertain) {
          const body=await response.json().catch(()=>({}));
          setPriceChanged(body.error==='price_changed');clearPendingOrder();onPendingChange(null);requestId.current=null;setSubmitError(true);return;
        }
        throw new Error('Request result unknown');
      }
      const result = await response.json();
      if(result.id!==id||typeof result.pdf!=='string')throw Error('Request result unknown');
      clearPendingOrder();onPendingChange(null);
      setSubmitUncertain(false);
      setNotificationStatus(result.notification);
      setPdfData(result.pdf);
      setSubmittedRef(result.id); setSubmittedNumber(result.orderNumber || null);
    } catch { setSubmitUncertain(true);setSubmitError(true); }
    finally { setIsSubmitting(false); }
  };

  const handleResetAndClose = () => {
    if (isSubmitting || offerStatus === 'busy') return;
    if (submitUncertain && !window.confirm(lang === 'he' ? 'ייתכן שההזמנה נשמרה. ניתן לבדוק אותה שוב מההודעה בראש האתר. לסגור?' : 'The order may have been saved. You can retry it from the message at the top of the site. Close?')) return;
    setSubmittedRef(null); setSubmittedNumber(null);
    setSubmitError(false);
    setSubmitUncertain(false);
    setPriceChanged(false);
    setNotificationStatus(null);
    requestId.current = null;
    onClose();
  };

  const downloadPdf = () => {
    if (!pdfData || !submittedRef) return;
    const bytes = Uint8Array.from(atob(pdfData), c => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const link = document.createElement('a'); link.href = url; link.download = `pc-lease-${submittedNumber || submittedRef}.pdf`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const getOffer = async (kind: 'pdf' | 'email') => {
    if (!preview || offerStatus === 'busy' || kind === 'email' && offerUncertain) return;
    if (!formRef.current?.reportValidity()) return;
    const recipient = email.trim();
    if (kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) { setOfferStatus('invalid_email'); return; }
    if(kind==='email'){try{sessionStorage.setItem(offerMarker,'1');setOfferStorageError(false);}catch{setOfferStorageError(true);return;}}
    setOfferStatus('busy');
    try {
      const response = await fetch(`/api/offer/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines, lang, ...(selection?{leaseSelection:selection}:{}),contact: { companyName: companyName.trim(), contactName: contactName.trim(), email: recipient, phone: phone.trim(), taxId: taxId.trim(), city: city.trim() } }) });
      if (!response.ok) {
        const body=await response.json().catch(()=>({}));
        if(['mail_unavailable','invalid_input','invalid_contact','invalid_quote','invalid_price','price_unavailable','price_changed','product_unavailable','invalid_email','forbidden','rate_limit'].includes(body.error)){if(kind==='email')sessionStorage.removeItem(offerMarker);throw new Error('offer_failed');}
        throw new Error('offer_uncertain');
      }
      if (kind === 'pdf') {
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a'); link.href = url; link.download = 'pc-lease-estimate.pdf'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setOfferStatus('idle');
      } else {const result=await response.json();if(result.sent!==true)throw new Error('offer_uncertain');sessionStorage.removeItem(offerMarker);setOfferStatus('sent');}
    } catch(error) { if(kind==='email' && (!(error instanceof Error)||error.message!=='offer_failed')){setOfferUncertain(true);setOfferStatus('idle');}else setOfferStatus('error'); }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-2xl p-5 sm:p-8 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-4 end-4 p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedRef ? (
          /* Success Screen */
          <div className="text-center py-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              {lang === 'he' ? 'ההזמנה התקבלה' : 'Order received'}
            </h3>

            <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              {lang === 'he' ? 'ההזמנה נשמרה ותיבדק. לא נדרש תשלום כעת.' : 'Your order was saved for review. No payment is required now.'}
            </p>

            {notificationStatus !== 'sent' && <p role="status" className="text-sm text-[var(--text-secondary)]">{lang === 'he' ? 'הבקשה נשמרה, אך הודעת הדוא״ל טרם אושרה.' : 'The request was saved, but the email notification has not been confirmed.'}</p>}
            <div className="p-4 rounded-xl bg-[var(--bg-page)] border border-sky-500/30 max-w-xs mx-auto">
              <span className="text-xs uppercase font-bold text-[var(--text-secondary)] block">
                {t.checkout.refNumber}
              </span>
              <span className="text-2xl font-mono font-black text-sky-600 dark:text-sky-400 mt-1 block">
                {submittedNumber || submittedRef}
              </span>
            </div>

            <div className="pt-4">
              <button type="button" onClick={downloadPdf} disabled={!pdfData} className="px-6 py-2.5 me-3 text-sm font-bold border border-sky-500 text-sky-600 rounded-md">{lang === 'he' ? 'הורדת סיכום PDF' : 'Download PDF summary'}</button>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 rounded-md shadow transition-colors cursor-pointer"
              >
                {t.checkout.closeBtn}
              </button>
            </div>
          </div>
        ) : (
          /* Order & Quotation Form */
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            <fieldset disabled={isSubmitting || submitUncertain || offerStatus === 'busy'} className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25 mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-sky-500" />
                <span>{lang === 'he' ? 'ללא תשלום בשלב זה' : 'No payment at this stage'}</span>
              </div>

              <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                {lang === 'he' ? 'בחירת מחשבים והזמנה' : 'Choose computers and order'}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                {lang === 'he' ? 'בחרו דגמים, הורידו הצעה או שלחו הזמנה ללא תשלום.' : 'Choose models, download an estimate or place an order without payment.'}
              </p>
            </div>

            {options&&<section className="space-y-3 rounded-xl border border-[var(--border-line)] p-4"><h3 className="font-bold">{lang==='he'?'בחירה לפי מסלול ליסינג':'Choose a lease plan'}</h3><div className="flex flex-wrap gap-2">{options.plans.map(p=><button type="button" key={p.id} aria-pressed={planId===p.id} className={`rounded-xl border px-4 py-3 ${planId===p.id?'bg-blue-600 text-white':''}`} onClick={()=>{const available=products.filter(x=>p.productSlugs.includes(x.slug)&&x.leaseTermMonths===36);if(!available.length)return;if((lines.length>1||!p.productSlugs.includes(lines[0].productSlug)||lines[0].mode!=='lease')&&!window.confirm(lang==='he'?'בחירת המסלול תחליף את המחשבים בבקשה. להמשיך?':'Selecting this plan replaces the computers in the request. Continue?'))return;const next=available.find(x=>x.slug===lines[0].productSlug)||available[0];setLines([{productSlug:next.slug,productVersion:next.editVersion,mode:'lease',quantity:lines.length===1?lines[0].quantity:1,rentalDays:30}]);setSelectedAddons([]);setPlanId(p.id);}} disabled={!products.some(x=>p.productSlugs.includes(x.slug)&&x.leaseTermMonths===36)}><bdi>{p.name}</bdi> · ₪{p.monthly_price}/{lang==='he'?'חודש':'month'}</button>)}{planId&&<button type="button" className="underline" onClick={()=>{setPlanId('');setSelectedAddons([]);}}>{lang==='he'?'ביטול בחירת מסלול':'Clear plan selection'}</button>}</div>{selectedPlan&&<p className="text-sm whitespace-pre-wrap">{lang==='he'?selectedPlan.description_he:selectedPlan.description_en}</p>}</section>}
            <div className="space-y-3 rounded-xl border border-[var(--border-line)] p-4">
              <h3 className="font-bold">{lang === 'he' ? 'מחשבים בבקשה' : 'Computers in this request'}</h3>
              {lines.map((line, index) => <div key={index} className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <label className="col-span-2">{lang === 'he' ? 'דגם' : 'Model'}<select value={line.productSlug} onChange={e => { const p = products.find(x => x.slug === e.target.value); if (p) setLines(rows => rows.map((r, i) => i === index ? { ...r, productSlug: p.slug, productVersion: p.editVersion, mode: r.mode === 'lease' && p.leaseTermMonths !== 36 ? 'short_rental' : r.mode } : r)); }} className="w-full p-2 rounded border border-[var(--border-line)] bg-[var(--bg-page)]">{products.filter(p=>!selectedPlan||(p.leaseTermMonths===36&&selectedPlan.productSlugs.includes(p.slug))).map(p => <option key={p.id} value={p.slug}>{p.title[lang]}</option>)}</select></label>
                <label>{lang === 'he' ? 'מסלול' : 'Plan'}<select disabled={!!selectedPlan} value={line.mode} onChange={e => setLines(rows => rows.map((r, i) => i === index ? { ...r, mode: e.target.value as AcquisitionMode } : r))} className="w-full p-2 rounded border border-[var(--border-line)] bg-[var(--bg-page)]"><option value="lease" disabled={products.find(p=>p.slug===line.productSlug)?.leaseTermMonths !== 36}>{lang === 'he' ? 'ליסינג' : 'Lease'}</option><option value="short_rental">{lang === 'he' ? 'השכרה' : 'Rental'}</option></select></label>
                <label>{lang === 'he' ? 'כמות' : 'Quantity'}<input type="number" min="1" max="1000" required value={line.quantity || ''} onChange={e => setLines(rows => rows.map((r, i) => i === index ? { ...r, quantity: Number(e.target.value) } : r))} className="w-full p-2 rounded border border-[var(--border-line)] bg-[var(--bg-page)]" /></label>
                {line.mode === 'short_rental' && <label>{lang === 'he' ? 'ימים' : 'Days'}<input type="number" min="7" max="365" required value={line.rentalDays || ''} onChange={e => setLines(rows => rows.map((r, i) => i === index ? { ...r, rentalDays: Number(e.target.value) } : r))} className="w-full p-2 rounded border border-[var(--border-line)] bg-[var(--bg-page)]" /></label>}
                <div className="col-span-2 flex items-end gap-3"><span>{preview?.items[index] && `${displayAmount(preview.items[index].periodTotalMinor)}${line.mode === 'lease' && preview.items[index].periodTotalMinor !== null ? (lang === 'he' ? ' / חודש' : ' / month') : ''}`}</span>{lines.length > 1 && <button type="button" className="underline text-red-500" onClick={() => setLines(rows => rows.filter((_, i) => i !== index))}>{lang === 'he' ? 'הסר' : 'Remove'}</button>}</div>
              </div>)}
              {!addingModel ? <button type="button" disabled={lines.length >= 25 || !products.some(p=>!lines.some(l=>l.productSlug===p.slug)&&(!selectedPlan||(p.leaseTermMonths===36&&selectedPlan.productSlugs.includes(p.slug))))} className="underline text-sky-600 disabled:opacity-40" onClick={()=>setAddingModel(true)}>{lang==='he'?'+ הוספת דגם':'+ Add model'}</button> : <label className="block text-sm">{lang==='he'?'בחרו דגם נוסף':'Choose another model'}<select aria-label={lang==='he'?'בחרו דגם נוסף':'Choose another model'} value="" onChange={e=>{const p=products.find(x=>x.slug===e.target.value);if(!p)return;setLines(old=>[...old,{productSlug:p.slug,productVersion:p.editVersion,mode:p.leaseTermMonths===36?old[0].mode:'short_rental',quantity:1,rentalDays:old[0].rentalDays||30}]);setAddingModel(false);}} className="block w-full rounded border border-[var(--border-line)] bg-[var(--bg-page)] p-2"><option value="" disabled>{lang==='he'?'בחרו דגם':'Select a model'}</option>{products.filter(p=>!lines.some(l=>l.productSlug===p.slug)&&(!selectedPlan||(p.leaseTermMonths===36&&selectedPlan.productSlugs.includes(p.slug)))).map(p=><option key={p.slug} value={p.slug}>{p.title[lang]}</option>)}</select><button type="button" className="underline" onClick={()=>setAddingModel(false)}>{lang==='he'?'ביטול':'Cancel'}</button></label>}
              {preview ? <div className="font-bold space-y-1">{lines.some(l => l.mode === 'lease') && <p>{lang === 'he' ? 'סה״כ חודשי לליסינג' : 'Monthly lease total'}: {displayAmount(selectedPlan?(preview.monthlyMinor??null):groupAmount('lease'))}</p>}{lines.some(l => l.mode === 'purchase') && <p>{lang === 'he' ? 'סה״כ רכישה' : 'Purchase total'}: {displayAmount(groupAmount('purchase'))}</p>}{[...new Set(lines.filter(l => l.mode === 'short_rental').map(l => l.rentalDays))].map(days => <p key={days}>{lang === 'he' ? `סה״כ השכרה ל־${days} ימים` : `Rental total (${days} days)`}: {displayAmount(groupAmount('short_rental', days))}</p>)}</div> : <p role="status">{previewError === 'price_unavailable' ? (lang === 'he' ? 'התעריף לא נשמר עבור אחד המסלולים. יש לעדכן אותו בניהול המוצרים.' : 'A rate for one of the selected plans has not been saved. Please update it in product administration.') : previewError ? (lang === 'he' ? 'לא ניתן לחשב; בדקו את הערכים או רעננו את הדף.' : 'Unable to calculate; check the values or refresh the page.') : (lang === 'he' ? 'מחשב מחיר…' : 'Calculating…')}</p>}
            </div>

            {selectedPlan&&options&&options.addons.length>0&&<section className="space-y-3 rounded-xl border border-[var(--border-line)] p-4"><h3 className="font-bold">{lang==='he'?'מוצרים ושירותים נוספים':'Optional products and services'}</h3>{options.addons.map(a=>{const selected=selectedAddons.find(x=>x.id===a.id);return <div key={a.id} className="rounded-xl border border-[var(--border-line)] p-3"><label className="flex gap-2 items-center"><input type="checkbox" checked={!!selected} onChange={e=>setSelectedAddons(old=>e.target.checked?[...old,{id:a.id,version:a.version,quantity:1}]:old.filter(x=>x.id!==a.id))}/><strong>{lang==='he'?a.name_he:a.name_en}</strong> · ₪{a.price}/{a.billing==='month'?(lang==='he'?'חודש':'month'):(lang==='he'?'חד פעמי':'one time')}</label><p className="text-sm whitespace-pre-wrap text-[var(--text-secondary)]">{lang==='he'?a.terms_he:a.terms_en}</p>{selected&&<label>{lang==='he'?'כמות':'Quantity'} <input className="w-20 rounded border p-1" type="number" min="1" max="1000" value={selected.quantity||''} required onChange={e=>setSelectedAddons(old=>old.map(x=>x.id===a.id?{...x,quantity:Number(e.target.value)}:x))}/></label>}</div>})}{preview&&!!preview.oneTimeMinor&&<p className="font-bold">{lang==='he'?'תוספות חד פעמיות':'One-time extras'}: {displayAmount(preview.oneTimeMinor)}</p>}</section>}
            {/* Customer Details Form */}
            <div className="space-y-4">
              <h3 className="font-bold">{lang === 'he' ? 'פרטי הלקוח' : 'Your details'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {t.checkout.companyName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="שם החברה / עסק בע״מ"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {t.checkout.contactName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="שם מלא של איש הקשר"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {t.checkout.email} *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {t.checkout.phone} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="050-1234567"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {t.checkout.taxId}
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="51-XXXXXXX-X"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {t.checkout.city}
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="למשל: תל אביב, הרצליה, חיפה"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  {t.checkout.notes}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="דרישות למשלוח, מועד אספקה רצוי או תצורת תוכנה..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--border-line)] p-4">
              <h3 className="font-bold">{lang === 'he' ? 'שמירת הצעת מחיר' : 'Keep a price estimate'}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{lang === 'he' ? 'הורדה או שליחה של ההצעה אינה יוצרת הזמנה.' : 'Downloading or emailing an estimate does not place an order.'}</p>
              <button type="button" disabled={addingModel || !preview || offerStatus === 'busy'} onClick={() => getOffer('pdf')} className="px-4 py-2 rounded-lg border border-sky-500 text-sky-600 font-semibold">{lang === 'he' ? 'הורדת הצעה כ-PDF' : 'Download estimate PDF'}</button>
              <button type="button" disabled={addingModel || !preview || offerStatus === 'busy' || offerUncertain} onClick={() => getOffer('email')} className="px-4 py-2 rounded-lg border border-sky-500 text-sky-600 font-semibold">{offerStatus === 'busy' ? (lang === 'he' ? 'שולח…' : 'Sending…') : (lang === 'he' ? 'שליחת ההצעה אליי' : 'Email me the estimate')}</button>
              {offerStatus === 'sent' && <p role="status" className="text-sm text-emerald-600">{lang === 'he' ? 'ההצעה נשלחה לדוא״ל.' : 'The estimate was sent to your email.'}</p>}
              {offerStatus === 'invalid_email' && <p role="alert" className="text-sm text-red-600">{lang === 'he' ? 'יש להזין כתובת דוא״ל תקינה.' : 'Enter a valid email address.'}</p>}
              {offerStatus === 'error' && <p role="alert" className="text-sm text-red-600">{lang === 'he' ? 'לא ניתן להשלים את הפעולה. נסו שוב.' : 'The action could not be completed. Please try again.'}</p>}
              {offerStorageError && <p role="alert" className="text-sm text-red-600">{lang === 'he' ? 'לא ניתן לשמור את מצב השליחה בלשונית זו. ההצעה לא נשלחה.' : 'The send status could not be saved in this tab. The estimate was not sent.'}</p>}
              {offerUncertain && <p role="alert" className="text-sm text-amber-600">{lang === 'he' ? 'לא התקבל אישור לשליחה. ייתכן שההצעה נשלחה; בדקו את תיבת הדוא״ל לפני ניסיון נוסף.' : 'Delivery was not confirmed. The estimate may have been sent; check your email before trying again.'} <button type="button" className="underline" onClick={()=>{try{sessionStorage.removeItem(offerMarker);setOfferUncertain(false);setOfferStorageError(false);}catch{setOfferStorageError(true);}}}>{lang === 'he' ? 'בדקתי את הדוא״ל' : 'I checked my email'}</button></p>}
            </div>

            <p className="text-xs text-[var(--text-secondary)]">{lang === 'he' ? 'הזמינות והתנאים כפופים לאישור.' : 'Availability and terms require confirmation.'}</p>
            </fieldset>
            {storageError && <p role="alert" className="text-sm text-red-600">{lang === 'he' ? 'לא ניתן לשמור את ניסיון ההזמנה בלשונית זו. ההזמנה לא נשלחה.' : 'The order attempt could not be saved in this tab. The order was not sent.'}</p>}
            {submitError && <p role="alert" className="text-sm text-red-600">{submitUncertain ? (lang === 'he' ? 'לא התקבל אישור. ייתכן שההזמנה נשמרה; אפשר לנסות שוב ללא שינוי הנתונים.' : 'Confirmation was not received. The order may have been saved; retry without changing the details.') : priceChanged ? (lang === 'he' ? 'המחיר השתנה. סגרו את החלון, רעננו את הדף ובדקו את המחיר לפני שליחה.' : 'The price changed. Close this window, refresh the page and review the price before submitting.') : (lang === 'he' ? 'לא ניתן לשמור את הבקשה. אפשר לנסות שוב.' : 'The request could not be saved. Please try again.')}</p>}
            {/* Submit Action */}
            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {t.checkout.cancelBtn}
              </button>

              <button
                type="submit"
                disabled={addingModel || isSubmitting || offerStatus === 'busy' || !preview}
                className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 rounded-md shadow transition-all active:scale-[0.98] cursor-pointer"
              >
                {isSubmitting ? (
                  <span>{t.checkout.submitting}</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{submitUncertain ? (lang === 'he' ? 'ניסיון חוזר לאותה הזמנה' : 'Retry the same order') : (lang === 'he' ? 'להזמנה' : 'Order')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
