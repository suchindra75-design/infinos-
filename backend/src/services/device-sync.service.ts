import crypto from 'node:crypto';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { thingspeakService } from './thingspeak.service.js';
import { decryptText } from '../utils/crypto.js';
import { calculateDeviceStatus } from '../utils/device-status.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/error.middleware.js';
import { alertService } from './alert.service.js';
import { DeviceSyncResult, DeviceSyncSummary } from '../types/sync.types.js';

export class DeviceSyncService {
  /**
   * Synchronizes telemetry for a single registered Smart Bag.
   * - Decrypts credentials in server memory only
   * - Dynamic per-device channel and key
   * - Deduplicates via PostgreSQL unique constraint (deviceId, thingSpeakEntryId)
   * - Initial backfill (20 readings) vs incremental sync (10 readings)
   * - Sets lastSeenAt to the actual sensor reading timestamp (recordedAt)
   * - Never fabricates values; preserves nulls for missing sensor fields
   */
  async syncDevice(deviceOrId: string | any): Promise<DeviceSyncResult> {
    let device: any;
    if (typeof deviceOrId === 'string') {
      device = await prisma.device.findUnique({
        where: { id: deviceOrId },
      });
      if (!device) {
        throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
      }
    } else {
      device = deviceOrId;
    }

    // Decrypt Read API Key strictly in memory
    let readApiKey: string | undefined = undefined;
    if (device.thingSpeakReadKey) {
      try {
        readApiKey = decryptText(device.thingSpeakReadKey);
      } catch (err: any) {
        logger.error('Failed to decrypt device ThingSpeak Read API Key', {
          deviceId: device.id,
          deviceCode: device.deviceCode,
          channelId: device.thingSpeakChannelId,
        });
        throw new AppError('Failed to decrypt stored device credentials', 500, 'DECRYPTION_FAILED');
      }
    }

    try {
      // Determine if initial backfill or incremental sync
      const existingReadingsCount = await prisma.sensorReading.count({
        where: { deviceId: device.id },
      });
      const isInitial = existingReadingsCount === 0 || device.lastSeenAt === null;
      const fetchLimit = isInitial ? env.INITIAL_BACKFILL_LIMIT : env.INCREMENTAL_SYNC_LIMIT;

      // Fetch feeds dynamically from ThingSpeak for this specific device
      const feedsResult = await thingspeakService.getFeeds(device.thingSpeakChannelId, {
        limit: fetchLimit,
        readApiKey,
      });

      const rawReadings = feedsResult.readings || [];
      let newReadingsCount = 0;
      let newestRecordedAt: Date | null = device.lastSeenAt;

      if (rawReadings.length > 0) {
        // Map normalized readings to database schema rows
        const rowsToInsert = rawReadings.map((r) => {
          const recDate = new Date(r.recordedAt);
          // Track newest sensor reading timestamp
          if (!Number.isNaN(recDate.getTime())) {
            if (!newestRecordedAt || recDate.getTime() > newestRecordedAt.getTime()) {
              newestRecordedAt = recDate;
            }
          }

          const fValues = r.fieldValues || {};

          // Dynamic field mapping lookup for legacy column fallback
          let coldTemp = r.coldTemperature;
          let hotTemp = r.hotTemperature;
          let hum = r.humidity;

          const mappings = Array.isArray(device.fieldMappings) ? device.fieldMappings : null;
          if (mappings && mappings.length > 0) {
            const coldMapping = mappings.find((m: any) => m.metric === 'temperature' && m.zone === 'cold');
            if (coldMapping && coldMapping.fieldKey) {
              coldTemp = fValues[coldMapping.fieldKey] ?? null;
            }
            const hotMapping = mappings.find((m: any) => m.metric === 'temperature' && m.zone === 'hot');
            if (hotMapping && hotMapping.fieldKey) {
              hotTemp = fValues[hotMapping.fieldKey] ?? null;
            }
            const humMapping = mappings.find((m: any) => m.metric === 'humidity');
            if (humMapping && humMapping.fieldKey) {
              hum = fValues[humMapping.fieldKey] ?? null;
            }
          }

          return {
            id: crypto.randomUUID(),
            deviceId: device.id,
            thingSpeakEntryId: r.entryId,
            recordedAt: recDate,
            coldTemperature: coldTemp,
            hotTemperature: hotTemp,
            humidity: hum,
            fieldValues: fValues,
          };
        });

        // Safe deduplicated insertion: ON CONFLICT (deviceId, thingSpeakEntryId) DO NOTHING
        const insertResult = await prisma.sensorReading.createMany({
          data: rowsToInsert,
          skipDuplicates: true,
        });
        newReadingsCount = insertResult.count;

        // Requirement 9: Alert evaluation pipeline with failure isolation
        if (rowsToInsert.length > 0) {
          try {
            await alertService.evaluateReadings(
              device.id,
              rowsToInsert.map((r) => ({
                coldTemperature: r.coldTemperature,
                hotTemperature: r.hotTemperature,
                humidity: r.humidity,
                fieldValues: r.fieldValues,
                recordedAt: r.recordedAt,
              }))
            );
          } catch (alertErr: any) {
            // Failure Isolation: Failure in alert evaluation must NOT prevent sensor readings from being stored or break sync
            logger.error('Alert evaluation error during device sync', {
              deviceId: device.id,
              deviceCode: device.deviceCode,
              error: alertErr?.message || 'Alert error',
            });
          }
        }
      }

      // Calculate new connectivity status based on age of latest actual reading
      const newStatus = calculateDeviceStatus(newestRecordedAt);

      // Update device lastSeenAt and status in PostgreSQL
      await prisma.device.update({
        where: { id: device.id },
        data: {
          lastSeenAt: newestRecordedAt,
          status: newStatus,
        },
      });

      return {
        deviceId: device.id,
        deviceCode: device.deviceCode,
        channelId: device.thingSpeakChannelId,
        success: true,
        newReadingsCount,
        latestRecordedAt: newestRecordedAt,
        status: newStatus,
        isInitialSync: isInitial,
        message: `Synchronized ${newReadingsCount} new reading(s)`,
      };
    } catch (err: any) {
      // Failure Isolation: Calculate status based on current lastSeenAt (may transition to STALE/OFFLINE)
      const fallbackStatus = calculateDeviceStatus(device.lastSeenAt);
      if (fallbackStatus !== device.status) {
        await prisma.device
          .update({
            where: { id: device.id },
            data: { status: fallbackStatus },
          })
          .catch(() => {});
      }

      logger.warn('Device synchronization failed for channel', {
        deviceId: device.id,
        deviceCode: device.deviceCode,
        channelId: device.thingSpeakChannelId,
        error: err?.message || 'Sync error',
      });

      return {
        deviceId: device.id,
        deviceCode: device.deviceCode,
        channelId: device.thingSpeakChannelId,
        success: false,
        newReadingsCount: 0,
        latestRecordedAt: device.lastSeenAt,
        status: fallbackStatus,
        error: err?.message || 'Synchronization failed',
      };
    }
  }

  /**
   * Synchronizes telemetry for all registered Smart Bags.
   * Devices are processed independently so a failure on one bag does NOT stop synchronization of others.
   */
  async syncAllDevices(): Promise<DeviceSyncSummary> {
    const devices = await prisma.device.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const results: DeviceSyncResult[] = [];
    let successfulSyncs = 0;
    let failedSyncs = 0;
    let totalNewReadings = 0;

    for (const device of devices) {
      try {
        const result = await this.syncDevice(device);
        results.push(result);
        if (result.success) {
          successfulSyncs++;
          totalNewReadings += result.newReadingsCount;
        } else {
          failedSyncs++;
        }
      } catch (err: any) {
        failedSyncs++;
        logger.error('Unexpected error during device sync cycle', {
          deviceId: device.id,
          deviceCode: device.deviceCode,
          channelId: device.thingSpeakChannelId,
          error: err?.message || 'Unexpected error',
        });
        results.push({
          deviceId: device.id,
          deviceCode: device.deviceCode,
          channelId: device.thingSpeakChannelId,
          success: false,
          newReadingsCount: 0,
          latestRecordedAt: device.lastSeenAt,
          status: calculateDeviceStatus(device.lastSeenAt),
          error: err?.message || 'Unexpected error',
        });
      }
    }

    if (devices.length > 0) {
      logger.info('Device synchronization cycle complete', {
        totalDevices: devices.length,
        successfulSyncs,
        failedSyncs,
        totalNewReadings,
      });
    }

    return {
      totalDevices: devices.length,
      successfulSyncs,
      failedSyncs,
      newReadingsCount: totalNewReadings,
      results,
    };
  }
}

export const deviceSyncService = new DeviceSyncService();
