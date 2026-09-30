import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { AdminHeader } from './components/AdminHeader';
import { AdminSidebar } from './components/AdminSidebar';
import { NetworkBanner } from './components/NetworkBanner';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { DashboardOverview } from './pages/DashboardOverview';
import { OwnerAuditsPage } from './pages/OwnerAuditsPage';
import { OwnerSubscriptionsPage } from './pages/OwnerSubscriptionsPage';
import { UsersModerationPage } from './pages/UsersModerationPage';
import { DisputesPage } from './pages/DisputesPage';
import { PayoutSettlementsPage } from './pages/PayoutSettlementsPage';
import { League1v1Page } from './pages/League1v1Page';
import { TournamentControlPage } from './pages/TournamentControlPage';
import { TeamLeagueControlPage } from './pages/TeamLeagueControlPage';
import { BannersManagementPage } from './pages/BannersManagementPage';
import { CRMSettingsPage } from './pages/CRMSettingsPage';
import { Clock, Logout, RotateRight } from 'iconsax-react';

const VALID_TABS = [
  'dashboard', 'owner_audits', 'owner_subscriptions', 'users',
  'disputes', 'payout_settlements', 'league_1v1', 'team_leagues', 'tournaments',
  'banners', 'settings',
];

const getInitialTab = () => {
  const hash = window.location.hash.replace('#', '');
  return VALID_TABS.includes(hash) ? hash : 'dashboard';
};

export default function App() {
  const { user, profile, loading, logout } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // مزامنة الرابط مع الصفحة النشطة لحفظ السياق عند الـ Refresh (F5)
  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  // مزامنة الصفحة عند الضغط على زر الرجوع/الأمام في المتصفح
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (VALID_TABS.includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-vsp-bg flex items-center justify-center">
        <RotateRight variant="Outline" className="w-10 h-10 text-vsp-accent animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-vsp-bg flex flex-col">
        <NetworkBanner />
        <div className="flex-1 flex items-center justify-center">
          <LoginPage />
        </div>
      </div>
    );
  }

  // Pending Admin Approval check
  if (profile && !profile.isApprovedAdmin) {
    return (
      <div className="min-h-screen bg-vsp-bg flex flex-col">
        <NetworkBanner />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-8 w-full max-w-md text-center space-y-4 shadow-2xl glass-panel">
            <div className="w-16 h-16 bg-vsp-card border border-vsp-border rounded-2xl flex items-center justify-center mx-auto text-zinc-400">
              <Clock variant="Outline" className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">{t('pending_approval')}</h2>
            <p className="text-xs text-vsp-textSecondary leading-relaxed">{t('pending_note')}</p>
            <button
              onClick={logout}
              className="w-full py-3 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Logout variant="Outline" className="w-4 h-4 text-vsp-accent" />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview onNavigate={setActiveTab} />;
      case 'owner_audits':
        return <OwnerAuditsPage />;
      case 'owner_subscriptions':
        return <OwnerSubscriptionsPage />;
      case 'users':
        return <UsersModerationPage />;
      case 'disputes':
        return <DisputesPage />;
      case 'payout_settlements':
        return <PayoutSettlementsPage />;
      case 'league_1v1':
        return <League1v1Page />;
      case 'team_leagues':
        return <TeamLeagueControlPage />;
      case 'tournaments':
        return <TournamentControlPage />;
      case 'banners':
        return <BannersManagementPage />;
      case 'settings':
        return <CRMSettingsPage />;
      default:
        return <DashboardOverview onNavigate={setActiveTab} />;
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return t('dashboard');
      case 'owner_audits':
        return t('owner_audits');
      case 'owner_subscriptions':
        return t('owner_subscriptions');
      case 'users':
        return t('users');
      case 'disputes':
        return t('disputes');
      case 'payout_settlements':
        return t('payout_settlements');
      case 'league_1v1':
        return t('league_1v1');
      case 'team_leagues':
        return 'دوري الفرق';
      case 'tournaments':
        return t('tournaments');
      case 'banners':
        return t('banners');
      case 'settings':
        return t('settings');
      default:
        return t('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-vsp-bg text-vsp-textPrimary flex flex-col">
      <NetworkBanner />
      <div className="flex-1 flex min-w-0">
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title={getPageTitle()}
            onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          />
          <main className="flex-1 overflow-y-auto">
            <ErrorBoundary key={activeTab}>
              {renderContent()}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
}