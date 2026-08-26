import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ShieldCheck, Lock, Mail, User, Phone, ArrowRight, Globe } from 'lucide-react';

export const LoginPage = () => {
  const { login, register } = useAuth();
  const { t, toggleLanguage } = useLanguage();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        await register(form.name, form.phone, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
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
          <Globe className="w-4 h-4 text-vsp-accent" />
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
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-vsp-textSecondary mb-1">
                  {t('full_name_label')}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-vsp-textSecondary absolute right-3 top-3" />
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-vsp-card border border-vsp-border rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-vsp-textSecondary focus:border-zinc-500 focus:outline-none"
                    placeholder="Ahmed Hassan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-vsp-textSecondary mb-1">
                  {t('phone_label')}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-vsp-textSecondary absolute right-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-vsp-card border border-vsp-border rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-vsp-textSecondary focus:border-zinc-500 focus:outline-none"
                    placeholder="01012345678"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-vsp-textSecondary mb-1">
              {t('email_label')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-vsp-textSecondary absolute right-3 top-3" />
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
              <Lock className="w-4 h-4 text-vsp-textSecondary absolute right-3 top-3" />
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
                <span>{isRegister ? t('send_admin_request') : t('btn_login')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-zinc-400 hover:text-white hover:underline font-semibold"
          >
            {isRegister ? t('already_have_account') : t('btn_register')}
          </button>
        </div>
      </div>
    </div>
  );
};
