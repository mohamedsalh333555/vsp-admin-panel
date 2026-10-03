import { supabase, supabaseAdmin } from '../lib/supabase';

export function classifyError(e) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { type: 'offline', message: 'لا يوجد اتصال بالإنترنت' };
  }
  const msg = e?.message || e?.error_description || String(e || '');
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network request failed')) {
    return { type: 'network', message: 'تعذر الوصول للخادم، تحقق من اتصالك' };
  }
  if (e?.code === '57014' || msg.toLowerCase().includes('timeout')) {
    return { type: 'timeout', message: 'استغرق الطلب وقتاً طويلاً، حاول مرة أخرى' };
  }
  return { type: 'server', message: msg || 'حدث خطأ غير متوقع' };
}



class AdminService {
  get client() {
    return supabaseAdmin || supabase;
  }

  // =========================================================================
  // MODULE A: DASHBOARD KPI & REALTIME METRICS
  // =========================================================================
  async fetchDashboardStats() {
    try {
      const [usersRes, stadiumsRes, bookingsRes, league1v1Res, pendingOwners, disputesRes, financialOverview] = await Promise.all([
        this.client.from('users').select('*', { count: 'exact', head: true }),
        this.client.from('stadiums').select('*', { count: 'exact', head: true }),
        this.client.from('bookings').select('id, total_price, status'),
        this.client.from('vsp_1vs1_players').select('*', { count: 'exact', head: true }),
        this.fetchPendingOwners(),
        this.client.from('bookings').select('*', { count: 'exact', head: true }).or('match_result_status.eq.disputed,status.eq.disputed'),
        this.fetchFinancialOverview(),
      ]);

      if (usersRes.error) console.warn('[AdminService] usersRes.error:', usersRes.error);
      if (stadiumsRes.error) console.warn('[AdminService] stadiumsRes.error:', stadiumsRes.error);
      if (bookingsRes.error) console.warn('[AdminService] bookingsRes.error:', bookingsRes.error);
      if (league1v1Res.error) console.warn('[AdminService] league1v1Res.error:', league1v1Res.error);
      if (disputesRes.error) console.warn('[AdminService] disputesRes.error:', disputesRes.error);

      let total1v1Players = league1v1Res?.count || 0;
      if (total1v1Players === 0) {
        try {
          const tPlayersRes = await this.client.from('vsp_1v1_tournament_players').select('*', { count: 'exact', head: true });
          if (!tPlayersRes.error) total1v1Players = tPlayersRes?.count || 0;
        } catch (_) {}
      }

      const pendingOwnersCount = Array.isArray(pendingOwners) ? pendingOwners.length : 0;
      const bookingRows = Array.isArray(bookingsRes?.data) ? bookingsRes.data : [];
      const validBookings = bookingRows.filter((b) => b.status === 'confirmed' || b.status === 'completed' || b.status === 'paid');
      const hasFinancialData = financialOverview?.kpis !== null && !financialOverview?.isUnavailable;
      const totalGrossVolume = hasFinancialData ? Number(financialOverview.kpis.totalGrossSystemVolume || 0) : null;
      const totalPlatformRevenue = hasFinancialData ? Number(financialOverview.kpis.totalPlatformRevenue || 0) : null;

      return {
        totalUsers: usersRes?.count ?? 0,
        totalStadiums: stadiumsRes?.count ?? 0,
        totalBookings: validBookings.length || bookingRows.length,
        totalGrossVolume,
        totalPlatformRevenue,
        financialUnavailable: !hasFinancialData,
        total1v1Players,
        pendingOwners: pendingOwnersCount,
        disputesCount: disputesRes?.count ?? 0,
        pendingPayouts: hasFinancialData ? Number(financialOverview.kpis.totalPendingOwnerDues || 0) : null,
        totalEscrowHeld: hasFinancialData ? Number(financialOverview.kpis.totalEscrowHeld || 0) : null,
      };
    } catch (e) {
      console.error('Error in fetchDashboardStats:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }
  async fetchRecentBookings(limit = 20) {
    const { data, error } = await this.client.from('bookings')
      .select('id,created_at,start_time,end_time,total_price,payment_method,payment_status,status,deposit_paid,is_deposit_paid,cancellation_reason,refund_amount,refund_transaction_id,refunded_at,refund_payment_method,stadium_id,user_id,created_by_user_id,player_team_name,stadiums(name,governorate),player:users!bookings_created_by_user_id_fkey(name,phone,email)')
      .order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map((b) => ({ ...b, users: b.player || b.users || null }));
  }
  async confirmCashBooking(bookingId, ownerId, totalPrice, collectedAmount = null) {
    try {
      const { data, error } = await this.client.rpc('confirm_cash_booking_atomic', {
        p_booking_id: bookingId,
        p_owner_id: ownerId,
        p_total_price: totalPrice,
        p_collected_amount: collectedAmount,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('Error in confirmCashBooking:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async updateBookingDetails(bookingId, updates) {
    try {
      // Whitelist only allowed administrative editable fields
      const ALLOWED_FIELDS = [
        'total_price', 'deposit_paid', 'start_time', 'end_time',
        'player_team_name', 'opponent_team_name', 'current_players',
        'is_private', 'rent_ball', 'player_phone', 'notes', 'home_score', 'away_score'
      ];
      const sanitizedUpdates = {};
      Object.keys(updates || {}).forEach((key) => {
        if (ALLOWED_FIELDS.includes(key)) {
          sanitizedUpdates[key] = updates[key];
        }
      });

      const { data, error } = await this.client.rpc('admin_update_booking_safe_atomic', {
        p_booking_id: bookingId,
        p_updates: sanitizedUpdates,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || data?.message || 'فشل تحديث بيانات الحجز');
      return { success: true, data };
    } catch (e) {
      console.error('Error in updateBookingDetails:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async cancelBookingWithReason(bookingId, reason) {
    try {
      const { data, error } = await this.client.rpc('admin_cancel_booking_atomic', {
        p_booking_id: bookingId,
        p_reason: reason || 'Cancelled by Admin',
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || data?.message || 'فشل إلغاء الحجز');
      return { success: true, data };
    } catch (e) {
      console.error('Error in cancelBookingWithReason:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }
  async cancelBookingAsAdmin(bookingId, reason = 'إلغاء إداري من لوحة التحكم') {
    try {
      // 🔒 SSOT: Routes administrative cancellations through canonical refund & cancellation engine
      const { data, error } = await this.client.rpc('admin_cancel_booking_atomic', {
        p_booking_id: bookingId,
        p_reason: reason || 'إلغاء إداري من لوحة التحكم',
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || data?.message || 'فشل إلغاء الحجز');
      return { success: true, cancelled: true, data };
    } catch (e) {
      console.error('Error in cancelBookingAsAdmin:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  // Backward compatibility alias for existing callers
  async deleteBookingPermanently(bookingId, reason) {
    return this.cancelBookingAsAdmin(bookingId, reason);
  }
  async fetchPendingOwners() {
    try {
      // 🔒 SSOT: Query canonical owner_documents table alongside all stadiums
      const [usersRes, unverifiedStadiumsRes, allStadiumsRes, ownerDocsRes] = await Promise.all([
        this.client
          .from('users')
          .select('*')
          .or('role.eq.owner,has_stadium.eq.true,verification_status.eq.pending')
          .not('role', 'in', '("admin","super_admin","co_founder","cofounder")')
          .order('created_at', { ascending: false }),
        this.client
          .from('stadiums')
          .select('owner_id')
          .eq('is_verified', false),
        this.client
          .from('stadiums')
          .select('*'),
        this.client
          .from('owner_documents')
          .select('*'),
      ]);

      if (usersRes.error) throw usersRes.error;

      const unverifiedOwnerIds = new Set((unverifiedStadiumsRes.data || []).map((s) => s.owner_id));
      const stadiumsByOwner = new Map();
      (allStadiumsRes.data || []).forEach((s) => {
        if (s.owner_id) {
          if (!stadiumsByOwner.has(s.owner_id)) stadiumsByOwner.set(s.owner_id, []);
          stadiumsByOwner.get(s.owner_id).push(s);
        }
      });

      const docsByOwner = new Map();
      (ownerDocsRes?.data || []).forEach((doc) => {
        if (doc.owner_id) {
          if (!docsByOwner.has(doc.owner_id)) docsByOwner.set(doc.owner_id, []);
          docsByOwner.get(doc.owner_id).push(doc);
        }
      });

      const filtered = (usersRes.data || []).filter((u) => {
        const isAdminRole = ['admin', 'super_admin', 'cofounder', 'co_founder'].includes(u.role?.toLowerCase());
        if (isAdminRole) return false;
        const isPending = u.verification_status === 'pending' || !u.verification_status;
        const hasUnverifiedStadium = unverifiedOwnerIds.has(u.id);
        const ownerDocs = docsByOwner.get(u.id) || [];
        const hasOwnerIntent =
          u.role === 'owner' ||
          u.has_stadium === true ||
          ownerDocs.length > 0 ||
          Boolean(u.additional_data?.verificationDocuments) ||
          Boolean(u.additional_data?.taxCardUrl);

        return (isPending && hasOwnerIntent) || hasUnverifiedStadium;
      });

      return filtered.map((u) => {
        const stadiums = stadiumsByOwner.get(u.id) || [];
        const primaryStadium = stadiums[0] || null;
        const canonicalDocs = docsByOwner.get(u.id) || [];
        const addData = u.additional_data || {};
        const legacyDocs = addData.verificationDocuments || addData.documents || {};
        
        const hasCanonicalDocs = canonicalDocs.length > 0;
        const hasLegacyDocs = Boolean(
          legacyDocs.commercialRegisterUrl || addData.commercial_register_url ||
          legacyDocs.taxCardUrl || addData.tax_card_url ||
          legacyDocs.nationalIdFrontUrl || addData.national_id_front_url ||
          legacyDocs.nationalIdBackUrl || addData.national_id_back_url ||
          legacyDocs.leaseContractUrl || addData.lease_contract_url
        );
        const hasDocs = hasCanonicalDocs || hasLegacyDocs;
        const hasStadium = stadiums.length > 0 || Boolean(u.has_stadium);
        const isReadyForReview = Boolean(hasStadium && hasDocs);

        return {
          ...u,
          linkedStadium: primaryStadium,
          stadiumsList: stadiums,
          stadiumsCount: stadiums.length,
          canonicalDocs,
          hasStadium,
          hasDocs,
          isReadyForReview,
          auditCategory: isReadyForReview ? 'ready' : 'incomplete',
        };
      });
    } catch (e) {
      console.error('Error in fetchPendingOwners:', e);
      throw e;
    }
  }

  async fetchStadiumForOwner(ownerId) {
    try {
      const { data, error } = await this.client.from('stadiums').select('*').eq('owner_id', ownerId).maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Error fetching stadium for owner:', e);
      throw e;
    }
  }
  async approveOwner({ ownerId, stadiumId }) {
    try {
      // 🔒 Strict Security: Atomic RPC only, no direct table fallback
      const { data, error } = await this.client.rpc('admin_approve_owner_atomic', {
        p_owner_id: ownerId,
      });

      if (error) {
        console.error('[AdminService] admin_approve_owner_atomic failed:', error);
        throw new Error(`فشل توثيق المالك: ${error.message}`);
      }

      if (data && data.success === false) {
        throw new Error(`فشل توثيق المالك: ${data.error || 'خطأ غير معروف'}`);
      }

      return { success: true, data };
    } catch (e) {
      console.error('Error in approveOwner:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async rejectOwner({ ownerId, reason }) {
    try {
      const { data, error } = await this.client.rpc('admin_reject_owner_atomic', {
        p_owner_id: ownerId,
        p_reason: reason || null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل رفض المالك');
      return { success: true, data };
    } catch (e) {
      console.error('Error in rejectOwner:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }
  async fetchOwnersWithSubscriptions({ searchQuery = '' } = {}) {
    try {
      let query = this.client
        .from('users')
        .select('*')
        .or('role.eq.owner,has_stadium.eq.true')
        .not('role', 'in', '("admin","super_admin","co_founder","cofounder")')
        .order('created_at', { ascending: false });

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
      }

      const [usersRes, stadiumsRes] = await Promise.all([
        query,
        this.client.from('stadiums').select('id, owner_id, name'),
      ]);

      if (usersRes.error) throw usersRes.error;
      const owners = usersRes.data || [];
      const stadiums = stadiumsRes.data || [];

      return owners.map((owner) => {
        const ownerStadiums = stadiums.filter((s) => s.owner_id === owner.id);
        return {
          ...owner,
          stadiumCount: ownerStadiums.length,
          stadiumNames: ownerStadiums.map((s) => s.name),
        };
      });
    } catch (e) {
      console.error('Error in fetchOwnersWithSubscriptions:', e);
      throw e;
    }
  }

  async activateVspPro({ ownerId, days = 30 }) {
    try {
      const { data, error } = await this.client.rpc('admin_set_owner_subscription_atomic', {
        p_owner_id: ownerId,
        p_plan: 'pro',
        p_days: Number(days),
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل تفعيل الاشتراك');
      return { success: true, expiresAt: data.subscription_expires_at, serverTime: data.server_time };
    } catch (e) {
      console.error('Error in activateVspPro:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async downgradeOwnerToBasic({ ownerId }) {
    try {
      // 🔒 SSOT: Sets canonical 'basic' plan rather than artificial 0-day free_trial
      const { data, error } = await this.client.rpc('admin_set_owner_subscription_atomic', {
        p_owner_id: ownerId,
        p_plan: 'basic',
        p_days: 365,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل خفض الاشتراك');
      return { success: true, serverTime: data.server_time };
    } catch (e) {
      console.error('Error in downgradeOwnerToBasic:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }
  async createOwnerAndStadiumManually({
    name,
    phone,
    email,
    stadiumName,
    governorate,
    pricePerHour,
  }) {
    try {
      if (!name?.trim() || !phone?.trim() || !stadiumName?.trim() ||
          !governorate?.trim() || !Number.isFinite(Number(pricePerHour)) ||
          Number(pricePerHour) <= 0) {
        return { success: false, error: 'بيانات مالك الملعب والملعب غير مكتملة أو غير صالحة.' };
      }

      const { data, error } = await this.client.rpc('admin_create_owner_with_stadium_atomic', {
        p_name: name.trim(),
        p_phone: phone.trim(),
        p_email: email?.trim() || null,
        p_stadium_name: stadiumName.trim(),
        p_governorate: governorate.trim(),
        p_price_per_hour: Number(pricePerHour),
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل إنشاء المالك والملعب');
      return { success: true, data };
    } catch (e) {
      console.error('Error in createOwnerAndStadiumManually:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }


  // =========================================================================
  // MODULE C: USERS & MODERATION
  // =========================================================================
  async fetchAllUsers({ searchQuery = '', roleFilter = 'all', statusFilter = 'all', limit = 200 }) {
    try {
      let query = this.client
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Number(limit) || 200);

      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
      }

      if (roleFilter !== 'all') {
        if (roleFilter === 'owner') {
          query = query.or('role.eq.owner,has_stadium.eq.true').not('role', 'in', '("admin","super_admin","co_founder","cofounder")');
        } else if (roleFilter === 'player') {
          query = query.eq('role', 'player').or('has_stadium.eq.false,has_stadium.is.null');
        } else {
          query = query.eq('role', roleFilter);
        }
      }

      if (statusFilter === 'blocked') {
        query = query.eq('is_blocked', true);
      } else if (statusFilter === 'active') {
        query = query.or('is_blocked.eq.false,is_blocked.is.null');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error in fetchAllUsers:', e);
      throw e;
    }
  }

  async toggleUserBlockStatus(userId, isBlocked) {
    try {
      if (isBlocked) {
        // 🔒 حماية سيادية: منع حظر حسابات المؤسسين الشركاء أو مسؤولي المنظومة برمجياً
        const { data: targetUser } = await this.client
          .from('users')
          .select('email, role')
          .eq('id', userId)
          .maybeSingle();

        const COFOUNDER_EMAILS = [
          'mohamedsalh333555@gmail.com',
          'admin@vsp.com',
          'coo@vsp.com',
          'hana.ramadan@vsp.com',
          'ceo@vsp.com',
        ];

        const email = (targetUser?.email || '').toLowerCase().trim();
        const role = (targetUser?.role || '').toLowerCase();
        if (COFOUNDER_EMAILS.includes(email) || ['cofounder', 'co_founder', 'super_admin'].includes(role)) {
          return { success: false, error: 'لا يمكن حظر هذا الحساب (حساب محمي للمؤسسين الشركاء أو إدارة المنظومة العليا)' };
        }
      }

      // 🔒 Strict Security: Atomic RPC only, no direct table fallback
      const { data, error } = await this.client.rpc('admin_toggle_user_block', {
        p_user_id: userId,
        p_is_blocked: isBlocked,
      });

      if (error) {
        console.error('[AdminService] admin_toggle_user_block failed:', error);
        throw new Error(`فشل تحديث حالة الحظر: ${error.message}`);
      }

      if (data && data.success === false) {
        throw new Error(`فشل تحديث حالة الحظر: ${data.error || 'خطأ غير معروف'}`);
      }

      return { success: true, data };
    } catch (e) {
      console.error('Error in toggleUserBlockStatus:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async resetNoShowCount(userId) {
    try {
      const { error } = await this.client
        .from('users')
        .update({
          no_show_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error in resetNoShowCount:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async deleteUserPermanently(userId) {
    try {
      // 🔒 Server Authority: delete_user_permanently enforces co-founder, active booking, and debt protection atomically
      const { data, error } = await this.client.rpc('delete_user_permanently', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[AdminService] delete_user_permanently failed:', error);
        throw new Error(`فشل حذف المستخدم: ${error.message}`);
      }

      if (data && data.success === false) {
        throw new Error(data.message || data.error || 'فشل حذف المستخدم من المنظومة');
      }

      return { success: true, data };
    } catch (e) {
      console.error('Error in deleteUserPermanently:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async approveAdminUser(userId) {
    try {
      const { data, error } = await this.client.rpc('admin_set_admin_role_atomic', {
        p_user_id: userId,
        p_role: 'admin',
      });
      if (error) throw new Error(`فشل ترقية المستخدم لأدمن: ${error.message}`);
      if (data && data.success === false) throw new Error(`فشل ترقية المستخدم لأدمن: ${data.error || 'خطأ غير معروف'}`);
      return { success: true, data };
    } catch (e) {
      console.error('Error in approveAdminUser:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  // =========================================================================
  // MODULE D: TOURNAMENT CONTROL ROOM
  // =========================================================================
  async fetchChampionships() {
    try {
      // Regular Tournament Control must not ingest Team League records.
      // Team League uses template_type='team_league' and has a separate lifecycle.
      const { data, error } = await this.client
        .from('championships')
        .select('*')
        .or('template_type.neq.team_league,template_type.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error in fetchChampionships:', e);
      throw e;
    }
  }

  async fetchTeamLeagues() {
    try {
      const { data, error } = await this.client
        .from('championships')
        .select('id,name,type,template_type,status,max_teams,entry_fee,owner_id,governorate,joined_teams,paid_teams,match_interval_days,champion_team_id,champion_team_name,created_at,updated_at')
        .eq('template_type', 'team_league')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error in fetchTeamLeagues:', e);
      throw e;
    }
  }

  async fetchTeamLeagueStandings(championshipId) {
    try {
      const { data, error } = await this.client.rpc('get_team_league_standings', {
        p_championship_id: championshipId,
      });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error in fetchTeamLeagueStandings:', e);
      throw e;
    }
  }

  async updateChampionshipStatus(id, status) {
    try {
      const { data, error } = await this.client.rpc('admin_update_championship_status_atomic', {
        p_championship_id: id,
        p_status: status,
      });

      if (error) throw error;
      if (data && data.success === false) {
        return { success: false, error: data.error || 'Failed to update championship status' };
      }
      return { success: true, data };
    } catch (e) {
      console.error('Error in updateChampionshipStatus:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async fetchTournamentMatches(championshipId) {
    try {
      const { data, error } = await this.client
        .from('tournament_matches')
        .select('*')
        .eq('championship_id', championshipId)
        .order('round_index', { ascending: true })
        .order('match_index', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error fetching tournament matches:', e);
      throw e;
    }
  }

  async prepareTournamentBracket(championshipId) {
    try {
      // Single canonical bracket-generation RPC. No alternate mutation path.
      const { data, error } = await this.client.rpc('generate_tournament_bracket_atomic', {
        p_championship_id: championshipId,
      });
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'فشل إطلاق القرعة وتوليد شجرة المباريات');
      }
      return { success: true, data };
    } catch (e) {
      console.error('Error in prepareTournamentBracket:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async markChampionshipPrizeDelivered(championshipId, notes = '') {
    try {
      const { data, error } = await this.client.rpc('mark_championship_prize_delivered_atomic', {
        p_championship_id: championshipId,
        p_notes: notes,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('Error in markChampionshipPrizeDelivered:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async approveChampionship(championshipId) {
    try {
      const { data, error } = await this.client.rpc('admin_approve_championship_atomic', {
        p_championship_id: championshipId,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('Error in approveChampionship:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async rejectChampionship(championshipId, reason = '') {
    try {
      const { data, error } = await this.client.rpc('admin_reject_championship_atomic', {
        p_championship_id: championshipId,
        p_reason: reason,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('Error in rejectChampionship:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  // =========================================================================
  // MODULE E: DISPUTES RESOLUTION & REPORTS
  // =========================================================================
  async fetchDisputedBookings() {
    try {
      const { data, error } = await this.client
        .from('bookings')
        .select('*')
        .or('match_result_status.eq.disputed,status.eq.disputed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error in fetchDisputedBookings:', e);
      throw e;
    }
  }

  async resolveDispute({
    bookingId,
    winnerOutcome = 'home_win', // 'home_win' | 'away_win' | 'draw' | 'cancelled'
    resolutionNotes = '',
    homeScore = null,
    awayScore = null,
  }) {
    try {
      const allowedOutcomes = ['home_win', 'away_win', 'draw', 'cancelled'];
      if (!allowedOutcomes.includes(winnerOutcome)) {
        return { success: false, error: 'النتيجة غير صالحة. المقبول: home_win, away_win, draw, cancelled' };
      }

      const p_home = (homeScore !== null && homeScore !== undefined && String(homeScore).trim() !== '') ? Number(homeScore) : null;
      const p_away = (awayScore !== null && awayScore !== undefined && String(awayScore).trim() !== '') ? Number(awayScore) : null;

      // 🔒 Single Atomic Server Transaction: Updates booking outcome, scores, notes, cleans pending, notifies teams, and audits
      const { data, error } = await this.client.rpc('admin_resolve_dispute_atomic', {
        p_booking_id: bookingId,
        p_final_outcome: winnerOutcome,
        p_home_score: p_home,
        p_away_score: p_away,
        p_notes: resolutionNotes || null,
      });

      if (error) {
        console.error('[AdminService] admin_resolve_dispute_atomic failed:', error);
        throw new Error(`فشل فض النزاع: ${error.message}`);
      }

      if (data && data.success === false) {
        throw new Error(`فشل فض النزاع: ${data.message || data.error || 'خطأ غير معروف'}`);
      }

      return { success: true, data };
    } catch (e) {
      console.error('Error in resolveDispute:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async fetchReports({ statusFilter = 'all' } = {}) {
    try {
      let query = this.client
        .from('reports')
        .select('*, users:reporter_id(name, phone, email)')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        // Fallback without relation
        let fallbackQuery = this.client
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false });
        if (statusFilter && statusFilter !== 'all') {
          fallbackQuery = fallbackQuery.eq('status', statusFilter);
        }
        const fallback = await fallbackQuery;
        if (fallback.error) throw fallback.error;
        return { success: true, data: fallback.data || [] };
      }
      return { success: true, data: data || [] };
    } catch (e) {
      console.error('Error in fetchReports:', e);
      return { success: false, data: [], error: e.message };
    }
  }

  async resolveReport({ reportId, status = 'resolved', notes = '' }) {
    try {
      const { data, error } = await this.client.rpc('admin_resolve_report_atomic', {
        p_report_id: reportId,
        p_status: status,
        p_notes: notes || null,
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'فشل تحديث حالة البلاغ');
      }
      return { success: true, data };
    } catch (e) {
      console.error('Error resolving report:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  // =========================================================================
  // MODULE F: VSP OFFICIAL 1v1 LEAGUE & REGISTRATION MANAGER
  // =========================================================================

  async fetch1v1PendingRegistrations() {
    try {
      const { data, error } = await this.client
        .from('vsp_1v1_registrations')
        .select('*, users(name, phone, profile_image_url, email)')
        .or('status.eq.pending,status.is.null')
        .order('created_at', { ascending: false });

      if (!error && data) return { success: true, data };

      const fallback = await this.client
        .from('vsp_1v1_registrations')
        .select('*')
        .or('status.eq.pending,status.is.null')
        .order('created_at', { ascending: false });

      return { success: true, data: fallback.data || [] };
    } catch (e) {
      console.error('Error in fetch1v1PendingRegistrations:', e);
      return { success: false, data: [], error: e.message };
    }
  }

  async fetch1v1ApprovedCount() {
    try {
      const { count, error } = await this.client
        .from('vsp_1v1_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved');

      if (error) throw error;
      return count || 0;
    } catch (e) {
      console.error('Error in fetch1v1ApprovedCount:', e);
      return 0;
    }
  }

  async fetch1v1RegistrationOpenStatus() {
    try {
      const { data } = await this.client
        .from('app_config')
        .select('vsp_1v1_is_open')
        .maybeSingle();

      if (data && data.vsp_1v1_is_open !== undefined) {
        return Boolean(data.vsp_1v1_is_open);
      }
      throw new Error('VSP 1v1 registration gate is unavailable in Supabase.');
    } catch (e) {
      console.error('Error fetching 1v1 gate status:', e);
      throw e;
    }
  }

  async set1v1RegistrationOpenStatus(isOpen) {
    try {
      const { data, error } = await this.client.rpc('admin_set_1v1_registration_open_atomic', {
        p_is_open: Boolean(isOpen),
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل تحديث بوابة التسجيل');
      return { success: true };
    } catch (e) {
      console.error('Error setting 1v1 gate status:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async approve1v1Registration({ registrationId, name, avatarUrl = '' }) {
    try {
      const { data, error } = await this.client.rpc('admin_approve_1v1_registration_atomic', {
        p_registration_id: registrationId,
        p_name: name || '',
        p_avatar_url: avatarUrl || '',
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'فشل اعتماد التسجيل');
      }
      return { success: true, data };
    } catch (e) {
      console.error('Error approving 1v1 registration:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async reject1v1Registration(registrationId) {
    try {
      const { data, error } = await this.client.rpc('admin_reject_1v1_registration_atomic', {
        p_registration_id: registrationId,
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'فشل رفض التسجيل');
      }
      return { success: true, data };
    } catch (e) {
      console.error('Error rejecting 1v1 registration:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async reset1v1Round() {
    try {
      const { data, error } = await this.client.rpc('admin_reset_1v1_round_atomic');
      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'فشل أرشفة جولة التسجيل');
      }
      return { success: true, data };
    } catch (e) {
      console.error('Error resetting 1v1 round:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async fetch1v1FailedRefunds() {
    try {
      const { data, error } = await this.client
        .from('vsp_1v1_tournament_orders')
        .select('id, user_id, amount, order_reference, paymob_transaction_id, created_at, updated_at')
        .eq('payment_status', 'refund_failed_manual_review')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (e) {
      console.error('Error fetching 1v1 failed refunds:', e);
      return { success: false, data: [], error: e.message };
    }
  }

  // MODULE F.2: VSP 1v1 TOURNAMENT SYSTEM (NEW TABLES & ATOMIC RPC)
  // =========================================================================

  async create1v1Tournament({ name, target_player_count, entry_fee, scheduled_at = null, governorate }) {
    try {
      if (!name?.trim() || !governorate?.trim() ||
          !Number.isFinite(Number(target_player_count)) ||
          !Number.isFinite(Number(entry_fee))) {
        return { success: false, error: 'بيانات البطولة غير مكتملة أو غير صالحة.' };
      }

      const { data, error } = await this.client.rpc('admin_create_1v1_tournament_atomic', {
        p_name: name.trim(),
        p_target_player_count: Number(target_player_count),
        p_entry_fee: Number(entry_fee),
        p_scheduled_at: scheduled_at || null,
        p_governorate: governorate.trim(),
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل إنشاء البطولة');
      return { success: true, data };
    } catch (e) {
      console.error('Error creating 1v1 tournament:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }


  async mark1v1PrizeDelivered(tournamentId, notes = '') {
    try {
      const { data, error } = await this.client.rpc('mark_1v1_prize_delivered_atomic', {
        p_tournament_id: tournamentId,
        p_notes: notes?.trim() || null,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل توثيق تسليم الجائزة');
      return { success: true, data };
    } catch (e) {
      console.error('Error marking 1v1 prize delivered:', e);
      return { success: false, error: e.message || 'فشل توثيق تسليم الجائزة' };
    }
  }

  async save1v1TournamentPlayers(tournamentId, playersList) {
    try {
      if (!tournamentId || !Array.isArray(playersList)) {
        return { success: false, error: 'بيانات لاعبي البطولة غير صالحة.' };
      }

      const { data, error } = await this.client.rpc('admin_save_1v1_tournament_players_atomic', {
        p_tournament_id: tournamentId,
        p_players: playersList.map((p) => ({
          player_name: String(p.player_name || p.name || '').trim(),
          user_id: p.user_id || null,
          avatar_url: p.avatar_url || null,
          tackles: Math.max(0, Number(p.tackles) || 0),
          goals: Math.max(0, Number(p.goals) || 0),
          skills: Math.max(0, Number(p.skills ?? p.skill_points) || 0),
          rounds_played: Math.max(0, Number(p.rounds_played) || 0),
          round_reached: p.round_reached ? String(p.round_reached).trim() : null,
        })),
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل حفظ لاعبي البطولة');
      return { success: true, data };
    } catch (e) {
      console.error('Error saving 1v1 tournament players:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async saveAndPublish1v1Tournament({ tournamentId, playersList, fallbackStatus }) {
    try {
      if (!tournamentId) {
        return { success: false, error: 'معرف البطولة مطلوب للنشر.' };
      }
      const formattedPlayers = Array.isArray(playersList)
        ? playersList.map((p) => ({
            id: p.id || null,
            player_name: String(p.player_name || p.name || '').trim(),
            user_id: p.user_id || null,
            avatar_url: p.avatar_url || null,
            tackles: Math.max(0, Number(p.tackles) || 0),
            goals: Math.max(0, Number(p.goals) || 0),
            skills: Math.max(0, Number(p.skills ?? p.skill_points) || 0),
            round_reached: p.round_reached ? String(p.round_reached).trim() : null,
          }))
        : [];

      const { data, error } = await this.client.rpc('save_and_publish_1v1_tournament_atomic', {
        p_tournament_id: tournamentId,
        p_players: formattedPlayers,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل حفظ ونشر بطولة 1v1');

      return { success: true, data };
    } catch (e) {
      console.error('Error in saveAndPublish1v1Tournament:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }


  async finalize1v1Tournament(tournamentId, championUserId) {
    try {
      const { data, error } = await this.client.rpc('admin_finalize_1v1_tournament_atomic', {
        p_tournament_id: tournamentId,
        p_champion_user_id: championUserId,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل اعتماد بطل البطولة');
      return { success: true, data };
    } catch (e) {
      console.error('Error finalizing 1v1 tournament:', e);
      return { success: false, error: e.message || 'فشل اعتماد بطل البطولة' };
    }
  }

  async update1v1TournamentStatus(tournamentId, status) {
    try {
      const { data, error } = await this.client.rpc(
        'admin_update_1v1_tournament_status_atomic',
        {
          p_tournament_id: tournamentId,
          p_status: String(status || '').trim(),
        },
      );
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل تحديث حالة بطولة 1v1');
      return { success: true, data };
    } catch (e) {
      console.error('Error in update1v1TournamentStatus:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }


  async cancel1v1TournamentWithRefunds(tournamentId, reason = '') {
    try {
      const { data, error } = await this.client.rpc('cancel_1v1_tournament_with_refund_requests', {
        p_tournament_id: tournamentId,
        p_reason: reason || 'إلغاء البطولة بقرار الإدارة',
      });
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('Error in cancel1v1TournamentWithRefunds:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async getActiveOrLatest1v1Tournament(governorate = null) {
    try {
      // 1. Find currently active tournament (registration_open, in_progress, completed, published)
      let query = this.client
        .from('vsp_1v1_tournaments')
        .select('*')
        .in('status', ['registration_open', 'in_progress', 'completed', 'published', 'draft']);

      if (governorate) {
        query = query.eq('governorate', governorate);
      }

      const { data: activeList, error: tErr } = await query
        .order('created_at', { ascending: false })
        .limit(1);

      if (tErr) throw tErr;

      let tournament = activeList && activeList.length > 0 ? activeList[0] : null;

      if (!tournament) {
        // إذا لم تكن هناك بطولة نشطة، لا نسحب بطولة مؤرشفة لتجنب تعديل الأرشيف التاريخي
        return { success: true, tournament: null, players: [] };
      }

      // 2. Fetch players for this tournament sorted by total_points DESC
      const { data: players, error: pErr } = await this.client
        .from('vsp_1v1_tournament_players')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('total_points', { ascending: false });

      if (pErr) throw pErr;

      const mappedPlayers = (players || []).map((p, idx) => ({
        id: p.id,
        player_name: p.player_name,
        name: p.player_name,
        user_id: p.user_id,
        avatar_url: p.avatar_url || '',
        payment_status: p.payment_status ?? null,
        tackles: p.tackles || 0,
        goals: p.goals || 0,
        skills: p.skills || 0,
        skill_points: p.skills || 0,
        total_points: (p.tackles || 0) + (p.goals || 0) + (p.skills || 0),
        round_reached: p.round_reached || '',
        rank: idx + 1,
      }));

      return { success: true, tournament, players: mappedPlayers };
    } catch (e) {
      console.error('Error in getActiveOrLatest1v1Tournament:', e);
      const err = classifyError(e);
      return { success: false, tournament: null, players: [], error: err.message, errorType: err.type };
    }
  }

  async listActive1v1Tournaments() {
    try {
      const { data, error } = await this.client
        .from('vsp_1v1_tournaments')
        .select('*')
        .in('status', ['registration_open', 'in_progress'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, tournaments: data || [] };
    } catch (e) {
      console.error('Error listing active 1v1 tournaments:', e);
      return { success: false, tournaments: [], error: e.message };
    }
  }

  async list1v1Tournaments() {
    try {
      const { data, error } = await this.client
        .from('vsp_1v1_tournaments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, tournaments: data || [] };
    } catch (e) {
      console.error('Error listing 1v1 tournaments:', e);
      return { success: false, tournaments: [], error: e.message };
    }
  }

  // =========================================================================
  // MODULE G: ENTERPRISE FINANCIAL CLEARING & PAYOUT LEDGER (SSOT ALIGNED)
  // =========================================================================
  async fetchFinancialOverview() {
    try {
      // 1. Fetch from authoritative PostgreSQL Reconciliation View, along with auxiliary metadata
      const [reconRes, ownersRes, stadiumsRes, upcomingRes, txRes, payoutsRes] = await Promise.all([
        this.client.from('v_financial_reconciliation').select('*'),
        this.client.from('users').select('id, name, phone, email, governorate, p2p_vodafone, p2p_instapay, p2p_bank').eq('role', 'owner'),
        this.client.from('stadiums').select('id, name, owner_id'),
        this.client.from('bookings').select('id, stadium_id, owner_id, total_price, deposit_paid, start_time, stadium_name, status')
          .eq('status', 'confirmed')
          .order('start_time', { ascending: true }),
        this.client.from('transactions').select('*').order('created_at', { ascending: false }),
        this.client.from('payout_settlements').select('*, users(name, phone, email, governorate)').order('created_at', { ascending: false }),
      ]);

      if (reconRes.error) console.warn('[AdminService] recon view notice:', reconRes.error?.message);
      if (ownersRes.error) console.warn('[AdminService] owners notice:', ownersRes.error?.message);
      if (stadiumsRes.error) console.warn('[AdminService] stadiums notice:', stadiumsRes.error?.message);
      if (upcomingRes.error) console.warn('[AdminService] upcoming notice:', upcomingRes.error?.message);
      if (txRes.error) console.warn('[AdminService] transactions notice:', txRes.error?.message);
      if (payoutsRes.error) console.warn('[AdminService] payouts notice:', payoutsRes.error?.message);

      const reconList = reconRes.data || [];
      const owners = ownersRes.data || [];
      const stadiums = stadiumsRes.data || [];
      const confirmedBookings = upcomingRes.data || [];
      const transactions = txRes.data || [];
      const settlements = payoutsRes.data || [];

      // Create indexed lookups
      const reconMap = new Map(reconList.map((r) => [r.owner_id, r]));
      const ownerStadiumsMap = new Map();
      stadiums.forEach((s) => {
        if (!ownerStadiumsMap.has(s.owner_id)) ownerStadiumsMap.set(s.owner_id, []);
        ownerStadiumsMap.get(s.owner_id).push(s);
      });

      // 2. Aggregate clearing matrix per owner based on PostgreSQL SSOT
      const ownerMatrix = owners.map((owner) => {
        const recon = reconMap.get(owner.id) || {};
        const ownerStadiums = ownerStadiumsMap.get(owner.id) || [];
        const stadiumNames = ownerStadiums.map((s) => s.name).join(', ') || 'ملعب رئيسي';

        // Escrow upcoming bookings for this owner
        const upcomingBookings = confirmedBookings
          .filter((b) => b.owner_id === owner.id || ownerStadiums.some((s) => s.id === b.stadium_id))
          .map((b) => ({
            id: b.id,
            amount: Number(b.deposit_paid > 0 && b.deposit_paid < b.total_price ? b.deposit_paid : b.total_price || 0),
            startTime: b.start_time,
            stadiumName: b.stadium_name || 'ملعب',
          }));

        // Authoritative values from PostgreSQL View
        const completedOnlineRevenue = Number(recon.completed_online_revenue || 0);
        const platformCommission = Number(recon.total_platform_commission || 0);
        const gatewayFees = Number(recon.total_gateway_fees || 0);
        const totalPaidOut = Number(recon.total_withdrawn || 0);
        const pendingPayouts = Number(recon.pending_payouts || 0);
        const cashDebt = Number(recon.accumulated_cash_debt || 0);
        const cashRevenue = Number(recon.total_pitch_cash_revenue || 0);
        const completedBookingsCount = Number(recon.completed_bookings_count || recon.active_bookings_count || 0);

        // Escrow held from upcoming confirmed bookings
        const escrowHeld = Number(recon.escrow_online_revenue || 0);

        // Net Earnings & Authoritative Available Balance (Zero-Trust SSOT)
        const netOnlineEarnings = completedOnlineRevenue;
        const netBalance = Number(recon.available_balance || 0);

        // Payout Method & Destination
        let payoutMethod = null;
        let payoutDestination = null;
        if (owner.p2p_vodafone && owner.p2p_vodafone.trim()) {
          payoutMethod = 'vodafone_cash';
          payoutDestination = owner.p2p_vodafone.trim();
        } else if (owner.p2p_instapay && owner.p2p_instapay.trim()) {
          payoutMethod = 'instapay';
          payoutDestination = owner.p2p_instapay.trim();
        } else if (owner.p2p_bank && owner.p2p_bank.trim()) {
          payoutMethod = 'bank_transfer';
          payoutDestination = owner.p2p_bank.trim();
        }

        return {
          ownerId: owner.id,
          name: owner.name || 'صاحب ملعب',
          phone: owner.phone || 'غير مسجل',
          email: owner.email,
          governorate: owner.governorate || 'غير محدد',
          stadiumCount: ownerStadiums.length,
          stadiumNames,
          completedBookingsCount,
          totalBookingsCount: completedBookingsCount + upcomingBookings.length,
          grossVolume: completedOnlineRevenue + cashRevenue + escrowHeld,
          onlineVolume: completedOnlineRevenue + escrowHeld,
          completedOnlineCollected: completedOnlineRevenue,
          escrowHeld,
          upcomingBookings,
          platformCommission,
          accumulatedCashDebt: cashDebt,
          totalPaidOut,
          netBalance,
          isDueToOwner: netBalance > 0,
          payoutMethod,
          payoutDestination,
          p2p_vodafone: owner.p2p_vodafone,
          p2p_instapay: owner.p2p_instapay,
          p2p_bank: owner.p2p_bank,
        };
      });

      // 3. Overall System Financial KPIs (Authoritative Separation of Metrics)
      const totalGrossSystemVolume = ownerMatrix.reduce((sum, o) => sum + o.grossVolume, 0);
      const totalOnlineCollected = ownerMatrix.reduce((sum, o) => sum + o.onlineVolume, 0);
      const totalPlatformRevenue = ownerMatrix.reduce((sum, o) => sum + o.platformCommission, 0);
      const totalPendingOwnerDues = ownerMatrix
        .filter((o) => o.netBalance > 0)
        .reduce((sum, o) => sum + o.netBalance, 0);
      const totalEscrowHeld = ownerMatrix.reduce((sum, o) => sum + (o.escrowHeld || 0), 0);
      const totalSettledPayouts = ownerMatrix.reduce((sum, o) => sum + o.totalPaidOut, 0);

      return {
        ownerMatrix,
        transactions,
        settlements,
        isUnavailable: false,
        kpis: {
          totalGrossSystemVolume,
          totalOnlineCollected,
          totalPlatformRevenue,
          totalPendingOwnerDues,
          totalEscrowHeld,
          totalSettledPayouts,
        },
      };
    } catch (e) {
      console.error('[AdminService] Error in fetchFinancialOverview from SSOT view:', e);
      const err = classifyError(e);
      // 🔒 Zero-Trust: Never fallback to 0 EGP on financial query failure
      return {
        ownerMatrix: [],
        transactions: [],
        settlements: [],
        kpis: null,
        isUnavailable: true,
        error: err.message || 'تعذر مطابقة البيانات المالية من السيرفر',
        errorType: err.type,
      };
    }
  }

  async fetchFinancialTransactions({ limit = 150 } = {}) {
    const { data, error } = await this.client
      .from('transactions')
      .select('*, users(name, phone, role)')
      .order('created_at', { ascending: false })
      .limit(Number(limit) || 150);

    if (error) throw error;
    return data || [];
  }

    // =========================================================================
  // FAILED REFUNDS WORKFLOW (Stage 10)
  // =========================================================================
  async fetchFailedRefunds() {
    try {
      const [bookingsRes, queueRes] = await Promise.all([
        this.client
          .from('bookings')
          .select('id, user_id, stadium_name, total_price, deposit_paid, payment_status, payment_method, cancellation_reason, created_at, updated_at')
          .in('payment_status', ['refund_failed', 'refund_pending'])
          .order('updated_at', { ascending: false }),
        this.client
          .from('cancellation_refund_queue')
          .select('*')
          .in('status', ['failed', 'manual_review'])
          .order('created_at', { ascending: false }),
      ]);

      const failedBookings = bookingsRes.data || [];
      const failedQueue = queueRes.data || [];

      return {
        success: true,
        failedBookings,
        failedQueue,
        totalFailedCount: failedBookings.length + failedQueue.length,
      };
    } catch (e) {
      console.error('Error in fetchFailedRefunds:', e);
      const err = classifyError(e);
      return { success: false, failedBookings: [], failedQueue: [], totalFailedCount: 0, error: err.message };
    }
  }

  async resolveFailedRefund({ bookingId, queueId, referenceNumber, notes }) {
    try {
      const now = new Date().toISOString();
      if (bookingId) {
        const { error } = await this.client
          .from('bookings')
          .update({
            payment_status: 'refunded',
            refund_transaction_id: referenceNumber || null,
            refund_notes: notes || 'تمت التسوية والاسترداد يدوياً من الإدارة',
            refunded_at: now,
            updated_at: now,
          })
          .eq('id', bookingId);
        if (error) throw error;
      }
      if (queueId) {
        const { error } = await this.client
          .from('cancellation_refund_queue')
          .update({
            status: 'processed',
            failure_reason: `Manual admin resolution: ${notes || ''} (Ref: ${referenceNumber || 'N/A'})`,
            processed_at: now,
            updated_at: now,
          })
          .eq('id', queueId);
        if (error) throw error;
      }
      return { success: true };
    } catch (e) {
      console.error('Error in resolveFailedRefund:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async recordSmartOwnerSettlement({ ownerId, amount, method = 'vodafone_cash', referenceNumber }) {
    try {
      const settleAmount = Number(amount);
      if (!Number.isFinite(settleAmount) || settleAmount <= 0) {
        return { success: false, error: 'المبلغ المحدد غير صالح للتسوية المالية' };
      }
      const { data, error } = await this.client.rpc('admin_record_payout_settlement_atomic', {
        p_owner_id: ownerId,
        p_amount: settleAmount,
        p_payment_method: method,
        p_reference: referenceNumber || null,
      });
      if (error) throw new Error('فشلت تسوية أرباح المالك في قاعدة البيانات: ' + error.message);
      if (!data?.success) throw new Error('فشلت تسوية أرباح المالك: ' + (data?.error || 'تعذر تنفيذ التسوية'));
      return { success: true, referenceNumber: data.reference_number || null, settlementId: data.settlement_id || null };
    } catch (e) {
      console.error('Error in recordSmartOwnerSettlement:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async fetchPayoutSettlements() {
    const { data, error } = await this.client
      .from('payout_settlements')
      .select('*, users(name, phone, email, governorate)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async recordPayoutSettlement({ ownerId, amount, transactionId, method = 'vodafone_cash' }) {
    try {
      const { data, error } = await this.client.rpc('admin_record_payout_settlement_atomic', {
        p_owner_id: ownerId,
        p_amount: Number(amount),
        p_payment_method: method,
        p_reference: transactionId || null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشلت تسوية أرباح المالك');
      return { success: true, data };
    } catch (e) {
      console.error('Error in recordPayoutSettlement:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  // =========================================================================
  // MODULE H: CRM BROADCAST CENTER & SYSTEM CONFIG
  // =========================================================================
  async fetchSystemConfig() {
    try {
      const { data, error } = await this.client
        .from('app_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return { success: false, error: 'بيانات إعدادات النظام غير متاحة في Supabase' };
      }

      return {
        success: true,
        maintenance_mode: Boolean(data.is_maintenance),
        vsp_1v1_is_open: Boolean(data.vsp_1v1_is_open),
        min_version: data.min_version ?? null,
      };
    } catch (e) {
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async setMaintenanceMode(enabled) {
    try {
      const { data, error } = await this.client.rpc('admin_set_maintenance_mode_atomic', { p_enabled: Boolean(enabled) });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل تحديث وضع الصيانة');
      return { success: true };
    } catch (e) {
      console.error('Error in setMaintenanceMode:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async sendTargetedBroadcastNotification({
    title,
    body,
    targetAudience = 'all', // 'all' | 'players' | 'owners'
    notificationType = 'announcement',
  }) {
    try {
      if (!title?.trim() || !body?.trim()) {
        return { success: false, error: 'عنوان ونص الإشعار مطلوبان' };
      }

      const { data, error } = await this.client.rpc('admin_send_broadcast_notification_atomic', {
        p_title: title.trim(),
        p_body: body.trim(),
        p_target_audience: targetAudience,
        p_type: notificationType,
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'فشل إرسال الإشعار الجماعي');
      }

      return { success: true, count: data?.sent_count || 0, data };
    } catch (e) {
      console.error('Error sending broadcast notification:', e);
      const err = classifyError(e);
      return { success: false, count: 0, error: err.message, errorType: err.type };
    }
  }
  async fetchSystemAuditLogs({ actionFilter = 'all', tableFilter = 'all', limit = 100 } = {}) {
    try {
      let query = this.client
        .from('system_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Number(limit) || 100);

      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (tableFilter && tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (e) {
      console.error('Error fetching system audit logs:', e);
      return { success: false, data: [], error: e.message };
    }
  }
}

export const adminService = new AdminService();

