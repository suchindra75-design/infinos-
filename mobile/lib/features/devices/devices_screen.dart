import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/device.dart';
import 'device_provider.dart';

class DevicesScreen extends StatelessWidget {
  const DevicesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.warmCream,
      appBar: AppBar(
        title: Text(
          'Smart Bags Fleet',
          style: AppTypography.displayHeader(fontSize: 20),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => deviceProvider.fetchDevices(),
        color: AppColors.primaryOrange,
        child: deviceProvider.isLoading && deviceProvider.devices.isEmpty
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryOrange))
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: deviceProvider.devices.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final device = deviceProvider.devices[index];
                  final isSelected = deviceProvider.selectedDevice?.id == device.id;

                  return Container(
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected ? AppColors.primaryOrange : AppColors.border,
                        width: isSelected ? 1.5 : 1.0,
                      ),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      leading: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.cardBg,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.inventory_2_outlined, color: AppColors.primaryOrange),
                      ),
                      title: Row(
                        children: [
                          Text(
                            device.name,
                            style: AppTypography.title(fontSize: 15, fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.cardBg,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              device.deviceCode,
                              style: AppTypography.mono(fontSize: 10, fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                      subtitle: Padding(
                        padding: const EdgeInsets.only(top: 4.0),
                        child: Text(
                          'Channel: ${device.thingSpeakChannelId} · Last seen: ${device.lastSeenAt != null ? device.lastSeenAt!.toLocal().toString().substring(0, 16) : "Never"}',
                          style: AppTypography.body(fontSize: 12, color: AppColors.mutedText),
                        ),
                      ),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getStatusColor(device.status).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          device.status.label,
                          style: AppTypography.mono(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: _getStatusColor(device.status),
                          ),
                        ),
                      ),
                      onTap: () {
                        deviceProvider.selectDevice(device);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Selected ${device.name}'),
                            duration: const Duration(seconds: 1),
                            backgroundColor: AppColors.primaryText,
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
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
}
