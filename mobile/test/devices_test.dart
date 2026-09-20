import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:infinos_mobile/core/networking/api_client.dart';
import 'package:infinos_mobile/core/storage/secure_storage_service.dart';
import 'package:infinos_mobile/features/devices/device_provider.dart';
import 'package:infinos_mobile/features/devices/devices_screen.dart';
import 'package:infinos_mobile/models/device.dart';

class MockDevicesDeviceProvider extends DeviceProvider {
  final List<SafeDevice> mockDevicesList;
  final bool mockLoading;
  final String? mockError;

  MockDevicesDeviceProvider({
    required super.apiClient,
    this.mockDevicesList = const [],
    this.mockLoading = false,
    this.mockError,
  });

  @override
  List<SafeDevice> get devices => mockDevicesList;

  @override
  bool get isLoading => mockLoading;

  @override
  String? get errorMessage => mockError;

  @override
  Future<void> fetchDevices() async {
    // Override to prevent network requests in widget test
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
        home: DevicesScreen(),
      ),
    );
  }

  group('DevicesScreen Widget & State Tests', () {
    testWidgets('Renders header and multiple devices correctly', (WidgetTester tester) async {
      final device1 = SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Smart Bag Alpha',
        thingSpeakChannelId: '10001',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final device2 = SafeDevice(
        id: 'dev-2',
        deviceCode: 'BAG-02',
        name: 'Smart Bag Beta',
        thingSpeakChannelId: '10002',
        status: DeviceConnectivityStatus.offline,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final deviceProvider = MockDevicesDeviceProvider(
        apiClient: apiClient,
        mockDevicesList: [device1, device2],
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: deviceProvider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Smart Bags Fleet'), findsOneWidget);
      expect(find.text('Registered Devices (2)'), findsOneWidget);
      expect(find.text('Smart Bag Alpha'), findsOneWidget);
      expect(find.text('Smart Bag Beta'), findsOneWidget);
      expect(find.text('ONLINE'), findsOneWidget);
      expect(find.text('OFFLINE'), findsOneWidget);
    });

    testWidgets('Renders empty state when zero devices exist', (WidgetTester tester) async {
      final deviceProvider = MockDevicesDeviceProvider(
        apiClient: apiClient,
        mockDevicesList: [],
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: deviceProvider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('No Smart Bags Registered'), findsOneWidget);
    });

    testWidgets('Renders API error banner and retry button on failure', (WidgetTester tester) async {
      final deviceProvider = MockDevicesDeviceProvider(
        apiClient: apiClient,
        mockError: 'Failed to connect to backend: Timeout',
      );

      await tester.pumpWidget(buildTestableWidget(deviceProvider: deviceProvider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Failed to connect to backend: Timeout'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('Tapping device selects device and shows Active badge', (WidgetTester tester) async {
      final device1 = SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Smart Bag Alpha',
        thingSpeakChannelId: '10001',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final deviceProvider = MockDevicesDeviceProvider(
        apiClient: apiClient,
        mockDevicesList: [device1],
      );
      deviceProvider.selectDevice(device1);

      await tester.pumpWidget(buildTestableWidget(deviceProvider: deviceProvider));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Active'), findsOneWidget);
      expect(find.text('Smart Bag Alpha'), findsOneWidget);
    });
  });
}
