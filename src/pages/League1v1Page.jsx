import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Flame,
  Trophy,
  UserPlus,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Lock,
  Unlock,
  Edit2,
  Plus,
  RefreshCw,
} from 'lucide-react';

export const League1v1Page = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('standings'); // 'standings' | 'registrations'
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [approvedCount, setApprovedCount] = useState(0);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // New player form
  const [newPlayerForm, setNewPlayerForm] = useState({
    name: '',
    avatarUrl: '',
    initialPoints: 0,
  });

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetch1v1Data = async () => {
    setLoading(true);
    try {
      const [playersData, regData, gateStatus, approvedTotal] = await Promise.all([
        adminService.fetch1v1LeaguePlayers(),
        adminService.fetch1v1PendingRegistrations(),
        adminService.fetch1v1RegistrationOpenStatus(),
        adminService.fetch1v1ApprovedCount(),
      ]);

      setPlayers(playersData || []);
      setRegistrations(regData || []);
      setIsOpen(gateStatus);
      setApprovedCount(approvedTotal);
    } catch (e) {
      showToast(t('error_loading'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch1v1Data();
  }, []);

  // Toggle Gate
  const toggleGate = async () => {
    setProcessing(true);
    try {
      const nextState = !isOpen;
      const res = await adminService.set1v1RegistrationOpenStatus(nextState);
      if (res.success) {
        setIsOpen(nextState);
        showToast(t(nextState ? 'toast_gate_opened' : 'toast_gate_closed'));
      } else {
        showToast(t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Wipe Season
  const handleWipeSeason = async () => {
    setProcessing(true);
    try {
      const res = await adminService.startNew1v1SeasonWipeRegistrations();
      if (res.success) {
        showToast(t('toast_season_wiped'));
        setShowWipeModal(false);
        fetch1v1Data();
      } else {
        showToast(res.error || t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Approve registration
  const approveReg = async (reg) => {
    setProcessing(true);
    try {
      const res = await adminService.approve1v1Registration({
        registrationId: reg.id,
        userId: reg.user_id,
        name: reg.player_name || reg.name || reg.users?.name,
        avatarUrl: reg.avatar_url || reg.users?.profile_image_url,
      });

      if (res.success) {
        showToast(t('toast_player_approved'));
        fetch1v1Data();
      } else {
        showToast(res.error || t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Reject registration
  const rejectReg = async (regId) => {
    setProcessing(true);
    try {
      const res = await adminService.reject1v1Registration(regId);
      if (res.success) {
        showToast(t('toast_player_rejected'));
        fetch1v1Data();
      } else {
        showToast(res.error || t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Add new player manual
  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerForm.name.trim()) return;

    setProcessing(true);
    try {
      const res = await adminService.add1v1Player(newPlayerForm);
      if (res.success) {
        showToast(t('toast_player_added'));
        setShowAddPlayerModal(false);
        setNewPlayerForm({ name: '', avatarUrl: '', initialPoints: 0 });
        fetch1v1Data();
      } else {
        showToast(res.error || t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Save edited player stats
  const handleSaveStats = async (e) => {
    e.preventDefault();
    if (!editingPlayer) return;

    setProcessing(true);
    try {
      const res = await adminService.update1v1PlayerStats(editingPlayer.id, editingPlayer);
      if (res.success) {
        showToast(t('toast_stats_saved'));
        setEditingPlayer(null);
        fetch1v1Data();
      } else {
        showToast(res.error || t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessing(false);
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
            <Flame className="w-6 h-6 text-zinc-400" />
            <span>{t('league_title')}</span>
          </h1>
          <p className="text-xs text-vsp-textSecondary mt-0.5">
            {t('league_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetch1v1Data}
            className="p-2.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-vsp-textSecondary hover:text-white rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddPlayerModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-white text-xs font-bold rounded-xl transition-all"
          >
            <Plus className="w-4 h-4 text-vsp-accent" />
            <span>{t('add_player_manual')}</span>
          </button>

          <button
            onClick={toggleGate}
            disabled={processing}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              isOpen
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
            }`}
          >
            {isOpen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>{isOpen ? t('gate_open_label') : t('gate_closed_label')}</span>
          </button>

          <button
            onClick={() => setShowWipeModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('wipe_season_title')}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-vsp-surface border border-vsp-border rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('standings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'standings'
              ? 'bg-vsp-card text-white border border-vsp-border'
              : 'text-vsp-textSecondary hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4 text-vsp-accent" />
          <span>{t('tab_standings')} ({players.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('registrations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'registrations'
              ? 'bg-vsp-accent/20 text-vsp-accent border border-vsp-accent/30'
              : 'text-vsp-textSecondary hover:text-white'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('tab_registrations')} ({registrations.length})</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-vsp-accent animate-spin" />
        </div>
      ) : activeTab === 'standings' ? (
        <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden">
          {players.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title={t('no_data')}
              subtitle=""
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-vsp-card/50 text-vsp-textSecondary border-b border-vsp-border">
                  <tr>
                    <th className="px-6 py-4 font-bold text-center w-16">#</th>
                    <th className="px-6 py-4 font-bold">{t('player_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('total_points_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('skill_points_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('goals_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('titles_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('trend_col')}</th>
                    <th className="px-6 py-4 font-bold text-center">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vsp-border/50">
                  {players.map((player, index) => {
                    const isTop1 = index === 0;
                    const isTop3 = index < 3;

                    return (
                      <tr
                        key={player.id}
                        className={`hover:bg-vsp-card/30 transition-colors ${
                          isTop1 ? 'bg-vsp-accent/5' : ''
                        }`}
                      >
                        <td className="px-6 py-4 text-center font-black text-sm">
                          {index === 0 ? (
                            <span className="text-vsp-accent font-black text-base">1</span>
                          ) : index === 1 ? (
                            <span className="text-zinc-300 font-bold">2</span>
                          ) : index === 2 ? (
                            <span className="text-amber-500 font-bold">3</span>
                          ) : (
                            <span className="text-zinc-500 font-mono">{index + 1}</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
                              {player.avatar_url ? (
                                <img
                                  src={player.avatar_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                player.name?.charAt(0) || 'P'
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-white flex items-center gap-1.5">
                                <span>{player.name}</span>
                                {isTop1 && <Flame className="w-3.5 h-3.5 text-vsp-accent fill-vsp-accent" />}
                              </h4>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                ID: {player.id?.substring(0, 8)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-vsp-accent">
                            {player.total_points || 0} pts
                          </span>
                        </td>

                        <td className="px-6 py-4 font-bold text-white">
                          {player.skill_points || 0}
                        </td>

                        <td className="px-6 py-4 font-bold text-white">
                          {player.goals || 0}
                        </td>

                        <td className="px-6 py-4">
                          <Badge variant={player.titles > 0 ? 'accent' : 'default'} size="xs">
                            {player.titles || 0} {t('titles_col')}
                          </Badge>
                        </td>

                        <td className="px-6 py-4">
                          {player.trend === 'up' ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-bold">
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>{t('trend_up')}</span>
                            </span>
                          ) : player.trend === 'down' ? (
                            <span className="text-red-400 flex items-center gap-1 font-bold">
                              <TrendingDown className="w-3.5 h-3.5" />
                              <span>{t('trend_down')}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-400 flex items-center gap-1">
                              <Minus className="w-3.5 h-3.5" />
                              <span>{t('trend_stable')}</span>
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setEditingPlayer(player)}
                            className="p-1.5 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-vsp-textSecondary hover:text-white rounded-lg transition-all"
                            title={t('edit_booking_btn')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Registrations Tab */
        <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden">
          {registrations.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={t('no_data')}
              subtitle={t('no_disputes_sub')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-vsp-card/50 text-vsp-textSecondary border-b border-vsp-border">
                  <tr>
                    <th className="px-6 py-4 font-bold">{t('player_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('phone')}</th>
                    <th className="px-6 py-4 font-bold">{t('governorate')}</th>
                    <th className="px-6 py-4 font-bold">{t('date')}</th>
                    <th className="px-6 py-4 font-bold text-center">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vsp-border/50">
                  {registrations.map((reg) => {
                    const playerName = reg.player_name || reg.name || reg.users?.name || t('player_col');
                    const playerPhone = reg.phone || reg.users?.phone || '-';

                    return (
                      <tr key={reg.id} className="hover:bg-vsp-card/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
                              {reg.avatar_url || reg.users?.profile_image_url ? (
                                <img
                                  src={reg.avatar_url || reg.users?.profile_image_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                playerName.charAt(0)
                              )}
                            </div>
                            <h4 className="font-bold text-white">{playerName}</h4>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-vsp-textSecondary font-mono">{playerPhone}</td>

                        <td className="px-6 py-4 text-vsp-textSecondary font-semibold">
                          {reg.governorate || '-'}
                        </td>

                        <td className="px-6 py-4 text-zinc-400 font-mono text-[11px]">
                          {reg.created_at ? new Date(reg.created_at).toLocaleDateString(t('lang_button') === 'English' ? 'ar-EG' : 'en-US') : '-'}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => approveReg(reg)}
                              disabled={processing}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold rounded-lg text-xs transition-all flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{t('confirm')}</span>
                            </button>

                            <button
                              onClick={() => rejectReg(reg.id)}
                              disabled={processing}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{t('reject_owner_btn')}</span>
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
      )}

      {/* Edit Player Stats Modal */}
      <Modal
        isOpen={Boolean(editingPlayer)}
        onClose={() => setEditingPlayer(null)}
        title={t('edit_player_modal_title')}
      >
        {editingPlayer && (
          <form onSubmit={handleSaveStats} className="space-y-4">
            <div className="p-3 bg-vsp-card border border-vsp-border rounded-xl">
              <h4 className="font-bold text-white text-xs">{editingPlayer.name}</h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">
                  {t('total_points_col')}
                </label>
                <input
                  type="number"
                  value={editingPlayer.total_points || 0}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, total_points: Number(e.target.value) })
                  }
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">
                  {t('skill_points_col')}
                </label>
                <input
                  type="number"
                  value={editingPlayer.skill_points || 0}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, skill_points: Number(e.target.value) })
                  }
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">{t('goals_col')}</label>
                <input
                  type="number"
                  value={editingPlayer.goals || 0}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, goals: Number(e.target.value) })
                  }
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">
                  {t('titles_col')}
                </label>
                <input
                  type="number"
                  value={editingPlayer.titles || 0}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, titles: Number(e.target.value) })
                  }
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">{t('trend_col')}</label>
              <select
                value={editingPlayer.trend || 'stable'}
                onChange={(e) => setEditingPlayer({ ...editingPlayer, trend: e.target.value })}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
              >
                <option value="up">{t('trend_up')}</option>
                <option value="stable">{t('trend_stable')}</option>
                <option value="down">{t('trend_down')}</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-vsp-border">
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="px-4 py-2 bg-vsp-card border border-vsp-border text-zinc-300 hover:text-white rounded-xl text-xs font-bold"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-5 py-2 bg-zinc-100 hover:bg-white text-black rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {processing ? t('processing') : t('save_changes')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Player Modal */}
      <Modal
        isOpen={showAddPlayerModal}
        onClose={() => setShowAddPlayerModal(false)}
        title={t('add_player_modal_title')}
      >
        <form onSubmit={handleAddPlayer} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">{t('player_col')}</label>
            <input
              type="text"
              required
              value={newPlayerForm.name}
              onChange={(e) => setNewPlayerForm({ ...newPlayerForm, name: e.target.value })}
              placeholder="Player Name"
              className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">
              {t('initial_points')}
            </label>
            <input
              type="number"
              value={newPlayerForm.initialPoints}
              onChange={(e) =>
                setNewPlayerForm({ ...newPlayerForm, initialPoints: Number(e.target.value) })
              }
              className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-vsp-border">
            <button
              type="button"
              onClick={() => setShowAddPlayerModal(false)}
              className="px-4 py-2 bg-vsp-card border border-vsp-border text-zinc-300 hover:text-white rounded-xl text-xs font-bold"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={processing}
              className="px-5 py-2 bg-zinc-100 hover:bg-white text-black rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              {processing ? t('processing') : t('confirm')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Wipe Season Modal */}
      <Modal
        isOpen={showWipeModal}
        onClose={() => setShowWipeModal(false)}
        title={t('wipe_season_title')}
      >
        <div className="space-y-4">
          <p className="text-xs text-vsp-textSecondary leading-relaxed">
            {t('wipe_season_prompt')}
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-vsp-border">
            <button
              onClick={() => setShowWipeModal(false)}
              className="px-4 py-2 bg-vsp-card border border-vsp-border text-zinc-300 hover:text-white rounded-xl text-xs font-bold"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleWipeSeason}
              disabled={processing}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-black transition-all"
            >
              {processing ? t('processing') : t('confirm')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
