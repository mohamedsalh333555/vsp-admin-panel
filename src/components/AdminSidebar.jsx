import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { adminService } from '../services/adminService';
import {
  LayoutDashboard,
  FileCheck2,
  Crown,
  Users,
  Trophy,
  Swords,
  CreditCard,
  Flame,
  Settings,
  X,
  Shield,
} from 'lucide-react';

export const AdminSidebar = ({ activeTab, setActiveTab, mobileOpen, onCloseMobile }) => {
  const { t } = useLanguage();
  const [counts, setCounts] = useState({
    pendingOwners: 0,
    disputes: 0,
    payouts: 0,
  });

  useEffect(() => {
    const loadCounters = async () => {
      try {
        const stats = await adminService.fetchDashboardStats();
        setCounts({
          pendingOwners: stats.pendingOwners || 0,
          disputes: stats.disputesCount || 0,
          payouts: stats.pendingPayouts || 0,
        });
      } catch (_) {}
    };

    loadCounters();
    const interval = setInterval(loadCounters, 20000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    {
      id: 'owner_audits',
      label: t('owner_audits'),
      icon: FileCheck2,
      badge: counts.pendingOwners > 0 ? counts.pendingOwners : null,
      badgeColor: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    },
    {
      id: 'owner_subscriptions',
      label: t('owner_subscriptions'),
      icon: Crown,
    },
    {
      id: 'users',
      label: t('users'),
      icon: Users,
    },
    {
      id: 'disputes',
      label: t('disputes'),
      icon: Swords,
      badge: counts.disputes > 0 ? counts.disputes : null,
      badgeColor: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    },
    {
      id: 'payout_settlements',
      label: t('payout_settlements'),
      icon: CreditCard,
      badge: counts.payouts > 0 ? counts.payouts : null,
      badgeColor: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    },
    {
      id: 'league_1v1',
      label: t('league_1v1'),
      icon: Flame,
    },
    {
      id: 'tournaments',
      label: t('tournaments'),
      icon: Trophy,
    },
    {
      id: 'settings',
      label: t('settings'),
      icon: Settings,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-vsp-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-vsp-card border border-vsp-border rounded-xl flex items-center justify-center p-1.5 shadow-sm overflow-hidden shrink-0">
              <img
                src="/vsp_logo.png"
                alt="VSP Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="font-black text-white text-sm tracking-wider flex items-center gap-1.5">
                <span>VSP</span>
                <span className="text-zinc-500 font-normal text-xs">|</span>
                <span className="text-xs font-bold text-zinc-300">{t('brand_name')}</span>
              </h2>
              <p className="text-[10px] text-vsp-accent font-semibold tracking-wide">
                {t('brand_subtitle')}
              </p>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 bg-vsp-card border border-vsp-border rounded-lg text-vsp-textSecondary hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-vsp-accent' : 'text-zinc-500'}`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:block w-64 bg-vsp-surface border-r border-vsp-border h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 bg-vsp-surface border-r border-vsp-border h-full shadow-2xl z-10">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
