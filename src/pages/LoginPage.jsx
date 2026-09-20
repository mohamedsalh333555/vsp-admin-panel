import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Lock, Sms, ArrowRight, ArrowLeft, Global, Eye, EyeSlash } from 'iconsax-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;

    setLoading(true);
    setError(null);

    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.message || t('error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const isRTL = lang === 'ar';

  return (
    <div className="min-h-screen bg-vsp-bg flex items-center justify-center p-4 relative select-none">
      {/* Language Switcher on Login */}
      <div className="absolute top-6 right-6 z-10">
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
        >
          <Global className="w-4 h-4 text-vsp-accent" variant="Outline" />
          <span>{t('lang_button')}</span>
        </button>
      </div>

      <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-8 w-full max-w-md shadow-2xl glass-panel relative overflow-hidden">
        {/* Header & Logo */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-20 h-20 bg-vsp-card border border-vsp-border rounded-2xl flex items-center justify-center p-2.5 mb-4 shadow-md">
            <img
              src="/vsp_logo.png"
              alt="VSP Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">{t('app_title')}</h1>
          <p className="text-xs text-vsp-textSecondary mt-1.5 leading-relaxed">{t('login_sub')}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs font-semibold text-center leading-relaxed flex items-center justify-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-vsp-textSecondary mb-1.5">
              {t('email_label')}
            </label>
            <div className="relative">
              <Sms className={`w-4 h-4 text-vsp-textSecondary absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`} variant="Outline" />
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`w-full bg-vsp-card border border-vsp-border rounded-xl py-2.5 text-xs text-white placeholder-vsp-textSecondary focus:border-zinc-500 focus:outline-none transition-colors ${
                  isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'
                }`}
                placeholder="admin@vsp.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-vsp-textSecondary mb-1.5">
              {t('password_label')}
            </label>
            <div className="relative">
              <Lock className={`w-4 h-4 text-vsp-textSecondary absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`} variant="Outline" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`w-full bg-vsp-card border border-vsp-border rounded-xl py-2.5 text-xs text-white placeholder-vsp-textSecondary focus:border-zinc-500 focus:outline-none transition-colors ${
                  isRTL ? 'pr-10 pl-11' : 'pl-10 pr-11'
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                className={`absolute top-2.5 p-1 text-vsp-textSecondary hover:text-white transition-colors ${
                  isRTL ? 'left-2.5' : 'right-2.5'
                }`}
              >
                {showPassword ? (
                  <EyeSlash className="w-4 h-4" variant="Outline" />
                ) : (
                  <Eye className="w-4 h-4" variant="Outline" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !form.email || !form.password}
            className="w-full py-3 bg-zinc-100 hover:bg-white text-black font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 mt-3 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{t('btn_login')}</span>
                {isRTL ? (
                  <ArrowLeft className="w-4 h-4" variant="Outline" />
                ) : (
                  <ArrowRight className="w-4 h-4" variant="Outline" />
                )}
              </>
            )}
          </button>
        </form>

        {/* Security / Audience Note */}
        <div className="mt-6 pt-4 border-t border-vsp-border/50 text-center text-[11px] text-vsp-textSecondary space-y-1">
          <p className="font-semibold text-zinc-400">
            {lang === 'ar'
              ? 'بوابة الدخول الموحدة للمشرفين والشركاء'
              : 'Unified Access for Administrators & Partners'}
          </p>
          <p className="text-[10px] text-zinc-500">
            {lang === 'ar'
              ? 'لحسابات اللاعبين وأصحاب الملاعب، يرجى استخدام تطبيق الموبايل'
              : 'For players and venue owners, please use the VSP Mobile App'}
          </p>
        </div>
      </div>
    </div>
  );
};