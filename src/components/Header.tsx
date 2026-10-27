import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Globe,
  Menu,
  X,
  ShieldCheck,
  User,
  Download,
  LogOut,
  Building2,
  Lock,
} from 'lucide-react';
import { Language, Theme } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { isStaffOrAdmin, UserAccount } from '../domain/schema';

interface HeaderProps {
  lang: Language;
  theme: Theme;
  currentUser: UserAccount | null;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenOwnerBackOffice: () => void;
  onOpenClientPortal?: () => void;
  onOpenDealerPortal?: () => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  theme,
  currentUser,
  onToggleLang,
  onToggleTheme,
  onOpenAuth,
  onLogout,
  onOpenOwnerBackOffice,
  onOpenClientPortal,
  onOpenDealerPortal,
  onOpenExport,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'he';

  const hasStaffPrivileges = isStaffOrAdmin(currentUser);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--bg-page)]/95 border-b border-[var(--border-line)] transition-colors duration-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark (Official SVG logo) */}
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
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[var(--text-secondary)]">
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

        {/* Zone 3: Actions (Auth, Back Office, Language, Theme, Export) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* PRIVILEGED ONLY: Back Office button appears ONLY if user is staff/owner */}
          {hasStaffPrivileges && (
            <button
              onClick={onOpenOwnerBackOffice}
              title={isRtl ? 'כניסה ל-Back Office (מורשה)' : 'Open Back Office (Privileged)'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 bg-amber-500/15 hover:bg-amber-500/25 rounded-lg border border-amber-500/40 transition-all shadow-xs cursor-pointer active:scale-95 animate-in fade-in"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{isRtl ? 'Back Office (ניהול)' : 'Back Office'}</span>
            </button>
          )}

          {hasStaffPrivileges && (
            <div className="hidden lg:flex items-center gap-1">
              <button
                onClick={onOpenClientPortal}
                title={isRtl ? 'תצוגת אזור אישי ללקוח' : 'View Customer Portal'}
                className="px-2 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 rounded-md border border-sky-500/30 transition-colors cursor-pointer"
              >
                {isRtl ? 'פורטל לקוח' : 'Client Portal'}
              </button>
              <button
                onClick={onOpenDealerPortal}
                title={isRtl ? 'תצוגת פורטל דילרים ושותפים' : 'View Dealer Portal'}
                className="px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-md border border-amber-500/30 transition-colors cursor-pointer"
              >
                {isRtl ? 'פורטל דילר' : 'Dealer Portal'}
              </button>
            </div>
          )}

          {/* Export Project ZIP */}
          <button
            onClick={onOpenExport}
            title={lang === 'he' ? 'ייצוא קוד הפרויקט (ZIP)' : 'Экспорт проекта (ZIP)'}
            className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 rounded-md border border-emerald-300 dark:border-emerald-700/60 transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{lang === 'he' ? 'ייצוא ZIP' : 'Экспорт ZIP'}</span>
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

          {/* AUTHENTICATION ZONE: Single portal for all users */}
          {currentUser ? (
            /* Logged in state: user profile pill with logout */
            <div className="flex items-center gap-1.5 ps-1 border-s border-[var(--border-line)]">
              <div
                onClick={() => {
                  if (currentUser.role === 'dealer') {
                    onOpenDealerPortal?.();
                  } else if (hasStaffPrivileges) {
                    onOpenOwnerBackOffice();
                  } else {
                    onOpenClientPortal?.();
                  }
                }}
                title={currentUser.fullName}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--badge-bg)] border border-[var(--border-line)] text-start cursor-pointer hover:border-blue-500/40 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {currentUser.isOwner ? '👑' : currentUser.fullName.charAt(0)}
                </div>
                <div className="hidden sm:block text-start">
                  <div className="text-[11px] font-bold text-[var(--text-primary)] leading-tight truncate max-w-[120px]">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[9px] text-[var(--text-secondary)] font-mono leading-tight">
                    {currentUser.isOwner ? 'Owner' : currentUser.role}
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                title={isRtl ? 'התנתקות מהמערכת' : 'Sign Out'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Not logged in: Single Unified Entry Button */
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 rounded-lg shadow-sm transition-all duration-150 whitespace-nowrap shrink-0 active:scale-[0.98] cursor-pointer"
            >
              <User className="w-4 h-4 shrink-0" />
              <span>{isRtl ? 'כניסה / הרשמה' : 'Sign In / Register'}</span>
            </button>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[var(--border-line)] bg-[var(--bg-page)] px-4 pt-3 pb-6 space-y-2 animate-in fade-in">
          <nav className="flex flex-col space-y-1 text-sm font-medium">
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

            {/* Back Office button in mobile menu if staff */}
            {hasStaffPrivileges && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenOwnerBackOffice();
                }}
                className="flex items-center gap-2 py-2 px-3 text-start rounded text-amber-500 font-bold hover:bg-amber-500/10 transition-colors w-full cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>{isRtl ? 'כניסה ל-Back Office (ניהול)' : 'Back Office (Privileged)'}</span>
              </button>
            )}

            {/* Unified Auth button in mobile menu */}
            {!currentUser && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="flex items-center gap-2 py-2 px-3 text-start rounded text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-500/10 transition-colors w-full cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>{isRtl ? 'כניסה / פתיחת חשבון חדש' : 'Sign In / Register Account'}</span>
              </button>
            )}

            {currentUser && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="flex items-center gap-2 py-2 px-3 text-start rounded text-red-500 font-bold hover:bg-red-500/10 transition-colors w-full cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isRtl ? 'התנתקות' : 'Sign Out'}</span>
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
