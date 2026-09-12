export interface ThingSpeakChannelMeta {
  id: number;
  name: string;
  description?: string;
  latitude?: string;
  longitude?: string;
  field1?: string;
  field2?: string;
  field3?: string;
  field4?: string;
  field5?: string;
  field6?: string;
  field7?: string;
  field8?: string;
  created_at: string;
  updated_at: string;
  last_entry_id?: number;
}

export interface ThingSpeakRawFeed {
  created_at: string;
  entry_id: number;
  field1?: string | null;
  field2?: string | null;
  field3?: string | null;
  field4?: string | null;
  field5?: string | null;
  field6?: string | null;
  field7?: string | null;
  field8?: string | null;
}

export interface ThingSpeakFeedsResponse {
  channel: ThingSpeakChannelMeta;
  feeds: ThingSpeakRawFeed[];
}

export interface NormalizedSensorReading {
  entryId: number;
  channelId: string | number;
  recordedAt: string;
  coldTemperature: number | null; // Legacy Field 1
  hotTemperature: number | null;  // Legacy Field 3
  humidity: number | null;        // Legacy Field 4
  fieldValues?: Record<string, number | null>; // Dynamic raw field values map ("field1", "field2", etc.)
}

export interface ThingSpeakConnectionResult {
  connected: boolean;
  connectionStatus?: 'CONNECTED' | 'UNREACHABLE' | 'CONFIGURED' | 'OFFLINE';
  channelId: string;
  channelName?: string;
  message: string;
  discoveredFields?: import('./mapping.types.js').DeviceFieldMapping[];
}

export interface GetFeedsOptions {
  readApiKey?: string | null;
  limit?: number;
  from?: string;
  to?: string;
  fieldMappings?: import('./mapping.types.js').DeviceFieldMapping[] | null;
}
