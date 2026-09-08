import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
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

export const env: EnvConfig = {
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
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
