import React, { useState } from 'react';
import { Sun, Moon, Globe, Menu, X, ShieldCheck, User } from 'lucide-react';
import { Language, Theme } from '../types';
import { sectionDefaults } from '../data/section-defaults.mjs';

interface HeaderProps {
  lang: Language;
  navigation?: typeof sectionDefaults.navigation;
  theme: Theme;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onOpenClientLogin: () => void;
  onOpenAdmin: () => void;
  onOpenQuote: () => void;
  quoteAvailable: boolean;
  isAdmin: boolean;
  sessionUser: { email: string; displayName?: string | null } | null;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  navigation = sectionDefaults.navigation,
  theme,
  onToggleLang,
  onToggleTheme,
  onOpenClientLogin,
  onOpenAdmin,
  onOpenQuote,
  quoteAvailable,
  isAdmin,
  sessionUser,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const nav = (key: 'models'|'calculator'|'story'|'catalog'|'faq'|'about'|'contact'|'quote') => navigation[`${key}${lang === 'he' ? 'He' : 'En'}`];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--bg-page)]/95 border-b border-[var(--border-line)] transition-colors duration-200">
      {isAdmin && <div className="border-b border-[var(--border-line)] bg-[var(--bg-surface)]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 min-h-8 flex justify-center items-center">
          <button type="button" onClick={onOpenAdmin} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md text-[var(--text-primary)] hover:bg-[var(--badge-bg)] focus-visible:outline-2 focus-visible:outline-blue-600" aria-label={lang === 'he' ? 'ניהול' : 'Administration'}>
            <ShieldCheck className="w-4 h-4 text-sky-500" /><span>{lang === 'he' ? 'ניהול' : 'Administration'}</span>
          </button>
        </div>
      </div>}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Brand Wordmark (ONLY the official SVG logo, no duplicate text) */}
        <a
          href="/"
          className="flex items-center shrink-0 focus-visible:ring-2 focus-visible:ring-blue-600 rounded py-1"
          aria-label="PC-LEASE"
        >
          <img
            src={theme === 'dark' ? '/brand/pc-lease-logo-on-dark.svg' : '/brand/pc-lease-logo.svg'}
            alt="PC-LEASE"
            className="h-6 sm:h-8 w-auto object-contain"
          />
        </a>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden min-[1400px]:flex items-center gap-3 text-sm font-medium text-[var(--text-secondary)]">
          <a
            href="/#models"
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 hover:underline decoration-blue-600 underline-offset-8"
          >
            {nav('models')}
          </a>
          <a
            href="/#calculator"
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 hover:underline decoration-blue-600 underline-offset-8"
          >
            {nav('calculator')}
          </a>
          <a
            href="/#story"
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 hover:underline decoration-blue-600 underline-offset-8"
          >
            {nav('story')}
          </a>
          <a
            href="/catalog"
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 hover:underline decoration-blue-600 underline-offset-8"
          >
            {nav('catalog')}
          </a>
          <a
            href="/#faq"
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 hover:underline decoration-blue-600 underline-offset-8"
          >
            {nav('faq')}
          </a>
          <a href="/about" className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 hover:underline decoration-blue-600 underline-offset-8">{nav('about')}</a>
          <a href="/contact" className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 hover:underline decoration-blue-600 underline-offset-8">{nav('contact')}</a>
        </nav>

        {/* Zone 3: Actions (Language, Theme, Admin, Client Portal Login) */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
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
            className="flex flex-col items-center justify-center gap-0.5 px-1.5 min-h-11 text-[10px] sm:text-xs font-medium text-[var(--text-primary)] hover:text-sky-600 transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
            aria-label={sessionUser ? (lang === 'he' ? `החשבון שלי: ${sessionUser.displayName || sessionUser.email}` : `My account: ${sessionUser.displayName || sessionUser.email}`) : (lang === 'he' ? 'כניסה' : 'Sign in')}
          >
            <User className="w-6 h-6" />
            <span className="max-w-[70px] sm:max-w-[100px] truncate" dir="auto">{sessionUser ? (sessionUser.displayName || (lang === 'he' ? 'חשבון' : 'Account')) : (lang === 'he' ? 'כניסה' : 'Sign in')}</span>
          </button>

          <button type="button" onClick={onOpenQuote} disabled={!quoteAvailable} className="hidden min-[1400px]:inline-flex items-center justify-center min-h-11 px-4 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{nav('quote')}</button>

          {/* Mobile menu hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-[1400px]:hidden p-2 text-[var(--text-primary)] hover:bg-[var(--badge-bg)] rounded-md transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="min-[1400px]:hidden px-4 pt-3 pb-6 border-b border-[var(--border-line)] bg-[var(--bg-surface)] shadow-lg animate-in fade-in duration-200">
          <div className="flex flex-col gap-3 text-sm font-medium">
            <a
              href="/#models"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
            >
              {nav('models')}
            </a>
            <a
              href="/#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
            >
              {nav('calculator')}
            </a>
            <a
              href="/#story"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
            >
              {nav('story')}
            </a>
            <a
              href="/catalog"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
            >
              {nav('catalog')}
            </a>
            <a
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
            >
              {nav('faq')}
            </a>
            <a href="/about" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded hover:bg-[var(--badge-bg)] text-[var(--text-primary)]">{nav('about')}</a>
            <a href="/contact" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded hover:bg-[var(--badge-bg)] text-[var(--text-primary)]">{nav('contact')}</a>
            <button type="button" disabled={!quoteAvailable} onClick={() => { setMobileMenuOpen(false); onOpenQuote(); }} className="py-3 px-3 rounded-lg bg-blue-700 text-white font-bold disabled:opacity-50">{nav('quote')}</button>
          </div>
        </div>
      )}
    </header>
  );
};
