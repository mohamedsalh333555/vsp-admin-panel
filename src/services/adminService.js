import { supabase, supabaseAdmin } from '../lib/supabase';

class AdminService {
  get client() {
    return supabaseAdmin || supabase;
  }

  // =========================================================================
  // MODULE A: DASHBOARD KPI & REALTIME METRICS
  // =========================================================================
  async fetchDashboardStats() {
    try {
      const [usersRes, stadiumsRes, bookingsRes, league1v1Res, pendingOwnersRes, disputesRes, payoutsRes] = await Promise.all([
        this.client.from('users').select('*', { count: 'exact', head: true }),
        this.client.from('stadiums').select('*', { count: 'exact', head: true }),
        this.client.from('bookings').select('id, total_price, status'),
        this.client.from('vsp_1vs1_players').select('*', { count: 'exact', head: true }),
        this.client.from('users').select('*', { count: 'exact', head: true }).eq('role', 'owner').or('verification_status.eq.pending,verification_status.is.null'),
        this.client.from('bookings').select('*', { count: 'exact', head: true }).or('match_result_status.eq.disputed,status.eq.disputed'),
        this.client.from('payout_settlements').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      let totalRevenue = 0;
      let activeBookingsCount = 0;
      if (bookingsRes.data && bookingsRes.data.length > 0) {
        const validBookings = bookingsRes.data.filter(
          (b) => b.status === 'confirmed' || b.status === 'completed' || b.status === 'paid'
        );
        activeBookingsCount = validBookings.length;
        totalRevenue = validBookings.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
      }

      return {
        totalUsers: usersRes.count || 0,
        totalStadiums: stadiumsRes.count || 0,
        totalBookings: activeBookingsCount || bookingsRes.data?.length || 0,
        totalRevenue,
        total1v1Players: league1v1Res.count || 0,
        pendingOwners: pendingOwnersRes.count || 0,
        disputesCount: disputesRes.count || 0,
        pendingPayouts: payoutsRes.count || 0,
      };
    } catch (e) {
      console.error('Error in fetchDashboardStats:', e);
      return {
        totalUsers: 0,
        totalStadiums: 0,
        totalBookings: 0,
        totalRevenue: 0,
        total1v1Players: 0,
        pendingOwners: 0,
        disputesCount: 0,
        pendingPayouts: 0,
        error: e.message,
      };
    }
  }

  async fetchRecentBookings(limit = 20) {
    try {
      const { data, error } = await this.client
        .from('bookings')
        .select('id, created_at, start_time, end_time, total_price, status, deposit_paid, is_deposit_paid, cancellation_reason, stadium_id, user_id, stadiums(name, governorate), users(name, phone, email)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        const fallback = await this.client
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        return fallback.data || [];
      }
      return data || [];
    } catch (e) {
      console.error('Error fetching recent bookings:', e);
      return [];
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
      return { success: false, error: e.message };
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
      return { success: false, error: e.message };
    }
  }

  async deleteBookingPermanently(bookingId) {
    try {
      const { error } = await this.client
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error in deleteBookingPermanently:', e);
      return { success: false, error: e.message };
    }
  }

  // =========================================================================
  // MODULE B: OWNER AUDITS & ONBOARDING
  // =========================================================================
  async fetchPendingOwners() {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('role', 'owner')
        .or('verification_status.eq.pending,verification_status.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error in fetchPendingOwners:', e);
      return [];
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
      // 1. Try atomic procedure if available
      try {
        const { data: rpcRes, error: rpcErr } = await this.client.rpc('admin_approve_owner_atomic', {
          p_owner_id: ownerId,
          p_stadium_id: stadiumId || null,
        });
        if (!rpcErr) return { success: true, data: rpcRes };
      } catch (_) {}

      // 2. Direct updates fallback with verified schema columns
      const { error: userErr } = await this.client
        .from('users')
        .update({
          verification_status: 'approved',
          is_identity_verified: true,
          is_blocked: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ownerId);

      if (userErr) throw userErr;

      if (stadiumId) {
        await this.client
          .from('stadiums')
          .update({ is_verified: true, is_blocked: false, updated_at: new Date().toISOString() })
          .eq('id', stadiumId);
      }

      await this.client
        .from('stadiums')
        .update({ is_verified: true, is_blocked: false, updated_at: new Date().toISOString() })
        .eq('owner_id', ownerId);

      return { success: true };
    } catch (e) {
      console.error('Error in approveOwner:', e);
      return { success: false, error: e.message };
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
      return { success: false, error: e.message };
    }
  }

  async activateVspPro({ ownerId, days = 30 }) {
    try {
      // 1. Try atomic RPC
      try {
        const { data, error } = await this.client.rpc('activate_vsp_pro', {
          p_owner_id: ownerId,
          p_transaction_id: `ADMIN_PRO_${Date.now()}`,
          p_days: Number(days),
        });
        if (!error) return { success: true, data };
      } catch (_) {}

      // 2. Direct fallback on schema columns
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { error: updateErr } = await this.client
        .from('users')
        .update({
          subscription_plan: 'pro',
          subscription_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ownerId);

      if (updateErr) throw updateErr;
      return { success: true, expiresAt };
    } catch (e) {
      console.error('Error in activateVspPro:', e);
      return { success: false, error: e.message };
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
      return { success: false, error: e.message };
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
        query = query.eq('role', roleFilter);
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
      const { error } = await this.client
        .from('users')
        .update({
          is_blocked: isBlocked,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error in toggleUserBlockStatus:', e);
      return { success: false, error: e.message };
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
      return { success: false, error: e.message };
    }
  }

  async deleteUserPermanently(userId) {
    try {
      try {
        const { data, error } = await this.client.rpc('delete_user_permanently', {
          p_user_id: userId,
        });
        if (!error) return { success: true, data };
      } catch (_) {}

      const { error } = await this.client.from('users').delete().eq('id', userId);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error in deleteUserPermanently:', e);
      return { success: false, error: e.message };
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
      return { success: false, error: e.message };
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
      return { success: false, error: e.message };
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
      const { data, error } = await this.client.rpc('prepare_tournament_bracket_atomic', {
        p_championship_id: championshipId,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('Error in prepareTournamentBracket:', e);
      return { success: false, error: e.message };
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
      // 1. Try atomic RPC
      try {
        const { data, error } = await this.client.rpc('admin_resolve_dispute_atomic', {
          p_booking_id: bookingId,
          p_outcome: winnerOutcome,
          p_notes: resolutionNotes,
        });
        if (!error) return { success: true, data };
      } catch (_) {}

      // 2. Direct resolution update fallback
      const payload = {
        status: winnerOutcome === 'cancelled' ? 'cancelled' : 'completed',
        match_result_status: 'confirmed',
        final_outcome: winnerOutcome,
        pending_outcome: null,
        requires_admin_intervention: false,
        dispute_resolution: resolutionNotes || `Resolved as ${winnerOutcome} by Admin`,
        updated_at: new Date().toISOString(),
      };

      if (homeScore !== null && awayScore !== null) {
        payload.home_team_score = Number(homeScore);
        payload.away_team_score = Number(awayScore);
      }

      const { error } = await this.client.from('bookings').update(payload).eq('id', bookingId);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error in resolveDispute:', e);
      return { success: false, error: e.message };
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
    } catch (_) {}

    try {
      const { data } = await this.client
        .from('system_config')
        .select('value')
        .eq('key', 'vsp_1v1_is_open')
        .maybeSingle();

      if (data) return data.value === 'true';
    } catch (_) {}

    return true; // default open
  }

  async set1v1RegistrationOpenStatus(isOpen) {
    try {
      try {
        await this.client.from('app_config').upsert({ id: 1, vsp_1v1_is_open: isOpen });
      } catch (_) {}

      try {
        await this.client.from('system_config').upsert({
          key: 'vsp_1v1_is_open',
          value: isOpen.toString(),
        });
      } catch (_) {}

      return { success: true };
    } catch (e) {
      console.error('Error setting 1v1 gate status:', e);
      return { success: false, error: e.message };
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
      return { success: false, error: e.message };
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
      return { success: false, error: e.message };
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
      return { success: false, error: e.message };
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
      return { success: false, error: e.message };
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
      return { success: false, error: e.message };
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
      return { success: false, error: e.message };
    }
  }

  // =========================================================================
  // MODULE G: ENTERPRISE FINANCIAL CLEARING & PAYOUT LEDGER
  // =========================================================================
  async fetchFinancialOverview() {
    try {
      // 1. Fetch owners, stadiums, bookings, transactions, and payout settlements in parallel
      const [ownersRes, stadiumsRes, bookingsRes, txRes, payoutsRes] = await Promise.all([
        this.client.from('users').select('*').eq('role', 'owner'),
        this.client.from('stadiums').select('*'),
        this.client.from('bookings').select('*'),
        this.client.from('transactions').select('*').order('created_at', { ascending: false }),
        this.client.from('payout_settlements').select('*, users(name, phone, email, governorate)').order('created_at', { ascending: false }),
      ]);

      const owners = ownersRes.data || [];
      const stadiums = stadiumsRes.data || [];
      const bookings = bookingsRes.data || [];
      const transactions = txRes.data || [];
      const settlements = payoutsRes.data || [];

      // Map stadium owner IDs
      const stadiumOwnerMap = {};
      const stadiumNameMap = {};
      stadiums.forEach((s) => {
        stadiumOwnerMap[s.id] = s.owner_id;
        stadiumNameMap[s.id] = s.name;
      });

      // Calculate aggregated metrics per owner
      const ownerMatrix = owners.map((owner) => {
        const ownerStadiums = stadiums.filter((s) => s.owner_id === owner.id);
        const stadiumIds = new Set(ownerStadiums.map((s) => s.id));
        const ownerBookings = bookings.filter((b) => stadiumIds.has(b.stadium_id) && (b.status === 'confirmed' || b.status === 'completed'));

        // Online Paid vs Cash Paid
        let onlineVolume = 0;
        let cashVolume = 0;
        let totalPlatformCommission = 0;

        ownerBookings.forEach((b) => {
          const price = Number(b.total_price || 0);
          const deposit = Number(b.deposit_paid || 0);
          const fee = Number(b.platform_fee || (price > 0 ? Math.round(price * 0.05) : 15)); // 5% default VSP platform fee
          totalPlatformCommission += fee;

          if (b.is_deposit_paid || deposit > 0 || b.paymob_transaction_id) {
            onlineVolume += deposit > 0 ? deposit : price;
          } else {
            cashVolume += price;
          }
        });

        // Calculate settled payouts to this owner
        const ownerPayouts = settlements.filter(
          (s) => (s.owner_id === owner.id || s.user_id === owner.id) && (s.status === 'paid' || s.status === 'completed')
        );
        const ownerPaidTransactions = transactions.filter(
          (t) => t.user_id === owner.id && t.type === 'payout' && t.status === 'completed'
        );

        const totalPaidOut =
          ownerPayouts.reduce((sum, s) => sum + Number(s.amount || 0), 0) +
          ownerPaidTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

        // Net Withdrawable Balance: Online volume collected by VSP minus platform fees minus already paid payouts
        const netBalance = onlineVolume - totalPlatformCommission - totalPaidOut;

        const preferredMethod = owner.p2p_vodafone
          ? 'vodafone_cash'
          : owner.p2p_instapay
          ? 'instapay'
          : owner.p2p_bank
          ? 'bank_transfer'
          : 'vodafone_cash';

        const preferredDestination =
          owner.p2p_vodafone || owner.p2p_instapay || owner.p2p_bank || owner.phone || 'غير مسجل';

        return {
          ownerId: owner.id,
          name: owner.name || 'مالك ملعب',
          phone: owner.phone || 'غير مسجل',
          email: owner.email,
          governorate: owner.governorate || 'غير محدد',
          stadiumCount: ownerStadiums.length,
          stadiumNames: ownerStadiums.map((s) => s.name).join(', ') || 'ملعب رئيسي',
          completedBookingsCount: ownerBookings.length,
          grossVolume: onlineVolume + cashVolume,
          onlineVolume,
          cashVolume,
          platformCommission: totalPlatformCommission,
          totalPaidOut,
          netBalance,
          isDueToOwner: netBalance >= 0,
          preferredMethod,
          preferredDestination,
          p2p_vodafone: owner.p2p_vodafone,
          p2p_instapay: owner.p2p_instapay,
          p2p_bank: owner.p2p_bank,
        };
      });

      // Overall System Financial KPIs
      const totalGrossSystemVolume = bookings
        .filter((b) => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

      const totalPlatformRevenue = ownerMatrix.reduce((sum, o) => sum + o.platformCommission, 0);
      const totalPendingOwnerDues = ownerMatrix
        .filter((o) => o.netBalance > 0)
        .reduce((sum, o) => sum + o.netBalance, 0);
      const totalSettledPayouts = ownerMatrix.reduce((sum, o) => sum + o.totalPaidOut, 0);

      return {
        ownerMatrix,
        transactions,
        settlements,
        kpis: {
          totalGrossSystemVolume,
          totalPlatformRevenue,
          totalPendingOwnerDues,
          totalSettledPayouts,
        },
      };
    } catch (e) {
      console.error('Error in fetchFinancialOverview:', e);
      return {
        ownerMatrix: [],
        transactions: [],
        settlements: [],
        kpis: {
          totalGrossSystemVolume: 0,
          totalPlatformRevenue: 0,
          totalPendingOwnerDues: 0,
          totalSettledPayouts: 0,
        },
      };
    }
  }

  async fetchFinancialTransactions() {
    try {
      const { data, error } = await this.client
        .from('transactions')
        .select('*, users(name, phone, role)')
        .order('created_at', { ascending: false });

      if (error) {
        const fallback = await this.client.from('transactions').select('*').order('created_at', { ascending: false });
        return fallback.data || [];
      }
      return data || [];
    } catch (e) {
      console.error('Error fetching transactions:', e);
      return [];
    }
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
      const ref = referenceNumber || `SETTLE_${Date.now()}`;

      // 1. Call atomic stored procedure if available
      try {
        await this.client.rpc('admin_record_payout_settlement_atomic', {
          p_owner_id: ownerId,
          p_amount: Number(amount),
          p_payment_method: method,
          p_reference: ref,
        });
      } catch (_) {}

      // 2. Insert into payout_settlements for tracking
      await this.client.from('payout_settlements').insert({
        owner_id: ownerId,
        amount: Number(amount),
        method,
        destination: destination || 'المحفظة المسجلة',
        status: 'paid',
        admin_notes: notes ? `${notes} (Ref: ${ref})` : `Ref: ${ref}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 3. Send notification to the owner
      await this.client.from('notifications').insert({
        user_id: ownerId,
        title: 'تم تحويل مستحقاتك المالية بنجاح',
        message: `تم إرسال مبلغ ${Number(amount).toLocaleString()} ج.م إلى حسابك عبر ${method} برقم مرجع: ${ref}`,
        type: 'financial',
        is_read: false,
        created_at: new Date().toISOString(),
      });

      return { success: true, referenceNumber: ref };
    } catch (e) {
      console.error('Error in recordSmartOwnerSettlement:', e);
      return { success: false, error: e.message };
    }
  }

  async fetchPayoutSettlements() {
    try {
      const { data, error } = await this.client
        .from('payout_settlements')
        .select('*, users(name, phone, email, governorate)')
        .order('created_at', { ascending: false });

      if (!error && data) return data;

      const fallback = await this.client
        .from('payout_settlements')
        .select('*')
        .order('created_at', { ascending: false });

      return fallback.data || [];
    } catch (e) {
      console.error('Error in fetchPayoutSettlements:', e);
      return [];
    }
  }

  async recordPayoutSettlement({ settlementId, ownerId, amount, transactionId, method = 'vodafone_cash' }) {
    try {
      const refNumber = transactionId || `TXN_${Date.now()}`;

      // 1. Try atomic procedure to record transaction & push notification
      try {
        await this.client.rpc('admin_record_payout_settlement_atomic', {
          p_owner_id: ownerId,
          p_amount: Number(amount),
          p_payment_method: method,
          p_reference: refNumber,
        });
      } catch (rpcErr) {
        console.warn('Atomic RPC payout warning:', rpcErr);
      }

      // 2. Update payout_settlements record
      if (settlementId) {
        const { error } = await this.client
          .from('payout_settlements')
          .update({
            status: 'paid',
            admin_notes: `Ref: ${refNumber}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settlementId);

        if (error) throw error;
      }

      return { success: true };
    } catch (e) {
      console.error('Error in recordPayoutSettlement:', e);
      return { success: false, error: e.message };
    }
  }

  // =========================================================================
  // MODULE H: CRM BROADCAST CENTER & SYSTEM CONFIG
  // =========================================================================
  async fetchSystemConfig() {
    try {
      const { data } = await this.client
        .from('app_config')
        .select('*')
        .maybeSingle();

      if (data) {
        return {
          maintenance_mode: Boolean(data.is_maintenance),
          vsp_1v1_is_open: Boolean(data.vsp_1v1_is_open),
          min_version: data.min_version || '1.0.0',
        };
      }
      return { maintenance_mode: false, vsp_1v1_is_open: true };
    } catch (e) {
      return { maintenance_mode: false, vsp_1v1_is_open: true };
    }
  }

  async setMaintenanceMode(enabled) {
    try {
      const { error } = await this.client
        .from('app_config')
        .upsert({
          id: 1,
          is_maintenance: enabled,
        });

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error in setMaintenanceMode:', e);
      return { success: false, error: e.message };
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
