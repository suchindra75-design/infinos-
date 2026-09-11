import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';
import { encryptText, decryptText } from '../../utils/crypto.js';
import { SafeUser } from '../../types/auth.types.js';
import { SafeDevice, DeviceStatusResponse, ConnectionTestResult } from '../../types/device.types.js';
import {
  CreateDeviceInput,
  UpdateDeviceInput,
  TestConnectionInput,
  GetReadingsQueryInput,
} from './device.validation.js';
import { thingspeakService } from '../../services/thingspeak.service.js';
import { deviceSyncService } from '../../services/device-sync.service.js';
import { calculateDeviceStatus } from '../../utils/device-status.js';
import { NormalizedSensorReading } from '../../types/thingspeak.types.js';

export class DeviceService {
  /**
   * Helper to format a database device into a sanitized SafeDevice object.
   * Completely strips thingSpeakReadKey and secrets.
   */
  private toSafeDevice(device: {
    id: string;
    deviceCode: string;
    name: string;
    thingSpeakChannelId: string;
    thingSpeakReadKey: string | null;
    fieldMappings?: any;
    status: any;
    lastSeenAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    ownerId: string | null;
  }): SafeDevice {
    return {
      id: device.id,
      deviceCode: device.deviceCode,
      name: device.name,
      thingSpeakChannelId: device.thingSpeakChannelId,
      fieldMappings: (device.fieldMappings as any) || null,
      status: device.status,
      lastSeenAt: device.lastSeenAt,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
      ownerId: device.ownerId,
      hasApiKey: Boolean(device.thingSpeakReadKey),
    };
  }

  /**
   * Retrieves all registered devices.
   */
  async listDevices(): Promise<SafeDevice[]> {
    const devices = await prisma.device.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return devices.map((d: any) => this.toSafeDevice(d));
  }

  /**
   * Creates a new Smart Bag device with encrypted ThingSpeak credentials.
   */
  async createDevice(input: CreateDeviceInput, ownerId: string): Promise<SafeDevice> {
    const code = input.deviceCode.trim().toUpperCase();
    const channelId = input.thingSpeakChannelId.trim();

    // Check device code uniqueness
    const existingCode = await prisma.device.findUnique({
      where: { deviceCode: code },
    });
    if (existingCode) {
      throw new AppError(`A device with code "${code}" is already registered`, 409, 'DEVICE_CODE_EXISTS');
    }

    // Check channel ID uniqueness
    const existingChannel = await prisma.device.findFirst({
      where: { thingSpeakChannelId: channelId },
    });
    if (existingChannel) {
      throw new AppError(
        `ThingSpeak Channel ID "${channelId}" is already registered to another device`,
        409,
        'CHANNEL_ALREADY_REGISTERED'
      );
    }

    // Encrypt ThingSpeak Read API Key if provided
    let encryptedKey: string | null = null;
    if (input.thingSpeakReadApiKey && input.thingSpeakReadApiKey.trim().length > 0) {
      encryptedKey = encryptText(input.thingSpeakReadApiKey.trim());
    }

    const device = await prisma.device.create({
      data: {
        deviceCode: code,
        name: input.name.trim(),
        thingSpeakChannelId: channelId,
        thingSpeakReadKey: encryptedKey,
        fieldMappings: input.fieldMappings || null,
        ownerId,
        settings: {
          create: {}, // Provision default thresholds defined in schema
        },
      },
    });

    return this.toSafeDevice(device);
  }

  /**
   * Retrieves a single device by ID.
   */
  async getDeviceById(id: string): Promise<SafeDevice> {
    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    return this.toSafeDevice(device);
  }

  /**
   * Updates device configuration.
   * Enforces role and ownership checks.
   */
  async updateDevice(id: string, input: UpdateDeviceInput, user: SafeUser): Promise<SafeDevice> {
    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    // Authorization: ADMIN can update any device, OPERATOR can only update own devices
    if (user.role !== UserRole.ADMIN && device.ownerId !== user.id) {
      throw new AppError('Forbidden: You do not have permission to modify this device', 403, 'FORBIDDEN');
    }

    const updateData: {
      name?: string;
      deviceCode?: string;
      thingSpeakChannelId?: string;
      thingSpeakReadKey?: string;
      fieldMappings?: any;
    } = {};

    if (input.name !== undefined) {
      updateData.name = input.name.trim();
    }

    if (input.fieldMappings !== undefined) {
      updateData.fieldMappings = input.fieldMappings;
    }

    if (input.deviceCode !== undefined) {
      const newCode = input.deviceCode.trim().toUpperCase();
      if (newCode !== device.deviceCode) {
        const existing = await prisma.device.findUnique({
          where: { deviceCode: newCode },
        });
        if (existing) {
          throw new AppError(`Device code "${newCode}" is already in use`, 409, 'DEVICE_CODE_EXISTS');
        }
        updateData.deviceCode = newCode;
      }
    }

    if (input.thingSpeakChannelId !== undefined) {
      const newChannelId = input.thingSpeakChannelId.trim();
      if (newChannelId !== device.thingSpeakChannelId) {
        const existingChannel = await prisma.device.findFirst({
          where: { thingSpeakChannelId: newChannelId, id: { not: id } },
        });
        if (existingChannel) {
          throw new AppError(`ThingSpeak Channel "${newChannelId}" is already registered`, 409, 'CHANNEL_ALREADY_REGISTERED');
        }
        updateData.thingSpeakChannelId = newChannelId;
      }
    }

    if (input.thingSpeakReadApiKey !== undefined) {
      const rawKey = input.thingSpeakReadApiKey.trim();
      if (rawKey.length > 0) {
        updateData.thingSpeakReadKey = encryptText(rawKey);
      }
    }

    const updated = await prisma.device.update({
      where: { id },
      data: updateData,
    });

    return this.toSafeDevice(updated);
  }

  /**
   * Deletes a device and its cascading dependencies (readings, settings, alerts).
   * Enforces role and ownership checks.
   */
  async deleteDevice(id: string, user: SafeUser): Promise<{ message: string }> {
    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (user.role !== UserRole.ADMIN && device.ownerId !== user.id) {
      throw new AppError('Forbidden: You do not have permission to delete this device', 403, 'FORBIDDEN');
    }

    await prisma.device.delete({
      where: { id },
    });

    return { message: `Device ${device.deviceCode} (${device.name}) deleted successfully` };
  }

  /**
   * Retrieves current status information for a device.
   * Real-time calculation based on age of lastSeenAt against configurable thresholds.
   */
  async getDeviceStatus(id: string): Promise<DeviceStatusResponse> {
    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    // Dynamic real-time calculation based on actual reading timestamp age
    const realTimeStatus = calculateDeviceStatus(device.lastSeenAt);
    if (realTimeStatus !== device.status) {
      await prisma.device.update({
        where: { id: device.id },
        data: { status: realTimeStatus },
      });
      device.status = realTimeStatus;
    }

    const hasSync = device.lastSeenAt !== null;

    return {
      id: device.id,
      deviceCode: device.deviceCode,
      name: device.name,
      status: device.status,
      lastSeenAt: device.lastSeenAt,
      hasSyncReadings: hasSync,
      message: hasSync
        ? `Device status: ${device.status}`
        : 'No synchronized reading available yet. Awaiting initial telemetry synchronization.',
    };
  }

  /**
   * Tests ThingSpeak channel connectivity using the dedicated ThingSpeak service.
   * Credentials remain strictly protected and never leak into responses.
   */
  async testConnection(input: TestConnectionInput): Promise<{
    connected: boolean;
    channelId: string;
    channelName?: string;
    message: string;
  }> {
    const channelId = input.thingSpeakChannelId.trim();
    const apiKey = input.thingSpeakReadApiKey && input.thingSpeakReadApiKey.trim().length > 0
      ? input.thingSpeakReadApiKey.trim()
      : undefined;

    return thingspeakService.testConnection(channelId, apiKey);
  }

  /**
   * Retrieves the latest dynamic ThingSpeak reading for a specific device.
   * Decrypts the device's specific API key server-side.
   * Does NOT persist readings to the database (Part 5 handles background synchronization).
   */
  async getLatestDeviceReading(
    deviceId: string,
    user: SafeUser
  ): Promise<{
    deviceId: string;
    deviceCode: string;
    channelId: string;
    reading: NormalizedSensorReading | null;
    hasReading: boolean;
    message?: string;
  }> {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    let decryptedKey: string | null = null;
    if (device.thingSpeakReadKey) {
      decryptedKey = decryptText(device.thingSpeakReadKey);
    }

    const reading = await thingspeakService.getLatestFeed(device.thingSpeakChannelId, decryptedKey);

    return {
      deviceId: device.id,
      deviceCode: device.deviceCode,
      channelId: device.thingSpeakChannelId,
      reading,
      hasReading: reading !== null,
      message: reading ? undefined : 'No sensor readings available for this channel yet',
    };
  }

  /**
   * Retrieves historical ThingSpeak feeds for a specific device.
   * Decrypts the device's specific API key server-side.
   */
  async getDeviceReadings(
    deviceId: string,
    query: GetReadingsQueryInput,
    user: SafeUser
  ): Promise<{
    deviceId: string;
    deviceCode: string;
    channelId: string;
    count: number;
    readings: NormalizedSensorReading[];
  }> {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    let decryptedKey: string | null = null;
    if (device.thingSpeakReadKey) {
      decryptedKey = decryptText(device.thingSpeakReadKey);
    }

    const result = await thingspeakService.getFeeds(device.thingSpeakChannelId, {
      readApiKey: decryptedKey,
      limit: query.limit,
      from: query.from,
      to: query.to,
    });

    return {
      deviceId: device.id,
      deviceCode: device.deviceCode,
      channelId: device.thingSpeakChannelId,
      count: result.count,
      readings: result.readings,
    };
  }

  /**
   * Manually triggers a synchronization cycle for a specific device.
   * Authorized for ADMIN, or OPERATOR if they own the device.
   * Returns sanitized sync results without credential leakage.
   */
  async syncDeviceManually(
    id: string,
    user: SafeUser
  ): Promise<{
    deviceId: string;
    deviceCode: string;
    channelId: string;
    success: boolean;
    newReadingsCount: number;
    latestRecordedAt: Date | null;
    status: any;
    message: string;
  }> {
    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (user.role !== UserRole.ADMIN && device.ownerId !== user.id) {
      throw new AppError('Forbidden: You do not have permission to synchronize this device', 403, 'FORBIDDEN');
    }

    const syncResult = await deviceSyncService.syncDevice(device);

    return {
      deviceId: syncResult.deviceId,
      deviceCode: syncResult.deviceCode,
      channelId: syncResult.channelId,
      success: syncResult.success,
      newReadingsCount: syncResult.newReadingsCount,
      latestRecordedAt: syncResult.latestRecordedAt,
      status: syncResult.status,
      message: syncResult.message || (syncResult.success ? 'Device synchronized successfully' : 'Device synchronization failed'),
    };
  }
}

export const deviceService = new DeviceService();
