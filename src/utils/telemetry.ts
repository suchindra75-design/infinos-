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
        return { fieldNumber: num, fieldKey: key, label: `Field ${num}`, metric: 'other', zone: 'none', unit: '' };
      });
  }

  // 5. Fallback default if no device, summary, or readings are available
  return [
    { fieldNumber: 1, fieldKey: 'field1', label: 'Field 1', metric: 'other', zone: 'none', unit: '' },
    { fieldNumber: 2, fieldKey: 'field2', label: 'Field 2', metric: 'other', zone: 'none', unit: '' },
  ];
}

export function getFieldValue(
  fieldKey: string,
  fieldMapping: ResolvedField,
  reading?: SensorReading | null,
  summary?: AnalyticsSummary | null
): number | null {
  // 1. Check reading.fieldValues
  if (reading?.fieldValues) {
    let fv = reading.fieldValues as any;
    if (typeof fv === 'string') {
      try {
        fv = JSON.parse(fv);
      } catch {
        // ignore
      }
    }
    if (fv && typeof fv === 'object' && fv[fieldKey] !== undefined && fv[fieldKey] !== null) {
      const val = Number(fv[fieldKey]);
      if (Number.isFinite(val)) return val;
    }
  }

  // 2. Check summary.latestFieldValues
  if (summary?.latestFieldValues) {
    let lfv = summary.latestFieldValues as any;
    if (typeof lfv === 'string') {
      try {
        lfv = JSON.parse(lfv);
      } catch {
        // ignore
      }
    }
    if (lfv && typeof lfv === 'object' && lfv[fieldKey] !== undefined && lfv[fieldKey] !== null) {
      const val = Number(lfv[fieldKey]);
      if (Number.isFinite(val)) return val;
    }
  }

  // 3. Check summary.fieldSummaries
  if (summary?.fieldSummaries && summary.fieldSummaries[fieldKey]?.latest !== undefined && summary.fieldSummaries[fieldKey]?.latest !== null) {
    const val = Number(summary.fieldSummaries[fieldKey].latest);
    if (Number.isFinite(val)) return val;
  }

  // 4. Legacy/Standard column fallbacks
  const num = fieldMapping.fieldNumber || Number(fieldKey.replace('field', '')) || 0;

  const isCold =
    fieldMapping.zone === 'cold' ||
    fieldKey === 'field1' ||
    (num === 1 && fieldMapping.metric === 'temperature');

  const isHot =
    fieldMapping.zone === 'hot' ||
    fieldKey === 'field2' ||
    fieldKey === 'field3' ||
    ((num === 2 || num === 3) && fieldMapping.metric === 'temperature');

  const isHumidity =
    fieldMapping.metric === 'humidity' ||
    fieldKey === 'field4' ||
    num === 4;

  if (isCold) {
    if (reading?.coldTemperature != null) {
      const val = Number(reading.coldTemperature);
      if (Number.isFinite(val)) return val;
    }
    if (summary?.latest?.coldTemperature != null) {
      const val = Number(summary.latest.coldTemperature);
      if (Number.isFinite(val)) return val;
    }
  }

  if (isHot) {
    if (reading?.hotTemperature != null) {
      const val = Number(reading.hotTemperature);
      if (Number.isFinite(val)) return val;
    }
    if (summary?.latest?.hotTemperature != null) {
      const val = Number(summary.latest.hotTemperature);
      if (Number.isFinite(val)) return val;
    }
  }

  if (isHumidity) {
    if (reading?.humidity != null) {
      const val = Number(reading.humidity);
      if (Number.isFinite(val)) return val;
    }
    if (summary?.latest?.humidity != null) {
      const val = Number(summary.latest.humidity);
      if (Number.isFinite(val)) return val;
    }
  }

  return null;
}
