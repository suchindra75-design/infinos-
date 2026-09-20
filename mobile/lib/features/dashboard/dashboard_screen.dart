import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../auth/auth_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/device.dart';
import '../../models/telemetry.dart';
import '../devices/device_provider.dart';
import '../telemetry/waveform_widget.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedFieldIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DeviceProvider>(context, listen: false).fetchDevices();
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final selectedDevice = deviceProvider.selectedDevice;
    final resolvedFields = deviceProvider.resolvedFields;

    final activeField = resolvedFields.isNotEmpty && _selectedFieldIndex < resolvedFields.length
        ? resolvedFields[_selectedFieldIndex]
        : (resolvedFields.isNotEmpty ? resolvedFields.first : null);

    return Scaffold(
      backgroundColor: AppColors.warmCream,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primaryOrange.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.sensors_rounded,
                size: 20,
                color: AppColors.primaryOrange,
              ),
            ),
            const SizedBox(width: 10),
            Text(
              'INFINOS',
              style: AppTypography.displayHeader(fontSize: 22, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.primaryText),
            tooltip: 'Refresh Devices',
            onPressed: () => deviceProvider.fetchDevices(),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.mutedText),
            tooltip: 'Sign Out',
            onPressed: () => authProvider.logout(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => deviceProvider.fetchDevices(),
        color: AppColors.primaryOrange,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Welcome, ${authProvider.user?.name ?? "Operator"}',
                        style: AppTypography.body(fontSize: 13, color: AppColors.mutedText),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Fleet Overview',
                        style: AppTypography.displayHeader(fontSize: 22),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.cardBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.security_rounded, size: 14, color: AppColors.primaryOrange),
                        const SizedBox(width: 4),
                        Text(
                          authProvider.user?.role ?? 'OPERATOR',
                          style: AppTypography.mono(fontSize: 11, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      label: 'Total Bags',
                      value: '${deviceProvider.totalDevicesCount}',
                      icon: Icons.inventory_2_outlined,
                      color: AppColors.primaryText,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildStatCard(
                      label: 'Online',
                      value: '${deviceProvider.onlineDevicesCount}',
                      icon: Icons.wifi_rounded,
                      color: AppColors.statusOnline,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildStatCard(
                      label: 'Offline',
                      value: '${deviceProvider.offlineDevicesCount}',
                      icon: Icons.wifi_off_rounded,
                      color: AppColors.statusOffline,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                'Registered Smart Bags',
                style: AppTypography.title(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 10),
              if (deviceProvider.isLoading && deviceProvider.devices.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32.0),
                    child: CircularProgressIndicator(color: AppColors.primaryOrange),
                  ),
                )
              else if (deviceProvider.devices.isEmpty)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Center(
                    child: Text(
                      'No Smart Bags registered yet.',
                      style: AppTypography.body(color: AppColors.mutedText),
                    ),
                  ),
                )
              else
                SizedBox(
                  height: 100,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: deviceProvider.devices.length,
                    separatorBuilder: (context, index) => const SizedBox(width: 10),
                    itemBuilder: (context, index) {
                      final device = deviceProvider.devices[index];
                      final isSelected = selectedDevice?.id == device.id;
                      return _buildDeviceItemCard(device, isSelected, () {
                        setState(() {
                          _selectedFieldIndex = 0;
                        });
                        deviceProvider.selectDevice(device);
                      });
                    },
                  ),
                ),
              const SizedBox(height: 24),
              if (selectedDevice != null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x0A171512),
                        blurRadius: 12,
                        offset: Offset(0, 3),
                      )
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      selectedDevice.name,
                                      style: AppTypography.displayHeader(fontSize: 18),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: AppColors.cardBg,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        selectedDevice.deviceCode,
                                        style: AppTypography.mono(fontSize: 10, fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Channel ID: ${selectedDevice.thingSpeakChannelId} · Syncs every 15s',
                                  style: AppTypography.body(fontSize: 11, color: AppColors.mutedText),
                                ),
                              ],
                            ),
                          ),
                          _buildStatusBadge(selectedDevice.status),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Container(
                        height: 90,
                        width: double.infinity,
                        clipBehavior: Clip.antiAlias,
                        decoration: BoxDecoration(
                          color: AppColors.warmCream.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.borderSubtle),
                        ),
                        child: AnimatedWaveformWidget(
                          activeField: activeField,
                          waveformState: WaveformState.ambient,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Dynamic Telemetry Fields',
                        style: AppTypography.body(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.mutedText),
                      ),
                      const SizedBox(height: 8),
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 2.2,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                        ),
                        itemCount: resolvedFields.length,
                        itemBuilder: (context, index) {
                          final field = resolvedFields[index];
                          final isSelected = index == _selectedFieldIndex;
                          return _buildTelemetryMetricTile(
                            field: field,
                            isSelected: isSelected,
                            onTap: () {
                              setState(() {
                                _selectedFieldIndex = index;
                              });
                            },
                          );
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: AppColors.mutedText, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'System Health Normal',
                            style: AppTypography.title(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'All PostgreSQL rules & alert evaluation pipelines active.',
                            style: AppTypography.body(fontSize: 11, color: AppColors.mutedText),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Text(
                label,
                style: AppTypography.body(fontSize: 11, color: AppColors.mutedText),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: AppTypography.mono(fontSize: 18, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceItemCard(SafeDevice device, bool isSelected, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: 150,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.surface : AppColors.cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primaryOrange : AppColors.border,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primaryText.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    device.deviceCode,
                    style: AppTypography.mono(fontSize: 10, fontWeight: FontWeight.w700),
                  ),
                ),
                _buildStatusDot(device.status),
              ],
            ),
            Text(
              device.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.title(fontSize: 13, fontWeight: FontWeight.w700),
            ),
            Text(
              device.status.label,
              style: AppTypography.body(
                fontSize: 10,
                color: _getStatusColor(device.status),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(DeviceConnectivityStatus status) {
    final color = _getStatusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
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
            style: AppTypography.mono(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusDot(DeviceConnectivityStatus status) {
    final color = _getStatusColor(status);
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }

  Color _getStatusColor(DeviceConnectivityStatus status) {
    switch (status) {
      case DeviceConnectivityStatus.online:
        return AppColors.statusOnline;
      case DeviceConnectivityStatus.stale:
        return AppColors.statusStale;
      case DeviceConnectivityStatus.offline:
        return AppColors.statusOffline;
    }
  }

  Widget _buildTelemetryMetricTile({
    required ResolvedTelemetryField field,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    final valStr = field.value != null ? field.value!.toStringAsFixed(1) : '—';
    final lowerLabel = field.label.toLowerCase();

    Color metricColor = AppColors.defaultMetric;
    if (field.zone == 'cold' || (field.metric == 'temperature' && lowerLabel.contains('cold'))) {
      metricColor = AppColors.coldCompartment;
    } else if (field.zone == 'hot' || (field.metric == 'temperature' && lowerLabel.contains('hot'))) {
      metricColor = AppColors.hotCompartment;
    } else if (field.metric == 'humidity' || lowerLabel.contains('humid')) {
      metricColor = AppColors.relativeHumidity;
    } else if (lowerLabel.contains('volt') || lowerLabel.contains('battery')) {
      metricColor = AppColors.batteryVoltage;
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? metricColor.withValues(alpha: 0.08) : AppColors.cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? metricColor : AppColors.borderSubtle,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              field.label.toUpperCase(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.body(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: AppColors.mutedText,
              ),
            ),
            const SizedBox(height: 2),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  valStr,
                  style: AppTypography.mono(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: metricColor,
                  ),
                ),
                if (field.unit.isNotEmpty) ...[
                  const SizedBox(width: 3),
                  Text(
                    field.unit,
                    style: AppTypography.body(
                      fontSize: 11,
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
  }
}
