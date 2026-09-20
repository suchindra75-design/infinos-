import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:infinos_mobile/auth/auth_provider.dart';
import 'package:infinos_mobile/core/networking/api_client.dart';
import 'package:infinos_mobile/core/storage/secure_storage_service.dart';
import 'package:infinos_mobile/features/devices/device_provider.dart';
import 'package:infinos_mobile/features/devices/devices_screen.dart';
import 'package:infinos_mobile/models/device.dart';
import 'package:infinos_mobile/models/telemetry.dart';
import 'package:infinos_mobile/models/user.dart';

class MockManagementDeviceProvider extends DeviceProvider {
  final List<SafeDevice> _mockDevicesList;
  SafeDevice? _mockSelected;
  bool addCalled = false;
  bool updateCalled = false;
  bool deleteCalled = false;
  bool testConnectionCalled = false;
  bool syncCalled = false;

  MockManagementDeviceProvider({
    required super.apiClient,
    List<SafeDevice> devices = const [],
    SafeDevice? selectedDevice,
  })  : _mockDevicesList = List.from(devices),
        _mockSelected = selectedDevice;

  @override
  List<SafeDevice> get devices => _mockDevicesList;

  @override
  SafeDevice? get selectedDevice => _mockSelected;

  @override
  void selectDevice(SafeDevice device) {
    _mockSelected = device;
    notifyListeners();
  }

  @override
  Future<SafeDevice?> addDevice({
    required String deviceCode,
    required String name,
    required String thingSpeakChannelId,
    String? thingSpeakReadApiKey,
  }) async {
    addCalled = true;
    final newDev = SafeDevice(
      id: 'dev-new',
      deviceCode: deviceCode,
      name: name,
      thingSpeakChannelId: thingSpeakChannelId,
      status: DeviceConnectivityStatus.online,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    _mockDevicesList.add(newDev);
    selectDevice(newDev);
    return newDev;
  }

  @override
  Future<SafeDevice?> updateDevice(String deviceId, Map<String, dynamic> updateData) async {
    updateCalled = true;
    final index = _mockDevicesList.indexWhere((d) => d.id == deviceId);
    if (index != -1) {
      final updated = _mockDevicesList[index].copyWith(
        name: updateData['name'] as String? ?? _mockDevicesList[index].name,
        deviceCode: updateData['deviceCode'] as String? ?? _mockDevicesList[index].deviceCode,
      );
      _mockDevicesList[index] = updated;
      if (_mockSelected?.id == deviceId) {
        _mockSelected = updated;
      }
      notifyListeners();
      return updated;
    }
    return null;
  }

  @override
  Future<bool> deleteDevice(String deviceId) async {
    deleteCalled = true;
    _mockDevicesList.removeWhere((d) => d.id == deviceId);
    if (_mockSelected?.id == deviceId) {
      _mockSelected = _mockDevicesList.isNotEmpty ? _mockDevicesList.first : null;
    }
    notifyListeners();
    return true;
  }

  @override
  Future<Map<String, dynamic>> testConnection({
    required String thingSpeakChannelId,
    String? thingSpeakReadApiKey,
  }) async {
    testConnectionCalled = true;
    return {'success': true, 'message': 'Channel 3482393 reachable'};
  }

  @override
  Future<bool> syncDevice(String deviceId) async {
    syncCalled = true;
    return true;
  }
}

class MockManagementAuthProvider extends AuthProvider {
  final User? _mockUser;

  MockManagementAuthProvider({
    required super.apiClient,
    required super.storageService,
    User? user,
  }) : _mockUser = user;

  @override
  User? get user => _mockUser;

  @override
  AuthStatus get status => _mockUser != null ? AuthStatus.authenticated : AuthStatus.unauthenticated;
}

void main() {
  late SecureStorageService storageService;
  late ApiClient apiClient;

  setUp(() {
    storageService = SecureStorageService();
    apiClient = ApiClient(storageService: storageService);
  });

  Widget buildTestableWidget({
    required DeviceProvider deviceProvider,
    required AuthProvider authProvider,
  }) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
        ChangeNotifierProvider<DeviceProvider>.value(value: deviceProvider),
      ],
      child: const MaterialApp(
        home: DevicesScreen(),
      ),
    );
  }

  group('Device Management Integration & Permission Tests', () {
    testWidgets('1. Admin role sees Add Device action button', (WidgetTester tester) async {
      final adminUser = User(id: 'u-1', name: 'Admin', email: 'admin@infinos.com', role: 'ADMIN');
      final authProvider = MockManagementAuthProvider(apiClient: apiClient, storageService: storageService, user: adminUser);
      final deviceProvider = MockManagementDeviceProvider(apiClient: apiClient, devices: []);

      await tester.pumpWidget(buildTestableWidget(deviceProvider: deviceProvider, authProvider: authProvider));
      await tester.pumpAndSettle();

      expect(find.byTooltip('Add Smart Bag'), findsOneWidget);
    });

    testWidgets('2. Viewer role hides Add Device action button', (WidgetTester tester) async {
      final viewerUser = User(id: 'u-2', name: 'Viewer', email: 'viewer@infinos.com', role: 'VIEWER');
      final authProvider = MockManagementAuthProvider(apiClient: apiClient, storageService: storageService, user: viewerUser);
      final deviceProvider = MockManagementDeviceProvider(apiClient: apiClient, devices: []);

      await tester.pumpWidget(buildTestableWidget(deviceProvider: deviceProvider, authProvider: authProvider));
      await tester.pumpAndSettle();

      expect(find.byTooltip('Add Smart Bag'), findsNothing);
    });

    testWidgets('3. Opening Add Device modal renders form fields and validates inputs', (WidgetTester tester) async {
      final adminUser = User(id: 'u-1', name: 'Admin', email: 'admin@infinos.com', role: 'ADMIN');
      final authProvider = MockManagementAuthProvider(apiClient: apiClient, storageService: storageService, user: adminUser);
      final deviceProvider = MockManagementDeviceProvider(apiClient: apiClient, devices: []);

      await tester.pumpWidget(buildTestableWidget(deviceProvider: deviceProvider, authProvider: authProvider));
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('Add Smart Bag'));
      await tester.pumpAndSettle();

      expect(find.text('Link New Smart Bag'), findsOneWidget);
      expect(find.text('Save Device'), findsOneWidget);

      await tester.tap(find.text('Save Device'));
      await tester.pumpAndSettle();

      expect(find.text('Device code must be at least 2 characters'), findsOneWidget);
      expect(find.text('Device name must be at least 2 characters'), findsOneWidget);
      expect(find.text('ThingSpeak Channel ID is required'), findsOneWidget);
    });

    testWidgets('4. Submitting valid form calls addDevice and updates state', (WidgetTester tester) async {
      final adminUser = User(id: 'u-1', name: 'Admin', email: 'admin@infinos.com', role: 'ADMIN');
      final authProvider = MockManagementAuthProvider(apiClient: apiClient, storageService: storageService, user: adminUser);
      final deviceProvider = MockManagementDeviceProvider(apiClient: apiClient, devices: []);

      await tester.pumpWidget(buildTestableWidget(deviceProvider: deviceProvider, authProvider: authProvider));
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('Add Smart Bag'));
      await tester.pumpAndSettle();

      await tester.enterText(find.widgetWithText(TextFormField, 'Device Code (e.g. BAG-03)'), 'BAG-03');
      await tester.enterText(find.widgetWithText(TextFormField, 'Device Name (e.g. Vaccine Carrier Beta)'), 'Pharma Bag Gamma');
      await tester.enterText(find.widgetWithText(TextFormField, 'ThingSpeak Channel ID (e.g. 3482393)'), '3482393');

      await tester.tap(find.text('Save Device'));
      await tester.pumpAndSettle();

      expect(deviceProvider.addCalled, isTrue);
      expect(deviceProvider.devices.length, 1);
      expect(deviceProvider.selectedDevice?.deviceCode, 'BAG-03');
    });

    testWidgets('5. Test Connection button invokes provider testConnection method', (WidgetTester tester) async {
      final adminUser = User(id: 'u-1', name: 'Admin', email: 'admin@infinos.com', role: 'ADMIN');
      final authProvider = MockManagementAuthProvider(apiClient: apiClient, storageService: storageService, user: adminUser);
      final deviceProvider = MockManagementDeviceProvider(apiClient: apiClient, devices: []);

      await tester.pumpWidget(buildTestableWidget(deviceProvider: deviceProvider, authProvider: authProvider));
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('Add Smart Bag'));
      await tester.pumpAndSettle();

      await tester.enterText(find.widgetWithText(TextFormField, 'ThingSpeak Channel ID (e.g. 3482393)'), '3482393');
      await tester.tap(find.text('Test Channel'));
      await tester.pumpAndSettle();

      expect(deviceProvider.testConnectionCalled, isTrue);
      expect(find.text('Channel 3482393 reachable'), findsOneWidget);
    });

    testWidgets('6. Device detail info icon opens modal displaying details and field mappings', (WidgetTester tester) async {
      final sampleDevice = SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Cooler Alpha',
        thingSpeakChannelId: '3482393',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        fieldMappings: [
          FieldMapping(fieldNumber: 1, fieldKey: 'field1', label: 'Core Temp', unit: '°C', metric: 'temperature', zone: 'cold'),
        ],
      );

      final adminUser = User(id: 'u-1', name: 'Admin', email: 'admin@infinos.com', role: 'ADMIN');
      final authProvider = MockManagementAuthProvider(apiClient: apiClient, storageService: storageService, user: adminUser);
      final deviceProvider = MockManagementDeviceProvider(apiClient: apiClient, devices: [sampleDevice], selectedDevice: sampleDevice);

      await tester.pumpWidget(buildTestableWidget(deviceProvider: deviceProvider, authProvider: authProvider));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.info_outline_rounded));
      await tester.pumpAndSettle();

      expect(find.text('Cooler Alpha'), findsWidgets);
      expect(find.text('Code: BAG-01 · ID: dev-1'), findsOneWidget);
      expect(find.text('Core Temp'), findsOneWidget);
      expect(find.text('Sync'), findsOneWidget);
      expect(find.text('Test'), findsOneWidget);
    });

    testWidgets('7. Delete action in device detail triggers confirmation dialog', (WidgetTester tester) async {
      final sampleDevice = SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Cooler Alpha',
        thingSpeakChannelId: '3482393',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final adminUser = User(id: 'u-1', name: 'Admin', email: 'admin@infinos.com', role: 'ADMIN');
      final authProvider = MockManagementAuthProvider(apiClient: apiClient, storageService: storageService, user: adminUser);
      final deviceProvider = MockManagementDeviceProvider(apiClient: apiClient, devices: [sampleDevice], selectedDevice: sampleDevice);

      await tester.pumpWidget(buildTestableWidget(deviceProvider: deviceProvider, authProvider: authProvider));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.info_outline_rounded));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.delete_outline_rounded));
      await tester.pumpAndSettle();

      expect(find.text('Delete Cooler Alpha?'), findsOneWidget);

      await tester.tap(find.widgetWithText(ElevatedButton, 'Delete'));
      await tester.pumpAndSettle();

      expect(deviceProvider.deleteCalled, isTrue);
      expect(deviceProvider.devices, isEmpty);
    });
  });
}
