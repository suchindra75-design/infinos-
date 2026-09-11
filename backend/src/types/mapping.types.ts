export type MetricType = 'temperature' | 'humidity' | 'other';
export type ZoneType = 'cold' | 'hot' | 'ambient' | 'none';

export interface DeviceFieldMapping {
  fieldNumber: number; // 1 to 8
  fieldKey: string;    // "field1", "field2", etc.
  label: string;       // e.g. "Cold Fold 1", "Humidity Rear"
  metric: MetricType;  // "temperature" | "humidity" | "other"
  zone?: ZoneType;     // "cold" | "hot" | "ambient" | "none"
  fold?: string;       // e.g. "1", "2", "3"
  unit: string;        // "°C", "°F", "%"
}
