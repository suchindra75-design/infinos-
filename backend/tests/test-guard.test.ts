import assert from 'node:assert/strict';
import {
  isProductionDatabaseHost,
  getSafeDatabaseMetadata,
  assertSafeTestEnvironment,
} from '../src/utils/test-guard.js';

async function runTestGuardTests() {
  console.log('====================================================');
  console.log('--- Running Production Database Safety Guard Tests ---');
  console.log('====================================================');

  // Save original env values to restore after test suite completes
  const origNodeEnv = process.env.NODE_ENV;
  const origDbUrl = process.env.DATABASE_URL;
  const origTestDbUrl = process.env.TEST_DATABASE_URL;

  try {
    // ----------------------------------------------------
    // TEST 1: Production Host Pattern Detection
    // ----------------------------------------------------
    console.log('Test 1: Detecting production database host patterns...');

    const prodUrls = [
      'postgresql://infinos_1:secret@dpg-dah7jftbedkc739fpimg-a.ohio-postgres.render.com/infinos',
      'postgresql://user:pass@some-db.postgres.render.com/prod_db',
      'postgresql://user:pass@my-app-db.rds.amazonaws.com/production',
      'postgresql://user:pass@prod-db.example.com/mydb',
    ];

    for (const url of prodUrls) {
      assert.equal(
        isProductionDatabaseHost(url),
        true,
        `Host URL should be flagged as production: ${getSafeDatabaseMetadata(url).host}`
      );
    }

    const localUrls = [
      'postgresql://postgres:postgres@localhost:5432/infinos_test',
      'postgresql://postgres:postgres@127.0.0.1:5432/infinos_test',
      'postgresql://testuser:testpass@localhost:5433/testdb',
    ];

    for (const url of localUrls) {
      assert.equal(
        isProductionDatabaseHost(url),
        false,
        `Local URL should NOT be flagged as production: ${getSafeDatabaseMetadata(url).host}`
      );
    }
    console.log('✓ Test 1 passed: Host pattern detection working correctly.');

    // ----------------------------------------------------
    // TEST 2: Redaction & Safe Metadata Extraction
    // ----------------------------------------------------
    console.log('Test 2: Safe metadata extraction (no credential leakage)...');
    const sensitiveUrl = 'postgresql://admin_user:SuperSecretPassword123!@dpg-dah7jftbedkc739fpimg-a.ohio-postgres.render.com/infinos_prod';
    const meta = getSafeDatabaseMetadata(sensitiveUrl);

    assert.equal(meta.host, 'dpg-dah7jftbedkc739fpimg-a.ohio-postgres.render.com');
    assert.equal(meta.dbName, 'infinos_prod');

    const metaStr = JSON.stringify(meta);
    assert.equal(metaStr.includes('SuperSecretPassword123!'), false, 'Password MUST NOT be present in safe metadata');
    assert.equal(metaStr.includes('admin_user'), false, 'Username MUST NOT be present in safe metadata');
    console.log('✓ Test 2 passed: Safe metadata correctly redacts credentials.');

    // ----------------------------------------------------
    // TEST 3: Guard Blocks when NODE_ENV = "production"
    // ----------------------------------------------------
    console.log('Test 3: Safety Guard blocks execution when NODE_ENV="production"...');
    process.env.NODE_ENV = 'production';
    process.env.TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/infinos_test';

    assert.throws(
      () => assertSafeTestEnvironment(),
      (err: any) => err?.message?.includes('NODE_ENV is set to "production"'),
      'Guard MUST throw when NODE_ENV=production'
    );
    console.log('✓ Test 3 passed: NODE_ENV="production" is strictly blocked.');

    // ----------------------------------------------------
    // TEST 4: Guard Blocks when TEST_DATABASE_URL is Missing
    // ----------------------------------------------------
    console.log('Test 4: Safety Guard blocks execution when TEST_DATABASE_URL is missing...');
    process.env.NODE_ENV = 'test';
    delete process.env.TEST_DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://infinos_1:secret@dpg-dah7jftbedkc739fpimg-a.ohio-postgres.render.com/infinos';

    assert.throws(
      () => assertSafeTestEnvironment(),
      (err: any) => err?.message?.includes('TEST_DATABASE_URL environment variable'),
      'Guard MUST throw when TEST_DATABASE_URL is missing'
    );
    console.log('✓ Test 4 passed: Missing TEST_DATABASE_URL is strictly blocked.');

    // ----------------------------------------------------
    // TEST 5: Guard Blocks when TEST_DATABASE_URL Points to Production Host
    // ----------------------------------------------------
    console.log('Test 5: Safety Guard blocks execution when TEST_DATABASE_URL is a production host...');
    process.env.NODE_ENV = 'test';
    process.env.TEST_DATABASE_URL = 'postgresql://infinos_1:secret@dpg-dah7jftbedkc739fpimg-a.ohio-postgres.render.com/infinos';

    assert.throws(
      () => assertSafeTestEnvironment(),
      (err: any) => err?.message?.includes('points to a production database host'),
      'Guard MUST throw when TEST_DATABASE_URL points to a production host'
    );
    console.log('✓ Test 5 passed: Production TEST_DATABASE_URL is strictly blocked.');

    // ----------------------------------------------------
    // TEST 6: Guard Allows Execution when TEST_DATABASE_URL is Safe Local DB
    // ----------------------------------------------------
    console.log('Test 6: Safety Guard allows execution with a valid local TEST_DATABASE_URL...');
    process.env.NODE_ENV = 'test';
    process.env.TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/infinos_test';

    const result = assertSafeTestEnvironment();
    assert.equal(result.host, 'localhost');
    assert.equal(result.dbName, 'infinos_test');
    assert.equal(
      process.env.DATABASE_URL,
      'postgresql://postgres:postgres@localhost:5432/infinos_test',
      'DATABASE_URL MUST be safely overridden with TEST_DATABASE_URL'
    );
    console.log('✓ Test 6 passed: Valid TEST_DATABASE_URL allowed and overrides DATABASE_URL safely.');

    console.log('====================================================');
    console.log('✓ ALL PRODUCTION DATABASE SAFETY GUARD TESTS PASSED!');
    console.log('====================================================');
  } finally {
    // Restore original env vars
    if (origNodeEnv !== undefined) process.env.NODE_ENV = origNodeEnv;
    else delete process.env.NODE_ENV;

    if (origDbUrl !== undefined) process.env.DATABASE_URL = origDbUrl;
    else delete process.env.DATABASE_URL;

    if (origTestDbUrl !== undefined) process.env.TEST_DATABASE_URL = origTestDbUrl;
    else delete process.env.TEST_DATABASE_URL;
  }
}

runTestGuardTests().catch((err) => {
  console.error('Safety Guard unit test failed:', err);
  process.exit(1);
});
