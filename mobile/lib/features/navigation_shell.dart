import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/networking/connectivity_service.dart';
import '../core/notifications/notification_service.dart';
import '../core/theme/app_typography.dart';
import 'alerts/alerts_screen.dart';
import 'analytics/analytics_screen.dart';
import 'dashboard/dashboard_screen.dart';
import 'devices/device_provider.dart';
import 'devices/devices_screen.dart';
import 'telemetry/telemetry_screen.dart';

class NavigationShell extends StatefulWidget {
  const NavigationShell({super.key});

  @override
  State<NavigationShell> createState() => _NavigationShellState();
}

class _NavigationShellState extends State<NavigationShell> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    DashboardScreen(),
    DevicesScreen(),
    TelemetryScreen(),
    AnalyticsScreen(),
    AlertsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _initNotifications();
    _setupConnectivityListener();
  }

  void _initNotifications() async {
    final notificationService = NotificationService();
    await notificationService.initialize();
    await notificationService.requestPermission();
    notificationService.onNotificationTap = (alertId) {
      if (mounted) {
        setState(() {
          _currentIndex = 4; // Alerts tab
        });
      }
    };
  }

  void _setupConnectivityListener() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final connectivity = context.read<ConnectivityService>();
      connectivity.addOnReconnect(() {
        if (mounted) {
          context.read<DeviceProvider>().fetchDevices();
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final isOffline = context.watch<ConnectivityService>().isOffline;

    return Scaffold(
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            if (isOffline)
              Container(
                width: double.infinity,
                color: Colors.amber.shade800,
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.wifi_off_rounded, size: 14, color: Colors.white),
                    const SizedBox(width: 8),
                    Text(
                      'Offline — Showing cached data',
                      style: AppTypography.body(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            Expanded(
              child: IndexedStack(
                index: _currentIndex,
                children: _screens,
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard_rounded),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.inventory_2_outlined),
            activeIcon: Icon(Icons.inventory_2_rounded),
            label: 'Devices',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.show_chart_rounded),
            activeIcon: Icon(Icons.show_chart_rounded),
            label: 'Telemetry',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.analytics_outlined),
            activeIcon: Icon(Icons.analytics_rounded),
            label: 'Analytics',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.notifications_none_rounded),
            activeIcon: Icon(Icons.notifications_rounded),
            label: 'Alerts',
          ),
        ],
      ),
    );
  }
}
