import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import bcrypt from 'bcryptjs';

async function runAuthTests() {
  console.log('==============================================');
  console.log('--- Starting Authentication Test Suite ---');
  console.log('==============================================');

  const testPort = 5998;
  const server = app.listen(testPort, '127.0.0.1');
  const baseUrl = `http://127.0.0.1:${testPort}/api/v1/auth`;

  // Clean up any test users from previous runs
  const testUserEmail = 'authtest.courier@infinos.local';
  const inactiveUserEmail = 'inactive.courier@infinos.local';
  await prisma.user.deleteMany({
    where: {
      email: { in: [testUserEmail, inactiveUserEmail] },
    },
  });

  try {
    // ----------------------------------------------------
    // Test 1: Successful registration
    // ----------------------------------------------------
    console.log('Test 1: Testing successful registration...');
    const registerRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Courier Agent One',
        email: testUserEmail,
        password: 'SecurePassword123!',
      }),
    });

    assert.equal(registerRes.status, 201, 'Registration status should be 201 Created');
    const registerJson = await registerRes.json();
    assert.equal(registerJson.success, true);
    assert.ok(registerJson.data.user.id, 'User ID should be returned');
    assert.equal(registerJson.data.user.email, testUserEmail);
    assert.equal(registerJson.data.user.name, 'Courier Agent One');
    assert.equal(registerJson.data.user.role, UserRole.VIEWER, 'Default role should be VIEWER');
    assert.equal(registerJson.data.user.isActive, true);
    assert.equal(registerJson.data.user.passwordHash, undefined, 'passwordHash must NEVER be returned');
    console.log('✓ Test 1 passed: User registered successfully with non-admin VIEWER role.');

    // ----------------------------------------------------
    // Test 2: Duplicate email registration rejection
    // ----------------------------------------------------
    console.log('Test 2: Testing duplicate email registration rejection...');
    const duplicateRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another Name',
        email: testUserEmail, // same email
        password: 'AnotherPassword999!',
      }),
    });

    assert.equal(duplicateRes.status, 409, 'Duplicate registration should return 409 Conflict');
    const duplicateJson = await duplicateRes.json();
    assert.equal(duplicateJson.success, false);
    assert.equal(duplicateJson.error.code, 'EMAIL_EXISTS');
    console.log('✓ Test 2 passed: Duplicate email registration rejected with EMAIL_EXISTS.');

    // ----------------------------------------------------
    // Test 3: Invalid registration data
    // ----------------------------------------------------
    console.log('Test 3: Testing invalid registration validation...');
    const invalidRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A', // too short (< 2)
        email: 'invalid-email-format',
        password: 'short', // too short (< 8)
      }),
    });

    assert.equal(invalidRes.status, 400, 'Invalid registration should return 400 Bad Request');
    const invalidJson = await invalidRes.json();
    assert.equal(invalidJson.success, false);
    assert.equal(invalidJson.error.code, 'VALIDATION_ERROR');
    assert.ok(invalidJson.error.message.includes('Validation error'));
    console.log('✓ Test 3 passed: Invalid registration data rejected with VALIDATION_ERROR.');

    // ----------------------------------------------------
    // Test 4: Successful login
    // ----------------------------------------------------
    console.log('Test 4: Testing successful user login...');
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        password: 'SecurePassword123!',
      }),
    });

    assert.equal(loginRes.status, 200, 'Login status should be 200 OK');
    const loginJson = await loginRes.json();
    assert.equal(loginJson.success, true);
    assert.ok(typeof loginJson.data.token === 'string', 'JWT token should be returned');
    assert.equal(loginJson.data.user.email, testUserEmail);
    assert.equal(loginJson.data.user.passwordHash, undefined, 'passwordHash must NEVER be returned');
    const validUserToken = loginJson.data.token;
    console.log('✓ Test 4 passed: User logged in successfully and received JWT.');

    // ----------------------------------------------------
    // Test 5: Incorrect password
    // ----------------------------------------------------
    console.log('Test 5: Testing login with incorrect password...');
    const badPasswordRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        password: 'WrongPassword!',
      }),
    });

    assert.equal(badPasswordRes.status, 401, 'Wrong password should return 401');
    const badPasswordJson = await badPasswordRes.json();
    assert.equal(badPasswordJson.success, false);
    assert.equal(badPasswordJson.error.code, 'INVALID_CREDENTIALS');
    console.log('✓ Test 5 passed: Incorrect password rejected with uniform INVALID_CREDENTIALS.');

    // ----------------------------------------------------
    // Test 6: Unknown user
    // ----------------------------------------------------
    console.log('Test 6: Testing login with unknown user email...');
    const unknownUserRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent.user@infinos.local',
        password: 'SomePassword123!',
      }),
    });

    assert.equal(unknownUserRes.status, 401, 'Unknown user should return 401');
    const unknownUserJson = await unknownUserRes.json();
    assert.equal(unknownUserJson.success, false);
    assert.equal(unknownUserJson.error.code, 'INVALID_CREDENTIALS');
    assert.equal(unknownUserJson.error.message, 'Invalid email or password');
    console.log('✓ Test 6 passed: Unknown user returns uniform error to prevent enumeration.');

    // ----------------------------------------------------
    // Test 7: Missing Authorization header
    // ----------------------------------------------------
    console.log('Test 7: Testing protected endpoint without Authorization header...');
    const missingAuthRes = await fetch(`${baseUrl}/me`);
    assert.equal(missingAuthRes.status, 401, 'Missing token should return 401');
    const missingAuthJson = await missingAuthRes.json();
    assert.equal(missingAuthJson.success, false);
    assert.equal(missingAuthJson.error.code, 'UNAUTHORIZED');
    console.log('✓ Test 7 passed: Request without Authorization header rejected with UNAUTHORIZED.');

    // ----------------------------------------------------
    // Test 8: Invalid JWT
    // ----------------------------------------------------
    console.log('Test 8: Testing protected endpoint with invalid JWT...');
    const invalidJwtRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: 'Bearer this.is.notavalidtoken' },
    });
    assert.equal(invalidJwtRes.status, 401, 'Invalid token should return 401');
    const invalidJwtJson = await invalidJwtRes.json();
    assert.equal(invalidJwtJson.success, false);
    assert.equal(invalidJwtJson.error.code, 'INVALID_TOKEN');
    console.log('✓ Test 8 passed: Tampered/invalid JWT rejected with INVALID_TOKEN.');

    // ----------------------------------------------------
    // Test 9: Expired JWT
    // ----------------------------------------------------
    console.log('Test 9: Testing protected endpoint with expired JWT...');
    const expiredToken = jwt.sign(
      { userId: loginJson.data.user.id, role: UserRole.VIEWER },
      env.JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const expiredJwtRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.equal(expiredJwtRes.status, 401, 'Expired token should return 401');
    const expiredJwtJson = await expiredJwtRes.json();
    assert.equal(expiredJwtJson.success, false);
    assert.equal(expiredJwtJson.error.code, 'TOKEN_EXPIRED');
    console.log('✓ Test 9 passed: Expired token rejected with TOKEN_EXPIRED.');

    // ----------------------------------------------------
    // Test 10: Successful /auth/me
    // ----------------------------------------------------
    console.log('Test 10: Testing successful GET /api/v1/auth/me...');
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${validUserToken}` },
    });
    assert.equal(meRes.status, 200, '/auth/me should return 200');
    const meJson = await meRes.json();
    assert.equal(meJson.success, true);
    assert.equal(meJson.data.user.email, testUserEmail);
    assert.equal(meJson.data.user.name, 'Courier Agent One');
    assert.equal(meJson.data.user.role, UserRole.VIEWER);
    assert.equal(meJson.data.user.isActive, true);
    assert.equal(meJson.data.user.passwordHash, undefined, 'passwordHash must NEVER be returned');
    console.log('✓ Test 10 passed: /auth/me returned verified active user details.');

    // ----------------------------------------------------
    // Test 11: Inactive user rejection
    // ----------------------------------------------------
    console.log('Test 11: Testing inactive user rejection...');
    const dummyPasswordHash = await bcrypt.hash('InactivePass123!', 10);
    const inactiveUser = await prisma.user.create({
      data: {
        name: 'Disabled Courier',
        email: inactiveUserEmail,
        passwordHash: dummyPasswordHash,
        role: UserRole.VIEWER,
        isActive: false, // Inactive user
      },
    });

    // Attempt login as inactive user
    const inactiveLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inactiveUserEmail,
        password: 'InactivePass123!',
      }),
    });
    assert.equal(inactiveLoginRes.status, 403, 'Inactive login should return 403');
    const inactiveLoginJson = await inactiveLoginRes.json();
    assert.equal(inactiveLoginJson.error.code, 'ACCOUNT_INACTIVE');

    // Attempt to access /auth/me with token for inactive user
    const inactiveUserToken = jwt.sign(
      { userId: inactiveUser.id, role: UserRole.VIEWER },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const inactiveMeRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${inactiveUserToken}` },
    });
    assert.equal(inactiveMeRes.status, 403, 'Inactive user accessing /auth/me should return 403');
    const inactiveMeJson = await inactiveMeRes.json();
    assert.equal(inactiveMeJson.error.code, 'ACCOUNT_INACTIVE');
    console.log('✓ Test 11 passed: Inactive user correctly blocked from login and API access.');

    // ----------------------------------------------------
    // Test 12: Role authorization
    // ----------------------------------------------------
    console.log('Test 12: Testing role-based authorization...');
    // A) Viewer accessing admin-only endpoint -> 403 Forbidden
    const viewerAdminRes = await fetch(`${baseUrl}/admin-only`, {
      headers: { Authorization: `Bearer ${validUserToken}` },
    });
    assert.equal(viewerAdminRes.status, 403, 'VIEWER accessing admin route should return 403');
    const viewerAdminJson = await viewerAdminRes.json();
    assert.equal(viewerAdminJson.error.code, 'FORBIDDEN');

    // B) Admin accessing admin-only endpoint -> 200 OK
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@infinos.local' },
    });
    assert.ok(adminUser, 'Admin user should exist from seed');
    const adminToken = jwt.sign(
      { userId: adminUser.id, role: adminUser.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const adminRes = await fetch(`${baseUrl}/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminRes.status, 200, 'ADMIN accessing admin route should return 200');
    const adminJson = await adminRes.json();
    assert.equal(adminJson.success, true);
    assert.equal(adminJson.data.message, 'Admin access granted');
    console.log('✓ Test 12 passed: Role authorization correctly enforces permissions.');

    // ----------------------------------------------------
    // Additional Test: Logout endpoint
    // ----------------------------------------------------
    console.log('Additional Test: Testing POST /api/v1/auth/logout...');
    const logoutRes = await fetch(`${baseUrl}/logout`, { method: 'POST' });
    assert.equal(logoutRes.status, 200);
    const logoutJson = await logoutRes.json();
    assert.equal(logoutJson.success, true);
    console.log('✓ Logout test passed: Logout endpoint acknowledged client token clearing.');

  } finally {
    // Clean up test records
    await prisma.user.deleteMany({
      where: {
        email: { in: [testUserEmail, inactiveUserEmail] },
      },
    });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('==============================================');
  console.log('✓ ALL 12 AUTHENTICATION TESTS PASSED SUCCESSFULLY!');
  console.log('==============================================');
}

runAuthTests().catch((err) => {
  console.error('Auth test failed:', err);
  process.exit(1);
});
