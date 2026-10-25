import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface FAQSectionProps {
  lang: Language;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ lang }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const t = TRANSLATIONS[lang];

  const toggleItem = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-16 lg:py-24 border-b border-[var(--border-line)] bg-[var(--bg-surface)]">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
            {t.faq.kicker}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] mt-2">
            {t.faq.title}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3">
            {t.faq.subtitle}
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {t.faq.items.map((item, idx) => {
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
