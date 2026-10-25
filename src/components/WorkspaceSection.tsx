import React, { useState } from 'react';
import { Quote, Building2, TrendingUp, ShieldCheck, Sparkles } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface WorkspaceSectionProps {
  lang: Language;
}

export const WorkspaceSection: React.FC<WorkspaceSectionProps> = ({ lang }) => {
  const [isHovered, setIsHovered] = useState(false);
  const t = TRANSLATIONS[lang];

  return (
    <section id="workspace" className="py-16 lg:py-24 border-b border-[var(--border-line)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
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
                src="/brand/premium/workspace.webp"
                alt="Modern corporate workspace"
                className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
                  isHovered ? 'scale-108' : 'scale-100'
                }`}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 start-4 end-4 flex items-center justify-between text-xs text-white/95">
                <span className="font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>PC-LEASE · Workspace Architecture</span>
                </span>
                <span className="bg-sky-950/80 backdrop-blur-md border border-sky-400/30 px-3 py-1 rounded-full text-[11px] font-semibold text-sky-300">
                  סביבת עבודה עסקית
                </span>
              </div>
            </div>
          </div>

          {/* Editorial Content */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              {t.workspace.kicker}
            </span>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[var(--text-primary)] leading-snug">
              {t.workspace.title}
            </h2>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              {t.workspace.body}
            </p>

            {/* Testimonial Quote Box */}
            <div className="p-5 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] relative shadow-sm">
              <Quote className="w-8 h-8 text-sky-500/20 absolute top-3 end-3" />
              <p className="text-xs sm:text-sm italic text-[var(--text-primary)] leading-relaxed relative z-10">
                {t.workspace.quoteText}
              </p>
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">אורי שמשון</span>
                <span>סמנכ״ל טכנולוגיות, CloudScale Ltd</span>
              </div>
            </div>

            {/* 3 Pillars */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="text-start">
                <Building2 className="w-4 h-4 text-sky-500 mb-1" />
                <div className="text-xs font-bold text-[var(--text-primary)]">ציוד אחיד</div>
                <div className="text-[11px] text-[var(--text-secondary)]">סטנדרט לחברה</div>
              </div>
              <div className="text-start">
                <TrendingUp className="w-4 h-4 text-sky-500 mb-1" />
                <div className="text-xs font-bold text-[var(--text-primary)]">שימור תזרים</div>
                <div className="text-[11px] text-[var(--text-secondary)]">ללא השקעת הון</div>
              </div>
              <div className="text-start">
                <ShieldCheck className="w-4 h-4 text-sky-500 mb-1" />
                <div className="text-xs font-bold text-[var(--text-primary)]">החלפה מהירה</div>
                <div className="text-[11px] text-[var(--text-secondary)]">מלאי גיבוי</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
