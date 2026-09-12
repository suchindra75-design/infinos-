/**
 * Production Database Safety Guard for Integration Tests
 * Ensures destructive integration tests cannot execute against a production database instance.
 */

export interface SafeDatabaseMetadata {
  host: string;
  dbName: string;
}

/**
 * Checks if a given database connection string points to a production database host.
 * Evaluates hostnames and connection string patterns for known cloud production environments.
 * Redacts credentials safely — never returns or prints passwords.
 */
export function isProductionDatabaseHost(urlStr: string | undefined): boolean {
  if (!urlStr || urlStr.trim() === '') {
    return false;
  }

  const lower = urlStr.toLowerCase();

  // Keyword/pattern checks on connection string
  if (
    lower.includes('render.com') ||
    lower.includes('dpg-') ||
    lower.includes('.ohio-postgres.') ||
    lower.includes('.postgres.render.') ||
    lower.includes('rds.amazonaws.com') ||
    lower.includes('cloudsql')
  ) {
    return true;
  }

  // URL parser for hostname validation
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (
      host.includes('render.com') ||
      host.includes('dpg-') ||
      host.includes('production') ||
      host.includes('prod-')
    ) {
      return true;
    }
  } catch {
    // If URL is unparseable, treat as unsafe for tests
    return true;
  }

  return false;
}

/**
 * Extracts safe hostname and database name metadata without leaking credentials.
 */
export function getSafeDatabaseMetadata(urlStr: string | undefined): SafeDatabaseMetadata {
  if (!urlStr || urlStr.trim() === '') {
    return { host: 'missing', dbName: 'missing' };
  }
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname || 'unknown-host';
    const dbName = parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'unknown-db';
    return { host, dbName };
  } catch {
    return { host: 'unparseable-url', dbName: 'unknown' };
  }
}

/**
 * Asserts that the current execution environment is safe for running database-backed integration tests.
 * MUST be called BEFORE any database connection or destructive operation (deleteMany, updateMany, etc.).
 *
 * Enforcement Rules:
 * 1. Blocks test execution if NODE_ENV is set to "production".
 * 2. Blocks test execution if TEST_DATABASE_URL is missing or empty (NEVER falls back silently to DATABASE_URL).
 * 3. Blocks test execution if TEST_DATABASE_URL points to a production database host.
 * 4. Overrides process.env.DATABASE_URL with process.env.TEST_DATABASE_URL so Prisma Client connects to the test database.
 */
export function assertSafeTestEnvironment(): SafeDatabaseMetadata {
  // Rule 1: Fail if NODE_ENV === 'production'
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SAFETY GUARD BLOCKED] Integration tests cannot be executed when NODE_ENV is set to "production".'
    );
  }

  // Rule 2: Require explicit TEST_DATABASE_URL (never fall back to DATABASE_URL)
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl || testDbUrl.trim() === '') {
    throw new Error(
      '[SAFETY GUARD BLOCKED] Integration tests require a dedicated TEST_DATABASE_URL environment variable.\n' +
      'Refusing to execute integration tests against default or missing DATABASE_URL.'
    );
  }

  // Rule 3: Fail if TEST_DATABASE_URL points to a production host
  if (isProductionDatabaseHost(testDbUrl)) {
    const meta = getSafeDatabaseMetadata(testDbUrl);
    throw new Error(
      `[SAFETY GUARD BLOCKED] TEST_DATABASE_URL points to a production database host (${meta.host}/${meta.dbName}).\n` +
      'Refusing to execute integration tests against a production database instance.'
    );
  }

  // Rule 4: Safely override process.env.DATABASE_URL for Prisma Client to point to TEST_DATABASE_URL
  process.env.DATABASE_URL = testDbUrl;

  return getSafeDatabaseMetadata(testDbUrl);
}
