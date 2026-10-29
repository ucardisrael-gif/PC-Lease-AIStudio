import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Language } from '../types';
import { sectionDefaults } from '../data/section-defaults.mjs';

export type FAQContent = typeof sectionDefaults.faq;
export type FAQBlock = { content: FAQContent; version: number };

interface FAQSectionProps {
  lang: Language;
  content?: FAQContent;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ lang, content = sectionDefaults.faq }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const suffix = lang === 'he' ? 'He' : 'En';
  const v = (key: string) => content[`${key}${suffix}` as keyof FAQContent] as string;
  const items = Array.from({ length: 8 }, (_, i) => ({ q: v(`question${i + 1}`), a: v(`answer${i + 1}`) }));

  const toggleItem = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  if (!content.visible) return null;
  return (
    <section id="faq" className="py-16 lg:py-24 border-b border-[var(--border-line)] bg-[var(--bg-surface)]">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
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
        <div className="space-y-3">
          {items.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-[var(--border-line)] bg-[var(--bg-page)] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(idx)}
                  className="w-full p-5 text-start flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
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
      </div>
    </section>
  );
};
