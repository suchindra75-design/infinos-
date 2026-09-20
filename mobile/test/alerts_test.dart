import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:infinos_mobile/core/networking/api_client.dart';
import 'package:infinos_mobile/core/storage/secure_storage_service.dart';
import 'package:infinos_mobile/features/alerts/alerts_screen.dart';
import 'package:infinos_mobile/features/devices/device_provider.dart';
import 'package:infinos_mobile/models/alert.dart';

class MockAlertsDeviceProvider extends DeviceProvider {
  final List<SafeAlert> _mockAlerts;
  final String? _mockAlertsError;
  final bool _mockAlertsLoading;
  String _mockStatusFilter;
  bool retryCalled = false;
  bool resolveCalled = false;
  String? resolvedAlertId;

  MockAlertsDeviceProvider({
    required super.apiClient,
    List<SafeAlert> alerts = const [],
    String? alertsError,
    bool alertsLoading = false,
    String statusFilter = 'all',
  })  : _mockAlerts = alerts,
        _mockAlertsError = alertsError,
        _mockAlertsLoading = alertsLoading,
        _mockStatusFilter = statusFilter;

  @override
  List<SafeAlert> get alerts => _mockAlerts;

  @override
  String? get alertsErrorMessage => _mockAlertsError;

  @override
  bool get isAlertsLoading => _mockAlertsLoading;

  @override
  String get alertsStatusFilter => _mockStatusFilter;

  @override
  int get activeAlertsCount => _mockAlerts.where((a) => !a.isResolved).length;

  @override
  void setAlertsStatusFilter(String filter) {
    _mockStatusFilter = filter;
    notifyListeners();
  }

  @override
  Future<void> retryAlerts() async {
    retryCalled = true;
    notifyListeners();
  }

  @override
  Future<bool> resolveAlert(String alertId) async {
    resolveCalled = true;
    resolvedAlertId = alertId;
    return true;
  }

  @override
  Future<void> fetchAlertsSummary() async {
    // Override to prevent real HTTP calls during tests
  }
}

void main() {
  late SecureStorageService storageService;
  late ApiClient apiClient;

  setUp(() {
    storageService = SecureStorageService();
    apiClient = ApiClient(storageService: storageService);
  });

  Widget buildTestableWidget({required DeviceProvider deviceProvider}) {
    return ChangeNotifierProvider<DeviceProvider>.value(
      value: deviceProvider,
      child: const MaterialApp(
        home: AlertsScreen(),
      ),
    );
  }

  group('AlertsScreen Widget & State Tests', () {
    testWidgets('Renders empty state when no alerts exist', (WidgetTester tester) async {
      final provider = MockAlertsDeviceProvider(
        apiClient: apiClient,
        alerts: [],
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('System Alerts'), findsOneWidget);
      expect(find.text('No Alerts'), findsOneWidget);
      expect(find.text('All threshold rules are within safe ranges. No alert events have been recorded.'), findsOneWidget);
    });

    testWidgets('Renders empty state with custom filter label when active filter has no items', (WidgetTester tester) async {
      final provider = MockAlertsDeviceProvider(
        apiClient: apiClient,
        alerts: [],
        statusFilter: 'active',
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('No active alerts'), findsOneWidget);
    });

    testWidgets('Renders error state with message and retry button', (WidgetTester tester) async {
      final provider = MockAlertsDeviceProvider(
        apiClient: apiClient,
        alerts: [],
        alertsError: 'Network connection lost',
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Unable to Load Alerts'), findsOneWidget);
      expect(find.text('Network connection lost'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);

      await tester.tap(find.text('Retry'));
      await tester.pump();

      expect(provider.retryCalled, isTrue);
    });

    testWidgets('Renders list of real active and resolved alerts', (WidgetTester tester) async {
      final now = DateTime.now();
      final sampleAlerts = [
        SafeAlert(
          id: 'alert-1',
          deviceId: 'dev-1',
          type: AlertType.coldTemperatureHigh,
          severity: AlertSeverity.critical,
          message: 'Temperature exceeded upper threshold of 8.0°C',
          triggerValue: 9.4,
          thresholdValue: 8.0,
          triggeredAt: now.subtract(const Duration(minutes: 15)),
          isResolved: false,
          device: const AlertDevice(
            id: 'dev-1',
            deviceCode: 'BAG-01',
            name: 'Vaccine Cooler Alpha',
            status: 'online',
          ),
        ),
        SafeAlert(
          id: 'alert-2',
          deviceId: 'dev-2',
          type: AlertType.humidityHigh,
          severity: AlertSeverity.warning,
          message: 'Humidity level critical',
          triggerValue: 78.5,
          thresholdValue: 70.0,
          triggeredAt: now.subtract(const Duration(hours: 2)),
          isResolved: true,
          resolvedAt: now.subtract(const Duration(hours: 1)),
          resolvedByName: 'Admin User',
          device: const AlertDevice(
            id: 'dev-2',
            deviceCode: 'BAG-02',
            name: 'Pharma Carry Beta',
            status: 'online',
          ),
        ),
      ];

      final provider = MockAlertsDeviceProvider(
        apiClient: apiClient,
        alerts: sampleAlerts,
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      // Header & filter row
      expect(find.text('System Alerts'), findsOneWidget);
      expect(find.text('CRITICAL'), findsOneWidget);
      expect(find.text('WARNING'), findsOneWidget);
      expect(find.text('Cold Temp High'), findsOneWidget);
      expect(find.text('Humidity High'), findsOneWidget);
      expect(find.text('Temperature exceeded upper threshold of 8.0°C'), findsOneWidget);
      expect(find.text('Humidity level critical'), findsOneWidget);
      expect(find.text('Vaccine Cooler Alpha (BAG-01)'), findsOneWidget);
      expect(find.text('Pharma Carry Beta (BAG-02)'), findsOneWidget);

      // Active alert has Resolve button
      expect(find.text('Resolve'), findsOneWidget);

      // Resolved alert displays attribution
      expect(find.textContaining('Resolved by Admin User'), findsOneWidget);
    });

    testWidgets('Filter chip taps update filter state in provider', (WidgetTester tester) async {
      final provider = MockAlertsDeviceProvider(
        apiClient: apiClient,
        alerts: [],
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(provider.alertsStatusFilter, 'all');

      await tester.tap(find.text('Active'));
      await tester.pumpAndSettle();

      expect(provider.alertsStatusFilter, 'active');

      await tester.tap(find.text('Resolved'));
      await tester.pumpAndSettle();

      expect(provider.alertsStatusFilter, 'resolved');
    });

    testWidgets('Tapping Resolve opens confirmation dialog', (WidgetTester tester) async {
      final now = DateTime.now();
      final activeAlert = SafeAlert(
        id: 'alert-10',
        deviceId: 'dev-1',
        type: AlertType.deviceOffline,
        severity: AlertSeverity.critical,
        message: 'Device has gone offline',
        triggeredAt: now,
        isResolved: false,
        device: const AlertDevice(
          id: 'dev-1',
          deviceCode: 'BAG-01',
          name: 'Vaccine Cooler Alpha',
          status: 'offline',
        ),
      );

      final provider = MockAlertsDeviceProvider(
        apiClient: apiClient,
        alerts: [activeAlert],
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Resolve'), findsOneWidget);

      await tester.tap(find.text('Resolve'));
      await tester.pumpAndSettle();

      // Dialog assertions
      expect(find.text('Resolve Alert'), findsOneWidget);
      expect(find.textContaining('Mark this alert as resolved?'), findsOneWidget);

      // Tap confirm action inside dialog
      final resolveButtons = find.widgetWithText(TextButton, 'Resolve');
      expect(resolveButtons, findsOneWidget);

      await tester.tap(resolveButtons);
      await tester.pumpAndSettle();

      expect(provider.resolveCalled, isTrue);
      expect(provider.resolvedAlertId, 'alert-10');
    });

    testWidgets('Handles missing optional metadata safely without crash', (WidgetTester tester) async {
      final minimalAlert = SafeAlert(
        id: 'alert-99',
        deviceId: 'dev-unknown',
        type: AlertType.dataMissing,
        severity: AlertSeverity.info,
        message: 'Telemetry data missing for 10m',
        triggeredAt: DateTime(2026, 9, 20, 14, 0),
        isResolved: false,
        triggerValue: null,
        thresholdValue: null,
        device: null,
      );

      final provider = MockAlertsDeviceProvider(
        apiClient: apiClient,
        alerts: [minimalAlert],
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('INFO'), findsOneWidget);
      expect(find.text('Data Missing'), findsOneWidget);
      expect(find.text('Telemetry data missing for 10m'), findsOneWidget);
      expect(find.text('Resolve'), findsOneWidget);
    });
  });
}
