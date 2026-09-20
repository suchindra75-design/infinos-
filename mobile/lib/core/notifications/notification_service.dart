import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../../models/alert.dart';

/// Handles local notification display for new alerts.
/// Deduplicates by alert ID, cleans up on logout.
/// Does NOT require backend push infrastructure.
class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();

  /// Set of alert IDs already shown as notifications — prevents re-firing
  final Set<String> _notifiedAlertIds = {};

  bool _initialized = false;
  bool get initialized => _initialized;

  /// Callback invoked when user taps a notification.
  /// The payload contains the alert ID for navigation.
  void Function(String? alertId)? onNotificationTap;

  Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwinSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const settings = InitializationSettings(
      android: androidSettings,
      iOS: darwinSettings,
      macOS: darwinSettings,
    );

    await _plugin.initialize(
      settings: settings,
      onDidReceiveNotificationResponse: _onNotificationResponse,
    );

    _initialized = true;
  }

  void _onNotificationResponse(NotificationResponse response) {
    final payload = response.payload;
    onNotificationTap?.call(payload);
  }

  /// Request notification permission on iOS/macOS/Android 13+.
  /// Returns true if permission was granted or already available.
  Future<bool> requestPermission() async {
    // iOS/macOS
    final darwin = _plugin
        .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>();
    if (darwin != null) {
      final granted = await darwin.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
      return granted ?? false;
    }

    // macOS
    final macOS = _plugin
        .resolvePlatformSpecificImplementation<MacOSFlutterLocalNotificationsPlugin>();
    if (macOS != null) {
      final granted = await macOS.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
      return granted ?? false;
    }

    // Android 13+ (API 33)
    final android = _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    if (android != null) {
      final granted = await android.requestNotificationsPermission();
      return granted ?? false;
    }

    return true; // Default to granted for other platforms
  }

  /// Shows a local notification for a new alert if not already notified.
  /// Returns true if the notification was shown.
  Future<bool> showAlertNotification(SafeAlert alert) async {
    if (!_initialized) return false;
    if (_notifiedAlertIds.contains(alert.id)) return false;

    _notifiedAlertIds.add(alert.id);

    final severityEmoji = switch (alert.severity.toUpperCase()) {
      'CRITICAL' => '🔴',
      'WARNING' => '🟡',
      _ => 'ℹ️',
    };

    final title = '$severityEmoji ${AlertType.label(alert.type)}';
    final body = alert.message.isNotEmpty
        ? alert.message
        : 'Alert triggered on ${alert.device?.name ?? 'device'}';

    const androidDetails = AndroidNotificationDetails(
      'infinos_alerts',
      'INFINOS Alerts',
      channelDescription: 'Notifications for INFINOS device alerts',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const darwinDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: darwinDetails,
      macOS: darwinDetails,
    );

    // Use hashCode of alert ID for a stable integer notification ID
    final notificationId = alert.id.hashCode;

    try {
      await _plugin.show(
        id: notificationId,
        title: title,
        body: body,
        notificationDetails: details,
        payload: alert.id,
      );
      return true;
    } catch (e) {
      debugPrint('NotificationService: Failed to show notification: $e');
      return false;
    }
  }

  /// Process a list of alerts and show notifications for new unresolved ones.
  Future<int> processAlerts(List<SafeAlert> alerts) async {
    int shown = 0;
    for (final alert in alerts) {
      if (!alert.isResolved && !_notifiedAlertIds.contains(alert.id)) {
        final didShow = await showAlertNotification(alert);
        if (didShow) shown++;
      }
    }
    return shown;
  }

  /// Clear notification state on logout / session expiry.
  Future<void> clearAll() async {
    _notifiedAlertIds.clear();
    if (_initialized) {
      try {
        await _plugin.cancelAll();
      } catch (e) {
        debugPrint('NotificationService: Failed to cancel notifications: $e');
      }
    }
  }

  /// Mark an alert ID as already notified (for pre-existing alerts on login).
  void markAsNotified(String alertId) {
    _notifiedAlertIds.add(alertId);
  }

  /// Mark all current alerts as notified (suppress re-notification on first fetch).
  void markAllAsNotified(List<SafeAlert> alerts) {
    for (final alert in alerts) {
      _notifiedAlertIds.add(alert.id);
    }
  }

  /// Number of unique alerts that have been notified this session.
  int get notifiedCount => _notifiedAlertIds.length;
}
