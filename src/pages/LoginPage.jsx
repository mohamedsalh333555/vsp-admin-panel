import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Lock, Sms, ArrowRight, Global } from 'iconsax-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  return (
    <div className="min-h-screen bg-vsp-bg flex items-center justify-center p-4 relative">
      {/* Language Switcher on Login */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-1.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Global className="w-4 h-4 text-vsp-accent" variant="Outline" />
          <span>{t('lang_button')}</span>
        </button>
      </div>

      <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-8 w-full max-w-md shadow-2xl glass-panel relative overflow-hidden">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-vsp-card border border-vsp-border rounded-2xl flex items-center justify-center p-2.5 mb-4 shadow-md">
            <img
              src="/vsp_logo.png"
              alt="VSP Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">{t('app_title')}</h1>
          <p className="text-xs text-vsp-textSecondary mt-1">{t('login_sub')}</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-vsp-textSecondary mb-1">
              {t('email_label')}
            </label>
            <div className="relative">
              <Sms className="w-4 h-4 text-vsp-textSecondary absolute right-3 top-3" variant="Outline" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-vsp-textSecondary focus:border-zinc-500 focus:outline-none"
                placeholder="admin@vsp.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-vsp-textSecondary mb-1">
              {t('password_label')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-vsp-textSecondary absolute right-3 top-3" variant="Outline" />
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-vsp-textSecondary focus:border-zinc-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-zinc-100 hover:bg-white text-black font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{t('btn_login')}</span>
                <ArrowRight className="w-4 h-4" variant="Outline" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-[11px] text-vsp-textSecondary">
          <span>{lang === 'ar' ? 'منظومة VSP الرياضية • لوحة الإدارة والتحكم' : 'VSP Sports Platform • Administration Panel'}</span>
        </div>
      </div>
    </div>
  );
};