import 'package:flutter_test/flutter_test.dart';
import 'package:infinos_mobile/models/telemetry.dart';

void main() {
  group('Dynamic Telemetry Model Tests', () {
    test('Resolves fields accurately when fieldMappings exist', () {
      final mappings = [
        FieldMapping(
          fieldNumber: 1,
          fieldKey: 'field1',
          label: 'Cold Compartment',
          metric: 'temperature',
          zone: 'cold',
          unit: '°C',
        ),
        FieldMapping(
          fieldNumber: 2,
          fieldKey: 'field2',
          label: 'Custom Pressure Sensor',
          metric: 'pressure',
          zone: 'none',
          unit: 'hPa',
        ),
      ];

      final reading = SensorReading(
        id: 'read-1',
        deviceId: 'dev-1',
        thingSpeakEntryId: 100,
        fieldValues: {
          'field1': 4.2,
          'field2': 1013.25,
        },
        recordedAt: DateTime.now(),
      );

      final resolved = ResolvedTelemetryField.resolveFields(
        fieldMappings: mappings,
        latestReading: reading,
      );

      expect(resolved.length, 2);
      expect(resolved[0].label, 'Cold Compartment');
      expect(resolved[0].value, 4.2);
      expect(resolved[0].unit, '°C');

      expect(resolved[1].label, 'Custom Pressure Sensor');
      expect(resolved[1].value, 1013.25);
      expect(resolved[1].unit, 'hPa');
    });

    test('Falls back gracefully without guessing field names when unmapped', () {
      final reading = SensorReading(
        id: 'read-2',
        deviceId: 'dev-1',
        thingSpeakEntryId: 101,
        fieldValues: {
          'field5': 12.5,
        },
        recordedAt: DateTime.now(),
      );

      final resolved = ResolvedTelemetryField.resolveFields(
        fieldMappings: null,
        latestReading: reading,
      );

      expect(resolved.length, 1);
      expect(resolved[0].label, 'Field 5');
      expect(resolved[0].value, 12.5);
    });
  });
}
