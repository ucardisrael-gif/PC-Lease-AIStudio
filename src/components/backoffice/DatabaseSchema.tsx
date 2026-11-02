import React, { useEffect, useMemo, useState } from 'react';
import { Database, Search, Table2, RefreshCw } from 'lucide-react';
import { Language } from '../../types';

type Column = { table_name: string; column_name: string; data_type: string; is_nullable: string };

export function DatabaseSchema({ lang }: { lang: Language }) {
  const he = lang === 'he';
  const [columns, setColumns] = useState<Column[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetch('/api/admin/schema', { signal: controller.signal }).then(response => {
      if (!response.ok) throw Error();
      return response.json();
    }).then(data => { if (!controller.signal.aborted) { setColumns(data.columns); setStatus('ready'); } })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [retry]);
  const tables = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const names = [...new Set(columns.map(column => column.table_name))];
    return names.flatMap(name => {
      const all = columns.filter(column => column.table_name === name);
      const matches = !query || name.toLocaleLowerCase().includes(query) ? all : all.filter(column => column.column_name.toLocaleLowerCase().includes(query) || column.data_type.toLocaleLowerCase().includes(query));
      return matches.length ? [{ name, columns: matches, total: all.length }] : [];
    });
  }, [columns, search]);
  return <section className="mx-auto max-w-7xl space-y-5">
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-slate-700"><Database size={22}/></span><div><h1 className="text-2xl font-bold">{he ? 'מבנה מסד הנתונים' : 'Database structure'}</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{he ? 'טבלאות ושדות מתוך מסד הנתונים המחובר — לצפייה בלבד.' : 'Tables and fields from the connected database — read only.'}</p></div></div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{he ? 'הצגה זו אינה כוללת תרשים קשרים בין הטבלאות.' : 'This view does not include a diagram of table relationships.'}</p>
    </div>
    {status === 'loading' && <p role="status">{he ? 'טוען…' : 'Loading…'}</p>}
    {status === 'error' && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 dark:bg-slate-800 dark:text-red-300">{he ? 'לא ניתן לטעון את המבנה.' : 'Could not load the structure.'} <button type="button" className="ms-3 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold dark:bg-slate-900" onClick={() => setRetry(n => n + 1)}><RefreshCw size={16}/>{he ? 'ניסיון חוזר' : 'Retry'}</button></div>}
    {status === 'ready' && <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><label className="block text-sm font-semibold" htmlFor="schema-search">{he ? 'חיפוש טבלה או שדה' : 'Search tables or fields'}</label><div className="relative mt-2"><Search className="pointer-events-none absolute start-3 top-3 text-slate-400" size={19}/><input id="schema-search" value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 ps-10 pe-3 dark:border-slate-600 dark:bg-slate-900" placeholder={he ? 'שם טבלה, שדה או סוג…' : 'Table, field or type…'}/></div><p role="status" className="mt-3 text-sm text-slate-500">{he ? `טבלאות: ${tables.length}` : `Tables: ${tables.length}`}</p></div>
      {!tables.length && <p className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">{he ? 'לא נמצאו תוצאות.' : 'No results found.'}</p>}
      <div className="grid gap-3">{tables.map(table => <details key={table.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><summary className="cursor-pointer font-semibold"><span className="inline-flex items-center gap-2"><Table2 size={18} className="text-blue-600"/><bdi>{table.name}</bdi><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700 dark:bg-slate-700 dark:text-blue-200">{table.columns.length === table.total ? table.total : `${table.columns.length}/${table.total}`} {he ? 'שדות' : 'fields'}</span></span></summary><div className="overflow-x-auto"><table className="mt-4 w-full text-start text-sm"><thead><tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700"><th className="p-2 text-start">{he ? 'שדה' : 'Field'}</th><th className="p-2 text-start">{he ? 'סוג' : 'Type'}</th><th className="p-2 text-start">{he ? 'ריק מותר' : 'Nullable'}</th></tr></thead><tbody>{table.columns.map(column => <tr className="border-b border-slate-100 dark:border-slate-700" key={column.column_name}><td className="p-2"><bdi>{column.column_name}</bdi></td><td className="p-2"><bdi>{column.data_type}</bdi></td><td className="p-2">{column.is_nullable === 'YES' ? (he ? 'כן' : 'Yes') : (he ? 'לא' : 'No')}</td></tr>)}</tbody></table></div></details>)}</div>
    </>}
  </section>;
}
