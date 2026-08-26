import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import {
  Users,
  Building2,
  CalendarCheck,
  Banknote,
  Flame,
  Activity,
  RefreshCw,
  Clock,
  Swords,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Edit,
  Trash2,
  XCircle,
  Save,
  Loader2,
  Sliders,
  DollarSign,
} from 'lucide-react';

export const DashboardOverview = ({ onNavigate }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
        adminService.fetchRecentBookings(6),
      ]);

      setStats(statsData);
      setRecentBookings(bookingsData);
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
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const kpiCards = [
    {
      label: t('total_users'),
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      subtext: t('kpi_users_subtext'),
    },
    {
      label: t('registered_stadiums'),
      value: stats.totalStadiums.toLocaleString(),
      icon: Building2,
      subtext: t('kpi_stadiums_subtext'),
    },
    {
      label: t('total_bookings'),
      value: stats.totalBookings.toLocaleString(),
      icon: CalendarCheck,
      subtext: t('kpi_bookings_subtext'),
    },
    {
      label: t('total_revenue'),
      value: `${stats.totalRevenue.toLocaleString()} ${t('currency')}`,
      icon: Banknote,
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

  const handleQuickStatus = async (newStatus) => {
    if (!selectedBooking) return;
    setIsSaving(true);
    try {
      const updates = {
        status: newStatus,
        cancellation_reason: newStatus === 'cancelled' ? (editForm.cancellation_reason || 'Cancelled by admin') : null,
      };
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

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Clean Minimal Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">{t('dashboard')}</h1>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-vsp-textSecondary hover:text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-vsp-accent ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? t('loading') : t('refresh_data')}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
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

      {/* Live Recent Bookings Stream Table */}
      <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-vsp-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white">{t('recent_bookings_title')}</h3>
          </div>
          <Badge variant="accent" size="xs">
            {t('live_stream')}
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-vsp-card/50 text-vsp-textSecondary border-b border-vsp-border">
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
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-vsp-textSecondary">
                    {t('no_data')}
                  </td>
                </tr>
              ) : (
                recentBookings.map((b) => {
                  const statusVariant =
                    b.status === 'confirmed' || b.status === 'completed'
                      ? 'success'
                      : b.status === 'disputed'
                      ? 'danger'
                      : b.status === 'cancelled'
                      ? 'danger'
                      : 'warning';

                  const statusLocalized =
                    b.status === 'confirmed'
                      ? t('confirmed')
                      : b.status === 'completed'
                      ? t('completed')
                      : b.status === 'cancelled'
                      ? t('cancelled')
                      : b.status === 'disputed'
                      ? t('disputes')
                      : t('pending');

                  return (
                    <tr key={b.id} className="hover:bg-vsp-card/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-[11px] text-zinc-400 font-bold">
                        #{b.id?.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {b.stadiums?.name || b.stadium_name || t('stadium')}
                      </td>
                      <td className="px-6 py-4 text-vsp-textSecondary">
                        <div>
                          <span className="font-bold text-white block">{b.users?.name || b.customer_name || t('user_player')}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{b.users?.phone || b.customer_phone || ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-300 font-mono text-[11px]">
                        {b.start_time ? new Date(b.start_time).toLocaleString(t('lang_button') === 'English' ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                      </td>
                      <td className="px-6 py-4 font-black text-vsp-accent text-sm">
                        {b.total_price ? `${Number(b.total_price).toLocaleString()} ${t('currency')}` : '0'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant} size="xs">
                          {statusLocalized}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => openEditModal(b)}
                          className="px-3 py-1.5 bg-vsp-accent/10 hover:bg-vsp-accent text-vsp-accent hover:text-black border border-vsp-accent/30 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1.5 transition-all mx-auto shadow-sm"
                        >
                          <Edit className="w-3.5 h-3.5" />
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
            <div className="p-3.5 bg-vsp-card border border-vsp-border rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-400 block text-[10px]">{t('booking_id')}:</span>
                <span className="font-mono font-bold text-white">#{selectedBooking.id}</span>
              </div>
              <div className="text-left">
                <span className="text-zinc-400 block text-[10px]">{t('stadium')}:</span>
                <span className="font-bold text-vsp-accent">{selectedBooking.stadiums?.name || selectedBooking.stadium_name || t('stadium')}</span>
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
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/50'
                      : 'bg-vsp-card text-zinc-400 border-vsp-border hover:text-white'
                  }`}
                >
                  {t('confirmed')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, status: 'completed' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    editForm.status === 'completed'
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 ring-1 ring-sky-500/50'
                      : 'bg-vsp-card text-zinc-400 border-vsp-border hover:text-white'
                  }`}
                >
                  {t('completed')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, status: 'cancelled' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    editForm.status === 'cancelled'
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 ring-1 ring-red-500/50'
                      : 'bg-vsp-card text-zinc-400 border-vsp-border hover:text-white'
                  }`}
                >
                  {t('cancelled')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, status: 'pending' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    editForm.status === 'pending'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 ring-1 ring-amber-500/50'
                      : 'bg-vsp-card text-zinc-400 border-vsp-border hover:text-white'
                  }`}
                >
                  {t('pending')}
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
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-vsp-accent focus:outline-none font-bold"
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
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-vsp-accent focus:outline-none font-bold"
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
                className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-vsp-accent focus:outline-none font-mono"
              />
            </div>

            {/* Cancellation Reason if cancelled */}
            {editForm.status === 'cancelled' && (
              <div>
                <label className="block text-xs font-bold text-red-400 mb-1.5">
                  {t('cancellation_reason_label')}
                </label>
                <textarea
                  rows={2}
                  value={editForm.cancellation_reason}
                  onChange={(e) => setEditForm({ ...editForm, cancellation_reason: e.target.value })}
                  className="w-full bg-vsp-card border border-red-500/30 rounded-xl p-3 text-xs text-white focus:border-red-400 focus:outline-none"
                  placeholder={t('cancellation_reason_placeholder')}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-vsp-border">
              <button
                type="button"
                onClick={handleDeleteBooking}
                disabled={isSaving}
                className="px-3.5 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
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
                  className="px-5 py-2.5 bg-vsp-accent hover:bg-vsp-accentHover text-black font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-vsp-accent/20 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
