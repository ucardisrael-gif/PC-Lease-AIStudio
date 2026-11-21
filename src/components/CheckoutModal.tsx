import {ZoomImage} from './ZoomImage';
import {ExtrasPicker} from './ExtrasPicker';
import {SpecChips} from './ProductSpecifications';
import React, { useState, useRef, useEffect } from 'react';
import { X, CheckCircle, ShieldAlert, FileText, Send, Building, Laptop, Monitor, Shield, ShieldCheck, PackagePlus, UserRound, ChevronLeft, ChevronRight } from 'lucide-react';
import { ComputerPicker } from './ComputerPicker';
import { ProductImage } from './ProductImage';
import { AcquisitionMode, Language, LaptopProduct } from '../types';
import { TRANSLATIONS } from '../data/translations';
import {PendingOrder,writePendingOrder,clearPendingOrder} from '../domain/pendingOrder';
import { PrivacyNotice } from './Privacy';

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
  accountEmail?: string | null;
  siteHeader?: React.ReactNode;
  siteFooter?: React.ReactNode;
  headerOffset?: number;
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
  accountEmail,
  siteHeader,
  siteFooter,
  headerOffset = 0,
  onPendingChange,
  onClose,
}) => {
  const enablePlans=import.meta.env.VITE_LEASE_PLAN_CHOOSER === 'true';
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const touched = useRef({companyName:false,contactName:false,email:false,phone:false});
  const previousAccount = useRef<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const identity = accountEmail?.trim() || null;
    if (previousAccount.current && previousAccount.current !== identity) {
      if (!touched.current.companyName) setCompanyName('');
      if (!touched.current.contactName) setContactName('');
      if (!touched.current.email) setEmail('');
      if (!touched.current.phone) setPhone('');
    }
    previousAccount.current = identity;
    if (!identity) return () => controller.abort();
    if (!touched.current.email) setEmail(identity);
    fetch('/api/account/profile', {signal:controller.signal})
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({profile}) => {
        if (controller.signal.aborted || !profile) return;
        if (!touched.current.companyName) setCompanyName(typeof profile.company_name === 'string' ? profile.company_name : '');
        if (!touched.current.contactName) setContactName([profile.first_name,profile.last_name].filter(v=>typeof v==='string' && v.trim()).join(' '));
        if (!touched.current.phone) setPhone(typeof profile.phone === 'string' ? profile.phone : '');
      }).catch(() => {});
    return () => controller.abort();
  }, [accountEmail]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submittedNumber,setSubmittedNumber]=useState<string|null>(null);
  const [submitError, setSubmitError] = useState(false);
  const [submitUncertain, setSubmitUncertain] = useState(false);
  const [storageError,setStorageError]=useState(false);
  const [priceChanged, setPriceChanged] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const [lines, setLines] = useState(() => initialLines?.length ? initialLines.map(line=>!line.productSlug?{...line,productVersion:0}:line) : enablePlans && initialPlanId ? [{productSlug:'',productVersion:0,mode:'lease' as AcquisitionMode,quantity,rentalDays}] : [{ productSlug: product.slug, productVersion: product.editVersion, mode: mode === 'lease' && product.leaseTermMonths !== 36 ? 'short_rental' as AcquisitionMode : mode, quantity, rentalDays }]);
  const [addingModel,setAddingModel]=useState(false);
  const [showPicker,setShowPicker]=useState(initialLines ? !initialLines.some(line=>line.productSlug) : !product?.slug);
  const [step,setStep]=useState(0);
  const viewportRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{viewportRef.current?.scrollTo({top:0,behavior:'auto'});},[step]);
  type Plan={id:string;name:string;version:number;monthly_price:number;description_he:string;description_en:string;productSlugs:string[]};
  type Addon={id:string;version:number;category:string;image_path?:string;name_he:string;name_en:string;terms_he:string;terms_en:string;price:number;billing:'month'|'once'};
  const [options,setOptions]=useState<{plans:Plan[];addons:Addon[]}|null>(null),[planId,setPlanId]=useState(enablePlans?initialPlanId:''),[selectedAddons,setSelectedAddons]=useState<{id:string;version:number;quantity:number}[]>([]);
  useEffect(()=>{const c=new AbortController();fetch('/api/lease-options',{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject()).then(setOptions).catch(()=>{});return()=>c.abort();},[]);
  const inferredPlanApplied=useRef(false);
  useEffect(()=>{if(inferredPlanApplied.current||!options)return;inferredPlanApplied.current=true;if(!enablePlans||initialPlanId||lines.some(l=>l.mode!=='lease'))return;const matching=options.plans.filter(p=>lines.every(l=>p.productSlugs.includes(l.productSlug)));if(matching.length===1)setPlanId(matching[0].id);},[options,initialPlanId]);
  const selectedPlan=options?.plans.find(p=>p.id===planId);
  const incompatiblePlan=!!selectedPlan&&lines.some(line=>!!line.productSlug&&(line.mode!=='lease'||!selectedPlan.productSlugs.includes(line.productSlug)));
  const initialAddonApplied=useRef(false);
  useEffect(()=>{if(initialAddonApplied.current||!options||!initialAddonId)return;initialAddonApplied.current=true;const addon=options.addons.find(a=>a.id===initialAddonId);if(addon)setSelectedAddons([{id:addon.id,version:addon.version,quantity:1}]);},[initialAddonId,options,selectedPlan]);
  const selection=selectedPlan?{planId:selectedPlan.id,planVersion:selectedPlan.version,addons:selectedAddons}:selectedAddons.length?{planId:null,planVersion:null,addons:selectedAddons}:undefined;
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
    if ((planId && !selectedPlan) || incompatiblePlan || (!selectedPlan&&lines.some(line=>!line.productSlug))) return () => controller.abort();
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
    if(lines.some(line=>!Number.isInteger(line.productVersion)||(!line.productVersion&&!(selectedPlan&&line.productSlug===''))))return;
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
      ref={viewportRef}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-[var(--bg-page)]"
    >
      {siteHeader&&<div className="sticky top-0 z-40" onClickCapture={event=>{if(event.target instanceof Element&&event.target.closest('a')){if(isSubmitting||offerStatus==='busy'||submitUncertain){event.preventDefault();return;}handleResetAndClose();}}}>{siteHeader}</div>}
      <div className="relative mx-auto min-h-screen w-full max-w-5xl bg-[var(--bg-surface)] p-5 sm:p-10">
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

            <nav aria-label={lang==='he'?'שלבי ההזמנה':'Order steps'} style={{top:headerOffset}} className="sticky z-30 grid grid-cols-3 gap-2 rounded-xl bg-[var(--bg-surface)] py-2 shadow-sm">{[Laptop,PackagePlus,UserRound].map((Icon,i)=><button type="button" key={i} onClick={()=>{if(i<=step)setStep(i)}} aria-current={step===i?'step':undefined} disabled={i>step} className={`rounded-xl border px-2 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 ${step===i?'border-blue-500 bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-200':'border-[var(--border-line)] text-[var(--text-secondary)]'}`}><Icon aria-hidden="true" className="h-4 w-4 shrink-0"/><span>{lang==='he'?['מחשבים','תוספות','פרטים'][i]:['Computers','Extras','Details'][i]}</span></button>)}</nav>
            <div hidden={step!==0} className="space-y-4 rounded-2xl bg-gradient-to-br from-sky-50/60 via-white to-violet-50/60 p-2 sm:p-4 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
            {enablePlans&&options&&<section className="space-y-3 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-surface)] p-4"><h3 className="font-bold">{lang==='he'?'בחירה לפי מסלול ליסינג':'Choose a lease plan'}</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{options.plans.map(p=><button type="button" key={p.id} aria-pressed={planId===p.id} className={`min-h-14 w-full rounded-xl border px-4 py-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-40 ${planId===p.id?'border-blue-600 bg-blue-600 text-white shadow-sm':'border-sky-200 bg-sky-50 text-blue-700 hover:border-blue-500 hover:bg-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-200'}`} onClick={()=>{if(planId!==p.id){setLines(old=>[{productSlug:'',productVersion:0,mode:'lease',quantity:Math.min(1000,old.reduce((sum,line)=>sum+(line.quantity||0),0)||1),rentalDays:30}]);setAddingModel(false);setPlanId(p.id);}}} disabled={!products.some(x=>p.productSlugs.includes(x.slug)&&x.leaseTermMonths===36)}><bdi>{p.name}</bdi> · ₪{p.monthly_price}/{lang==='he'?'חודש':'month'}</button>)}</div>{planId&&<button type="button" className="text-sm text-blue-700 dark:text-sky-300 underline" onClick={()=>{setPlanId('');setSelectedAddons([]);setAddingModel(false);}}>{lang==='he'?'ביטול בחירת מסלול':'Clear plan selection'}</button>}{selectedPlan&&<p className="text-sm whitespace-pre-wrap">{lang==='he'?selectedPlan.description_he:selectedPlan.description_en}</p>}{incompatiblePlan&&<p role="status" className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">{lang==='he'?'חלק מהמחשבים שנבחרו אינם מתאימים למסלול הזה. בחרו דגם מתאים או חזרו למסלול הקודם.':'Some selected computers do not belong to this plan. Choose a compatible model or return to the previous plan.'}</p>}</section>}
            <div className="space-y-3 rounded-xl border border-[var(--border-line)] p-4">
              <h3 className="font-bold">{lang === 'he' ? 'המחשבים שבחרתם' : 'Your selected computers'}</h3>
              {(showPicker||!lines.some(line=>line.productSlug))&&<ComputerPicker lang={lang} products={products.filter(p=>p.published&&(!selectedPlan||(p.leaseTermMonths===36&&selectedPlan.productSlugs.includes(p.slug))))} selected={lines.map(l=>l.productSlug)} onRemove={p=>setLines(old=>old.length>1?old.filter(line=>line.productSlug!==p.slug):old.map(line=>({...line,productSlug:'',productVersion:0})))} onSelect={p=>{const existing=lines.findIndex(l=>l.productSlug===p.slug);if(existing>=0)return;setLines(old=>{const empty=old.findIndex(l=>!l.productSlug);const next={productSlug:p.slug,productVersion:p.editVersion,mode:selectedPlan?'lease' as AcquisitionMode:(p.leaseTermMonths===36?old[0].mode:'short_rental' as AcquisitionMode),quantity:empty>=0?old[empty].quantity:1,rentalDays:old[0].rentalDays||30};return empty>=0?old.map((row,i)=>i===empty?next:row):old.length<25?[...old,next]:old;});setAddingModel(false);setShowPicker(false);}}/>}
              {lines.map((line,index)=>{const item=products.find(p=>p.slug===line.productSlug);return <div key={index} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-line)] bg-[var(--bg-page)] p-3">{item&&<div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-white"><ProductImage product={item} lang={lang}/></div>}<div className="min-w-[140px] flex-1"><strong><bdi>{item?.title[lang]||(lang==='he'?'דגם ייבחר בהמשך':'Model to be selected later')}</bdi></strong>{item&&<SpecChips product={item} lang={lang}/>}{preview?.items[index]&&<p className="text-sm font-bold text-blue-600">{displayAmount(preview.items[index].periodTotalMinor)}{line.mode==='lease'?(lang==='he'?' לחודש':' / month'):''}</p>}{line.mode==='short_rental'&&<p className="text-xs">{lang==='he'?`השכרה ל־${line.rentalDays} ימים`:`Rental for ${line.rentalDays} days`}</p>}</div><label className="w-full sm:w-auto text-sm">{lang==='he'?'כמות':'Quantity'}<input type="number" min="1" max="1000" required value={line.quantity||''} onChange={e=>setLines(old=>old.map((r,i)=>i===index?{...r,quantity:Number(e.target.value)}:r))} className="block w-20 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] p-2"/></label>{line.productSlug&&<button type="button" className="text-sm text-blue-600 underline" onClick={()=>setLines(old=>old.length>1?old.filter((_,i)=>i!==index):old.map(r=>({...r,productSlug:'',productVersion:0})))}>{lang==='he'?'הסרת דגם':'Remove model'}</button>}</div>})}
              {lines.some(line=>line.productSlug)&&!showPicker&&<button type="button" onClick={()=>setShowPicker(true)} className="rounded-xl border border-sky-300 px-4 py-2 text-sm font-semibold text-blue-600">{lang==='he'?'+ הוספת מחשב':'+ Add computer'}</button>}
              {incompatiblePlan?null:!selectedPlan&&!lines.every(l=>l.productSlug)?<p role="status" className="text-sm text-[var(--text-secondary)]">{lang==='he'?'בחרו מחשב כדי לחשב את המחיר.':'Choose a computer to calculate the price.'}</p>:preview ? <div className="font-bold space-y-1">{lines.some(l => l.mode === 'lease') && <p>{lang === 'he' ? 'סה״כ חודשי לליסינג' : 'Monthly lease total'}: {displayAmount(selection?(preview.monthlyMinor??null):groupAmount('lease'))}</p>}{lines.some(l => l.mode === 'purchase') && <p>{lang === 'he' ? 'סה״כ רכישה' : 'Purchase total'}: {displayAmount(groupAmount('purchase'))}</p>}{[...new Set(lines.filter(l => l.mode === 'short_rental').map(l => l.rentalDays))].map(days => <p key={days}>{lang === 'he' ? `סה״כ השכרה ל־${days} ימים` : `Rental total (${days} days)`}: {displayAmount(groupAmount('short_rental', days))}</p>)}</div> : <p role="status">{previewError === 'price_unavailable' ? (lang === 'he' ? 'התעריף לא נשמר עבור אחד המסלולים. יש לעדכן אותו בניהול המוצרים.' : 'A rate for one of the selected plans has not been saved. Please update it in product administration.') : previewError ? (lang === 'he' ? 'לא ניתן לחשב; בדקו את הערכים או רעננו את הדף.' : 'Unable to calculate; check the values or refresh the page.') : (lang === 'he' ? 'מחשב מחיר…' : 'Calculating…')}</p>}
            </div>

            </div>
            <div hidden={step!==1} className="space-y-4 rounded-2xl bg-gradient-to-br from-sky-50/60 via-white to-amber-50/60 p-2 sm:p-4 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
            {options&&options.addons.length===0&&<p className="rounded-xl bg-[var(--bg-page)] p-4 text-sm">{lang==='he'?'אין כרגע תוספות זמינות.':'No extras are currently available.'}</p>}
            {options&&options.addons.length>0&&<ExtrasPicker lang={lang} addons={options.addons} selected={selectedAddons} onChange={setSelectedAddons}/>}
            <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-4 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800"><h3 className="mb-3 flex items-center gap-2 font-bold"><Laptop className="h-5 w-5 text-blue-600" aria-hidden="true"/>{lang==='he'?'המחשבים שבחרתם':'Selected computers'}</h3>{lines.map((line,i)=>{const item=products.find(p=>p.slug===line.productSlug);return <div key={i} className="flex flex-wrap justify-between gap-3 border-t border-[var(--border-line)] py-3 text-sm">{item&&<div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-white"><ProductImage product={item} lang={lang}/></div>}<div className="min-w-[140px] flex-1"><strong><bdi>{item?.title[lang]||(lang==='he'?'דגם ייבחר בהמשך':'Model to be selected later')}</bdi> × {line.quantity}</strong>{item&&<SpecChips product={item} lang={lang}/>}</div><strong>{preview?.items[i]?displayAmount(preview.items[i].periodTotalMinor):'—'}</strong></div>})}</div>
            {preview&&!!preview.oneTimeMinor&&<p className="font-bold">{lang==='he'?'תוספות חד פעמיות':'One-time extras'}: {displayAmount(preview.oneTimeMinor)}</p>}
            </div>
            <div hidden={step!==2} className="space-y-6 rounded-2xl bg-gradient-to-br from-violet-50/60 via-white to-sky-50/60 p-2 sm:p-4 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800"><div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-4 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800"><h3 className="mb-3 flex items-center gap-2 font-bold"><Laptop className="h-5 w-5 text-blue-600" aria-hidden="true"/>{lang==='he'?'המחשבים שבחרתם':'Selected computers'}</h3>{lines.map((line,i)=>{const item=products.find(p=>p.slug===line.productSlug);return <div key={i} className="flex flex-wrap justify-between gap-3 border-t border-[var(--border-line)] py-3 text-sm">{item&&<div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-white"><ProductImage product={item} lang={lang}/></div>}<div className="min-w-[140px] flex-1"><strong><bdi>{item?.title[lang]||(lang==='he'?'דגם ייבחר בהמשך':'Model to be selected later')}</bdi> × {line.quantity}</strong>{item&&<SpecChips product={item} lang={lang}/>}</div><strong>{preview?.items[i]?displayAmount(preview.items[i].periodTotalMinor):'—'}</strong></div>})}</div>
            <div className="rounded-xl bg-[var(--bg-page)] p-4 text-sm"><h3 className="font-bold mb-2">{lang==='he'?'סיכום הבחירה':'Your selection'}</h3>{selectedAddons.map(a=>{const extra=options?.addons.find(x=>x.id===a.id);return <div key={a.id} className="flex justify-between gap-3 border-b border-[var(--border-line)] py-2"><span className="flex items-center gap-3">{extra?.image_path?<span className="h-16 w-20 shrink-0"><ZoomImage src={extra.image_path} alt={(lang==='he'?extra.name_he:extra.name_en)||''} lang={lang}/></span>:<PackagePlus aria-hidden="true" className="h-8 w-8 text-blue-600"/>}<span>{lang==='he'?extra?.name_he:extra?.name_en} × {a.quantity}</span></span><strong>{extra?`₪${(extra.price*a.quantity).toLocaleString()}`:'—'}{extra?.billing==='once'?(lang==='he'?' · חד פעמי':' · one time'):''}</strong></div>})}{preview&&lines.some(l=>l.mode==='lease')&&<p className="mt-2 font-bold text-blue-600">{lang==='he'?'סה״כ חודשי':'Monthly total'}: {displayAmount(selection?(preview.monthlyMinor??null):groupAmount('lease'))}</p>}{preview&&[...new Set(lines.filter(l=>l.mode==='short_rental').map(l=>l.rentalDays))].map(days=><p key={days} className="font-bold">{lang==='he'?`השכרה ל־${days} ימים`:`Rental for ${days} days`}: {displayAmount(groupAmount('short_rental',days))}</p>)}{preview&&!!preview.oneTimeMinor&&<p>{lang==='he'?'תוספות חד פעמיות':'One-time extras'}: {displayAmount(preview.oneTimeMinor)}</p>}</div>
            <PrivacyNotice lang={lang}/>
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
                    onChange={(e) => { touched.current.companyName=true; setCompanyName(e.target.value); }}
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
                    onChange={(e) => { touched.current.contactName=true; setContactName(e.target.value); }}
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
                    onChange={(e) => { touched.current.email=true; setEmail(e.target.value); }}
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
                    onChange={(e) => { touched.current.phone=true; setPhone(e.target.value); }}
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
            </div>
            </fieldset>
            {step===1&&preview&&<div aria-live="polite" className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-4 text-sm font-bold text-blue-700 dark:text-blue-200">{lines.some(l=>l.mode==='lease')&&<p>{lang==='he'?'סה״כ חודשי':'Monthly total'}: {displayAmount(selection?(preview.monthlyMinor??null):groupAmount('lease'))}</p>}{!!preview.oneTimeMinor&&<p>{lang==='he'?'תוספות חד פעמיות':'One-time extras'}: {displayAmount(preview.oneTimeMinor)}</p>}</div>}
            {storageError && <p role="alert" className="text-sm text-red-600">{lang === 'he' ? 'לא ניתן לשמור את ניסיון ההזמנה בלשונית זו. ההזמנה לא נשלחה.' : 'The order attempt could not be saved in this tab. The order was not sent.'}</p>}
            {submitError && <p role="alert" className="text-sm text-red-600">{submitUncertain ? (lang === 'he' ? 'לא התקבל אישור. ייתכן שההזמנה נשמרה; אפשר לנסות שוב ללא שינוי הנתונים.' : 'Confirmation was not received. The order may have been saved; retry without changing the details.') : priceChanged ? (lang === 'he' ? 'המחיר השתנה. סגרו את החלון, רעננו את הדף ובדקו את המחיר לפני שליחה.' : 'The price changed. Close this window, refresh the page and review the price before submitting.') : (lang === 'he' ? 'לא ניתן לשמור את הבקשה. אפשר לנסות שוב.' : 'The request could not be saved. Please try again.')}</p>}
            {/* Submit Action */}
            <div className="sticky bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-3 flex items-center justify-between gap-3 shadow-sm">
              <button type="button" onClick={()=>step>0?setStep(step-1):handleResetAndClose()} className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold">{lang==='he'?<ChevronRight className="w-4 h-4"/>:<ChevronLeft className="w-4 h-4"/>}{lang==='he'?'חזרה':'Back'}</button>
              {step<2&&<button type="button" disabled={addingModel||!preview||isSubmitting||offerStatus==='busy'} onClick={()=>setStep(step+1)} className="ms-auto rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white disabled:opacity-40">{lang==='he'?'המשך':'Continue'} {lang==='he'?'←':'→'}</button>}
              {step===2&&<>
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
              </>}
            </div>
          </form>
        )}
      </div>
      {siteFooter&&<div onClickCapture={event=>{if(event.target instanceof Element&&event.target.closest('a')){if(isSubmitting||offerStatus==='busy'||submitUncertain){event.preventDefault();return;}handleResetAndClose();}}}>{siteFooter}</div>}
    </div>
  );
};
