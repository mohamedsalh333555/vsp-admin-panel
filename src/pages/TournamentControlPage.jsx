import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Trophy,
  RefreshCw,
  CheckCircle,
  Clock,
  Play,
  Loader2,
  Calendar,
  Users,
  Building2,
  GitBranch,
  Flame,
  Award,
} from 'lucide-react';

export const TournamentControlPage = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [championships, setChampionships] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const data = await adminService.fetchChampionships();
      setChampionships(data || []);
    } catch (e) {
      showToast(t('error_loading'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const updateStatus = async (id, nextStatus) => {
    setUpdatingId(id);
    try {
      const res = await adminService.updateChampionshipStatus(id, nextStatus);
      if (res.success) {
        showToast(t('toast_status_updated'));
        fetchTournaments();
      } else {
        showToast(res.error || t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleGenerateBracket = async (id) => {
    setUpdatingId(id);
    try {
      const res = await adminService.prepareTournamentBracket(id);
      if (res.success) {
        showToast(t('toast_bracket_generated'));
        fetchTournaments();
      } else {
        showToast(res.error || t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setUpdatingId(null);
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
            <Trophy className="w-6 h-6 text-vsp-accent" />
            <span>{t('tournaments_title')}</span>
          </h1>
          <p className="text-xs text-vsp-textSecondary mt-0.5">
            {t('tournaments_subtitle')}
          </p>
        </div>

        <button
          onClick={fetchTournaments}
          className="p-2.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-vsp-textSecondary hover:text-white rounded-xl transition-all self-end sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-vsp-accent animate-spin" />
        </div>
      ) : championships.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={t('no_tournaments_title')}
          subtitle=""
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {championships.map((champ) => {
            const isProcessing = updatingId === champ.id;
            const status = champ.status || 'draft';

            return (
              <div
                key={champ.id}
                className="bg-vsp-surface border border-vsp-border hover:border-zinc-700 rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-sm line-clamp-1">{champ.name}</h3>
                    <Badge
                      variant={
                        status === 'in_progress' || status === 'active'
                          ? 'accent'
                          : status === 'completed'
                          ? 'success'
                          : status === 'registration_open'
                          ? 'blue'
                          : 'default'
                      }
                      size="xs"
                    >
                      {status}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-vsp-textSecondary line-clamp-2 leading-relaxed">
                    {champ.rules || `${champ.sport_type || 'Football'}`}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-vsp-border/50 text-xs">
                    <div className="flex items-center gap-1.5 text-vsp-textSecondary">
                      <Users className="w-3.5 h-3.5 text-vsp-accent" />
                      <span>{champ.max_teams || 16} {t('teams_count_col')}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-vsp-textSecondary">
                      <Award className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{champ.grand_prize ? `${Number(champ.grand_prize).toLocaleString()} ${t('currency')}` : (champ.trophy_medals ? 'Cup & Medals' : '')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-3 border-t border-vsp-border">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerateBracket(champ.id)}
                      disabled={isProcessing}
                      className="flex-1 py-2 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      <GitBranch className="w-3.5 h-3.5 text-vsp-accent" />
                      <span>{t('generate_bracket_btn')}</span>
                    </button>

                    <button
                      onClick={() =>
                        updateStatus(champ.id, status === 'in_progress' ? 'completed' : 'in_progress')
                      }
                      disabled={isProcessing}
                      className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-zinc-500 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      {status === 'in_progress' ? <CheckCircle className="w-3.5 h-3.5 text-vsp-accent" /> : <Play className="w-3.5 h-3.5 text-zinc-400" />}
                      <span>{status === 'in_progress' ? t('completed') : t('confirmed')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
