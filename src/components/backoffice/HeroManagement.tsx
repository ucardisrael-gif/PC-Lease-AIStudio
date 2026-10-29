import {SiteHistory,mergeHistoricalContent} from './SiteHistory';
import { SiteImageUpload } from './SiteImageUpload';
import React, { useEffect, useState } from 'react';
import { Language } from '../../types';
import { HeroBlock, HeroContent } from '../HeroSection';

export function HeroManagement({ lang, onSaved, onDirtyChange }: { lang: Language; onSaved: (value: HeroBlock) => void; onDirtyChange?: (section:string, dirty:boolean)=>void }) {
  const [block, setBlock] = useState<HeroBlock | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error' | 'conflict' | 'uncertain' | 'saved'>('loading');
  const [uploading,setUploading] = useState(false);
  const [savedContent,setSavedContent]=useState<string|null>(null);
  const he = lang === 'he';
  const load = () => { setStatus('loading'); fetch('/api/admin/site/hero').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(data => { setBlock(data); setSavedContent(JSON.stringify(data.content)); setStatus('ready'); }).catch(() => setStatus('error')); };
  useEffect(load, []);
  const unprotected=status==='saving'||status==='uncertain'||status==='conflict'||uploading||!!block&&savedContent!==null&&JSON.stringify(block.content)!==savedContent;
  useEffect(()=>{onDirtyChange?.('hero',unprotected);return()=>onDirtyChange?.('hero',false);},[onDirtyChange,unprotected]);
  useEffect(()=>{if(!unprotected)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[unprotected]);
  const groups = [
    ['kicker', 'כותרת קטנה', 'Eyebrow'], ['title', 'כותרת ראשית', 'Headline'], ['accent', 'שורת כותרת שנייה', 'Second headline'],
    ['imageAlt', 'תיאור תמונה לנגישות (רשות)', 'Image description for accessibility (optional)'],
    ['body', 'תיאור', 'Description'], ['primary', 'כפתור ראשון', 'First button'], ['secondary', 'כפתור שני', 'Second button'], ['note', 'שורת מידע', 'Information line'],
  ];
  const save = async () => {
    if (!block) return; setStatus('saving');
    try {
      const r = await fetch('/api/admin/site/hero', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(block) });
      if (r.status === 409) { setStatus('conflict'); return; }
      if (!r.ok) throw Error();
      const data = await r.json(); setBlock(data); setSavedContent(JSON.stringify(data.content)); onSaved(data); setStatus('saved');
    } catch { setStatus('uncertain'); }
  };
  const change = (key: keyof HeroContent, value: string | boolean) => { if (block) { setBlock(current => current ? { ...current, content: { ...current.content, [key]: value } } : current); if (status !== 'conflict' && status !== 'uncertain') setStatus('ready'); } };
  return <section className="mb-8 p-5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
    <h2 className="text-lg font-bold">{he ? 'עריכת מסך ראשי' : 'Edit main banner'}</h2>
    <p className="mt-1 mb-4 text-sm text-[var(--text-secondary)]">{he ? 'שמרו שינויים כדי להציג אותם באתר.' : 'Save changes to show them on the site.'}</p>
    {status === 'loading' && <p>{he ? 'טוען...' : 'Loading...'}</p>}
    {status === 'error' && <p role="alert" className="text-red-500">{he ? 'לא ניתן לטעון או לשמור. בדקו את הנתונים ונסו שוב.' : 'Could not load or save. Check the fields and try again.'}</p>}
    {status === 'conflict' && <p role="alert" className="text-red-500">{he ? 'התוכן השתנה. טענו מחדש לפני שמירה.' : 'Content changed elsewhere. Reload before saving.'}</p>}
    {status === 'uncertain' && <p role="alert" className="text-red-500">{lang === 'he' ? 'השמירה לא אושרה וייתכן שהצליחה. בדקו את התוכן השמור לפני ניסיון נוסף.' : 'Save not confirmed and may have succeeded. Check saved content before trying again.'}</p>}
    {(status === 'error' || status === 'conflict' || status === 'uncertain') && <button type="button" className="underline my-2" onClick={() => { if (!block || window.confirm(lang === 'he' ? 'טעינה מחדש תחליף את הנתונים בטופס. להמשיך?' : 'Reloading replaces the values in the form. Continue?')) load(); }}>{he ? 'טען מחדש' : 'Reload'}</button>}
    {block && <><fieldset disabled={status === 'saving' || status === 'loading'}>
      <label className="flex items-center gap-2 mb-4 text-sm"><input type="checkbox" checked={block.content.visible} onChange={e => change('visible', e.target.checked)} />{he ? 'הצג באתר' : 'Show on site'}</label>
      <SiteImageUpload lang={lang} onBusy={setUploading} onUploaded={path=>change('imageUrl',path)} />
      {block.content.imageUrl.startsWith('/api/media/') && <img src={block.content.imageUrl} alt={he?'תצוגה מקדימה של התמונה':'Image preview'} className="max-h-48 max-w-full object-contain rounded mb-3" />}
      <label className="block text-xs font-semibold mb-3">{he ? 'כתובת תמונה (HTTPS או קובץ אתר)' : 'Image address (HTTPS or site asset)'}<input dir="ltr" type="text" maxLength={500} value={block.content.imageUrl} onChange={e => change('imageUrl', e.target.value)} className="mt-1 w-full p-2 rounded border border-[var(--border-line)] bg-[var(--bg-page)]" /></label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">{(['primaryAction', 'secondaryAction'] as const).map((field, index) => <label key={field} className="text-xs font-semibold">{he ? `יעד כפתור ${index + 1}` : `Button ${index + 1} destination`}<select value={block.content[field]} onChange={e => change(field, e.target.value)} className="mt-1 w-full p-2 rounded border border-[var(--border-line)] bg-[var(--bg-page)]"><option value="calculator">{he ? 'מחשבון' : 'Calculator'}</option><option value="models">{he ? 'דגמים' : 'Models'}</option><option value="contact">{he ? 'יצירת קשר' : 'Contact'}</option></select></label>)}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{groups.flatMap(([key, labelHe, labelEn]) => (['He', 'En'] as const).map(suffix => {
        const field = `${key}${suffix}` as keyof HeroContent;
        return <label key={field} className="text-xs font-semibold">{he ? labelHe : labelEn} · {suffix === 'He' ? 'עברית' : 'English'}<textarea dir={suffix === 'He' ? 'rtl' : 'ltr'} maxLength={500} value={String(block.content[field])} onChange={e => change(field, e.target.value)} className="mt-1 w-full min-h-16 p-2 rounded border border-[var(--border-line)] bg-[var(--bg-page)]" /></label>;
      }))}</div>
      </fieldset><button type="button" disabled={uploading || status === 'saving' || status === 'loading' || status === 'conflict' || status === 'uncertain' || Object.entries(block.content).some(([key,v]) => typeof v === 'string' && !v.trim() && !['imageAltHe','imageAltEn'].includes(key))} onClick={save} className="mt-4 px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{status === 'saving' ? (he ? 'שומר...' : 'Saving...') : (he ? 'שמור' : 'Save')}</button>
      {status === 'saved' && <span role="status" className="ms-3 text-green-600">{he ? 'נשמר' : 'Saved'}</span>}
      <SiteHistory lang={lang} blockKey={'hero'} revision={block.version} disabled={status==='saving'||status==='loading'||status==='conflict'||status==='uncertain'} onLoad={old=>{setBlock(current=>current?{...current,content:mergeHistoricalContent(current.content,old)}:current);setStatus('ready');}} />
    </>}
  </section>;
}
