import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../auth/auth_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/device.dart';
import 'device_provider.dart';

class DevicesScreen extends StatelessWidget {
  const DevicesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final deviceProvider = Provider.of<DeviceProvider>(context);
    AuthProvider? authProvider;
    try {
      authProvider = Provider.of<AuthProvider>(context);
    } catch (_) {
      authProvider = null;
    }
    final canManage = authProvider?.user?.canManageDevices ?? true;
    final devices = deviceProvider.devices;
    final selectedDevice = deviceProvider.selectedDevice;

    return Scaffold(
      backgroundColor: AppColors.warmCream,
      appBar: AppBar(
        title: Text(
          'Smart Bags Fleet',
          style: AppTypography.displayHeader(fontSize: 20),
        ),
        actions: [
          if (canManage)
            IconButton(
              icon: const Icon(Icons.add_circle_outline_rounded, color: AppColors.primaryOrange),
              tooltip: 'Add Smart Bag',
              onPressed: () => _showAddDeviceModal(context, deviceProvider),
            ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.primaryText),
            tooltip: 'Refresh Devices',
            onPressed: () => deviceProvider.fetchDevices(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => deviceProvider.fetchDevices(),
        color: AppColors.primaryOrange,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Summary Bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Registered Devices (${devices.length})',
                    style: AppTypography.title(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  Text(
                    '${deviceProvider.onlineDevicesCount} Online · ${deviceProvider.offlineDevicesCount} Offline',
                    style: AppTypography.body(fontSize: 12, color: AppColors.mutedText, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // API Error Banner with Retry
              if (deviceProvider.errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.wifi_off_rounded, color: Colors.red.shade700, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          deviceProvider.errorMessage!,
                          style: AppTypography.body(color: Colors.red.shade900, fontSize: 13),
                        ),
                      ),
                      TextButton(
                        onPressed: () => deviceProvider.fetchDevices(),
                        child: Text(
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
                const SizedBox(height: 16),
              ],

              // Loading State
              if (deviceProvider.isLoading && devices.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 48.0),
                  child: Center(
                    child: CircularProgressIndicator(color: AppColors.primaryOrange),
                  ),
                )
              // Empty Devices State
              else if (devices.isEmpty && deviceProvider.errorMessage == null)
                Container(
                  padding: const EdgeInsets.all(32),
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.inventory_2_outlined, size: 44, color: AppColors.mutedText),
                      const SizedBox(height: 12),
                      Text(
                        'No Smart Bags Registered',
                        style: AppTypography.title(fontSize: 15, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'No cold-chain monitoring bags are currently linked to your account.',
                        textAlign: TextAlign.center,
                        style: AppTypography.body(fontSize: 12, color: AppColors.mutedText),
                      ),
                      if (canManage) ...[
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () => _showAddDeviceModal(context, deviceProvider),
                          icon: const Icon(Icons.add_rounded, size: 18),
                          label: const Text('Add Smart Bag'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primaryOrange,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ],
                    ],
                  ),
                )
              // Devices List
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: devices.length,
                  separatorBuilder: (context, index) => const SizedBox(width: 0, height: 12),
                  itemBuilder: (context, index) {
                    final device = devices[index];
                    final isSelected = selectedDevice?.id == device.id;

                    return Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () {
                          deviceProvider.selectDevice(device);
                          ScaffoldMessenger.of(context).hideCurrentSnackBar();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Selected ${device.name} (${device.deviceCode})'),
                              duration: const Duration(seconds: 1),
                              backgroundColor: AppColors.primaryText,
                              behavior: SnackBarBehavior.floating,
                              margin: const EdgeInsets.all(16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          );
                        },
                        borderRadius: BorderRadius.circular(16),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.surface : AppColors.cardBg,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isSelected ? AppColors.primaryOrange : AppColors.border,
                              width: isSelected ? 1.5 : 1.0,
                            ),
                            boxShadow: isSelected
                                ? const [
                                    BoxShadow(
                                      color: Color(0x0A171512),
                                      blurRadius: 8,
                                      offset: Offset(0, 2),
                                    )
                                  ]
                                : null,
                          ),
                          child: Row(
                            children: [
                              // Left Icon Badge
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? AppColors.primaryOrange.withValues(alpha: 0.1)
                                      : AppColors.surface,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppColors.borderSubtle),
                                ),
                                child: Icon(
                                  Icons.inventory_2_outlined,
                                  color: isSelected ? AppColors.primaryOrange : AppColors.primaryText,
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 12),

                              // Device Name, Code, Channel ID, & Last Seen
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            device.name,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: AppTypography.title(
                                              fontSize: 15,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
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
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Channel: ${device.thingSpeakChannelId} · Last seen: ${_formatLastSeen(device.lastSeenAt)}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTypography.body(fontSize: 11, color: AppColors.mutedText),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),

                              // Status Badge & Info Action
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      _buildStatusBadge(device.status),
                                      if (isSelected) ...[
                                        const SizedBox(height: 6),
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(
                                              Icons.check_circle_rounded,
                                              size: 14,
                                              color: AppColors.primaryOrange,
                                            ),
                                            const SizedBox(width: 3),
                                            Text(
                                              'Active',
                                              style: AppTypography.mono(
                                                fontSize: 10,
                                                fontWeight: FontWeight.w700,
                                                color: AppColors.primaryOrange,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(width: 4),
                                  IconButton(
                                    icon: const Icon(Icons.info_outline_rounded, size: 20, color: AppColors.mutedText),
                                    tooltip: 'Device Details',
                                    onPressed: () => _showDeviceDetailModal(context, device, deviceProvider, canManage),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(DeviceConnectivityStatus status) {
    final color = _getStatusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 5,
            height: 5,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            status.label,
            style: AppTypography.mono(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
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

  String _formatLastSeen(DateTime? lastSeenAt) {
    if (lastSeenAt == null) return 'Never';
    final local = lastSeenAt.toLocal();
    final monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final month = monthNames[local.month - 1];
    final day = local.day.toString().padLeft(2, '0');
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '$month $day, $hour:$minute';
  }

  void _showDeviceDetailModal(
    BuildContext context,
    SafeDevice device,
    DeviceProvider provider,
    bool canManage,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _DeviceDetailModalContent(
        device: device,
        provider: provider,
        canManage: canManage,
      ),
    );
  }

  void _showAddDeviceModal(BuildContext context, DeviceProvider provider) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _AddDeviceModalContent(provider: provider),
    );
  }
}

class _DeviceDetailModalContent extends StatefulWidget {
  final SafeDevice device;
  final DeviceProvider provider;
  final bool canManage;

  const _DeviceDetailModalContent({
    required this.device,
    required this.provider,
    required this.canManage,
  });

  @override
  State<_DeviceDetailModalContent> createState() => _DeviceDetailModalContentState();
}

class _DeviceDetailModalContentState extends State<_DeviceDetailModalContent> {
  bool _isSyncing = false;
  bool _isTesting = false;
  String? _actionFeedback;

  String _formatDate(DateTime? dt) {
    if (dt == null) return 'Never';
    final local = dt.toLocal();
    final monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final month = monthNames[local.month - 1];
    final day = local.day.toString().padLeft(2, '0');
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '$month $day, $hour:$minute';
  }

  @override
  Widget build(BuildContext context) {
    final device = widget.device;
    final provider = widget.provider;
    final canManage = widget.canManage;

    return Padding(
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        device.name,
                        style: AppTypography.displayHeader(fontSize: 18),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Code: ${device.deviceCode} · ID: ${device.id}',
                        style: AppTypography.mono(fontSize: 11, color: AppColors.mutedText),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.statusOnline.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    device.status.label,
                    style: AppTypography.mono(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.statusOnline),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.warmCream,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('ThingSpeak Channel', style: AppTypography.body(fontSize: 12, color: AppColors.mutedText)),
                      Text(device.thingSpeakChannelId, style: AppTypography.body(fontSize: 12, fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const Divider(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Last Synchronized', style: AppTypography.body(fontSize: 12, color: AppColors.mutedText)),
                      Text(_formatDate(device.lastSeenAt), style: AppTypography.body(fontSize: 12, fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const Divider(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Created Date', style: AppTypography.body(fontSize: 12, color: AppColors.mutedText)),
                      Text(_formatDate(device.createdAt), style: AppTypography.body(fontSize: 12, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            Text(
              'Configured Telemetry Fields (${device.fieldMappings?.length ?? 0})',
              style: AppTypography.title(fontSize: 13, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            if (device.fieldMappings != null && device.fieldMappings!.isNotEmpty)
              Column(
                children: device.fieldMappings!.map((mapping) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.borderSubtle),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primaryOrange.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              mapping.fieldKey,
                              style: AppTypography.mono(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primaryOrange,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              mapping.label,
                              style: AppTypography.body(fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                          Text(
                            mapping.unit,
                            style: AppTypography.mono(fontSize: 11, color: AppColors.mutedText),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              )
            else
              Text(
                'No custom field mappings configured. Using dynamic auto-discovery.',
                style: AppTypography.body(fontSize: 11, color: AppColors.mutedText),
              ),

            if (_actionFeedback != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _actionFeedback!.startsWith('Error')
                      ? Colors.red.shade50
                      : AppColors.statusOnline.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _actionFeedback!,
                  style: AppTypography.body(
                    fontSize: 11,
                    color: _actionFeedback!.startsWith('Error')
                        ? Colors.red.shade900
                        : AppColors.statusOnline,
                  ),
                ),
              ),
            ],

            const SizedBox(height: 20),

            if (canManage) ...[
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _isSyncing
                          ? null
                          : () async {
                              setState(() {
                                _isSyncing = true;
                                _actionFeedback = null;
                              });
                              try {
                                await provider.syncDevice(device.id);
                                if (mounted) {
                                  setState(() {
                                    _actionFeedback = 'Manual sync completed';
                                  });
                                }
                              } catch (e) {
                                if (mounted) {
                                  setState(() {
                                    _actionFeedback = 'Error syncing: $e';
                                  });
                                }
                              } finally {
                                if (mounted) {
                                  setState(() {
                                    _isSyncing = false;
                                  });
                                }
                              }
                            },
                      icon: _isSyncing
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 1.5),
                            )
                          : const Icon(Icons.sync_rounded, size: 16),
                      label: const Text('Sync'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _isTesting
                          ? null
                          : () async {
                              setState(() {
                                _isTesting = true;
                                _actionFeedback = null;
                              });
                              try {
                                final res = await provider.testConnection(
                                  thingSpeakChannelId: device.thingSpeakChannelId,
                                );
                                if (mounted) {
                                  setState(() {
                                    _actionFeedback = res['message'] as String? ?? 'Channel test passed';
                                  });
                                }
                              } catch (e) {
                                if (mounted) {
                                  setState(() {
                                    _actionFeedback = 'Error testing: $e';
                                  });
                                }
                              } finally {
                                if (mounted) {
                                  setState(() {
                                    _isTesting = false;
                                  });
                                }
                              }
                            },
                      icon: _isTesting
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 1.5),
                            )
                          : const Icon(Icons.sensors_rounded, size: 16),
                      label: const Text('Test'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, color: AppColors.primaryText),
                    tooltip: 'Edit Device',
                    onPressed: () {
                      Navigator.of(context).pop();
                      _showEditModal(context, device, provider);
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline_rounded, color: Colors.red),
                    tooltip: 'Delete Device',
                    onPressed: () {
                      Navigator.of(context).pop();
                      _confirmDelete(context, device, provider);
                    },
                  ),
                ],
              ),
            ] else
              Center(
                child: Text(
                  'View Only Mode · Admin access required for device management',
                  style: AppTypography.body(fontSize: 11, color: AppColors.mutedText),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showEditModal(BuildContext context, SafeDevice device, DeviceProvider provider) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _EditDeviceModalContent(device: device, provider: provider),
    );
  }

  void _confirmDelete(BuildContext context, SafeDevice device, DeviceProvider provider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Delete ${device.name}?'),
        content: Text(
          'Are you sure you want to remove ${device.name} (${device.deviceCode})? All historical telemetry links will be unlinked.',
          style: AppTypography.body(color: AppColors.mutedText, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                await provider.deleteDevice(device.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Deleted ${device.name}'),
                      backgroundColor: AppColors.primaryText,
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Failed to delete device: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

class _AddDeviceModalContent extends StatefulWidget {
  final DeviceProvider provider;

  const _AddDeviceModalContent({required this.provider});

  @override
  State<_AddDeviceModalContent> createState() => _AddDeviceModalContentState();
}

class _AddDeviceModalContentState extends State<_AddDeviceModalContent> {
  final _codeCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _channelCtrl = TextEditingController();
  final _apiKeyCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isSubmitting = false;
  bool _isTesting = false;
  String? _modalError;
  String? _modalSuccess;

  @override
  void dispose() {
    _codeCtrl.dispose();
    _nameCtrl.dispose();
    _channelCtrl.dispose();
    _apiKeyCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Link New Smart Bag',
                style: AppTypography.displayHeader(fontSize: 18),
              ),
              const SizedBox(height: 4),
              Text(
                'Enter device details and ThingSpeak channel credentials.',
                style: AppTypography.body(fontSize: 12, color: AppColors.mutedText),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _codeCtrl,
                decoration: const InputDecoration(
                  labelText: 'Device Code (e.g. BAG-03)',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().length < 2)
                    ? 'Device code must be at least 2 characters'
                    : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Device Name (e.g. Vaccine Carrier Beta)',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().length < 2)
                    ? 'Device name must be at least 2 characters'
                    : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _channelCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'ThingSpeak Channel ID (e.g. 3482393)',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'ThingSpeak Channel ID is required'
                    : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _apiKeyCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Read API Key (Optional)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),

              if (_modalError != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _modalError!,
                    style: AppTypography.body(fontSize: 12, color: Colors.red.shade900),
                  ),
                ),
                const SizedBox(height: 12),
              ],

              if (_modalSuccess != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.statusOnline.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _modalSuccess!,
                    style: AppTypography.body(fontSize: 12, color: AppColors.statusOnline),
                  ),
                ),
                const SizedBox(height: 12),
              ],

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isTesting
                          ? null
                          : () async {
                              if (_channelCtrl.text.trim().isEmpty) {
                                setState(() {
                                  _modalError = 'Enter Channel ID before testing connection';
                                });
                                return;
                              }
                              setState(() {
                                _isTesting = true;
                                _modalError = null;
                                _modalSuccess = null;
                              });
                              try {
                                final res = await widget.provider.testConnection(
                                  thingSpeakChannelId: _channelCtrl.text.trim(),
                                  thingSpeakReadApiKey: _apiKeyCtrl.text.trim(),
                                );
                                if (mounted) {
                                  setState(() {
                                    _modalSuccess = res['message'] as String? ?? 'ThingSpeak channel reachable!';
                                  });
                                }
                              } catch (e) {
                                if (mounted) {
                                  setState(() {
                                    _modalError = 'Connection failed: $e';
                                  });
                                }
                              } finally {
                                if (mounted) {
                                  setState(() {
                                    _isTesting = false;
                                  });
                                }
                              }
                            },
                      child: _isTesting
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 1.5),
                            )
                          : const Text('Test Channel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryOrange,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: _isSubmitting
                          ? null
                          : () async {
                              if (!_formKey.currentState!.validate()) return;
                              setState(() {
                                _isSubmitting = true;
                                _modalError = null;
                                _modalSuccess = null;
                              });
                              final nav = Navigator.of(context);
                              try {
                                await widget.provider.addDevice(
                                  deviceCode: _codeCtrl.text.trim(),
                                  name: _nameCtrl.text.trim(),
                                  thingSpeakChannelId: _channelCtrl.text.trim(),
                                  thingSpeakReadApiKey: _apiKeyCtrl.text.trim(),
                                );
                                nav.pop();
                              } catch (e) {
                                if (mounted) {
                                  setState(() {
                                    _modalError = 'Failed to add device: $e';
                                  });
                                }
                              } finally {
                                if (mounted) {
                                  setState(() {
                                    _isSubmitting = false;
                                  });
                                }
                              }
                            },
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.white),
                            )
                          : const Text('Save Device'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EditDeviceModalContent extends StatefulWidget {
  final SafeDevice device;
  final DeviceProvider provider;

  const _EditDeviceModalContent({required this.device, required this.provider});

  @override
  State<_EditDeviceModalContent> createState() => _EditDeviceModalContentState();
}

class _EditDeviceModalContentState extends State<_EditDeviceModalContent> {
  late final TextEditingController _codeCtrl;
  late final TextEditingController _nameCtrl;
  late final TextEditingController _channelCtrl;
  final _formKey = GlobalKey<FormState>();

  bool _isSubmitting = false;
  String? _modalError;

  @override
  void initState() {
    super.initState();
    _codeCtrl = TextEditingController(text: widget.device.deviceCode);
    _nameCtrl = TextEditingController(text: widget.device.name);
    _channelCtrl = TextEditingController(text: widget.device.thingSpeakChannelId);
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    _nameCtrl.dispose();
    _channelCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Edit ${widget.device.name}',
                style: AppTypography.displayHeader(fontSize: 18),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _codeCtrl,
                decoration: const InputDecoration(
                  labelText: 'Device Code',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().length < 2)
                    ? 'Device code must be at least 2 characters'
                    : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Device Name',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().length < 2)
                    ? 'Device name must be at least 2 characters'
                    : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _channelCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'ThingSpeak Channel ID',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'ThingSpeak Channel ID is required'
                            : null,
              ),
              const SizedBox(height: 16),

              if (_modalError != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _modalError!,
                    style: AppTypography.body(fontSize: 12, color: Colors.red.shade900),
                  ),
                ),
                const SizedBox(height: 12),
              ],

              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryOrange,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(48),
                ),
                onPressed: _isSubmitting
                    ? null
                    : () async {
                        if (!_formKey.currentState!.validate()) return;
                        setState(() {
                          _isSubmitting = true;
                          _modalError = null;
                        });
                        final nav = Navigator.of(context);
                        try {
                          await widget.provider.updateDevice(widget.device.id, {
                            'deviceCode': _codeCtrl.text.trim(),
                            'name': _nameCtrl.text.trim(),
                            'thingSpeakChannelId': _channelCtrl.text.trim(),
                          });
                          nav.pop();
                        } catch (e) {
                          if (mounted) {
                            setState(() {
                              _modalError = 'Failed to update device: $e';
                            });
                          }
                        } finally {
                          if (mounted) {
                            setState(() {
                              _isSubmitting = false;
                            });
                          }
                        }
                      },
                child: _isSubmitting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Update Device'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
