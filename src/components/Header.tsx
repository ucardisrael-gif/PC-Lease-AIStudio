import React, { useState } from 'react';
import { Sun, Moon, Globe, Menu, X, ShieldCheck, User, Download } from 'lucide-react';
import { Language, Theme } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface HeaderProps {
  lang: Language;
  theme: Theme;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onOpenClientLogin: () => void;
  onOpenAdmin: () => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
  onOpenClientLogin,
  onOpenAdmin,
  onOpenExport,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = TRANSLATIONS[lang];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--bg-page)]/95 border-b border-[var(--border-line)] transition-colors duration-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark (ONLY the official SVG logo, no duplicate text) */}
        <a
          href="#"
          className="flex items-center shrink-0 focus-visible:ring-2 focus-visible:ring-blue-600 rounded py-1"
          aria-label="PC-LEASE"
        >
          <img
            src={theme === 'dark' ? '/brand/pc-lease-logo-on-dark.svg' : '/brand/pc-lease-logo.svg'}
            alt="PC-LEASE"
            className="h-8 w-auto object-contain"
          />
        </a>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[var(--text-secondary)]">
          <a
            href="#models"
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 hover:underline decoration-blue-600 underline-offset-8"
          >
            {t.nav.models}
          </a>
          <a
            href="#calculator"
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 hover:underline decoration-blue-600 underline-offset-8"
          >
            {t.nav.calculator}
          </a>
          <a
            href="#story"
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 hover:underline decoration-blue-600 underline-offset-8"
          >
            {t.nav.story}
          </a>
          <a
            href="#catalog"
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 hover:underline decoration-blue-600 underline-offset-8"
          >
            {t.nav.catalog}
          </a>
          <a
            href="#faq"
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 hover:underline decoration-blue-600 underline-offset-8"
          >
            {t.nav.faq}
          </a>
        </nav>

        {/* Zone 3: Actions (Language, Theme, Admin, Client Portal Login) */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Export Project ZIP Button */}
          <button
            onClick={onOpenExport}
            title={lang === 'he' ? 'ייצוא קוד הפרויקט (ZIP / GitHub)' : 'Экспорт проекта (ZIP / GitHub)'}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 rounded-md border border-emerald-300 dark:border-emerald-700/60 transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{lang === 'he' ? 'ייצוא ZIP' : 'Экспорт ZIP'}</span>
          </button>

          {/* Admin site editor trigger */}
          <button
            onClick={onOpenAdmin}
            title={t.nav.admin}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--badge-bg)] rounded-md border border-[var(--border-line)] transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
            <span>{t.nav.admin}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors cursor-pointer"
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            <span>{lang === 'he' ? 'EN' : 'עברית'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors cursor-pointer"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-sky-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Primary Action Button: Client Portal Login (כניסה ללקוחות) */}
          <button
            onClick={onOpenClientLogin}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 rounded-lg shadow-sm transition-all duration-150 whitespace-nowrap shrink-0 active:scale-[0.98] cursor-pointer"
          >
            <User className="w-4 h-4" />
            <span>{t.nav.clientLogin}</span>
          </button>

          {/* Mobile menu hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[var(--text-primary)] hover:bg-[var(--badge-bg)] rounded-md transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-3 pb-6 border-b border-[var(--border-line)] bg-[var(--bg-surface)] shadow-lg animate-in fade-in duration-200">
          <div className="flex flex-col gap-3 text-sm font-medium">
            <a
              href="#models"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
            >
              {t.nav.models}
            </a>
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
            >
              {t.nav.calculator}
            </a>
            <a
              href="#story"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
            >
              {t.nav.story}
            </a>
            <a
              href="#catalog"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
            >
              {t.nav.catalog}
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
            >
              {t.nav.faq}
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenExport();
              }}
              className="flex items-center gap-2 py-2 px-3 text-start rounded text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors w-full cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'he' ? 'ייצוא פרויקט (ZIP מלא)' : 'Экспорт проекта (ZIP)'}</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAdmin();
              }}
              className="flex items-center gap-2 py-2 px-3 text-start rounded hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-sky-500" />
              <span>{t.nav.admin}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
