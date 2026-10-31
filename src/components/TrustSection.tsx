import React from 'react';
import { Wrench, Laptop, RefreshCw } from 'lucide-react';
import { Language } from '../types';
import { defaultTrust } from '../data/trust-defaults.mjs';

export type TrustContent = typeof defaultTrust;
export type TrustBlock = { content: TrustContent; version: number };

export function TrustSection({ lang, content, compact = false }: { lang: Language; content: TrustContent; compact?: boolean }) {
  if (!content.visible) return null;
  const suffix = lang === 'he' ? 'He' : 'En';
  const value = (key: string) => content[`${key}${suffix}` as keyof TrustContent] as string;
  const icons = [Wrench, Laptop, RefreshCw];
  return <section id="trust" className={compact ? 'brand-wash brand-wash-violet pt-10 bg-[var(--bg-surface)]' : 'brand-wash brand-wash-violet py-16 lg:py-24 bg-[var(--bg-page)] border-b border-[var(--border-line)]'}>
    <div className="max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mb-10 text-start">
        <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)]">{value('title')}</h2>
        <p className="mt-3 text-base sm:text-lg text-[var(--text-secondary)]">{value('body')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {icons.map((Icon, index) => <div key={index} className="brand-card min-h-[220px] sm:min-h-[250px] p-7 sm:p-8 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-surface)] shadow-sm flex flex-col items-start text-start">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-6"><Icon className="w-7 h-7 text-sky-600 dark:text-sky-400" aria-hidden="true" /></div>
          <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{value(`item${index + 1}Title`)}</h3>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">{value(`item${index + 1}Body`)}</p>
        </div>)}
      </div>
    </div>
  </section>;
}
