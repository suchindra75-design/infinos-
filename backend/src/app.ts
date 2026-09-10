import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './config/database.js';
import { errorHandler, notFoundHandler, AppError } from './middleware/error.middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { deviceRouter } from './modules/device/device.routes.js';
import { alertRouter } from './modules/alert/alert.routes.js';

export interface CreateAppOptions {
  skipCatchAll?: boolean;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  // Configure Express trust proxy so proxy-supplied client IP headers (X-Forwarded-For)
  // are handled safely for both AI Studio development and Render production environments.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }));
  app.use(express.json());

  // Health endpoints
  const healthHandler = async (_req: Request, res: Response) => {
    const isConnected = await checkDatabaseConnection();
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        database: isConnected ? 'connected' : 'disconnected',
      },
    });
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // Authentication API v1 routes
  app.use('/api/v1/auth', authRouter);

  // Device Management API v1 routes
  app.use('/api/v1/devices', deviceRouter);

  // Alerts Management API v1 routes
  app.use('/api/v1/alerts', alertRouter);

  // Only attach fallback handlers if not serving as part of unified server
  if (!options.skipCatchAll) {
    // 404 handler
    app.use(notFoundHandler);

    // Centralized error handler
    app.use(errorHandler);
  }

  return app;
}

export const app = createApp();
export { express };
