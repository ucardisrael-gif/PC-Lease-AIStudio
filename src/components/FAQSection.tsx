import React, { useState } from 'react';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import { Language } from '../types';
import { sectionDefaults } from '../data/section-defaults.mjs';

export type FAQContent = typeof sectionDefaults.faq;
export type FAQBlock = { content: FAQContent; version: number };

interface FAQSectionProps {
  lang: Language;
  content?: FAQContent;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ lang, content = sectionDefaults.faq }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const suffix = lang === 'he' ? 'He' : 'En';
  const v = (key: string) => {
    const field = `${key}${suffix}` as keyof FAQContent;
    return (content[field] ?? sectionDefaults.faq[field]) as string;
  };
  const items = [1, 2, 3, 4, 5, 7].map(n => ({ q: v(`question${n}`), a: v(`answer${n}`) }));

  const toggleItem = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  if (!content.visible) return null;
  return (
    <section id="faq" className="brand-wash brand-wash-violet pt-8 pb-16 lg:pt-10 lg:pb-24 border-b border-[var(--border-line)] bg-[var(--bg-surface)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
            {v('kicker')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] mt-2">
            {v('title')}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3">
            {v('subtitle')}
          </p>
        </div>

        {/* Accordion List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {items.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="brand-card rounded-2xl border border-[var(--border-line)] bg-[var(--bg-page)] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(idx)}
                  className="w-full min-h-24 p-5 text-start flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-blue-600"
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--accent)] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-3 animate-in fade-in duration-150">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 rounded-2xl border border-sky-200 dark:border-sky-900 bg-white/70 dark:bg-slate-900/70 px-5 py-5 text-center">
          <p className="font-bold text-[var(--text-primary)]">{v('contactTitle')}</p>
          <a href="/contact#contact-form" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{v('contactButton')}<ArrowUpRight aria-hidden="true" className="w-4 h-4" /></a>
        </div>
      </div>
    </section>
  );
};
