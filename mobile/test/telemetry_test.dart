import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:infinos_mobile/core/networking/api_client.dart';
import 'package:infinos_mobile/core/storage/secure_storage_service.dart';
import 'package:infinos_mobile/features/devices/device_provider.dart';
import 'package:infinos_mobile/features/telemetry/telemetry_screen.dart';
import 'package:infinos_mobile/models/device.dart';
import 'package:infinos_mobile/models/telemetry.dart';

class MockTelemetryDeviceProvider extends DeviceProvider {
  final SafeDevice? _mockSelectedDevice;
  final SensorReading? _mockReading;
  final String? _mockTelemetryError;
  final bool _mockTelemetryLoading;

  MockTelemetryDeviceProvider({
    required super.apiClient,
    SafeDevice? selectedDevice,
    SensorReading? reading,
    String? telemetryError,
    bool telemetryLoading = false,
  })  : _mockSelectedDevice = selectedDevice,
        _mockReading = reading,
        _mockTelemetryError = telemetryError,
        _mockTelemetryLoading = telemetryLoading;

  @override
  SafeDevice? get selectedDevice => _mockSelectedDevice;

  @override
  SensorReading? get latestReading => _mockReading;

  @override
  String? get telemetryErrorMessage => _mockTelemetryError;

  @override
  bool get isTelemetryLoading => _mockTelemetryLoading;

  @override
  List<ResolvedTelemetryField> get resolvedFields {
    return ResolvedTelemetryField.resolveFields(
      fieldMappings: _mockSelectedDevice?.fieldMappings,
      latestReading: _mockReading,
    );
  }

  @override
  Future<void> fetchDeviceTelemetry(String deviceId) async {
    // Override to avoid network call in tests
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
        home: TelemetryScreen(),
      ),
    );
  }

  group('TelemetryScreen Widget & State Tests', () {
    testWidgets('Renders empty state when no device is selected', (WidgetTester tester) async {
      final provider = MockTelemetryDeviceProvider(
        apiClient: apiClient,
        selectedDevice: null,
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('No Smart Bag Selected'), findsOneWidget);
    });

    testWidgets('Renders real telemetry with dynamic semantic labels', (WidgetTester tester) async {
      final device = SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Smart Bag Alpha',
        thingSpeakChannelId: '3482393',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        fieldMappings: [
          FieldMapping(
            fieldNumber: 1,
            fieldKey: 'field1',
            label: 'Cold Compartment',
            metric: 'temperature',
            zone: 'cold',
            unit: '°C',
          ),
          FieldMapping(
            fieldNumber: 2,
            fieldKey: 'field2',
            label: 'Hot Compartment',
            metric: 'temperature',
            zone: 'hot',
            unit: '°C',
          ),
        ],
      );

      final reading = SensorReading(
        id: 'r-1',
        deviceId: 'dev-1',
        thingSpeakEntryId: 12,
        fieldValues: {
          'field1': 4.5,
          'field2': 42.1,
        },
        recordedAt: DateTime.now(),
      );

      final provider = MockTelemetryDeviceProvider(
        apiClient: apiClient,
        selectedDevice: device,
        reading: reading,
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Smart Bag Alpha'), findsOneWidget);
      expect(find.text('Code: BAG-01 · Channel: 3482393'), findsOneWidget);
      expect(find.text('Cold Compartment'), findsWidgets);
      expect(find.text('Hot Compartment'), findsWidgets);
      expect(find.text('4.5'), findsOneWidget);
      expect(find.text('42.1'), findsOneWidget);
    });

    testWidgets('Renders offline warning banner and historical telemetry badge', (WidgetTester tester) async {
      final device = SafeDevice(
        id: 'dev-offline',
        deviceCode: 'BAG-OFFLINE',
        name: 'Offline Smart Bag',
        thingSpeakChannelId: '99999',
        status: DeviceConnectivityStatus.offline,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final provider = MockTelemetryDeviceProvider(
        apiClient: apiClient,
        selectedDevice: device,
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('OFFLINE'), findsOneWidget);
      expect(find.text('Device Offline · Displaying historical telemetry'), findsOneWidget);
    });

    testWidgets('Renders telemetry error banner with retry button', (WidgetTester tester) async {
      final device = SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Smart Bag Alpha',
        thingSpeakChannelId: '3482393',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final provider = MockTelemetryDeviceProvider(
        apiClient: apiClient,
        selectedDevice: device,
        telemetryError: 'Failed to load telemetry readings: Timeout',
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Failed to load telemetry readings: Timeout'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('Tapping field card selects field for waveform inspection', (WidgetTester tester) async {
      final device = SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Smart Bag Alpha',
        thingSpeakChannelId: '3482393',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        fieldMappings: [
          FieldMapping(
            fieldNumber: 1,
            fieldKey: 'field1',
            label: 'Cold Compartment',
            metric: 'temperature',
            zone: 'cold',
            unit: '°C',
          ),
          FieldMapping(
            fieldNumber: 2,
            fieldKey: 'field2',
            label: 'Relative Humidity',
            metric: 'humidity',
            zone: 'none',
            unit: '%',
          ),
        ],
      );

      final provider = MockTelemetryDeviceProvider(
        apiClient: apiClient,
        selectedDevice: device,
        reading: SensorReading(
          id: 'r-1',
          deviceId: 'dev-1',
          thingSpeakEntryId: 1,
          fieldValues: {'field1': 5.0, 'field2': 60.0},
          recordedAt: DateTime.now(),
        ),
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Waveform'), findsOneWidget);

      await tester.tap(find.text('Relative Humidity').first, warnIfMissed: false);
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Waveform'), findsOneWidget);
    });
  });
}
