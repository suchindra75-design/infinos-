import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { SafeUser } from '../../types/auth.types.js';
import { alertConfig } from '../../config/alert.config.js';
import { UpdateDeviceSettingsInput } from './settings.validation.js';

export interface SafeDeviceSettings {
  id: string;
  deviceId: string;
  coldTempMin: number;
  coldTempMax: number;
  hotTempMin: number;
  hotTempMax: number;
  humidityMin: number;
  humidityMax: number;
  alertsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class SettingsService {
  /**
   * Retrieves device threshold settings, creating default settings if none exist yet.
   */
  async getDeviceSettings(deviceId: string, user: SafeUser): Promise<SafeDeviceSettings> {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    // Role check: Admin and Viewer can view; Operator only for owned devices
    if (user.role === UserRole.OPERATOR && device.ownerId !== user.id) {
      throw new AppError('Forbidden: You do not have permission to view settings for this device', 403, 'FORBIDDEN');
    }

    let settings = await prisma.deviceSettings.findUnique({
      where: { deviceId },
    });

    if (!settings) {
      settings = await prisma.deviceSettings.create({
        data: {
          deviceId,
          coldTempMin: alertConfig.defaultThresholds.coldTempMin,
          coldTempMax: alertConfig.defaultThresholds.coldTempMax,
          hotTempMin: alertConfig.defaultThresholds.hotTempMin,
          hotTempMax: alertConfig.defaultThresholds.hotTempMax,
          humidityMin: alertConfig.defaultThresholds.humidityMin,
          humidityMax: alertConfig.defaultThresholds.humidityMax,
          alertsEnabled: alertConfig.defaultThresholds.alertsEnabled,
        },
      });
    }

    return {
      id: settings.id,
      deviceId: settings.deviceId,
      coldTempMin: settings.coldTempMin,
      coldTempMax: settings.coldTempMax,
      hotTempMin: settings.hotTempMin,
      hotTempMax: settings.hotTempMax,
      humidityMin: settings.humidityMin,
      humidityMax: settings.humidityMax,
      alertsEnabled: settings.alertsEnabled,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Updates device threshold and alert enable settings.
   */
  async updateDeviceSettings(
    deviceId: string,
    input: UpdateDeviceSettingsInput,
    user: SafeUser
  ): Promise<SafeDeviceSettings> {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    // Role check: ADMIN has full access; OPERATOR only owned devices; VIEWER read-only
    if (user.role === UserRole.VIEWER) {
      throw new AppError('Forbidden: Viewers are not authorized to update device settings', 403, 'FORBIDDEN');
    }

    if (user.role === UserRole.OPERATOR && device.ownerId !== user.id) {
      throw new AppError('Forbidden: You do not have permission to modify settings for this device', 403, 'FORBIDDEN');
    }

    const currentSettings = await this.getDeviceSettings(deviceId, user);

    // Merge and cross-validate against existing values
    const newColdMin = input.coldTempMin !== undefined ? input.coldTempMin : currentSettings.coldTempMin;
    const newColdMax = input.coldTempMax !== undefined ? input.coldTempMax : currentSettings.coldTempMax;
    if (newColdMin > newColdMax) {
      throw new AppError('Cold temperature minimum cannot be greater than cold temperature maximum', 400, 'VALIDATION_ERROR');
    }

    const newHotMin = input.hotTempMin !== undefined ? input.hotTempMin : currentSettings.hotTempMin;
    const newHotMax = input.hotTempMax !== undefined ? input.hotTempMax : currentSettings.hotTempMax;
    if (newHotMin > newHotMax) {
      throw new AppError('Hot temperature minimum cannot be greater than hot temperature maximum', 400, 'VALIDATION_ERROR');
    }

    const newHumidityMin = input.humidityMin !== undefined ? input.humidityMin : currentSettings.humidityMin;
    const newHumidityMax = input.humidityMax !== undefined ? input.humidityMax : currentSettings.humidityMax;
    if (newHumidityMin > newHumidityMax) {
      throw new AppError('Humidity minimum cannot be greater than humidity maximum', 400, 'VALIDATION_ERROR');
    }

    const updated = await prisma.deviceSettings.upsert({
      where: { deviceId },
      create: {
        deviceId,
        coldTempMin: newColdMin,
        coldTempMax: newColdMax,
        hotTempMin: newHotMin,
        hotTempMax: newHotMax,
        humidityMin: newHumidityMin,
        humidityMax: newHumidityMax,
        alertsEnabled: input.alertsEnabled !== undefined ? input.alertsEnabled : currentSettings.alertsEnabled,
      },
      update: {
        coldTempMin: input.coldTempMin !== undefined ? input.coldTempMin : undefined,
        coldTempMax: input.coldTempMax !== undefined ? input.coldTempMax : undefined,
        hotTempMin: input.hotTempMin !== undefined ? input.hotTempMin : undefined,
        hotTempMax: input.hotTempMax !== undefined ? input.hotTempMax : undefined,
        humidityMin: input.humidityMin !== undefined ? input.humidityMin : undefined,
        humidityMax: input.humidityMax !== undefined ? input.humidityMax : undefined,
        alertsEnabled: input.alertsEnabled !== undefined ? input.alertsEnabled : undefined,
      },
    });

    return {
      id: updated.id,
      deviceId: updated.deviceId,
      coldTempMin: updated.coldTempMin,
      coldTempMax: updated.coldTempMax,
      hotTempMin: updated.hotTempMin,
      hotTempMax: updated.hotTempMax,
      humidityMin: updated.humidityMin,
      humidityMax: updated.humidityMax,
      alertsEnabled: updated.alertsEnabled,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}

export const settingsService = new SettingsService();
