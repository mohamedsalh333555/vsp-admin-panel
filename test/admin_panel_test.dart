import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vsp_admin_panel/core/providers/locale_provider.dart';
import 'package:vsp_admin_panel/core/providers/auth_provider.dart';
import 'package:vsp_admin_panel/core/constants/admin_constants.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/material.dart';

class TestHttpOverrides extends HttpOverrides {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  HttpOverrides.global = TestHttpOverrides();

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    try {
      await Supabase.initialize(
        url: AdminConstants.supabaseUrl,
        publishableKey: AdminConstants.supabaseAnonKey,
      );
    } catch (_) {}
  });

  group('LocaleProvider & Co-Founder Translations Tests', () {
    test('Default locale should be Arabic with RTL direction', () {
      final provider = LocaleProvider();
      expect(provider.isArabic, true);
      expect(provider.textDirection, TextDirection.rtl);
      expect(provider.translate('cofounder'), 'كو-فاوندر 👑');
    });

    test('Toggling locale should switch to English and LTR', () {
      final provider = LocaleProvider();
      provider.toggleLocale();
      expect(provider.isArabic, false);
      expect(provider.textDirection, TextDirection.ltr);
      expect(provider.translate('cofounder'), 'Co-Founder');
    });

    test('All module translation keys exist', () {
      final provider = LocaleProvider();
      final keys = [
        'tab_login', 'tab_register', 'cofounder', 'pending_title',
        'approve_admin_btn', 'dashboard', 'crm_title'
      ];
      for (final k in keys) {
        expect(provider.translate(k).isNotEmpty, true);
      }
    });
  });

  group('AuthProvider & Co-Founder Master Access Tests', () {
    test('AuthProvider initial state', () {
      final auth = AuthProvider();
      expect(auth.isLoading, false);
    });

    test('Co-Founder email constant should match mohamedsalh333555@gmail.com', () {
      expect(AuthProvider.coFounderEmail, 'mohamedsalh333555@gmail.com');
    });
  });
}
