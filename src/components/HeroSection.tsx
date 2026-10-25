import React, { useState, useRef } from 'react';
import { ArrowUpRight, ArrowDown, Play, Pause, Sparkles } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface HeroSectionProps {
  lang: Language;
  onExploreModels: () => void;
  onOpenCalculator: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  lang,
  onExploreModels,
  onOpenCalculator,
}) => {
  const [isPlayingMotion, setIsPlayingMotion] = useState(true);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'he';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlayingMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subtle 3D perspective parallax
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full border-b border-[var(--border-line)] perspective-container select-none overflow-hidden"
    >
      {/* ------------------------------------------------------------- */}
      {/* DESKTOP VIEW (lg+): Full-width Panoramic Canvas with Card on Right */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden lg:flex relative w-full min-h-[500px] max-h-[560px] items-center overflow-hidden">
        {/* Full-bleed Background: Laptop on the left, open bright city on the right */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/brand/hero_laptop_clean.jpg"
            alt="PC-LEASE Panoramic Executive Laptop Workspace"
            className={`w-full h-full object-cover object-[center_left] transition-transform duration-700 ease-out ${
              isPlayingMotion ? 'scale-105' : 'scale-100'
            }`}
            style={{
              transform: isPlayingMotion
                ? `scale(1.05) translate(${tilt.y * 1.1}px, ${tilt.x * 0.9}px)`
                : undefined,
            }}
            loading="eager"
          />

          {isPlayingMotion && (
            <div
              className="absolute inset-0 metallic-sheen opacity-15 pointer-events-none"
              aria-hidden="true"
            />
          )}
        </div>

        {/* 3D Motion Toggle Button */}
        <div className="absolute top-4 start-6 z-20">
          <button
            onClick={() => setIsPlayingMotion(!isPlayingMotion)}
            title={isPlayingMotion ? t.hero.pauseMotion : t.hero.playMotion}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-300/80 dark:border-sky-500/30 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-300 shadow-sm transition-all cursor-pointer"
          >
            {isPlayingMotion ? (
              <>
                <Pause className="w-3 h-3 text-blue-600 dark:text-sky-400" />
                <span>3D Motion</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-blue-600 dark:text-sky-400" />
                <span>Play Motion</span>
              </>
            )}
          </button>
        </div>

        {/* Content Card: Strictly on physical right, highly transparent frosted glass */}
        <div
          className="relative z-10 w-full max-w-[1280px] mx-auto px-6 lg:px-8 py-8 flex"
          style={{ direction: 'ltr', justifyContent: 'flex-end' }}
        >
          <div
            style={{ direction: isRtl ? 'rtl' : 'ltr' }}
            className="w-full max-w-[460px] bg-white/45 dark:bg-slate-950/50 backdrop-blur-2xl p-7 rounded-2xl border border-white/65 dark:border-white/10 shadow-2xl ring-1 ring-black/5 flex flex-col items-start text-start space-y-3.5 transition-colors"
          >
            {/* Kicker */}
            <div className="text-xs font-bold tracking-wider text-blue-600 dark:text-sky-400 uppercase">
              {lang === 'he' ? 'נקודת מבט חדשה' : 'A New Business Perspective'}
            </div>

            {/* Headline */}
            <h1 className="text-3xl lg:text-4.5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              <div>{lang === 'he' ? 'מחשבים לעסק.' : 'Business Computers.'}</div>
              <div className="text-blue-600 dark:text-sky-400">
                {lang === 'he' ? 'בדרך שלכם.' : 'On Your Terms.'}
              </div>
            </h1>

            {/* Subtitle */}
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
              {lang === 'he'
                ? 'מחשבים עסקיים ותחנות עבודה מחודשות של Dell, HP ו-Lenovo. בוחרים מחשב, ובוחרים איך לשלם — ליסינג, השכרה או רכישה.'
                : 'Enterprise refurbished computers from Dell, HP and Lenovo. Choose your computer and choose how to pay — lease, rental, or purchase.'}
            </p>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={onExploreModels}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 rounded-xl shadow-md shadow-blue-600/25 transition-all duration-200 active:scale-[0.98] cursor-pointer"
              >
                <span>{lang === 'he' ? 'לכל המחשבים' : 'Browse All Computers'}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenCalculator}
                className="flex items-center gap-1 px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
              >
                <span>{lang === 'he' ? 'איך זה עובד' : 'How It Works'}</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Trust Marker */}
            <div className="pt-2.5 border-t border-slate-300/60 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 w-full">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {lang === 'he' ? 'טכנולוגיה שעובדת בשבילכם.' : 'Technology engineered for your business.'}
                </span>{' '}
                <span className="tracking-wider uppercase font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  DELL / HP / LENOVO
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE & TABLET VIEW (< lg): Stacked Layout (Laptop NEVER Covered!) */}
      {/* ------------------------------------------------------------- */}
      <div className="lg:hidden flex flex-col w-full bg-[var(--bg-page)]">
        {/* 1. Dedicated Unobstructed Laptop Stage */}
        <div className="relative w-full h-[240px] sm:h-[300px] overflow-hidden bg-slate-900">
          <img
            src="/brand/hero_laptop_clean.jpg"
            alt="PC-LEASE Laptop"
            className="w-full h-full object-cover object-left"
            style={{
              transform: isPlayingMotion
                ? `scale(1.05) translate(${tilt.y * 0.8}px, ${tilt.x * 0.8}px)`
                : undefined,
            }}
          />

          {/* Gradient Scrim at bottom to blend into page */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)] via-transparent to-transparent pointer-events-none" />

          {/* 3D Motion Badge on Mobile */}
          <div className="absolute top-3 start-3 z-10">
            <button
              onClick={() => setIsPlayingMotion(!isPlayingMotion)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/20"
            >
              {isPlayingMotion ? (
                <>
                  <Pause className="w-2.5 h-2.5 text-sky-400" />
                  <span>3D Motion</span>
                </>
              ) : (
                <>
                  <Play className="w-2.5 h-2.5 text-sky-400" />
                  <span>Motion</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Headline & Content Card (Positioned BELOW the Laptop Image) */}
        <div className="px-4 pb-8 -mt-6 sm:-mt-8 relative z-10 max-w-lg mx-auto w-full">
          <div className="bg-[var(--bg-surface)]/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-[var(--border-line)] shadow-xl flex flex-col items-start text-start space-y-3">
            {/* Kicker */}
            <div className="text-[11px] font-bold tracking-wider text-blue-600 dark:text-sky-400 uppercase">
              {lang === 'he' ? 'נקודת מבט חדשה' : 'A New Business Perspective'}
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)] leading-tight">
              <div>{lang === 'he' ? 'מחשבים לעסק.' : 'Business Computers.'}</div>
              <div className="text-blue-600 dark:text-sky-400">
                {lang === 'he' ? 'בדרך שלכם.' : 'On Your Terms.'}
              </div>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {lang === 'he'
                ? 'מחשבים עסקיים ותחנות עבודה מחודשות של Dell, HP ו-Lenovo. בוחרים מחשב, ובוחרים איך לשלם — ליסינג, השכרה או רכישה.'
                : 'Enterprise refurbished computers from Dell, HP and Lenovo. Choose your computer and choose how to pay — lease, rental, or purchase.'}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 w-full">
              <button
                onClick={onExploreModels}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:text-slate-950 rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                <span>{lang === 'he' ? 'לכל המחשבים' : 'Browse All Computers'}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenCalculator}
                className="flex items-center justify-center gap-1 px-3 py-2.5 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <span>{lang === 'he' ? 'איך זה עובד' : 'How It Works'}</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile Trust Strip */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] w-full">
              <Sparkles className="w-3 h-3 text-sky-500 shrink-0" />
              <span className="font-semibold">{lang === 'he' ? 'טכנולוגיה שעובדת בשבילכם.' : 'Technology for business.'}</span>
              <span className="font-mono text-[10px] text-sky-600 dark:text-sky-400">DELL / HP / LENOVO</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
