import { useEffect, useRef, useState } from 'react';
import { Language } from '../../types';

type Note = { id:string; body:string; created_at:string; actor_email:string };

export function RequestNotes({ lang, requestId, account, inquiry=false }: { lang:Language; requestId:string; account:string; inquiry?:boolean }) {
  const endpoint=inquiry?'/api/admin/inquiries/notes':'/api/admin/requests/notes';
  const rtl = lang === 'he';
  const storageKey=`pc-lease:pending-note:${account.trim().toLowerCase()}:${inquiry?'inquiry':'request'}:${requestId}`;
  const draftKey=`pc-lease:note-draft:${account.trim().toLowerCase()}:${inquiry?'inquiry':'request'}:${requestId}`;
  const [draft] = useState(()=>{try{const value=sessionStorage.getItem(draftKey);return typeof value==='string'&&value.length<=2000?value:'';}catch{return '';}});
  const [draftUnsafe,setDraftUnsafe]=useState(false);
  const sectionRef=useRef<HTMLElement>(null);
  useEffect(()=>{if(!draftUnsafe)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};const confirmExit=(event:Event)=>{const target=event.target;if(!(target instanceof Element)||sectionRef.current?.contains(target))return;if(event.type==='click'&&!target.closest('button,a,select'))return;if(!window.confirm(rtl?'לא ניתן לשמור את טיוטת ההערה בדפדפן והיא עלולה ללכת לאיבוד. להמשיך?':'The note draft could not be retained and may be lost. Continue?')){event.preventDefault();event.stopImmediatePropagation();}};window.addEventListener('beforeunload',warn);document.addEventListener('click',confirmExit,true);document.addEventListener('submit',confirmExit,true);return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('click',confirmExit,true);document.removeEventListener('submit',confirmExit,true);};},[draftUnsafe,rtl]);
  const updateDraft=(value:string)=>{setBody(value);try{if(value)sessionStorage.setItem(draftKey,value);else sessionStorage.removeItem(draftKey);window.dispatchEvent(new Event('pc-lease:note-draft'));setDraftUnsafe(false);}catch{setDraftUnsafe(true);}};
  const [attempt] = useState<{id:string;body:string}|null>(()=>{try{const p=JSON.parse(sessionStorage.getItem(storageKey)||'null');return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p?.id||'')&&typeof p.body==='string'&&p.body.trim().length>0&&p.body.length<=2000?p:null;}catch{return null;}});
  const [open,setOpen] = useState(!!attempt || !!draft), [notes,setNotes] = useState<Note[]>([]), [offset,setOffset] = useState(0), [hasMore,setHasMore] = useState(false);
  const [cursors,setCursors]=useState<string[]>(['']);
  const [body,setBody] = useState(attempt?.body||draft), [noteId,setNoteId] = useState(() => attempt?.id||crypto.randomUUID()), [saving,setSaving] = useState(false), [error,setError] = useState(''), [revision,setRevision] = useState(0);
  const [unconfirmed,setUnconfirmed] = useState(!!attempt);
  const [listState,setListState] = useState<'loading'|'ready'|'error'>('loading');
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setListState('loading'); setNotes([]); setHasMore(false);
    fetch(`${endpoint}?requestId=${encodeURIComponent(requestId)}&before=${encodeURIComponent(cursors[offset/25]||'')}`, {signal:controller.signal})
      .then(async response => { if (!response.ok) throw Error(); return response.json(); })
      .then(data => { if (!controller.signal.aborted) { setNotes(data.notes); setHasMore(data.hasMore); setListState('ready'); } })
      .catch(() => { if (!controller.signal.aborted) setListState('error'); });
    return () => controller.abort();
  }, [open,requestId,offset,cursors,revision,rtl,endpoint]);
  const save = async () => {
    if (!body.trim() || saving) return;
    try {sessionStorage.setItem(storageKey,JSON.stringify({id:noteId,body}));window.dispatchEvent(new Event('pc-lease:pending-note'));} catch {setError(rtl?'לא ניתן לשמור את פרטי הניסיון בדפדפן. ההערה לא נשלחה.':'Could not retain the attempt in this browser. The note was not submitted.');return;}
    setUnconfirmed(true); setSaving(true); setError('');
    try {
      const response = await fetch(endpoint, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:noteId,requestId,body})});
      if (response.status === 400) { sessionStorage.removeItem(storageKey);window.dispatchEvent(new Event('pc-lease:pending-note')); setUnconfirmed(false); setError(rtl ? 'בדקו את תוכן ההערה ונסו שוב.' : 'Check the note and try again.'); return; }
      if (!response.ok) throw Error();
      sessionStorage.removeItem(draftKey);window.dispatchEvent(new Event('pc-lease:note-draft'));sessionStorage.removeItem(storageKey);window.dispatchEvent(new Event('pc-lease:pending-note')); setDraftUnsafe(false); setBody(''); setNoteId(crypto.randomUUID()); setUnconfirmed(false); setOffset(0); setCursors(['']); setRevision(n=>n+1);
    } catch { setUnconfirmed(true); setError(rtl ? 'השמירה לא אושרה. נסו שוב כדי לבדוק אם ההערה נשמרה.' : 'Save was not confirmed. Retry to check whether the note was saved.'); }
    finally { setSaving(false); }
  };
  return <section ref={sectionRef} className="border-t border-slate-200 dark:border-slate-700 pt-3">
    <button type="button" className="font-semibold text-blue-600 underline" aria-expanded={open} onClick={()=>setOpen(!open)}>{rtl?'הערות פנימיות לצוות':'Internal staff notes'}</button>
    {open && <div className="mt-3 space-y-3">
      <p className="text-slate-500">{rtl?'ההערות גלויות רק לעובדים בעלי הרשאה להזמנות ואינן נשלחות ללקוח.':'Visible only to staff with order access; not sent to the customer.'}</p>
      <label className="block font-semibold">{rtl?'הערה חדשה':'New note'}<textarea className="block mt-1 w-full rounded border border-slate-300 bg-white dark:bg-slate-900 p-2" maxLength={2000} value={body} disabled={saving || unconfirmed} onChange={e=>updateDraft(e.target.value)} /></label>
      {draftUnsafe && <p role="alert" className="text-red-600">{rtl?'לא ניתן לשמור טיוטה בדפדפן. הטקסט עלול ללכת לאיבוד בעת עזיבת המסך.':'This browser cannot retain the draft. The text may be lost when leaving this screen.'}</p>}
      <button type="button" disabled={!body.trim() || saving} onClick={save} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{rtl?'הוספת הערה':'Add note'}</button>
      {unconfirmed && <div role="status"><p>{rtl?'שמירת ההערה טרם אושרה. ניתן לנסות שוב ללא יצירת כפילות.':'Note save not confirmed. Retry safely without creating a duplicate.'}</p><p>{rtl?'מזהה ניסיון':'Attempt ID'}: <bdi>{noteId}</bdi></p><button type="button" disabled={saving} className="underline" onClick={()=>{if(window.confirm(rtl?'בדקתם את ההערות? פעולה זו אינה מוחקת הערה שכבר נשמרה.':'Have you checked the notes? This does not delete a note already saved.')){try{sessionStorage.setItem(draftKey,body);sessionStorage.removeItem(storageKey);window.dispatchEvent(new Event('pc-lease:note-draft'));window.dispatchEvent(new Event('pc-lease:pending-note'));}catch{setError(rtl?'לא ניתן לשמור את הטיוטה; הניסיון לא נוקה.':'Could not retain the draft; the attempt was not cleared.');return;}setDraftUnsafe(false);setUnconfirmed(false);setNoteId(crypto.randomUUID());setError('');}}}>{rtl?'לאחר בדיקה: ניקוי הניסיון':'After checking: clear attempt'}</button></div>}
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {listState==='loading'&&<p role="status">{rtl?'טוען הערות…':'Loading notes…'}</p>}
      {listState==='error'&&<p role="alert">{rtl?'לא ניתן לטעון את ההערות.':'Could not load notes.'} <button type="button" className="underline" onClick={()=>setRevision(n=>n+1)}>{rtl?'נסה שוב':'Retry notes'}</button></p>}
      {listState==='ready'&&!notes.length&&<p>{rtl?'אין הערות.':'No notes.'}</p>}
      {listState==='ready'&&notes.map(note=><article key={note.id} className="rounded border border-slate-200 dark:border-slate-700 p-3"><p className="whitespace-pre-wrap break-words">{note.body}</p><p className="text-xs text-slate-500 mt-2" dir="auto">{note.actor_email} · {new Date(note.created_at).toLocaleString()}</p></article>)}
      {listState==='ready'&&(offset>0 || hasMore) && <nav className="flex gap-2"><button type="button" disabled={!offset} onClick={()=>setOffset(n=>Math.max(0,n-25))} className="rounded border px-3 py-1 disabled:opacity-40">{rtl?'הקודם':'Previous'}</button><button type="button" disabled={!hasMore} onClick={()=>{const last=notes.at(-1);if(last){setCursors(old=>[...old.slice(0,offset/25+1),last.id]);setOffset(n=>n+25);}}} className="rounded border px-3 py-1 disabled:opacity-40">{rtl?'הבא':'Next'}</button></nav>}
    </div>}
  </section>;
}
