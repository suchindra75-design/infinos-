import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTypography {
  // Editorial Heading Style
  static TextStyle displayHeader({
    double fontSize = 24.0,
    FontWeight fontWeight = FontWeight.w700,
    Color color = AppColors.primaryText,
  }) {
    return GoogleFonts.playfairDisplay(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      height: 1.2,
    );
  }

  // Modern Clean UI Font (Outfit / Inter)
  static TextStyle body({
    double fontSize = 14.0,
    FontWeight fontWeight = FontWeight.w400,
    Color color = AppColors.primaryText,
  }) {
    return GoogleFonts.outfit(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
    );
  }

  static TextStyle title({
    double fontSize = 16.0,
    FontWeight fontWeight = FontWeight.w600,
    Color color = AppColors.primaryText,
  }) {
    return GoogleFonts.outfit(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
    );
  }

  // Monospaced Telemetry Font for numeric readings
  static TextStyle mono({
    double fontSize = 16.0,
    FontWeight fontWeight = FontWeight.w600,
    Color color = AppColors.primaryText,
  }) {
    return GoogleFonts.jetBrainsMono(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
    );
  }
}
