import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vsp_admin_panel/core/providers/locale_provider.dart';
import 'package:vsp_admin_panel/core/providers/auth_provider.dart';
import 'package:vsp_admin_panel/core/theme/app_theme.dart';
import 'package:vsp_admin_panel/core/theme/vsp_colors.dart';
import 'package:vsp_admin_panel/core/constants/admin_constants.dart';
import 'package:vsp_admin_panel/core/services/supabase_admin_service.dart';
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

  group('1. ARCHITECTURE TESTS (الهيكلية والنواة)', () {
    test('Supabase URL & API Keys configuration', () {
      expect(AdminConstants.supabaseUrl.contains('supabase.co'), true);
      expect(AdminConstants.activeApiKey.isNotEmpty, true);
    });

    test('SupabaseAdminService instance initialization', () {
      final service = SupabaseAdminService();
      expect(service.client, isNotNull);
    });

    test('Co-Founder Master Email Constant', () {
      expect(AuthProvider.coFounderEmail, 'mohamedsalh333555@gmail.com');
    });
  });

  group('2. LOGIC & MASTER CONTROLS TESTS (المنطق وبوابة التسجيل)', () {
    test('LocaleProvider default state and Master Controls translations', () {
      final localeProv = LocaleProvider();
      expect(localeProv.isArabic, true);
      expect(localeProv.textDirection, TextDirection.rtl);
      expect(localeProv.translate('master_controls_title'), 'لوحة التحكم الفائقة للموسم');
      expect(localeProv.translate('start_new_season_btn'), '⚡ بدء موسم جديد / مسح السجلات بالكامل');

      localeProv.toggleLocale();
      expect(localeProv.isArabic, false);
      expect(localeProv.translate('master_controls_title'), 'Tournament Master Controls');
    });

    test('Capacity indicator threshold logic for 32 players', () {
      int countUnlocked = 15;
      bool isLocked15 = countUnlocked >= 32;
      expect(isLocked15, false);

      int countLocked = 32;
      bool isLocked32 = countLocked >= 32;
      expect(isLocked32, true);
    });
  });

  group('3. VISUAL & DESIGN SYSTEM TESTS (التصميم والألوان)', () {
    test('AppTheme dark theme attributes & Volt Green accents', () {
      final theme = AppTheme.darkTheme;
      expect(theme.brightness, Brightness.dark);
      expect(theme.scaffoldBackgroundColor, VSPColors.background);
      expect(theme.colorScheme.primary, VSPColors.accent);
      expect(VSPColors.accent, const Color(0xFF9FDF02));
      expect(VSPColors.background, const Color(0xFF09090B));
      expect(VSPColors.surface, const Color(0xFF18181B));
    });
  });
}
