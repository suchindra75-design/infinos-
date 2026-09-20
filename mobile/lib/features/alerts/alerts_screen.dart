import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.warmCream,
      appBar: AppBar(
        title: Text(
          'System Alerts',
          style: AppTypography.displayHeader(fontSize: 20),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Center(
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.notifications_none_rounded, size: 48, color: AppColors.primaryOrange),
                const SizedBox(height: 16),
                Text(
                  'Alert Monitoring Pipeline',
                  style: AppTypography.displayHeader(fontSize: 18),
                ),
                const SizedBox(height: 8),
                Text(
                  'Displays isolated alert evaluations with severity, timestamps, and device associations.',
                  textAlign: TextAlign.center,
                  style: AppTypography.body(color: AppColors.mutedText, fontSize: 13),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
