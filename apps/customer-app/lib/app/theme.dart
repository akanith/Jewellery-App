import 'package:flutter/material.dart';

/// LUXURY JEWELLERY THEME FOR RAMYAS JEWELLER CUSTOMER APP
class AppTheme {
  // Brand Color Palette
  static const Color maroonPrimary = Color(0xFF701335); // Deep Maroon
  static const Color maroonDark = Color(0xFF520C25);
  static const Color maroonLight = Color(0xFF8F1D48);

  static const Color goldPrimary = Color(0xFFF5C443); // Warm Gold
  static const Color goldLight = Color(0xFFFDE68A);
  static const Color goldDark = Color(0xFFD97706);

  static const Color creamBackground = Color(0xFFFAF8F5); // Soft Cream
  static const Color cardSurface = Colors.white;
  static const Color textDark = Color(0xFF1E293B);
  static const Color textMuted = Color(0xFF64748B);
  static const Color borderLight = Color(0xFFF1E6EA);

  static const Color successGreen = Color(0xFF16A34A);
  static const Color warningAmber = Color(0xFFD97706);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: creamBackground,
      colorScheme: const ColorScheme.light(
        primary: maroonPrimary,
        secondary: goldPrimary,
        surface: cardSurface,
        onPrimary: Colors.white,
        onSurface: textDark,
      ),
      fontFamily: 'Roboto',
      appBarTheme: const AppBarTheme(
        backgroundColor: creamBackground,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: maroonPrimary),
        titleTextStyle: TextStyle(
          color: maroonPrimary,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: maroonPrimary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  static ThemeData get darkTheme => lightTheme;
}
