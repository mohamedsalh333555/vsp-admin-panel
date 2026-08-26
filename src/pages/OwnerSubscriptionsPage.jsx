import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useLanguage } from '../context/LanguageContext';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Crown,
  Search,
  RefreshCw,
  Clock,
  Sparkles,
  Building2,
  Calendar,
  Phone,
  CheckCircle2,
  Loader2,
  Zap,
} from 'lucide-react';

export const OwnerSubscriptionsPage = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'pro' | 'basic'
  const [processingId, setProcessingId] = useState(null);

  // Pro Upgrade Modal
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [proDays, setProDays] = useState(30);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const data = await adminService.fetchAllUsers({
        roleFilter: 'owner',
        searchQuery: search,
      });
      setOwners(data || []);
    } catch (e) {
      showToast(t('error_loading'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, [search]);

  const handleActivatePro = async () => {
    if (!selectedOwner) return;
    setProcessingId(selectedOwner.id);
    try {
      const res = await adminService.activateVspPro({
        ownerId: selectedOwner.id,
        days: Number(proDays),
      });

      if (res.success) {
        showToast(t('save_booking_success'));
        setSelectedOwner(null);
        fetchOwners();
      } else {
        showToast(res.error || t('error_loading'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const getOwnerProStatus = (owner) => {
    const isPro = owner.subscription_plan === 'pro';
    const rawExpiresAt = owner.subscription_expires_at;
    const expiresAt = rawExpiresAt ? new Date(rawExpiresAt) : null;
    const isTrial = owner.subscription_plan === 'free_trial';

    let isExpired = false;
    if (expiresAt) {
      isExpired = expiresAt.getTime() < Date.now();
    }

    return {
      isPro: isPro && !isExpired,
      isTrial,
      expiresAt,
      isExpired,
    };
  };

  // Filter owners based on selection
  const filteredOwners = owners.filter((owner) => {
    const { isPro, isExpired } = getOwnerProStatus(owner);
    if (filter === 'pro') return isPro && !isExpired;
    if (filter === 'basic') return !isPro || isExpired;
    return true;
  });

  const proCount = owners.filter((o) => getOwnerProStatus(o).isPro).length;
  const basicCount = owners.length - proCount;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Crown className="w-6 h-6 text-zinc-400" />
            <span>{t('owner_subscriptions_title')}</span>
          </h1>
          <p className="text-xs text-vsp-textSecondary mt-0.5">
            {t('owner_subscriptions_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOwners}
            className="p-2.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-vsp-textSecondary hover:text-white rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters & KPI Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${
            filter === 'all'
              ? 'bg-zinc-800 border-zinc-700 text-white shadow-sm'
              : 'bg-vsp-surface border-vsp-border text-vsp-textSecondary hover:border-zinc-700'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-vsp-textSecondary">{t('filter_all_owners')}</span>
            <h3 className="text-xl font-black text-white mt-0.5">{owners.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
            <Building2 className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setFilter('pro')}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${
            filter === 'pro'
              ? 'bg-zinc-800 border-zinc-700 text-white shadow-sm'
              : 'bg-vsp-surface border-vsp-border text-vsp-textSecondary hover:border-zinc-700'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-vsp-textSecondary">{t('filter_pro_owners')}</span>
            <h3 className="text-xl font-black text-white mt-0.5">{proCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
            <Zap className="w-4 h-4 text-vsp-accent" />
          </div>
        </button>

        <button
          onClick={() => setFilter('basic')}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${
            filter === 'basic'
              ? 'bg-zinc-800 border-zinc-700 text-white shadow-sm'
              : 'bg-vsp-surface border-vsp-border text-vsp-textSecondary hover:border-zinc-700'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-vsp-textSecondary">{t('filter_basic_owners')}</span>
            <h3 className="text-xl font-black text-white mt-0.5">{basicCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
            <Clock className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search')}
          className="w-full bg-vsp-surface border border-vsp-border rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
        />
      </div>

      {/* Table */}
      <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
          </div>
        ) : filteredOwners.length === 0 ? (
          <EmptyState
            icon={Crown}
            title={t('no_data')}
            subtitle=""
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-vsp-card/50 text-vsp-textSecondary border-b border-vsp-border">
                <tr>
                  <th className="px-6 py-4 font-bold">{t('owner_col')}</th>
                  <th className="px-6 py-4 font-bold">{t('governorate')}</th>
                  <th className="px-6 py-4 font-bold">{t('plan_col')}</th>
                  <th className="px-6 py-4 font-bold">{t('expiry_col')}</th>
                  <th className="px-6 py-4 font-bold">{t('capacity_col')}</th>
                  <th className="px-6 py-4 font-bold text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vsp-border/50">
                {filteredOwners.map((owner) => {
                  const { isPro, expiresAt, isExpired } = getOwnerProStatus(owner);
                  const isProcessing = processingId === owner.id;

                  return (
                    <tr key={owner.id} className="hover:bg-vsp-card/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
                            {owner.profile_image_url ? (
                              <img
                                src={owner.profile_image_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              owner.name?.charAt(0) || 'M'
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white">{owner.name || '-'}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">{owner.phone || owner.email || ''}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-vsp-textSecondary">
                        {owner.governorate || '-'}
                      </td>

                      <td className="px-6 py-4">
                        {isPro && !isExpired ? (
                          <Badge variant="accent" size="sm">
                            {t('plan_pro')}
                          </Badge>
                        ) : isPro && isExpired ? (
                          <Badge variant="warning" size="sm">
                            {t('plan_expired')}
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">
                            {t('plan_basic')}
                          </Badge>
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono text-[11px]">
                        {expiresAt ? (
                          <span className={isExpired ? 'text-red-400 font-bold' : 'text-zinc-300'}>
                            {expiresAt.toLocaleDateString(t('lang_button') === 'English' ? 'ar-EG' : 'en-US')}
                          </span>
                        ) : (
                          <span className="text-zinc-600">{t('permanent')}</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-zinc-400 font-medium">
                        {isPro && !isExpired ? (
                          <span className="text-vsp-accent font-bold">{t('unlimited_stadiums')}</span>
                        ) : (
                          <span>{t('single_stadium')}</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedOwner(owner)}
                            disabled={isProcessing}
                            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 hover:border-zinc-500 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-vsp-accent" />
                            <span>{isPro && !isExpired ? t('extend_pro_btn') : t('upgrade_pro_btn')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pro Upgrade & Extend Modal */}
      <Modal
        isOpen={Boolean(selectedOwner)}
        onClose={() => setSelectedOwner(null)}
        title={t('pro_modal_title')}
        maxWidth="max-w-md"
      >
        {selectedOwner && (
          <div className="space-y-4">
            <div className="p-4 bg-vsp-card border border-vsp-border rounded-xl">
              <div className="text-xs text-vsp-textSecondary">{t('owner_col')}:</div>
              <div className="font-bold text-white text-sm mt-0.5">{selectedOwner.name}</div>
              <div className="text-xs text-zinc-500 font-mono mt-0.5">{selectedOwner.phone}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-vsp-textSecondary mb-2">
                {t('duration_days')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 90, 180, 365].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setProDays(d)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      proDays === d
                        ? 'bg-zinc-100 text-black border-white shadow-sm'
                        : 'bg-vsp-card text-zinc-300 border-vsp-border hover:border-zinc-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-vsp-card/50 border border-vsp-border rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-zinc-300">{t('pro_features_title')}</div>
              <div className="text-vsp-textSecondary text-[11px]">• {t('pro_f1')}</div>
              <div className="text-vsp-textSecondary text-[11px]">• {t('pro_f2')}</div>
              <div className="text-vsp-textSecondary text-[11px]">• {t('pro_f3')}</div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOwner(null)}
                className="flex-1 py-2.5 bg-vsp-card hover:bg-vsp-border text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleActivatePro}
                disabled={processingId === selectedOwner.id}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-white text-black font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {processingId === selectedOwner.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{t('confirm_activate_plan')}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
