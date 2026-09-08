import assert from 'node:assert/strict';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import { UserRole, AlertType, AlertSeverity } from '@prisma/client';
import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { signJwtToken } from '../src/utils/jwt.js';
import { alertService } from '../src/services/alert.service.js';
import { alertConfig, calculateAlertSeverity } from '../src/config/alert.config.js';
import { deviceSyncService } from '../src/services/device-sync.service.js';
import { thingspeakService } from '../src/services/thingspeak.service.js';
import { encryptText } from '../src/utils/crypto.js';

async function runAlertsAndAnalyticsTests() {
  console.log('====================================================');
  console.log('--- Starting Part 6: Alert Engine & Analytics Tests ---');
  console.log('====================================================');

  const appPort = 5996;
  const mockPort = 5995;

  // Cleanup test artifacts
  await prisma.sensorReading.deleteMany({
    where: {
      device: {
        deviceCode: { in: ['BAG-ALERT-A', 'BAG-ALERT-B', 'BAG-ALERT-FAIL'] },
      },
    },
  });
  await prisma.alert.deleteMany({
    where: {
      device: {
        deviceCode: { in: ['BAG-ALERT-A', 'BAG-ALERT-B', 'BAG-ALERT-FAIL'] },
      },
    },
  });
  await prisma.deviceSettings.deleteMany({
    where: {
      device: {
        deviceCode: { in: ['BAG-ALERT-A', 'BAG-ALERT-B', 'BAG-ALERT-FAIL'] },
      },
    },
  });
  await prisma.device.deleteMany({
    where: {
      deviceCode: { in: ['BAG-ALERT-A', 'BAG-ALERT-B', 'BAG-ALERT-FAIL'] },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'admin.part6@infinos.local',
          'op1.part6@infinos.local',
          'op2.part6@infinos.local',
          'viewer.part6@infinos.local',
        ],
      },
    },
  });

  const hashedPw = await bcrypt.hash('TestPass123!', 10);

  // Seed Users
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin Part6',
      email: 'admin.part6@infinos.local',
      passwordHash: hashedPw,
      role: UserRole.ADMIN,
    },
  });
  const op1User = await prisma.user.create({
    data: {
      name: 'Operator 1 Part6',
      email: 'op1.part6@infinos.local',
      passwordHash: hashedPw,
      role: UserRole.OPERATOR,
    },
  });
  const op2User = await prisma.user.create({
    data: {
      name: 'Operator 2 Part6',
      email: 'op2.part6@infinos.local',
      passwordHash: hashedPw,
      role: UserRole.OPERATOR,
    },
  });
  const viewerUser = await prisma.user.create({
    data: {
      name: 'Viewer Part6',
      email: 'viewer.part6@infinos.local',
      passwordHash: hashedPw,
      role: UserRole.VIEWER,
    },
  });

  const adminToken = signJwtToken({ userId: adminUser.id, role: adminUser.role });
  const op1Token = signJwtToken({ userId: op1User.id, role: op1User.role });
  const op2Token = signJwtToken({ userId: op2User.id, role: op2User.role });
  const viewerToken = signJwtToken({ userId: viewerUser.id, role: viewerUser.role });

  // Seed Devices
  const bagA = await prisma.device.create({
    data: {
      deviceCode: 'BAG-ALERT-A',
      name: 'Smart Bag Alpha (Cold focus)',
      thingSpeakChannelId: '88001',
      thingSpeakReadKey: encryptText('KEY_BAG_A'),
      ownerId: op1User.id,
    },
  });

  const bagB = await prisma.device.create({
    data: {
      deviceCode: 'BAG-ALERT-B',
      name: 'Smart Bag Beta (Hot focus)',
      thingSpeakChannelId: '88002',
      thingSpeakReadKey: encryptText('KEY_BAG_B'),
      ownerId: op2User.id,
    },
  });

  // Start express test server
  const server = app.listen(appPort);
  const baseUrl = `http://127.0.0.1:${appPort}/api/v1`;

  try {
    // ----------------------------------------------------
    // TEST 1: Device Settings Default & Auto-Creation (GET)
    // ----------------------------------------------------
    console.log('Test 1: Testing GET /api/v1/devices/:id/settings default retrieval...');
    const getSettingsRes = await fetch(`${baseUrl}/devices/${bagA.id}/settings`, {
      headers: { Authorization: `Bearer ${op1Token}` },
    });
    assert.equal(getSettingsRes.status, 200);
    const getSettingsJson = await getSettingsRes.json();
    assert.equal(getSettingsJson.success, true);
    assert.equal(getSettingsJson.data.deviceId, bagA.id);
    assert.equal(getSettingsJson.data.coldTempMin, alertConfig.defaultThresholds.coldTempMin);
    assert.equal(getSettingsJson.data.coldTempMax, alertConfig.defaultThresholds.coldTempMax);
    assert.equal(getSettingsJson.data.alertsEnabled, true);
    console.log('✓ Test 1 passed: Device settings auto-created with default thresholds.');

    // ----------------------------------------------------
    // TEST 2: Device Settings Modification (PATCH)
    // ----------------------------------------------------
    console.log('Test 2: Testing PATCH /api/v1/devices/:id/settings threshold updates...');
    const patchSettingsRes = await fetch(`${baseUrl}/devices/${bagA.id}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${op1Token}`,
      },
      body: JSON.stringify({
        coldTempMin: 1.0,
        coldTempMax: 6.0,
        hotTempMin: 55.0,
        hotTempMax: 68.0,
        humidityMin: 30.0,
        humidityMax: 75.0,
        alertsEnabled: true,
      }),
    });
    assert.equal(patchSettingsRes.status, 200);
    const patchSettingsJson = await patchSettingsRes.json();
    assert.equal(patchSettingsJson.data.coldTempMin, 1.0);
    assert.equal(patchSettingsJson.data.coldTempMax, 6.0);
    assert.equal(patchSettingsJson.data.hotTempMin, 55.0);
    assert.equal(patchSettingsJson.data.hotTempMax, 68.0);
    console.log('✓ Test 2 passed: Device settings updated successfully.');

    // ----------------------------------------------------
    // TEST 3: Settings Validation (Min > Max, Invalid numbers)
    // ----------------------------------------------------
    console.log('Test 3: Testing settings validation on invalid values...');
    // A. Cold Min > Cold Max
    const invalidMinMaxRes = await fetch(`${baseUrl}/devices/${bagA.id}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${op1Token}`,
      },
      body: JSON.stringify({
        coldTempMin: 10.0,
        coldTempMax: 4.0,
      }),
    });
    assert.equal(invalidMinMaxRes.status, 400, 'Cold Min > Max must fail with 400');

    // B. Invalid humidity (> 100)
    const invalidHumidityRes = await fetch(`${baseUrl}/devices/${bagA.id}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${op1Token}`,
      },
      body: JSON.stringify({
        humidityMax: 150.0,
      }),
    });
    assert.equal(invalidHumidityRes.status, 400, 'Humidity > 100 must fail with 400');

    // C. Non-numeric / NaN value
    const nanRes = await fetch(`${baseUrl}/devices/${bagA.id}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${op1Token}`,
      },
      body: JSON.stringify({
        hotTempMin: 'not-a-number',
      }),
    });
    assert.equal(nanRes.status, 400, 'Non-numeric threshold must fail with 400');
    console.log('✓ Test 3 passed: Settings validation rejects invalid/out-of-bounds parameters.');

    // ----------------------------------------------------
    // TEST 4: Settings Authorization & RBAC
    // ----------------------------------------------------
    console.log('Test 4: Testing settings RBAC (Owner vs Non-owner vs Viewer)...');
    // Op2 tries to PATCH Bag A (owned by Op1) -> 403
    const op2ForbiddenRes = await fetch(`${baseUrl}/devices/${bagA.id}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${op2Token}`,
      },
      body: JSON.stringify({ coldTempMin: 2.0 }),
    });
    assert.equal(op2ForbiddenRes.status, 403, 'Non-owner operator must be forbidden');

    // Viewer tries to PATCH Bag A -> 403
    const viewerForbiddenRes = await fetch(`${baseUrl}/devices/${bagA.id}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${viewerToken}`,
      },
      body: JSON.stringify({ coldTempMin: 2.0 }),
    });
    assert.equal(viewerForbiddenRes.status, 403, 'Viewer must not be authorized to modify settings');

    // Viewer CAN read settings -> 200
    const viewerGetRes = await fetch(`${baseUrl}/devices/${bagA.id}/settings`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    assert.equal(viewerGetRes.status, 200, 'Viewer can view settings read-only');

    // Admin CAN PATCH any settings -> 200
    const adminPatchRes = await fetch(`${baseUrl}/devices/${bagA.id}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ coldTempMin: 1.5 }),
    });
    assert.equal(adminPatchRes.status, 200, 'Admin can modify any device settings');
    console.log('✓ Test 4 passed: Settings RBAC strictly enforced across Admin, Operator, and Viewer.');

    // ----------------------------------------------------
    // TEST 4b: Normal Values & Null Values Evaluation
    // ----------------------------------------------------
    console.log('Test 4b: Testing normal readings and null values produce 0 alerts...');
    // A. Normal safe values
    await alertService.evaluateReadings(bagA.id, [
      {
        coldTemperature: 4.0,
        hotTemperature: 60.0,
        humidity: 50.0,
        recordedAt: new Date(Date.now() - 120000),
      },
    ]);
    const alertsAfterNormal = await prisma.alert.findMany({
      where: { deviceId: bagA.id },
    });
    assert.equal(alertsAfterNormal.length, 0, 'Normal values must not create any alerts');

    // B. Null sensor values (missing fields must not generate alerts or fabricate data)
    await alertService.evaluateReadings(bagA.id, [
      {
        coldTemperature: null,
        hotTemperature: null,
        humidity: null,
        recordedAt: new Date(Date.now() - 90000),
      },
    ]);
    const alertsAfterNull = await prisma.alert.findMany({
      where: { deviceId: bagA.id },
    });
    assert.equal(alertsAfterNull.length, 0, 'Null values must never create any alerts');
    console.log('✓ Test 4b passed: Normal values and null readings correctly produce 0 alerts.');

    // ----------------------------------------------------
    // TEST 5: Alert Engine Evaluation & Severity (WARNING vs CRITICAL)
    // ----------------------------------------------------
    console.log('Test 5: Testing alert evaluation engine and severity calculation...');
    // Bag A thresholds: coldTempMin: 1.5, coldTempMax: 6.0
    // Margin for cold temp is 2.0. So:
    // val = 7.0 is > 6.0 but < 6.0 + 2.0 (8.0) -> WARNING
    // val = 9.0 is >= 6.0 + 2.0 (8.0) -> CRITICAL
    const now = new Date();

    // 1. Send Reading with Cold Temp = 7.0 (Breach threshold 6.0 -> WARNING)
    await alertService.evaluateReadings(bagA.id, [
      {
        coldTemperature: 7.0,
        hotTemperature: 60.0, // safe (55 - 68)
        humidity: 50.0,       // safe (30 - 75)
        recordedAt: new Date(now.getTime() - 60000),
      },
    ]);

    let activeAlertsA = await prisma.alert.findMany({
      where: { deviceId: bagA.id, isResolved: false },
    });
    assert.equal(activeAlertsA.length, 1);
    assert.equal(activeAlertsA[0].type, AlertType.COLD_TEMPERATURE_HIGH);
    assert.equal(activeAlertsA[0].severity, AlertSeverity.WARNING);
    assert.equal(activeAlertsA[0].triggerValue, 7.0);

    // 2. Send Reading with Cold Temp = 9.5 (Exceeds critical margin -> upgrades to CRITICAL)
    await alertService.evaluateReadings(bagA.id, [
      {
        coldTemperature: 9.5,
        hotTemperature: 60.0,
        humidity: 50.0,
        recordedAt: new Date(now.getTime() - 40000),
      },
    ]);

    activeAlertsA = await prisma.alert.findMany({
      where: { deviceId: bagA.id, isResolved: false },
    });
    // Requirement 5: Duplicate alert prevention -> should STILL be only 1 active alert!
    assert.equal(activeAlertsA.length, 1, 'Duplicate active alert must not be created');
    assert.equal(activeAlertsA[0].severity, AlertSeverity.CRITICAL, 'Severity must be upgraded to CRITICAL');
    assert.equal(activeAlertsA[0].triggerValue, 9.5, 'Trigger value must be updated to latest');
    console.log('✓ Test 5 passed: Alert generated with WARNING and escalated to CRITICAL without duplicating.');

    // ----------------------------------------------------
    // TEST 6: Duplicate Alert Prevention
    // ----------------------------------------------------
    console.log('Test 6: Testing duplicate alert prevention on repeated violations...');
    // Send 3 more violating readings
    for (let i = 1; i <= 3; i++) {
      await alertService.evaluateReadings(bagA.id, [
        {
          coldTemperature: 9.8 + i * 0.1,
          hotTemperature: 60.0,
          humidity: 50.0,
          recordedAt: new Date(now.getTime() - (30000 - i * 5000)),
        },
      ]);
    }
    const alertCountAfterRepeats = await prisma.alert.count({
      where: { deviceId: bagA.id, type: AlertType.COLD_TEMPERATURE_HIGH },
    });
    assert.equal(alertCountAfterRepeats, 1, 'Exactly 1 alert event must exist during continuous breach');
    console.log('✓ Test 6 passed: Continuous violations retain active alert and produce 0 duplicate rows.');

    // ----------------------------------------------------
    // TEST 7: Auto-Resolution on In-Range Reading
    // ----------------------------------------------------
    console.log('Test 7: Testing automatic resolution when sensor returns to safe range...');
    const recoveryTime = new Date();
    await alertService.evaluateReadings(bagA.id, [
      {
        coldTemperature: 4.0, // safe inside [1.5, 6.0]
        hotTemperature: 60.0,
        humidity: 50.0,
        recordedAt: recoveryTime,
      },
    ]);

    const activeAfterRecovery = await prisma.alert.findMany({
      where: { deviceId: bagA.id, isResolved: false },
    });
    assert.equal(activeAfterRecovery.length, 0, 'Active alert must be resolved');

    const resolvedAlert = await prisma.alert.findFirst({
      where: { deviceId: bagA.id, type: AlertType.COLD_TEMPERATURE_HIGH },
    });
    assert.ok(resolvedAlert?.isResolved, 'Alert is marked resolved');
    assert.ok(resolvedAlert?.resolvedAt, 'Resolved timestamp is recorded');
    console.log('✓ Test 7 passed: Alert automatically resolved when readings normalized.');

    // ----------------------------------------------------
    // TEST 8: Alert Re-Trigger After Resolution
    // ----------------------------------------------------
    console.log('Test 8: Testing alert re-trigger creates a new event after resolution...');
    const reTriggerTime = new Date(Date.now() + 5000);
    await alertService.evaluateReadings(bagA.id, [
      {
        coldTemperature: 8.5, // breached again!
        hotTemperature: 60.0,
        humidity: 50.0,
        recordedAt: reTriggerTime,
      },
    ]);

    const allColdHighAlerts = await prisma.alert.findMany({
      where: { deviceId: bagA.id, type: AlertType.COLD_TEMPERATURE_HIGH },
      orderBy: { triggeredAt: 'asc' },
    });
    assert.equal(allColdHighAlerts.length, 2, 'Should now have 2 events: 1 resolved, 1 active');
    assert.equal(allColdHighAlerts[0].isResolved, true);
    assert.equal(allColdHighAlerts[1].isResolved, false);
    console.log('✓ Test 8 passed: New distinct alert created when violation recurs after resolution.');

    // ----------------------------------------------------
    // TEST 9: Multiple Sensor Types Violation (Cold, Hot, Humidity)
    // ----------------------------------------------------
    console.log('Test 9: Testing multiple sensor violations simultaneously...');
    // Breaching hot temperature (hotTempMin: 55, val: 40 -> HOT_TEMPERATURE_LOW)
    // Breaching humidity (humidityMax: 75, val: 90 -> HUMIDITY_HIGH)
    await alertService.evaluateReadings(bagA.id, [
      {
        coldTemperature: 4.0, // resolves active cold alert
        hotTemperature: 40.0, // breach hot low
        humidity: 90.0,       // breach humidity high
        recordedAt: new Date(Date.now() + 10000),
      },
    ]);

    const activeMultiple = await prisma.alert.findMany({
      where: { deviceId: bagA.id, isResolved: false },
    });
    const types = activeMultiple.map((a) => a.type);
    assert.ok(types.includes(AlertType.HOT_TEMPERATURE_LOW));
    assert.ok(types.includes(AlertType.HUMIDITY_HIGH));
    assert.ok(!types.includes(AlertType.COLD_TEMPERATURE_HIGH), 'Cold alert should have been resolved');
    console.log('✓ Test 9 passed: Multiple sensor types independently evaluated and alerted.');

    // ----------------------------------------------------
    // TEST 10: Manual Alert Resolution (PATCH /api/v1/alerts/:id/resolve)
    // ----------------------------------------------------
    console.log('Test 10: Testing manual alert resolution endpoint...');
    const alertToResolve = activeMultiple.find((a) => a.type === AlertType.HOT_TEMPERATURE_LOW)!;

    // Viewer cannot resolve -> 403
    const viewerResolveRes = await fetch(`${baseUrl}/alerts/${alertToResolve.id}/resolve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    assert.equal(viewerResolveRes.status, 403, 'Viewer cannot resolve alerts');

    // Op2 cannot resolve Op1 alert -> 403
    const op2ResolveRes = await fetch(`${baseUrl}/alerts/${alertToResolve.id}/resolve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${op2Token}` },
    });
    assert.equal(op2ResolveRes.status, 403, 'Unowned operator cannot resolve alert');

    // Op1 CAN resolve owned alert -> 200
    const op1ResolveRes = await fetch(`${baseUrl}/alerts/${alertToResolve.id}/resolve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${op1Token}` },
    });
    assert.equal(op1ResolveRes.status, 200);
    const resolvedJson = await op1ResolveRes.json();
    assert.equal(resolvedJson.data.isResolved, true);
    assert.equal(resolvedJson.data.resolvedById, op1User.id);
    console.log('✓ Test 10 passed: Manual alert resolution strictly verifies ownership and roles.');

    // ----------------------------------------------------
    // TEST 11: Alert History API & Filtering
    // ----------------------------------------------------
    console.log('Test 11: Testing alert history endpoints with filters...');
    // A. Device-specific alerts: GET /api/v1/devices/:id/alerts
    const devAlertsRes = await fetch(`${baseUrl}/devices/${bagA.id}/alerts?status=all`, {
      headers: { Authorization: `Bearer ${op1Token}` },
    });
    assert.equal(devAlertsRes.status, 200);
    const devAlertsJson = await devAlertsRes.json();
    assert.ok(devAlertsJson.data.length >= 2);
    assert.ok(devAlertsJson.pagination.total >= 2);

    // Verify ThingSpeak keys NEVER leak
    for (const a of devAlertsJson.data) {
      assert.equal(a.device.thingSpeakReadKey, undefined);
      assert.equal(a.device.channelApiKey, undefined);
    }

    // B. Filter active only
    const activeOnlyRes = await fetch(`${baseUrl}/devices/${bagA.id}/alerts?status=active`, {
      headers: { Authorization: `Bearer ${op1Token}` },
    });
    const activeOnlyJson = await activeOnlyRes.json();
    for (const a of activeOnlyJson.data) {
      assert.equal(a.isResolved, false);
    }

    // C. Global alerts GET /api/v1/alerts
    const globalAlertsRes = await fetch(`${baseUrl}/alerts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(globalAlertsRes.status, 200);
    const globalAlertsJson = await globalAlertsRes.json();
    assert.ok(globalAlertsJson.data.length >= 2);
    console.log('✓ Test 11 passed: Alert history filtering and pagination working without credential leakage.');

    // ----------------------------------------------------
    // TEST 12: Multi-Bag Isolation (Bag A vs Bag B)
    // ----------------------------------------------------
    console.log('Test 12: Testing multi-bag alert isolation (Bag A vs Bag B)...');
    // Bag B threshold: coldTempMax: 10.0 (higher threshold)
    await prisma.deviceSettings.upsert({
      where: { deviceId: bagB.id },
      create: {
        deviceId: bagB.id,
        coldTempMin: 0.0,
        coldTempMax: 10.0,
        hotTempMin: 40.0,
        hotTempMax: 70.0,
        humidityMin: 10.0,
        humidityMax: 90.0,
      },
      update: {
        coldTempMax: 10.0,
      },
    });

    // Send a reading with coldTemperature: 7.0 to both Bag A and Bag B
    // For Bag A (coldTempMax: 6.0), 7.0 is a VIOLATION.
    // For Bag B (coldTempMax: 10.0), 7.0 is SAFE.
    await alertService.evaluateReadings(bagA.id, [
      {
        coldTemperature: 7.0,
        hotTemperature: 60.0,
        humidity: 50.0,
        recordedAt: new Date(),
      },
    ]);
    await alertService.evaluateReadings(bagB.id, [
      {
        coldTemperature: 7.0,
        hotTemperature: 60.0,
        humidity: 50.0,
        recordedAt: new Date(),
      },
    ]);

    const alertsBagA = await prisma.alert.findMany({
      where: { deviceId: bagA.id, isResolved: false, type: AlertType.COLD_TEMPERATURE_HIGH },
    });
    const alertsBagB = await prisma.alert.findMany({
      where: { deviceId: bagB.id },
    });

    assert.equal(alertsBagA.length, 1, 'Bag A must have active violation');
    assert.equal(alertsBagB.length, 0, 'Bag B must have 0 violations');
    console.log('✓ Test 12 passed: Multi-bag isolation verified; Bag A violation never affects Bag B.');

    // ----------------------------------------------------
    // TEST 13: Analytics Summary Endpoint
    // ----------------------------------------------------
    console.log('Test 13: Testing GET /api/v1/devices/:id/analytics/summary...');
    // Seed 10 sequential readings into Bag A in PostgreSQL
    const baseTime = Date.now() - 3600000;
    const readingsToSeed = [];
    for (let i = 1; i <= 10; i++) {
      readingsToSeed.push({
        deviceId: bagA.id,
        thingSpeakEntryId: 500 + i,
        recordedAt: new Date(baseTime + i * 60000),
        coldTemperature: 2.0 + i * 0.5, // 2.5 to 7.0
        hotTemperature: 50.0 + i,       // 51.0 to 60.0
        humidity: 40.0 + i * 2,         // 42.0 to 60.0
      });
    }
    await prisma.sensorReading.createMany({
      data: readingsToSeed,
      skipDuplicates: true,
    });

    const summaryRes = await fetch(`${baseUrl}/devices/${bagA.id}/analytics/summary`, {
      headers: { Authorization: `Bearer ${op1Token}` },
    });
    assert.equal(summaryRes.status, 200);
    const summaryJson = await summaryRes.json();
    const data = summaryJson.data;

    assert.equal(data.deviceId, bagA.id);
    assert.equal(data.readingCount, 10);
    assert.equal(data.minimum.coldTemperature, 2.5);
    assert.equal(data.maximum.coldTemperature, 7.0);
    assert.equal(data.minimum.hotTemperature, 51.0);
    assert.equal(data.maximum.hotTemperature, 60.0);
    assert.equal(data.minimum.humidity, 42.0);
    assert.equal(data.maximum.humidity, 60.0);
    assert.equal(data.latest.coldTemperature, 7.0);
    assert.ok(data.average.coldTemperature > 4.0 && data.average.coldTemperature < 5.5);
    console.log('✓ Test 13 passed: Analytics summary aggregates calculated correctly from PostgreSQL.');

    // ----------------------------------------------------
    // TEST 14: Analytics Timeseries Endpoint & Date Filtering
    // ----------------------------------------------------
    console.log('Test 14: Testing GET /api/v1/devices/:id/analytics/timeseries...');
    const timeseriesRes = await fetch(`${baseUrl}/devices/${bagA.id}/analytics/timeseries?limit=5`, {
      headers: { Authorization: `Bearer ${op1Token}` },
    });
    assert.equal(timeseriesRes.status, 200);
    const timeseriesJson = await timeseriesRes.json();
    assert.equal(timeseriesJson.data.count, 5);
    assert.equal(timeseriesJson.data.readings.length, 5);

    // Verify chronological ordering (ASC)
    const tReadings = timeseriesJson.data.readings;
    for (let i = 1; i < tReadings.length; i++) {
      const prev = new Date(tReadings[i - 1].recordedAt).getTime();
      const curr = new Date(tReadings[i].recordedAt).getTime();
      assert.ok(curr >= prev, 'Readings must be in chronological ascending order');
    }

    // Date range filtering
    const fromIso = new Date(baseTime + 3 * 60000).toISOString();
    const toIso = new Date(baseTime + 6 * 60000).toISOString();
    const filteredRes = await fetch(
      `${baseUrl}/devices/${bagA.id}/analytics/timeseries?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
      {
        headers: { Authorization: `Bearer ${op1Token}` },
      }
    );
    assert.equal(filteredRes.status, 200);
    const filteredJson = await filteredRes.json();
    assert.equal(filteredJson.data.count, 4); // indices 3, 4, 5, 6
    console.log('✓ Test 14 passed: Timeseries endpoint returns chronological data with date filtering.');

    // ----------------------------------------------------
    // TEST 15: Analytics RBAC
    // ----------------------------------------------------
    console.log('Test 15: Testing analytics RBAC...');
    // Op2 cannot view Bag A analytics -> 403
    const op2SummaryRes = await fetch(`${baseUrl}/devices/${bagA.id}/analytics/summary`, {
      headers: { Authorization: `Bearer ${op2Token}` },
    });
    assert.equal(op2SummaryRes.status, 403, 'Non-owner operator forbidden from viewing analytics');

    // Admin can view Bag A analytics -> 200
    const adminSummaryRes = await fetch(`${baseUrl}/devices/${bagA.id}/analytics/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminSummaryRes.status, 200);

    // Viewer can view Bag A analytics -> 200
    const viewerSummaryRes = await fetch(`${baseUrl}/devices/${bagA.id}/analytics/summary`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    assert.equal(viewerSummaryRes.status, 200);
    console.log('✓ Test 15 passed: Analytics RBAC verified.');

    // ----------------------------------------------------
    // TEST 16: Failure Isolation Between Reading Storage and Alert Evaluation
    // ----------------------------------------------------
    console.log('Test 16: Testing failure isolation between reading storage and alert evaluation...');
    // Mock alertService.evaluateReadings to throw an intentional error
    const originalEvaluateReadings = alertService.evaluateReadings;
    alertService.evaluateReadings = async () => {
      throw new Error('Simulated alert engine failure (database error/bug)');
    };

    // Setup mock ThingSpeak for Bag Fail
    const failBag = await prisma.device.create({
      data: {
        deviceCode: 'BAG-ALERT-FAIL',
        name: 'Smart Bag Alert Fail Test',
        thingSpeakChannelId: '88099',
        thingSpeakReadKey: encryptText('KEY_FAIL'),
        ownerId: op1User.id,
      },
    });

    const mockServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          channel: { id: 88099, name: 'Fail Bag Test' },
          feeds: [
            {
              entry_id: 1,
              created_at: new Date().toISOString(),
              field1: '3.5',
              field3: '58.0',
              field4: '55.0',
            },
          ],
        })
      );
    });

    await new Promise<void>((resolve) => mockServer.listen(mockPort, resolve));
    const origUrl = thingspeakService.getBaseUrl();
    thingspeakService.setBaseUrl(`http://127.0.0.1:${mockPort}`);

    try {
      const syncResult = await deviceSyncService.syncDevice(failBag.id);
      // Sync must succeed despite alert evaluation throwing!
      assert.equal(syncResult.success, true, 'Sync must succeed despite alert evaluation error');
      assert.equal(syncResult.newReadingsCount, 1, 'Reading must still be stored in PostgreSQL');

      const readingInDb = await prisma.sensorReading.findFirst({
        where: { deviceId: failBag.id, thingSpeakEntryId: 1 },
      });
      assert.ok(readingInDb, 'Sensor reading must be present in PostgreSQL');
    } finally {
      thingspeakService.setBaseUrl(origUrl);
      mockServer.close();
      alertService.evaluateReadings = originalEvaluateReadings;
    }
    console.log('✓ Test 16 passed: Alert engine failure did NOT prevent sensor readings from being stored.');

    console.log('====================================================');
    console.log('✓ ALL 16 PART 6 ALERT ENGINE & ANALYTICS TESTS PASSED!');
    console.log('====================================================');
  } finally {
    server.close();
    // Cleanup test records
    await prisma.sensorReading.deleteMany({
      where: {
        device: {
          deviceCode: { in: ['BAG-ALERT-A', 'BAG-ALERT-B', 'BAG-ALERT-FAIL'] },
        },
      },
    });
    await prisma.alert.deleteMany({
      where: {
        device: {
          deviceCode: { in: ['BAG-ALERT-A', 'BAG-ALERT-B', 'BAG-ALERT-FAIL'] },
        },
      },
    });
    await prisma.deviceSettings.deleteMany({
      where: {
        device: {
          deviceCode: { in: ['BAG-ALERT-A', 'BAG-ALERT-B', 'BAG-ALERT-FAIL'] },
        },
      },
    });
    await prisma.device.deleteMany({
      where: {
        deviceCode: { in: ['BAG-ALERT-A', 'BAG-ALERT-B', 'BAG-ALERT-FAIL'] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'admin.part6@infinos.local',
            'op1.part6@infinos.local',
            'op2.part6@infinos.local',
            'viewer.part6@infinos.local',
          ],
        },
      },
    });
    await prisma.$disconnect();
  }
}

runAlertsAndAnalyticsTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
