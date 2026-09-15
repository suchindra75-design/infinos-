import assert from 'node:assert/strict';
import { DeviceStatus, UserRole } from '@prisma/client';
import { prisma } from '../src/config/database.js';
import { deviceSyncService } from '../src/services/device-sync.service.js';
import { thingspeakService } from '../src/services/thingspeak.service.js';
import { deviceService } from '../src/modules/device/device.service.js';
import { analyticsService } from '../src/modules/analytics/analytics.service.js';
import { SafeUser } from '../src/types/auth.types.js';

const user: SafeUser = {
  id: 'user-1', email: 'viewer@example.test', name: 'Viewer', role: UserRole.VIEWER,
  isActive: true, createdAt: new Date(), updatedAt: new Date(),
};

async function runTelemetryRegressionTests() {
  console.log('--- Running telemetry connectivity/history regression tests ---');
  const original = {
    deviceFindUnique: prisma.device.findUnique,
    deviceUpdate: prisma.device.update,
    readingCount: prisma.sensorReading.count,
    readingCreateMany: prisma.sensorReading.createMany,
    readingFindMany: prisma.sensorReading.findMany,
    readingFindFirst: prisma.sensorReading.findFirst,
    readingAggregate: prisma.sensorReading.aggregate,
    alertCount: prisma.alert.count,
    getFeeds: thingspeakService.getFeeds,
  };

  try {
    const oldReadingAt = new Date(Date.now() - 10 * 60 * 1000);
    const reachableDevice: any = {
      id: 'device-1', deviceCode: 'BAG-1', name: 'Bag 1', thingSpeakChannelId: '1',
      thingSpeakReadKey: null, fieldMappings: [{ fieldNumber: 1, fieldKey: 'field1', label: 'Field 1', metric: 'other', zone: 'none', unit: '' }],
      lastSeenAt: oldReadingAt, status: DeviceStatus.OFFLINE,
    };
    let savedStatus: DeviceStatus | undefined;
    (prisma.sensorReading.count as any) = async () => 3;
    (prisma.sensorReading.createMany as any) = async () => ({ count: 0 });
    (prisma.device.update as any) = async ({ data }: any) => { savedStatus = data.status; return { ...reachableDevice, ...data }; };
    (thingspeakService.getFeeds as any) = async () => ({ readings: [], count: 0 });

    const sync = await deviceSyncService.syncDevice(reachableDevice);
    assert.equal(sync.success, true);
    assert.equal(sync.newReadingsCount, 0);
    assert.equal(sync.status, DeviceStatus.ONLINE, 'a reachable channel is online even with no new row');
    assert.equal(savedStatus, DeviceStatus.ONLINE);

    // Status is a connectivity result, while old retained telemetry is still history.
    (prisma.device.findUnique as any) = async () => ({ ...reachableDevice, status: DeviceStatus.OFFLINE });
    const offlineStatus = await deviceService.getDeviceStatus('device-1');
    assert.equal(offlineStatus.status, DeviceStatus.OFFLINE);
    assert.equal(offlineStatus.hasSyncReadings, true, 'offline state does not hide stored readings');

    const stored = [
      { id: 'r1', thingSpeakEntryId: 1, recordedAt: new Date('2026-01-01T00:00:00Z'), coldTemperature: null, hotTemperature: null, humidity: null, fieldValues: { field1: '4.2', field2: 5.1 } },
      { id: 'r2', thingSpeakEntryId: 2, recordedAt: new Date('2026-01-01T00:05:00Z'), coldTemperature: null, hotTemperature: null, humidity: null, fieldValues: { field1: '4.4', field2: 5.3 } },
    ];
    (prisma.device.findUnique as any) = async () => ({ ...reachableDevice, status: DeviceStatus.OFFLINE });
    (prisma.sensorReading.aggregate as any) = async () => ({
      _count: { id: 2 }, _min: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: stored[0].recordedAt },
      _max: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: stored[1].recordedAt },
      _avg: { coldTemperature: null, hotTemperature: null, humidity: null },
    });
    (prisma.sensorReading.findFirst as any) = async () => stored[1];
    (prisma.sensorReading.findMany as any) = async () => stored;
    (prisma.alert.count as any) = async () => 0;

    const summary = await analyticsService.getSummary('device-1', { limit: 100 }, user);
    const history = await analyticsService.getTimeseries('device-1', { limit: 100 }, user);
    assert.equal(summary.readingCount, 2);
    assert.equal(summary.latestReadingTimestamp?.toISOString(), stored[1].recordedAt.toISOString());
    assert.equal(history.count, 2);
    assert.equal((history.readings[0].fieldValues as any).field1, '4.2');
    console.log('✓ reachable/no-new, offline-with-history, latest-stored, dynamic numeric-string history');

    (prisma.sensorReading.aggregate as any) = async () => ({
      _count: { id: 0 }, _min: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: null },
      _max: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: null },
      _avg: { coldTemperature: null, hotTemperature: null, humidity: null },
    });
    (prisma.sensorReading.findFirst as any) = async () => null;
    (prisma.sensorReading.findMany as any) = async () => [];
    const empty = await analyticsService.getTimeseries('device-1', { limit: 100 }, user);
    assert.equal(empty.count, 0, 'a device with no history produces an empty state dataset');
    console.log('✓ no-history empty dataset');
  } finally {
    prisma.device.findUnique = original.deviceFindUnique;
    prisma.device.update = original.deviceUpdate;
    prisma.sensorReading.count = original.readingCount;
    prisma.sensorReading.createMany = original.readingCreateMany;
    prisma.sensorReading.findMany = original.readingFindMany;
    prisma.sensorReading.findFirst = original.readingFindFirst;
    prisma.sensorReading.aggregate = original.readingAggregate;
    prisma.alert.count = original.alertCount;
    thingspeakService.getFeeds = original.getFeeds;
  }
}

runTelemetryRegressionTests().catch((error) => {
  console.error('Telemetry regression test failed:', error);
  process.exit(1);
});
