import React, { useEffect, useState } from 'react';
import { Language } from '../../types';
import { SiteHistory } from './SiteHistory';

type Layout = { content: { order: string[] }; version: number };
const labels: Record<string, [string, string]> = {
  hero: ['תמונה ראשית', 'Main banner'], trust: ['מה כלול בליסינג', 'Lease benefits'],
  featured: ['נבחרת דגמים', 'Featured models'], calculator: ['מחשבון', 'Calculator'],
  story: ['איך זה עובד', 'How it works'], workspace: ['סביבת עבודה', 'Workspace'], faq: ['שאלות נפוצות', 'FAQ']
};

export function HomeLayoutManagement({lang, onSaved, onDirtyChange}: {lang: Language; onSaved: () => void; onDirtyChange: (key: string, dirty: boolean) => void}) {
  const [block, setBlock] = useState<Layout | null>(null);
  const [saved, setSaved] = useState('');
  const [status, setStatus] = useState<'loading'|'ready'|'saving'|'saved'|'error'|'conflict'|'uncertain'>('loading');
  const he = lang === 'he';
  const load = () => { setStatus('loading'); fetch('/api/admin/site/layout').then(r => {if (!r.ok) throw Error(); return r.json();}).then(data => {setBlock(data); setSaved(JSON.stringify(data.content.order)); setStatus('ready');}).catch(() => setStatus('error')); };
  useEffect(load, []);
  const dirty = status === 'saving' || status === 'uncertain' || status === 'conflict' || !!block && JSON.stringify(block.content.order) !== saved;
  useEffect(() => {onDirtyChange('layout', dirty); return () => onDirtyChange('layout', false);}, [dirty, onDirtyChange]);
  useEffect(() => {if (!dirty) return; const warn = (e: BeforeUnloadEvent) => {e.preventDefault(); e.returnValue = '';}; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);}, [dirty]);
  const move = (index: number, delta: number) => {setBlock(current => {if (!current) return current; const order = [...current.content.order]; const target = index + delta; if (target < 0 || target >= order.length) return current; [order[index], order[target]] = [order[target], order[index]]; return {...current, content: {order}};}); setStatus('ready');};
  const save = async () => {if (!block) return; setStatus('saving'); try {const response = await fetch('/api/admin/site/layout', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(block)}); if (response.status === 409) {setStatus('conflict'); return;} if (!response.ok) {setStatus(response.status >= 500 ? 'uncertain' : 'error'); return;} const data = await response.json(); setBlock(data); setSaved(JSON.stringify(data.content.order)); setStatus('saved'); onSaved();} catch {setStatus('uncertain');}};
  return <section className="rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] p-5">
    <h2 className="text-xl font-bold">{he ? 'סדר אזורי עמוד הבית' : 'Home page section order'}</h2>
    <p className="my-3 text-sm text-[var(--text-secondary)]">{he ? 'שנו את הסדר ושמרו כדי להציג אותו באתר.' : 'Change the order and save to show it on the site.'}</p>
    {status === 'loading' && <p role="status">{he ? 'טוען...' : 'Loading...'}</p>}
    {(status === 'error' || status === 'conflict' || status === 'uncertain') && <div role="alert" className="text-red-600 mb-3">{status === 'conflict' ? (he ? 'הסדר השתנה במקום אחר. טענו מחדש.' : 'The order changed elsewhere. Reload before saving.') : status === 'uncertain' ? (he ? 'השמירה לא אושרה. בדקו את הסדר השמור.' : 'Save was not confirmed. Check the saved order.') : (he ? 'אירעה שגיאה.' : 'Something went wrong.')} <button type="button" className="underline" onClick={() => {if (!dirty || window.confirm(he ? 'לטעון מחדש ולבטל שינויים?' : 'Reload and discard changes?')) load();}}>{he ? 'טען מחדש' : 'Reload'}</button></div>}
    {block && <><ol className="space-y-2">{block.content.order.map((key, index) => <li key={key} className="flex items-center gap-3 rounded border border-[var(--border-line)] p-3"><span className="flex-1">{index + 1}. {labels[key]?.[he ? 0 : 1] || key}</span><button type="button" disabled={index === 0 || status === 'saving' || status === 'conflict' || status === 'uncertain'} onClick={() => move(index, -1)} aria-label={`${he ? 'העבר למעלה' : 'Move up'} ${labels[key]?.[he ? 0 : 1]}`} className="px-3 py-1 border rounded disabled:opacity-40">↑</button><button type="button" disabled={index === block.content.order.length - 1 || status === 'saving' || status === 'conflict' || status === 'uncertain'} onClick={() => move(index, 1)} aria-label={`${he ? 'העבר למטה' : 'Move down'} ${labels[key]?.[he ? 0 : 1]}`} className="px-3 py-1 border rounded disabled:opacity-40">↓</button></li>)}</ol><button type="button" disabled={!dirty || status === 'saving' || status === 'conflict' || status === 'uncertain'} onClick={save} className="mt-4 px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{he ? 'שמור' : 'Save'}</button>{status === 'saved' && <span role="status" className="ms-3 text-green-600">{he ? 'נשמר' : 'Saved'}</span>}<SiteHistory lang={lang} blockKey="layout" revision={block.version} disabled={status === 'saving' || status === 'conflict' || status === 'uncertain'} onLoad={old => {const order = old.order; if (Array.isArray(order) && order.length === Object.keys(labels).length && new Set(order).size === order.length && order.every(key => typeof key === 'string' && Object.hasOwn(labels, key))) {setBlock(current => current ? {...current, content:{order}} : current); setStatus('ready');}}} /></>}
  </section>;
}
