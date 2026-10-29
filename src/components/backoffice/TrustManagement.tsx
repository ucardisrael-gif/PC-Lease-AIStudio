import {SiteHistory,mergeHistoricalContent} from './SiteHistory';
import React, { useEffect, useState } from 'react';
import { Language } from '../../types';
import { TrustBlock, TrustContent } from '../TrustSection';

export function TrustManagement({ lang, onSaved, onDirtyChange }: { lang: Language; onSaved: (block: TrustBlock) => void; onDirtyChange?: (section:string, dirty:boolean)=>void }) {
  const [block, setBlock] = useState<TrustBlock | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error' | 'conflict' | 'uncertain' | 'saved'>('loading');
  const [savedContent,setSavedContent]=useState<string|null>(null);
  const rtl = lang === 'he';
  const load = () => {
    setStatus('loading');
    fetch('/api/admin/site/trust').then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then(data => { setBlock(data); setSavedContent(JSON.stringify(data.content)); setStatus('ready'); }).catch(() => setStatus('error'));
  };
  useEffect(load, []);
  const unprotected=status==='saving'||status==='uncertain'||status==='conflict'||!!block&&savedContent!==null&&JSON.stringify(block.content)!==savedContent;
  useEffect(()=>{onDirtyChange?.('trust',unprotected);return()=>onDirtyChange?.('trust',false);},[onDirtyChange,unprotected]);
  useEffect(()=>{if(!unprotected)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[unprotected]);
  const fields: { key: keyof TrustContent; he: string; en: string }[] = [
    { key: 'titleHe', he: 'כותרת בעברית', en: 'Heading in Hebrew' }, { key: 'titleEn', he: 'כותרת באנגלית', en: 'Heading in English' },
    { key: 'bodyHe', he: 'תיאור בעברית', en: 'Introduction in Hebrew' }, { key: 'bodyEn', he: 'תיאור באנגלית', en: 'Introduction in English' },
    ...[1, 2, 3].flatMap(n => [
      { key: `item${n}TitleHe` as keyof TrustContent, he: `כותרת ${n} בעברית`, en: `Item ${n} heading in Hebrew` },
      { key: `item${n}TitleEn` as keyof TrustContent, he: `כותרת ${n} באנגלית`, en: `Item ${n} heading in English` },
      { key: `item${n}BodyHe` as keyof TrustContent, he: `תיאור ${n} בעברית`, en: `Item ${n} description in Hebrew` },
      { key: `item${n}BodyEn` as keyof TrustContent, he: `תיאור ${n} באנגלית`, en: `Item ${n} description in English` },
    ])
  ];
  const save = async () => {
    if (!block) return;
    setStatus('saving');
    try {
      const response = await fetch('/api/admin/site/trust', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(block) });
      if (response.status === 409) { setStatus('conflict'); return; }
      if (!response.ok) throw Error();
      const result = await response.json(); setBlock(result); setSavedContent(JSON.stringify(result.content)); onSaved(result); setStatus('saved');
    } catch { setStatus('uncertain'); }
  };
  return <section className="mb-8 p-5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
    <h2 className="text-lg font-bold">{rtl ? 'עריכת אזור אמון' : 'Edit trust section'}</h2>
    <p className="mt-1 mb-4 text-sm text-[var(--text-secondary)]">{rtl ? 'התוכן נשמר ומוצג באתר לאחר שמירה.' : 'Content is saved and shown on the site after saving.'}</p>
    {status === 'loading' && <p>{rtl ? 'טוען...' : 'Loading...'}</p>}
    {status === 'error' && <p role="alert" className="text-red-500">{rtl ? 'לא ניתן לטעון או לשמור. נסו שוב.' : 'Could not load or save. Try again.'}</p>}
    {status === 'conflict' && <p role="alert" className="text-red-500">{rtl ? 'התוכן השתנה במקום אחר. טענו מחדש לפני שמירה.' : 'Content changed elsewhere. Reload before saving.'}</p>}
    {status === 'uncertain' && <p role="alert" className="text-red-500">{lang === 'he' ? 'השמירה לא אושרה וייתכן שהצליחה. בדקו את התוכן השמור לפני ניסיון נוסף.' : 'Save not confirmed and may have succeeded. Check saved content before trying again.'}</p>}
    {(status === 'error' || status === 'conflict' || status === 'uncertain') && <button type="button" onClick={() => { if (!block || window.confirm(lang === 'he' ? 'טעינה מחדש תחליף את הנתונים בטופס. להמשיך?' : 'Reloading replaces the values in the form. Continue?')) load(); }} className="underline my-2">{rtl ? 'טען מחדש' : 'Reload'}</button>}
    {block && <><fieldset disabled={status === 'saving' || status === 'loading'}>
      <label className="flex items-center gap-2 mb-4 text-sm"><input type="checkbox" checked={block.content.visible} onChange={e => { setBlock({ ...block, content: { ...block.content, visible: e.target.checked } }); if (status !== 'conflict' && status !== 'uncertain') setStatus('ready'); }} />{rtl ? 'הצג באתר' : 'Show on site'}</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{fields.map(field => <label key={field.key} className="text-xs font-semibold">
        {rtl ? field.he : field.en}
        <textarea dir={String(field.key).endsWith('He') ? 'rtl' : 'ltr'} maxLength={500} required value={String(block.content[field.key])} onChange={e => { setBlock({ ...block, content: { ...block.content, [field.key]: e.target.value } }); if (status !== 'conflict' && status !== 'uncertain') setStatus('ready'); }} className="mt-1 w-full min-h-16 p-2 rounded border border-[var(--border-line)] bg-[var(--bg-page)]" />
      </label>)}</div>
      </fieldset><button type="button" disabled={status === 'saving' || status === 'loading' || status === 'conflict' || status === 'uncertain' || fields.some(field => !String(block.content[field.key]).trim())} onClick={save} className="mt-4 px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{status === 'saving' ? (rtl ? 'שומר...' : 'Saving...') : (rtl ? 'שמור' : 'Save')}</button>
      {status === 'saved' && <span role="status" className="ms-3 text-green-600">{rtl ? 'נשמר' : 'Saved'}</span>}
      <SiteHistory lang={lang} blockKey={'trust'} revision={block.version} disabled={status==='saving'||status==='loading'||status==='conflict'||status==='uncertain'} onLoad={old=>{setBlock(current=>current?{...current,content:mergeHistoricalContent(current.content,old)}:current);setStatus('ready');}} />
    </>}
  </section>;
}
