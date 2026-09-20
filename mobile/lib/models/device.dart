import 'telemetry.dart';

enum DeviceConnectivityStatus {
  online,
  stale,
  offline;

  String get label {
    switch (this) {
      case DeviceConnectivityStatus.online:
        return 'ONLINE';
      case DeviceConnectivityStatus.stale:
        return 'STALE';
      case DeviceConnectivityStatus.offline:
        return 'OFFLINE';
    }
  }

  static DeviceConnectivityStatus fromString(String? val) {
    if (val == null) return DeviceConnectivityStatus.offline;
    switch (val.toUpperCase()) {
      case 'ONLINE':
        return DeviceConnectivityStatus.online;
      case 'STALE':
        return DeviceConnectivityStatus.stale;
      case 'OFFLINE':
      default:
        return DeviceConnectivityStatus.offline;
    }
  }
}

class SafeDevice {
  final String id;
  final String deviceCode;
  final String name;
  final String thingSpeakChannelId;
  final List<FieldMapping>? fieldMappings;
  final DeviceConnectivityStatus status;
  final bool isArchived;
  final DateTime? lastSeenAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? ownerId;
  final bool hasApiKey;

  SafeDevice({
    required this.id,
    required this.deviceCode,
    required this.name,
    required this.thingSpeakChannelId,
    this.fieldMappings,
    required this.status,
    this.isArchived = false,
    this.lastSeenAt,
    required this.createdAt,
    required this.updatedAt,
    this.ownerId,
    this.hasApiKey = false,
  });

  factory SafeDevice.fromJson(Map<String, dynamic> json) {
    List<FieldMapping>? mappings;
    if (json['fieldMappings'] is List) {
      mappings = (json['fieldMappings'] as List)
          .map((item) => FieldMapping.fromJson(item as Map<String, dynamic>))
          .toList();
    }

    return SafeDevice(
      id: json['id'] as String,
      deviceCode: json['deviceCode'] as String,
      name: json['name'] as String? ?? json['deviceCode'] as String,
      thingSpeakChannelId: json['thingSpeakChannelId'] as String? ?? '',
      fieldMappings: mappings,
      status: DeviceConnectivityStatus.fromString(json['status'] as String?),
      isArchived: json['isArchived'] as bool? ?? false,
      lastSeenAt: json['lastSeenAt'] != null
          ? DateTime.tryParse(json['lastSeenAt'] as String)
          : null,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ?? DateTime.now(),
      ownerId: json['ownerId'] as String?,
      hasApiKey: json['hasApiKey'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'deviceCode': deviceCode,
      'name': name,
      'thingSpeakChannelId': thingSpeakChannelId,
      'fieldMappings': fieldMappings?.map((m) => m.toJson()).toList(),
      'status': status.label,
      'isArchived': isArchived,
      'lastSeenAt': lastSeenAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'ownerId': ownerId,
      'hasApiKey': hasApiKey,
    };
  }

  SafeDevice copyWith({
    String? id,
    String? deviceCode,
    String? name,
    String? thingSpeakChannelId,
    List<FieldMapping>? fieldMappings,
    DeviceConnectivityStatus? status,
    bool? isArchived,
    DateTime? lastSeenAt,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? ownerId,
    bool? hasApiKey,
  }) {
    return SafeDevice(
      id: id ?? this.id,
      deviceCode: deviceCode ?? this.deviceCode,
      name: name ?? this.name,
      thingSpeakChannelId: thingSpeakChannelId ?? this.thingSpeakChannelId,
      fieldMappings: fieldMappings ?? this.fieldMappings,
      status: status ?? this.status,
      isArchived: isArchived ?? this.isArchived,
      lastSeenAt: lastSeenAt ?? this.lastSeenAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      ownerId: ownerId ?? this.ownerId,
      hasApiKey: hasApiKey ?? this.hasApiKey,
    );
  }
}
