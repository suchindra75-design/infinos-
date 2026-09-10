import assert from 'node:assert/strict';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import { UserRole, DeviceStatus } from '@prisma/client';
import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { signJwtToken } from '../src/utils/jwt.js';
import { encryptText } from '../src/utils/crypto.js';
import { thingspeakService } from '../src/services/thingspeak.service.js';
import { deviceSyncService } from '../src/services/device-sync.service.js';
import { DeviceSyncWorker } from '../src/workers/device-sync.worker.js';
import { calculateDeviceStatus } from '../src/utils/device-status.js';

async function runSyncTests() {
  console.log('====================================================');
  console.log('--- Starting Part 5: Sensor Sync Integration Tests ---');
  console.log('====================================================');

  const mockPort = 5997;
  const requestsReceived: Array<{ url: string; apiKey?: string }> = [];

  // Controllable feed store for mock server
  const bagAFeeds: any[] = [];
  for (let i = 1; i <= 20; i++) {
    const minutesAgo = 25 - i; // feeds from 24 mins ago to 5 mins ago
    const feedDate = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
    bagAFeeds.push({
      entry_id: i,
      created_at: feedDate,
      field1: (3.0 + i * 0.1).toFixed(1), // Cold
      field3: (60.0 + i * 0.2).toFixed(1), // Hot
      field4: (50.0 + (i % 10)).toFixed(1), // Humidity
    });
  }

  const bagBFeeds: any[] = [];
  for (let i = 1; i <= 15; i++) {
    const minutesAgo = 20 - i;
    const feedDate = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
    bagBFeeds.push({
      entry_id: 100 + i,
      created_at: feedDate,
      field1: (4.5 + i * 0.05).toFixed(1), // Cold
      field3: (55.0 - i * 0.1).toFixed(1), // Hot
      field4: (65.0 - (i % 5)).toFixed(1), // Humidity
    });
  }

  // Setup Mock ThingSpeak Server
  const mockServer = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${mockPort}`);
    const apiKey = parsedUrl.searchParams.get('api_key') || undefined;
    requestsReceived.push({ url: parsedUrl.pathname, apiKey });

    // Bag A Channel (80001)
    if (parsedUrl.pathname.includes('80001')) {
      if (apiKey !== 'KEY_SYNC_BAG_A') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: Wrong API key for Bag A' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          channel: { id: 80001, name: 'Smart Bag A Channel' },
          feeds: bagAFeeds,
        })
      );
      return;
    }

    // Bag B Channel (80002)
    if (parsedUrl.pathname.includes('80002')) {
      if (apiKey !== 'KEY_SYNC_BAG_B') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: Wrong API key for Bag B' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          channel: { id: 80002, name: 'Smart Bag B Channel' },
          feeds: bagBFeeds,
        })
      );
      return;
    }

    // Failing Bag C Channel (80003) - Simulates ThingSpeak 502 / network error
    if (parsedUrl.pathname.includes('80003')) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ThingSpeak Bad Gateway' }));
      return;
    }

    // Malformed Bag D Channel (80004) - Simulates malformed non-JSON data
    if (parsedUrl.pathname.includes('80004')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body>Error 500 Server Error</body></html>');
      return;
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Channel not found' }));
  });

  await new Promise<void>((resolve) => {
    mockServer.listen(mockPort, '127.0.0.1', () => {
      resolve();
    });
  });

  // Redirect thingspeakService to mock server
  (thingspeakService as any).baseUrl = `http://127.0.0.1:${mockPort}`;

  // Helper for HTTP requests
  let serverInstance: http.Server | null = null;
  const testServerPort = 5996;

  await new Promise<void>((resolve) => {
    serverInstance = app.listen(testServerPort, '127.0.0.1', () => {
      resolve();
    });
  });

  async function apiRequest(method: string, path: string, token?: string, body?: any) {
    return new Promise<{ status: number; body: any }>((resolve, reject) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(
        {
          host: '127.0.0.1',
          port: testServerPort,
          path,
          method,
          headers,
        },
        (res) => {
          let rawData = '';
          res.on('data', (chunk) => {
            rawData += chunk;
          });
          res.on('end', () => {
            try {
              const json = rawData ? JSON.parse(rawData) : {};
              resolve({ status: res.statusCode || 500, body: json });
            } catch {
              resolve({ status: res.statusCode || 500, body: rawData });
            }
          });
        }
      );

      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  try {
    // 2. Clean previous test artifacts specifically
    const testDeviceCodes = ['BAG-SYNC-001', 'BAG-SYNC-002', 'BAG-SYNC-003'];
    const testEmails = [
      'sync-admin@infinos.local',
      'sync-operator@infinos.local',
      'sync-other@infinos.local',
      'sync-viewer@infinos.local',
    ];

    const existingTestDevices = await prisma.device.findMany({
      where: { deviceCode: { in: testDeviceCodes } },
      select: { id: true },
    });
    const deviceIds = existingTestDevices.map((d) => d.id);
    if (deviceIds.length > 0) {
      await prisma.sensorReading.deleteMany({ where: { deviceId: { in: deviceIds } } });
      await prisma.device.deleteMany({ where: { id: { in: deviceIds } } });
    }
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });

    // Count pre-existing devices in the database (from production/other tests)
    const preExistingDeviceCount = await prisma.device.count();

    // 3. Create test users
    const pwdHash = await bcrypt.hash('TestPass123!', 8);
    const adminUser = await prisma.user.create({
      data: {
        email: 'sync-admin@infinos.local',
        name: 'Sync Admin',
        passwordHash: pwdHash,
        role: UserRole.ADMIN,
      },
    });
    const operatorUser = await prisma.user.create({
      data: {
        email: 'sync-operator@infinos.local',
        name: 'Sync Operator',
        passwordHash: pwdHash,
        role: UserRole.OPERATOR,
      },
    });
    const otherOperator = await prisma.user.create({
      data: {
        email: 'sync-other@infinos.local',
        name: 'Sync Other Operator',
        passwordHash: pwdHash,
        role: UserRole.OPERATOR,
      },
    });
    const viewerUser = await prisma.user.create({
      data: {
        email: 'sync-viewer@infinos.local',
        name: 'Sync Viewer',
        passwordHash: pwdHash,
        role: UserRole.VIEWER,
      },
    });

    const adminToken = signJwtToken({ userId: adminUser.id, role: adminUser.role });
    const operatorToken = signJwtToken({ userId: operatorUser.id, role: operatorUser.role });
    const otherOperatorToken = signJwtToken({ userId: otherOperator.id, role: otherOperator.role });
    const viewerToken = signJwtToken({ userId: viewerUser.id, role: viewerUser.role });

    // 4. Create Test Devices
    // Bag A (owned by operatorUser, channel 80001, key KEY_SYNC_BAG_A)
    const bagA = await prisma.device.create({
      data: {
        deviceCode: 'BAG-SYNC-001',
        name: 'Smart Delivery Bag Alpha',
        thingSpeakChannelId: '80001',
        thingSpeakReadKey: encryptText('KEY_SYNC_BAG_A'),
        ownerId: operatorUser.id,
        status: DeviceStatus.OFFLINE,
        lastSeenAt: null,
      },
    });

    // Bag B (owned by adminUser, channel 80002, key KEY_SYNC_BAG_B)
    const bagB = await prisma.device.create({
      data: {
        deviceCode: 'BAG-SYNC-002',
        name: 'Smart Delivery Bag Beta',
        thingSpeakChannelId: '80002',
        thingSpeakReadKey: encryptText('KEY_SYNC_BAG_B'),
        ownerId: adminUser.id,
        status: DeviceStatus.OFFLINE,
        lastSeenAt: null,
      },
    });

    // Bag C (failing channel 80003)
    const bagC = await prisma.device.create({
      data: {
        deviceCode: 'BAG-SYNC-003',
        name: 'Smart Delivery Bag Gamma (Failing Channel)',
        thingSpeakChannelId: '80003',
        thingSpeakReadKey: encryptText('KEY_SYNC_BAG_C'),
        ownerId: adminUser.id,
        status: DeviceStatus.OFFLINE,
        lastSeenAt: null,
      },
    });

    // TEST 1: Status calculation logic with configurable thresholds
    console.log('Test 1: Testing calculateDeviceStatus helper...');
    const now = new Date();
    // 1.1 Never synced (null) -> OFFLINE
    assert.strictEqual(calculateDeviceStatus(null, now), DeviceStatus.OFFLINE);
    assert.strictEqual(calculateDeviceStatus(undefined, now), DeviceStatus.OFFLINE);
    // 1.2 Recent reading (30 seconds ago) -> ONLINE (<= 60s)
    const recentDate = new Date(now.getTime() - 30 * 1000);
    assert.strictEqual(calculateDeviceStatus(recentDate, now), DeviceStatus.ONLINE);
    // 1.3 Delayed reading (90 seconds ago) -> STALE (60s < age <= 180s)
    const delayedDate = new Date(now.getTime() - 90 * 1000);
    assert.strictEqual(calculateDeviceStatus(delayedDate, now), DeviceStatus.STALE);
    // 1.4 Old reading (300 seconds ago) -> OFFLINE (> 180s)
    const oldDate = new Date(now.getTime() - 300 * 1000);
    assert.strictEqual(calculateDeviceStatus(oldDate, now), DeviceStatus.OFFLINE);
    console.log('✓ Test 1 passed: Device status accurately calculated according to thresholds.');

    // TEST 2: Initial Backfill Synchronization on Bag A
    console.log('Test 2: Testing initial backfill synchronization on Bag A...');
    const bagASyncResult = await deviceSyncService.syncDevice(bagA.id);
    assert.strictEqual(bagASyncResult.success, true);
    assert.strictEqual(bagASyncResult.isInitialSync, true);
    assert.strictEqual(bagASyncResult.newReadingsCount, 20);

    // Verify readings in PostgreSQL for Bag A
    const bagAReadings = await prisma.sensorReading.findMany({
      where: { deviceId: bagA.id },
      orderBy: { thingSpeakEntryId: 'asc' },
    });
    assert.strictEqual(bagAReadings.length, 20);
    assert.strictEqual(bagAReadings[0].thingSpeakEntryId, 1);
    assert.strictEqual(bagAReadings[19].thingSpeakEntryId, 20);
    // Verify field mapping
    assert.ok(typeof bagAReadings[0].coldTemperature === 'number');
    assert.ok(typeof bagAReadings[0].hotTemperature === 'number');
    assert.ok(typeof bagAReadings[0].humidity === 'number');

    // Verify lastSeenAt is the newest feed's created_at, NOT fetch time
    const updatedBagA = await prisma.device.findUnique({ where: { id: bagA.id } });
    assert.ok(updatedBagA?.lastSeenAt);
    const expectedLastSeen = new Date(bagAFeeds[19].created_at).getTime();
    assert.strictEqual(updatedBagA.lastSeenAt.getTime(), expectedLastSeen);
    console.log('✓ Test 2 passed: Initial backfill synced exactly 20 readings and updated lastSeenAt to sensor timestamp.');

    // TEST 3: Deduplication
    console.log('Test 3: Testing deduplication on repeated sync...');
    const repeatSync = await deviceSyncService.syncDevice(bagA.id);
    assert.strictEqual(repeatSync.success, true);
    assert.strictEqual(repeatSync.newReadingsCount, 0, 'No new duplicate rows should be inserted');

    const bagAReadingsAfterRepeat = await prisma.sensorReading.count({
      where: { deviceId: bagA.id },
    });
    assert.strictEqual(bagAReadingsAfterRepeat, 20, 'Count must remain 20 after duplicate sync run');
    console.log('✓ Test 3 passed: Deduplication prevents duplicate rows on repeated sync.');

    // TEST 4: Incremental Sync with New Feeds
    console.log('Test 4: Testing incremental synchronization with new feeds...');
    const newFeedDate = new Date().toISOString();
    bagAFeeds.push({
      entry_id: 21,
      created_at: newFeedDate,
      field1: '3.9',
      field3: '65.2',
      field4: '54.0',
    });

    const incrementalSync = await deviceSyncService.syncDevice(bagA.id);
    assert.strictEqual(incrementalSync.success, true);
    assert.strictEqual(incrementalSync.newReadingsCount, 1, 'Only the new entry 21 should be inserted');

    const countAfterInc = await prisma.sensorReading.count({ where: { deviceId: bagA.id } });
    assert.strictEqual(countAfterInc, 21);

    const bagAAfterInc = await prisma.device.findUnique({ where: { id: bagA.id } });
    assert.strictEqual(bagAAfterInc?.lastSeenAt?.getTime(), new Date(newFeedDate).getTime());
    // Since newFeedDate is now, status should be ONLINE
    assert.strictEqual(bagAAfterInc?.status, DeviceStatus.ONLINE);
    console.log('✓ Test 4 passed: Incremental sync captured new feed and transitioned status to ONLINE.');

    // TEST 5: Multi-Bag Verification & Isolation
    console.log('Test 5: Testing multi-bag synchronization and isolation (Bag A vs Bag B)...');
    const bagBSyncResult = await deviceSyncService.syncDevice(bagB.id);
    assert.strictEqual(bagBSyncResult.success, true);
    assert.strictEqual(bagBSyncResult.newReadingsCount, 15);

    // Verify Bag B readings have ONLY Bag B's deviceId
    const bagBReadings = await prisma.sensorReading.findMany({ where: { deviceId: bagB.id } });
    assert.strictEqual(bagBReadings.length, 15);
    for (const reading of bagBReadings) {
      assert.strictEqual(reading.deviceId, bagB.id);
      assert.notStrictEqual(reading.deviceId, bagA.id);
    }

    // Verify Bag A readings still strictly belong to Bag A
    const bagAReadingsFinal = await prisma.sensorReading.findMany({ where: { deviceId: bagA.id } });
    assert.strictEqual(bagAReadingsFinal.length, 21);
    for (const reading of bagAReadingsFinal) {
      assert.strictEqual(reading.deviceId, bagA.id);
      assert.notStrictEqual(reading.deviceId, bagB.id);
    }

    // Verify requests were made with respective keys
    const requestsForA = requestsReceived.filter((r) => r.url.includes('80001'));
    const requestsForB = requestsReceived.filter((r) => r.url.includes('80002'));
    assert.ok(requestsForA.length > 0);
    assert.ok(requestsForB.length > 0);
    assert.ok(requestsForA.every((r) => r.apiKey === 'KEY_SYNC_BAG_A'));
    assert.ok(requestsForB.every((r) => r.apiKey === 'KEY_SYNC_BAG_B'));
    console.log('✓ Test 5 passed: Multi-bag isolation verified: Bag A and Bag B keep separate data and keys.');

    // TEST 6: Failure Isolation (Bag C fails without stopping Bag A & Bag B)
    console.log('Test 6: Testing failure isolation during syncAllDevices...');
    const syncSummary = await deviceSyncService.syncAllDevices();
    assert.strictEqual(syncSummary.totalDevices, preExistingDeviceCount + 3);
    assert.strictEqual(syncSummary.successfulSyncs, 2);
    assert.strictEqual(syncSummary.failedSyncs, preExistingDeviceCount + 1);

    const failedResult = syncSummary.results.find((r) => r.deviceId === bagC.id);
    assert.ok(failedResult);
    assert.strictEqual(failedResult.success, false);
    assert.strictEqual(failedResult.status, DeviceStatus.OFFLINE);

    // Verify failing Bag C never touched readings or became ONLINE
    const bagCReadings = await prisma.sensorReading.count({ where: { deviceId: bagC.id } });
    assert.strictEqual(bagCReadings, 0);
    const bagCInDb = await prisma.device.findUnique({ where: { id: bagC.id } });
    assert.strictEqual(bagCInDb?.status, DeviceStatus.OFFLINE);
    console.log('✓ Test 6 passed: Failure on Bag C was cleanly isolated; Bag A & B synced without interruption.');

    // TEST 7: Missing/Null Sensor Fields
    console.log('Test 7: Testing null sensor fields preservation (no fabricated numbers)...');
    bagAFeeds.push({
      entry_id: 22,
      created_at: new Date().toISOString(),
      field1: null,
      field3: '',
      field4: 'invalid_number',
    });
    await deviceSyncService.syncDevice(bagA.id);
    const reading22 = await prisma.sensorReading.findUnique({
      where: { deviceId_thingSpeakEntryId: { deviceId: bagA.id, thingSpeakEntryId: 22 } },
    });
    assert.ok(reading22);
    assert.strictEqual(reading22.coldTemperature, null);
    assert.strictEqual(reading22.hotTemperature, null);
    assert.strictEqual(reading22.humidity, null);
    console.log('✓ Test 7 passed: Null/empty/invalid sensor fields preserved as null without NaN.');

    // TEST 8: DeviceSyncWorker Lifecycle & Concurrency Guard
    console.log('Test 8: Testing DeviceSyncWorker lifecycle and concurrency guard...');
    const testWorker = new DeviceSyncWorker(5000);
    assert.strictEqual(testWorker.getStatus().isRunning, false);

    testWorker.start();
    assert.strictEqual(testWorker.getStatus().isRunning, true);

    // Calling start again should not create duplicate timers or crash
    testWorker.start();
    assert.strictEqual(testWorker.getStatus().isRunning, true);

    // Concurrency guard: simulate long running job
    (testWorker as any).isProcessing = true;
    const skippedRun = await testWorker.runSyncCycle();
    assert.strictEqual(skippedRun.skipped, true);
    (testWorker as any).isProcessing = false;

    // Graceful stop
    await testWorker.stop();
    assert.strictEqual(testWorker.getStatus().isRunning, false);
    console.log('✓ Test 8 passed: Worker lifecycle, non-overlapping guard, and clean shutdown verified.');

    // TEST 9: Manual Sync Endpoint Authentication & Role Authorization
    console.log('Test 9: Testing manual sync endpoint POST /api/v1/devices/:id/sync...');
    // 9.1 Unauthenticated -> 401
    const resNoAuth = await apiRequest('POST', `/api/v1/devices/${bagA.id}/sync`);
    assert.strictEqual(resNoAuth.status, 401);

    // 9.2 VIEWER -> 403
    const resViewer = await apiRequest('POST', `/api/v1/devices/${bagA.id}/sync`, viewerToken);
    assert.strictEqual(resViewer.status, 403);

    // 9.3 Non-owner OPERATOR -> 403
    const resWrongOp = await apiRequest('POST', `/api/v1/devices/${bagA.id}/sync`, otherOperatorToken);
    assert.strictEqual(resWrongOp.status, 403);

    // 9.4 Owner OPERATOR -> 200
    const resOwnerOp = await apiRequest('POST', `/api/v1/devices/${bagA.id}/sync`, operatorToken);
    assert.strictEqual(resOwnerOp.status, 200);
    assert.strictEqual(resOwnerOp.body.success, true);
    assert.strictEqual(resOwnerOp.body.data.deviceId, bagA.id);
    assert.strictEqual(resOwnerOp.body.data.deviceCode, bagA.deviceCode);
    assert.ok(resOwnerOp.body.data.status);
    // Ensure no credentials leak
    assert.strictEqual(resOwnerOp.body.data.thingSpeakReadKey, undefined);
    assert.strictEqual(resOwnerOp.body.data.apiKey, undefined);

    // 9.5 ADMIN -> 200 (can sync any device)
    const resAdmin = await apiRequest('POST', `/api/v1/devices/${bagA.id}/sync`, adminToken);
    assert.strictEqual(resAdmin.status, 200);
    assert.strictEqual(resAdmin.body.success, true);

    // 9.6 Non-existent device -> 404
    const res404 = await apiRequest(
      'POST',
      '/api/v1/devices/00000000-0000-0000-0000-000000000000/sync',
      adminToken
    );
    assert.strictEqual(res404.status, 404);
    console.log('✓ Test 9 passed: Manual sync endpoint strictly enforces authentication and RBAC.');

    // TEST 10: Credential Non-Leakage Verification
    console.log('Test 10: Verifying credentials never leak in sync results...');
    const resultObjStr = JSON.stringify(resOwnerOp.body);
    assert.ok(!resultObjStr.includes('KEY_SYNC_BAG_A'), 'Decrypted API key must never appear in response JSON');
    assert.ok(!resultObjStr.includes('thingSpeakReadKey'), 'thingSpeakReadKey field must never appear in response JSON');
    console.log('✓ Test 10 passed: Zero credential exposure confirmed across responses.');

    // TEST 11: Real-time Device Status Endpoint
    console.log('Test 11: Testing dynamic status in GET /api/v1/devices/:id/status...');
    bagAFeeds.push({
      entry_id: 23,
      created_at: new Date().toISOString(),
      field1: '3.9',
      field3: '65.2',
      field4: '54.0',
    });
    await deviceSyncService.syncDevice(bagA.id);
    const statusRes = await apiRequest('GET', `/api/v1/devices/${bagA.id}/status`, operatorToken);
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.data.status, DeviceStatus.ONLINE);
    assert.strictEqual(statusRes.body.data.hasSyncReadings, true);
    console.log('✓ Test 11 passed: Device status endpoint reflects real-time status.');

    console.log('====================================================');
    console.log('✓ ALL 11 PART 5 SYNC INTEGRATION TESTS PASSED!');
    console.log('====================================================');
  } finally {
    if (serverInstance) {
      (serverInstance as http.Server).close();
    }
    await new Promise<void>((resolve) => {
      mockServer.close(() => resolve());
    });
  }
}

runSyncTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
