import React from 'react';
import { ArrowUp } from 'lucide-react';
import { Language, Theme } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface FooterProps {
  lang: Language;
  theme: Theme;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ lang, theme, onOpenAdmin }) => {
  const t = TRANSLATIONS[lang];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="py-12 bg-[var(--bg-page)] border-t border-[var(--border-line)] text-xs text-[var(--text-secondary)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[var(--border-subtle)]">
          {/* Brand & Tagline */}
          <div className="flex items-center gap-3">
            <img
              src={theme === 'dark' ? '/brand/pc-lease-logo-on-dark.svg' : '/brand/pc-lease-logo.svg'}
              alt="PC-LEASE"
              className="h-6 w-auto object-contain"
              onError={(e) => {
                const target = e.target as HTMLElement;
                target.style.display = 'none';
              }}
            />
            <span className="font-bold text-sm text-[var(--text-primary)]">
              {t.footer.tagline}
            </span>
          </div>

          {/* Quick Nav Links */}
          <div className="flex flex-wrap items-center gap-5 text-xs">
            <a href="#models" className="hover:text-[var(--text-primary)] transition-colors">
              {t.nav.models}
            </a>
            <a href="#calculator" className="hover:text-[var(--text-primary)] transition-colors">
              {t.nav.calculator}
            </a>
            <a href="#story" className="hover:text-[var(--text-primary)] transition-colors">
              {t.nav.story}
            </a>
            <a href="#catalog" className="hover:text-[var(--text-primary)] transition-colors">
              {t.nav.catalog}
            </a>
            <a href="#faq" className="hover:text-[var(--text-primary)] transition-colors">
              {t.nav.faq}
            </a>
            <button
              onClick={onOpenAdmin}
              className="hover:text-[var(--text-primary)] text-[var(--accent)] transition-colors"
            >
              {t.nav.admin}
            </button>
          </div>

          {/* Back to top */}
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-line)] hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
          >
            <span>{t.footer.topBtn}</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Disclaimer & Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div>{t.footer.vatNote}</div>
          <div>{t.footer.copyright}</div>
        </div>
      </div>
    </footer>
  );
};
