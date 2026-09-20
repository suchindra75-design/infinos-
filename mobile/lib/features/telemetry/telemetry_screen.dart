import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../devices/device_provider.dart';
import 'waveform_widget.dart';

class TelemetryScreen extends StatelessWidget {
  const TelemetryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final selectedDevice = deviceProvider.selectedDevice;
    final resolvedFields = deviceProvider.resolvedFields;

    return Scaffold(
      backgroundColor: AppColors.warmCream,
      appBar: AppBar(
        title: Text(
          'Telemetry Details',
          style: AppTypography.displayHeader(fontSize: 20),
        ),
      ),
      body: selectedDevice == null
          ? Center(
              child: Text(
                'Please select a Smart Bag from Dashboard or Devices.',
                style: AppTypography.body(color: AppColors.mutedText),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        selectedDevice.name,
                        style: AppTypography.displayHeader(fontSize: 18),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Device Code: ${selectedDevice.deviceCode} · Status: ${selectedDevice.status.label}',
                        style: AppTypography.body(fontSize: 12, color: AppColors.mutedText),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        height: 120,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: AppColors.warmCream,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: AnimatedWaveformWidget(
                          activeField: resolvedFields.isNotEmpty ? resolvedFields.first : null,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Resolved Dynamic Fields',
                  style: AppTypography.title(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                ...resolvedFields.map((field) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                field.label,
                                style: AppTypography.title(fontSize: 14),
                              ),
                              Text(
                                'Metric: ${field.metric} · Zone: ${field.zone}',
                                style: AppTypography.body(fontSize: 11, color: AppColors.mutedText),
                              ),
                            ],
                          ),
                          Text(
                            field.value != null ? '${field.value!.toStringAsFixed(1)} ${field.unit}' : '—',
                            style: AppTypography.mono(fontSize: 16, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    )),
              ],
            ),
    );
  }
}
