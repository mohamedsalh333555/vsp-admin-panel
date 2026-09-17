import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '../services/adminService';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import {
  Profile2User,
  Building,
  CalendarTick,
  Money2,
  Activity,
  Refresh2,
  Clock,
  Flash,
  Card,
  TickCircle,
  ArrowRight2,
  TrendUp,
  Edit2,
  Trash,
  CloseCircle,
  Save2,
  RotateRight,
  SearchNormal1,
  Filter,
  ShieldCross,
  ExportSquare,
} from 'iconsax-react';

export const DashboardOverview = ({ onNavigate }) => {
  const { t, lang, isRTL } = useLanguage();
  const { user, profile } = useAuth();
  const isAr = lang === 'ar' || isRTL;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStadiums: 0,
    totalBookings: 0,
    totalRevenue: 0,
    total1v1Players: 0,
    pendingOwners: 0,
    disputesCount: 0,
    pendingPayouts: 0,
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Booking Edit Modal State
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [editForm, setEditForm] = useState({
    status: 'confirmed',
    total_price: '',
    deposit_paid: '',
    start_time: '',
    cancellation_reason: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [statsData, bookingsData] = await Promise.all([
        adminService.fetchDashboardStats(),
        adminService.fetchRecentBookings(20),
      ]);

      setStats(statsData);
      setRecentBookings(bookingsData || []);
      setLastSyncTime(new Date());
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Setup Realtime listener on bookings table to update live feed
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          loadData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter and search bookings
  const filteredBookings = useMemo(() => {
    return recentBookings.filter((b) => {
      // Status filter
      if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase().trim();
      const bookingId = (b.id || '').toLowerCase();
      const stadiumName = (b.stadiums?.name || b.stadium_name || '').toLowerCase();
      const userName = (b.users?.name || b.player?.name || b.customer_name || b.player_team_name || '').toLowerCase();
      const userPhone = (b.users?.phone || b.player?.phone || b.customer_phone || '').toLowerCase();

      return (
        bookingId.includes(q) ||
        stadiumName.includes(q) ||
        userName.includes(q) ||
        userPhone.includes(q)
      );
    });
  }, [recentBookings, statusFilter, searchTerm]);

  // Status counts for filter chips
  const statusCounts = useMemo(() => {
    const counts = { all: recentBookings.length };
    recentBookings.forEach((b) => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });
    return counts;
  }, [recentBookings]);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return isAr ? 'صباح الخير' : 'Good Morning';
    if (hour < 18) return isAr ? 'مساء الخير' : 'Good Afternoon';
    return isAr ? 'مساء الخير' : 'Good Evening';
  }, [isAr]);

  const cofounderName = useMemo(() => {
    const name = profile?.name || user?.user_metadata?.name || 'Admin';
    const pos = profile?.position || user?.user_metadata?.position;
    return pos ? `${name} (${pos})` : name;
  }, [profile, user]);

  const kpiCards = [
    {
      label: t('total_users'),
      value: stats.totalUsers.toLocaleString(),
      icon: Profile2User,
      subtext: t('kpi_users_subtext'),
    },
    {
      label: t('registered_stadiums'),
      value: stats.totalStadiums.toLocaleString(),
      icon: Building,
      subtext: t('kpi_stadiums_subtext'),
    },
    {
      label: t('total_bookings'),
      value: stats.totalBookings.toLocaleString(),
      icon: CalendarTick,
      subtext: t('kpi_bookings_subtext'),
    },
    {
      label: t('total_revenue'),
      value: `${stats.totalRevenue.toLocaleString()} ${t('currency')}`,
      icon: Money2,
      subtext: t('kpi_revenue_subtext'),
    },
  ];

  const openEditModal = (booking) => {
    setSelectedBooking(booking);
    setEditForm({
      status: booking.status || 'confirmed',
      total_price: booking.total_price ?? '',
      deposit_paid: booking.deposit_paid ?? '',
      start_time: booking.start_time ? booking.start_time.substring(0, 16) : '',
      cancellation_reason: booking.cancellation_reason || '',
    });
  };

  const handleSaveBooking = async () => {
    if (!selectedBooking) return;
    setIsSaving(true);
    try {
      const updates = {
        status: editForm.status,
        total_price: editForm.total_price !== '' ? Number(editForm.total_price) : 0,
        deposit_paid: editForm.deposit_paid !== '' ? Number(editForm.deposit_paid) : 0,
        cancellation_reason: editForm.status === 'cancelled' ? editForm.cancellation_reason : null,
      };

      if (editForm.start_time) {
        updates.start_time = new Date(editForm.start_time).toISOString();
      }

      const res = await adminService.updateBookingDetails(selectedBooking.id, updates);
      if (res.success) {
        showToast(t('save_booking_success'));
        setSelectedBooking(null);
        loadData(true);
      } else {
        showToast(res.error || t('error_loading'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;
    if (!window.confirm(t('delete_booking_confirm'))) return;

    setIsSaving(true);
    try {
      const res = await adminService.deleteBookingPermanently(selectedBooking.id);
      if (res.success) {
        showToast(t('delete_booking_success'));
        setSelectedBooking(null);
        loadData(true);
      } else {
        showToast(res.error || t('error_loading'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return { text: isAr ? 'مؤكد' : 'Confirmed', dot: 'bg-vsp-accent' };
      case 'completed':
        return { text: isAr ? 'مكتمل' : 'Completed', dot: 'bg-zinc-400' };
      case 'cancelled':
        return { text: isAr ? 'ملغي' : 'Cancelled', dot: 'bg-rose-500' };
      case 'disputed':
        return { text: isAr ? 'نزاع مفتوح' : 'Disputed', dot: 'bg-rose-400 animate-pulse' };
      default:
        return { text: isAr ? 'قيد المراجعة' : 'Pending', dot: 'bg-zinc-400' };
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Hero Banner (Clean & Harmonious) */}
      <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-6 lg:p-7 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-vsp-card border border-vsp-border text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-vsp-accent animate-pulse" />
                <span>{isAr ? 'البث المباشر نشط' : 'Live Sync Active'}</span>
              </span>
            </div>

            <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight">
              {greeting}، {cofounderName}
            </h1>

            <p className="text-xs text-vsp-textSecondary max-w-2xl leading-relaxed">
              {isAr
                ? 'متابعة شاملة لحركة الحجوزات، الملاعب، والتسويات المالية لمنصة VSP الرياضية.'
                : 'Real-time overview of bookings, stadiums, and financial settlements.'}
            </p>
          </div>

          {/* Sync & Refresh Actions */}
          <div className="flex items-center gap-3 self-start lg:self-auto">
            <div className={isAr ? 'text-left' : 'text-right'}>
              <span className="text-[10px] text-zinc-500 block font-mono">
                {isAr ? 'آخر تحديث' : 'Last update'}
              </span>
              <span className="text-xs font-mono font-bold text-zinc-300">
                {lastSyncTime.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 active:scale-95"
            >
              <Refresh2 className={`w-3.5 h-3.5 text-vsp-accent ${refreshing ? 'animate-spin' : ''}`} variant="Outline" />
              <span>{refreshing ? t('loading') : t('refresh_data')}</span>
            </button>
          </div>
        </div>

        {/* Operational Quick Jump Chips (Unified Calm Colors) */}
        <div className="mt-6 pt-5 border-t border-vsp-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate && onNavigate('owner_audits')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-vsp-card/50 hover:bg-vsp-card border border-vsp-border hover:border-zinc-700 transition-all group"
          >
            <div>
              <span className="text-[11px] text-zinc-400 block font-medium">
                {isAr ? 'ملاعب معلقة' : 'Pending Stadiums'}
              </span>
              <span className="text-sm font-black text-white font-mono mt-0.5 block">
                {stats.pendingOwners} {isAr ? 'ملعب' : 'stadiums'}
              </span>
            </div>
            <ExportSquare className="w-4 h-4 text-zinc-500 group-hover:text-vsp-accent transition-colors" variant="Outline" />
          </button>

          <button
            onClick={() => onNavigate && onNavigate('disputes')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-vsp-card/50 hover:bg-vsp-card border border-vsp-border hover:border-zinc-700 transition-all group"
          >
            <div>
              <span className="text-[11px] text-zinc-400 block font-medium">
                {isAr ? 'نزاعات مفتوحة' : 'Open Disputes'}
              </span>
              <span className="text-sm font-black text-white font-mono mt-0.5 block">
                {stats.disputesCount} {isAr ? 'بلاغ' : 'reports'}
              </span>
            </div>
            <ExportSquare className="w-4 h-4 text-zinc-500 group-hover:text-vsp-accent transition-colors" variant="Outline" />
          </button>

          <button
            onClick={() => onNavigate && onNavigate('payout_settlements')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-vsp-card/50 hover:bg-vsp-card border border-vsp-border hover:border-zinc-700 transition-all group"
          >
            <div>
              <span className="text-[11px] text-zinc-400 block font-medium">
                {isAr ? 'تسويات معلقة' : 'Pending Payouts'}
              </span>
              <span className="text-sm font-black text-white font-mono mt-0.5 block">
                {stats.pendingPayouts.toLocaleString()} {t('currency')}
              </span>
            </div>
            <ExportSquare className="w-4 h-4 text-zinc-500 group-hover:text-vsp-accent transition-colors" variant="Outline" />
          </button>

          <button
            onClick={() => onNavigate && onNavigate('league_1v1')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-vsp-card/50 hover:bg-vsp-card border border-vsp-border hover:border-zinc-700 transition-all group"
          >
            <div>
              <span className="text-[11px] text-zinc-400 block font-medium">
                {isAr ? 'دوري 1v1' : '1v1 League'}
              </span>
              <span className="text-sm font-black text-white font-mono mt-0.5 block">
                {stats.total1v1Players} {isAr ? 'لاعب' : 'players'}
              </span>
            </div>
            <ExportSquare className="w-4 h-4 text-zinc-500 group-hover:text-vsp-accent transition-colors" variant="Outline" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (Harmonious & Unified Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => (
          <StatCard
            key={idx}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            subtext={kpi.subtext}
          />
        ))}
      </div>

      {/* Live Recent Bookings Stream Table & Search Hub */}
      <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-lg">
        {/* Table Header & Search */}
        <div className="p-5 border-b border-vsp-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-vsp-accent">
              <Activity className="w-4 h-4" variant="Outline" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{t('recent_bookings_title')}</h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-vsp-card border border-vsp-border text-zinc-400">
                  {filteredBookings.length} {isAr ? 'حجز' : 'bookings'}
                </span>
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <SearchNormal1 className="w-3.5 h-3.5 text-zinc-400 absolute right-3.5 top-3" variant="Outline" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isAr ? 'بحث باسم اللاعب، الملعب، أو الهاتف...' : 'Search bookings...'}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl pr-9 pl-9 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-3 top-2.5 text-zinc-400 hover:text-white"
                >
                  <CloseCircle className="w-3.5 h-3.5" variant="Outline" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="px-5 py-2.5 bg-vsp-card/40 border-b border-vsp-border flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: isAr ? 'الكل' : 'All' },
            { id: 'confirmed', label: isAr ? 'مؤكد' : 'Confirmed' },
            { id: 'completed', label: isAr ? 'مكتمل' : 'Completed' },
            { id: 'pending', label: isAr ? 'قيد المراجعة' : 'Pending' },
            { id: 'disputed', label: isAr ? 'نزاع' : 'Disputed' },
            { id: 'cancelled', label: isAr ? 'ملغي' : 'Cancelled' },
          ].map((tab) => {
            const count = statusCounts[tab.id] || 0;
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-100 text-black shadow-sm'
                    : 'bg-vsp-card text-zinc-400 hover:text-white hover:bg-vsp-border'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                      isActive ? 'bg-black/10 text-black font-extrabold' : 'text-zinc-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-vsp-card/30 text-vsp-textSecondary border-b border-vsp-border">
              <tr>
                <th className="px-6 py-3.5 font-bold">{t('booking_id')}</th>
                <th className="px-6 py-3.5 font-bold">{t('stadium')}</th>
                <th className="px-6 py-3.5 font-bold">{t('user_player')}</th>
                <th className="px-6 py-3.5 font-bold">{t('start_time')}</th>
                <th className="px-6 py-3.5 font-bold">{t('price_deposit')}</th>
                <th className="px-6 py-3.5 font-bold">{t('status')}</th>
                <th className="px-6 py-3.5 font-bold text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vsp-border/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-white/5 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 bg-white/5 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-28 bg-white/5 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-white/5 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-white/5 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-16 bg-white/5 rounded-full" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="h-7 w-20 bg-white/5 rounded-lg mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-zinc-500 space-y-2">
                    <p className="text-xs font-medium">
                      {searchTerm
                        ? (isAr ? 'لم يتم العثور على حجوزات تطابق البحث' : 'No bookings match your search')
                        : t('no_data')}
                    </p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-xs text-vsp-accent hover:underline font-bold"
                      >
                        {isAr ? 'إلغاء التصفية' : 'Clear filter'}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const statusInfo = getStatusBadge(b.status);
                  const playerName =
                    b.users?.name ||
                    b.player?.name ||
                    b.customer_name ||
                    b.player_team_name ||
                    (isAr ? 'لاعب مسجل' : 'Registered Player');
                  const playerPhone =
                    b.users?.phone ||
                    b.player?.phone ||
                    b.customer_phone ||
                    '-';

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-vsp-card/40 transition-colors"
                    >
                      {/* Booking ID */}
                      <td className="px-6 py-4 font-mono text-[11px] text-zinc-400 font-bold">
                        #{b.id?.substring(0, 8)}
                      </td>

                      {/* Stadium */}
                      <td className="px-6 py-4">
                        <span className="font-bold text-white block">
                          {b.stadiums?.name || b.stadium_name || t('stadium')}
                        </span>
                        {b.stadiums?.governorate && (
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {b.stadiums.governorate}
                          </span>
                        )}
                      </td>

                      {/* Player / Customer */}
                      <td className="px-6 py-4">
                        <span className="font-bold text-white block">{playerName}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {playerPhone}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="px-6 py-4 text-zinc-300 font-mono text-[11px]">
                        {b.start_time
                          ? new Date(b.start_time).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '-'}
                      </td>

                      {/* Price & Deposit */}
                      <td className="px-6 py-4 font-mono">
                        <div className="font-black text-vsp-accent text-sm">
                          {b.total_price ? `${Number(b.total_price).toLocaleString()} ${t('currency')}` : '0'}
                        </div>
                        {b.deposit_paid > 0 && (
                          <div className="text-[10px] text-zinc-300 font-bold">
                            {isAr ? 'عربون:' : 'Deposit:'} {Number(b.deposit_paid).toLocaleString()} {t('currency')}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-vsp-card border border-vsp-border">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          <span className="text-zinc-200">{statusInfo.text}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => openEditModal(b)}
                          className="px-3 py-1.5 bg-vsp-card hover:bg-vsp-border text-zinc-300 hover:text-white border border-vsp-border font-bold text-[11px] rounded-lg flex items-center justify-center gap-1.5 transition-all mx-auto shadow-sm"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-vsp-accent" variant="Outline" />
                          <span>{t('edit_booking_btn')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Control & Edit Modal */}
      <Modal
        isOpen={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        title={t('edit_booking_title')}
        maxWidth="max-w-xl"
      >
        {selectedBooking && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="p-4 bg-vsp-card border border-vsp-border rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-400 block text-[10px]">{t('booking_id')}:</span>
                <span className="font-mono font-bold text-white">#{selectedBooking.id}</span>
              </div>
              <div className={isAr ? 'text-left' : 'text-right'}>
                <span className="text-zinc-400 block text-[10px]">{t('stadium')}:</span>
                <span className="font-bold text-vsp-accent">
                  {selectedBooking.stadiums?.name || selectedBooking.stadium_name || t('stadium')}
                </span>
              </div>
            </div>

            {/* Quick Status Buttons */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-white">{t('status')}:</label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, status: 'confirmed' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    editForm.status === 'confirmed'
                      ? 'bg-vsp-accent/20 text-vsp-accent border-vsp-accent/40'
                      : 'bg-vsp-card text-zinc-400 border-vsp-border hover:text-white'
                  }`}
                >
                  {isAr ? 'مؤكد' : 'Confirmed'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, status: 'completed' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    editForm.status === 'completed'
                      ? 'bg-zinc-700/40 text-white border-zinc-600'
                      : 'bg-vsp-card text-zinc-400 border-vsp-border hover:text-white'
                  }`}
                >
                  {isAr ? 'مكتمل' : 'Completed'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, status: 'cancelled' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    editForm.status === 'cancelled'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : 'bg-vsp-card text-zinc-400 border-vsp-border hover:text-white'
                  }`}
                >
                  {isAr ? 'ملغي' : 'Cancelled'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, status: 'pending' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    editForm.status === 'pending'
                      ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      : 'bg-vsp-card text-zinc-400 border-vsp-border hover:text-white'
                  }`}
                >
                  {isAr ? 'قيد المراجعة' : 'Pending'}
                </button>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  {t('booking_total_price')}
                </label>
                <input
                  type="number"
                  value={editForm.total_price}
                  onChange={(e) => setEditForm({ ...editForm, total_price: e.target.value })}
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-zinc-500 focus:outline-none font-bold"
                  placeholder="270"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  {t('booking_deposit_paid')}
                </label>
                <input
                  type="number"
                  value={editForm.deposit_paid}
                  onChange={(e) => setEditForm({ ...editForm, deposit_paid: e.target.value })}
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-zinc-500 focus:outline-none font-bold"
                  placeholder="50"
                />
              </div>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                {t('start_time')}
              </label>
              <input
                type="datetime-local"
                value={editForm.start_time}
                onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-zinc-500 focus:outline-none font-mono"
              />
            </div>

            {/* Cancellation Reason if cancelled */}
            {editForm.status === 'cancelled' && (
              <div>
                <label className="block text-xs font-bold text-rose-400 mb-1.5">
                  {t('cancellation_reason_label')}
                </label>
                <textarea
                  rows={2}
                  value={editForm.cancellation_reason}
                  onChange={(e) => setEditForm({ ...editForm, cancellation_reason: e.target.value })}
                  className="w-full bg-vsp-card border border-rose-500/30 rounded-xl p-3 text-xs text-white focus:border-rose-400 focus:outline-none"
                  placeholder={t('cancellation_reason_placeholder')}
                />
              </div>
            )}

                        {/* Smart Refund Details Box */}
            {selectedBooking && (selectedBooking.status === 'cancelled' || selectedBooking.payment_status === 'refunded') && (selectedBooking.refund_amount > 0 || selectedBooking.refund_transaction_id) && (
              <div className="p-3.5 bg-zinc-800 border border-zinc-700 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-vsp-accent">
                    {isAr ? 'بيانات الاسترداد المالي الذكي' : 'Smart Refund Details'}
                  </span>
                  <span className="font-mono font-bold text-white">
                    {selectedBooking.refund_amount || selectedBooking.deposit_paid || selectedBooking.total_price} {t('currency')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>
                    {isAr ? 'القناة:' : 'Channel:'} {selectedBooking.refund_payment_method === 'wallet' ? (isAr ? 'محفظة إلكترونية 📱' : 'E-Wallet 📱') : (isAr ? 'بطاقة بنكية 🏦' : 'Bank Card 🏦')}
                  </span>
                  {selectedBooking.refund_transaction_id && (
                    <span className="font-mono">Ref: #{selectedBooking.refund_transaction_id}</span>
                  )}
                </div>
                {selectedBooking.refunded_at && (
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {new Date(selectedBooking.refunded_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-vsp-border">
              <button
                type="button"
                onClick={handleDeleteBooking}
                disabled={isSaving}
                className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Trash className="w-3.5 h-3.5" variant="Outline" />
                <span>{t('delete_permanent')}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 py-2.5 bg-vsp-card hover:bg-vsp-border text-zinc-300 hover:text-white border border-vsp-border rounded-xl text-xs font-bold transition-all"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveBooking}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-zinc-100 hover:bg-white text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                >
                  {isSaving ? <RotateRight className="w-4 h-4 animate-spin" variant="Outline" /> : <Save2 className="w-4 h-4" variant="Outline" />}
                  <span>{t('save')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
