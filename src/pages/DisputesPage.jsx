import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Flash,
  Refresh2,
  TickCircle,
  Warning2,
  RotateRight,
  Building,
  Calendar,
  User,
  Judge,
} from 'iconsax-react';

export const DisputesPage = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolving, setResolving] = useState(false);

  // Resolution form state
  const [resolutionForm, setResolutionForm] = useState({
    outcome: 'home_win', // 'home_win' | 'away_win' | 'draw' | 'cancelled'
    notes: '',
    homeScore: '',
    awayScore: '',
  });

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const data = await adminService.fetchDisputedBookings();
      setDisputes(data || []);
    } catch (e) {
      showToast(t('error_loading'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const openResolutionModal = (dispute) => {
    setSelectedDispute(dispute);
    setResolutionForm({
      outcome: 'home_win',
      notes: '',
      homeScore: dispute.home_team_score ?? dispute.host_score ?? '',
      awayScore: dispute.away_team_score ?? dispute.away_score ?? '',
    });
  };

  const handleResolve = async () => {
    if (!selectedDispute) return;
    setResolving(true);
    try {
      const res = await adminService.resolveDispute({
        bookingId: selectedDispute.id,
        winnerOutcome: resolutionForm.outcome,
        resolutionNotes: resolutionForm.notes,
        homeScore: resolutionForm.homeScore !== '' ? Number(resolutionForm.homeScore) : null,
        awayScore: resolutionForm.awayScore !== '' ? Number(resolutionForm.awayScore) : null,
      });

      if (res.success) {
        showToast(t('dispute_resolved_success'));
        setSelectedDispute(null);
        fetchDisputes();
      } else {
        showToast(res.error || t('error_loading'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setResolving(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Judge className="w-6 h-6 text-zinc-400" variant="Outline" />
            <span>{t('disputes_title')}</span>
          </h1>
          <p className="text-xs text-vsp-textSecondary mt-0.5">
            {t('disputes_subtitle')}
          </p>
        </div>

        <button
          onClick={fetchDisputes}
          disabled={loading}
          className="p-2.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-zinc-400 hover:text-white rounded-xl transition-all self-end sm:self-auto disabled:opacity-50"
        >
          <Refresh2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} variant="Outline" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <RotateRight className="w-8 h-8 text-zinc-400 animate-spin" variant="Outline" />
        </div>
      ) : disputes.length === 0 ? (
        <EmptyState
          icon={TickCircle}
          title={t('no_disputes_title')}
          subtitle={t('no_disputes_sub')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {disputes.map((d) => {
            const disputeReason =
              d.dispute_reason || d.dispute_notes || t('dispute_reason');

            return (
              <div
                key={d.id}
                className="bg-vsp-surface border border-vsp-border rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-all relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="warning" size="sm">
                    <Warning2 className="w-3 h-3" variant="Outline" />
                    <span>{t('pending')}</span>
                  </Badge>
                  <span className="text-[11px] font-mono text-zinc-500">
                    #{d.id?.substring(0, 8)}
                  </span>
                </div>

                {/* Match Parties Header */}
                <div className="bg-vsp-card border border-vsp-border rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-zinc-400" variant="Outline" />
                      <span>{d.host_name || d.customer_name || t('home_team')}</span>
                    </span>
                    <span className="text-xs font-black text-white">
                      {d.home_team_score ?? d.host_score ?? '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-center my-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      VS
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-zinc-400" variant="Outline" />
                      <span>{d.away_team_name || d.away_captain_name || t('away_team')}</span>
                    </span>
                    <span className="text-xs font-black text-white">
                      {d.away_team_score ?? d.away_score ?? '-'}
                    </span>
                  </div>
                </div>

                {/* Dispute Reason Box */}
                <div className="p-3 bg-vsp-card border border-vsp-border rounded-xl text-xs text-zinc-300 space-y-1">
                  <span className="font-bold text-zinc-400 block text-[11px]">{t('dispute_reason')}:</span>
                  <p className="leading-relaxed">{disputeReason}</p>
                </div>

                {/* Booking details */}
                <div className="flex items-center justify-between text-[11px] text-vsp-textSecondary pt-1">
                  <div className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-zinc-400" variant="Outline" />
                    <span>{d.stadium_name || t('stadium')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" variant="Outline" />
                    <span>{d.start_time ? new Date(d.start_time).toLocaleDateString(t('lang_button') === 'English' ? 'ar-EG' : 'en-US') : '-'}</span>
                  </div>
                </div>

                {/* Resolve Button */}
                <button
                  onClick={() => openResolutionModal(d)}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl border border-zinc-700 hover:border-zinc-500 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Judge className="w-4 h-4" variant="Outline" />
                  <span>{t('resolve_btn')}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Decision Modal */}
      <Modal
        isOpen={Boolean(selectedDispute)}
        onClose={() => setSelectedDispute(null)}
        title={t('resolve_modal_title')}
        maxWidth="max-w-md"
      >
        {selectedDispute && (
          <div className="space-y-4">
            <p className="text-xs text-vsp-textSecondary">
              {t('disputes_subtitle')}
            </p>

            {/* Outcome options */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-white">{t('final_decision_label')}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'home_win', label: t('home_win_opt') },
                  { id: 'away_win', label: t('away_win_opt') },
                  { id: 'draw', label: t('draw_opt') },
                  { id: 'cancelled', label: t('cancelled_opt') },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setResolutionForm({ ...resolutionForm, outcome: item.id })}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                      resolutionForm.outcome === item.id
                        ? 'bg-zinc-100 text-black border-white shadow-sm'
                        : 'bg-vsp-card text-zinc-300 border-vsp-border hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* تنبيه مالي عند اختيار الإلغاء والاسترداد */}
            {resolutionForm.outcome === 'cancelled' && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <span className="text-amber-400 text-sm mt-0.5">⚠</span>
                <p className="text-xs text-amber-300 leading-relaxed">
                  {t('dispute_escrow_refund_notice')}
                </p>
              </div>
            )}

            {/* Score Overrides */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">
                  {t('home_team')}
                </label>
                <input
                  type="number"
                  value={resolutionForm.homeScore}
                  onChange={(e) => setResolutionForm({ ...resolutionForm, homeScore: e.target.value })}
                  placeholder="0"
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">
                  {t('away_team')}
                </label>
                <input
                  type="number"
                  value={resolutionForm.awayScore}
                  onChange={(e) => setResolutionForm({ ...resolutionForm, awayScore: e.target.value })}
                  placeholder="0"
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Admin Resolution Note */}
            <div>
              <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">
                {t('cancellation_reason_label')}
              </label>
              <textarea
                value={resolutionForm.notes}
                onChange={(e) => setResolutionForm({ ...resolutionForm, notes: e.target.value })}
                placeholder="..."
                rows={3}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-vsp-border">
              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                className="px-4 py-2 bg-vsp-card border border-vsp-border text-zinc-300 hover:text-white rounded-xl text-xs font-bold"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={resolving}
                className="px-5 py-2 bg-zinc-100 hover:bg-white text-black rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {resolving ? <RotateRight className="w-4 h-4 animate-spin" variant="Outline" /> : <Judge className="w-4 h-4" variant="Outline" />}
                <span>{t('confirm')}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
