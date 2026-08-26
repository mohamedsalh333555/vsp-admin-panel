import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseAdminService {
  final SupabaseClient _client = Supabase.instance.client;

  SupabaseClient get client => _client;

  // -------------------------------------------------------------
  // DASHBOARD KPI STATS
  // -------------------------------------------------------------
  Future<Map<String, dynamic>> fetchDashboardStats() async {
    try {
      final List usersRes = await _client.from('users').select('id, role');
      final List stadiumsRes = await _client.from('stadiums').select('id');
      final List bookingsRes = await _client.from('bookings').select('id, total_price, status');
      final List league1v1Res = await _client.from('vsp_1vs1_players').select('id');

      int totalUsers = usersRes.length;
      int totalStadiums = stadiumsRes.length;
      int totalBookings = bookingsRes.length;
      int total1v1Players = league1v1Res.length;

      double totalRevenue = 0.0;
      for (var b in bookingsRes) {
        if (b['total_price'] != null) {
          totalRevenue += (b['total_price'] as num).toDouble();
        }
      }

      return {
        'totalUsers': totalUsers,
        'totalStadiums': totalStadiums,
        'totalBookings': totalBookings,
        'totalRevenue': totalRevenue,
        'total1v1Players': total1v1Players,
      };
    } catch (e) {
      return {
        'totalUsers': 0,
        'totalStadiums': 0,
        'totalBookings': 0,
        'totalRevenue': 0.0,
        'total1v1Players': 0,
        'error': e.toString(),
      };
    }
  }

  // -------------------------------------------------------------
  // MODULE B: OWNER AUDITS & ONBOARDING
  // -------------------------------------------------------------
  Future<List<Map<String, dynamic>>> fetchPendingOwners() async {
    try {
      final res = await _client
          .from('users')
          .select('*')
          .eq('role', 'owner')
          .or('verification_status.eq.pending,verification_status.is.null');
      return List<Map<String, dynamic>>.from(res as List);
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>?> fetchStadiumForOwner(String ownerId) async {
    try {
      final res = await _client
          .from('stadiums')
          .select('*')
          .eq('owner_id', ownerId)
          .maybeSingle();
      return res;
    } catch (e) {
      return null;
    }
  }

  Future<bool> approveOwner({required String ownerId, String? stadiumId}) async {
    try {
      await _client.from('users').update({
        'verification_status': 'approved',
        'is_identity_verified': true,
      }).eq('id', ownerId);

      if (stadiumId != null && stadiumId.toString().isNotEmpty) {
        try {
          await _client.from('stadiums').update({
            'is_verified': true,
          }).eq('id', stadiumId);
        } catch (stadiumErr) {
          print('Warning updating stadium verification by stadiumId: $stadiumErr');
        }
      }

      try {
        await _client.from('stadiums').update({
          'is_verified': true,
        }).eq('owner_id', ownerId);
      } catch (stadiumErr) {
        print('Warning updating stadium verification by ownerId: $stadiumErr');
      }

      try {
        await _client.from('championships').update({
          'is_approved': true,
        }).eq('owner_id', ownerId);
      } catch (_) {}

      return true;
    } catch (e) {
      print('Error in approveOwner: $e');
      return false;
    }
  }

  Future<bool> rejectOwner({required String ownerId, required String reason}) async {
    try {
      await _client.from('users').update({
        'verification_status': 'rejected',
        'rejection_reason': reason,
      }).eq('id', ownerId);
      return true;
    } catch (e) {
      print('Error in rejectOwner: $e');
      return false;
    }
  }

  Future<bool> activateVspPro({required String ownerId, int days = 30}) async {
    try {
      await _client.rpc('activate_vsp_pro', params: {
        'p_owner_id': ownerId,
        'p_transaction_id': 'ADMIN_GIFT_${DateTime.now().millisecondsSinceEpoch}',
        'p_days': days,
      });
      return true;
    } catch (e) {
      print('Fallback updating user additional_data for VSP PRO: $e');
      try {
        final userDoc = await _client.from('users').select('additional_data').eq('id', ownerId).maybeSingle();
        final addData = Map<String, dynamic>.from(userDoc?['additional_data'] ?? {});
        addData['isPro'] = true;
        addData['proExpiresAt'] = DateTime.now().add(Duration(days: days)).toIso8601String();
        await _client.from('users').update({'additional_data': addData}).eq('id', ownerId);
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  Future<bool> createOwnerAndStadiumManually({
    required String name,
    required String phone,
    required String email,
    required String stadiumName,
    required String governorate,
    required double pricePerHour,
  }) async {
    try {
      final userRes = await _client.from('users').insert({
        'name': name,
        'phone': phone,
        'email': email,
        'role': 'owner',
        'verification_status': 'approved',
        'is_identity_verified': true,
        'governorate': governorate,
      }).select().single();

      final String newUserId = userRes['id'];

      await _client.from('stadiums').insert({
        'owner_id': newUserId,
        'name': stadiumName,
        'governorate': governorate,
        'price_per_hour': pricePerHour,
        'is_verified': true,
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  // -------------------------------------------------------------
  // MODULE C: USERS & MODERATION
  // -------------------------------------------------------------
  Future<List<Map<String, dynamic>>> fetchAllUsers({String searchQuery = ''}) async {
    try {
      var query = _client.from('users').select('*');
      if (searchQuery.isNotEmpty) {
        query = query.or('name.ilike.%$searchQuery%,phone.ilike.%$searchQuery%');
      }
      final res = await query.order('created_at', ascending: false);
      return List<Map<String, dynamic>>.from(res as List);
    } catch (e) {
      return [];
    }
  }

  Future<bool> toggleUserBlockStatus(String userId, bool isBlocked) async {
    try {
      await _client.from('users').update({
        'status': isBlocked ? 'blocked' : 'active',
      }).eq('id', userId);

      try {
        await _client.from('users').update({
          'is_blocked': isBlocked,
        }).eq('id', userId);
      } catch (_) {}

      return true;
    } catch (e) {
      print('Error in toggleUserBlockStatus: $e');
      return false;
    }
  }

  Future<bool> resetNoShowCount(String userId) async {
    try {
      await _client.from('users').update({
        'no_show_count': 0,
      }).eq('id', userId);
      return true;
    } catch (e) {
      return false;
    }
  }

  // -------------------------------------------------------------
  // MODULE D: TOURNAMENT CONTROL ROOM
  // -------------------------------------------------------------
  Future<List<Map<String, dynamic>>> fetchChampionships() async {
    try {
      final res = await _client.from('championships').select('*').order('created_at', ascending: false);
      return List<Map<String, dynamic>>.from(res as List);
    } catch (e) {
      return [];
    }
  }

  Future<bool> updateChampionshipStatus(String id, String status) async {
    try {
      await _client.from('championships').update({'status': status}).eq('id', id);
      return true;
    } catch (e) {
      return false;
    }
  }

  // -------------------------------------------------------------
  // MODULE E: DISPUTES & REPORTS
  // -------------------------------------------------------------
  Future<List<Map<String, dynamic>>> fetchDisputedBookings() async {
    try {
      final res = await _client
          .from('bookings')
          .select('*')
          .or('match_result_status.eq.disputed,status.eq.disputed')
          .order('created_at', ascending: false);
      return List<Map<String, dynamic>>.from(res as List);
    } catch (e) {
      return [];
    }
  }

  Future<bool> resolveDispute(String bookingId, String resolution) async {
    try {
      await _client.from('bookings').update({
        'match_result_status': 'resolved',
        'dispute_resolution': resolution,
      }).eq('id', bookingId);
      return true;
    } catch (e) {
      return false;
    }
  }

  // -------------------------------------------------------------
  // MODULE F: VSP OFFICIAL 1v1 LEAGUE MANAGER & REGISTRATION REQUESTS
  // -------------------------------------------------------------
  Future<List<Map<String, dynamic>>> fetch1v1LeaguePlayers() async {
    try {
      final res = await _client
          .from('vsp_1vs1_players')
          .select('*')
          .order('total_points', ascending: false);
      return List<Map<String, dynamic>>.from(res as List);
    } catch (e) {
      return [];
    }
  }

  Future<int> fetch1v1ApprovedCount() async {
    try {
      final res = await _client
          .from('vsp_1v1_registrations')
          .select('id')
          .eq('status', 'approved');
      return (res as List).length;
    } catch (e) {
      return 0;
    }
  }

  Future<List<Map<String, dynamic>>> fetch1v1PendingRegistrations() async {
    try {
      final res = await _client
          .from('vsp_1v1_registrations')
          .select('*, users(name, phone, avatar_url, email)')
          .or('status.eq.pending,status.is.null')
          .order('created_at', ascending: false);
      return List<Map<String, dynamic>>.from(res as List);
    } catch (e) {
      try {
        final res = await _client
            .from('vsp_1v1_registrations')
            .select('*')
            .or('status.eq.pending,status.is.null');
        return List<Map<String, dynamic>>.from(res as List);
      } catch (_) {
        return [];
      }
    }
  }

  // APP_CONFIG 1v1 REGISTRATION GATE TOGGLE (TASK 2)
  Future<bool> fetch1v1RegistrationOpenStatus() async {
    try {
      // Try querying app_config first
      final res = await _client
          .from('app_config')
          .select('vsp_1v1_is_open')
          .maybeSingle();
      if (res != null && res['vsp_1v1_is_open'] != null) {
        return res['vsp_1v1_is_open'] == true;
      }
    } catch (_) {
      try {
        // Fallback to system_config table
        final res = await _client
            .from('system_config')
            .select('value')
            .eq('key', 'vsp_1v1_is_open')
            .maybeSingle();
        if (res != null) {
          return res['value'] == 'true';
        }
      } catch (_) {}
    }
    return true; // Default open
  }

  Future<bool> set1v1RegistrationOpenStatus(bool isOpen) async {
    try {
      await _client.from('app_config').upsert({
        'id': 1,
        'vsp_1v1_is_open': isOpen,
      });
      return true;
    } catch (_) {
      try {
        await _client.from('system_config').upsert({
          'key': 'vsp_1v1_is_open',
          'value': isOpen.toString(),
        });
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  // WIPE ALL REGISTRATIONS FOR NEW SEASON (TASK 2 - DELETE FROM vsp_1v1_registrations)
  Future<bool> startNew1v1SeasonWipeRegistrations() async {
    try {
      await _client
          .from('vsp_1v1_registrations')
          .delete()
          .not('id', 'is', null);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> approve1v1Registration({
    required String registrationId,
    required String userId,
    required String name,
    String? avatarUrl,
  }) async {
    try {
      await _client
          .from('vsp_1v1_registrations')
          .update({'status': 'approved'})
          .eq('id', registrationId);

      final existing = await _client
          .from('vsp_1vs1_players')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

      if (existing == null) {
        await _client.from('vsp_1vs1_players').insert({
          'user_id': userId,
          'name': name,
          'avatar_url': avatarUrl ?? '',
          'total_points': 0,
          'skill_points': 0,
          'goals': 0,
          'tackles': 0,
          'titles': 0,
          'trend': 'stable',
        });
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> reject1v1Registration(String registrationId) async {
    try {
      await _client
          .from('vsp_1v1_registrations')
          .update({'status': 'rejected'})
          .eq('id', registrationId);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> reset1v1Round() async {
    try {
      await _client
          .from('vsp_1v1_registrations')
          .update({'status': 'archived'});
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> add1v1Player({
    required String name,
    required String avatarUrl,
    required int initialPoints,
  }) async {
    try {
      await _client.from('vsp_1vs1_players').insert({
        'name': name,
        'avatar_url': avatarUrl,
        'total_points': initialPoints,
        'skill_points': 0,
        'goals': 0,
        'tackles': 0,
        'titles': 0,
        'trend': 'stable',
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> update1v1PlayerStats({
    required String playerId,
    required int totalPoints,
    required int skillPoints,
    required int goals,
    required int tackles,
    required int titles,
    required String trend,
  }) async {
    try {
      await _client.from('vsp_1vs1_players').update({
        'total_points': totalPoints,
        'skill_points': skillPoints,
        'goals': goals,
        'tackles': tackles,
        'titles': titles,
        'trend': trend,
      }).eq('id', playerId);
      return true;
    } catch (e) {
      return false;
    }
  }

  // -------------------------------------------------------------
  // MODULE G: CRM BROADCAST CENTER & SYSTEM CONFIG
  // -------------------------------------------------------------
  Future<bool> setMaintenanceMode(bool enabled) async {
    try {
      await _client.from('system_config').upsert({
        'key': 'maintenance_mode',
        'value': enabled.toString(),
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<Map<String, dynamic>> sendTargetedBroadcastNotification({
    required String title,
    required String body,
    required String targetAudience,
    required String notificationType,
  }) async {
    try {
      var query = _client.from('users').select('id, role');
      if (targetAudience == 'players') {
        query = query.or('role.eq.player,role.is.null');
      } else if (targetAudience == 'owners') {
        query = query.eq('role', 'owner');
      }

      final List userList = await query;
      if (userList.isEmpty) {
        return {'success': false, 'count': 0, 'error': 'No users found for target audience.'};
      }

      final List<Map<String, dynamic>> payloads = userList.map((user) {
        return {
          'user_id': user['id'],
          'title': title,
          'body': body,
          'type': notificationType,
          'is_read': false,
          'created_at': DateTime.now().toIso8601String(),
        };
      }).toList();

      await _client.from('notifications').insert(payloads);
      return {'success': true, 'count': payloads.length};
    } catch (e) {
      return {'success': false, 'count': 0, 'error': e.toString()};
    }
  }
}
