import React, { useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Globe, LogOut, ShieldCheck, Crown, Menu, Camera, User } from 'lucide-react';

export const AdminHeader = ({ title, subtitle, action, onToggleMobileSidebar }) => {
  const { t, toggleLanguage } = useLanguage();
  const { profile, logout, updateAvatar } = useAuth();
  const fileInputRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // رفع مباشر للملف إلى سوبابيز Storage
    await updateAvatar(file);
  };

  const avatarUrl = profile?.avatar_url || profile?.profile_image_url;
  const displayName = profile?.name || profile?.email || 'Admin';

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
          <div className="flex items-center gap-3 px-3 py-1.5 bg-vsp-card border border-vsp-border rounded-xl text-xs shadow-sm">
            {/* Interactive Avatar */}
            <div className="relative group">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="تغيير الصورة الشخصية / Change Avatar"
                className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center relative cursor-pointer group-hover:border-vsp-accent transition-all"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-zinc-700 to-zinc-900 text-xs">
                    {displayName.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </button>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-vsp-accent fill-vsp-accent shrink-0" />
                <span className="font-bold text-white text-xs">{displayName}</span>
              </div>
            </div>

            <span className="bg-vsp-card text-zinc-300 border border-vsp-border px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider">
              {profile?.position || (profile?.isCoFounder ? 'Co-Founder' : 'Admin')}
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
