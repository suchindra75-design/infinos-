import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/device.dart';
import '../devices/device_provider.dart';
import 'waveform_widget.dart';

class TelemetryScreen extends StatefulWidget {
  const TelemetryScreen({super.key});

  @override
  State<TelemetryScreen> createState() => _TelemetryScreenState();
}

class _TelemetryScreenState extends State<TelemetryScreen> {
  int _selectedFieldIndex = 0;

  String _formatTimestamp(DateTime? dateTime) {
    if (dateTime == null) return 'No readings recorded';
    final now = DateTime.now();
    final diff = now.difference(dateTime);

    if (diff.inSeconds < 60) {
      return 'Just now (${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}:${dateTime.second.toString().padLeft(2, '0')})';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago (${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')})';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago (${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')})';
    } else {
      return '${dateTime.year}-${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    }
  }

  Widget _buildStatusBadge(DeviceConnectivityStatus status) {
    final color = status == DeviceConnectivityStatus.online
        ? const Color(0xFF16A34A)
        : status == DeviceConnectivityStatus.stale
            ? const Color(0xFFD97706)
            : const Color(0xFFDC2626);
    final bgColor = color.withValues(alpha: 0.12);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            status.label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final selectedDevice = deviceProvider.selectedDevice;
    final resolvedFields = deviceProvider.resolvedFields;
    final latestReading = deviceProvider.latestReading;
    final isLoading = deviceProvider.isTelemetryLoading;
    final errorMessage = deviceProvider.telemetryErrorMessage;

    if (selectedDevice == null) {
      return Scaffold(
        backgroundColor: AppColors.warmCream,
        appBar: AppBar(
          title: Text(
            'Telemetry Details',
            style: AppTypography.displayHeader(fontSize: 20),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: AppColors.surface,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.sensors_off_rounded,
                    size: 40,
                    color: AppColors.mutedText,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'No Smart Bag Selected',
                  style: AppTypography.displayHeader(fontSize: 18),
                ),
                const SizedBox(height: 8),
                Text(
                  'Please select a device from the Dashboard or Devices screen to inspect real-time telemetry.',
                  textAlign: TextAlign.center,
                  style: AppTypography.body(color: AppColors.mutedText),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_selectedFieldIndex >= resolvedFields.length) {
      _selectedFieldIndex = 0;
    }
    final activeField = resolvedFields.isNotEmpty
        ? resolvedFields[_selectedFieldIndex]
        : null;

    final isOffline = selectedDevice.status == DeviceConnectivityStatus.offline;
    final waveformState = isOffline
        ? WaveformState.ambient
        : (isLoading ? WaveformState.ambient : WaveformState.liveUpdate);

    return Scaffold(
      backgroundColor: AppColors.warmCream,
      appBar: AppBar(
        title: Text(
          'Telemetry Details',
          style: AppTypography.displayHeader(fontSize: 20),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Telemetry',
            onPressed: () =>
                deviceProvider.fetchDeviceTelemetry(selectedDevice.id),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primaryOrange,
        backgroundColor: AppColors.surface,
        onRefresh: () =>
            deviceProvider.fetchDeviceTelemetry(selectedDevice.id),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Hero Device Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x06000000),
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              selectedDevice.name,
                              style: AppTypography.displayHeader(fontSize: 18),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Code: ${selectedDevice.deviceCode}${selectedDevice.thingSpeakChannelId.isNotEmpty ? ' · Channel: ${selectedDevice.thingSpeakChannelId}' : ''}',
                              style: AppTypography.body(
                                fontSize: 12,
                                color: AppColors.mutedText,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      _buildStatusBadge(selectedDevice.status),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1, color: AppColors.border),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(
                        Icons.access_time_rounded,
                        size: 14,
                        color: AppColors.mutedText,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Recorded: ${_formatTimestamp(latestReading?.recordedAt)}',
                          style: AppTypography.body(
                            fontSize: 12,
                            color: AppColors.mutedText,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  if (isOffline) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFFCA5A5)),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.wifi_off_rounded,
                            size: 14,
                            color: Color(0xFFDC2626),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Device Offline · Displaying historical telemetry',
                              style: AppTypography.body(
                                fontSize: 11,
                                color: const Color(0xFF991B1B),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Error Banner with Retry
            if (errorMessage != null) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFCA5A5)),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.error_outline_rounded,
                      color: Color(0xFFDC2626),
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        errorMessage,
                        style: AppTypography.body(
                          fontSize: 12,
                          color: const Color(0xFF991B1B),
                        ),
                      ),
                    ),
                    TextButton(
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        backgroundColor: const Color(0xFFDC2626),
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () => deviceProvider
                          .fetchDeviceTelemetry(selectedDevice.id),
                      child: const Text('Retry', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ),
            ],

            // Waveform Container with Active Field Selector
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Live Signal Waveform',
                        style: AppTypography.title(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (activeField != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.warmCream,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Text(
                            '${activeField.label} ${activeField.unit.isNotEmpty ? '(${activeField.unit})' : ''}',
                            style: AppTypography.mono(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primaryOrange,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    height: 120,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: AppColors.warmCream,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: AnimatedWaveformWidget(
                      activeField: activeField,
                      waveformState: waveformState,
                    ),
                  ),
                  if (resolvedFields.length > 1) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 32,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: resolvedFields.length,
                        separatorBuilder: (context, index) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final field = resolvedFields[index];
                          final isSelected = index == _selectedFieldIndex;
                          return ChoiceChip(
                            label: Text(
                              field.label,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: isSelected
                                    ? FontWeight.w700
                                    : FontWeight.w500,
                                color: isSelected
                                    ? Colors.white
                                    : AppColors.primaryText,
                              ),
                            ),
                            selected: isSelected,
                            selectedColor: AppColors.primaryOrange,
                            backgroundColor: AppColors.warmCream,
                            onSelected: (_) {
                              setState(() {
                                _selectedFieldIndex = index;
                              });
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Section Header: Resolved Dynamic Fields
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Resolved Dynamic Fields (${resolvedFields.length})',
                  style: AppTypography.title(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (isLoading)
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primaryOrange,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),

            // Telemetry Field Cards List
            if (resolvedFields.isEmpty)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Center(
                  child: Text(
                    'No telemetry fields available for this device.',
                    style: AppTypography.body(color: AppColors.mutedText),
                  ),
                ),
              )
            else
              ...List.generate(resolvedFields.length, (index) {
                final field = resolvedFields[index];
                final isSelected = index == _selectedFieldIndex;
                final formattedVal = field.value != null
                    ? field.value!.toStringAsFixed(1)
                    : '—';

                return InkWell(
                  onTap: () {
                    setState(() {
                      _selectedFieldIndex = index;
                    });
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primaryOrange
                            : AppColors.border,
                        width: isSelected ? 2 : 1,
                      ),
                      boxShadow: isSelected
                          ? const [
                              BoxShadow(
                                color: Color(0x0CFC4731),
                                blurRadius: 6,
                                offset: Offset(0, 2),
                              ),
                            ]
                          : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      field.label,
                                      style: AppTypography.title(
                                        fontSize: 14,
                                        fontWeight: isSelected
                                            ? FontWeight.w700
                                            : FontWeight.w600,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  if (isSelected) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.primaryOrange
                                            .withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text(
                                        'Waveform',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.primaryOrange,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Metric: ${field.metric} · Zone: ${field.zone} · Key: ${field.fieldKey}',
                                style: AppTypography.body(
                                  fontSize: 11,
                                  color: AppColors.mutedText,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              formattedVal,
                              style: AppTypography.mono(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: isSelected
                                    ? AppColors.primaryOrange
                                    : AppColors.primaryText,
                              ),
                            ),
                            if (field.unit.isNotEmpty) ...[
                              const SizedBox(width: 4),
                              Text(
                                field.unit,
                                style: AppTypography.body(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.mutedText,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}
