import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../auth/auth_provider.dart';
import '../../core/config/app_config.dart';
import '../../core/networking/connectivity_service.dart';
import '../../core/notifications/notification_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/user.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, child) {
        final user = auth.user;
        return SafeArea(
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                  child: Text(
                    'Settings',
                    style: AppTypography.displayHeader(fontSize: 26),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
                  child: Text(
                    'Account & Preferences',
                    style: AppTypography.body(
                      color: AppColors.mutedText,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),

              // ── Account Section ──
              SliverToBoxAdapter(
                child: _SectionHeader(title: 'ACCOUNT'),
              ),
              SliverToBoxAdapter(
                child: _ProfileCard(user: user),
              ),

              // ── Security Section ──
              SliverToBoxAdapter(
                child: _SectionHeader(title: 'SECURITY'),
              ),
              SliverToBoxAdapter(
                child: _SecuritySection(auth: auth),
              ),

              // ── Notifications & Network Section ──
              SliverToBoxAdapter(
                child: _SectionHeader(title: 'NOTIFICATIONS & NETWORK'),
              ),
              SliverToBoxAdapter(
                child: _NotificationsAndNetworkSection(),
              ),

              // ── About Section ──
              SliverToBoxAdapter(
                child: _SectionHeader(title: 'ABOUT'),
              ),
              SliverToBoxAdapter(
                child: _AboutSection(),
              ),

              // Bottom spacer
              const SliverToBoxAdapter(
                child: SizedBox(height: 40),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
      child: Text(
        title,
        style: AppTypography.body(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: AppColors.mutedText,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
// Profile Card
// ─────────────────────────────────────────────
class _ProfileCard extends StatelessWidget {
  final User? user;
  const _ProfileCard({required this.user});

  @override
  Widget build(BuildContext context) {
    final name = user?.name ?? 'Unknown';
    final email = user?.email ?? '—';
    final role = user?.role ?? 'VIEWER';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final memberSince = user?.createdAt;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  // Avatar
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: AppColors.primaryOrange.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Center(
                      child: Text(
                        initial,
                        style: AppTypography.displayHeader(
                          fontSize: 22,
                          color: AppColors.primaryOrange,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  // Name + Email
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: AppTypography.title(fontSize: 17),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          email,
                          style: AppTypography.body(
                            fontSize: 13,
                            color: AppColors.mutedText,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Divider
            Container(
              height: 1,
              color: AppColors.border,
            ),

            // Role + Member since
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              child: Row(
                children: [
                  // Role badge
                  _RoleBadge(role: role),
                  const Spacer(),
                  if (memberSince != null)
                    Text(
                      'Member since ${_formatDate(memberSince)}',
                      style: AppTypography.body(
                        fontSize: 12,
                        color: AppColors.mutedText,
                      ),
                    ),
                ],
              ),
            ),

            // Access level row
            Container(
              height: 1,
              color: AppColors.border,
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              child: Row(
                children: [
                  Icon(
                    Icons.shield_outlined,
                    size: 16,
                    color: AppColors.mutedText,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Access Level',
                    style: AppTypography.body(
                      fontSize: 13,
                      color: AppColors.mutedText,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    user != null && user!.canManageDevices
                        ? 'Full Management'
                        : 'Read Only',
                    style: AppTypography.body(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: user != null && user!.canManageDevices
                          ? AppColors.statusOnline
                          : AppColors.mutedText,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _formatDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[date.month - 1]} ${date.year}';
  }
}

// ─────────────────────────────────────────────
// Role Badge
// ─────────────────────────────────────────────
class _RoleBadge extends StatelessWidget {
  final String role;
  const _RoleBadge({required this.role});

  @override
  Widget build(BuildContext context) {
    final displayRole = role.toUpperCase();
    Color bgColor;
    Color textColor;

    switch (displayRole) {
      case 'ADMIN':
        bgColor = AppColors.primaryOrange.withValues(alpha: 0.12);
        textColor = AppColors.primaryOrange;
        break;
      case 'OPERATOR':
        bgColor = AppColors.coldCompartment.withValues(alpha: 0.12);
        textColor = AppColors.coldCompartment;
        break;
      default:
        bgColor = AppColors.mutedText.withValues(alpha: 0.12);
        textColor = AppColors.mutedText;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        displayRole,
        style: AppTypography.body(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: textColor,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
// Security Section (Logout)
// ─────────────────────────────────────────────
class _SecuritySection extends StatefulWidget {
  final AuthProvider auth;
  const _SecuritySection({required this.auth});

  @override
  State<_SecuritySection> createState() => _SecuritySectionState();
}

class _SecuritySectionState extends State<_SecuritySection> {
  bool _isLoggingOut = false;
  String? _logoutError;

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Text(
          'Sign Out',
          style: AppTypography.title(fontSize: 18),
        ),
        content: Text(
          'You will need to sign in again to access your devices and telemetry data.',
          style: AppTypography.body(
            fontSize: 14,
            color: AppColors.mutedText,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(
              'Cancel',
              style: AppTypography.body(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.mutedText,
              ),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(
              'Sign Out',
              style: AppTypography.body(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.primaryOrange,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    if (!mounted) return;

    setState(() {
      _isLoggingOut = true;
      _logoutError = null;
    });

    try {
      await widget.auth.logout();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _logoutError = 'Failed to sign out. Please try again.';
        _isLoggingOut = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            // Session status
            _SettingsTile(
              icon: Icons.verified_user_outlined,
              title: 'Session',
              subtitle: widget.auth.isAuthenticated ? 'Active' : 'Expired',
              trailingWidget: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: widget.auth.isAuthenticated
                      ? AppColors.statusOnline
                      : AppColors.statusOffline,
                ),
              ),
            ),

            Container(height: 1, color: AppColors.border),

            // Password change — not available
            _SettingsTile(
              icon: Icons.lock_outline_rounded,
              title: 'Change Password',
              subtitle: 'Not available — use web portal',
              enabled: false,
            ),

            Container(height: 1, color: AppColors.border),

            // Logout action
            if (_logoutError != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, size: 16, color: Colors.red),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _logoutError!,
                          style: AppTypography.body(fontSize: 12, color: Colors.red),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            InkWell(
              onTap: _isLoggingOut ? null : _handleLogout,
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  children: [
                    Icon(
                      Icons.logout_rounded,
                      size: 20,
                      color: _isLoggingOut
                          ? AppColors.mutedText
                          : AppColors.primaryOrange,
                    ),
                    const SizedBox(width: 12),
                    _isLoggingOut
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.primaryOrange,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Signing Out…',
                                style: AppTypography.body(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.mutedText,
                                ),
                              ),
                            ],
                          )
                        : Text(
                            'Sign Out',
                            style: AppTypography.body(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primaryOrange,
                            ),
                          ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
// Notifications & Network Section
// ─────────────────────────────────────────────
class _NotificationsAndNetworkSection extends StatefulWidget {
  @override
  State<_NotificationsAndNetworkSection> createState() =>
      _NotificationsAndNetworkSectionState();
}

class _NotificationsAndNetworkSectionState
    extends State<_NotificationsAndNetworkSection> {
  bool _requestingPermission = false;
  String? _permissionStatusText;

  Future<void> _handlePermissionRequest() async {
    setState(() {
      _requestingPermission = true;
    });
    final granted = await NotificationService().requestPermission();
    if (mounted) {
      setState(() {
        _requestingPermission = false;
        _permissionStatusText = granted ? 'Permission Granted' : 'Permission Denied';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final connectivity = context.watch<ConnectivityService>();
    final isOnline = connectivity.isOnline;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            _SettingsTile(
              icon: Icons.notifications_active_outlined,
              title: 'Local Alert Notifications',
              subtitle: _permissionStatusText ?? 'Active for local device alerts',
              trailingWidget: IconButton(
                icon: _requestingPermission
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.security, size: 20, color: AppColors.primaryOrange),
                onPressed: _requestingPermission ? null : _handlePermissionRequest,
                tooltip: 'Check / Request Notification Permission',
              ),
            ),
            Container(height: 1, color: AppColors.border),
            _SettingsTile(
              icon: isOnline ? Icons.wifi_rounded : Icons.wifi_off_rounded,
              title: 'Network Connection',
              subtitle: isOnline ? 'Connected to internet' : 'Offline mode active',
              trailingWidget: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isOnline ? AppColors.statusOnline : AppColors.statusOffline,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
// About Section
// ─────────────────────────────────────────────
class _AboutSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            _SettingsTile(
              icon: Icons.info_outline_rounded,
              title: AppConfig.appName,
              subtitle: AppConfig.appTagline,
            ),
            Container(height: 1, color: AppColors.border),
            _SettingsTile(
              icon: Icons.code_rounded,
              title: 'Version',
              subtitle: '1.0.0+1',
            ),
            Container(height: 1, color: AppColors.border),
            _SettingsTile(
              icon: Icons.cloud_outlined,
              title: 'Backend',
              subtitle: 'Render Cloud · HTTPS',
            ),
            Container(height: 1, color: AppColors.border),
            _SettingsTile(
              icon: Icons.storage_outlined,
              title: 'Data Sources',
              subtitle: 'PostgreSQL · ThingSpeak',
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
// Settings Tile
// ─────────────────────────────────────────────
class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailingWidget;
  final bool enabled;

  const _SettingsTile({
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailingWidget,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(
            icon,
            size: 20,
            color: enabled ? AppColors.mutedText : AppColors.mutedText.withValues(alpha: 0.4),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.body(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: enabled
                        ? AppColors.primaryText
                        : AppColors.mutedText.withValues(alpha: 0.5),
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: AppTypography.body(
                      fontSize: 12,
                      color: enabled
                          ? AppColors.mutedText
                          : AppColors.mutedText.withValues(alpha: 0.4),
                    ),
                  ),
                ],
              ],
            ),
          ),
          ?trailingWidget,
        ],
      ),
    );
  }
}
