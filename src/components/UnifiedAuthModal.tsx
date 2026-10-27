import React, { useState } from 'react';
import {
  X,
  User,
  ShieldCheck,
  Lock,
  Mail,
  Building2,
  Phone,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { Language } from '../types';
import { UserAccount } from '../domain/schema';
import { SEEDED_USERS } from '../data/mockDatabase';

interface UnifiedAuthModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

type AuthMode = 'login' | 'register' | 'forgot_password';

export const UnifiedAuthModal: React.FC<UnifiedAuthModalProps> = ({
  lang,
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const isRtl = lang === 'he';

  const [mode, setMode] = useState<AuthMode>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regType, setRegType] = useState<'b2b' | 'b2c'>('b2b');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regTaxId, setRegTaxId] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify_otp' | 'done'>('request');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Standard Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      // Check seeded users by email
      const matchedUser = SEEDED_USERS.find(
        (u) => u.email.toLowerCase() === loginEmail.toLowerCase().trim()
      );

      if (matchedUser) {
        onLoginSuccess(matchedUser);
        onClose();
      } else if (loginEmail.includes('@')) {
        // Fallback create generic customer account if arbitrary email
        const genericUser: UserAccount = {
          id: `usr_${Date.now()}`,
          email: loginEmail,
          phone: '+972-50-0000000',
          fullName: loginEmail.split('@')[0],
          role: 'customer_admin',
          status: 'active',
          permissions: {
            canViewOwnerDashboard: false,
            canViewSupplierCosts: false,
            canOverridePricing: false,
            canIssueRefunds: false,
            canManageWarehouseAssets: false,
            canManageContracts: false,
            canManageLedger: false,
            canManageUsersAndRoles: false,
            canManageCMSAndContent: false,
            canExportData: false,
          },
        };
        onLoginSuccess(genericUser);
        onClose();
      } else {
        setLoginError(
          isRtl
            ? 'כתובת דוא״ל או סיסמה שגויים. נסה את אחד מחשבונות ההדגמה למטה.'
            : 'Invalid email or password. You can use one of the quick demo accounts below.'
        );
      }
    }, 450);
  };

  // Quick 1-Click Demo Login
  const handleQuickLogin = (user: UserAccount) => {
    setLoginEmail(user.email);
    setLoginPassword('••••••••');
    onLoginSuccess(user);
    onClose();
  };

  // Handle Registration
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const newUser: UserAccount = {
        id: `usr_${Date.now()}`,
        email: regEmail,
        phone: regPhone,
        fullName: regFullName,
        role: regType === 'b2b' ? 'customer_admin' : 'customer_employee',
        organizationName: regType === 'b2b' ? regCompanyName : undefined,
        taxId: regType === 'b2b' ? regTaxId : undefined,
        status: 'active',
        permissions: {
          canViewOwnerDashboard: false,
          canViewSupplierCosts: false,
          canOverridePricing: false,
          canIssueRefunds: false,
          canManageWarehouseAssets: false,
          canManageContracts: false,
          canManageLedger: false,
          canManageUsersAndRoles: false,
          canManageCMSAndContent: false,
          canExportData: false,
        },
        lastLoginAt: new Date().toISOString(),
      };

      onLoginSuccess(newUser);
      onClose();
    }, 550);
  };

  // Handle Forgot Password Flow
  const handleRequestResetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setForgotStep('verify_otp');
      setOtpCode('481920'); // seeded simulated code
    }, 500);
  };

  const handleConfirmNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setForgotStep('done');
      setSuccessMessage(
        isRtl
          ? 'הסיסמה אופסה בהצלחה! כעת ניתן להתחבר עם הסיסמה החדשה.'
          : 'Password successfully reset! You can now sign in with your new password.'
      );
    }, 500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="pb-4 border-b border-[var(--border-line)] mb-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold uppercase rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isRtl ? 'שער כניסה מאוחד' : 'Unified Access Portal'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            {mode === 'login' && (isRtl ? 'כניסה למערכת' : 'Sign In')}
            {mode === 'register' && (isRtl ? 'פתיחת חשבון חדש' : 'Create New Account')}
            {mode === 'forgot_password' && (isRtl ? 'איפוס ושחזור סיסמה' : 'Reset Password')}
          </h2>

          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {mode === 'login' &&
              (isRtl
                ? 'שער כניסה אחד לכולם: לקוחות, שותפים וצוות ההנהלה. למשתמשים מורשים תופיע גישה ל-Back Office.'
                : 'Single portal for all users: clients, partners, and staff. Privileged users receive Back Office access.')}
            {mode === 'register' &&
              (isRtl
                ? 'הרשמה מהירה עבור חברות ועסקים (B2B) או לקוחות פרטיים.'
                : 'Instant account setup for B2B enterprises or personal customers.')}
            {mode === 'forgot_password' &&
              (isRtl
                ? 'אימות בטוח באמצעות קוד OTP הנשלח לכתובת הדוא״ל או לטלפון.'
                : 'Secure password reset via simulated OTP email or SMS verification.')}
          </p>
        </div>

        {/* MODE 1: LOGIN */}
        {mode === 'login' && (
          <div className="space-y-5">
            {loginError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  {isRtl ? 'כתובת דוא״ל (Email)' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--text-secondary)] absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.co.il"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full ps-10 pe-3 py-2.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                    {isRtl ? 'סיסמה' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setForgotStep('request');
                    }}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {isRtl ? 'שכחת סיסמה?' : 'Forgot password?'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[var(--text-secondary)] absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full ps-10 pe-3 py-2.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span>{isRtl ? 'מאמת נתונים...' : 'Authenticating...'}</span>
                ) : (
                  <>
                    <span>{isRtl ? 'התחבר לחשבון' : 'Sign In'}</span>
                    {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Logins Section */}
            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2.5">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                {isRtl ? 'כניסה מהירה לחשבונות הדגמה (1-Click Demo):' : 'Quick Demo One-Click Access:'}
              </span>

              <div className="grid grid-cols-1 gap-2">
                {/* 1. Owner */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin(SEEDED_USERS[0])}
                  className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 flex items-center justify-between text-start transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs">
                      👑
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        {SEEDED_USERS[0].fullName}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        {SEEDED_USERS[0].email} · <span className="font-bold text-amber-600 dark:text-amber-400">Owner (Back Office Access)</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">
                    {isRtl ? 'התחבר כבעלים' : 'Sign in as Owner'}
                  </span>
                </button>

                {/* 2. B2B Client */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin(SEEDED_USERS[3])}
                  className="p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 flex items-center justify-between text-start transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-xs">
                      🏢
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        {SEEDED_USERS[3].fullName} (אקמי טכנולוגיות בע״מ)
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        {SEEDED_USERS[3].email} · <span className="font-semibold text-blue-600 dark:text-blue-400">Client Portal</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-bold">
                    {isRtl ? 'התחבר כלקוח' : 'Sign in as Client'}
                  </span>
                </button>

                {/* 3. Warehouse Operator */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin(SEEDED_USERS[2])}
                  className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/20 hover:bg-slate-800/40 flex items-center justify-between text-start transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                      📦
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        {SEEDED_USERS[2].fullName}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        {SEEDED_USERS[2].email} · Warehouse Staff
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">
                    {isRtl ? 'כניסת מחסנאי' : 'Sign in as Staff'}
                  </span>
                </button>
              </div>
            </div>

            {/* Bottom Register Switcher */}
            <div className="pt-3 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
              <span>{isRtl ? 'עדיין אין לך חשבון? ' : "Don't have an account yet? "}</span>
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {isRtl ? 'פתח חשבון עסקי חדש' : 'Create new account'}
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: REGISTER NEW ACCOUNT */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="flex items-center gap-2 p-1 rounded-lg bg-[var(--badge-bg)] border border-[var(--border-line)]">
              <button
                type="button"
                onClick={() => setRegType('b2b')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  regType === 'b2b'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {isRtl ? 'חשבון עסקי (B2B)' : 'Business Account (B2B)'}
              </button>
              <button
                type="button"
                onClick={() => setRegType('b2c')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  regType === 'b2c'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {isRtl ? 'לקוח פרטי (B2C)' : 'Individual Client (B2C)'}
              </button>
            </div>

            {regType === 'b2b' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    {isRtl ? 'שם החברה / הארגון' : 'Company Name'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="שם חברה בע״מ"
                    value={regCompanyName}
                    onChange={(e) => setRegCompanyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    {isRtl ? 'מספר ח.פ / ע.מ' : 'Tax ID (H.P.)'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="51-XXXXXX-X"
                    value={regTaxId}
                    onChange={(e) => setRegTaxId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  {isRtl ? 'שם איש קשר מלא' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="ישראל ישראלי"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  {isRtl ? 'טלפון נייד' : 'Mobile Phone'}
                </label>
                <input
                  type="tel"
                  required
                  placeholder="05X-XXXXXXX"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                {isRtl ? 'כתובת דוא״ל לעסקים' : 'Corporate Email'}
              </label>
              <input
                type="email"
                required
                placeholder="contact@company.co.il"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                {isRtl ? 'בחר סיסמה' : 'Create Password'}
              </label>
              <input
                type="password"
                required
                placeholder="לפחות 8 תווים"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>{isRtl ? 'פותח חשבון...' : 'Creating Account...'}</span>
              ) : (
                <>
                  <span>{isRtl ? 'השלם הרשמה והתחבר' : 'Complete Registration & Sign In'}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>

            <div className="pt-2 text-center text-xs text-[var(--text-secondary)]">
              <span>{isRtl ? 'כבר יש לך חשבון? ' : 'Already have an account? '}</span>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {isRtl ? 'התחבר כאן' : 'Sign in here'}
              </button>
            </div>
          </form>
        )}

        {/* MODE 3: FORGOT PASSWORD */}
        {mode === 'forgot_password' && (
          <div className="space-y-4">
            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {forgotStep === 'request' && (
              <form onSubmit={handleRequestResetOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {isRtl ? 'הזן את כתובת הדוא״ל של החשבון' : 'Account Email'}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.co.il"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span>{isRtl ? 'שולח קוד אימות...' : 'Sending Code...'}</span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>{isRtl ? 'שלח קוד אימות OTP' : 'Send Reset Code'}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {forgotStep === 'verify_otp' && (
              <form onSubmit={handleConfirmNewPassword} className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400">
                  {isRtl
                    ? `קוד אימות סימולטיבי נשלח ל-${forgotEmail}: `
                    : `Simulated OTP code sent to ${forgotEmail}: `}
                  <span className="font-mono font-bold">481920</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {isRtl ? 'קוד אימות (6 ספרות)' : 'OTP Code (6 digits)'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="481920"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] font-mono text-center tracking-widest text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {isRtl ? 'סיסמה חדשה' : 'New Password'}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="לפחות 8 תווים"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-page)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span>{isRtl ? 'מעדכן סיסמה...' : 'Updating Password...'}</span>
                  ) : (
                    <span>{isRtl ? 'אמת קוד ושמור סיסמה חדשה' : 'Verify & Set New Password'}</span>
                  )}
                </button>
              </form>
            )}

            {forgotStep === 'done' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                {isRtl ? 'חזרה למסך התחברות' : 'Back to Sign In'}
              </button>
            )}

            <div className="pt-2 text-center text-xs text-[var(--text-secondary)]">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {isRtl ? 'ביטול וחזרה להתחברות' : 'Cancel and return to Sign In'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
