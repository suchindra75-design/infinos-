import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { env } from './env.js';

let _prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!_prismaInstance) {
    _prismaInstance = new PrismaClient({
      log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return _prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

/**
 * Checks connectivity with PostgreSQL database.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    return false;
  }
}
