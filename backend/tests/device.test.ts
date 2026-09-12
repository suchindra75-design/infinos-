import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { UserRole, DeviceStatus } from '@prisma/client';
import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { signJwtToken } from '../src/utils/jwt.js';
import { encryptText, decryptText } from '../src/utils/crypto.js';
import { assertSafeTestEnvironment } from '../src/utils/test-guard.js';

async function runDeviceTests() {
  assertSafeTestEnvironment();
  console.log('==============================================');
  console.log('--- Starting Device Management Test Suite ---');
  console.log('==============================================');

  const testPort = 5996;
  const server = app.listen(testPort, '127.0.0.1');
  const baseUrl = `http://127.0.0.1:${testPort}/api/v1/devices`;

  // Test identifiers
  const operatorEmail = 'operator.devicetest@infinos.local';
  const operator2Email = 'operator2.devicetest@infinos.local';
  const viewerEmail = 'viewer.devicetest@infinos.local';
  const testDeviceCode1 = 'TEST-BAG-001';
  const testDeviceCode2 = 'TEST-BAG-002';
  const testChannelId1 = '999901';
  const testChannelId2 = '999902';
  const rawApiKey = 'SECRET_THINGSPEAK_READ_KEY_XYZ_987';

  // Clean up any previous test artifacts
  await prisma.device.deleteMany({
    where: {
      deviceCode: { in: [testDeviceCode1, testDeviceCode2, 'TEST-BAG-UPDATED'] },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: { in: [operatorEmail, operator2Email, viewerEmail] },
    },
  });

  const hashedPw = await bcrypt.hash('TestPassword123!', 10);

  // Seed test users
  const operatorUser = await prisma.user.create({
    data: {
      name: 'Test Operator',
      email: operatorEmail,
      passwordHash: hashedPw,
      role: UserRole.OPERATOR,
      isActive: true,
    },
  });

  const operator2User = await prisma.user.create({
    data: {
      name: 'Test Operator 2',
      email: operator2Email,
      passwordHash: hashedPw,
      role: UserRole.OPERATOR,
      isActive: true,
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      name: 'Test Viewer',
      email: viewerEmail,
      passwordHash: hashedPw,
      role: UserRole.VIEWER,
      isActive: true,
    },
  });

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@infinos.local' },
  });
  assert.ok(adminUser, 'Admin user should exist from seed');

  // Issue test tokens
  const operatorToken = signJwtToken({ userId: operatorUser.id, role: operatorUser.role });
  const operator2Token = signJwtToken({ userId: operator2User.id, role: operator2User.role });
  const viewerToken = signJwtToken({ userId: viewerUser.id, role: viewerUser.role });
  const adminToken = signJwtToken({ userId: adminUser.id, role: adminUser.role });

  let createdDeviceId = '';

  try {
    // ----------------------------------------------------
    // Test 0: Crypto Unit Test for AES-256-GCM
    // ----------------------------------------------------
    console.log('Test 0: Testing AES-256-GCM encryption & decryption...');
    const cipher = encryptText(rawApiKey);
    assert.notEqual(cipher, rawApiKey, 'Ciphertext must differ from plaintext');
    assert.equal(cipher.split(':').length, 3, 'Ciphertext must have iv:tag:content format');
    const decrypted = decryptText(cipher);
    assert.equal(decrypted, rawApiKey, 'Decrypted text must match original');

    // Tampering test: modify cipher text should fail authentication
    assert.throws(() => {
      decryptText(cipher.slice(0, -4) + '0000');
    }, 'Tampered ciphertext must fail decryption');
    console.log('✓ Test 0 passed: AES-256-GCM encryption/decryption and integrity verified.');

    // ----------------------------------------------------
    // Test 1: Authenticated user can create a device
    // ----------------------------------------------------
    console.log('Test 1: Testing authenticated user creating a device...');
    const createRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        deviceCode: testDeviceCode1,
        name: 'Smart Delivery Cooler 1',
        thingSpeakChannelId: testChannelId1,
        thingSpeakReadApiKey: rawApiKey,
      }),
    });

    assert.equal(createRes.status, 201, 'Creation status should be 201 Created');
    const createJson = await createRes.json();
    assert.equal(createJson.success, true);
    assert.ok(createJson.data.device.id, 'Device ID should be returned');
    assert.equal(createJson.data.device.deviceCode, testDeviceCode1);
    assert.equal(createJson.data.device.name, 'Smart Delivery Cooler 1');
    assert.equal(createJson.data.device.thingSpeakChannelId, testChannelId1);
    assert.equal(createJson.data.device.status, DeviceStatus.OFFLINE);
    assert.equal(createJson.data.device.lastSeenAt, null);
    assert.equal(createJson.data.device.ownerId, operatorUser.id);
    assert.equal(createJson.data.device.hasApiKey, true);
    createdDeviceId = createJson.data.device.id;
    console.log('✓ Test 1 passed: Authenticated operator successfully created device.');

    // ----------------------------------------------------
    // Test 2: Unauthenticated user cannot create a device
    // ----------------------------------------------------
    console.log('Test 2: Testing unauthenticated device creation rejection...');
    const unauthCreateRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceCode: testDeviceCode2,
        name: 'Unauthorized Cooler',
        thingSpeakChannelId: testChannelId2,
      }),
    });
    assert.equal(unauthCreateRes.status, 401, 'Unauthenticated create should return 401');
    const unauthJson = await unauthCreateRes.json();
    assert.equal(unauthJson.error.code, 'UNAUTHORIZED');
    console.log('✓ Test 2 passed: Unauthenticated create rejected with UNAUTHORIZED.');

    // ----------------------------------------------------
    // Test 3: Invalid device data is rejected
    // ----------------------------------------------------
    console.log('Test 3: Testing invalid device data validation...');
    const invalidCreateRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        deviceCode: 'A', // too short (< 2)
        name: '', // empty name
        thingSpeakChannelId: '', // empty channel
      }),
    });
    assert.equal(invalidCreateRes.status, 400, 'Invalid data should return 400');
    const invalidJson = await invalidCreateRes.json();
    assert.equal(invalidJson.error.code, 'VALIDATION_ERROR');
    console.log('✓ Test 3 passed: Invalid device data rejected with VALIDATION_ERROR.');

    // ----------------------------------------------------
    // Test 4: Duplicate device code is rejected
    // ----------------------------------------------------
    console.log('Test 4: Testing duplicate device code rejection...');
    const duplicateCreateRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        deviceCode: testDeviceCode1, // Same device code
        name: 'Another Bag',
        thingSpeakChannelId: '999999',
      }),
    });
    assert.equal(duplicateCreateRes.status, 409, 'Duplicate device code should return 409 Conflict');
    const duplicateJson = await duplicateCreateRes.json();
    assert.equal(duplicateJson.error.code, 'DEVICE_CODE_EXISTS');
    console.log('✓ Test 4 passed: Duplicate device code rejected with DEVICE_CODE_EXISTS.');

    // ----------------------------------------------------
    // Test 5: Device list returns safe device objects
    // ----------------------------------------------------
    console.log('Test 5: Testing GET /api/v1/devices list...');
    const listRes = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.equal(listJson.success, true);
    assert.ok(Array.isArray(listJson.data.devices), 'Devices must be an array');
    const found = listJson.data.devices.find((d: any) => d.id === createdDeviceId);
    assert.ok(found, 'Created device must be present in device list');
    console.log('✓ Test 5 passed: Device list returned safe devices.');

    // ----------------------------------------------------
    // Test 6: API key is NEVER returned in API responses
    // ----------------------------------------------------
    console.log('Test 6: Verifying API key is never returned in API responses...');
    assert.equal(createJson.data.device.thingSpeakReadKey, undefined);
    assert.equal(createJson.data.device.thingSpeakReadApiKey, undefined);
    assert.equal(createJson.data.device.rawApiKey, undefined);
    assert.equal(found.thingSpeakReadKey, undefined);
    assert.equal(found.thingSpeakReadApiKey, undefined);
    console.log('✓ Test 6 passed: API key is completely absent from responses.');

    // ----------------------------------------------------
    // Test 7: API key is encrypted in the database
    // ----------------------------------------------------
    console.log('Test 7: Verifying API key is securely encrypted in PostgreSQL...');
    const dbDevice = await prisma.device.findUnique({
      where: { id: createdDeviceId },
    });
    assert.ok(dbDevice, 'Device must exist in DB');
    assert.ok(dbDevice.thingSpeakReadKey, 'Stored key must exist');
    assert.notEqual(
      dbDevice.thingSpeakReadKey,
      rawApiKey,
      'Stored key must NOT be stored as plaintext'
    );
    assert.ok(
      dbDevice.thingSpeakReadKey.includes(':'),
      'Stored key must be encrypted with IV and Auth Tag'
    );
    const decryptedDbKey = decryptText(dbDevice.thingSpeakReadKey);
    assert.equal(
      decryptedDbKey,
      rawApiKey,
      'Stored encrypted key must decrypt to original key using AES-256-GCM'
    );
    console.log('✓ Test 7 passed: API key is AES-256-GCM encrypted in PostgreSQL.');

    // ----------------------------------------------------
    // Test 8: Device can be retrieved by ID
    // ----------------------------------------------------
    console.log('Test 8: Testing GET /api/v1/devices/:id...');
    const getByIdRes = await fetch(`${baseUrl}/${createdDeviceId}`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    assert.equal(getByIdRes.status, 200);
    const getByIdJson = await getByIdRes.json();
    assert.equal(getByIdJson.data.device.id, createdDeviceId);
    assert.equal(getByIdJson.data.device.thingSpeakReadKey, undefined);
    console.log('✓ Test 8 passed: Device retrieved by ID safely.');

    // ----------------------------------------------------
    // Test 9: Authorized user can update a device
    // ----------------------------------------------------
    console.log('Test 9: Testing device update by authorized owner...');
    const updateRes = await fetch(`${baseUrl}/${createdDeviceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        name: 'Updated Cooler Name',
        thingSpeakReadApiKey: 'UPDATED_NEW_SECRET_KEY_999',
      }),
    });
    assert.equal(updateRes.status, 200);
    const updateJson = await updateRes.json();
    assert.equal(updateJson.data.device.name, 'Updated Cooler Name');
    assert.equal(updateJson.data.device.thingSpeakReadKey, undefined);

    // Verify DB updated with new encrypted key
    const updatedDb = await prisma.device.findUnique({ where: { id: createdDeviceId } });
    assert.ok(updatedDb?.thingSpeakReadKey);
    assert.equal(decryptText(updatedDb.thingSpeakReadKey), 'UPDATED_NEW_SECRET_KEY_999');
    console.log('✓ Test 9 passed: Authorized owner updated device and re-encrypted key.');

    // ----------------------------------------------------
    // Test 10: VIEWER cannot update a device, non-owner operator blocked
    // ----------------------------------------------------
    console.log('Test 10: Testing update rejection for VIEWER and non-owner OPERATOR...');
    // A) VIEWER update attempt
    const viewerUpdateRes = await fetch(`${baseUrl}/${createdDeviceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${viewerToken}`,
      },
      body: JSON.stringify({ name: 'Viewer Hacked Name' }),
    });
    assert.equal(viewerUpdateRes.status, 403, 'VIEWER should be forbidden from updating device');
    const viewerUpdateJson = await viewerUpdateRes.json();
    assert.equal(viewerUpdateJson.error.code, 'FORBIDDEN');

    // B) Operator 2 attempting to update Operator 1's device
    const op2UpdateRes = await fetch(`${baseUrl}/${createdDeviceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operator2Token}`,
      },
      body: JSON.stringify({ name: 'Cross Operator Hack' }),
    });
    assert.equal(op2UpdateRes.status, 403, 'Non-owner operator should be forbidden');
    console.log('✓ Test 10 passed: VIEWER and non-owner OPERATOR correctly rejected from updating.');

    // ----------------------------------------------------
    // Test 11: Authorized user can delete a device
    // ----------------------------------------------------
    console.log('Test 11: Testing device deletion by ADMIN and owner...');
    // Create a temporary device to delete
    const tempDev = await prisma.device.create({
      data: {
        deviceCode: testDeviceCode2,
        name: 'Device To Delete',
        thingSpeakChannelId: testChannelId2,
        ownerId: operatorUser.id,
      },
    });

    const deleteRes = await fetch(`${baseUrl}/${tempDev.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    assert.equal(deleteRes.status, 200);
    const deleteJson = await deleteRes.json();
    assert.equal(deleteJson.success, true);

    // Verify device is deleted from database
    const checkDeleted = await prisma.device.findUnique({ where: { id: tempDev.id } });
    assert.equal(checkDeleted, null, 'Device should no longer exist in DB');
    console.log('✓ Test 11 passed: Device successfully deleted.');

    // ----------------------------------------------------
    // Test 12: VIEWER cannot delete a device
    // ----------------------------------------------------
    console.log('Test 12: Testing VIEWER deletion rejection...');
    const viewerDeleteRes = await fetch(`${baseUrl}/${createdDeviceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    assert.equal(viewerDeleteRes.status, 403, 'VIEWER should be forbidden from deleting device');
    const viewerDeleteJson = await viewerDeleteRes.json();
    assert.equal(viewerDeleteJson.error.code, 'FORBIDDEN');
    console.log('✓ Test 12 passed: VIEWER cannot delete a device.');

    // ----------------------------------------------------
    // Test 13: Device status endpoint works
    // ----------------------------------------------------
    console.log('Test 13: Testing GET /api/v1/devices/:id/status...');
    const statusRes = await fetch(`${baseUrl}/${createdDeviceId}/status`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    assert.equal(statusRes.status, 200);
    const statusJson = await statusRes.json();
    assert.equal(statusJson.success, true);
    assert.equal(statusJson.data.id, createdDeviceId);
    assert.equal(statusJson.data.status, DeviceStatus.OFFLINE);
    assert.equal(statusJson.data.lastSeenAt, null);
    assert.equal(statusJson.data.hasSyncReadings, false);
    assert.ok(statusJson.data.message.includes('No synchronized reading available yet'));
    console.log('✓ Test 13 passed: Device status endpoint correctly indicates unsynchronized state.');

    // ----------------------------------------------------
    // Test 14: Missing device returns 404
    // ----------------------------------------------------
    console.log('Test 14: Testing 404 for nonexistent device...');
    const missingRes = await fetch(`${baseUrl}/a0000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    assert.equal(missingRes.status, 404, 'Missing device should return 404');
    const missingJson = await missingRes.json();
    assert.equal(missingJson.error.code, 'DEVICE_NOT_FOUND');
    console.log('✓ Test 14 passed: Non-existent device returns 404 DEVICE_NOT_FOUND.');

    // ----------------------------------------------------
    // Test 15: Connection-test endpoint does not leak credentials
    // ----------------------------------------------------
    console.log('Test 15: Testing POST /api/v1/devices/test-connection without credential leakage...');
    const connTestRes = await fetch(`${baseUrl}/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        thingSpeakChannelId: '2768541',
        thingSpeakReadApiKey: 'SENSITIVE_KEY_SHOULD_NEVER_LEAK_IN_RESPONSE',
      }),
    });
    assert.equal(connTestRes.status, 200);
    const connTestJson = await connTestRes.json();
    assert.equal(connTestJson.success, true);
    assert.ok(connTestJson.data.connectionStatus);
    // Strict leak check
    const responseString = JSON.stringify(connTestJson);
    assert.ok(
      !responseString.includes('SENSITIVE_KEY_SHOULD_NEVER_LEAK_IN_RESPONSE'),
      'Credentials must NEVER appear in test-connection response payload'
    );
    console.log('✓ Test 15 passed: Connection test executed and credentials remained completely hidden.');

  } finally {
    // Clean up test data
    await prisma.device.deleteMany({
      where: {
        deviceCode: { in: [testDeviceCode1, testDeviceCode2, 'TEST-BAG-UPDATED'] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [operatorEmail, operator2Email, viewerEmail] },
      },
    });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('==============================================');
  console.log('✓ ALL 16 DEVICE & CRYPTO TESTS PASSED SUCCESSFULLY!');
  console.log('==============================================');
}

runDeviceTests().catch((err) => {
  console.error('Device test failed:', err);
  process.exit(1);
});
