import { DeviceStatus } from '@prisma/client';
import { env } from '../config/env.js';

/**
 * Calculates real-time device connectivity status based on the timestamp of the latest valid reading (lastSeenAt).
 *
 * Threshold rules:
 * - Never synced (lastSeenAt is null/undefined/invalid): OFFLINE
 * - age <= onlineThresholdSeconds (default: 60s): ONLINE
 * - onlineThresholdSeconds < age <= staleThresholdSeconds (default: 180s): STALE
 * - age > staleThresholdSeconds: OFFLINE
 */
export function calculateDeviceStatus(
  lastSeenAt: Date | string | null | undefined,
  now: Date = new Date(),
  onlineThresholdSec: number = env.DEVICE_ONLINE_THRESHOLD_SECONDS,
  staleThresholdSec: number = env.DEVICE_STALE_THRESHOLD_SECONDS
): DeviceStatus {
  if (!lastSeenAt) {
    return DeviceStatus.OFFLINE;
  }

  const date = typeof lastSeenAt === 'string' ? new Date(lastSeenAt) : lastSeenAt;
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    return DeviceStatus.OFFLINE;
  }

  const ageSeconds = Math.max(0, (now.getTime() - timestamp) / 1000);

  if (ageSeconds <= onlineThresholdSec) {
    return DeviceStatus.ONLINE;
  }

  if (ageSeconds <= staleThresholdSec) {
    return DeviceStatus.STALE;
  }

  return DeviceStatus.OFFLINE;
}
