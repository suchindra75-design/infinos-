import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  TRUST_PROXY: string | number | boolean;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ENCRYPTION_KEY: string;
  THINGSPEAK_BASE_URL: string;
  SYNC_INTERVAL_MS: number;
  DEVICE_ONLINE_THRESHOLD_SECONDS: number;
  DEVICE_STALE_THRESHOLD_SECONDS: number;
  INITIAL_BACKFILL_LIMIT: number;
  INCREMENTAL_SYNC_LIMIT: number;
  ENABLE_SYNC_WORKER: boolean;
  CORS_ORIGIN: string;
}

/**
 * Parse TRUST_PROXY configuration safely:
 * - Defaults to 1 (trust 1 proxy hop: AI Studio reverse proxy & Render reverse proxy)
 * - Avoids blindly defaulting to boolean `true` which triggers ERR_ERL_PERMISSIVE_TRUST_PROXY
 *   and allows trivial IP spoofing
 * - Supports explicit custom numbers (e.g. '2'), IPs, subnets ('loopback, linklocal'), or booleans
 */
function parseTrustProxy(val?: string): string | number | boolean {
  if (val === undefined || val === '') {
    return 1;
  }
  if (val === 'false') return false;
  if (val === 'true') return true;
  const parsedNum = parseInt(val, 10);
  if (!isNaN(parsedNum) && parsedNum.toString() === val.trim()) {
    return parsedNum;
  }
  return val;
}

export const env: EnvConfig = {
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/infinos',
  JWT_SECRET: process.env.JWT_SECRET || 'development_jwt_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'development_encryption_key',
  THINGSPEAK_BASE_URL: process.env.THINGSPEAK_BASE_URL || 'https://api.thingspeak.com',
  SYNC_INTERVAL_MS: parseInt(process.env.SYNC_INTERVAL_MS || '15000', 10),
  DEVICE_ONLINE_THRESHOLD_SECONDS: parseInt(process.env.DEVICE_ONLINE_THRESHOLD_SECONDS || '60', 10),
  DEVICE_STALE_THRESHOLD_SECONDS: parseInt(process.env.DEVICE_STALE_THRESHOLD_SECONDS || '180', 10),
  INITIAL_BACKFILL_LIMIT: parseInt(process.env.INITIAL_BACKFILL_LIMIT || '20', 10),
  INCREMENTAL_SYNC_LIMIT: parseInt(process.env.INCREMENTAL_SYNC_LIMIT || '10', 10),
  ENABLE_SYNC_WORKER: process.env.ENABLE_SYNC_WORKER !== 'false',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

// Guarantee DATABASE_URL is set in process.env for Prisma
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = env.DATABASE_URL;
}

