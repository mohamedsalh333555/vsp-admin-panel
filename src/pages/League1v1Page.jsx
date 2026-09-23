import React, { useState, useEffect } from 'react';
import {
  Cup,
  Profile2User,
  Add,
  Trash,
  Save2,
  Send2,
  TickCircle,
  Warning2,
  Timer1,
  UserAdd,
  RotateRight,
  MagicStar,
  ShieldTick,
  DirectNormal,
  Flash,
  Refresh2,
  Eye,
  CloseCircle,
  Coin,
  Card,
  Award,
  Location,
  Filter,
} from 'iconsax-react';

export const EGYPT_GOVERNORATES = [
  { id: 'Cairo', name: 'القاهرة' },
  { id: 'Giza', name: 'الجيزة' },
  { id: 'Alexandria', name: 'الإسكندرية' },
  { id: 'Dakahlia', name: 'الدقهلية' },
  { id: 'Sharqia', name: 'الشرقية' },
  { id: 'Monufia', name: 'المنوفية' },
  { id: 'Qalyubia', name: 'القليوبية' },
  { id: 'Gharbia', name: 'الغربية' },
  { id: 'Beheira', name: 'البحيرة' },
  { id: 'Damietta', name: 'دمياط' },
  { id: 'Port Said', name: 'بورسعيد' },
  { id: 'Ismailia', name: 'الإسماعيلية' },
  { id: 'Suez', name: 'السويس' },
  { id: 'Kafr El Sheikh', name: 'كفر الشيخ' },
  { id: 'Faiyum', name: 'الفيوم' },
  { id: 'Beni Suef', name: 'بني سويف' },
  { id: 'Minya', name: 'المنيا' },
  { id: 'Asyut', name: 'أسيوط' },
  { id: 'Sohag', name: 'سوهاج' },
  { id: 'Qena', name: 'قنا' },
  { id: 'Luxor', name: 'الأقصر' },
  { id: 'Aswan', name: 'أسوان' },
  { id: 'Red Sea', name: 'البحر الأحمر' },
  { id: 'New Valley', name: 'الوادي الجديد' },
  { id: 'Matrouh', name: 'مطروح' },
  { id: 'North Sinai', name: 'شمال سيناء' },
  { id: 'South Sinai', name: 'جنوب سيناء' },
];

export const getGovArabicName = (govKey) => {
  if (!govKey) return '-';
  const found = EGYPT_GOVERNORATES.find(
    (g) => g.id.toLowerCase() === (govKey || '').toLowerCase()
  );
  return found ? found.name : govKey;
};
import { adminService } from '../services/adminService';
import { supabase } from '../lib/supabase';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

export const League1v1Page = () => {
 const [activeTab, setActiveTab] = useState('live'); // 'live' | 'history' | 'registrations'
 const [loading, setLoading] = useState(true);
 const [processing, setProcessing] = useState(false);
 const [alert, setAlert] = useState(null); // { type: 'success' | 'error', message: string }

 // Governorate Scoping State
 const [selectedGovernorate, setSelectedGovernorate] = useState('Cairo');
 const [allActiveTournaments, setAllActiveTournaments] = useState([]);
 const [selectedGovInput, setSelectedGovInput] = useState('Cairo');
 const [historyGovFilter, setHistoryGovFilter] = useState('all');

 // Active Tournament State
 const [activeTournament, setActiveTournament] = useState(null);
 const [players, setPlayers] = useState([]);

 // Modal State for New Tournament
 const [showNewModal, setShowNewModal] = useState(false);
 const [tournamentName, setTournamentName] = useState('');
 const [playerCountInput, setPlayerCountInput] = useState('32');
 const [scheduledAtInput, setScheduledAtInput] = useState(() => {
 const d = new Date(Date.now() + 86400000 * 2);
 d.setHours(19, 0, 0, 0);
 return d.toISOString().slice(0, 16);
 });
 const [entryFeeInput, setEntryFeeInput] = useState('50');

 // Modal State for Prize Delivery Handover
 const [showPrizeDeliveryModal, setShowPrizeDeliveryModal] = useState(false);
 const [deliveryNotesInput, setDeliveryNotesInput] = useState('');
 const [deliveryConfirmedCheckbox, setDeliveryConfirmedCheckbox] = useState(false);

 // History & Registrations State
 const [historyList, setHistoryList] = useState([]);
 const [registrations, setRegistrations] = useState([]);
 const [viewHistoryModal, setViewHistoryModal] = useState(false);
 const [selectedHistoryTournament, setSelectedHistoryTournament] = useState(null);
 const [historyPlayers, setHistoryPlayers] = useState([]);

 // Auto-clear alert after 6 seconds
 useEffect(() => {
 if (alert) {
 const timer = setTimeout(() => setAlert(null), 6000);
 return () => clearTimeout(timer);
 }
 }, [alert]);

 const loadData = async (targetGov = null) => {
  try {
   setLoading(true);
   const govToUse = targetGov !== null ? targetGov : selectedGovernorate;

   // 1. Fetch all active tournaments across governorates
   const activeRes = await adminService.listActive1v1Tournaments();
   const activeList = activeRes.success ? (activeRes.tournaments || []) : [];
   setAllActiveTournaments(activeList);

   // 2. Fetch current active or latest tournament for the selected governorate
   const res = await adminService.getActiveOrLatest1v1Tournament(govToUse);
   if (res.success) {
    setActiveTournament(res.tournament);
    setPlayers(res.players || []);
   } else {
    setActiveTournament(null);
    setPlayers([]);
   }

   // 3. Fetch history list
   const histRes = await adminService.list1v1Tournaments();
   if (histRes.success) {
    setHistoryList(histRes.tournaments || []);
   }

   // 4. Fetch registrations
   const regRes = await adminService.fetch1v1PendingRegistrations();
   if (regRes.success) {
    setRegistrations(regRes.data || []);
   }
  } catch (e) {
   console.error('Error loading 1v1 data:', e);
   setAlert({ type: 'error', message: 'حدث خطأ أثناء تحميل البيانات: ' + e.message });
  } finally {
   setLoading(false);
  }
 };

 const handleGovernorateChange = (gov) => {
  setSelectedGovernorate(gov);
  loadData(gov);
 };

 useEffect(() => {
 loadData();

 // Subscribe to realtime registrations
 const channel = supabase
 .channel('admin_1v1_realtime_' + Date.now())
 .on('postgres_changes', { event: '*', schema: 'public', table: 'vsp_1v1_tournament_players' }, () => {
 loadData();
 })
 .on('postgres_changes', { event: '*', schema: 'public', table: 'vsp_1v1_tournaments' }, () => {
 loadData();
 })
 .subscribe();

 return () => {
 channel.unsubscribe();
 };
 }, []);

 // -------------------------------------------------------------------------
 // 1. START NEW TOURNAMENT (تحديد عدد اللاعبين يدوياً)
 // -------------------------------------------------------------------------
 const handleOpenNewTournamentModal = (initialGov = null) => {
  const gov = initialGov || selectedGovernorate || 'Cairo';
  const today = new Date().toLocaleDateString('ar-EG', {
   weekday: 'long',
   year: 'numeric',
   month: 'short',
   day: 'numeric',
  });
  setTournamentName(`بطولة 1vs1 فردية - ${getGovArabicName(gov)} - ${today}`);
  setSelectedGovInput(gov);
  setPlayerCountInput('32');
  setShowNewModal(true);
 };

 const handleConfirmStartTournament = async (e) => {
  e.preventDefault();
  const count = parseInt(playerCountInput);
  if (!count || count < 2) {
   setAlert({ type: 'error', message: 'يرجى إدخال عدد لاعبين صحيح (لا يقل عن 2).' });
   return;
  }

  try {
   setProcessing(true);

   // Get current logged-in admin user ID if available
   const { data: authData } = await supabase.auth.getUser();
   const adminUserId = authData?.user?.id || null;

   // Create new registration_open tournament
   const scheduledIso = scheduledAtInput ? new Date(scheduledAtInput).toISOString() : null;
   const fee = parseFloat(entryFeeInput) || 0;
   const createRes = await adminService.create1v1Tournament({
    name: tournamentName,
    target_player_count: count,
    entry_fee: fee,
    scheduled_at: scheduledIso,
    created_by: adminUserId,
    governorate: selectedGovInput || 'Cairo',
   });

   if (!createRes.success) {
    throw new Error(createRes.error || 'فشل إنشاء البطولة');
   }

   const newTournament = createRes.data;

   setSelectedGovernorate(newTournament.governorate);
   setActiveTournament(newTournament);
   setPlayers([]);
   setShowNewModal(false);
   setAlert({
    type: 'success',
    message: `تم إنشاء البطولة لمحافظة ${getGovArabicName(newTournament.governorate)} وفتح باب التسجيل بنجاح!`,
   });

   await loadData(newTournament.governorate);
  } catch (e) {
   console.error('Error starting new tournament:', e);
   setAlert({ type: 'error', message: e.message || 'فشل بدء البطولة' });
  } finally {
   setProcessing(false);
  }
 };

 // -------------------------------------------------------------------------
 // 2. LIVE SCORING SHEET ROW ACTIONS
 // -------------------------------------------------------------------------
 const handlePlayerChange = (index, field, value) => {
 setPlayers((prev) => {
 const updated = [...prev];
 const row = { ...updated[index] };

 if (field === 'player_name') {
 row.player_name = value;
 row.name = value;
 } else if (field === 'round_reached') {
 row.round_reached = value || '';
 } else {
 const numVal = Math.max(0, parseInt(value) || 0);
 row[field] = numVal;
 if (field === 'skills') row.skill_points = numVal;
 }

 // Compute total_points live in frontend
 const t = Number(row.tackles) || 0;
 const g = Number(row.goals) || 0;
 const s = Number(row.skills ?? row.skill_points) || 0;
 row.total_points = t + g + s;

 updated[index] = row;
 return updated;
 });
 };

 const handleAddPlayerRow = () => {
 setPlayers((prev) => [
 ...prev,
 {
 id: `temp_${Date.now()}_${prev.length}`,
 player_name: `لاعب #${prev.length + 1}`,
 name: `لاعب #${prev.length + 1}`,
 tackles: 0,
 goals: 0,
 skills: 0,
 skill_points: 0,
 total_points: 0,
 round_reached: '',
 user_id: null,
 avatar_url: '',
 },
 ]);
 };

  const handleDeletePlayerRow = (index) => {
    if (players.length <= 2) {
      setAlert({ type: 'error', message: 'يجب أن تحتوي البطولة على لاعبين اثنين على الأقل.' });
      return;
    }
    if (!window.confirm('هل أنت متأكد من حذف هذا اللاعب؟')) {
      return;
    }
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  };

 const handleConfirmPrizeDelivery = async (e) => {
 e?.preventDefault();
 if (!activeTournament?.id) return;
 if (!deliveryConfirmedCheckbox) {
 setAlert({ type: 'error', message: 'يرجى تأكيد إقرار تسليم المبلغ يداً بيد للمتابعة.' });
 return;
 }
 try {
 setProcessing(true);
 const res = await adminService.mark1v1PrizeDelivered(activeTournament.id, deliveryNotesInput);
 if (!res.success) throw new Error(res.error || 'فشل توثيق تسليم الجائزة');
 
 setActiveTournament((prev) => ({
 ...prev,
 prize_delivered: true,
 prize_delivered_at: new Date().toISOString(),
 prize_delivery_notes: deliveryNotesInput,
 }));
 setShowPrizeDeliveryModal(false);
 setDeliveryNotesInput('');
 setDeliveryConfirmedCheckbox(false);
 setAlert({
 type: 'success',
 message: 'تم توثيق تسليم الجائزة المالية للبطل رسمياً بنجاح! ',
 });
 loadData();
 } catch (e) {
 setAlert({ type: 'error', message: e.message });
 } finally {
 setProcessing(false);
 }
 };

 const handleToggleStatus = async (newStatus) => {
 if (!activeTournament?.id) return;
 try {
 setProcessing(true);
 const res = await adminService.update1v1TournamentStatus(activeTournament.id, newStatus);
 if (!res.success) throw new Error(res.error || 'فشل تغيير الحالة');
 setActiveTournament((prev) => ({ ...prev, status: newStatus }));
 setAlert({
 type: 'success',
 message: newStatus === 'in_progress' 
 ? 'تم إغلاق باب التسجيل وبدء مرحلة رصد الدرجات! ' 
 : 'تم إعادة فتح باب التسجيل للاعبين عبر الموبايل! ',
 });
 loadData();
 } catch (e) {
 setAlert({ type: 'error', message: e.message });
 } finally {
 setProcessing(false);
 }
 };

  // -------------------------------------------------------------------------
  // 3. SAVE DRAFT (حفظ كمسودة دون نشر - حساب النقاط في الباك إند)
  // -------------------------------------------------------------------------
  const handleSaveDraft = async () => {
    if (!activeTournament?.id) {
      setAlert({ type: 'error', message: 'لا توجد بطولة نشطة للحفظ.' });
      return;
    }

    try {
      setProcessing(true);
      // تنقية بيانات اللاعبين: إرسال tackles و goals و skills فقط للباك إند لحساب total_points
      const cleanPlayers = players.map((p, idx) => ({
        player_name: (p.player_name || p.name || `لاعب #${idx + 1}`).trim(),
        user_id: p.user_id || null,
        avatar_url: p.avatar_url || null,
        tackles: Math.max(0, parseInt(p.tackles) || 0),
        goals: Math.max(0, parseInt(p.goals) || 0),
        skills: Math.max(0, parseInt(p.skills ?? p.skill_points) || 0),
        round_reached: p.round_reached ? p.round_reached.trim() : null,
      }));

      const res = await adminService.save1v1TournamentPlayers(activeTournament.id, cleanPlayers);
      if (!res.success) throw new Error(res.error || 'فشل حفظ المسودة');

      setAlert({ type: 'success', message: 'تم حفظ مسودة درجات اللاعبين بنجاح! 💾' });
    } catch (e) {
      console.error('Error saving draft:', e);
      setAlert({ type: 'error', message: 'فشل حفظ المسودة: ' + e.message });
    } finally {
      setProcessing(false);
    }
  };

  // -------------------------------------------------------------------------
  // 4. PUBLISH TOURNAMENT (نشر الترتيب ذرياً مع آلية Rollback تلقائية)
  // -------------------------------------------------------------------------
  const handlePublishTournament = async () => {
    if (!activeTournament?.id) {
      setAlert({ type: 'error', message: 'لا توجد بطولة نشطة للنشر.' });
      return;
    }

    const confirmMsg = `هل أنت متأكد من رغبتك في نشر الترتيب النهائي للبطولة (${activeTournament.name})؟\n\nسيتم أرشفة أي بطولة سابقة ونشر هذا الترتيب فوراً على تطبيق الموبايل لجميع اللاعبين!`;
    if (!window.confirm(confirmMsg)) return;

    const previousStatus = activeTournament.status || 'registration_open';

    try {
      setProcessing(true);

      // تنقية بيانات اللاعبين والترتيب التلقائي للأعلى نقاطاً
      const cleanPlayers = players.map((p, idx) => ({
        player_name: (p.player_name || p.name || `لاعب #${idx + 1}`).trim(),
        user_id: p.user_id || null,
        avatar_url: p.avatar_url || null,
        tackles: Math.max(0, parseInt(p.tackles) || 0),
        goals: Math.max(0, parseInt(p.goals) || 0),
        skills: Math.max(0, parseInt(p.skills ?? p.skill_points) || 0),
        round_reached: p.round_reached ? p.round_reached.trim() : null,
      }));

      // استدعاء الحفظ والنشر الذري مع آلية Rollback
      const pubRes = await adminService.saveAndPublish1v1Tournament({
        tournamentId: activeTournament.id,
        playersList: cleanPlayers,
        fallbackStatus: previousStatus,
      });

      if (!pubRes.success) {
        throw new Error(pubRes.error || 'فشل نشر البطولة');
      }

      setAlert({
        type: 'success',
        message: '🚀 تم حفظ ونشر الترتيب النهائي بنجاح! الترتيب معروض الآن مباشرة على هواتف اللاعبين.',
      });

      // Reload updated tournament and players
      await loadData();
    } catch (e) {
      console.error('Error publishing tournament:', e);
      setAlert({ type: 'error', message: 'فشل النشر: ' + e.message });
    } finally {
      setProcessing(false);
    }
  };


 // -------------------------------------------------------------------------
 // 5. VIEW ARCHIVE DETAILS
 // -------------------------------------------------------------------------
 const handleViewArchive = async (tourn) => {
 try {
 setSelectedHistoryTournament(tourn);
 setViewHistoryModal(true);
 const { data, error } = await supabase
 .from('vsp_1v1_tournament_players')
 .select('*')
 .eq('tournament_id', tourn.id)
 .order('total_points', { ascending: false });

 if (error) throw error;
 setHistoryPlayers(data || []);
 } catch (e) {
 console.error('Error fetching archive players:', e);
 }
 };

 // Sorted list for live ranking preview
 const sortedPlayersPreview = [...players].sort((a, b) => {
 const ptA = (Number(a.tackles) || 0) + (Number(a.goals) || 0) + (Number(a.skills ?? a.skill_points) || 0);
 const ptB = (Number(b.tackles) || 0) + (Number(b.goals) || 0) + (Number(b.skills ?? b.skill_points) || 0);
 return ptB - ptA;
 });

 return (
 <div className="p-6 space-y-6 text-right max-w-7xl mx-auto" dir="rtl">
 {/* ==================================================================== */}
 {/* HEADER SECTION */}
 {/* ==================================================================== */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-vsp-surface p-6 rounded-2xl border border-vsp-border shadow-xl">
 <div>
 <div className="flex items-center gap-3 mb-1">
 <span className="p-2.5 bg-vsp-card border border-vsp-border rounded-xl text-zinc-300">
 <Cup className="w-7 h-7" variant="Outline" />
 </span>
 <div>
 <h1 className="text-2xl font-black text-white">إدارة بطولة المواجهات الفردية (1vs1)</h1>
 <p className="text-xs text-vsp-textSecondary mt-0.5">
 إدارة النسخ الواقعية، الرصد السريع للنقاط من الورقة، والنشر الذري المباشر على الهواتف.
 </p>
 </div>
 </div>
 </div>

 {/* Action Controls */}
 <div className="flex items-center gap-3">
 <button
 onClick={loadData}
 disabled={loading || processing}
 className="p-2.5 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-zinc-400 hover:text-white rounded-xl transition-all"
 title="تحديث البيانات"
 >
 <Refresh2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} variant="Outline" />
 </button>

 <button
 onClick={handleOpenNewTournamentModal}
 disabled={processing}
 className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 hover:bg-white text-black font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
 >
 <Add className="w-4 h-4" variant="Outline" />
 <span>بدء بطولة جديدة</span>
 </button>
 </div>
 </div>

 {/* ==================================================================== */}
 {/* ALERT BANNER */}
 {/* ==================================================================== */}
 {alert && (
 <div
 className={`p-4 rounded-xl flex items-center justify-between gap-3 border transition-all ${
 alert.type === 'success'
 ? 'bg-vsp-card border border-vsp-border text-vsp-accent'
 : 'bg-red-500/15 border-red-500/30 text-red-300'
 }`}
 >
 <div className="flex items-center gap-2 text-xs font-bold">
 {alert.type === 'success' ? (
 <TickCircle className="w-5 h-5 text-vsp-accent flex-shrink-0" variant="Outline" />
 ) : (
 <Warning2 className="w-5 h-5 text-red-400 flex-shrink-0" variant="Outline" />
 )}
 <span>{alert.message}</span>
 </div>
 <button onClick={() => setAlert(null)} className="p-1 hover:opacity-80">
 <CloseCircle className="w-4 h-4" variant="Outline" />
 </button>
 </div>
 )}

 {/* ==================================================================== */}
 {/* TABS */}
 {/* ==================================================================== */}
 <div className="flex border-b border-vsp-border gap-2">
 <button
 onClick={() => setActiveTab('live')}
 className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 transition-all relative ${
 activeTab === 'live'
 ? 'text-vsp-accent border-b-2 border-vsp-accent'
 : 'text-vsp-textSecondary hover:text-white'
 }`}
 >
 <Cup className="w-4 h-4" variant="Outline" />
 <span>شيت الرصد والبطولة الحالية</span>
 {activeTournament?.status === 'published' && (
 <span className="w-2 h-2 rounded-full bg-vsp-accent animate-pulse"></span>
 )}
 </button>

 <button
 onClick={() => setActiveTab('history')}
 className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 transition-all relative ${
 activeTab === 'history'
 ? 'text-vsp-accent border-b-2 border-vsp-accent'
 : 'text-vsp-textSecondary hover:text-white'
 }`}
 >
 <Timer1 className="w-4 h-4" variant="Outline" />
 <span>أرشيف البطولات السابقة ({historyList.length})</span>
 </button>

 <button
 onClick={() => setActiveTab('registrations')}
 className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 transition-all relative ${
 activeTab === 'registrations'
 ? 'text-vsp-accent border-b-2 border-vsp-accent'
 : 'text-vsp-textSecondary hover:text-white'
 }`}
 >
 <UserAdd className="w-4 h-4" variant="Outline" />
 <span>طلبات الانضمام المعلقة</span>
 {registrations.length > 0 && (
 <span className="px-2 py-0.5 bg-vsp-accent text-black font-black text-[10px] rounded-full">
 {registrations.length}
 </span>
 )}
 </button>
 </div>

 {/* ==================================================================== */}
 {/* TAB 1: LIVE BULK SCORING SHEET */}
 {/* ==================================================================== */}
 {activeTab === 'live' && (
 <div className="space-y-6">
  {/* Governorate Selection Bar */}
  <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
   <div className="flex items-center gap-3">
    <div className="p-2 bg-vsp-card border border-vsp-border rounded-xl text-zinc-400">
     <Location className="w-5 h-5" variant="Outline" />
    </div>
    <div>
     <span className="text-xs font-bold text-vsp-textSecondary block">المحافظة الحالية للرصد:</span>
     <span className="text-base font-black text-white">{getGovArabicName(selectedGovernorate)}</span>
    </div>
   </div>

   <div className="flex flex-wrap items-center gap-2">
    <span className="text-xs font-bold text-zinc-400">تغيير المحافظة:</span>
    <select
     value={selectedGovernorate}
     onChange={(e) => handleGovernorateChange(e.target.value)}
     disabled={loading || processing}
     className="bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-vsp-accent focus:outline-none"
    >
     {EGYPT_GOVERNORATES.map((g) => {
      const hasActive = allActiveTournaments.some((t) => t.governorate?.toLowerCase() === g.id.toLowerCase());
      return (
       <option key={g.id} value={g.id} className="bg-zinc-900 text-white">
        {g.name} {hasActive ? '• (بطولة نشطة)' : ''}
       </option>
      );
     })}
    </select>

    {allActiveTournaments.length > 0 && (
     <div className="flex items-center gap-1.5 mr-2">
      <span className="text-[11px] text-zinc-500">نشطة الآن:</span>
      {allActiveTournaments.map((t) => (
       <button
        key={t.id}
        type="button"
        onClick={() => handleGovernorateChange(t.governorate)}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
         selectedGovernorate?.toLowerCase() === t.governorate?.toLowerCase()
          ? 'bg-zinc-100 border-zinc-200 text-black font-extrabold'
          : 'bg-vsp-card border-vsp-border text-zinc-400 hover:text-white'
        }`}
       >
        {getGovArabicName(t.governorate)}
       </button>
      ))}
     </div>
    )}
   </div>
  </div>

  {loading ? (
   <div className="p-16 flex flex-col items-center justify-center gap-3 bg-vsp-surface border border-vsp-border rounded-2xl">
    <RotateRight className="w-8 h-8 text-vsp-accent animate-spin" variant="Outline" />
    <span className="text-xs text-vsp-textSecondary font-bold">جاري تحميل بيانات البطولة...</span>
   </div>
  ) : !activeTournament ? (
   <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-10 text-center space-y-4">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
     <Cup className="w-7 h-7" variant="Outline" />
    </div>
    <div>
     <h3 className="text-lg font-bold text-white">لا توجد بطولة نشطة حالياً في محافظة {getGovArabicName(selectedGovernorate)}</h3>
     <p className="text-xs text-vsp-textSecondary mt-1 max-w-md mx-auto">
      يمكنك بدء بطولة جديدة خاصة بمحافظة {getGovArabicName(selectedGovernorate)} الآن، أو التبديل لمحافظة أخرى من القائمة بالأعلى.
     </p>
    </div>
    <button
     onClick={() => handleOpenNewTournamentModal(selectedGovernorate)}
     className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-100 hover:bg-white text-black font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
    >
     <Add className="w-4 h-4" variant="Outline" />
     <span>بدء بطولة جديدة في {getGovArabicName(selectedGovernorate)}</span>
    </button>
   </div>
  ) : (
   <>
    {/* Active Tournament Status Card */}
    <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
     <div>
      <div className="flex items-center gap-3 flex-wrap">
       <h2 className="text-lg font-black text-white">{activeTournament.name}</h2>
       <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-vsp-card text-zinc-300 border border-vsp-border flex items-center gap-1">
        <Location className="w-3.5 h-3.5" variant="Outline" />
        {getGovArabicName(activeTournament.governorate)}
       </span>
       {activeTournament.status === 'published' ? (
        <Badge variant="accent" size="sm">
         منشورة على التطبيق مباشرة 
        </Badge>
       ) : activeTournament.status === 'draft' ? (
        <Badge variant="warning" size="sm">
         مسودة قيد الإدخال (Draft) 
        </Badge>
       ) : (
        <Badge variant="default" size="sm">
         مؤرشفة (Archived) 
        </Badge>
       )}
      </div>
      <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2">
       <span>
        عدد اللاعبين المستهدف:{' '}
        <strong className="text-white">{activeTournament.target_player_count || players.length}</strong>
       </span>
       <span>•</span>
       <span>
        تم الإنشاء:{' '}
        <strong className="text-white">
         {new Date(activeTournament.created_at).toLocaleDateString('ar-EG')}
        </strong>
       </span>
       {activeTournament.published_at && (
        <>
         <span>•</span>
         <span>
          نُشرت في:{' '}
          <strong className="text-zinc-300 font-black">
           {new Date(activeTournament.published_at).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
           })}
          </strong>
         </span>
        </>
       )}
      </div>
     </div>

     {/* Bulk Save & Publish Controls */}
 <div className="flex items-center gap-3">
 {activeTournament.status === 'registration_open' && (
 <button
 onClick={() => handleToggleStatus('in_progress')}
 disabled={processing}
 className="flex items-center gap-2 px-4 py-2.5 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-zinc-200 text-xs font-bold rounded-xl transition-all"
 >
 <span>إغلاق التسجيل وبدء الرصد </span>
 </button>
 )}
 {activeTournament.status === 'in_progress' && (
 <button
 onClick={() => handleToggleStatus('registration_open')}
 disabled={processing}
 className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-all"
 >
 <span>فتح التسجيل مجدداً </span>
 </button>
 )}
 <button
 onClick={handleSaveDraft}
 disabled={processing}
 className="flex items-center gap-2 px-4 py-2.5 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-white text-xs font-bold rounded-xl transition-all"
 >
 <Save2 className="w-4 h-4 text-zinc-400" variant="Outline" />
 <span>حفظ كمسودة</span>
 </button>

 <button
 onClick={handlePublishTournament}
 disabled={processing}
 className="flex items-center gap-2 px-6 py-2.5 bg-zinc-100 hover:bg-white text-black font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
 >
 {processing ? (
 <RotateRight className="w-4 h-4 animate-spin" variant="Outline" />
 ) : (
 <Send2 className="w-4 h-4" variant="Outline" />
 )}
 <span>حفظ ونشر الترتيب النهائي </span>
 </button>
 </div>
 </div>

 {/* Live Prize Pool Accumulator & Financial Stats */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-5 shadow-lg flex items-center justify-between">
 <div>
 <div className="flex items-center gap-2">
 <Coin className="w-4 h-4 text-vsp-accent" variant="Outline" />
 <span className="text-[11px] font-bold text-vsp-textSecondary uppercase tracking-wider block">وعاء الجائزة المتراكم</span>
 </div>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-black text-white">{activeTournament.prize_pool || 0}</span>
 <span className="text-xs font-bold text-zinc-300 font-black">ج.م</span>
 </div>
 <span className="text-[11px] text-vsp-textSecondary mt-1 block">
 مجموع رسوم {players.filter(p => p.payment_status === 'paid').length || 0} لاعب مسدد بنجاح
 </span>
 </div>
 <div className="w-11 h-11 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-300 font-black">
 <Cup className="w-5 h-5" variant="Outline" />
 </div>
 </div>

 <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-5 shadow-lg flex items-center justify-between">
 <div>
 <div className="flex items-center gap-2">
 <Card className="w-4 h-4 text-vsp-textSecondary" variant="Outline" />
 <span className="text-[11px] font-bold text-vsp-textSecondary uppercase tracking-wider block">رسوم اشتراك اللاعب</span>
 </div>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-black text-white">{activeTournament.entry_fee || 0}</span>
 <span className="text-xs font-bold text-vsp-textSecondary">ج.م</span>
 </div>
 <span className="text-[11px] text-vsp-textSecondary mt-1 block">
 دفع إلزامي مسبق عبر Paymob
 </span>
 </div>
 <div className="w-11 h-11 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-vsp-textSecondary">
 <Card className="w-5 h-5" variant="Outline" />
 </div>
 </div>

 <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-5 shadow-lg flex items-center justify-between">
 <div>
 <div className="flex items-center gap-2">
 <Profile2User className="w-4 h-4 text-vsp-textSecondary" variant="Outline" />
 <span className="text-[11px] font-bold text-vsp-textSecondary uppercase tracking-wider block">نسبة اكتمال المقاعد</span>
 </div>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-2xl font-black text-white">
 {players.filter(p => p.payment_status === 'paid').length} / {activeTournament.target_player_count || players.length}
 </span>
 </div>
 <span className="text-[11px] text-vsp-textSecondary mt-1 block">
 المقاعد المسددة فعلياً في المنظومة
 </span>
 </div>
 <div className="w-11 h-11 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-vsp-textSecondary">
 <Profile2User className="w-5 h-5" variant="Outline" />
 </div>
 </div>
 </div>

 {/* Prize Handover Section (Active when tournament is completed) */}
 {(activeTournament.status === 'completed' || activeTournament.status === 'published') && (
 <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-6 shadow-xl">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div className="flex items-start gap-4">
 <div className="w-12 h-12 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-vsp-accent flex-shrink-0">
 <Award className="w-6 h-6" variant="Outline" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-vsp-card text-vsp-accent border border-vsp-border">
 الجائزة المالية الرسمية
 </span>
 <span className="text-xs text-vsp-textSecondary">ممولة بالكامل من رسوم اشتراك اللاعبين</span>
 </div>
 <h3 className="text-lg font-black text-white mt-1.5 flex items-baseline gap-2">
 <span>الجائزة المستحقة:</span>
 <span className="text-white text-xl font-black">{activeTournament.prize_pool || 0} ج.م</span>
 <span className="text-xs font-bold text-vsp-textSecondary">
 للبطل: {activeTournament.champion_name || players[0]?.player_name || 'بطل البطولة'}
 </span>
 </h3>
 <p className="text-xs text-vsp-textSecondary mt-1">
 التسليم يتم يدوياً بالكامل (كاش أو تحويل مباشر) خارج التطبيق، ودور هذا الزر هو التوثيق المحاسبي ومنع تكرار المطالبة.
 </p>
 </div>
 </div>

 <div>
 {activeTournament.prize_delivered ? (
 <div className="bg-vsp-card border border-vsp-border rounded-xl p-3.5 flex flex-col items-end gap-1">
 <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs">
 <TickCircle className="w-4 h-4 text-vsp-accent" variant="Outline" />
 <span>تم تسليم الجائزة رسمياً</span>
 </div>
 <span className="text-[11px] text-vsp-textSecondary">
 بتاريخ: {new Date(activeTournament.prize_delivered_at).toLocaleDateString('ar-EG')} - {new Date(activeTournament.prize_delivered_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
 </span>
 {activeTournament.prize_delivery_notes && (
 <span className="text-[11px] text-zinc-400 italic bg-vsp-card px-2 py-0.5 rounded border border-vsp-border mt-1">
 ملاحظة: "{activeTournament.prize_delivery_notes}"
 </span>
 )}
 </div>
 ) : (
 <button
 onClick={() => setShowPrizeDeliveryModal(true)}
 className="flex items-center gap-2 px-5 py-2.5 bg-vsp-accent hover:bg-vsp-accentHover text-black font-bold text-xs rounded-xl shadow transition-all active:scale-95"
 >
 <Award className="w-4 h-4" variant="Outline" />
 <span>تسجيل تسليم الجائزة يدوياً</span>
 </button>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Scoring Formula Info Banner */}
 <div className="p-4 bg-vsp-card/50 border border-vsp-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
 <div className="flex items-center gap-3 text-zinc-300 font-bold">
 <MagicStar className="w-5 h-5 text-zinc-400 flex-shrink-0" variant="Outline" />
 <span>
 المجموع التراكمي = [دفاع × 1] + [أهداف × 1] + [مهارة × 1] • يتم ترتيب اللاعبين تلقائياً حسب إجمالي النقاط من الأعلى للأقل.
 </span>
 </div>
 <button
 onClick={handleAddPlayerRow}
 className="flex items-center gap-1.5 px-3 py-1.5 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-zinc-200 font-bold text-xs rounded-lg transition-all self-start sm:self-auto"
 >
 <Add className="w-3.5 h-3.5" variant="Outline" />
 <span>إضافة لاعب إضافي</span>
 </button>
 </div>

 {/* Live Bulk Scoring Table */}
 <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
 <div className="overflow-x-auto">
 <table className="w-full text-right text-xs">
 <thead className="bg-vsp-card/70 text-vsp-textSecondary border-b border-vsp-border">
 <tr>
 <th className="px-5 py-4 font-bold text-center w-14">#</th>
 <th className="px-5 py-4 font-bold min-w-[200px]">اسم اللاعب</th>
 <th className="px-5 py-4 font-bold text-center min-w-[110px]">
 <div className="flex items-center justify-center gap-1 text-cyan-400">
 <ShieldTick className="w-3.5 h-3.5" variant="Outline" />
 <span>دفاع (+1)</span>
 </div>
 </th>
 <th className="px-5 py-4 font-bold text-center min-w-[110px]">
 <div className="flex items-center justify-center gap-1 text-zinc-300 font-black">
 <DirectNormal className="w-3.5 h-3.5" variant="Outline" />
 <span>أهداف (+1)</span>
 </div>
 </th>
 <th className="px-5 py-4 font-bold text-center min-w-[110px]">
 <div className="flex items-center justify-center gap-1 text-purple-400">
 <Flash className="w-3.5 h-3.5" variant="Outline" />
 <span>مهارة (+1)</span>
 </div>
 </th>
 <th className="px-5 py-4 font-black text-center min-w-[120px] text-zinc-300 font-black">
 المجموع التراكمي
 </th>
 <th className="px-5 py-4 font-bold text-center w-24">إجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-vsp-border/40">
 {players.map((p, idx) => {
 const total = (Number(p.tackles) || 0) + (Number(p.goals) || 0) + (Number(p.skills ?? p.skill_points) || 0);
 const isTop = idx === 0 && total > 0;

 return (
 <tr key={p.id || idx} className="hover:bg-vsp-card/30 transition-colors">
 {/* Row Index */}
 <td className="px-5 py-3.5 text-center font-mono font-bold text-zinc-500">
 {idx + 1}
 </td>

 {/* Player Name */}
 <td className="px-5 py-3.5">
 <input
 type="text"
 value={p.player_name || p.name || ''}
 onChange={(e) => handlePlayerChange(idx, 'player_name', e.target.value)}
 placeholder={`اسم اللاعب #${idx + 1}`}
 className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2 text-white font-bold text-xs focus:border-vsp-accent focus:outline-none transition-all"
 />
 </td>

 {/* Tackles Input */}
 <td className="px-5 py-3.5 text-center">
 <input
 type="number"
 min="0"
 value={p.tackles || 0}
 onChange={(e) => handlePlayerChange(idx, 'tackles', e.target.value)}
 className="w-20 bg-vsp-card border border-cyan-500/30 rounded-xl px-2.5 py-2 text-center text-cyan-300 font-black text-xs focus:border-cyan-400 focus:outline-none"
 />
 </td>

 {/* Goals Input */}
 <td className="px-5 py-3.5 text-center">
 <input
 type="number"
 min="0"
 value={p.goals || 0}
 onChange={(e) => handlePlayerChange(idx, 'goals', e.target.value)}
 className="w-20 bg-vsp-card border border-vsp-border rounded-xl px-2.5 py-2 text-center text-white font-black text-xs focus:border-zinc-500 focus:outline-none"
 />
 </td>

 {/* Skills Input */}
 <td className="px-5 py-3.5 text-center">
 <input
 type="number"
 min="0"
 value={p.skills ?? p.skill_points ?? 0}
 onChange={(e) => handlePlayerChange(idx, 'skills', e.target.value)}
 className="w-20 bg-vsp-card border border-purple-500/30 rounded-xl px-2.5 py-2 text-center text-purple-300 font-black text-xs focus:border-purple-400 focus:outline-none"
 />
 </td>

 {/* Auto Total Points Display */}
 <td className="px-5 py-3.5 text-center">
 <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-vsp-card border border-vsp-border text-white rounded-xl font-black text-sm">
 {isTop && <span></span>}
 <span>{total}</span>
 <span className="text-[10px] text-zinc-400 font-normal">نقطة</span>
 </span>
 </td>

 {/* Delete Row Button */}
 <td className="px-5 py-3.5 text-center">
 <button
 onClick={() => handleDeletePlayerRow(idx)}
 title="حذف هذا اللاعب"
 className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
 >
 <Trash className="w-4 h-4" variant="Outline" />
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {/* Bottom Add Row Bar */}
 <div className="p-4 bg-vsp-card/40 border-t border-vsp-border flex items-center justify-between">
 <button
 onClick={handleAddPlayerRow}
 className="flex items-center gap-2 px-4 py-2 bg-vsp-surface hover:bg-vsp-border border border-vsp-border text-white text-xs font-bold rounded-xl transition-all"
 >
 <Add className="w-4 h-4 text-vsp-accent" variant="Outline" />
 <span>إضافة صف لاعب جديد</span>
 </button>

 <span className="text-xs text-zinc-400 font-bold">
 إجمالي اللاعبين المسجلين في الشيت: <span className="text-white">{players.length}</span>
 </span>
 </div>
 </div>
 </>
 )}
 </div>
 )}

 {/* ==================================================================== */}
 {/* TAB 2: HISTORY / ARCHIVE */}
 {/* ==================================================================== */}
 {activeTab === 'history' && (
 <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
  {/* History Governorate Filter */}
  <div className="p-4 bg-vsp-card/40 border-b border-vsp-border flex items-center justify-between gap-4">
   <div className="flex items-center gap-2">
    <Filter className="w-4 h-4 text-zinc-400" variant="Outline" />
    <span className="text-xs font-bold text-zinc-300">تصفية الأرشيف حسب المحافظة:</span>
   </div>
   <select
    value={historyGovFilter}
    onChange={(e) => setHistoryGovFilter(e.target.value)}
    className="bg-vsp-card border border-vsp-border rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:border-vsp-accent focus:outline-none"
   >
    <option value="all">جميع المحافظات ({historyList.length})</option>
    {EGYPT_GOVERNORATES.map((g) => {
     const count = historyList.filter((t) => t.governorate?.toLowerCase() === g.id.toLowerCase()).length;
     if (count === 0) return null;
     return (
      <option key={g.id} value={g.id} className="bg-zinc-900 text-white">
       {g.name} ({count})
      </option>
     );
    })}
   </select>
  </div>

  {historyList.length === 0 ? (
   <EmptyState
    icon={Timer1}
    title="لا توجد بطولات سابقة في الأرشيف"
    subtitle="عندما تقوم بنشر نسخ جديدة من البطولة، سيتم الاحتفاظ بالنسخ السابقة هنا كأرشيف دائم."
   />
  ) : (
   <div className="overflow-x-auto">
    <table className="w-full text-right text-xs">
     <thead className="bg-vsp-card/60 text-vsp-textSecondary border-b border-vsp-border">
      <tr>
       <th className="px-6 py-4 font-bold">اسم البطولة</th>
       <th className="px-6 py-4 font-bold">المحافظة</th>
       <th className="px-6 py-4 font-bold text-center">الحالة</th>
       <th className="px-6 py-4 font-bold text-center">العدد المستهدف</th>
       <th className="px-6 py-4 font-bold">تاريخ الإنشاء</th>
       <th className="px-6 py-4 font-bold">تاريخ النشر</th>
       <th className="px-6 py-4 font-bold text-center">الإجراءات</th>
      </tr>
     </thead>
     <tbody className="divide-y divide-vsp-border/50">
      {historyList
       .filter((item) => historyGovFilter === 'all' || item.governorate?.toLowerCase() === historyGovFilter.toLowerCase())
       .map((item) => (
       <tr key={item.id} className="hover:bg-vsp-card/30 transition-colors">
        <td className="px-6 py-4 font-bold text-white">{item.name}</td>
        <td className="px-6 py-4 font-bold text-zinc-300">
         <span className="px-2.5 py-1 bg-vsp-card border border-vsp-border rounded-lg text-xs flex items-center gap-1 w-fit">
          <Location className="w-3 h-3 text-zinc-400" variant="Outline" />
          {getGovArabicName(item.governorate)}
         </span>
        </td>
        <td className="px-6 py-4 text-center">
         {item.status === 'published' ? (
          <Badge variant="accent" size="xs">
           منشورة حالياً 
          </Badge>
         ) : item.status === 'draft' ? (
          <Badge variant="warning" size="xs">
           مسودة 
          </Badge>
         ) : (
          <Badge variant="default" size="xs">
           مؤرشفة 
          </Badge>
         )}
        </td>
        <td className="px-6 py-4 text-center font-bold text-zinc-300">
         {item.target_player_count} لاعبين
        </td>
        <td className="px-6 py-4 text-zinc-400 font-mono">
         {new Date(item.created_at).toLocaleDateString('ar-EG')}
        </td>
        <td className="px-6 py-4 text-zinc-400 font-mono">
         {item.published_at ? new Date(item.published_at).toLocaleDateString('ar-EG') : '-'}
        </td>
        <td className="px-6 py-4 text-center">
         <button
          onClick={() => handleViewArchive(item)}
          className="flex items-center gap-1 px-3 py-1.5 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-white rounded-lg text-xs font-bold transition-all mx-auto"
         >
          <Eye className="w-3.5 h-3.5 text-zinc-400" variant="Outline" />
          <span>عرض التفاصيل</span>
         </button>
        </td>
       </tr>
      ))}
     </tbody>
    </table>
   </div>
  )}
 </div>
 )}

 {activeTab === 'registrations' && (
 <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
 {registrations.length === 0 ? (
 <EmptyState
 icon={UserAdd}
 title="لا توجد طلبات انضمام معلقة حالياً"
 subtitle="عندما يسجل اللاعبون عبر تطبيق الموبايل ستظهر طلباتهم هنا للاعتماد."
 />
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-right text-xs">
 <thead className="bg-vsp-card/60 text-vsp-textSecondary border-b border-vsp-border">
 <tr>
 <th className="px-6 py-4 font-bold">اللاعب</th>
 <th className="px-6 py-4 font-bold">الهاتف</th>
 <th className="px-6 py-4 font-bold">تاريخ التقديم</th>
 <th className="px-6 py-4 font-bold text-center">الإجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-vsp-border/50">
 {registrations.map((reg) => {
 const playerName = reg.player_name || reg.name || reg.users?.name || 'متقدم جديد';
 const playerPhone = reg.phone || reg.users?.phone || '-';

 return (
 <tr key={reg.id} className="hover:bg-vsp-card/30 transition-colors">
 <td className="px-6 py-4 font-bold text-white">{playerName}</td>
 <td className="px-6 py-4 text-zinc-400 font-mono">{playerPhone}</td>
 <td className="px-6 py-4 text-zinc-400 font-mono">
 {new Date(reg.created_at).toLocaleDateString('ar-EG')}
 </td>
 <td className="px-6 py-4 text-center">
 <div className="flex items-center justify-center gap-2">
 <button
 onClick={async () => {
 try {
 setProcessing(true);
 await adminService.approve1v1Registration({
 registrationId: reg.id,
 name: playerName,
 });
 setAlert({ type: 'success', message: 'تم قبول طلب اللاعب بنجاح!' });
 loadData();
 } catch (e) {
 setAlert({ type: 'error', message: e.message });
 } finally {
 setProcessing(false);
 }
 }}
 disabled={processing}
 className="flex items-center gap-1 px-3 py-1.5 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-white rounded-lg font-bold text-xs transition-all"
 >
 <TickCircle className="w-3.5 h-3.5 text-vsp-accent" variant="Outline" />
 <span>قبول</span>
 </button>
 <button
 onClick={async () => {
 try {
 setProcessing(true);
 await adminService.reject1v1Registration(reg.id);
 setAlert({ type: 'success', message: 'تم رفض طلب اللاعب.' });
 loadData();
 } catch (e) {
 setAlert({ type: 'error', message: e.message });
 } finally {
 setProcessing(false);
 }
 }}
 disabled={processing}
 className="flex items-center gap-1 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-lg font-bold text-xs transition-all"
 >
 <CloseCircle className="w-3.5 h-3.5" variant="Outline" />
 <span>رفض</span>
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

 {/* ==================================================================== */}
 {/* MODAL: START NEW TOURNAMENT (تحديد عدد اللاعبين يدوياً) */}
 {/* ==================================================================== */}
 <Modal
 isOpen={showNewModal}
 onClose={() => setShowNewModal(false)}
 title="بدء بطولة 1vs1 جديدة "
 >
 <form onSubmit={handleConfirmStartTournament} className="space-y-4 text-right" dir="rtl">
 <div className="p-3.5 bg-vsp-card border border-vsp-border rounded-xl text-zinc-300 text-xs leading-relaxed">
 <strong>تنبيه:</strong> بدء بطولة جديدة سينشئ مسودة جديدة بشيت رصد فارغ بالعدد الذي تحدده بنفسك، ليتم تفريغ نقاط المباريات الورقية دفعة واحدة بعد انتهاء الساعتين.
 </div>

 <div>
 <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
  <Location className="w-3.5 h-3.5 text-zinc-400" variant="Outline" />
  <span>المحافظة المستهدفة للبطولة</span>
 </label>
 <select
  value={selectedGovInput}
  onChange={(e) => {
   const newGov = e.target.value;
   setSelectedGovInput(newGov);
   const today = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
   });
   setTournamentName(`بطولة 1vs1 فردية - ${getGovArabicName(newGov)} - ${today}`);
  }}
  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-4 py-2.5 text-white font-bold text-xs focus:border-vsp-accent focus:outline-none"
  required
 >
  {EGYPT_GOVERNORATES.map((g) => (
   <option key={g.id} value={g.id} className="bg-zinc-900 text-white">
    {g.name} ({g.id})
   </option>
  ))}
 </select>
 <span className="text-[11px] text-zinc-400 mt-1 block">
  ستكون هذه البطولة مخصصة وحصرية للاعبي هذه المحافظة على تطبيق الموبايل.
 </span>
 </div>

 <div>
 <label className="block text-xs font-bold text-zinc-300 mb-1.5">
 اسم / عنوان البطولة
 </label>
 <input
 type="text"
 value={tournamentName}
 onChange={(e) => setTournamentName(e.target.value)}
 placeholder="مثال: بطولة الجمعة 1vs1"
 className="w-full bg-vsp-card border border-vsp-border rounded-xl px-4 py-2.5 text-white font-bold text-xs focus:border-vsp-accent focus:outline-none"
 required
 />
 </div>

 <div>
 <label className="block text-xs font-bold text-zinc-300 mb-1.5">
 عدد اللاعبين المستهدف (الحد الأقصى للمشاركين)
 </label>
 <input
 type="number"
 min="2"
 max="128"
 value={playerCountInput}
 onChange={(e) => setPlayerCountInput(e.target.value)}
 placeholder="مثال: 32، 16، 8"
 className="w-full bg-vsp-card border border-vsp-border rounded-xl px-4 py-2.5 text-white font-black text-sm focus:border-vsp-accent focus:outline-none"
 required
 />
 <div className="flex items-center gap-2 mt-2">
   <span className="text-[11px] text-zinc-400">تحديد سريع:</span>
   {[
     { count: '32', label: '32 لاعب (رسمي)' },
     { count: '16', label: '16 لاعب' },
     { count: '8', label: '8 لاعبين' },
   ].map((preset) => (
     <button
       key={preset.count}
       type="button"
       onClick={() => setPlayerCountInput(preset.count)}
       className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
         playerCountInput === preset.count
           ? 'bg-zinc-100 border-zinc-200 text-black font-extrabold'
           : 'bg-vsp-card border-vsp-border text-zinc-400 hover:text-white'
       }`}
     >
       {preset.label}
     </button>
   ))}
 </div>
 <span className="text-[11px] text-zinc-400 mt-1 block">
 سيتم إغلاق التسجيل تلقائياً في التطبيق بمجرد اكتمال هذا العدد.
 </span>
 </div>

 <div>
 <label className="block text-xs font-bold text-zinc-300 mb-1.5">
 رسوم الاشتراك للاعب (جنيه مصري) 
 </label>
 <input
 type="number"
 min="0"
 step="5"
 value={entryFeeInput}
 onChange={(e) => setEntryFeeInput(e.target.value)}
 placeholder="مثال: 50، 100، 150"
 className="w-full bg-vsp-card border border-vsp-border rounded-xl px-4 py-2.5 text-white font-black text-sm focus:border-zinc-500 focus:outline-none"
 required
 />
 <span className="text-[11px] text-zinc-400 mt-1 block">
 الدفع إلزامي عبر Paymob للاشتراك، وستكون الجائزة النهائية تلقائياً = مجموع الرسوم المحصلة.
 </span>
 </div>

 <div>
 <label className="block text-xs font-bold text-zinc-300 mb-1.5">
 موعد وتوقيت انطلاق البطولة 
 </label>
 <input
 type="datetime-local"
 value={scheduledAtInput}
 onChange={(e) => setScheduledAtInput(e.target.value)}
 className="w-full bg-vsp-card border border-vsp-border rounded-xl px-4 py-2.5 text-white font-bold text-xs focus:border-vsp-accent focus:outline-none"
 required
 />
 <span className="text-[11px] text-zinc-400 mt-1 block">
 سيظهر عداد تنازلي وموعد البطولة للاعبين في تطبيق الموبايل.
 </span>
 </div>

 <div className="flex items-center justify-end gap-3 pt-4 border-t border-vsp-border">
 <button
 type="button"
 onClick={() => setShowNewModal(false)}
 className="px-4 py-2 bg-vsp-card hover:bg-vsp-surface border border-vsp-border text-white text-xs font-bold rounded-xl"
 >
 إلغاء
 </button>
 <button
 type="submit"
 disabled={processing}
 className="flex items-center gap-2 px-5 py-2 bg-zinc-100 hover:bg-white text-black font-extrabold text-xs rounded-xl shadow-md transition-all"
 >
 {processing && <RotateRight className="w-4 h-4 animate-spin" variant="Outline" />}
 <span>تأكيد وإنشاء البطولة </span>
 </button>
 </div>
 </form>
 </Modal>

 {/* ==================================================================== */}
 {/* MODAL: VIEW ARCHIVED TOURNAMENT STANDINGS */}
 {/* ==================================================================== */}
 <Modal
 isOpen={viewHistoryModal}
 onClose={() => setViewHistoryModal(false)}
 title={`ترتيب: ${selectedHistoryTournament?.name || ''}`}
 >
 <div className="space-y-4 text-right" dir="rtl">
 <div className="overflow-x-auto max-h-[60vh]">
 <table className="w-full text-right text-xs">
 <thead className="bg-vsp-card/70 text-vsp-textSecondary border-b border-vsp-border sticky top-0">
 <tr>
 <th className="px-4 py-3 font-bold text-center">المركز</th>
 <th className="px-4 py-3 font-bold">اللاعب</th>
 <th className="px-4 py-3 font-bold text-center">دفاع</th>
 <th className="px-4 py-3 font-bold text-center">أهداف</th>
 <th className="px-4 py-3 font-bold text-center">مهارة</th>
 <th className="px-4 py-3 font-bold text-center text-zinc-300 font-black">المجموع</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-vsp-border/50">
 {historyPlayers.map((p, idx) => (
 <tr key={p.id} className="hover:bg-vsp-card/30">
 <td className="px-4 py-3 text-center font-bold">
 {idx === 0 ? ' #1' : `#${idx + 1}`}
 </td>
 <td className="px-4 py-3 font-bold text-white">{p.player_name}</td>
 <td className="px-4 py-3 text-center text-cyan-400 font-bold">{p.tackles}</td>
 <td className="px-4 py-3 text-center text-zinc-300 font-bold">{p.goals}</td>
 <td className="px-4 py-3 text-center text-purple-400 font-bold">{p.skills}</td>
 <td className="px-4 py-3 text-center font-black text-zinc-300 font-black">{p.total_points}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="flex justify-end pt-3 border-t border-vsp-border">
 <button
 onClick={() => setViewHistoryModal(false)}
 className="px-4 py-2 bg-vsp-card hover:bg-vsp-surface border border-vsp-border text-white text-xs font-bold rounded-xl"
 >
 إغلاق
 </button>
 </div>
 </div>
 </Modal>
 </div>
 );
};
