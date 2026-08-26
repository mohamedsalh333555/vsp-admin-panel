import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Globe, LogOut, ShieldCheck, Crown, Menu } from 'lucide-react';

export const AdminHeader = ({ title, subtitle, action, onToggleMobileSidebar }) => {
  const { t, toggleLanguage } = useLanguage();
  const { profile, logout } = useAuth();

  return (
    <header className="bg-vsp-surface border-b border-vsp-border px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 bg-vsp-card border border-vsp-border rounded-xl text-vsp-accent hover:bg-vsp-border transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-vsp-accent" />
            <h1 className="text-lg md:text-xl font-bold text-white tracking-wide">{title}</h1>
          </div>
          {subtitle && <p className="text-xs text-vsp-textSecondary mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {action}

        {profile && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-vsp-card border border-vsp-border rounded-lg text-xs">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-white">{profile.name || profile.email}</span>
            <span className="bg-vsp-accentSoft text-vsp-accent px-2 py-0.5 rounded text-[10px] font-bold">
              {profile.isCoFounder ? t('cofounder') : t('admin')}
            </span>
          </div>
        )}

        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-1.5 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Globe className="w-4 h-4 text-vsp-accent" />
          <span>{t('lang_button')}</span>
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </header>
  );
};
