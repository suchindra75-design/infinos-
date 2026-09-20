import 'package:flutter/material.dart';

class AppColors {
  // Brand Palette
  static const Color primaryOrange = Color(0xFFFC4731);
  static const Color warmCream = Color(0xFFF8F3E8);
  static const Color surface = Color(0xFFFFF9EF);
  static const Color cardBg = Color(0xFFF2ECE0);
  
  // Neutral Text & Icons
  static const Color primaryText = Color(0xFF171512);
  static const Color mutedText = Color(0xFF7B746A);
  static const Color border = Color(0x1A171512); // 10% opacity primary text
  static const Color borderSubtle = Color(0x0D171512); // 5% opacity

  // Status & Telemetry Accent Colors
  static const Color statusOnline = Color(0xFF10B981);
  static const Color statusStale = Color(0xFFF59E0B);
  static const Color statusOffline = Color(0xFF7B746A);

  // Dynamic Telemetry Metric Colors
  static const Color coldCompartment = Color(0xFF0284C7); // Cold blue
  static const Color hotCompartment = Color(0xFFFC4731);  // Hot orange/red
  static const Color relativeHumidity = Color(0xFF0EA5E9); // Humidity cyan
  static const Color batteryVoltage = Color(0xFFD97706);  // Amber
  static const Color defaultMetric = Color(0xFF8B5CF6);   // Purple
}
