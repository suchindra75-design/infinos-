import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/device.dart';
import '../devices/device_provider.dart';
import 'analytics_chart_widget.dart';
import 'export_modal.dart';


class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  String? _selectedFieldKey;

  String _formatDate(String? rawIso) {
    if (rawIso == null || rawIso.isEmpty) return 'N/A';
    final dt = DateTime.tryParse(rawIso);
    if (dt == null) return 'N/A';
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
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

  Widget _buildStatBox({
    required String label,
    required String value,
    required String unit,
    Color color = AppColors.primaryText,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.warmCream,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTypography.body(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: AppColors.mutedText,
            ),
          ),
          const SizedBox(height: 2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                value,
                style: AppTypography.mono(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
              if (unit.isNotEmpty && value != '—') ...[
                const SizedBox(width: 2),
                Text(
                  unit,
                  style: AppTypography.body(
                    fontSize: 10,
                    color: AppColors.mutedText,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final selectedDevice = deviceProvider.selectedDevice;
    final summary = deviceProvider.analyticsSummary;
    final timeseries = deviceProvider.analyticsTimeseries;
    final isLoading = deviceProvider.isAnalyticsLoading;
    final errorMessage = deviceProvider.analyticsErrorMessage;

    if (selectedDevice == null) {
      return Scaffold(
        backgroundColor: AppColors.warmCream,
        appBar: AppBar(
          title: Text(
            'Analytics Summary',
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
                    Icons.analytics_outlined,
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
                  'Please select a device from the Dashboard or Devices screen to view statistical analytics.',
                  textAlign: TextAlign.center,
                  style: AppTypography.body(color: AppColors.mutedText),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Extract dynamic field summaries
    final Map<String, dynamic> fieldSummariesMap =
        (summary != null && summary['fieldSummaries'] is Map)
            ? Map<String, dynamic>.from(summary['fieldSummaries'])
            : {};

    // Fallback if summary map is not present yet but resolvedFields exist
    final resolvedFields = deviceProvider.resolvedFields;

    final List<Map<String, dynamic>> fieldSummariesList = [];
    if (fieldSummariesMap.isNotEmpty) {
      fieldSummariesMap.forEach((key, val) {
        if (val is Map) {
          fieldSummariesList.add(Map<String, dynamic>.from(val));
        }
      });
    } else {
      for (final rf in resolvedFields) {
        fieldSummariesList.add({
          'fieldKey': rf.fieldKey,
          'label': rf.label,
          'metric': rf.metric,
          'zone': rf.zone,
          'unit': rf.unit,
          'latest': rf.value,
          'minimum': rf.value,
          'maximum': rf.value,
          'average': rf.value,
        });
      }
    }

    if (fieldSummariesList.isNotEmpty &&
        (_selectedFieldKey == null ||
            !fieldSummariesList.any((f) => f['fieldKey'] == _selectedFieldKey))) {
      _selectedFieldKey = fieldSummariesList.first['fieldKey'] as String?;
    }

    final isOffline = selectedDevice.status == DeviceConnectivityStatus.offline;
    final readingCount = summary?['readingCount'] as int? ?? timeseries.length;
    final firstReadingTs = summary?['firstReadingTimestamp'] as String?;
    final latestReadingTs = summary?['latestReadingTimestamp'] as String?;

    // Extract active field points for timeseries chart
    final activeFieldInfo = fieldSummariesList.firstWhere(
      (f) => f['fieldKey'] == _selectedFieldKey,
      orElse: () => fieldSummariesList.isNotEmpty
          ? fieldSummariesList.first
          : {'label': 'Field 1', 'unit': ''},
    );

    final activeFieldKey = activeFieldInfo['fieldKey'] as String? ?? 'field1';
    final activeFieldLabel = activeFieldInfo['label'] as String? ?? 'Field 1';
    final activeFieldUnit = activeFieldInfo['unit'] as String? ?? '';

    final List<double> chartPoints = timeseries
        .map((r) => r.getValueForField(activeFieldKey))
        .where((v) => v != null)
        .cast<double>()
        .toList();

    return Scaffold(
      backgroundColor: AppColors.warmCream,
      appBar: AppBar(
        title: Text(
          'Analytics Summary',
          style: AppTypography.displayHeader(fontSize: 20),
        ),
        actions: [
          IconButton(
            key: const Key('export_appbar_action'),
            icon: const Icon(Icons.download_rounded),
            tooltip: 'Export Data',
            onPressed: () => showDialog(
              context: context,
              builder: (context) => ExportModal(
                device: selectedDevice,
                apiClient: deviceProvider.apiClient,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Analytics',
            onPressed: () =>
                deviceProvider.fetchDeviceAnalytics(selectedDevice.id),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primaryOrange,
        backgroundColor: AppColors.surface,
        onRefresh: () =>
            deviceProvider.fetchDeviceAnalytics(selectedDevice.id),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Selected Device Hero Analytics Card
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
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Historical Sample Dataset',
                              style: AppTypography.body(
                                fontSize: 11,
                                color: AppColors.mutedText,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$readingCount Total Readings',
                              style: AppTypography.mono(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primaryOrange,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              'Range Covered',
                              style: AppTypography.body(
                                fontSize: 11,
                                color: AppColors.mutedText,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${_formatDate(firstReadingTs)} → ${_formatDate(latestReadingTs)}',
                              style: AppTypography.body(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                              textAlign: TextAlign.end,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    key: const Key('export_report_button'),
                    onPressed: () => showDialog(
                      context: context,
                      builder: (context) => ExportModal(
                        device: selectedDevice,
                        apiClient: deviceProvider.apiClient,
                      ),
                    ),
                    icon: const Icon(Icons.download_rounded, size: 16),
                    label: const Text('Export Telemetry (CSV / PDF)'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryOrange,
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(40),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      elevation: 0,
                    ),
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
                              'Device Offline · Analytics reflect stored historical readings',
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

            // Error Retry Banner
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
                          .fetchDeviceAnalytics(selectedDevice.id),
                      child: const Text('Retry', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ),
            ],

            // Timeseries Trend Section with Field Selector Chips
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
                        'Timeseries Trend Plot',
                        style: AppTypography.title(
                          fontSize: 15,
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
                  if (fieldSummariesList.length > 1) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 32,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: fieldSummariesList.length,
                        separatorBuilder: (context, index) =>
                            const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final f = fieldSummariesList[index];
                          final key = f['fieldKey'] as String;
                          final label = f['label'] as String;
                          final isSelected = key == _selectedFieldKey;
                          return ChoiceChip(
                            label: Text(
                              label,
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
                                _selectedFieldKey = key;
                              });
                            },
                          );
                        },
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  AnalyticsChartWidget(
                    points: chartPoints,
                    unit: activeFieldUnit,
                    fieldLabel: activeFieldLabel,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Section Header: Dynamic Field Aggregates
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Dynamic Field Aggregates (${fieldSummariesList.length})',
                  style: AppTypography.title(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Field Aggregates Grid/List
            if (fieldSummariesList.isEmpty)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Center(
                  child: Text(
                    'No statistical summaries available for this device.',
                    style: AppTypography.body(color: AppColors.mutedText),
                  ),
                ),
              )
            else
              ...List.generate(fieldSummariesList.length, (index) {
                final field = fieldSummariesList[index];
                final key = field['fieldKey'] as String? ?? '';
                final label = field['label'] as String? ?? 'Field ${index + 1}';
                final metric = field['metric'] as String? ?? 'other';
                final zone = field['zone'] as String? ?? 'none';
                final unit = field['unit'] as String? ?? '';

                final latest = field['latest'] != null
                    ? (field['latest'] as num).toStringAsFixed(1)
                    : '—';
                final min = field['minimum'] != null
                    ? (field['minimum'] as num).toStringAsFixed(1)
                    : '—';
                final max = field['maximum'] != null
                    ? (field['maximum'] as num).toStringAsFixed(1)
                    : '—';
                final avg = field['average'] != null
                    ? (field['average'] as num).toStringAsFixed(1)
                    : '—';

                final isSelected = key == _selectedFieldKey;

                return InkWell(
                  onTap: () {
                    setState(() {
                      _selectedFieldKey = key;
                    });
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                label,
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
                              const SizedBox(width: 8),
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
                                  'Plotted',
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
                        const SizedBox(height: 2),
                        Text(
                          'Metric: $metric · Zone: $zone · Key: $key',
                          style: AppTypography.body(
                            fontSize: 11,
                            color: AppColors.mutedText,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: _buildStatBox(
                                label: 'LATEST',
                                value: latest,
                                unit: unit,
                                color: AppColors.primaryOrange,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: _buildStatBox(
                                label: 'MIN',
                                value: min,
                                unit: unit,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: _buildStatBox(
                                label: 'MAX',
                                value: max,
                                unit: unit,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: _buildStatBox(
                                label: 'AVG',
                                value: avg,
                                unit: unit,
                                color: AppColors.coldCompartment,
                              ),
                            ),
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
