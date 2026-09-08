import { DeviceStatus } from '@prisma/client';

export interface SafeDevice {
  id: string;
  deviceCode: string;
  name: string;
  thingSpeakChannelId: string;
  status: DeviceStatus;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string | null;
  hasApiKey: boolean;
}

export interface DeviceStatusResponse {
  id: string;
  deviceCode: string;
  name: string;
  status: DeviceStatus;
  lastSeenAt: Date | null;
  hasSyncReadings: boolean;
  message: string;
}

export interface ConnectionTestResult {
  connectionStatus: 'CONNECTED' | 'CHANNEL_FOUND' | 'OFFLINE' | 'UNREACHABLE' | 'CONFIGURED';
  channelId: string;
  isPrivate?: boolean;
  channelName?: string;
  message: string;
}
