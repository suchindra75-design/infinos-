export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DeviceStatus = 'ONLINE' | 'STALE' | 'OFFLINE';

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

export interface SafeDevice {
  id: string;
  deviceCode: string;
  name: string;
  thingSpeakChannelId: string;
  fieldMappings?: DeviceFieldMapping[] | null;
  status: DeviceStatus;
  isArchived?: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string | null;
  hasApiKey: boolean;
}

export interface DeviceStatusResponse {
  deviceId: string;
  deviceCode: string;
  status: DeviceStatus;
  lastSeenAt: string | null;
  secondsSinceLastSeen: number | null;
  isOnline: boolean;
  message: string;
}

export interface SensorReading {
  id: string;
  thingSpeakEntryId: number;
  recordedAt: string;
  coldTemperature: number | null;
  hotTemperature: number | null;
  humidity: number | null;
  fieldValues?: Record<string, number | null>;
}

export interface MetricSummary {
  coldTemperature: number | null;
  hotTemperature: number | null;
  humidity: number | null;
}

export interface AnalyticsSummary {
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  status: DeviceStatus;
  readingCount: number;
  firstReadingTimestamp: string | null;
  latestReadingTimestamp: string | null;
  latest: MetricSummary;
  minimum: MetricSummary;
  maximum: MetricSummary;
  average: MetricSummary;
  activeAlertsCount: number;
}

export interface AnalyticsTimeseries {
  deviceId: string;
  deviceCode: string;
  fieldMappings?: DeviceFieldMapping[] | null;
  count: number;
  readings: SensorReading[];
}

export type AlertType =
  | 'COLD_TEMPERATURE_OUT_OF_RANGE'
  | 'HOT_TEMPERATURE_OUT_OF_RANGE'
  | 'HUMIDITY_OUT_OF_RANGE'
  | 'DEVICE_OFFLINE'
  | 'COMMUNICATION_ERROR';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Alert {
  id: string;
  deviceId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  triggerValue: number | null;
  thresholdValue: number | null;
  triggeredAt: string;
  acknowledgedAt: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
  device?: {
    deviceCode: string;
    name: string;
  };
}

export interface DeviceSettings {
  id: string;
  deviceId: string;
  coldTempMin: number;
  coldTempMax: number;
  hotTempMin: number;
  hotTempMax: number;
  humidityMin: number;
  humidityMax: number;
  alertsEnabled: boolean;
  hotWarningThreshold: number;
  hotCriticalThreshold: number;
  coldWarningThreshold: number;
  coldCriticalThreshold: number;
  humidityWarningThreshold: number;
  humidityCriticalThreshold: number;
  offlineTimeoutSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDeviceSettingsInput {
  coldTempMin?: number;
  coldTempMax?: number;
  hotTempMin?: number;
  hotTempMax?: number;
  humidityMin?: number;
  humidityMax?: number;
  alertsEnabled?: boolean;
}

export interface CreateDeviceInput {
  deviceCode: string;
  name: string;
  thingSpeakChannelId: string;
  thingSpeakReadApiKey?: string;
  fieldMappings?: DeviceFieldMapping[];
}

export interface ConnectionTestResult {
  connected: boolean;
  channelId: string;
  channelName?: string;
  message: string;
  discoveredFields?: DeviceFieldMapping[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
