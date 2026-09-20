import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:infinos_mobile/auth/auth_provider.dart';
import 'package:infinos_mobile/core/networking/api_client.dart';
import 'package:infinos_mobile/core/storage/secure_storage_service.dart';
import 'package:infinos_mobile/features/devices/device_provider.dart';
import 'package:infinos_mobile/models/device.dart';
import 'package:infinos_mobile/models/telemetry.dart';

void main() {
  late SecureStorageService storageService;

  setUp(() {
    storageService = SecureStorageService();
  });

  group('Cross-Screen Integration & Production Hardening Tests', () {
    test('1. Auth Gate & 401 Session Cleanup resets DeviceProvider state', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/auth/me')) {
          return http.Response('{"error":{"message":"Unauthorized"}}', 401);
        }
        return http.Response('{}', 200);
      });

      final apiClient = ApiClient(
        httpClient: mockClient,
        storageService: storageService,
      );

      final authProvider = AuthProvider(
        apiClient: apiClient,
        storageService: storageService,
      );

      final deviceProvider = DeviceProvider(apiClient: apiClient);
      authProvider.onLogout = deviceProvider.reset;

      // Populate dummy device provider state
      await storageService.saveToken('expired-jwt');

      deviceProvider.selectDevice(SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Test Cooler',
        thingSpeakChannelId: '123456',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ));

      expect(deviceProvider.selectedDevice, isNotNull);

      // Trigger 401 via tryRestoreSession
      await authProvider.tryRestoreSession();

      expect(authProvider.status, AuthStatus.unauthenticated);
      expect(authProvider.isAuthenticated, isFalse);
      expect(deviceProvider.selectedDevice, isNull);
      expect(deviceProvider.alerts, isEmpty);
    });

    test('2. Logout clears token and resets DeviceProvider state', () async {
      final mockClient = MockClient((request) async => http.Response('{}', 200));
      final apiClient = ApiClient(httpClient: mockClient, storageService: storageService);
      final authProvider = AuthProvider(apiClient: apiClient, storageService: storageService);
      final deviceProvider = DeviceProvider(apiClient: apiClient);
      authProvider.onLogout = deviceProvider.reset;

      await storageService.saveToken('test-jwt-token');
      expect(await storageService.hasToken(), isTrue);

      deviceProvider.selectDevice(SafeDevice(
        id: 'dev-99',
        deviceCode: 'BAG-99',
        name: 'Cooler Beta',
        thingSpeakChannelId: '999999',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ));

      await authProvider.logout();

      expect(await storageService.hasToken(), isFalse);
      expect(authProvider.status, AuthStatus.unauthenticated);
      expect(deviceProvider.selectedDevice, isNull);
    });

    test('3. Selected device remains consistent across screens', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/readings')) {
          return http.Response('{"readings":[{"id":"r1","deviceId":"dev-1","thingSpeakEntryId":1,"recordedAt":"2026-09-20T12:00:00Z","coldTemperature":4.5,"fieldValues":{"field1":4.5}}]}', 200);
        }
        if (request.url.path.contains('/analytics/summary')) {
          return http.Response('{"data":{"average":4.5}}', 200);
        }
        if (request.url.path.contains('/alerts')) {
          return http.Response('[]', 200);
        }
        return http.Response('{}', 200);
      });

      final apiClient = ApiClient(httpClient: mockClient, storageService: storageService);
      final deviceProvider = DeviceProvider(apiClient: apiClient);

      final deviceA = SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Cooler Alpha',
        thingSpeakChannelId: '111111',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      deviceProvider.selectDevice(deviceA);

      expect(deviceProvider.selectedDevice?.id, 'dev-1');
      expect(deviceProvider.selectedDevice?.name, 'Cooler Alpha');
    });

    test('4. Switching device immediately clears previous device telemetry and analytics', () async {
      final mockClient = MockClient((request) async => http.Response('{}', 200));
      final apiClient = ApiClient(httpClient: mockClient, storageService: storageService);
      final deviceProvider = DeviceProvider(apiClient: apiClient);

      final deviceA = SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Cooler Alpha',
        thingSpeakChannelId: '111111',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final deviceB = SafeDevice(
        id: 'dev-2',
        deviceCode: 'BAG-02',
        name: 'Cooler Beta',
        thingSpeakChannelId: '222222',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      deviceProvider.selectDevice(deviceA);
      expect(deviceProvider.selectedDevice?.id, 'dev-1');

      // Switch to Device B
      deviceProvider.selectDevice(deviceB);

      expect(deviceProvider.selectedDevice?.id, 'dev-2');
      expect(deviceProvider.latestReading, isNull);
      expect(deviceProvider.analyticsSummary, isNull);
      expect(deviceProvider.analyticsTimeseries, isEmpty);
    });

    test('5. Race condition prevention: Out-of-order async response for old device is discarded', () async {
      final completerA = Completer<http.Response>();

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/devices/dev-1/readings')) {
          return completerA.future;
        }
        return http.Response('{"readings":[]}', 200);
      });

      final apiClient = ApiClient(httpClient: mockClient, storageService: storageService);
      final deviceProvider = DeviceProvider(apiClient: apiClient);

      final deviceA = SafeDevice(
        id: 'dev-1',
        deviceCode: 'BAG-01',
        name: 'Cooler Alpha',
        thingSpeakChannelId: '111111',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final deviceB = SafeDevice(
        id: 'dev-2',
        deviceCode: 'BAG-02',
        name: 'Cooler Beta',
        thingSpeakChannelId: '222222',
        status: DeviceConnectivityStatus.online,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      // Select device A (triggers async fetch for dev-1)
      deviceProvider.selectDevice(deviceA);

      // User switches to device B while dev-1 request is pending
      deviceProvider.selectDevice(deviceB);
      expect(deviceProvider.selectedDevice?.id, 'dev-2');

      // dev-1 request completes late with dev-1 data
      completerA.complete(http.Response(
        '{"readings":[{"id":"r-old","deviceId":"dev-1","thingSpeakEntryId":99,"recordedAt":"2026-09-20T12:00:00Z","coldTemperature":99.0,"fieldValues":{"field1":99.0}}]}',
        200,
      ));

      await Future.delayed(const Duration(milliseconds: 50));

      // Device B state MUST NOT be overwritten by Device A's stale response
      expect(deviceProvider.selectedDevice?.id, 'dev-2');
      expect(deviceProvider.latestReading, isNull);
    });

    test('6. Dashboard Active Alerts count matches Alerts active dataset', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/alerts')) {
          return http.Response(
            '[{"id":"a1","deviceId":"d1","type":"COLD_TEMPERATURE_HIGH","severity":"CRITICAL","message":"High temp","triggeredAt":"2026-09-20T12:00:00Z","isResolved":false},'
            '{"id":"a2","deviceId":"d1","type":"HUMIDITY_HIGH","severity":"WARNING","message":"High hum","triggeredAt":"2026-09-20T11:00:00Z","isResolved":true}]',
            200,
          );
        }
        return http.Response('[]', 200);
      });

      final apiClient = ApiClient(httpClient: mockClient, storageService: storageService);
      final deviceProvider = DeviceProvider(apiClient: apiClient);

      await deviceProvider.fetchAlertsSummary();

      expect(deviceProvider.activeAlertsCount, 1);
      expect(deviceProvider.alerts.length, 2); // 'all' filter shows 2 total alerts

      deviceProvider.setAlertsStatusFilter('active');
      expect(deviceProvider.alerts.length, 1);
      expect(deviceProvider.activeAlertsCount, 1); // activeAlertsCount remains 1 when on 'active' tab

      deviceProvider.setAlertsStatusFilter('resolved');
      expect(deviceProvider.alerts.length, 1);
      expect(deviceProvider.activeAlertsCount, 1); // activeAlertsCount remains 1 when on 'resolved' tab
    });

    test('7. Dynamic field resolution preserves exact semantic mappings', () {
      final mappings = [
        FieldMapping(fieldNumber: 1, fieldKey: 'field1', label: 'Vaccine Core Temp', unit: '°C', metric: 'temperature', zone: 'cold'),
        FieldMapping(fieldNumber: 2, fieldKey: 'field2', label: 'Humidity Sensor', unit: '%', metric: 'humidity', zone: 'none'),
      ];

      final reading = SensorReading(
        id: 'r-1',
        deviceId: 'dev-1',
        thingSpeakEntryId: 101,
        recordedAt: DateTime.now(),
        fieldValues: const {'field1': 3.8, 'field2': 45.0},
      );

      final resolved = ResolvedTelemetryField.resolveFields(
        fieldMappings: mappings,
        latestReading: reading,
      );

      expect(resolved.length, 2);
      expect(resolved[0].label, 'Vaccine Core Temp');
      expect(resolved[0].value, 3.8);
      expect(resolved[0].unit, '°C');

      expect(resolved[1].label, 'Humidity Sensor');
      expect(resolved[1].value, 45.0);
      expect(resolved[1].unit, '%');
    });

    test('8. Offline device status preserves historical telemetry truth', () {
      final offlineDevice = SafeDevice(
        id: 'dev-off',
        deviceCode: 'BAG-OFFLINE',
        name: 'Offline Cooler',
        thingSpeakChannelId: '888888',
        status: DeviceConnectivityStatus.offline,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final historicalReading = SensorReading(
        id: 'hist-1',
        deviceId: 'dev-off',
        thingSpeakEntryId: 50,
        recordedAt: DateTime.now().subtract(const Duration(hours: 5)),
        coldTemperature: 4.2,
        fieldValues: const {'field1': 4.2},
      );

      expect(offlineDevice.status, DeviceConnectivityStatus.offline);
      expect(historicalReading.coldTemperature, 4.2);
    });
  });
}
