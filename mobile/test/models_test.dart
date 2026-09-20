import 'package:flutter_test/flutter_test.dart';
import 'package:infinos_mobile/models/device.dart';
import 'package:infinos_mobile/models/user.dart';

void main() {
  group('Model Serialization Tests', () {
    test('User.fromJson deserializes valid JSON', () {
      final json = {
        'id': 'usr-1',
        'name': 'Test Operator',
        'email': 'op@infinos.local',
        'role': 'OPERATOR',
        'createdAt': '2026-09-20T10:00:00.000Z',
      };

      final user = User.fromJson(json);
      expect(user.id, 'usr-1');
      expect(user.name, 'Test Operator');
      expect(user.email, 'op@infinos.local');
      expect(user.role, 'OPERATOR');
    });

    test('SafeDevice.fromJson parses status correctly', () {
      final json = {
        'id': 'dev-1',
        'deviceCode': 'BAG-01',
        'name': 'Smart Bag Alpha',
        'thingSpeakChannelId': '3482393',
        'status': 'ONLINE',
        'isArchived': false,
        'createdAt': '2026-09-20T10:00:00.000Z',
        'updatedAt': '2026-09-20T10:00:00.000Z',
      };

      final device = SafeDevice.fromJson(json);
      expect(device.deviceCode, 'BAG-01');
      expect(device.status, DeviceConnectivityStatus.online);
      expect(device.status.label, 'ONLINE');
    });
  });
}
