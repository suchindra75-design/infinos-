import { execSync } from 'child_process';
import fs from 'fs';
import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Development-only PostgreSQL bootstrapper.
 *
 * CRITICAL SAFETY:
 * - This function is strictly guarded to NEVER run in production.
 * - Does NOT wipe or reset existing databases.
 * - Uses existing Prisma migrations via `migrate deploy`.
 */
export async function ensureDevPostgres(): Promise<void> {
  // STRICT GUARD: NEVER run in production!
  if (env.NODE_ENV === 'production') {
    return;
  }

  // If a remote DATABASE_URL is explicitly set (e.g., Cloud SQL or remote host), skip local bootstrap
  const dbUrl = process.env.DATABASE_URL || env.DATABASE_URL;
  process.env.DATABASE_URL = dbUrl;

  if (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
    logger.info('External DATABASE_URL configured, skipping local PostgreSQL bootstrap');
    return;
  }

  // Check if PostgreSQL binaries exist on host
  if (!fs.existsSync('/usr/lib/postgresql/15/bin/initdb')) {
    logger.info('Local PostgreSQL binary not present in container; proceeding with configured DATABASE_URL');
    return;
  }

  try {
    // 1. Check if postgres is already running and responsive
    let isRunning = false;
    try {
      execSync('/usr/lib/postgresql/15/bin/pg_isready -h localhost -p 5432', { stdio: 'ignore' });
      isRunning = true;
      logger.info('PostgreSQL is already active on localhost:5432');
    } catch {
      isRunning = false;
    }

    if (!isRunning) {
      // 2. Ensure socket directory exists
      if (!fs.existsSync('/var/run/postgresql')) {
        try {
          execSync('mkdir -p /var/run/postgresql && chown -R node:node /var/run/postgresql || true', { stdio: 'ignore' });
        } catch {
          // ignore if permissions prevent
        }
      }

      // 3. Ensure cluster directory exists and is initialized
      if (!fs.existsSync('/tmp/pgdata/PG_VERSION')) {
        logger.info('Initializing development PostgreSQL cluster in /tmp/pgdata...');
        execSync('mkdir -p /tmp/pgdata && chown -R node:node /tmp/pgdata', { stdio: 'ignore' });
        execSync('su - node -c "/usr/lib/postgresql/15/bin/initdb -D /tmp/pgdata --auth-local=trust --auth-host=trust"', { stdio: 'ignore' });
      }

      // 4. Start postgres service as user node
      logger.info('Starting development PostgreSQL service...');
      execSync('su - node -c "/usr/lib/postgresql/15/bin/pg_ctl -D /tmp/pgdata -l /tmp/pgdata/logfile start"', { stdio: 'ignore' });

      // Wait for server readiness
      for (let i = 0; i < 20; i++) {
        try {
          execSync('/usr/lib/postgresql/15/bin/pg_isready -h localhost -p 5432', { stdio: 'ignore' });
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }

    // 5. Ensure postgres role and infinos database exist
    try {
      execSync('su - node -c "/usr/lib/postgresql/15/bin/psql -d postgres -c \\"CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD \'password\';\\""', { stdio: 'ignore' });
    } catch {
      // role may already exist
    }

    try {
      execSync('su - node -c "/usr/lib/postgresql/15/bin/psql -d postgres -c \\"CREATE DATABASE infinos OWNER postgres;\\""', { stdio: 'ignore' });
    } catch {
      // database may already exist
    }

    // 6. Ensure Prisma client is generated
    try {
      execSync('npx prisma generate --schema=backend/prisma/schema.prisma', { stdio: 'ignore' });
    } catch {
      // ignore
    }

    // 7. Ensure migrations are applied using existing migration history
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/infinos';
    try {
      execSync('npx prisma migrate deploy --schema=backend/prisma/schema.prisma', {
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        stdio: 'ignore',
      });
      logger.info('Prisma migrations applied to development database');
    } catch (migErr) {
      logger.warn('Prisma migrate deploy notice', { error: migErr });
    }

    // 8. Ensure development admin seed exists
    try {
      execSync('npx tsx backend/prisma/seed.ts', {
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        stdio: 'ignore',
      });
      logger.info('Development admin user seeded/verified');
    } catch {
      // ignore if already seeded
    }

    logger.info('Development PostgreSQL initialized successfully');
  } catch (error) {
    logger.warn('Notice during dev PostgreSQL bootstrap (proceeding with runtime)', { error });
  }
}
