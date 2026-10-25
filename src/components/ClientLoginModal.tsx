import React, { useState } from 'react';
import { X, User, ShieldCheck, Laptop, FileText, ArrowRight, ArrowLeft, LogOut, CheckCircle2 } from 'lucide-react';
import { Language } from '../types';

interface ClientLoginModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
}

export const ClientLoginModal: React.FC<ClientLoginModalProps> = ({
  lang,
  isOpen,
  onClose,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('demo@company.co.il');
  const [password, setPassword] = useState('••••••••');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const isRtl = lang === 'he';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsLoggedIn(true);
    }, 500);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoggedIn ? (
          /* Logged In: Client Management Dashboard */
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-line)]">
              <div>
                <span className="text-xs uppercase font-bold text-sky-600 dark:text-sky-400">
                  {isRtl ? 'אזור אישי ללקוחות' : 'Client Management Portal'}
                </span>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  אקמי טכנולוגיות בע״מ
                </h3>
                <span className="text-xs text-[var(--text-secondary)]">ח.פ 51-584920-1 · לקוח פעיל</span>
              </div>

              <button
                onClick={handleLogout}
                title={isRtl ? 'התנתק' : 'Log out'}
                className="p-2 rounded-lg border border-[var(--border-line)] text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Active Subscriptions Summary */}
            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-sky-800 dark:text-sky-300">
                <span className="flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-sky-600" />
                  <span>ציוד פעיל בליסינג</span>
                </span>
                <span className="bg-sky-600 text-white px-2 py-0.5 rounded text-[11px]">3 מכשירים</span>
              </div>

              <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>דגם:</span>
                  <span className="font-bold text-[var(--text-primary)] font-mono">Dell Latitude 7420 (Core i5)</span>
                </div>
                <div className="flex justify-between">
                  <span>חיוב חודשי כולל:</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400 font-mono tabular-nums">₪297 / חודש (לפני מע״מ)</span>
                </div>
                <div className="flex justify-between">
                  <span>תום תקופת הסכם:</span>
                  <span className="font-mono">15.11.2028 (31 חודשים נותרו)</span>
                </div>
              </div>
            </div>

            {/* Actions for client */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                פעולות מהירות
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onClose}
                  className="p-3 rounded-lg border border-[var(--border-line)] hover:border-blue-500 text-start text-xs font-semibold transition-colors"
                >
                  <div className="text-[var(--text-primary)]">הוספת מחשבים להסכם</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">הרחבת הציוד לעובדים חדשים</div>
                </button>
                <button
                  onClick={onClose}
                  className="p-3 rounded-lg border border-[var(--border-line)] hover:border-blue-500 text-start text-xs font-semibold transition-colors"
                >
                  <div className="text-[var(--text-primary)]">קריאת שירות / תמיכה</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">החלפת מכשיר או סיוע טכני</div>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                סגור
              </button>
            </div>
          </div>
        ) : (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="text-start">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase rounded bg-blue-50 dark:bg-sky-950/60 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-sky-800 mb-2">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>{isRtl ? 'כניסה ללקוחות קיימים' : 'Client Portal Login'}</span>
              </div>

              <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                {isRtl ? 'פאנל ניהול ציוד עסקי' : 'Customer Account Login'}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                {isRtl
                  ? 'צפייה בהסכמי הליסינג, מצב התשלומים והזמנת מחשבים נוספים.'
                  : 'Manage active leases, billing schedules, and request additional fleet units.'}
              </p>
            </div>

            <div className="space-y-3 text-start">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  {isRtl ? 'דוא״ל מורשה' : 'Business Email'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  {isRtl ? 'סיסמה / קוד ארגוני' : 'Password'}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-[var(--text-secondary)]">
              {isRtl
                ? 'לקוחות חדשים מקבלים פרטי כניסה אוטומטית עם חתימת הסכם הליסינג הראשון.'
                : 'Login credentials are issued automatically upon signing the initial lease.'}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {isRtl ? 'ביטול' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 rounded-lg shadow transition-all cursor-pointer"
              >
                {isLoading ? (
                  <span>{isRtl ? 'מתחבר...' : 'Connecting...'}</span>
                ) : (
                  <>
                    <span>{isRtl ? 'התחבר למערכת' : 'Log In'}</span>
                    {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
