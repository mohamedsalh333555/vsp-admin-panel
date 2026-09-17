import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import {
  Send,
  Wrench,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Users,
  Building2,
  Smartphone,
  Shield,
  Megaphone,
} from 'lucide-react';

export const CRMSettingsPage = () => {
  const { t } = useLanguage();
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  const [notif, setNotif] = useState({
    title: '',
    body: '',
    targetAudience: 'all', // 'all' | 'players' | 'owners'
    type: 'announcement', // 'announcement' | 'update' | 'warning'
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const config = await adminService.fetchSystemConfig();
      setMaintenance(Boolean(config.maintenance_mode));
    } catch (e) {
      console.error('Error fetching system config:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Toggle Maintenance Mode
  const toggleMaintenance = async () => {
    const nextState = !maintenance;
    setMaintenance(nextState);
    try {
      const res = await adminService.setMaintenanceMode(nextState);
      if (res.success) {
        showToast(t(nextState ? 'toast_maintenance_on' : 'toast_maintenance_off'));
      } else {
        showToast(t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Send Broadcast
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!notif.title.trim() || !notif.body.trim()) {
      showToast(t('toast_broadcast_fill'), 'error');
      return;
    }

    setSending(true);
    try {
      const res = await adminService.sendTargetedBroadcastNotification(notif);
      if (res.success) {
        showToast(t('toast_broadcast_sent'));
        setNotif({
          title: '',
          body: '',
          targetAudience: 'all',
          type: 'announcement',
        });
      } else {
        showToast(res.error || t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-zinc-400" />
          <span>{t('crm_title')}</span>
        </h1>
        <p className="text-xs text-vsp-textSecondary mt-0.5">
          {t('crm_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Broadcast Sender Column */}
        <div className="lg:col-span-7 bg-vsp-surface border border-vsp-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-vsp-border pb-4">
            <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{t('broadcast_card_title')}</h3>
              <p className="text-[11px] text-vsp-textSecondary">
                {t('crm_subtitle')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white mb-2">{t('target_audience_label')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: t('audience_all'), icon: Users },
                  { id: 'players', label: t('audience_players'), icon: Smartphone },
                  { id: 'owners', label: t('audience_owners'), icon: Building2 },
                ].map((aud) => {
                  const Icon = aud.icon;
                  const isSelected = notif.targetAudience === aud.id;
                  return (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => setNotif({ ...notif, targetAudience: aud.id })}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-vsp-accent text-black border-vsp-accent shadow-lg shadow-vsp-accent/10'
                          : 'bg-vsp-card text-vsp-textSecondary border-vsp-border hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{aud.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">
                {t('notif_title_label')}
              </label>
              <input
                type="text"
                required
                value={notif.title}
                onChange={(e) => setNotif({ ...notif, title: e.target.value })}
                placeholder={t('notif_title_placeholder')}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-vsp-accent focus:outline-none placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">
                {t('notif_body_label')}
              </label>
              <textarea
                required
                rows={4}
                value={notif.body}
                onChange={(e) => setNotif({ ...notif, body: e.target.value })}
                placeholder={t('notif_body_placeholder')}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl p-3.5 text-xs text-white focus:border-vsp-accent focus:outline-none placeholder:text-zinc-600 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-vsp-accent hover:bg-vsp-accentHover text-black font-extrabold text-xs rounded-xl shadow-lg shadow-vsp-accent/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{sending ? t('processing') : t('send_notif_btn')}</span>
            </button>
          </form>
        </div>

        {/* System Health & Maintenance Column */}
        <div className="lg:col-span-5 space-y-4">
          {/* Maintenance Mode Card */}
          <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">{t('maintenance_title')}</h3>
                <p className="text-[11px] text-vsp-textSecondary">
                  {t('maintenance_toggle')}
                </p>
              </div>
            </div>

            <p className="text-xs text-vsp-textSecondary leading-relaxed">
              {t('maintenance_desc')}
            </p>

            <div className="flex items-center justify-between p-3.5 bg-vsp-card border border-vsp-border rounded-xl">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    maintenance ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'
                  }`}
                />
                <span className="text-xs font-bold text-white">
                  {maintenance ? t('maintenance_active_status') : t('maintenance_inactive_status')}
                </span>
              </div>

              <button
                onClick={toggleMaintenance}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  maintenance
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-black'
                    : 'bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40'
                }`}
              >
                {maintenance ? t('disable_maintenance') : t('enable_maintenance')}
              </button>
            </div>
          </div>

          {/* Infrastructure Health */}
          <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-6 space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-vsp-accent" />
              <span>{t('infra_health_title')}</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-vsp-card rounded-lg">
                <span className="text-vsp-textSecondary">{t('infra_db')}</span>
                <Badge variant="success" size="xs">
                  {t('infra_db_status')}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-vsp-card rounded-lg">
                <span className="text-vsp-textSecondary">{t('infra_region')}</span>
                <span className="text-white font-mono text-[11px]">eu-west-1</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-vsp-card rounded-lg">
                <span className="text-vsp-textSecondary">{t('infra_rpc')}</span>
                <Badge variant="accent" size="xs">
                  {t('infra_rpc_status')}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
