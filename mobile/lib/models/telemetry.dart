class FieldMapping {
  final int fieldNumber; // 1..8
  final String fieldKey;  // 'field1'..'field8'
  final String label;     // 'Cold Compartment', 'Hot Compartment', 'Relative Humidity', 'Field 1', etc.
  final String metric;    // 'temperature', 'humidity', 'voltage', 'pressure', 'other'
  final String zone;      // 'cold', 'hot', 'none'
  final String unit;      // '°C', '%', 'V', etc.

  FieldMapping({
    required this.fieldNumber,
    required this.fieldKey,
    required this.label,
    required this.metric,
    required this.zone,
    required this.unit,
  });

  factory FieldMapping.fromJson(Map<String, dynamic> json) {
    return FieldMapping(
      fieldNumber: json['fieldNumber'] as int? ?? 1,
      fieldKey: json['fieldKey'] as String? ?? 'field1',
      label: json['label'] as String? ?? 'Field ${json['fieldNumber'] ?? 1}',
      metric: json['metric'] as String? ?? 'other',
      zone: json['zone'] as String? ?? 'none',
      unit: json['unit'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'fieldNumber': fieldNumber,
      'fieldKey': fieldKey,
      'label': label,
      'metric': metric,
      'zone': zone,
      'unit': unit,
    };
  }
}

class SensorReading {
  final String id;
  final String deviceId;
  final int thingSpeakEntryId;
  final double? coldTemperature;
  final double? hotTemperature;
  final double? humidity;
  final Map<String, dynamic> fieldValues;
  final DateTime recordedAt;

  SensorReading({
    required this.id,
    required this.deviceId,
    required this.thingSpeakEntryId,
    this.coldTemperature,
    this.hotTemperature,
    this.humidity,
    required this.fieldValues,
    required this.recordedAt,
  });

  factory SensorReading.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic> fields = {};
    if (json['fieldValues'] is Map<String, dynamic>) {
      fields = Map<String, dynamic>.from(json['fieldValues']);
    }

    return SensorReading(
      id: json['id'] as String? ?? '',
      deviceId: json['deviceId'] as String? ?? '',
      thingSpeakEntryId: json['thingSpeakEntryId'] as int? ?? 0,
      coldTemperature: (json['coldTemperature'] as num?)?.toDouble(),
      hotTemperature: (json['hotTemperature'] as num?)?.toDouble(),
      humidity: (json['humidity'] as num?)?.toDouble(),
      fieldValues: fields,
      recordedAt: DateTime.tryParse(json['recordedAt'] as String? ?? '') ?? DateTime.now(),
    );
  }

  /// Helper to get numeric value for a specific field key (e.g. 'field1', 'field2')
  double? getValueForField(String fieldKey) {
    if (fieldValues.containsKey(fieldKey) && fieldValues[fieldKey] != null) {
      final val = fieldValues[fieldKey];
      if (val is num) return val.toDouble();
      if (val is String) return double.tryParse(val);
    }
    // Backward compatibility fallbacks if fieldValues map is absent:
    if (fieldKey == 'field1') return coldTemperature;
    if (fieldKey == 'field2' || fieldKey == 'field3') return hotTemperature;
    if (fieldKey == 'field4') return humidity;
    return null;
  }
}

class ResolvedTelemetryField {
  final String fieldKey;
  final String label;
  final double? value;
  final String unit;
  final String metric;
  final String zone;

  ResolvedTelemetryField({
    required this.fieldKey,
    required this.label,
    this.value,
    required this.unit,
    required this.metric,
    required this.zone,
  });

  /// Dynamic resolution logic preserving exact semantic labels from backend
  static List<ResolvedTelemetryField> resolveFields({
    required List<FieldMapping>? fieldMappings,
    required SensorReading? latestReading,
  }) {
    final List<ResolvedTelemetryField> resolved = [];

    if (fieldMappings != null && fieldMappings.isNotEmpty) {
      for (final mapping in fieldMappings) {
        final val = latestReading?.getValueForField(mapping.fieldKey);
        resolved.add(ResolvedTelemetryField(
          fieldKey: mapping.fieldKey,
          label: mapping.label,
          value: val,
          unit: mapping.unit,
          metric: mapping.metric,
          zone: mapping.zone,
        ));
      }
      return resolved;
    }

    // Default fallback when no fieldMappings provided:
    if (latestReading != null) {
      if (latestReading.fieldValues.isNotEmpty) {
        latestReading.fieldValues.forEach((key, rawVal) {
          double? numVal;
          if (rawVal is num) numVal = rawVal.toDouble();
          if (rawVal is String) numVal = double.tryParse(rawVal);

          resolved.add(ResolvedTelemetryField(
            fieldKey: key,
            label: _getFallbackLabel(key),
            value: numVal,
            unit: _getFallbackUnit(key),
            metric: _getFallbackMetric(key),
            zone: _getFallbackZone(key),
          ));
        });
        if (resolved.isNotEmpty) return resolved;
      }

      // Hard fallback if only standard cold/hot/humidity exist
      if (latestReading.coldTemperature != null) {
        resolved.add(ResolvedTelemetryField(
          fieldKey: 'field1',
          label: 'Cold Compartment',
          value: latestReading.coldTemperature,
          unit: '°C',
          metric: 'temperature',
          zone: 'cold',
        ));
      }
      if (latestReading.hotTemperature != null) {
        resolved.add(ResolvedTelemetryField(
          fieldKey: 'field2',
          label: 'Hot Compartment',
          value: latestReading.hotTemperature,
          unit: '°C',
          metric: 'temperature',
          zone: 'hot',
        ));
      }
      if (latestReading.humidity != null) {
        resolved.add(ResolvedTelemetryField(
          fieldKey: 'field3',
          label: 'Relative Humidity',
          value: latestReading.humidity,
          unit: '%',
          metric: 'humidity',
          zone: 'none',
        ));
      }
    }

    // If completely empty, return placeholders
    if (resolved.isEmpty) {
      resolved.addAll([
        ResolvedTelemetryField(fieldKey: 'field1', label: 'Field 1', unit: '°C', metric: 'temperature', zone: 'cold'),
        ResolvedTelemetryField(fieldKey: 'field2', label: 'Field 2', unit: '°C', metric: 'temperature', zone: 'hot'),
        ResolvedTelemetryField(fieldKey: 'field3', label: 'Field 3', unit: '%', metric: 'humidity', zone: 'none'),
      ]);
    }

    return resolved;
  }

  static String _getFallbackLabel(String key) {
    if (key == 'field1') return 'Cold Compartment';
    if (key == 'field2') return 'Hot Compartment';
    if (key == 'field3') return 'Relative Humidity';
    final match = RegExp(r'\d+').firstMatch(key);
    final num = match != null ? match.group(0) : key;
    return 'Field $num';
  }

  static String _getFallbackUnit(String key) {
    if (key == 'field1' || key == 'field2') return '°C';
    if (key == 'field3') return '%';
    return '';
  }

  static String _getFallbackMetric(String key) {
    if (key == 'field1' || key == 'field2') return 'temperature';
    if (key == 'field3') return 'humidity';
    return 'other';
  }

  static String _getFallbackZone(String key) {
    if (key == 'field1') return 'cold';
    if (key == 'field2') return 'hot';
    return 'none';
  }
}
