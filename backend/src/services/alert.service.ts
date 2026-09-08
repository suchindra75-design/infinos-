import { Alert, AlertSeverity, AlertType, UserRole, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';
import { SafeUser } from '../types/auth.types.js';
import { alertConfig, calculateAlertSeverity } from '../config/alert.config.js';
import { logger } from '../utils/logger.js';
import { ListAlertsQueryInput } from '../modules/alert/alert.validation.js';

export interface AlertEvaluationReading {
  coldTemperature: number | null;
  hotTemperature: number | null;
  humidity: number | null;
  recordedAt: Date;
}

export class AlertService {
  /**
   * Evaluates an array of readings for a device against its threshold configuration.
   * Runs sequentially in chronological order.
   */
  async evaluateReadings(deviceId: string, readings: AlertEvaluationReading[]): Promise<void> {
    if (!readings || readings.length === 0) {
      return;
    }

    // 1. Fetch or create device settings
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

    if (!settings.alertsEnabled) {
      logger.debug('Alert evaluation skipped: alerts disabled for device', { deviceId });
      return;
    }

    // Sort readings chronologically so historical progression and auto-resolution occur in order
    const sortedReadings = [...readings].sort(
      (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime()
    );

    for (const reading of sortedReadings) {
      await this.evaluateSingleReading(deviceId, reading, settings);
    }
  }

  /**
   * Evaluates a single sensor reading against configured thresholds.
   */
  private async evaluateSingleReading(
    deviceId: string,
    reading: AlertEvaluationReading,
    settings: {
      coldTempMin: number;
      coldTempMax: number;
      hotTempMin: number;
      hotTempMax: number;
      humidityMin: number;
      humidityMax: number;
    }
  ): Promise<void> {
    // 1. Cold Temperature Check
    if (reading.coldTemperature !== null && !isNaN(reading.coldTemperature)) {
      const val = reading.coldTemperature;
      if (val < settings.coldTempMin) {
        const severity = calculateAlertSeverity(
          val,
          settings.coldTempMin,
          alertConfig.criticalMargins.coldTemp,
          'LOW'
        );
        await this.triggerOrUpdateAlert(
          deviceId,
          AlertType.COLD_TEMPERATURE_LOW,
          severity,
          val,
          settings.coldTempMin,
          `Cold compartment temperature is ${severity === AlertSeverity.CRITICAL ? 'critically ' : ''}low: ${val}°C (min: ${settings.coldTempMin}°C)`,
          reading.recordedAt
        );
        // Resolve opposite alert if it was active
        await this.resolveAlertsByType(deviceId, [AlertType.COLD_TEMPERATURE_HIGH], reading.recordedAt);
      } else if (val > settings.coldTempMax) {
        const severity = calculateAlertSeverity(
          val,
          settings.coldTempMax,
          alertConfig.criticalMargins.coldTemp,
          'HIGH'
        );
        await this.triggerOrUpdateAlert(
          deviceId,
          AlertType.COLD_TEMPERATURE_HIGH,
          severity,
          val,
          settings.coldTempMax,
          `Cold compartment temperature is ${severity === AlertSeverity.CRITICAL ? 'critically ' : ''}high: ${val}°C (max: ${settings.coldTempMax}°C)`,
          reading.recordedAt
        );
        // Resolve opposite alert if it was active
        await this.resolveAlertsByType(deviceId, [AlertType.COLD_TEMPERATURE_LOW], reading.recordedAt);
      } else {
        // In range: resolve both cold temperature alerts
        await this.resolveAlertsByType(
          deviceId,
          [AlertType.COLD_TEMPERATURE_LOW, AlertType.COLD_TEMPERATURE_HIGH],
          reading.recordedAt
        );
      }
    }

    // 2. Hot Temperature Check
    if (reading.hotTemperature !== null && !isNaN(reading.hotTemperature)) {
      const val = reading.hotTemperature;
      if (val < settings.hotTempMin) {
        const severity = calculateAlertSeverity(
          val,
          settings.hotTempMin,
          alertConfig.criticalMargins.hotTemp,
          'LOW'
        );
        await this.triggerOrUpdateAlert(
          deviceId,
          AlertType.HOT_TEMPERATURE_LOW,
          severity,
          val,
          settings.hotTempMin,
          `Hot compartment temperature is ${severity === AlertSeverity.CRITICAL ? 'critically ' : ''}low: ${val}°C (min: ${settings.hotTempMin}°C)`,
          reading.recordedAt
        );
        await this.resolveAlertsByType(deviceId, [AlertType.HOT_TEMPERATURE_HIGH], reading.recordedAt);
      } else if (val > settings.hotTempMax) {
        const severity = calculateAlertSeverity(
          val,
          settings.hotTempMax,
          alertConfig.criticalMargins.hotTemp,
          'HIGH'
        );
        await this.triggerOrUpdateAlert(
          deviceId,
          AlertType.HOT_TEMPERATURE_HIGH,
          severity,
          val,
          settings.hotTempMax,
          `Hot compartment temperature is ${severity === AlertSeverity.CRITICAL ? 'critically ' : ''}high: ${val}°C (max: ${settings.hotTempMax}°C)`,
          reading.recordedAt
        );
        await this.resolveAlertsByType(deviceId, [AlertType.HOT_TEMPERATURE_LOW], reading.recordedAt);
      } else {
        // In range: resolve both hot temperature alerts
        await this.resolveAlertsByType(
          deviceId,
          [AlertType.HOT_TEMPERATURE_LOW, AlertType.HOT_TEMPERATURE_HIGH],
          reading.recordedAt
        );
      }
    }

    // 3. Humidity Check
    if (reading.humidity !== null && !isNaN(reading.humidity)) {
      const val = reading.humidity;
      if (val < settings.humidityMin) {
        const severity = calculateAlertSeverity(
          val,
          settings.humidityMin,
          alertConfig.criticalMargins.humidity,
          'LOW'
        );
        await this.triggerOrUpdateAlert(
          deviceId,
          AlertType.HUMIDITY_LOW,
          severity,
          val,
          settings.humidityMin,
          `Humidity is ${severity === AlertSeverity.CRITICAL ? 'critically ' : ''}low: ${val}% (min: ${settings.humidityMin}%)`,
          reading.recordedAt
        );
        await this.resolveAlertsByType(deviceId, [AlertType.HUMIDITY_HIGH], reading.recordedAt);
      } else if (val > settings.humidityMax) {
        const severity = calculateAlertSeverity(
          val,
          settings.humidityMax,
          alertConfig.criticalMargins.humidity,
          'HIGH'
        );
        await this.triggerOrUpdateAlert(
          deviceId,
          AlertType.HUMIDITY_HIGH,
          severity,
          val,
          settings.humidityMax,
          `Humidity is ${severity === AlertSeverity.CRITICAL ? 'critically ' : ''}high: ${val}% (max: ${settings.humidityMax}%)`,
          reading.recordedAt
        );
        await this.resolveAlertsByType(deviceId, [AlertType.HUMIDITY_LOW], reading.recordedAt);
      } else {
        // In range: resolve humidity alerts
        await this.resolveAlertsByType(
          deviceId,
          [AlertType.HUMIDITY_LOW, AlertType.HUMIDITY_HIGH],
          reading.recordedAt
        );
      }
    }
  }

  /**
   * Implements Duplicate Alert Prevention.
   * If an active alert of this type already exists, updates triggerValue and escalates severity
   * without inserting a duplicate record.
   * If no active alert exists, creates a new alert record.
   */
  private async triggerOrUpdateAlert(
    deviceId: string,
    type: AlertType,
    severity: AlertSeverity,
    triggerValue: number,
    thresholdValue: number,
    message: string,
    recordedAt: Date
  ): Promise<void> {
    const existingActive = await prisma.alert.findFirst({
      where: {
        deviceId,
        type,
        isResolved: false,
      },
    });

    if (existingActive) {
      // Retain active alert, updating the latest value and upgrading severity if changed to CRITICAL
      const upgradedSeverity =
        existingActive.severity === AlertSeverity.CRITICAL || severity === AlertSeverity.CRITICAL
          ? AlertSeverity.CRITICAL
          : AlertSeverity.WARNING;

      await prisma.alert.update({
        where: { id: existingActive.id },
        data: {
          triggerValue,
          severity: upgradedSeverity,
          message,
        },
      });
      logger.debug('Retained and updated existing active alert', {
        alertId: existingActive.id,
        deviceId,
        type,
        triggerValue,
        severity: upgradedSeverity,
      });
    } else {
      // Create new active alert event
      const newAlert = await prisma.alert.create({
        data: {
          deviceId,
          type,
          severity,
          triggerValue,
          thresholdValue,
          message,
          triggeredAt: recordedAt,
          isResolved: false,
        },
      });
      logger.info('New alert event created', {
        alertId: newAlert.id,
        deviceId,
        type,
        severity,
        triggerValue,
      });
    }
  }

  /**
   * Resolves active alerts of specified types when readings return to safe normal ranges.
   */
  private async resolveAlertsByType(
    deviceId: string,
    types: AlertType[],
    resolvedAt: Date
  ): Promise<void> {
    const activeAlerts = await prisma.alert.findMany({
      where: {
        deviceId,
        type: { in: types },
        isResolved: false,
      },
    });

    if (activeAlerts.length > 0) {
      await prisma.alert.updateMany({
        where: {
          id: { in: activeAlerts.map((a) => a.id) },
        },
        data: {
          isResolved: true,
          resolvedAt,
        },
      });
      logger.info('Alerts auto-resolved as readings returned to safe thresholds', {
        deviceId,
        resolvedCount: activeAlerts.length,
        types,
        resolvedAt,
      });
    }
  }

  /**
   * Manually resolves an active alert by an authorized user (ADMIN or owning OPERATOR).
   */
  async resolveAlertManually(alertId: string, user: SafeUser): Promise<Alert> {
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        device: true,
      },
    });

    if (!alert) {
      throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
    }

    if (user.role === UserRole.VIEWER) {
      throw new AppError('Forbidden: Viewers cannot resolve alerts', 403, 'FORBIDDEN');
    }

    if (user.role === UserRole.OPERATOR && alert.device.ownerId !== user.id) {
      throw new AppError('Forbidden: You do not have permission to resolve alerts for this device', 403, 'FORBIDDEN');
    }

    if (alert.isResolved) {
      return alert;
    }

    const resolved = await prisma.alert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedById: user.id,
      },
    });

    return resolved;
  }

  /**
   * Retrieves alerts with rich filtering and strict RBAC/ownership enforcement.
   * Never leaks ThingSpeak credentials.
   */
  async listAlerts(
    query: ListAlertsQueryInput,
    user: SafeUser,
    targetDeviceId?: string
  ): Promise<{
    alerts: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: Prisma.AlertWhereInput = {};

    // 1. Device scope resolution & RBAC
    if (targetDeviceId) {
      const device = await prisma.device.findUnique({
        where: { id: targetDeviceId },
      });

      if (!device) {
        throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
      }

      if (user.role === UserRole.OPERATOR && device.ownerId !== user.id) {
        throw new AppError('Forbidden: You do not have permission to view alerts for this device', 403, 'FORBIDDEN');
      }

      where.deviceId = targetDeviceId;
    } else {
      // Scoped across all accessible devices
      if (user.role === UserRole.OPERATOR) {
        const ownedDevices = await prisma.device.findMany({
          where: { ownerId: user.id },
          select: { id: true },
        });
        const ownedIds = ownedDevices.map((d) => d.id);

        if (query.deviceId) {
          if (!ownedIds.includes(query.deviceId)) {
            throw new AppError('Forbidden: You do not have permission to view alerts for this device', 403, 'FORBIDDEN');
          }
          where.deviceId = query.deviceId;
        } else {
          where.deviceId = { in: ownedIds };
        }
      } else if (query.deviceId) {
        where.deviceId = query.deviceId;
      }
    }

    // 2. Active / Resolved filtering
    if (query.isResolved !== undefined) {
      where.isResolved = query.isResolved;
    } else if (query.status === 'active') {
      where.isResolved = false;
    } else if (query.status === 'resolved') {
      where.isResolved = true;
    }

    // 3. Alert Type filtering
    if (query.type) {
      where.type = query.type;
    }

    // 4. Severity filtering
    if (query.severity) {
      where.severity = query.severity;
    }

    // 5. Date range filtering (from / to)
    if (query.from || query.to) {
      where.triggeredAt = {};
      if (query.from) {
        where.triggeredAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.triggeredAt.lte = new Date(query.to);
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { triggeredAt: 'desc' },
        skip,
        take: limit,
        include: {
          device: {
            select: {
              id: true,
              deviceCode: true,
              name: true,
              status: true,
              ownerId: true,
            },
          },
          acknowledgedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          resolvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.alert.count({ where }),
    ]);

    return {
      alerts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const alertService = new AlertService();
