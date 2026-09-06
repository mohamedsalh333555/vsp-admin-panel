import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
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
  AlertTriangle,
} from 'lucide-react';

export const TournamentControlPage = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [championships, setChampionships] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedForBracket, setSelectedForBracket] = useState(null);
  const [confirmingBracket, setConfirmingBracket] = useState(false);
  const [selectedForPrizeDelivery, setSelectedForPrizeDelivery] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [confirmDeliveryCheck, setConfirmDeliveryCheck] = useState(false);
  const [deliveringPrize, setDeliveringPrize] = useState(false);

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

  const executeMarkPrizeDelivered = async () => {
    if (!selectedForPrizeDelivery) return;
    setDeliveringPrize(true);
    try {
      const res = await adminService.markChampionshipPrizeDelivered(
        selectedForPrizeDelivery.id,
        deliveryNotes
      );
      if (res && res.success !== false) {
        showToast('تم توثيق تسليم الجائزة وإدراجها في السجل المالي بنجاح');
        setSelectedForPrizeDelivery(null);
        setDeliveryNotes('');
        setConfirmDeliveryCheck(false);
        fetchTournaments();
      } else {
        showToast(res?.error || 'فشل في توثيق تسليم الجائزة', 'error');
      }
    } catch (e) {
      showToast(e.message || 'حدث خطأ أثناء توثيق التسليم', 'error');
    } finally {
      setDeliveringPrize(false);
    }
  };

  const executeGenerateBracket = async (id) => {
    setConfirmingBracket(true);
    setUpdatingId(id);
    try {
      const res = await adminService.prepareTournamentBracket(id);
      if (res.success) {
        showToast(t('toast_bracket_generated') || 'تم إطلاق القرعة وتوليد شجرة المباريات بنجاح.');
        setSelectedForBracket(null);
        fetchTournaments();
      } else {
        showToast(res.error || t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setConfirmingBracket(false);
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

      {/* Confirmation Modal for Bracket Generation */}
      {selectedForBracket && (
        <Modal
          isOpen={!!selectedForBracket}
          onClose={() => !confirmingBracket && setSelectedForBracket(null)}
          title="تأكيد إطلاق القرعة وتوليد شجرة المباريات"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <p className="font-bold text-amber-300 mb-1">
                  تنبيه أمني وتنظيمي:
                </p>
                سيتم سحب الفرق عشوائياً وتوليد شجرة الأدوار والإقصائيات فوراً.
                تأكد من استيفاء شروط السداد لكافة الفرق قبل إطلاق القرعة، حيث لن يسمح بمسح أو تعديل الفرق بعد انطلاق المباريات.
              </div>
            </div>

            <div className="bg-vsp-surfaceAlt p-4 rounded-xl space-y-2.5 text-xs border border-vsp-border">
              <div className="flex justify-between text-vsp-textSecondary">
                <span>اسم البطولة:</span>
                <span className="font-bold text-white">{selectedForBracket.name}</span>
              </div>
              <div className="flex justify-between text-vsp-textSecondary">
                <span>الفرق المسددة / المؤهلة:</span>
                <span className="font-bold text-vsp-accent">
                  {(selectedForBracket.paid_teams?.length || selectedForBracket.joined_teams?.length || 0)} من أصل {selectedForBracket.max_teams || 16}
                </span>
              </div>
              <div className="flex justify-between text-vsp-textSecondary">
                <span>رسوم الاشتراك:</span>
                <span className="font-bold text-white">
                  {selectedForBracket.entry_fee ? `${Number(selectedForBracket.entry_fee).toLocaleString()} ج.م` : 'مجانية'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={confirmingBracket}
                onClick={() => setSelectedForBracket(null)}
                className="flex-1 py-2.5 bg-vsp-surfaceAlt hover:bg-vsp-card text-vsp-textSecondary hover:text-white rounded-xl text-xs font-bold transition-all border border-vsp-border"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={confirmingBracket}
                onClick={() => executeGenerateBracket(selectedForBracket.id)}
                className="flex-1 py-2.5 bg-vsp-accent hover:bg-vsp-accent/90 text-black rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-vsp-accent/20"
              >
                {confirmingBracket ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GitBranch className="w-4 h-4" />
                )}
                <span>تأكيد وإطلاق القرعة</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Prize Delivery Handover Modal */}
      {selectedForPrizeDelivery && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!deliveringPrize) {
              setSelectedForPrizeDelivery(null);
              setDeliveryNotes('');
              setConfirmDeliveryCheck(false);
            }
          }}
          title="توثيق تسليم الجائزة المالية للبطولة"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-vsp-surfaceAlt rounded-xl border border-vsp-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-vsp-textSecondary">البطولة:</span>
                <span className="font-bold text-white">{selectedForPrizeDelivery.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-vsp-textSecondary">الفريق البطل:</span>
                <span className="font-bold text-vsp-accent">
                  {selectedForPrizeDelivery.champion_team_name || selectedForPrizeDelivery.winner_team_name || 'الفريق الفائز'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-vsp-textSecondary">قيمة الجائزة المسلمة (الوعاء الفعلي):</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {Number(selectedForPrizeDelivery.prize_pool || selectedForPrizeDelivery.grand_prize || 0).toLocaleString()} {t('currency')}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">
                ملاحظات التسليم وطريقة التحويل
              </label>
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="مثال: تم التحويل بنكياً على محفظة كابتن الفريق / تسليم نقدي في الملعب بحضور الإدارة..."
                className="w-full h-20 p-2.5 bg-vsp-surfaceAlt border border-vsp-border rounded-xl text-xs text-white placeholder-zinc-500 focus:border-vsp-accent outline-none resize-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={confirmDeliveryCheck}
                onChange={(e) => setConfirmDeliveryCheck(e.target.checked)}
                className="rounded border-zinc-700 text-vsp-accent focus:ring-0 w-4 h-4 bg-zinc-900"
              />
              <span className="text-xs text-zinc-300 select-none">
                أقر بتسليم كامل مبلغ الجائزة وتوثيق الحركة في سجل المعاملات المالية
              </span>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={deliveringPrize}
                onClick={() => {
                  setSelectedForPrizeDelivery(null);
                  setDeliveryNotes('');
                  setConfirmDeliveryCheck(false);
                }}
                className="flex-1 py-2.5 bg-vsp-surfaceAlt hover:bg-vsp-card text-vsp-textSecondary hover:text-white rounded-xl text-xs font-bold transition-all border border-vsp-border"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deliveringPrize || !confirmDeliveryCheck}
                onClick={executeMarkPrizeDelivered}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  !confirmDeliveryCheck || deliveringPrize
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                }`}
              >
                {deliveringPrize ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Award className="w-4 h-4" />
                )}
                <span>تأكيد التسليم وتوثيق السجل</span>
              </button>
            </div>
          </div>
        </Modal>
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
            const isOngoing = status === 'ongoing' || status === 'in_progress' || status === 'active';
            const isCompleted = status === 'completed';

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
                        isOngoing
                          ? 'accent'
                          : isCompleted
                          ? 'success'
                          : status === 'open' || status === 'registration_open'
                          ? 'blue'
                          : 'default'
                      }
                      size="xs"
                    >
                      {status === 'open' ? 'تسجيل مفتوح' : status === 'ongoing' ? 'جارية' : status === 'completed' ? 'مكتملة' : status}
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
                      <Award className="w-3.5 h-3.5 text-vsp-accent" />
                      <span>
                        {champ.prize_pool && Number(champ.prize_pool) > 0
                          ? `${Number(champ.prize_pool).toLocaleString()} ${t('currency')} (وعاء فعلي)`
                          : champ.grand_prize && Number(champ.grand_prize) > 0
                          ? `${Number(champ.grand_prize).toLocaleString()} ${t('currency')}`
                          : (champ.trophy_medals ? 'كأس وميداليات' : 'بطولة شرفية')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Completed Delivery Ledger Status */}
                {isCompleted && (
                  <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400 font-medium">حالة الجائزة:</span>
                      {champ.prize_delivered ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          تم التسليم
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          بانتظار التسليم
                        </span>
                      )}
                    </div>
                    {champ.prize_delivered ? (
                      <div className="text-[10px] text-zinc-500 line-clamp-1">
                        {champ.prize_delivery_notes ? `ملاحظات: ${champ.prize_delivery_notes}` : 'تم التوثيق في السجل المالي'}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedForPrizeDelivery(champ)}
                        className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>توثيق تسليم الجائزة للبطل</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-3 border-t border-vsp-border">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedForBracket(champ)}
                      disabled={isProcessing || isOngoing || isCompleted}
                      title={isOngoing ? 'القرعة جارية بالفعل' : isCompleted ? 'البطولة منتهية' : 'إطلاق القرعة وتوليد شجرة المباريات'}
                      className={`flex-1 py-2 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all border ${
                        isOngoing || isCompleted
                          ? 'bg-zinc-900/40 text-zinc-500 border-zinc-800 cursor-not-allowed'
                          : 'bg-vsp-card hover:bg-vsp-border border-vsp-border text-white hover:border-vsp-accent/40'
                      }`}
                    >
                      <GitBranch className={`w-3.5 h-3.5 ${isOngoing || isCompleted ? 'text-zinc-600' : 'text-vsp-accent'}`} />
                      <span>{isOngoing ? 'القرعة جارية' : isCompleted ? 'مكتملة' : (t('generate_bracket_btn') || 'توليد القرعة')}</span>
                    </button>

                    <button
                      onClick={() =>
                        updateStatus(champ.id, isOngoing ? 'completed' : 'ongoing')
                      }
                      disabled={isProcessing}
                      className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-zinc-500 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      {isOngoing ? <CheckCircle className="w-3.5 h-3.5 text-vsp-accent" /> : <Play className="w-3.5 h-3.5 text-zinc-400" />}
                      <span>{isOngoing ? t('completed') : 'بدء البطولة'}</span>
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
