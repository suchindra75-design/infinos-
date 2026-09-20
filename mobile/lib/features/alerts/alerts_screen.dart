import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/alert.dart';
import '../devices/device_provider.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  bool _initialFetchDone = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialFetchDone) {
      _initialFetchDone = true;
      final provider = Provider.of<DeviceProvider>(context, listen: false);
      // Only fetch if alerts haven't been loaded yet
      if (provider.alerts.isEmpty && !provider.isAlertsLoading) {
        provider.fetchAlertsSummary();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<DeviceProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.warmCream,
      appBar: AppBar(
        title: Text(
          'System Alerts',
          style: AppTypography.displayHeader(fontSize: 20),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.primaryText),
            tooltip: 'Refresh Alerts',
            onPressed: provider.isAlertsLoading ? null : () => provider.fetchAlertsSummary(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.fetchAlertsSummary(),
        color: AppColors.primaryOrange,
        child: Column(
          children: [
            // Status Filter Chips
            _buildFilterRow(provider),

            // Content area
            Expanded(
              child: _buildBody(provider),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterRow(DeviceProvider provider) {
    final currentFilter = provider.alertsStatusFilter;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          _buildFilterChip('All', 'all', currentFilter, provider),
          const SizedBox(width: 8),
          _buildFilterChip('Active', 'active', currentFilter, provider),
          const SizedBox(width: 8),
          _buildFilterChip('Resolved', 'resolved', currentFilter, provider),
          const Spacer(),
          // Alert count badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: provider.activeAlertsCount > 0
                  ? AppColors.primaryOrange.withValues(alpha: 0.1)
                  : AppColors.statusOnline.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '${provider.alerts.length}',
              style: AppTypography.mono(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: provider.activeAlertsCount > 0
                    ? AppColors.primaryOrange
                    : AppColors.statusOnline,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(
    String label,
    String value,
    String currentFilter,
    DeviceProvider provider,
  ) {
    final isSelected = currentFilter == value;
    return GestureDetector(
      onTap: () => provider.setAlertsStatusFilter(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryText : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primaryText : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: AppTypography.body(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isSelected ? AppColors.surface : AppColors.mutedText,
          ),
        ),
      ),
    );
  }

  Widget _buildBody(DeviceProvider provider) {
    // Error state
    if (provider.alertsErrorMessage != null && provider.alerts.isEmpty) {
      return _buildErrorState(provider);
    }

    // Loading state (initial)
    if (provider.isAlertsLoading && provider.alerts.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primaryOrange),
      );
    }

    // Empty state
    if (provider.alerts.isEmpty) {
      return _buildEmptyState(provider);
    }

    // Alert list
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      itemCount: provider.alerts.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final alert = provider.alerts[index];
        return _buildAlertCard(alert, provider);
      },
    );
  }

  Widget _buildEmptyState(DeviceProvider provider) {
    final isFiltered = provider.alertsStatusFilter != 'all';
    return Center(
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.statusOnline.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle_outline_rounded,
                    size: 36,
                    color: AppColors.statusOnline,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  isFiltered ? 'No ${provider.alertsStatusFilter} alerts' : 'No Alerts',
                  style: AppTypography.displayHeader(fontSize: 18),
                ),
                const SizedBox(height: 8),
                Text(
                  isFiltered
                      ? 'No alerts match the current filter. Try selecting a different status.'
                      : 'All threshold rules are within safe ranges. No alert events have been recorded.',
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

  Widget _buildErrorState(DeviceProvider provider) {
    return Center(
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.wifi_off_rounded, color: Colors.red.shade700, size: 36),
                const SizedBox(height: 16),
                Text(
                  'Unable to Load Alerts',
                  style: AppTypography.displayHeader(fontSize: 18),
                ),
                const SizedBox(height: 8),
                Text(
                  provider.alertsErrorMessage ?? 'An unexpected error occurred.',
                  textAlign: TextAlign.center,
                  style: AppTypography.body(color: Colors.red.shade900, fontSize: 13),
                ),
                const SizedBox(height: 16),
                TextButton.icon(
                  onPressed: () => provider.retryAlerts(),
                  icon: Icon(Icons.refresh_rounded, color: Colors.red.shade900, size: 18),
                  label: Text(
                    'Retry',
                    style: AppTypography.body(
                      color: Colors.red.shade900,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAlertCard(SafeAlert alert, DeviceProvider provider) {
    final severityColor = _getSeverityColor(alert.severity);
    final isActive = !alert.isResolved;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isActive ? severityColor.withValues(alpha: 0.25) : AppColors.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row: Severity Badge + Type + Status
          Row(
            children: [
              // Severity badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: severityColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: severityColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      AlertSeverity.label(alert.severity),
                      style: AppTypography.mono(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: severityColor,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // Alert type label
              Expanded(
                child: Text(
                  AlertType.label(alert.type),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.body(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.mutedText,
                  ),
                ),
              ),
              // Status pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isActive
                      ? AppColors.primaryOrange.withValues(alpha: 0.1)
                      : AppColors.statusOnline.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  isActive ? 'ACTIVE' : 'RESOLVED',
                  style: AppTypography.mono(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: isActive ? AppColors.primaryOrange : AppColors.statusOnline,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Alert message
          Text(
            alert.message,
            style: AppTypography.body(fontSize: 13, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),

          // Device association + Trigger/Threshold
          Row(
            children: [
              if (alert.device != null) ...[
                Icon(Icons.inventory_2_outlined, size: 13, color: AppColors.mutedText),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    '${alert.device!.name} (${alert.device!.deviceCode})',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.body(fontSize: 11, color: AppColors.mutedText),
                  ),
                ),
              ],
              if (alert.triggerValue != null && alert.thresholdValue != null) ...[
                const SizedBox(width: 10),
                Text(
                  '${alert.triggerValue!.toStringAsFixed(1)} / ${alert.thresholdValue!.toStringAsFixed(1)}',
                  style: AppTypography.mono(fontSize: 11, color: AppColors.mutedText),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),

          // Timestamp row + Resolve action
          Row(
            children: [
              Icon(Icons.schedule_rounded, size: 13, color: AppColors.mutedText),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  _formatAlertTimestamp(alert),
                  style: AppTypography.body(fontSize: 11, color: AppColors.mutedText),
                ),
              ),
              // Resolve button (only for active alerts)
              if (isActive)
                GestureDetector(
                  onTap: provider.isResolvingAlert
                      ? null
                      : () => _confirmResolve(alert, provider),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.statusOnline.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.statusOnline.withValues(alpha: 0.2)),
                    ),
                    child: provider.isResolvingAlert
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 1.5,
                              color: AppColors.statusOnline,
                            ),
                          )
                        : Text(
                            'Resolve',
                            style: AppTypography.body(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.statusOnline,
                            ),
                          ),
                  ),
                ),
            ],
          ),

          // Resolved-by info
          if (alert.isResolved && alert.resolvedByName != null) ...[
            const SizedBox(height: 6),
            Text(
              'Resolved by ${alert.resolvedByName}',
              style: AppTypography.body(fontSize: 10, color: AppColors.mutedText),
            ),
          ],
        ],
      ),
    );
  }

  void _confirmResolve(SafeAlert alert, DeviceProvider provider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Resolve Alert',
          style: AppTypography.displayHeader(fontSize: 18),
        ),
        content: Text(
          'Mark this alert as resolved?\n\n${alert.message}',
          style: AppTypography.body(fontSize: 13, color: AppColors.mutedText),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              'Cancel',
              style: AppTypography.body(fontWeight: FontWeight.w600, color: AppColors.mutedText),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              provider.resolveAlert(alert.id);
            },
            child: Text(
              'Resolve',
              style: AppTypography.body(fontWeight: FontWeight.w700, color: AppColors.statusOnline),
            ),
          ),
        ],
      ),
    );
  }

  Color _getSeverityColor(String severity) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return AppColors.primaryOrange;
      case 'WARNING':
        return AppColors.statusStale;
      case 'INFO':
        return const Color(0xFF0284C7);
      default:
        return AppColors.mutedText;
    }
  }

  String _formatAlertTimestamp(SafeAlert alert) {
    final triggered = alert.triggeredAt.toLocal();
    final triggeredStr = _formatDateTime(triggered);

    if (alert.isResolved && alert.resolvedAt != null) {
      final resolved = alert.resolvedAt!.toLocal();
      return 'Triggered: $triggeredStr · Resolved: ${_formatDateTime(resolved)}';
    }

    return 'Triggered: $triggeredStr';
  }

  String _formatDateTime(DateTime dt) {
    final day = dt.day.toString().padLeft(2, '0');
    final month = dt.month.toString().padLeft(2, '0');
    final year = dt.year;
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    return '$day/$month/$year $hour:$minute';
  }
}
