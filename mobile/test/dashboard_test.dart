import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:infinos_mobile/auth/auth_provider.dart';
import 'package:infinos_mobile/core/networking/api_client.dart';
import 'package:infinos_mobile/core/storage/secure_storage_service.dart';
import 'package:infinos_mobile/features/dashboard/dashboard_screen.dart';
import 'package:infinos_mobile/features/devices/device_provider.dart';
import 'package:infinos_mobile/models/device.dart';

class MockDeviceProvider extends DeviceProvider {
  final bool mockLoading;
  final String? mockError;

  MockDeviceProvider({
    required super.apiClient,
    this.mockLoading = false,
    this.mockError,
  });

  @override
  bool get isLoading => mockLoading;

  @override
  String? get errorMessage => mockError;

  @override
  Future<void> fetchDevices() async {
    // Override to prevent network calls in widget test
  }
}

void main() {
  late SecureStorageService storageService;
  late ApiClient apiClient;

  setUp(() {
    storageService = SecureStorageService();
    apiClient = ApiClient(storageService: storageService);
  });

  Widget buildTestableWidget({
    required AuthProvider authProvider,
    required DeviceProvider deviceProvider,
  }) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
        ChangeNotifierProvider<DeviceProvider>.value(value: deviceProvider),
      ],
      child: const MaterialApp(
        home: DashboardScreen(),
      ),
    );
  }

  group('Dashboard State & Rendering Tests', () {
    testWidgets('Renders Fleet Overview header and user greeting', (WidgetTester tester) async {
      final authProvider = AuthProvider(apiClient: apiClient, storageService: storageService);
      final deviceProvider = MockDeviceProvider(apiClient: apiClient);

      await tester.pumpWidget(
        buildTestableWidget(
          authProvider: authProvider,
          deviceProvider: deviceProvider,
        ),
      );

      expect(find.text('Fleet Overview'), findsOneWidget);
      expect(find.text('Registered Smart Bags'), findsOneWidget);
      expect(find.text('Total Bags'), findsOneWidget);
      expect(find.text('Online'), findsOneWidget);
      expect(find.text('Offline'), findsOneWidget);
    });

    testWidgets('Renders empty state when zero devices are registered', (WidgetTester tester) async {
      final authProvider = AuthProvider(apiClient: apiClient, storageService: storageService);
      final deviceProvider = MockDeviceProvider(apiClient: apiClient, mockLoading: false);

      await tester.pumpWidget(
        buildTestableWidget(
          authProvider: authProvider,
          deviceProvider: deviceProvider,
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('No Smart Bags Registered'), findsOneWidget);
    });

    testWidgets('Renders OFFLINE state warning when selected device is offline', (WidgetTester tester) async {
      final offlineDevice = SafeDevice(
        id: 'dev-offline',
        deviceCode: 'BAG-OFFLINE',
        name: 'Offline Smart Bag',
        thingSpeakChannelId: '9999',
        status: DeviceConnectivityStatus.offline,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final authProvider = AuthProvider(apiClient: apiClient, storageService: storageService);
      final deviceProvider = MockDeviceProvider(apiClient: apiClient, mockLoading: false);

      // Select device manually
      deviceProvider.selectDevice(offlineDevice);

      await tester.pumpWidget(
        buildTestableWidget(
          authProvider: authProvider,
          deviceProvider: deviceProvider,
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('OFFLINE'), findsWidgets);
      expect(find.text('Device Offline — Displaying Stored History from PostgreSQL'), findsOneWidget);
    });
  });
}
