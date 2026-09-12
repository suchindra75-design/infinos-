import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { SafeUser } from '../../types/auth.types.js';
import { AnalyticsQueryInput } from './analytics.validation.js';

export class AnalyticsService {
  /**
   * Helper to round numbers to 2 decimal places safely.
   */
  private round(val: number | null | undefined): number | null {
    if (val === null || val === undefined) return null;
    return Math.round(val * 100) / 100;
  }

  /**
   * Generates analytical summary aggregates for a device based strictly on stored PostgreSQL readings.
   */
  async getSummary(deviceId: string, query: AnalyticsQueryInput, user: SafeUser) {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (user.role === UserRole.OPERATOR && device.ownerId !== user.id) {
      throw new AppError('Forbidden: You do not have permission to view analytics for this device', 403, 'FORBIDDEN');
    }

    const where: Prisma.SensorReadingWhereInput = { deviceId };
    if (query.from || query.to) {
      where.recordedAt = {};
      if (query.from) {
        where.recordedAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.recordedAt.lte = new Date(query.to);
      }
    }

    // Aggregates using database indexes without unbounded in-memory loading
    const [aggregations, latestReading, activeAlertsCount] = await Promise.all([
      prisma.sensorReading.aggregate({
        where,
        _count: { id: true },
        _min: {
          coldTemperature: true,
          hotTemperature: true,
          humidity: true,
          recordedAt: true,
        },
        _max: {
          coldTemperature: true,
          hotTemperature: true,
          humidity: true,
          recordedAt: true,
        },
        _avg: {
          coldTemperature: true,
          hotTemperature: true,
          humidity: true,
        },
      }),
      prisma.sensorReading.findFirst({
        where,
        orderBy: { recordedAt: 'desc' },
      }),
      prisma.alert.count({
        where: { deviceId, isResolved: false },
      }),
    ]);

    return {
      deviceId: device.id,
      deviceCode: device.deviceCode,
      deviceName: device.name,
      status: device.status,
      fieldMappings: (device as any).fieldMappings || null,
      readingCount: aggregations._count.id,
      firstReadingTimestamp: aggregations._min.recordedAt || null,
      latestReadingTimestamp: latestReading?.recordedAt || aggregations._max.recordedAt || null,
      latest: {
        coldTemperature: latestReading?.coldTemperature ?? null,
        hotTemperature: latestReading?.hotTemperature ?? null,
        humidity: latestReading?.humidity ?? null,
      },
      latestFieldValues: (latestReading?.fieldValues as Record<string, number | null>) || null,
      minimum: {
        coldTemperature: aggregations._min.coldTemperature ?? null,
        hotTemperature: aggregations._min.hotTemperature ?? null,
        humidity: aggregations._min.humidity ?? null,
      },
      maximum: {
        coldTemperature: aggregations._max.coldTemperature ?? null,
        hotTemperature: aggregations._max.hotTemperature ?? null,
        humidity: aggregations._max.humidity ?? null,
      },
      average: {
        coldTemperature: this.round(aggregations._avg.coldTemperature),
        hotTemperature: this.round(aggregations._avg.hotTemperature),
        humidity: this.round(aggregations._avg.humidity),
      },
      activeAlertsCount,
    };
  }

  /**
   * Retrieves chronological timeseries sensor readings suitable for charting.
   */
  async getTimeseries(deviceId: string, query: AnalyticsQueryInput, user: SafeUser) {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (user.role === UserRole.OPERATOR && device.ownerId !== user.id) {
      throw new AppError('Forbidden: You do not have permission to view timeseries for this device', 403, 'FORBIDDEN');
    }

    const where: Prisma.SensorReadingWhereInput = { deviceId };
    if (query.from || query.to) {
      where.recordedAt = {};
      if (query.from) {
        where.recordedAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.recordedAt.lte = new Date(query.to);
      }
    }

    const limit = query.limit || 100;

    const readings = await prisma.sensorReading.findMany({
      where,
      orderBy: { recordedAt: 'asc' }, // Chronological order for plotting
      take: limit,
      select: {
        id: true,
        thingSpeakEntryId: true,
        recordedAt: true,
        coldTemperature: true,
        hotTemperature: true,
        humidity: true,
        fieldValues: true,
      },
    });

    return {
      deviceId: device.id,
      deviceCode: device.deviceCode,
      fieldMappings: (device as any).fieldMappings || null,
      count: readings.length,
      readings,
    };
  }
}

export const analyticsService = new AnalyticsService();
