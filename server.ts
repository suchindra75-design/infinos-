import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApp, express } from './backend/src/app.js';
import { env } from './backend/src/config/env.js';
import { prisma, checkDatabaseConnection } from './backend/src/config/database.js';
import { logger } from './backend/src/utils/logger.js';
import { deviceSyncWorker } from './backend/src/workers/device-sync.worker.js';
import { ensureDevPostgres } from './backend/src/utils/dev-db-bootstrap.js';
import { errorHandler } from './backend/src/middleware/error.middleware.js';

async function startUnifiedServer() {
  try {
    // 1. Development-only database bootstrap if needed
    if (env.NODE_ENV !== 'production') {
      await ensureDevPostgres();
    }

    logger.info('Initializing INFINOS Unified Server...', {
      nodeEnv: env.NODE_ENV,
      port: 3000,
    });

    // 2. Verify database connection
    const isDbConnected = await checkDatabaseConnection();
    if (isDbConnected) {
      logger.info('PostgreSQL connection verified successfully');
    } else {
      logger.warn('Database connection check failed on startup; will retry during requests');
    }

    // 3. Start background telemetry synchronization worker (15s interval, per-device isolation)
    if (env.ENABLE_SYNC_WORKER) {
      deviceSyncWorker.start();
    } else {
      logger.info('DeviceSyncWorker disabled via configuration');
    }

    // 4. Create Express app with skipCatchAll=true so frontend routes pass through
    const app = createApp({ skipCatchAll: true });
    const PORT = env.PORT;

    // 5. Mount Vite middleware in development or static dist in production
    if (env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    // 6. Centralized error handling
    app.use(errorHandler);

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`INFINOS Unified Server running on http://0.0.0.0:${PORT}`, {
        port: PORT,
        health: `http://localhost:${PORT}/health`,
        api: `http://localhost:${PORT}/api/v1`,
      });
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, initiating graceful shutdown...`);
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
    logger.error('Fatal error during unified server startup', { error });
    process.exit(1);
  }
}

startUnifiedServer();
