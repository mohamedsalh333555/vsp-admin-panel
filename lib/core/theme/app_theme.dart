import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'vsp_colors.dart';

class AppTheme {
  static ThemeData get darkTheme {
    final tajawalTextTheme = GoogleFonts.tajawalTextTheme(ThemeData.dark().textTheme);
    final tajawalFamily = GoogleFonts.tajawal().fontFamily;
    final titilliumWebFamily = GoogleFonts.titilliumWeb().fontFamily;
    final List<String> fallbackFonts = [titilliumWebFamily ?? 'Titillium Web', 'sans-serif'];

    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: VSPColors.background,
      colorScheme: const ColorScheme.dark(
        primary: VSPColors.accent,
        secondary: VSPColors.accent,
        surface: VSPColors.surface,
        error: VSPColors.error,
      ),
      fontFamily: tajawalFamily,
      fontFamilyFallback: fallbackFonts,
      textTheme: tajawalTextTheme.copyWith(
        displayLarge: TextStyle(fontFamily: tajawalFamily, fontSize: 32, fontWeight: FontWeight.bold, color: VSPColors.textPrimary),
        titleLarge: TextStyle(fontFamily: tajawalFamily, fontSize: 20, fontWeight: FontWeight.bold, color: VSPColors.textPrimary),
        titleMedium: TextStyle(fontFamily: tajawalFamily, fontSize: 16, fontWeight: FontWeight.w600, color: VSPColors.textPrimary),
        bodyLarge: TextStyle(fontFamily: tajawalFamily, fontSize: 14, color: VSPColors.textPrimary),
        bodyMedium: TextStyle(fontFamily: tajawalFamily, fontSize: 13, color: VSPColors.textSecondary),
        bodySmall: TextStyle(fontFamily: tajawalFamily, fontSize: 11, color: VSPColors.textSecondary),
      ),
      cardTheme: CardThemeData(
        color: VSPColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(VSPRadius.md),
          side: const BorderSide(color: VSPColors.borderLight, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: VSPColors.surfaceAlt,
        hintStyle: const TextStyle(color: VSPColors.textSecondary, fontSize: 13),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(VSPRadius.sm),
          borderSide: const BorderSide(color: VSPColors.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(VSPRadius.sm),
          borderSide: const BorderSide(color: VSPColors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(VSPRadius.sm),
          borderSide: const BorderSide(color: VSPColors.accent, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: VSPColors.accent,
          foregroundColor: Colors.black,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(VSPRadius.sm),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
      ),
    );
  }
}
