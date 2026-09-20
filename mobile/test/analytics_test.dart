import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:infinos_mobile/core/networking/api_client.dart';
import 'package:infinos_mobile/core/storage/secure_storage_service.dart';
import 'package:infinos_mobile/features/analytics/analytics_screen.dart';
import 'package:infinos_mobile/features/devices/device_provider.dart';
import 'package:infinos_mobile/models/device.dart';
import 'package:infinos_mobile/models/telemetry.dart';

class MockAnalyticsDeviceProvider extends DeviceProvider {
  final SafeDevice? _mockSelectedDevice;
  final Map<String, dynamic>? _mockAnalyticsSummary;
  final List<SensorReading> _mockTimeseries;
  final String? _mockAnalyticsError;
  final bool _mockAnalyticsLoading;

  MockAnalyticsDeviceProvider({
    required super.apiClient,
    SafeDevice? selectedDevice,
    Map<String, dynamic>? analyticsSummary,
    List<SensorReading> timeseries = const [],
    String? analyticsError,
    bool analyticsLoading = false,
  })  : _mockSelectedDevice = selectedDevice,
        _mockAnalyticsSummary = analyticsSummary,
        _mockTimeseries = timeseries,
        _mockAnalyticsError = analyticsError,
        _mockAnalyticsLoading = analyticsLoading;

  @override
  SafeDevice? get selectedDevice => _mockSelectedDevice;

  @override
  Map<String, dynamic>? get analyticsSummary => _mockAnalyticsSummary;

  @override
  List<SensorReading> get analyticsTimeseries => _mockTimeseries;

  @override
  String? get analyticsErrorMessage => _mockAnalyticsError;

  @override
  bool get isAnalyticsLoading => _mockAnalyticsLoading;

  @override
  List<ResolvedTelemetryField> get resolvedFields {
    return ResolvedTelemetryField.resolveFields(
      fieldMappings: _mockSelectedDevice?.fieldMappings,
      latestReading: null,
    );
  }

  @override
  Future<void> fetchDeviceAnalytics(String deviceId) async {
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
        home: AnalyticsScreen(),
      ),
    );
  }

  group('AnalyticsScreen Widget & State Tests', () {
    testWidgets('Renders empty state when no device is selected', (WidgetTester tester) async {
      final provider = MockAnalyticsDeviceProvider(
        apiClient: apiClient,
        selectedDevice: null,
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('No Smart Bag Selected'), findsOneWidget);
    });

    testWidgets('Renders real analytics summary & field aggregates', (WidgetTester tester) async {
      final device = SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Smart Bag Alpha',
        thingSpeakChannelId: '3482393',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final summary = {
        'readingCount': 125,
        'firstReadingTimestamp': '2026-01-01T00:00:00Z',
        'latestReadingTimestamp': '2026-03-01T12:00:00Z',
        'fieldSummaries': {
          'field1': {
            'fieldKey': 'field1',
            'label': 'Cold Compartment',
            'metric': 'temperature',
            'zone': 'cold',
            'unit': '°C',
            'latest': 4.2,
            'minimum': 2.1,
            'maximum': 6.8,
            'average': 4.5,
          },
          'field2': {
            'fieldKey': 'field2',
            'label': 'Hot Compartment',
            'metric': 'temperature',
            'zone': 'hot',
            'unit': '°C',
            'latest': 42.0,
            'minimum': 38.5,
            'maximum': 48.0,
            'average': 43.1,
          },
        },
      };

      final provider = MockAnalyticsDeviceProvider(
        apiClient: apiClient,
        selectedDevice: device,
        analyticsSummary: summary,
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Smart Bag Alpha'), findsOneWidget);
      expect(find.text('125 Total Readings'), findsOneWidget);
      expect(find.text('Cold Compartment'), findsWidgets);
      expect(find.text('Hot Compartment'), findsWidgets);
      expect(find.text('4.2'), findsOneWidget);
      expect(find.text('2.1'), findsOneWidget);
      expect(find.text('6.8'), findsOneWidget);
      expect(find.text('4.5'), findsOneWidget);
    });

    testWidgets('Renders offline warning banner for historical analytics', (WidgetTester tester) async {
      final device = SafeDevice(
        id: 'dev-offline',
        deviceCode: 'BAG-OFF',
        name: 'Offline Smart Bag',
        thingSpeakChannelId: '99999',
        status: DeviceConnectivityStatus.offline,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final provider = MockAnalyticsDeviceProvider(
        apiClient: apiClient,
        selectedDevice: device,
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('OFFLINE'), findsOneWidget);
      expect(find.text('Device Offline · Analytics reflect stored historical readings'), findsOneWidget);
    });

    testWidgets('Renders error banner with retry button on failure', (WidgetTester tester) async {
      final device = SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Smart Bag Alpha',
        thingSpeakChannelId: '3482393',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final provider = MockAnalyticsDeviceProvider(
        apiClient: apiClient,
        selectedDevice: device,
        analyticsError: 'Failed to load analytics: Connection refused',
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Failed to load analytics: Connection refused'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('Plot field chip selection updates trend visualization', (WidgetTester tester) async {
      final device = SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Smart Bag Alpha',
        thingSpeakChannelId: '3482393',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final summary = {
        'readingCount': 50,
        'fieldSummaries': {
          'field1': {
            'fieldKey': 'field1',
            'label': 'Cold Compartment',
            'metric': 'temperature',
            'unit': '°C',
          },
          'field2': {
            'fieldKey': 'field2',
            'label': 'Relative Humidity',
            'metric': 'humidity',
            'unit': '%',
          },
        },
      };

      final timeseries = [
        SensorReading(
          id: 'r1',
          deviceId: 'dev-1',
          thingSpeakEntryId: 1,
          fieldValues: {'field1': 4.0, 'field2': 55.0},
          recordedAt: DateTime.now().subtract(const Duration(minutes: 10)),
        ),
        SensorReading(
          id: 'r2',
          deviceId: 'dev-1',
          thingSpeakEntryId: 2,
          fieldValues: {'field1': 4.5, 'field2': 60.0},
          recordedAt: DateTime.now(),
        ),
      ];

      final provider = MockAnalyticsDeviceProvider(
        apiClient: apiClient,
        selectedDevice: device,
        analyticsSummary: summary,
        timeseries: timeseries,
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Cold Compartment Trend (2 pts)'), findsOneWidget);

      await tester.tap(find.text('Relative Humidity').first, warnIfMissed: false);
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Relative Humidity Trend (2 pts)'), findsOneWidget);
    });
  });
}
