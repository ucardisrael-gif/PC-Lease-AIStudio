import React, { useEffect, useState } from 'react';
import { Language } from '../../types';
import { permissionDefinitions, crmPermissionDefinitions } from './StaffPermissions';

type Role = { id: string; name: string; permissions: string[] };

export function EffectiveAccessSummary({ lang, accessRoles, permissions, active }: { lang: Language; accessRoles: string[]; permissions: string[]; active: boolean }) {
  const he = lang === 'he';
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/access-roles', { signal: controller.signal }).then(response => {
      if (!response.ok) throw Error();
      return response.json();
    }).then(data => setRoles(data.roles)).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);
  const assigned = roles?.filter(role => accessRoles.includes(role.id)) || [];
  const incomplete = roles !== null && assigned.length !== accessRoles.length;
  const combined = [...new Set([...permissions, ...assigned.flatMap(role => role.permissions)])];
  const definitions = [...permissionDefinitions, ...crmPermissionDefinitions];
  return <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-slate-700 dark:bg-slate-800" aria-label={he ? 'סיכום הרשאות' : 'Access summary'}>
    <h3 className="font-bold">{he ? 'סיכום הרשאות שמורות' : 'Saved access summary'}</h3>
    {!active && <p className="mt-2 font-semibold text-red-700 dark:text-red-300">{he ? 'החשבון מושבת ולכן אין לו גישה כעת.' : 'This account is disabled and currently has no access.'}</p>}
    {error || incomplete ? <p role="alert" className="mt-2 text-red-700">{he ? 'לא ניתן להציג את סיכום התפקידים. רעננו ונסו שוב.' : 'Unable to display role access. Refresh and try again.'}</p> : roles === null ? <p className="mt-2 text-sm">{he ? 'טוען תפקידים…' : 'Loading roles…'}</p> : <>
      <p className="mt-3 text-sm"><strong>{he ? 'תפקידים:' : 'Roles:'}</strong> {assigned.map(role => role.name).join(', ') || (he ? 'ללא תפקיד' : 'No roles')}</p>
      <p className="mt-2 text-sm font-semibold">{he ? 'הרשאות מהתפקידים ומהרשאות אישיות:' : 'Permissions from roles and individual grants:'}</p>
      <ul className="mt-2 flex flex-wrap gap-2">{combined.map(id => { const definition = definitions.find(item => item[0] === id); return <li key={id} className="rounded-full border border-blue-100 bg-white px-3 py-1 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">{definition ? (he ? definition[1] : definition[2]) : id}</li>; })}</ul>
      {!combined.length && <p className="mt-2 text-sm">{he ? 'לא הוקצו הרשאות.' : 'No permissions assigned.'}</p>}
    </>}
    <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{he ? 'הרשאות אישיות נערכות בנפרד למטה. גישת שותף ומגבלות לוחות CRM מנוהלות בנפרד.' : 'Edit individual grants below. Dealer access and CRM board restrictions are managed separately.'}</p>
  </section>;
}
