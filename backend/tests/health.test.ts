import assert from 'node:assert/strict';
import { checkDatabaseConnection } from '../src/config/database.js';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { assertSafeTestEnvironment } from '../src/utils/test-guard.js';

async function runTests() {
  assertSafeTestEnvironment();
  console.log('--- Running Health & Database Integration Tests ---');

  // Test 1: Verify database connection
  console.log('Test 1: Testing PostgreSQL connection...');
  const isConnected = await checkDatabaseConnection();
  assert.equal(isConnected, true, 'Database should be reachable and connected');
  console.log('✓ Test 1 passed: Database is connected.');

  // Test 2: Start temporary listener and verify /health response
  console.log('Test 2: Testing GET /health endpoint...');
  const testPort = 5999;
  const server = app.listen(testPort, '127.0.0.1');

  try {
    const response = await fetch(`http://127.0.0.1:${testPort}/health`);
    assert.equal(response.status, 200, 'Health endpoint status code should be 200');

    const json = await response.json();
    assert.deepEqual(json, {
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
      },
    }, 'Health endpoint response body must match specification');
    console.log('✓ Test 2 passed: GET /health returned expected payload.');

    // Test 3: Verify 404 handler
    console.log('Test 3: Testing 404 route handling...');
    const notFoundRes = await fetch(`http://127.0.0.1:${testPort}/non-existent-route`);
    assert.equal(notFoundRes.status, 404);
    const notFoundJson = await notFoundRes.json();
    assert.equal(notFoundJson.success, false);
    assert.equal(notFoundJson.error.code, 'NOT_FOUND');
    console.log('✓ Test 3 passed: 404 error handler returned structured error.');

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('--- All tests completed successfully! ---');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
