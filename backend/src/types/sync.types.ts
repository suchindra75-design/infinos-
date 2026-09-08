import { DeviceStatus } from '@prisma/client';

export interface DeviceSyncResult {
  deviceId: string;
  deviceCode: string;
  channelId: string;
  success: boolean;
  newReadingsCount: number;
  latestRecordedAt: Date | null;
  status: DeviceStatus;
  isInitialSync?: boolean;
  message?: string;
  error?: string;
}

export interface DeviceSyncSummary {
  totalDevices: number;
  successfulSyncs: number;
  failedSyncs: number;
  newReadingsCount: number;
  results: DeviceSyncResult[];
  skipped?: boolean;
}
