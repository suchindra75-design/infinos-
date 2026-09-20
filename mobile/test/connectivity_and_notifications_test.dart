import 'package:flutter_test/flutter_test.dart';
import 'package:infinos_mobile/core/networking/connectivity_service.dart';
import 'package:infinos_mobile/core/notifications/notification_service.dart';
import 'package:infinos_mobile/models/alert.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ConnectivityService Tests', () {
    test('Initial state is online by default', () {
      final service = ConnectivityService();
      expect(service.isOnline, isTrue);
      expect(service.isOffline, isFalse);
    });

    test('reconnect callbacks registered and fired', () {
      final service = ConnectivityService();
      int reconnectCount = 0;
      service.addOnReconnect(() {
        reconnectCount++;
      });

      service.notifyListeners();
      expect(reconnectCount, equals(1));

      service.removeOnReconnect(() {});
      service.dispose();
    });
  });

  group('NotificationService Tests', () {
    test('NotificationService singleton instance and initialization state', () {
      final service1 = NotificationService();
      final service2 = NotificationService();
      expect(identical(service1, service2), isTrue);
      expect(service1.initialized, isFalse);
    });

    test('Alert deduplication and markAllAsNotified', () {
      final service = NotificationService();
      final alert1 = SafeAlert(
        id: 'alert-101',
        deviceId: 'dev-1',
        type: 'TEMP_HIGH',
        severity: 'CRITICAL',
        message: 'High temperature detected',
        triggeredAt: DateTime.now(),
        isResolved: false,
      );
      final alert2 = SafeAlert(
        id: 'alert-102',
        deviceId: 'dev-1',
        type: 'SENSOR_FAULT',
        severity: 'WARNING',
        message: 'Sensor offline',
        triggeredAt: DateTime.now(),
        isResolved: false,
      );

      service.markAllAsNotified([alert1, alert2]);
      expect(service.notifiedCount, equals(2));

      // Attempting to show an already-notified alert should return false
      service.showAlertNotification(alert1).then((result) {
        expect(result, isFalse);
      });
    });

    test('clearAll resets notification count', () async {
      final service = NotificationService();
      service.markAsNotified('alert-301');
      expect(service.notifiedCount, greaterThan(0));

      await service.clearAll();
      expect(service.notifiedCount, equals(0));
    });
  });
}
