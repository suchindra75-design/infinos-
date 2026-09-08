import { app } from './app.js';
import { env } from './config/env.js';
import { prisma, checkDatabaseConnection } from './config/database.js';
import { logger } from './utils/logger.js';
import { deviceSyncWorker } from './workers/device-sync.worker.js';

async function bootstrap() {
  try {
    logger.info('Initializing INFINOS Backend service...', {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
    });

    // Check database connection at startup
    const isDbConnected = await checkDatabaseConnection();
    if (isDbConnected) {
      logger.info('Database connection established successfully');
    } else {
      logger.error('Database connection failed on startup');
    }

    // Start background telemetry synchronization worker
    if (env.ENABLE_SYNC_WORKER) {
      deviceSyncWorker.start();
    } else {
      logger.info('DeviceSyncWorker disabled via configuration');
    }

    const server = app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`INFINOS Backend server running on port ${env.PORT}`, {
        port: env.PORT,
        healthEndpoint: `http://localhost:${env.PORT}/health`,
      });
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, initiating graceful shutdown...`);
      // Stop background worker first so no in-flight DB queries occur after disconnect
      await deviceSyncWorker.stop();
      server.close(async () => {
        logger.info('HTTP server closed');
        await prisma.$disconnect();
        logger.info('Prisma client disconnected');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error('Fatal error during server startup', { error });
    process.exit(1);
  }
}

bootstrap();
