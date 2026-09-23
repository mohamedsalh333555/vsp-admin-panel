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

      if (usersRes.error) throw usersRes.error;
      if (stadiumsRes.error) throw stadiumsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (league1v1Res.error) throw league1v1Res.error;
      if (disputesRes.error) throw disputesRes.error;
      if (financialOverview?.error) throw new Error(financialOverview.error);

      let total1v1Players = league1v1Res?.count || 0;
      if (total1v1Players === 0) {
        const tPlayersRes = await this.client.from('vsp_1v1_tournament_players').select('*', { count: 'exact', head: true });
        if (tPlayersRes.error) throw tPlayersRes.error;
        total1v1Players = tPlayersRes?.count || 0;
      }

      const pendingOwnersCount = Array.isArray(pendingOwners) ? pendingOwners.length : 0;
      const bookingRows = bookingsRes.data || [];
      const validBookings = bookingRows.filter((b) => b.status === 'confirmed' || b.status === 'completed' || b.status === 'paid');
      const totalRevenue = validBookings.reduce((sum, item) => sum + Number(item.total_price || 0), 0);

      return {
        totalUsers: usersRes.count ?? 0,
        totalStadiums: stadiumsRes.count ?? 0,
        totalBookings: validBookings.length || bookingRows.length,
        totalRevenue,
        total1v1Players,
        pendingOwners: pendingOwnersCount,
        disputesCount: disputesRes.count ?? 0,
        pendingPayouts: financialOverview.kpis.totalPendingOwnerDues,
        totalEscrowHeld: financialOverview.kpis.totalEscrowHeld,
      };
    } catch (e) {
      console.error('Error in fetchDashboardStats:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }
  async fetchRecentBookings(limit = 20) {
    try {
      const { data, error } = await this.client
        .from('bookings')
        .select(`
          id,
          created_at,
          start_time,
          end_time,
          total_price,
          payment_method,
          payment_status,
          status,
          deposit_paid,
          is_deposit_paid,
          cancellation_reason,
          refund_amount,
          refund_transaction_id,
          refunded_at,
          refund_payment_method,
          stadium_id,
          user_id,
          created_by_user_id,
          player_team_name,
          stadiums(name, governorate),
          player:users!bookings_created_by_user_id_fkey(name, phone, email)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Booking join warning, falling back to batch lookup:', error.message);
        const fallback = await this.client
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        const rawBookings = fallback.data || [];
        if (rawBookings.length === 0) return [];

        // Manually hydrate user profiles & stadium details so player name is NEVER missing
        const userIds = [...new Set(rawBookings.map((b) => b.created_by_user_id || b.user_id).filter(Boolean))];
        const stadiumIds = [...new Set(rawBookings.map((b) => b.stadium_id).filter(Boolean))];

        const [usersMapRes, stadiumsMapRes] = await Promise.all([
          userIds.length > 0 ? this.client.from('users').select('id, name, phone, email').in('id', userIds) : { data: [] },
          stadiumIds.length > 0 ? this.client.from('stadiums').select('id, name, governorate').in('id', stadiumIds) : { data: [] },
        ]);

        const userMap = new Map((usersMapRes.data || []).map((u) => [u.id, u]));
        const stadiumMap = new Map((stadiumsMapRes.data || []).map((s) => [s.id, s]));

        return rawBookings.map((b) => ({
          ...b,
          users: userMap.get(b.created_by_user_id || b.user_id) || null,
          player: userMap.get(b.created_by_user_id || b.user_id) || null,
          stadiums: stadiumMap.get(b.stadium_id) || b.stadiums || null,
        }));
      }

      return (data || []).map((b) => ({
        ...b,
        users: b.player || b.users || null,
      }));
    } catch (e) {
      console.error('Error fetching recent bookings:', e);
      return [];
    }
  }

  
  // تأكيد تحصيل الحجز كاش بصورة ذرية وتأمين وسيلة الدفع cash
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
      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { error } = await this.client
        .from('bookings')
        .update(payload)
        .eq('id', bookingId);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error in updateBookingDetails:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async cancelBookingWithReason(bookingId, reason) {
    try {
      const { error } = await this.client
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: reason || 'Cancelled by Admin',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error in cancelBookingWithReason:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async deleteBookingPermanently(bookingId) {
    try {
      const { error } = await this.client
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) {
        // إذا تعذر الحذف الجسدي بسبب ارتباطات المفاتيح الأجنبية، نؤرشف الحجز كملغي حفاظاً على سلامة البيانات
        console.warn('Direct delete blocked by foreign key, falling back to archive:', error.message);
        const { error: cancelErr } = await this.client
          .from('bookings')
          .update({
            status: 'cancelled',
            cancellation_reason: 'تم حذف الحجز وأرشفته من قِبل إدارة المنظومة',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId);

        if (cancelErr) throw cancelErr;
        return { success: true, archived: true };
      }
      return { success: true };
    } catch (e) {
      console.error('Error in deleteBookingPermanently:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  // =========================================================================
  // MODULE B: OWNER AUDITS & ONBOARDING
  // =========================================================================
  async fetchPendingOwners() {
    try {
      const [usersRes, unverifiedStadiumsRes, allStadiumsRes] = await Promise.all([
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
      ]);

      if (usersRes.error) throw usersRes.error;

      const unverifiedOwnerIds = new Set((unverifiedStadiumsRes.data || []).map((s) => s.owner_id));
      const stadiumsByOwner = new Map();
      (allStadiumsRes.data || []).forEach((s) => {
        if (s.owner_id && !stadiumsByOwner.has(s.owner_id)) {
          stadiumsByOwner.set(s.owner_id, s);
        }
      });

      const filtered = (usersRes.data || []).filter((u) => {
        const isAdminRole = ['admin', 'super_admin', 'cofounder', 'co_founder'].includes(u.role?.toLowerCase());
        if (isAdminRole) return false;
        const isPending = u.verification_status === 'pending' || !u.verification_status;
        const hasUnverifiedStadium = unverifiedOwnerIds.has(u.id);
        const hasOwnerIntent =
          u.role === 'owner' ||
          u.has_stadium === true ||
          Boolean(u.additional_data?.verificationDocuments) ||
          Boolean(u.additional_data?.taxCardUrl);

        return (isPending && hasOwnerIntent) || hasUnverifiedStadium;
      });

      return filtered.map((u) => {
        const stadium = stadiumsByOwner.get(u.id) || null;
        const addData = u.additional_data || {};
        const docs = addData.verificationDocuments || addData.documents || {};
        const hasDocs = Boolean(
          docs.commercialRegisterUrl || addData.commercial_register_url ||
          docs.taxCardUrl || addData.tax_card_url ||
          docs.nationalIdFrontUrl || addData.national_id_front_url ||
          docs.nationalIdBackUrl || addData.national_id_back_url ||
          docs.leaseContractUrl || addData.lease_contract_url
        );
        const hasStadium = Boolean(stadium || u.has_stadium);
        const hasNationalId = Boolean(
          docs.nationalIdFrontUrl || addData.national_id_front_url ||
          docs.nationalIdBackUrl || addData.national_id_back_url
        );
        const hasCommercialOrContract = Boolean(
          docs.commercialRegisterUrl || addData.commercial_register_url ||
          docs.taxCardUrl || addData.tax_card_url ||
          docs.leaseContractUrl || addData.lease_contract_url
        );
        // لا يعتبر المالك مكتملاً وجاهزاً للاعتماد إلا بوجود ملعب + وثيقة إثبات هوية رسمية أو سجل تجاري لمنع اعتماد ملاك وهميين
        const isReadyForReview = Boolean(hasStadium && (hasNationalId || hasCommercialOrContract || hasDocs));

        return {
          ...u,
          linkedStadium: stadium,
          hasStadium,
          hasDocs,
          hasNationalId,
          hasCommercialOrContract,
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
      const { data, error } = await this.client
        .from('stadiums')
        .select('*')
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (e) {
      return null;
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
      const { error } = await this.client
        .from('users')
        .update({
          verification_status: 'rejected',
          last_warning: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ownerId);

      if (error) throw error;
      return { success: true };
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
      return [];
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
      const { data, error } = await this.client.rpc('admin_set_owner_subscription_atomic', {
        p_owner_id: ownerId,
        p_plan: 'free_trial',
        p_days: 0,
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
    governorate = 'القاهرة',
    pricePerHour = 350,
  }) {
    try {
      // 1. Insert user
      const { data: userRes, error: userErr } = await this.client
        .from('users')
        .insert({
          name,
          phone,
          email,
          role: 'owner',
          verification_status: 'approved',
          is_identity_verified: true,
          governorate,
          is_blocked: false,
        })
        .select()
        .single();

      if (userErr) throw userErr;

      // 2. Insert stadium
      const { error: stadiumErr } = await this.client
        .from('stadiums')
        .insert({
          owner_id: userRes.id,
          name: stadiumName,
          governorate,
          price_per_hour: Number(pricePerHour),
          is_verified: true,
          is_blocked: false,
        });

      if (stadiumErr) throw stadiumErr;
      return { success: true, user: userRes };
    } catch (e) {
      console.error('Error in createOwnerAndStadiumManually:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  // =========================================================================
  // MODULE C: USERS & MODERATION
  // =========================================================================
  async fetchAllUsers({ searchQuery = '', roleFilter = 'all', statusFilter = 'all' }) {
    try {
      let query = this.client.from('users').select('*').order('created_at', { ascending: false });

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
      return [];
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
      // Logic Guard: Never delete co-founder accounts
      const { data: targetUser } = await this.client.from('users').select('email, role').eq('id', userId).maybeSingle();
      const COFOUNDER_EMAILS = ['mohamedsalh333555@gmail.com', 'admin@vsp.com', 'hana.ramadan@vsp.com', 'ceo@vsp.com'];
      if (targetUser && (COFOUNDER_EMAILS.includes((targetUser.email || '').toLowerCase()) || ['co_founder', 'cofounder'].includes(targetUser.role))) {
        return { success: false, error: 'لا يمكن حذف حساب مؤسس شريك محمي نهائياً' };
      }

      // 🔒 Strict Security: Atomic RPC only, no direct delete fallback
      const { data, error } = await this.client.rpc('delete_user_permanently', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[AdminService] delete_user_permanently failed:', error);
        throw new Error(`فشل حذف المستخدم: ${error.message}`);
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
      const { error } = await this.client
        .from('users')
        .update({
          role: 'admin',
          is_blocked: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
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
      const { data, error } = await this.client
        .from('championships')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error in fetchChampionships:', e);
      return [];
    }
  }

  async updateChampionshipStatus(id, status) {
    try {
      const { error } = await this.client
        .from('championships')
        .update({
          status,
          is_approved: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
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
      return [];
    }
  }

  async prepareTournamentBracket(championshipId) {
    try {
      // First try the new centralized atomic bracket generator
      const { data, error } = await this.client.rpc('generate_tournament_bracket_atomic', {
        p_championship_id: championshipId,
      });
      if (error) {
        // Fallback to prepare_tournament_bracket_atomic
        const fallback = await this.client.rpc('prepare_tournament_bracket_atomic', {
          p_championship_id: championshipId,
        });
        if (fallback.error) throw fallback.error;
        return { success: true, data: fallback.data };
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
      return [];
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
      // 🔒 Strict Security: Atomic RPC only, no direct table fallback
      const { data, error } = await this.client.rpc('admin_resolve_dispute_atomic', {
        p_booking_id: bookingId,
        p_final_outcome: winnerOutcome,
      });

      if (error) {
        console.error('[AdminService] admin_resolve_dispute_atomic failed:', error);
        throw new Error(`فشل فض النزاع: ${error.message}`);
      }

      if (data && data.success === false) {
        throw new Error(`فشل فض النزاع: ${data.message || data.error || 'خطأ غير معروف'}`);
      }

      // توثيق وحفظ ملاحظات الحكم والأهداف وقرار الاسترداد في سجل الحجز
      try {
        const bookingUpdates = {
          updated_at: new Date().toISOString(),
        };
        if (resolutionNotes) {
          bookingUpdates.dispute_notes = resolutionNotes;
        }
        if (homeScore !== null && homeScore !== undefined && String(homeScore).trim() !== '') {
          bookingUpdates.home_team_score = Number(homeScore);
          bookingUpdates.host_score = Number(homeScore);
        }
        if (awayScore !== null && awayScore !== undefined && String(awayScore).trim() !== '') {
          bookingUpdates.away_team_score = Number(awayScore);
          bookingUpdates.away_score = Number(awayScore);
        }
        if (winnerOutcome === 'cancelled') {
          bookingUpdates.status = 'cancelled';
          bookingUpdates.cancellation_reason = resolutionNotes ? `ملغي بقرار فض النزاع: ${resolutionNotes}` : 'ملغي بقرار إدارة المنظومة وفض النزاع (استرداد العربون)';
          bookingUpdates.cancelled_at = new Date().toISOString();
        }
        await this.client.from('bookings').update(bookingUpdates).eq('id', bookingId);
      } catch (noteErr) {
        console.warn('Booking dispute details update note:', noteErr);
      }

      return { success: true, data };
    } catch (e) {
      console.error('Error in resolveDispute:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async fetchReports() {
    try {
      const { data, error } = await this.client
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error in fetchReports:', e);
      return [];
    }
  }

  // =========================================================================
  // MODULE F: VSP OFFICIAL 1v1 LEAGUE MANAGER
  // =========================================================================
  async fetch1v1LeaguePlayers() {
    try {
      const { data, error } = await this.client
        .from('vsp_1vs1_players')
        .select('*')
        .order('total_points', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error in fetch1v1LeaguePlayers:', e);
      return [];
    }
  }

  async fetch1v1PendingRegistrations() {
    try {
      // Try with user relation
      const { data, error } = await this.client
        .from('vsp_1v1_registrations')
        .select('*, users(name, phone, profile_image_url, email)')
        .or('status.eq.pending,status.is.null')
        .order('created_at', { ascending: false });

      if (!error && data) return data;

      // Fallback without relation
      const fallback = await this.client
        .from('vsp_1v1_registrations')
        .select('*')
        .or('status.eq.pending,status.is.null')
        .order('created_at', { ascending: false });

      return fallback.data || [];
    } catch (e) {
      console.error('Error in fetch1v1PendingRegistrations:', e);
      return [];
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
      return true;
    } catch (_) {
      return true;
    }
  }

  async set1v1RegistrationOpenStatus(isOpen) {
    try {
      const { error } = await this.client
        .from('app_config')
        .upsert({ id: 1, vsp_1v1_is_open: isOpen, updated_at: new Date().toISOString() });

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error setting 1v1 gate status:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async startNew1v1SeasonWipeRegistrations() {
    try {
      const { error } = await this.client
        .from('vsp_1v1_registrations')
        .delete()
        .not('id', 'is', null);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error wiping 1v1 registrations:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async approve1v1Registration({ registrationId, name, avatarUrl = '' }) {
    try {
      // 1. Mark registration approved
      const { error: regErr } = await this.client
        .from('vsp_1v1_registrations')
        .update({ status: 'approved' })
        .eq('id', registrationId);

      if (regErr) throw regErr;

      // 2. Add to 1v1 players roster
      const { error: playerErr } = await this.client.from('vsp_1vs1_players').insert({
        name: name || '1v1 Player',
        avatar_url: avatarUrl || '',
        total_points: 0,
        skill_points: 0,
        goals: 0,
        tackles: 0,
        titles: 0,
        trend: 'stable',
      });

      if (playerErr) throw playerErr;
      return { success: true };
    } catch (e) {
      console.error('Error approving 1v1 registration:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async reject1v1Registration(registrationId) {
    try {
      const { error } = await this.client
        .from('vsp_1v1_registrations')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', registrationId);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error rejecting 1v1 registration:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async reset1v1Round() {
    try {
      const { error } = await this.client
        .from('vsp_1v1_registrations')
        .update({ status: 'archived', updated_at: new Date().toISOString() });

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error resetting 1v1 round:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async add1v1Player({ name, avatarUrl = '', initialPoints = 0 }) {
    try {
      const { data, error } = await this.client
        .from('vsp_1vs1_players')
        .insert({
          name,
          avatar_url: avatarUrl,
          total_points: Number(initialPoints),
          skill_points: 0,
          goals: 0,
          tackles: 0,
          titles: 0,
          trend: 'stable',
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('Error adding 1v1 player:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async publish1v1Standings(playersList) {
    try {
      // 1. Clear current standings
      await this.client.from('vsp_1vs1_players').delete().not('id', 'is', null);

      // 2. Sort players by total points desc
      const sorted = [...playersList].sort((a, b) => {
        const ptA = (Number(a.tackles) || 0) + (Number(a.goals) || 0) + (Number(a.skill_points) || 0);
        const ptB = (Number(b.tackles) || 0) + (Number(b.goals) || 0) + (Number(b.skill_points) || 0);
        return ptB - ptA;
      });

      // 3. Format rows
      const formatted = sorted.map((p, idx) => {
        const tackles = Math.max(0, parseInt(p.tackles) || 0);
        const goals = Math.max(0, parseInt(p.goals) || 0);
        const skills = Math.max(0, parseInt(p.skill_points) || 0);
        const total = tackles + goals + skills;
        return {
          name: p.name?.trim() || `لاعب #${idx + 1}`,
          avatar_url: p.avatar_url || '',
          tackles: tackles,
          goals: goals,
          skill_points: skills,
          total_points: total,
          titles: Number(p.titles) || (p.round_reached === 'champion' ? 1 : 0),
          trend: p.round_reached === 'champion' ? 'up' : 'stable',
          round_reached: p.round_reached ? p.round_reached.trim() : null,
        };
      });

      if (formatted.length > 0) {
        const { error } = await this.client.from('vsp_1vs1_players').insert(formatted);
        if (error) throw error;
      }

      return { success: true };
    } catch (e) {
      console.error('Error in publish1v1Standings:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async wipe1v1TournamentData() {
    try {
      await this.client.from('vsp_1vs1_players').delete().not('id', 'is', null);
      await this.client.from('vsp_1v1_registrations').delete().not('id', 'is', null);
      return { success: true };
    } catch (e) {
      console.error('Error in wipe1v1TournamentData:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async update1v1PlayerStats(playerId, stats) {
    try {
      const { error } = await this.client
        .from('vsp_1vs1_players')
        .update({
          total_points: Number(stats.total_points || 0),
          skill_points: Number(stats.skill_points || 0),
          goals: Number(stats.goals || 0),
          tackles: Number(stats.tackles || 0),
          titles: Number(stats.titles || 0),
          trend: stats.trend || 'stable',
          updated_at: new Date().toISOString(),
        })
        .eq('id', playerId);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error updating 1v1 player stats:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }


  // =========================================================================
  // MODULE F.2: VSP 1v1 TOURNAMENT SYSTEM (NEW TABLES & ATOMIC RPC)
  // =========================================================================

  async create1v1Tournament({ name, target_player_count, entry_fee = 0, scheduled_at = null, created_by = null, governorate = 'Cairo' }) {
    try {
      const { data, error } = await this.client
        .from('vsp_1v1_tournaments')
        .insert({
          name: name?.trim() || 'بطولة 1vs1 جديدة',
          target_player_count: parseInt(target_player_count) || 8,
          entry_fee: parseFloat(entry_fee) || 0,
          prize_pool: 0,
          governorate: governorate || 'Cairo',
          status: 'registration_open',
          scheduled_at: scheduled_at || new Date(Date.now() + 86400000 * 3).toISOString(),
          created_by: created_by || null,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('Error creating 1v1 tournament:', e);
      const err = classifyError(e);
      if (e?.code === '23505' || e?.message?.includes('idx_one_active_1v1_tournament_per_governorate') || e?.message?.includes('unique constraint')) {
        return { 
          success: false, 
          error: 'يوجد بطولة نشطة حالياً في هذه المحافظة (' + governorate + '). يجب إنهاء أو أرشفة البطولة الحالية أولاً قبل بدء بطولة جديدة لنفس المحافظة.', 
          errorType: 'conflict' 
        };
      }
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
      if (!tournamentId) throw new Error('Missing tournament ID');

      // Delete existing player records for this tournament to re-insert cleanly
      const { error: delErr } = await this.client
        .from('vsp_1v1_tournament_players')
        .delete()
        .eq('tournament_id', tournamentId);
      if (delErr) throw delErr;

      const formatted = playersList.map((p, idx) => ({
        tournament_id: tournamentId,
        player_name: (p.player_name || p.name || `لاعب #${idx + 1}`).trim(),
        user_id: p.user_id || null,
        avatar_url: p.avatar_url || null,
        tackles: Math.max(0, parseInt(p.tackles) || 0),
        goals: Math.max(0, parseInt(p.goals) || 0),
        skills: Math.max(0, parseInt(p.skills ?? p.skill_points) || 0),
        round_reached: p.round_reached ? p.round_reached.trim() : null,
        // NOTE: total_points is GENERATED ALWAYS AS by PostgreSQL, DO NOT SEND!
      }));

      if (formatted.length > 0) {
        const { error: insErr } = await this.client
          .from('vsp_1v1_tournament_players')
          .insert(formatted);
        if (insErr) throw insErr;
      }

      return { success: true };
    } catch (e) {
      console.error('Error saving 1v1 tournament players:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async update1v1TournamentStatus(tournamentId, status) {
    try {
      const { error } = await this.client
        .from('vsp_1v1_tournaments')
        .update({ status })
        .eq('id', tournamentId);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error updating 1v1 status:', e);
      return { success: false, error: e.message };
    }
  }

  async saveAndPublish1v1Tournament({ tournamentId, playersList, fallbackStatus = 'registration_open' }) {
    try {
      if (!tournamentId) throw new Error('Missing tournament ID');

      // 1. Try single atomic RPC if implemented on Supabase
      try {
        const { data: atomicData, error: atomicErr } = await this.client.rpc('save_and_publish_1v1_tournament_atomic', {
          p_tournament_id: tournamentId,
          p_players: playersList,
        });
        if (atomicErr) {
          if (atomicErr.message?.includes('MISSING_CHAMPION') || atomicErr.message?.includes('MULTIPLE_CHAMPIONS')) {
            return { success: false, error: atomicErr.message };
          }
          console.warn('RPC atomic failed, falling back:', atomicErr);
        } else if (atomicData?.success) {
          return { success: true, data: atomicData };
        }
      } catch (rpcErr) {
        if (rpcErr.message?.includes('MISSING_CHAMPION') || rpcErr.message?.includes('MULTIPLE_CHAMPIONS')) {
          return { success: false, error: rpcErr.message };
        }
        // Fall back to 2-step transaction below
      }

      // 2. Fallback: 2-step transaction with manual rollback
      // Step A: Save players
      const saveRes = await this.save1v1TournamentPlayers(tournamentId, playersList);
      if (!saveRes.success) {
        throw new Error(saveRes.error || 'فشل حفظ بيانات درجات اللاعبين');
      }

      // Step B: Publish tournament
      const pubRes = await this.publish1v1Tournament(tournamentId);
      if (!pubRes.success) {
        // Rollback status to previous status
        console.warn('Publish failed, executing status rollback to:', fallbackStatus);
        await this.update1v1TournamentStatus(tournamentId, fallbackStatus);
        throw new Error(pubRes.error || 'فشل نشر الترتيب النهائي، وتم التراجع عن حالة البطولة');
      }

      return { success: true, data: pubRes.data };
    } catch (e) {
      console.error('Error in saveAndPublish1v1Tournament:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  async publish1v1Tournament(tournamentId) {
    try {
      if (!tournamentId) throw new Error('Missing tournament ID');

      // Call new final standings RPC
      const { data, error } = await this.client.rpc('publish_1v1_final_standings_atomic', {
        p_tournament_id: tournamentId,
      });
      if (error) {
        // Fallback to publish_1v1_tournament_atomic
        const fb = await this.client.rpc('publish_1v1_tournament_atomic', {
          p_tournament_id: tournamentId,
        });
        if (fb.error) throw fb.error;
        return { success: true, data: fb.data };
      }

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'فشل نشر البطولة');
      }

      return { success: true, data };
    } catch (e) {
      console.error('Error publishing 1v1 tournament:', e);
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

      if (reconRes.error) throw reconRes.error;
      if (ownersRes.error) throw ownersRes.error;
      if (stadiumsRes.error) throw stadiumsRes.error;
      if (upcomingRes.error) throw upcomingRes.error;
      if (txRes.error) throw txRes.error;
      if (payoutsRes.error) throw payoutsRes.error;

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
        const completedOnlineRevenue = Number(recon.total_online_revenue || 0);
        const platformCommission = Number(recon.total_platform_commission || 0);
        const gatewayFees = Number(recon.total_gateway_fees || 0);
        const totalPaidOut = Number(recon.total_withdrawn || 0);
        const pendingPayouts = Number(recon.pending_payouts || 0);
        const cashDebt = Number(recon.accumulated_cash_debt || 0);
        const cashRevenue = Number(recon.total_pitch_cash_revenue || 0);
        const completedBookingsCount = Number(recon.completed_bookings_count || recon.active_bookings_count || 0);

        // Escrow held from upcoming confirmed bookings
        const escrowHeld = upcomingBookings.reduce((sum, b) => sum + b.amount, 0);

        // Net Earnings & Authoritative Available Balance (Zero-Trust SSOT)
        const netOnlineEarnings = Math.max(0, completedOnlineRevenue - gatewayFees - platformCommission);
        const netBalance = Math.max(0, Math.round((netOnlineEarnings - totalPaidOut - pendingPayouts - cashDebt) * 100) / 100);

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

      // 3. Overall System Financial KPIs
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
      return {
        error: err.message,
        errorType: err.type,
      };
    }
  }

  async fetchFinancialTransactions() {
    const { data, error } = await this.client
      .from('transactions')
      .select('*, users(name, phone, role)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async recordSmartOwnerSettlement({
    ownerId,
    amount,
    method = 'vodafone_cash',
    destination,
    referenceNumber,
    notes = '',
  }) {
    try {
      const settleAmount = Number(amount);
      if (isNaN(settleAmount) || settleAmount <= 0) {
        return { success: false, error: 'المبلغ المحدد غير صالح للتسوية المالية' };
      }

      const ref = referenceNumber || null;

      // 1. 🔒 التنفيذ الذري الصارم عبر RPC - إيقاف أي إجراء واعتبار المعاملة فاشلة فوراً إذا لم تنجح في الداتابيز
      const { data: rpcData, error: rpcError } = await this.client.rpc('admin_record_payout_settlement_atomic', {
        p_owner_id: ownerId,
        p_amount: settleAmount,
        p_payment_method: method,
        p_reference: ref,
      });

      if (rpcError) {
        console.error('[AdminService] Settlement RPC failure:', rpcError);
        throw new Error(`فشلت تسوية أرباح المالك في قاعدة البيانات: ${rpcError.message}`);
      }

      if (rpcData && rpcData.success === false) {
        throw new Error(`فشلت تسوية أرباح المالك: ${rpcData.error || 'الرصيد المستحق في دفتر الأستاذ غير كافٍ'}`);
      }

      const serverReference = rpcData?.reference_number || ref;

      // 2. توثيق سجل التحويل فقط بعد نجاح المعاملة المحاسبية الفعلية في قاعدة البيانات
      const { error: settlementInsertError } = await this.client.from('payout_settlements').insert({
        owner_id: ownerId,
        amount: settleAmount,
        method,
        destination: destination || 'المحفظة المسجلة',
        status: 'paid',
        admin_notes: notes ? `${notes} (Ref: ${serverReference})` : `Ref: ${serverReference}`,
      });
      if (settlementInsertError) throw settlementInsertError;

      // 3. إشعار المالك بالتحويل الناجح
      try {
        await this.client.from('notifications').insert({
          user_id: ownerId,
          title: 'تم تحويل مستحقاتك المالية بنجاح',
          message: `تم إرسال مبلغ ${settleAmount.toLocaleString()} ج.م إلى حسابك عبر ${method} برقم مرجع: ${serverReference}`,
          type: 'financial',
          is_read: false,
          created_at: new Date().toISOString(),
        });
      } catch (notifErr) {
        console.warn('Payout notification dispatch notice:', notifErr);
      }

      return { success: true, referenceNumber: serverReference };
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

  async recordPayoutSettlement({ settlementId, ownerId, amount, transactionId, method = 'vodafone_cash' }) {
    try {
      const refNumber = transactionId || null;

      // 🔒 Strict Security: Atomic RPC only, no direct transaction insertion fallback
      const { data, error: rpcErr } = await this.client.rpc('admin_record_payout_settlement_atomic', {
        p_owner_id: ownerId,
        p_amount: Number(amount),
        p_payment_method: method,
        p_reference: refNumber,
      });

      if (rpcErr) {
        console.error('[AdminService] admin_record_payout_settlement_atomic failed:', rpcErr);
        throw new Error(`فشلت تسوية أرباح المالك: ${rpcErr.message}`);
      }

      if (data && data.success === false) {
        throw new Error(`فشلت تسوية أرباح المالك: ${data.error || 'خطأ غير معروف'}`);
      }

      const serverReference = data?.reference_number || refNumber;

      // Update payout_settlements record
      if (settlementId) {
        const { error: updateErr } = await this.client
          .from('payout_settlements')
          .update({
            status: 'paid',
            admin_notes: `Ref: ${serverReference}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settlementId);

        if (updateErr) throw updateErr;
      }

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
      const { error } = await this.client
        .from('app_config')
        .upsert({
          id: 1,
          is_maintenance: enabled,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
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
      let query = this.client.from('users').select('id, role');

      if (targetAudience === 'players') {
        query = query.or('role.eq.player,role.is.null');
      } else if (targetAudience === 'owners') {
        query = query.eq('role', 'owner');
      }

      const { data: users, error: usersErr } = await query;
      if (usersErr) throw usersErr;

      if (!users || users.length === 0) {
        return { success: false, count: 0, error: 'لا يوجد مستخدمين مسجلين في الفئة المحددة' };
      }

      const payloads = users.map((u) => ({
        user_id: u.id,
        title,
        body,
        message: body,
        type: notificationType,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      // Insert in chunks of 100 to avoid payload size limit
      const chunkSize = 100;
      for (let i = 0; i < payloads.length; i += chunkSize) {
        const chunk = payloads.slice(i, i + chunkSize);
        await this.client.from('notifications').insert(chunk);
      }

      return { success: true, count: payloads.length };
    } catch (e) {
      console.error('Error sending broadcast notification:', e);
      return { success: false, count: 0, error: e.message };
    }
  }
}

export const adminService = new AdminService();
