import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Store } from 'lucide-react';
import { Language } from '../types';
import { CustomerOrders } from './CustomerOrders';
import { CustomerProfile } from './CustomerProfile';

type User = { email: string; role: 'admin' | 'customer'; permissions?: string[]; displayName?: string | null;emailVerified?:boolean;dealerAccess?:boolean };
type RequestRecord = { id: string; created_at: string; quantity: number; notification_status: string; contact_json: { companyName: string; contactName: string; email: string; phone: string; notes: string }; product_snapshot_json: { model: string }; tariff_snapshot_json: { mode: string } };
interface Props { lang: Language; isOpen: boolean; onClose: () => void; admin?: boolean; onAdminAccess?: (email: string) => void; onSessionChange?: (user: User | null) => void; onOpenAdmin?:()=>void; onOpenDealer?:()=>void; }

export const ClientLoginModal: React.FC<Props> = ({ lang, isOpen, onClose, admin = false, onAdminAccess, onSessionChange, onOpenAdmin, onOpenDealer }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registration,setRegistration]=useState({firstName:'',lastName:'',phone:'',companyName:''});
  const [page, setPage] = useState<'login' | 'register' | 'forgot' | 'reset' | 'verify'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<RequestRecord[] | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [verifyToken,setVerifyToken]=useState('');
  const [showMyOrders,setShowMyOrders]=useState(false);
  const [showProfile,setShowProfile]=useState(false);
  const [profileUnsafe,setProfileUnsafe]=useState(false);
  const he = lang === 'he';
  const allowProfileExit=()=>!profileUnsafe||window.confirm(he?'יש שינויים בפרופיל שלא נשמרו או שהשמירה טרם הושלמה. להמשיך?':'Profile changes are unsaved or saving is still in progress. Continue?');
  useEffect(() => {
    const processLink=()=>{const match=window.location.hash.match(/^#reset=([a-f0-9]{64})$/);if(match){setResetToken(match[1]);setPage('reset');history.replaceState(null,'',location.pathname+location.search);return;}const verification=window.location.hash.match(/^#verify=([a-f0-9]{64})$/);if(verification){setVerifyToken(verification[1]);setPage('verify');history.replaceState(null,'',location.pathname+location.search);}};
    processLink();window.addEventListener('hashchange',processLink);return()=>window.removeEventListener('hashchange',processLink);
  }, []);
  useEffect(() => {
    if (!isOpen) { setUser(null);setShowMyOrders(false);setShowProfile(false);setRequests(null);return; }
    const controller=new AbortController();fetch('/api/auth/me',{signal:controller.signal}).then(r => r.ok ? r.json() : Promise.reject()).then(data => { setUser(data.user); onSessionChange?.(data.user); }).catch(() => {if(!controller.signal.aborted)setMessage(he ? 'השירות אינו זמין' : 'Service unavailable');});return()=>controller.abort();
  }, [isOpen, he]);
  if (!isOpen) return null;
  const post = async (path: string, data: object) => {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error('failed');
    return response.json();
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage('');
    try {
      if (page === 'login') { const result = await post('/api/auth/login', { email, password }); setUser(result.user); onSessionChange?.(result.user); setPassword(''); onClose(); }
      else if (page === 'register') { await post('/api/auth/register', { email, password,...registration }); setPage('login'); setPassword('');setRegistration({firstName:'',lastName:'',phone:'',companyName:''}); setMessage(he ? 'החשבון נוצר. אפשר להתחבר.' : 'Account created. You can now sign in.'); }
      else if (page === 'forgot') { await post('/api/auth/reset-request', { email }); setMessage(he ? 'אם החשבון קיים ושירות הדוא״ל זמין, ייתכן שיישלח קישור לאיפוס. בדקו את תיבת הדואר ונסו שוב מאוחר יותר אם לא התקבל.' : 'If the account exists and email service is available, a reset link may be sent. Check your inbox and try again later if it does not arrive.'); }
      else if (page === 'verify') { await post('/api/auth/verify-email',{token:verifyToken});setPage('login');setVerifyToken('');const response=await fetch('/api/auth/me');if(response.ok){const data=await response.json();setUser(data.user);onSessionChange?.(data.user);}setMessage(he?'כתובת הדוא״ל אומתה.':'Email address verified.'); }
      else { await post('/api/auth/reset', { token: resetToken, password }); setPage('login'); setPassword(''); setResetToken(''); setMessage(he ? 'הסיסמה עודכנה. אפשר להתחבר.' : 'Password updated. You can now sign in.'); }
    } catch { setMessage(he ? 'הפעולה נכשלה. בדקו את הפרטים ונסו שוב.' : 'The action failed. Check your details and try again.'); }
    finally { setLoading(false); }
  };
  const loadRequests = async () => {
    try { const response = await fetch('/api/admin/requests'); if (!response.ok) throw new Error(); setRequests((await response.json()).requests); }
    catch { setMessage(he ? 'לא ניתן לטעון בקשות.' : 'Could not load requests.'); }
  };
  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-md">
    <div className="relative w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
      <button onClick={()=>{if(allowProfileExit())onClose();}} aria-label="Close" className="absolute top-4 end-4 p-2"><X className="w-5 h-5" /></button>
      <h2 className="text-2xl font-black mb-4">{admin ? (he ? 'ניהול האתר' : 'Administration') : (he ? 'חשבון לקוח' : 'Customer account')}</h2>
      {user && page!=='verify' ? <div className="space-y-4">
        <p className="text-sm">{user.email} · {user.role}</p>
        {!admin&&<div className="text-sm"><p>{user.emailVerified?(he?'כתובת הדוא״ל אומתה':'Email verified'):(he?'כתובת הדוא״ל טרם אומתה':'Email not yet verified')}</p>{!user.emailVerified&&<button type="button" disabled={loading} className="underline text-blue-600" onClick={async()=>{setLoading(true);setMessage('');try{await post('/api/auth/verification-request',{lang});setMessage(he?'נשלח קישור לאימות כתובת הדוא״ל.':'A verification link was sent.');}catch{setMessage(he?'לא ניתן לשלוח קישור. נסו שוב מאוחר יותר.':'Could not send the link. Try again later.');}finally{setLoading(false);}}}>{he?'שליחת קישור לאימות':'Send verification link'}</button>}</div>}
        {!admin&&<><button type="button" className="underline text-blue-600 me-4" onClick={()=>{if(!showProfile||allowProfileExit())setShowProfile(value=>!value);}}>{he?'הפרטים שלי':'My profile'}</button>{showProfile&&<CustomerProfile key={user.email} lang={lang} onUnsafeChange={setProfileUnsafe} onSessionChange={next=>{setUser(next);onSessionChange?.(next);}}/>}</>}
        {!admin&&<><button type="button" className="underline text-blue-600" onClick={()=>setShowMyOrders(value=>!value)}>{he?'ההזמנות שלי':'My orders'}</button>{showMyOrders&&<CustomerOrders key={user.email} lang={lang}/>}</>}
        {!admin&&(user.role==='admin'||!!user.permissions?.length||user.dealerAccess)&&<div className="flex flex-wrap gap-2 border-t border-[var(--border-line)] pt-4">
          {(user.role==='admin'||!!user.permissions?.length)&&<button type="button" onClick={()=>{if(allowProfileExit()){onClose();onOpenAdmin?.();}}} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 font-semibold text-blue-600"><ShieldCheck aria-hidden="true" className="w-4 h-4"/>{he?'ניהול':'Administration'}</button>}
          {user.dealerAccess&&<button type="button" onClick={()=>{if(allowProfileExit()){onClose();onOpenDealer?.();}}} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 font-semibold text-blue-600"><Store aria-hidden="true" className="w-4 h-4"/>{he?'אזור שותפים':'Dealer workspace'}</button>}
        </div>}
        {admin && user.role !== 'admin' && <p className="text-sm">{he ? 'אין הרשאת מנהל לחשבון זה.' : 'This account does not have administrator access.'}</p>}
        {admin && user.role === 'admin' && <div className="flex gap-3 flex-wrap"><button onClick={loadRequests} className="px-4 py-2 rounded bg-[var(--accent)] text-white">{he ? 'בקשות שמורות' : 'Saved requests'}</button><button onClick={() => onAdminAccess?.(user.email)} className="px-4 py-2 rounded border border-[var(--border-line)]">{he ? 'Back Office' : 'Back Office'}</button></div>}
        {requests && <div className="space-y-3">{requests.length === 0 && <p>{he ? 'אין בקשות.' : 'No requests.'}</p>}{requests.map(r => <div key={r.id} className="p-4 rounded border border-[var(--border-line)] text-sm space-y-1"><p>{r.product_snapshot_json.model} · {r.quantity} · {r.tariff_snapshot_json.mode}</p><p>{r.contact_json.companyName} · {r.contact_json.contactName}</p><p><bdi>{r.contact_json.email} · {r.contact_json.phone}</bdi></p><p>{r.contact_json.notes}</p><p className="text-xs text-[var(--text-secondary)]">{new Date(r.created_at).toLocaleString()} · {r.notification_status}</p></div>)}</div>}
        <button onClick={async () => { if(!allowProfileExit())return;try { await post('/api/auth/logout', {}); setUser(null); onSessionChange?.(null); setRequests(null); setShowMyOrders(false); } catch { setMessage(he ? 'לא ניתן להתנתק.' : 'Could not sign out.'); } }} className="underline text-sm">{he ? 'התנתקות' : 'Sign out'}</button>
      </div> : <form onSubmit={submit} className="space-y-4">
        {page==='register'&&<div className="grid sm:grid-cols-2 gap-3">{([['firstName','שם פרטי','First name','given-name',true],['lastName','שם משפחה','Last name','family-name',true],['phone','טלפון','Phone','tel',true],['companyName','חברה (לא חובה)','Company (optional)','organization',false]] as const).map(([key,h,en,autocomplete,required])=><label key={key} className="block text-sm">{he?h:en}<input className="mt-1 w-full px-3 py-2 rounded border border-[var(--border-line)] bg-[var(--bg-page)]" type={key==='phone'?'tel':'text'} autoComplete={autocomplete} maxLength={200} required={required} value={registration[key]} onChange={e=>setRegistration({...registration,[key]:e.target.value})}/></label>)}</div>}
        {page !== 'reset' && page!=='verify' && <label className="block text-sm">{he ? 'דוא״ל' : 'Email'}<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 rounded border border-[var(--border-line)] bg-[var(--bg-page)]" /></label>}
        {page !== 'forgot' && page!=='verify' && <label className="block text-sm">{he ? 'סיסמה (לפחות 12 תווים)' : 'Password (at least 12 characters)'}<input type="password" required minLength={page === 'login' ? undefined : 12} autoComplete={page === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full px-3 py-2 rounded border border-[var(--border-line)] bg-[var(--bg-page)]" /></label>}
        <button disabled={loading} className="px-5 py-2 rounded bg-[var(--accent)] text-white">{loading ? '…' : page === 'login' ? (he ? 'התחברות' : 'Sign in') : page === 'register' ? (he ? 'יצירת חשבון' : 'Create account') : page === 'forgot' ? (he ? 'שליחת קישור' : 'Send reset link') : page==='verify'?(he?'אימות כתובת דוא״ל':'Confirm email'):(he ? 'שמירת סיסמה' : 'Save password')}</button>
        <div className="flex gap-3 flex-wrap text-sm"><button type="button" onClick={() => { setPage('login'); setMessage(''); }} className="underline">{he ? 'התחברות' : 'Sign in'}</button><button type="button" onClick={() => { setPage('register'); setMessage(''); }} className="underline">{he ? 'הרשמה' : 'Register'}</button><button type="button" onClick={() => { setPage('forgot'); setMessage(''); }} className="underline">{he ? 'שכחתי סיסמה' : 'Forgot password'}</button></div>
      </form>}
      {message && <p role="status" className="mt-4 text-sm text-[var(--text-secondary)]">{message}</p>}
    </div>
  </div>;
};
