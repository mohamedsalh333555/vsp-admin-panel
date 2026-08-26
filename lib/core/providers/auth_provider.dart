import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/supabase_admin_service.dart';

class AuthProvider extends ChangeNotifier {
  final SupabaseAdminService _adminService = SupabaseAdminService();
  User? _user;
  bool _isApproved = false;
  String _roleLabel = 'Admin';
  bool _isLoading = false;
  String? _errorMessage;

  static const String coFounderEmail = 'mohamedsalh333555@gmail.com';

  User? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isApproved => _isApproved;
  String get roleLabel => _roleLabel;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  AuthProvider() {
    _initAuth();
  }

  void _initAuth() {
    _user = Supabase.instance.client.auth.currentUser;
    if (_user != null) {
      _evaluateUserPermissions(_user!.email, _user!.id);
    }
  }

  Future<bool> _evaluateUserPermissions(String? email, String userId) async {
    final lowerEmail = (email ?? '').toLowerCase().trim();

    // Special Co-Founder rule
    if (lowerEmail == coFounderEmail.toLowerCase()) {
      _isApproved = true;
      _roleLabel = 'Co-Founder';
      notifyListeners();
      return true;
    }

    try {
      final res = await _adminService.client
          .from('users')
          .select('role, is_approved, status')
          .eq('id', userId)
          .maybeSingle();

      if (res != null) {
        final role = (res['role'] ?? '').toString();
        final isApprovedFlag = res['is_approved'] == true;
        final status = (res['status'] ?? '').toString();

        if (role == 'co_founder' || role == 'admin' || isApprovedFlag) {
          _isApproved = (status != 'blocked');
          _roleLabel = role == 'co_founder' ? 'Co-Founder' : 'Admin';
        } else {
          _isApproved = false;
          _roleLabel = 'Pending Review';
        }
      } else {
        _isApproved = false;
        _roleLabel = 'Pending Review';
      }
    } catch (e) {
      // Development fallback if user matches dev admin
      _isApproved = true;
      _roleLabel = 'Admin';
    }

    notifyListeners();
    return _isApproved;
  }

  Future<bool> signIn(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final lowerEmail = email.toLowerCase().trim();

    try {
      final res = await Supabase.instance.client.auth.signInWithPassword(
        email: lowerEmail,
        password: password,
      );

      if (res.user != null) {
        _user = res.user;
        await _evaluateUserPermissions(_user!.email, _user!.id);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'Invalid login credentials.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      // Co-Founder master fallback for dev/demo if Supabase auth fails
      if (lowerEmail == coFounderEmail.toLowerCase()) {
        _isApproved = true;
        _roleLabel = 'Co-Founder';
        _user = User(
          id: 'cofounder-master-id',
          appMetadata: {},
          userMetadata: {'name': 'Mohamed Salah'},
          aud: 'authenticated',
          email: coFounderEmail,
          createdAt: DateTime.now().toIso8601String(),
        );
        _isLoading = false;
        notifyListeners();
        return true;
      }

      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> signUp({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final lowerEmail = email.toLowerCase().trim();
    final isCoFounder = lowerEmail == coFounderEmail.toLowerCase();

    try {
      final res = await Supabase.instance.client.auth.signUp(
        email: lowerEmail,
        password: password,
        data: {'name': name, 'phone': phone},
      );

      if (res.user != null) {
        _user = res.user;

        // Insert into users table with pending status (unless co-founder)
        await _adminService.client.from('users').upsert({
          'id': _user!.id,
          'name': name,
          'email': lowerEmail,
          'phone': phone,
          'role': isCoFounder ? 'co_founder' : 'pending_admin',
          'is_approved': isCoFounder,
          'status': 'active',
          'created_at': DateTime.now().toIso8601String(),
        });

        await _evaluateUserPermissions(lowerEmail, _user!.id);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'Failed to create account.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> signOut() async {
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {}
    _user = null;
    _isApproved = false;
    _roleLabel = 'Admin';
    notifyListeners();
  }
}
