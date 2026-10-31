import React, { useState } from 'react';
import { Building2, TrendingUp, ShieldCheck, Sparkles } from 'lucide-react';
import { Language } from '../types';
import { sectionDefaults } from '../data/section-defaults.mjs';
import { TrustSection, TrustContent } from './TrustSection';

export type WorkspaceContent = typeof sectionDefaults.workspace;
export type WorkspaceBlock = { content: WorkspaceContent; version: number };

interface WorkspaceSectionProps {
  lang: Language;
  content?: WorkspaceContent;
  trust?: TrustContent;
}

export const WorkspaceSection: React.FC<WorkspaceSectionProps> = ({ lang, content = sectionDefaults.workspace, trust }) => {
  const [isHovered, setIsHovered] = useState(false);
  const v = (key: 'kicker' | 'title' | 'body' | 'imageLabel' | 'item1Title' | 'item1Body' | 'item2Title' | 'item2Body' | 'item3Title' | 'item3Body') => content[`${key}${lang === 'he' ? 'He' : 'En'}`];

  if (!content.visible) return null;
  return (
    <section id="workspace" className="brand-wash brand-wash-cyan scroll-mt-28 py-16 lg:py-24 border-b border-[var(--border-line)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Architectural Image with 3D Motion & Zoom Effect */}
          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="lg:col-span-7 relative group"
          >
            {/* Luminous cyan ambient border reflection */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-sky-400 rounded-2xl blur-lg opacity-25 group-hover:opacity-60 transition duration-700 pointer-events-none" />

            <div className="relative rounded-2xl overflow-hidden border border-sky-500/30 shadow-2xl aspect-[16/10] bg-slate-900">
              <img
                src={content.imageUrl}
                alt={v('imageLabel')}
                className={`w-full h-full object-cover transition-transform duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                  isHovered ? 'scale-108' : 'scale-100'
                }`}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute top-4 start-4 flex flex-wrap gap-2 pointer-events-none"><span className="rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white shadow-lg">{v('item1Title')}</span><span className="rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white shadow-lg">{v('item2Title')}</span></div>
              <div className="absolute bottom-4 start-4 end-4 flex items-center justify-between text-xs text-white/95">
                <span className="font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>PC-LEASE · Workspace Architecture</span>
                </span>
                <span className="bg-sky-950/80 backdrop-blur-md border border-sky-400/30 px-3 py-1 rounded-full text-[11px] font-semibold text-sky-300">
                  {v('imageLabel')}
                </span>
              </div>
            </div>
          </div>

          {/* Editorial Content */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              {v('kicker')}
            </span>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[var(--text-primary)] leading-snug">
              {v('title')}
            </h2>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              {v('body')}
            </p>

            {/* 3 Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-2">
              <div className="brand-card text-start p-4 rounded-xl bg-[var(--bg-page)] border border-[var(--border-line)]">
                <Building2 className="w-7 h-7 text-sky-500 mb-3" />
                <div className="text-base font-bold text-[var(--text-primary)]">{v('item1Title')}</div>
                <div className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{v('item1Body')}</div>
              </div>
              <div className="brand-card text-start p-4 rounded-xl bg-[var(--bg-page)] border border-[var(--border-line)]">
                <TrendingUp className="w-7 h-7 text-sky-500 mb-3" />
                <div className="text-base font-bold text-[var(--text-primary)]">{v('item2Title')}</div>
                <div className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{v('item2Body')}</div>
              </div>
              <div className="brand-card text-start p-4 rounded-xl bg-[var(--bg-page)] border border-[var(--border-line)]">
                <ShieldCheck className="w-7 h-7 text-sky-500 mb-3" />
                <div className="text-base font-bold text-[var(--text-primary)]">{v('item3Title')}</div>
                <div className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{v('item3Body')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {trust && <TrustSection lang={lang} content={trust} compact />}
    </section>
  );
};
