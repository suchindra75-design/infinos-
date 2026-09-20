// Alert data model matching the backend Prisma Alert schema.
// Fields map directly to the API response from GET /api/v1/alerts.

class AlertSeverity {
  static const String info = 'INFO';
  static const String warning = 'WARNING';
  static const String critical = 'CRITICAL';

  static String label(String severity) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'CRITICAL';
      case 'WARNING':
        return 'WARNING';
      case 'INFO':
        return 'INFO';
      default:
        return severity.toUpperCase();
    }
  }
}

class AlertType {
  static const String coldTemperatureLow = 'COLD_TEMPERATURE_LOW';
  static const String coldTemperatureHigh = 'COLD_TEMPERATURE_HIGH';
  static const String hotTemperatureLow = 'HOT_TEMPERATURE_LOW';
  static const String hotTemperatureHigh = 'HOT_TEMPERATURE_HIGH';
  static const String humidityLow = 'HUMIDITY_LOW';
  static const String humidityHigh = 'HUMIDITY_HIGH';
  static const String deviceOffline = 'DEVICE_OFFLINE';
  static const String dataMissing = 'DATA_MISSING';

  /// Produces a human-readable label from the backend enum string.
  static String label(String type) {
    switch (type) {
      case coldTemperatureLow:
        return 'Cold Temp Low';
      case coldTemperatureHigh:
        return 'Cold Temp High';
      case hotTemperatureLow:
        return 'Hot Temp Low';
      case hotTemperatureHigh:
        return 'Hot Temp High';
      case humidityLow:
        return 'Humidity Low';
      case humidityHigh:
        return 'Humidity High';
      case deviceOffline:
        return 'Device Offline';
      case dataMissing:
        return 'Data Missing';
      default:
        return type.replaceAll('_', ' ');
    }
  }
}

class AlertDevice {
  final String id;
  final String deviceCode;
  final String name;
  final String? status;

  const AlertDevice({
    required this.id,
    required this.deviceCode,
    required this.name,
    this.status,
  });

  factory AlertDevice.fromJson(Map<String, dynamic> json) {
    return AlertDevice(
      id: json['id'] as String,
      deviceCode: json['deviceCode'] as String,
      name: json['name'] as String? ?? json['deviceCode'] as String,
      status: json['status'] as String?,
    );
  }
}

class SafeAlert {
  final String id;
  final String deviceId;
  final String type;
  final String severity;
  final String message;
  final double? triggerValue;
  final double? thresholdValue;
  final DateTime triggeredAt;
  final DateTime? acknowledgedAt;
  final bool isResolved;
  final DateTime? resolvedAt;
  final AlertDevice? device;
  final String? resolvedByName;

  SafeAlert({
    required this.id,
    required this.deviceId,
    required this.type,
    required this.severity,
    required this.message,
    this.triggerValue,
    this.thresholdValue,
    required this.triggeredAt,
    this.acknowledgedAt,
    required this.isResolved,
    this.resolvedAt,
    this.device,
    this.resolvedByName,
  });

  factory SafeAlert.fromJson(Map<String, dynamic> json) {
    AlertDevice? device;
    if (json['device'] is Map<String, dynamic>) {
      device = AlertDevice.fromJson(json['device'] as Map<String, dynamic>);
    }

    String? resolvedByName;
    if (json['resolvedBy'] is Map<String, dynamic>) {
      resolvedByName = (json['resolvedBy'] as Map<String, dynamic>)['name'] as String?;
    }

    return SafeAlert(
      id: json['id'] as String,
      deviceId: json['deviceId'] as String,
      type: json['type'] as String? ?? 'UNKNOWN',
      severity: json['severity'] as String? ?? 'INFO',
      message: json['message'] as String? ?? '',
      triggerValue: (json['triggerValue'] as num?)?.toDouble(),
      thresholdValue: (json['thresholdValue'] as num?)?.toDouble(),
      triggeredAt: DateTime.tryParse(json['triggeredAt'] as String? ?? '') ?? DateTime.now(),
      acknowledgedAt: json['acknowledgedAt'] != null
          ? DateTime.tryParse(json['acknowledgedAt'] as String)
          : null,
      isResolved: json['isResolved'] as bool? ?? false,
      resolvedAt: json['resolvedAt'] != null
          ? DateTime.tryParse(json['resolvedAt'] as String)
          : null,
      device: device,
      resolvedByName: resolvedByName,
    );
  }
}
