import React, { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const OwnerSubscriptionsPage = () => {
  const { t, lang, isRTL } = useLanguage();
  const isAr = lang === 'ar' || isRTL;
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'pro' | 'trial' | 'expired'
  const [processingId, setProcessingId] = useState(null);

  // Pro Upgrade & Extend Modal
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [proDays, setProDays] = useState(30);
  const [isCustomDays, setIsCustomDays] = useState(false);

  // Downgrade Confirm Modal
  const [downgradeOwner, setDowngradeOwner] = useState(null);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const data = await adminService.fetchOwnersWithSubscriptions({
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

  /**
   * Calculates precise calendar day difference between today (midnight) and target date (midnight)
   */
  const getCalendarDaysDifference = (targetDate) => {
    if (!targetDate) return 0;
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(targetDate);
    const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffMs = targetMidnight.getTime() - todayMidnight.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  };

  /**
   * Evaluates subscription tier, expiration, remaining days, and stadium capacity.
   * Basic accounts have a 2-month free trial from account creation.
   */
  const getOwnerSubscriptionDetails = (owner) => {
    const isPro = owner.subscription_plan === 'pro';
    const rawExpiresAt = owner.subscription_expires_at;
    const createdAt = owner.created_at ? new Date(owner.created_at) : new Date();

    if (isPro && rawExpiresAt) {
      const expiresAt = new Date(rawExpiresAt);
      const diffDays = getCalendarDaysDifference(expiresAt);
      const isExpired = diffDays < 0;

      return {
        tier: 'pro',
        isPro: true,
        isActive: !isExpired,
        isExpired,
        expiresAt,
        diffDays,
        badgeVariant: isExpired ? 'danger' : 'accent',
        badgeText: isExpired ? t('plan_expired') : t('plan_pro'),
        daysSubtext:
          diffDays === 0
            ? t('today_expires')
            : isExpired
            ? t('days_overdue', { days: Math.abs(diffDays) })
            : t('days_left', { days: diffDays }),
        capacityLimit: t('unlimited_stadiums'),
        isUnlimited: true,
      };
    }

    // Free Trial: respects trial_ends_at if stored, or 2 calendar months from created_at
    const trialExpiresAt = owner.trial_ends_at
      ? new Date(owner.trial_ends_at)
      : new Date(
          createdAt.getFullYear(),
          createdAt.getMonth() + 2,
          createdAt.getDate()
        );
    const diffDays = getCalendarDaysDifference(trialExpiresAt);
    const isExpired = diffDays < 0;

    return {
      tier: 'trial',
      isPro: false,
      isActive: !isExpired,
      isExpired,
      expiresAt: trialExpiresAt,
      diffDays,
      badgeVariant: isExpired ? 'warning' : 'blue',
      badgeText: isExpired ? t('trial_ended') : t('plan_trial'),
      daysSubtext:
        diffDays === 0
          ? t('today_expires')
          : isExpired
          ? t('days_overdue', { days: Math.abs(diffDays) })
          : t('days_left', { days: diffDays }),
      capacityLimit: t('single_stadium'),
      isUnlimited: false,
    };
  };

  const handleActivatePro = async () => {
    if (!selectedOwner) return;
    const daysNumber = parseInt(proDays, 10);
    if (!daysNumber || daysNumber <= 0) {
      showToast(t('toast_fill_required'), 'error');
      return;
    }

    setProcessingId(selectedOwner.id);
    try {
      const details = getOwnerSubscriptionDetails(selectedOwner);
      const res = await adminService.activateVspPro({
        ownerId: selectedOwner.id,
        days: daysNumber,
      });

      if (res.success) {
        showToast(
          details.isPro && details.isActive
            ? t('subscription_extended_success')
            : t('subscription_activated_success')
        );
        setSelectedOwner(null);
        setIsCustomDays(false);
        setProDays(30);
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

  const handleDowngradePro = async () => {
    if (!downgradeOwner) return;
    setProcessingId(downgradeOwner.id);
    try {
      const res = await adminService.downgradeOwnerToBasic({
        ownerId: downgradeOwner.id,
      });

      if (res.success) {
        showToast(t('subscription_downgraded_success'));
        setDowngradeOwner(null);
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

  // Pre-calculated stats
  const ownerDetailsList = useMemo(() => {
    return owners.map((owner) => ({
      owner,
      details: getOwnerSubscriptionDetails(owner),
    }));
  }, [owners, lang]);

  const activeProCount = ownerDetailsList.filter(
    (item) => item.details.isPro && item.details.isActive
  ).length;

  const activeTrialCount = ownerDetailsList.filter(
    (item) => !item.details.isPro && item.details.isActive
  ).length;

  const expiredCount = ownerDetailsList.filter(
    (item) => item.details.isExpired
  ).length;

  // Filtered List
  const filteredList = useMemo(() => {
    return ownerDetailsList.filter(({ details }) => {
      if (filter === 'pro') return details.isPro && details.isActive;
      if (filter === 'trial') return !details.isPro && details.isActive;
      if (filter === 'expired') return details.isExpired;
      return true;
    });
  }, [ownerDetailsList, filter]);

  // Dynamic calculation for Modal Preview Date
  const modalCalculatedExpiryDate = useMemo(() => {
    if (!selectedOwner) return null;
    const details = getOwnerSubscriptionDetails(selectedOwner);
    const daysNumber = parseInt(proDays, 10) || 0;
    let baseTime = Date.now();

    if (details.isPro && details.isActive && details.expiresAt) {
      baseTime = details.expiresAt.getTime();
    }

    const targetDate = new Date(baseTime + daysNumber * 24 * 60 * 60 * 1000);
    return targetDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [selectedOwner, proDays, lang]);

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
            <Crown className="w-6 h-6 text-zinc-300" />
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
            title={t('refresh_data')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters & KPI Chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          onClick={() => setFilter('all')}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${
            filter === 'all'
              ? 'bg-zinc-800 border-zinc-600 text-white shadow-lg'
              : 'bg-vsp-surface border-vsp-border text-vsp-textSecondary hover:border-zinc-700'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-vsp-textSecondary">
              {t('filter_all_owners')}
            </span>
            <h3 className="text-xl font-black text-white mt-0.5">{owners.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-300">
            <Building2 className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setFilter('pro')}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${
            filter === 'pro'
              ? 'bg-zinc-800 border-zinc-600 text-white shadow-lg'
              : 'bg-vsp-surface border-vsp-border text-vsp-textSecondary hover:border-zinc-700'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-vsp-textSecondary">
              {t('filter_pro_owners')}
            </span>
            <h3 className="text-xl font-black text-white mt-0.5">{activeProCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-emerald-400">
            <Zap className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setFilter('trial')}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${
            filter === 'trial'
              ? 'bg-zinc-800 border-zinc-600 text-white shadow-lg'
              : 'bg-vsp-surface border-vsp-border text-vsp-textSecondary hover:border-zinc-700'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-vsp-textSecondary">
              {t('filter_trial_owners')}
            </span>
            <h3 className="text-xl font-black text-white mt-0.5">{activeTrialCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-sky-400">
            <Clock className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setFilter('expired')}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${
            filter === 'expired'
              ? 'bg-zinc-800 border-zinc-600 text-white shadow-lg'
              : 'bg-vsp-surface border-vsp-border text-vsp-textSecondary hover:border-zinc-700'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-vsp-textSecondary">
              {t('filter_expired_owners')}
            </span>
            <h3 className="text-xl font-black text-white mt-0.5">{expiredCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <Search className={`w-4 h-4 text-zinc-500 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search')}
          className={`w-full bg-vsp-surface border border-vsp-border rounded-xl py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors ${
            isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'
          }`}
        />
      </div>

      {/* Table */}
      <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
          </div>
        ) : filteredList.length === 0 ? (
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
                {filteredList.map(({ owner, details }) => {
                  const isProcessing = processingId === owner.id;
                  const stadiumCount = owner.stadiumCount || 0;
                  const hasOverCapacity = !details.isUnlimited && stadiumCount > 1;

                  return (
                    <tr key={owner.id} className="hover:bg-vsp-card/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center font-bold text-emerald-400 shrink-0 overflow-hidden">
                            {owner.profile_image_url ? (
                              <img
                                src={owner.profile_image_url}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              owner.name?.trim()?.charAt(0) || 'م'
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{owner.name || '-'}</span>
                              {details.isPro && details.isActive && (
                                <Zap className="w-3 h-3 text-vsp-accent fill-vsp-accent" />
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono">
                              {owner.phone || owner.email || ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-vsp-textSecondary">
                        {owner.governorate || '-'}
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant={details.badgeVariant} size="sm">
                          {details.badgeText}
                        </Badge>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-[12px] text-zinc-200">
                            {details.expiresAt.toLocaleDateString(
                              lang === 'ar' ? 'ar-EG' : 'en-US',
                              { day: 'numeric', month: 'short', year: 'numeric' }
                            )}
                          </div>
                          <div
                            className={`text-[10px] font-medium ${
                              details.isExpired
                                ? 'text-rose-400 font-bold'
                                : details.diffDays <= 7
                                ? 'text-zinc-300 font-bold'
                                : 'text-zinc-400'
                            }`}
                          >
                            {details.daysSubtext}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-bold ${
                                hasOverCapacity
                                  ? 'text-rose-400'
                                  : details.isUnlimited
                                  ? 'text-emerald-400'
                                  : stadiumCount === 0
                                  ? 'text-zinc-500'
                                  : 'text-zinc-200'
                              }`}
                            >
                              {stadiumCount}
                            </span>
                            <span className="text-zinc-500 font-medium">/</span>
                            <span
                              className={`text-[11px] ${
                                details.isUnlimited
                                  ? 'text-emerald-400 font-bold'
                                  : 'text-zinc-400'
                              }`}
                            >
                              {details.capacityLimit}
                            </span>
                          </div>
                          {stadiumCount === 0 ? (
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 inline-block" />
                              {isAr ? 'لم يُدرج الملعب بعد' : 'No stadium listed yet'}
                            </span>
                          ) : (
                            owner.stadiumNames && owner.stadiumNames.length > 0 && (
                              <span className="text-[10px] text-emerald-400/80 truncate max-w-[140px]">
                                {owner.stadiumNames.join(', ')}
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedOwner(owner);
                              setProDays(30);
                              setIsCustomDays(false);
                            }}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 hover:border-zinc-500 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                            <span>
                              {details.isPro && details.isActive
                                ? t('extend_pro_btn')
                                : t('upgrade_pro_btn')}
                            </span>
                          </button>

                          {details.isPro && (
                            <button
                              onClick={() => setDowngradeOwner(owner)}
                              disabled={isProcessing}
                              title={t('downgrade_pro_btn')}
                              className="p-1.5 bg-vsp-card hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-vsp-border hover:border-rose-500/40 rounded-xl transition-all disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Pro Upgrade & Cumulative Extend Modal */}
      <Modal
        isOpen={Boolean(selectedOwner)}
        onClose={() => {
          setSelectedOwner(null);
          setIsCustomDays(false);
        }}
        title={t('pro_modal_title')}
        maxWidth="max-w-md"
      >
        {selectedOwner && (() => {
          const currentDetails = getOwnerSubscriptionDetails(selectedOwner);
          const isExtending = currentDetails.isPro && currentDetails.isActive;

          return (
            <div className="space-y-4">
              {/* Owner Info Preview */}
              <div className="p-4 bg-vsp-card border border-vsp-border rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-vsp-textSecondary">{t('owner_col')}:</div>
                  <div className="font-bold text-white text-sm mt-0.5">{selectedOwner.name}</div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">{selectedOwner.phone}</div>
                </div>
                <Badge variant={currentDetails.badgeVariant} size="sm">
                  {currentDetails.badgeText}
                </Badge>
              </div>

              {/* Dynamic Calculation Notice */}
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isExtending
                      ? t('cumulative_notice', {
                          date: currentDetails.expiresAt.toLocaleDateString(
                            lang === 'ar' ? 'ar-EG' : 'en-US'
                          ),
                        })
                      : t('new_activation_notice', { days: proDays })}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-400 font-medium">
                  {t('expiry_col')}: {modalCalculatedExpiryDate}
                </div>
              </div>

              {/* Duration Presets */}
              <div>
                <label className="block text-xs font-bold text-vsp-textSecondary mb-2">
                  {t('duration_days')}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[30, 60, 90, 180, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setProDays(d);
                        setIsCustomDays(false);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        proDays === d && !isCustomDays
                          ? 'bg-zinc-100 text-black border-white shadow-sm'
                          : 'bg-vsp-card text-zinc-300 border-vsp-border hover:border-zinc-700'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Days Input */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsCustomDays(!isCustomDays)}
                  className="text-[11px] text-zinc-400 hover:text-white underline transition-colors"
                >
                  {t('custom_days')}
                </button>
                {isCustomDays && (
                  <div className="mt-2">
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      value={proDays}
                      onChange={(e) => setProDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      placeholder="30"
                      className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Features Reminder */}
              <div className="p-3.5 bg-vsp-card/50 border border-vsp-border rounded-xl text-xs space-y-1.5">
                <div className="font-bold text-zinc-300">{t('pro_features_title')}</div>
                <div className="text-vsp-textSecondary text-[11px]">• {t('pro_f1')}</div>
                <div className="text-vsp-textSecondary text-[11px]">• {t('pro_f2')}</div>
                <div className="text-vsp-textSecondary text-[11px]">• {t('pro_f3')}</div>
              </div>

              {/* Modal Actions */}
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
          );
        })()}
      </Modal>

      {/* Downgrade Confirm Modal */}
      <Modal
        isOpen={Boolean(downgradeOwner)}
        onClose={() => setDowngradeOwner(null)}
        title={t('confirm_downgrade_title')}
        maxWidth="max-w-md"
      >
        {downgradeOwner && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-800/80 border border-zinc-700 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300 leading-relaxed">
                {t('confirm_downgrade_msg', { name: downgradeOwner.name })}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDowngradeOwner(null)}
                className="flex-1 py-2.5 bg-vsp-card hover:bg-vsp-border text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDowngradePro}
                disabled={processingId === downgradeOwner.id}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {processingId === downgradeOwner.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>{t('confirm_downgrade_btn')}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
