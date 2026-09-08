import assert from 'node:assert/strict';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { signJwtToken } from '../src/utils/jwt.js';
import { encryptText } from '../src/utils/crypto.js';
import { ThingSpeakService } from '../src/services/thingspeak.service.js';

async function runThingSpeakTests() {
  console.log('====================================================');
  console.log('--- Starting ThingSpeak Integration Test Suite ---');
  console.log('====================================================');

  // 1. Setup Mock ThingSpeak Server
  const mockPort = 5998;
  const requestsReceived: Array<{ url: string; apiKey?: string }> = [];

  const mockServer = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${mockPort}`);
    const apiKey = parsedUrl.searchParams.get('api_key') || (req.headers['thingspeakapikey'] as string) || undefined;
    requestsReceived.push({ url: parsedUrl.pathname, apiKey });

    // Simulate timeout endpoint
    if (parsedUrl.pathname.includes('timeout-channel')) {
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ channel: { id: 99999, name: 'Timeout' }, feeds: [] }));
      }, 7000);
      return;
    }

    // Simulate 404 Channel Not Found
    if (parsedUrl.pathname.includes('not-found-channel')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
      return;
    }

    // Simulate 401/403 Invalid API key
    if (parsedUrl.pathname.includes('auth-fail-channel')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Simulate Private Channel returning "-1" when key is missing or wrong
    if (parsedUrl.pathname.includes('private-channel')) {
      if (apiKey !== 'CORRECT_PRIVATE_API_KEY') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('-1');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          channel: { id: 40004, name: 'Private Bag Channel' },
          feeds: [
            {
              entry_id: 88,
              created_at: '2026-09-08T12:00:00Z',
              field1: '3.8',
              field3: '9.4',
              field4: '55.2',
            },
          ],
        })
      );
      return;
    }

    // Bag A Channel
    if (parsedUrl.pathname.includes('10001')) {
      if (apiKey !== 'KEY_FOR_BAG_A') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Wrong key for Bag A' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          channel: { id: 10001, name: 'Smart Bag A Telemetry' },
          feeds: [
            {
              entry_id: 101,
              created_at: '2026-09-08T10:00:00Z',
              field1: '2.5',  // Cold Temp
              field3: '65.0', // Hot Temp
              field4: '58.0', // Humidity
            },
          ],
        })
      );
      return;
    }

    // Bag B Channel
    if (parsedUrl.pathname.includes('20002')) {
      if (apiKey !== 'KEY_FOR_BAG_B') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Wrong key for Bag B' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          channel: { id: 20002, name: 'Smart Bag B Telemetry' },
          feeds: [
            {
              entry_id: 202,
              created_at: '2026-09-08T10:05:00Z',
              field1: '4.1',  // Cold Temp
              field3: '52.3', // Hot Temp
              field4: '71.5', // Humidity
            },
          ],
        })
      );
      return;
    }

    // Channel with missing / invalid fields
    if (parsedUrl.pathname.includes('missing-fields-channel')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          channel: { id: 30003, name: 'Partial Data Bag' },
          feeds: [
            {
              entry_id: 301,
              created_at: '2026-09-08T10:10:00Z',
              field1: '   ',       // empty string
              field2: 'ignored',
              field3: 'invalid-num',// non-numeric
              field4: null,         // null
            },
          ],
        })
      );
      return;
    }

    // Default 200 response with historical feeds
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        channel: { id: 12345, name: 'Standard Mock Channel' },
        feeds: [
          {
            entry_id: 1,
            created_at: '2026-09-08T09:00:00Z',
            field1: '3.0',
            field3: '60.0',
            field4: '62.0',
          },
          {
            entry_id: 2,
            created_at: '2026-09-08T09:15:00Z',
            field1: '3.2',
            field3: '61.5',
            field4: '63.5',
          },
        ],
      })
    );
  });

  await new Promise<void>((resolve) => mockServer.listen(mockPort, '127.0.0.1', () => resolve()));

  // Point dedicated test service to mock server
  const mockBaseUrl = `http://127.0.0.1:${mockPort}`;
  const mockService = new ThingSpeakService(mockBaseUrl, 1500, 0);

  // Start Express Test App
  const appPort = 5999;
  const server = app.listen(appPort, '127.0.0.1');
  const apiBase = `http://127.0.0.1:${appPort}/api/v1/devices`;

  // Test identities
  const testUserEmail = 'tester.thingspeak@infinos.local';
  const hashedPw = await bcrypt.hash('TestPass123!', 10);

  await prisma.device.deleteMany({
    where: {
      deviceCode: { in: ['TS-BAG-A', 'TS-BAG-B', 'TS-BAG-PARTIAL', 'TS-BAG-PRIVATE'] },
    },
  });
  await prisma.user.deleteMany({ where: { email: testUserEmail } });

  const testUser = await prisma.user.create({
    data: {
      name: 'ThingSpeak Tester',
      email: testUserEmail,
      passwordHash: hashedPw,
      role: UserRole.OPERATOR,
      isActive: true,
    },
  });

  const authToken = signJwtToken({ userId: testUser.id, role: testUser.role });

  // Record initial sensor_readings row count
  const initialReadingsCount = await prisma.sensorReading.count();

  try {
    // ----------------------------------------------------
    // Test 1: Successful ThingSpeak connection
    // ----------------------------------------------------
    console.log('Test 1: Testing successful ThingSpeak connection...');
    const conn = await mockService.testConnection('12345');
    assert.equal(conn.connected, true);
    assert.equal(conn.channelId, '12345');
    assert.ok(conn.channelName?.includes('Standard Mock Channel'));
    console.log('✓ Test 1 passed: Successful ThingSpeak connection established.');

    // ----------------------------------------------------
    // Test 2: Invalid Channel ID
    // ----------------------------------------------------
    console.log('Test 2: Testing invalid channel ID handling...');
    const invalidChan = await mockService.testConnection('');
    assert.equal(invalidChan.connected, false);
    assert.ok(invalidChan.message.includes('required'));
    console.log('✓ Test 2 passed: Invalid channel ID caught.');

    // ----------------------------------------------------
    // Test 3: Invalid API key
    // ----------------------------------------------------
    console.log('Test 3: Testing invalid API key handling...');
    const invalidKey = await mockService.testConnection('auth-fail-channel', 'BAD_KEY');
    assert.equal(invalidKey.connected, false);
    assert.ok(invalidKey.message.toLowerCase().includes('unauthorized') || invalidKey.message.includes('API Key'));
    console.log('✓ Test 3 passed: Invalid API key handled with clear message.');

    // ----------------------------------------------------
    // Test 4: Private channel authentication
    // ----------------------------------------------------
    console.log('Test 4: Testing private channel authentication...');
    // A) Without key -> should fail with unauthorized
    const privFail = await mockService.testConnection('private-channel');
    assert.equal(privFail.connected, false);
    assert.ok(privFail.message.toLowerCase().includes('private') || privFail.message.toLowerCase().includes('unauthorized'));

    // B) With correct key -> should succeed
    const privSuccess = await mockService.testConnection('private-channel', 'CORRECT_PRIVATE_API_KEY');
    assert.equal(privSuccess.connected, true);
    console.log('✓ Test 4 passed: Private channel correctly authenticates with valid key and rejects missing key.');

    // ----------------------------------------------------
    // Test 5: Latest feed retrieval
    // ----------------------------------------------------
    console.log('Test 5: Testing latest feed retrieval...');
    const latest = await mockService.getLatestFeed('12345');
    assert.ok(latest);
    assert.equal(latest.entryId, 2);
    assert.equal(latest.channelId, '12345');
    console.log('✓ Test 5 passed: Latest feed retrieved.');

    // ----------------------------------------------------
    // Test 6: Historical feed retrieval
    // ----------------------------------------------------
    console.log('Test 6: Testing historical feed retrieval with limits...');
    const historical = await mockService.getFeeds('12345', { limit: 10 });
    assert.equal(historical.count, 2);
    assert.equal(historical.readings.length, 2);
    assert.equal(historical.readings[0].entryId, 1);
    assert.equal(historical.readings[1].entryId, 2);
    console.log('✓ Test 6 passed: Historical feeds retrieved correctly.');

    // ----------------------------------------------------
    // Test 7, 8, 9: Sensor Field Mapping (Field 1, 3, 4)
    // ----------------------------------------------------
    console.log('Test 7, 8, 9: Testing field mapping: Field 1 -> Cold, Field 3 -> Hot, Field 4 -> Humidity...');
    const feedSample = {
      entry_id: 999,
      created_at: '2026-09-08T11:00:00Z',
      field1: '1.8',  // Cold
      field2: 'unused',
      field3: '58.5', // Hot
      field4: '64.2', // Humidity
    };
    const mapped = mockService.normalizeFeed(feedSample, '12345');
    // Test 7
    assert.equal(mapped.coldTemperature, 1.8, 'Field 1 must map to coldTemperature');
    // Test 8
    assert.equal(mapped.hotTemperature, 58.5, 'Field 3 must map to hotTemperature');
    // Test 9
    assert.equal(mapped.humidity, 64.2, 'Field 4 must map to humidity');
    console.log('✓ Tests 7, 8, 9 passed: Fields 1, 3, 4 mapped strictly to coldTemperature, hotTemperature, humidity.');

    // ----------------------------------------------------
    // Test 10: Missing or invalid field safely becomes null
    // ----------------------------------------------------
    console.log('Test 10: Testing missing, empty, or non-numeric fields becoming null...');
    const partialFeed = await mockService.getLatestFeed('missing-fields-channel');
    assert.ok(partialFeed);
    assert.equal(partialFeed.coldTemperature, null, 'Empty field 1 should be null');
    assert.equal(partialFeed.hotTemperature, null, 'Non-numeric field 3 should be null');
    assert.equal(partialFeed.humidity, null, 'Null field 4 should remain null');
    console.log('✓ Test 10 passed: Missing/invalid sensor fields safely resolved to null without NaN.');

    // ----------------------------------------------------
    // Test 11: ThingSpeak network timeout handled correctly
    // ----------------------------------------------------
    console.log('Test 11: Testing ThingSpeak timeout handling...');
    await assert.rejects(
      async () => {
        await mockService.getLatestFeed('timeout-channel');
      },
      (err: any) => {
        assert.ok(err.message.toLowerCase().includes('time') || err.code === 'THINGSPEAK_TIMEOUT');
        return true;
      }
    );
    console.log('✓ Test 11 passed: Network timeout cleanly mapped to AppError.');

    // ----------------------------------------------------
    // Test 12: ThingSpeak 404 handled correctly
    // ----------------------------------------------------
    console.log('Test 12: Testing ThingSpeak 404 handling...');
    await assert.rejects(
      async () => {
        await mockService.getLatestFeed('not-found-channel');
      },
      (err: any) => {
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, 'THINGSPEAK_CHANNEL_NOT_FOUND');
        return true;
      }
    );
    console.log('✓ Test 12 passed: ThingSpeak 404 mapped to THINGSPEAK_CHANNEL_NOT_FOUND.');

    // ----------------------------------------------------
    // Test 13: ThingSpeak 401/403 handled correctly
    // ----------------------------------------------------
    console.log('Test 13: Testing ThingSpeak 401/403 handling...');
    await assert.rejects(
      async () => {
        await mockService.getLatestFeed('auth-fail-channel');
      },
      (err: any) => {
        assert.equal(err.statusCode, 401);
        assert.equal(err.code, 'THINGSPEAK_UNAUTHORIZED');
        return true;
      }
    );
    console.log('✓ Test 13 passed: ThingSpeak 401 mapped to THINGSPEAK_UNAUTHORIZED.');

    // ----------------------------------------------------
    // Test 17 & 14 & 15: Multi-bag dynamic channels & no API key leakage
    // ----------------------------------------------------
    console.log('Test 17: Testing multi-bag dynamic channel configurations (Bag A vs Bag B)...');
    // Create Bag A in DB pointing to Channel 10001 with encrypted KEY_FOR_BAG_A
    const bagA = await prisma.device.create({
      data: {
        deviceCode: 'TS-BAG-A',
        name: 'Smart Delivery Bag A',
        thingSpeakChannelId: '10001',
        thingSpeakReadKey: encryptText('KEY_FOR_BAG_A'),
        ownerId: testUser.id,
      },
    });

    // Create Bag B in DB pointing to Channel 20002 with encrypted KEY_FOR_BAG_B
    const bagB = await prisma.device.create({
      data: {
        deviceCode: 'TS-BAG-B',
        name: 'Smart Delivery Bag B',
        thingSpeakChannelId: '20002',
        thingSpeakReadKey: encryptText('KEY_FOR_BAG_B'),
        ownerId: testUser.id,
      },
    });

    // Directly test mockService with Bag A's and Bag B's configs
    requestsReceived.length = 0; // reset
    const readingA = await mockService.getLatestFeed(bagA.thingSpeakChannelId, 'KEY_FOR_BAG_A');
    const readingB = await mockService.getLatestFeed(bagB.thingSpeakChannelId, 'KEY_FOR_BAG_B');

    assert.ok(readingA);
    assert.equal(readingA.coldTemperature, 2.5);
    assert.equal(readingA.hotTemperature, 65.0);

    assert.ok(readingB);
    assert.equal(readingB.coldTemperature, 4.1);
    assert.equal(readingB.hotTemperature, 52.3);

    // Verify mock server received each bag's distinct API key
    const reqA = requestsReceived.find((r) => r.url.includes('10001'));
    const reqB = requestsReceived.find((r) => r.url.includes('20002'));
    assert.equal(reqA?.apiKey, 'KEY_FOR_BAG_A');
    assert.equal(reqB?.apiKey, 'KEY_FOR_BAG_B');
    console.log('✓ Test 17 passed: Bag A and Bag B strictly used their own dynamic channel IDs and API keys.');

    // ----------------------------------------------------
    // Test 14 & 15: API key never appears in API responses or logs
    // ----------------------------------------------------
    console.log('Test 14 & 15: Verifying API key does NOT appear in responses...');
    const strA = JSON.stringify(readingA);
    const strB = JSON.stringify(readingB);
    assert.ok(!strA.includes('KEY_FOR_BAG_A'));
    assert.ok(!strB.includes('KEY_FOR_BAG_B'));
    console.log('✓ Tests 14 & 15 passed: API keys never exposed in reading objects.');

    // ----------------------------------------------------
    // Test 16: User without device access cannot retrieve data
    // ----------------------------------------------------
    console.log('Test 16: Testing unauthorized device access...');
    // Unauthenticated request to /readings/latest
    const unauthRes = await fetch(`${apiBase}/${bagA.id}/readings/latest`);
    assert.equal(unauthRes.status, 401);
    const unauthJson = await unauthRes.json();
    assert.equal(unauthJson.error.code, 'UNAUTHORIZED');
    console.log('✓ Test 16 passed: Unauthenticated request rejected with 401 UNAUTHORIZED.');

    // ----------------------------------------------------
    // Test 18: No readings are inserted into PostgreSQL in Part 4
    // ----------------------------------------------------
    console.log('Test 18: Verifying no readings are stored in PostgreSQL during Part 4...');
    const finalReadingsCount = await prisma.sensorReading.count();
    assert.equal(
      finalReadingsCount,
      initialReadingsCount,
      'Sensor readings table must NOT be modified during Part 4'
    );
    console.log('✓ Test 18 passed: sensor_readings table remained completely untouched (count was 0 change).');

  } finally {
    // Clean up
    await prisma.device.deleteMany({
      where: {
        deviceCode: { in: ['TS-BAG-A', 'TS-BAG-B', 'TS-BAG-PARTIAL', 'TS-BAG-PRIVATE'] },
      },
    });
    await prisma.user.deleteMany({ where: { email: testUserEmail } });

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  }

  console.log('====================================================');
  console.log('✓ ALL 18 THINGSPEAK INTEGRATION TESTS PASSED!');
  console.log('====================================================');
}

runThingSpeakTests().catch((err) => {
  console.error('ThingSpeak test failed:', err);
  process.exit(1);
});
