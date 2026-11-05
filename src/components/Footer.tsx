import React from 'react';
import { ArrowUp } from 'lucide-react';
import { Language, Theme } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { sectionDefaults } from '../data/section-defaults.mjs';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  lang: Language;
  theme: Theme;
  navigation?: typeof sectionDefaults.navigation;
  content?: typeof sectionDefaults.footer;
  contactAvailable?: boolean;
  onOpenPrivacySettings:()=>void;
}

export const Footer: React.FC<FooterProps> = ({ lang, theme, content = sectionDefaults.footer, navigation = sectionDefaults.navigation, contactAvailable = false, onOpenPrivacySettings }) => {
  const nav = (key: 'models'|'calculator'|'story'|'catalog'|'faq'|'about'|'contact') => navigation[`${key}${lang === 'he' ? 'He' : 'En'}`];
  if (!content.visible) return <footer className="p-4 flex justify-center gap-5 text-sm"><a href="/privacy" className="underline">{lang==='he'?'מדיניות פרטיות':'Privacy notice'}</a><button type="button" onClick={onOpenPrivacySettings} className="underline">{lang==='he'?'הגדרות עוגיות':'Cookie settings'}</button></footer>;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="brand-wash brand-wash-violet py-12 bg-[var(--bg-page)] border-t border-[var(--border-line)] text-xs text-[var(--text-secondary)]">
      <div className="max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[var(--border-subtle)]">
          {/* Brand & Tagline */}
          <div className="flex items-center gap-3">
            <BrandLogo theme={theme} className="w-[145px]" />
            <span className="font-bold text-sm text-[var(--text-primary)]">
              {lang === 'he' ? content.taglineHe : content.taglineEn}
            </span>
          </div>

          {/* Quick Nav Links */}
          <div className="flex flex-wrap items-center gap-5 text-xs">
            <a href="/#models" className="hover:text-[var(--text-primary)] transition-colors">
              {nav('models')}
            </a>
            <a href="/#calculator" className="hover:text-[var(--text-primary)] transition-colors">
              {nav('calculator')}
            </a>
            <a href="/#story" className="hover:text-[var(--text-primary)] transition-colors">
              {nav('story')}
            </a>
            <a href="/catalog" className="hover:text-[var(--text-primary)] transition-colors">
              {nav('catalog')}
            </a>
            <a href="/#faq" className="hover:text-[var(--text-primary)] transition-colors">
              {nav('faq')}
            </a>
            <a href="/about" className="hover:text-[var(--text-primary)] transition-colors">{nav('about')}</a>
            {content.showContact&&contactAvailable&&<a href="/contact" className="hover:text-[var(--text-primary)] transition-colors">{nav('contact')}</a>}

          </div>

          {/* Back to top */}
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-line)] hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
          >
            <span>{lang === 'he' ? content.topHe : content.topEn}</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Disclaimer & Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div>{lang === 'he' ? content.noteHe : content.noteEn}</div>
          <div className="flex flex-wrap justify-center gap-4"><a href="/privacy" className="underline hover:text-blue-600">{lang==='he'?'מדיניות פרטיות':'Privacy notice'}</a><button type="button" onClick={onOpenPrivacySettings} className="underline hover:text-blue-600">{lang==='he'?'הגדרות עוגיות':'Cookie settings'}</button></div>
          <div>{lang === 'he' ? content.copyrightHe : content.copyrightEn}</div>
        </div>
      </div>
    </footer>
  );
};
