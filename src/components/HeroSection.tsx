import React from 'react';
import { ArrowUpRight, ArrowDown, ShieldCheck, Zap, Truck } from 'lucide-react';
import { Language } from '../types';
import { defaultHero } from '../data/hero-defaults.mjs';

export type HeroContent = typeof defaultHero;
export type HeroBlock = { content: HeroContent; version: number };
interface HeroSectionProps { lang: Language; content?: HeroContent; onExploreModels: () => void; onOpenCalculator: () => void; }

export const HeroSection: React.FC<HeroSectionProps> = ({ lang, content = defaultHero, onExploreModels, onOpenCalculator }) => {
  if (!content.visible) return null;
  const h = (key: 'kicker' | 'title' | 'accent' | 'body' | 'primary' | 'secondary' | 'note') => content[`${key}${lang === 'he' ? 'He' : 'En'}`];
  const action = (target: string) => target === 'calculator' ? onOpenCalculator() : target === 'contact' ? window.location.assign('/contact') : onExploreModels();
  return <section className="brand-wash brand-wash-cyan border-b border-[var(--border-line)] bg-[var(--bg-page)]">
    <div className="relative max-w-[1440px] mx-auto lg:min-h-[520px] lg:flex lg:items-center overflow-hidden">
      <div className="hero-visual h-56 sm:h-72 lg:absolute lg:inset-0 lg:h-full bg-slate-900" onPointerMove={e => { if(e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const r=e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--hero-rotate-x', `${(0.5-(e.clientY-r.top)/r.height)*3}deg`); e.currentTarget.style.setProperty('--hero-rotate-y', `${((e.clientX-r.left)/r.width-0.5)*3}deg`); }} onPointerLeave={e => {e.currentTarget.style.removeProperty('--hero-rotate-x');e.currentTarget.style.removeProperty('--hero-rotate-y');}}>
        <img src={content.imageUrl} alt={lang === 'he' ? content.imageAltHe : content.imageAltEn} className="hero-visual-image w-full h-full object-cover object-left" />
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_25%_50%,rgba(37,99,235,0.15),transparent_65%)]" />
      </div>
      <div className="relative w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 lg:mt-0 lg:py-12 flex lg:justify-end lg:[direction:ltr]">
        <div dir={lang === 'he' ? 'rtl' : 'ltr'} className="w-full max-w-xl lg:max-w-[480px] p-6 sm:p-8 lg:p-7 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-surface)] lg:bg-[color-mix(in_srgb,var(--bg-surface)_70%,transparent)] lg:backdrop-blur-[2px] shadow-xl text-start">
          <p className="text-xs font-bold tracking-wider text-[var(--accent)] uppercase">{h('kicker')}</p>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-[var(--text-primary)]"><span className="block">{h('title')}</span><span className="block text-[var(--accent)]">{h('accent')}</span></h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--text-secondary)]">{h('body')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => action(content.primaryAction)} className="min-h-11 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><span>{h('primary')}</span><ArrowUpRight className="w-4 h-4" /></button>
            <button type="button" onClick={() => action(content.secondaryAction)} className="min-h-11 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] border border-[var(--border-line)] rounded-lg hover:bg-[var(--badge-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><span>{h('secondary')}</span><ArrowDown className="w-4 h-4" /></button>
          </div>
          <div className="mt-5 pt-4 border-t border-[var(--border-line)] flex flex-wrap items-center gap-3 text-sm leading-relaxed font-semibold text-[var(--text-primary)]"><div aria-hidden="true" className="flex gap-1.5 text-sky-600">{[ShieldCheck,Zap,Truck].map((Icon,i)=><span key={i} className="rounded-lg bg-sky-100 dark:bg-sky-950 p-1.5"><Icon className="w-4 h-4"/></span>)}</div><p className="flex-1 min-w-[12rem]">{h('note')}</p></div>
        </div>
      </div>
    </div>
  </section>;
};
