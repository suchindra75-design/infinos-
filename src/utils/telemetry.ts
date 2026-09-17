import { SafeDevice, AnalyticsSummary, SensorReading, FieldSummary } from '../types';

export interface ResolvedField {
  fieldNumber: number;
  fieldKey: string;
  label: string;
  metric: 'temperature' | 'humidity' | 'other';
  zone: 'cold' | 'hot' | 'ambient' | 'none';
  unit: string;
}

export function resolveDeviceFields(
  device?: SafeDevice | null,
  summary?: AnalyticsSummary | null,
  readings?: SensorReading[]
): ResolvedField[] {
  // 1. Device explicit fieldMappings
  if (device?.fieldMappings && Array.isArray(device.fieldMappings) && device.fieldMappings.length > 0) {
    return device.fieldMappings.map((m) => ({
      fieldNumber: m.fieldNumber,
      fieldKey: m.fieldKey,
      label: m.label,
      metric: m.metric || 'other',
      zone: m.zone || 'none',
      unit: m.unit || (m.metric === 'temperature' ? '°C' : m.metric === 'humidity' ? '%' : ''),
    }));
  }

  // 2. Summary explicit fieldMappings
  if (summary?.fieldMappings && Array.isArray(summary.fieldMappings) && summary.fieldMappings.length > 0) {
    return summary.fieldMappings.map((m) => ({
      fieldNumber: m.fieldNumber,
      fieldKey: m.fieldKey,
      label: m.label,
      metric: m.metric || 'other',
      zone: m.zone || 'none',
      unit: m.unit || (m.metric === 'temperature' ? '°C' : m.metric === 'humidity' ? '%' : ''),
    }));
  }

  // 3. Summary fieldSummaries
  if (summary?.fieldSummaries && typeof summary.fieldSummaries === 'object') {
    const keys = Object.keys(summary.fieldSummaries);
    if (keys.length > 0) {
      return keys
        .map((key) => {
          const fs: FieldSummary = summary.fieldSummaries![key];
          return {
            fieldNumber: fs.fieldNumber || Number(key.replace('field', '')) || 1,
            fieldKey: key,
            label: fs.label || `Field ${key.replace('field', '')}`,
            metric: fs.metric || 'other',
            zone: fs.zone || 'none',
            unit: fs.unit || (fs.metric === 'temperature' ? '°C' : fs.metric === 'humidity' ? '%' : ''),
          };
        })
        .sort((a, b) => a.fieldNumber - b.fieldNumber);
    }
  }

  // 4. Auto-discover from readings fieldValues
  const discoveredKeys = new Set<string>();
  if (readings && readings.length > 0) {
    readings.forEach((r) => {
      if (r.fieldValues && typeof r.fieldValues === 'object') {
        Object.keys(r.fieldValues).forEach((k) => {
          if (k.startsWith('field') && r.fieldValues![k] !== null && r.fieldValues![k] !== undefined) {
            discoveredKeys.add(k);
          }
        });
      }
    });
  }

  if (discoveredKeys.size > 0) {
    return Array.from(discoveredKeys)
      .sort((a, b) => (Number(a.replace('field', '')) || 0) - (Number(b.replace('field', '')) || 0))
      .map((key) => {
        const num = Number(key.replace('field', '')) || 1;
        if (key === 'field1')
          return { fieldNumber: 1, fieldKey: 'field1', label: 'Cold Compartment', metric: 'temperature', zone: 'cold', unit: '°C' };
        if (key === 'field3')
          return { fieldNumber: 3, fieldKey: 'field3', label: 'Hot Compartment', metric: 'temperature', zone: 'hot', unit: '°C' };
        if (key === 'field4')
          return { fieldNumber: 4, fieldKey: 'field4', label: 'Relative Humidity', metric: 'humidity', zone: 'ambient', unit: '%' };
        return { fieldNumber: num, fieldKey: key, label: `Field ${num}`, metric: 'other', zone: 'none', unit: '' };
      });
  }

  // 5. Default 3-field setup for standard cold-chain bag
  return [
    { fieldNumber: 1, fieldKey: 'field1', label: 'Cold Compartment', metric: 'temperature', zone: 'cold', unit: '°C' },
    { fieldNumber: 3, fieldKey: 'field3', label: 'Hot Compartment', metric: 'temperature', zone: 'hot', unit: '°C' },
    { fieldNumber: 4, fieldKey: 'field4', label: 'Relative Humidity', metric: 'humidity', zone: 'ambient', unit: '%' },
  ];
}

export function getFieldValue(
  fieldKey: string,
  fieldMapping: ResolvedField,
  reading?: SensorReading | null,
  summary?: AnalyticsSummary | null
): number | null {
  if (reading?.fieldValues && reading.fieldValues[fieldKey] !== undefined && reading.fieldValues[fieldKey] !== null) {
    const val = Number(reading.fieldValues[fieldKey]);
    if (Number.isFinite(val)) return val;
  }
  if (summary?.latestFieldValues && summary.latestFieldValues[fieldKey] !== undefined && summary.latestFieldValues[fieldKey] !== null) {
    const val = Number(summary.latestFieldValues[fieldKey]);
    if (Number.isFinite(val)) return val;
  }
  if (summary?.fieldSummaries && summary.fieldSummaries[fieldKey]?.latest !== undefined) {
    const val = summary.fieldSummaries[fieldKey].latest;
    if (val !== null && Number.isFinite(val)) return val;
  }
  if (fieldMapping.zone === 'cold' || (fieldKey === 'field1' && fieldMapping.metric === 'temperature')) {
    if (reading?.coldTemperature != null) return reading.coldTemperature;
    if (summary?.latest?.coldTemperature != null) return summary.latest.coldTemperature;
  }
  if (fieldMapping.zone === 'hot' || (fieldKey === 'field3' && fieldMapping.metric === 'temperature')) {
    if (reading?.hotTemperature != null) return reading.hotTemperature;
    if (summary?.latest?.hotTemperature != null) return summary.latest.hotTemperature;
  }
  if (fieldMapping.metric === 'humidity' || fieldKey === 'field4') {
    if (reading?.humidity != null) return reading.humidity;
    if (summary?.latest?.humidity != null) return summary.latest.humidity;
  }
  return null;
}
