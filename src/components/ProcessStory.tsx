import React, { useState } from 'react';
import { Laptop, CalendarCheck2, ShieldCheck, Truck, Check } from 'lucide-react';
import { Language } from '../types';
import { sectionDefaults } from '../data/section-defaults.mjs';

export type StoryContent = typeof sectionDefaults.story;
export type StoryBlock = { content: StoryContent; version: number };

interface ProcessStoryProps {
  lang: Language;
  content?: StoryContent;
}

export const ProcessStory: React.FC<ProcessStoryProps> = ({ lang, content = sectionDefaults.story }) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const suffix = lang === 'he' ? 'He' : 'En';
  const v = (key: string) => content[`${key}${suffix}` as keyof StoryContent] as string;
  const steps = Array.from({ length: 4 }, (_, i) => ({ num: String(i + 1).padStart(2, '0'), title: v(`step${i + 1}Title`), desc: v(`step${i + 1}Desc`), badge: v(`step${i + 1}Badge`) }));

  const stepIcons = [
    <Laptop className="w-6 h-6" key="icon-0" />,
    <CalendarCheck2 className="w-6 h-6" key="icon-1" />,
    <ShieldCheck className="w-6 h-6" key="icon-2" />,
    <Truck className="w-6 h-6" key="icon-3" />,
  ];

  if (!content.visible) return null;
  return (
    <section id="story" className="brand-wash brand-wash-amber pt-8 pb-16 lg:pt-10 lg:pb-24 border-b border-[var(--border-line)] bg-[var(--bg-surface)]">
      <div className="max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
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

        {/* 4 Interactive Process Steps Grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 before:absolute before:top-5 before:bottom-5 before:start-5 before:w-px md:before:top-5 md:before:bottom-auto md:before:start-8 md:before:end-8 md:before:w-auto md:before:h-px before:bg-sky-300 dark:before:bg-sky-800">
          {steps.map((step, idx) => {
            const isActive = activeStep === idx;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`group relative brand-card p-5 rounded-xl border text-start transition-all duration-200 flex flex-col justify-between space-y-4 ${
                  isActive
                    ? 'bg-[var(--bg-page)] border-[var(--accent)] shadow-md ring-1 ring-[var(--accent)]/30'
                    : 'bg-[var(--bg-surface)] border-[var(--border-line)] hover:border-[var(--text-secondary)]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--badge-bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {stepIcons[idx]}
                  </div>

                  <span className="w-10 h-10 rounded-full grid place-items-center bg-[var(--bg-page)] border border-sky-300 group-hover:bg-sky-600 group-hover:text-white font-mono text-sm font-bold text-[var(--accent)]">
                    {step.num}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                    {step.title}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)]">
                    <Check className="w-3 h-3" />
                    <span>{step.badge}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
