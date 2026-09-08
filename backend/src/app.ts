import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './config/database.js';
import { errorHandler, notFoundHandler, AppError } from './middleware/error.middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { deviceRouter } from './modules/device/device.routes.js';
import { alertRouter } from './modules/alert/alert.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }));
  app.use(express.json());

  // Health endpoint
  app.get('/health', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isConnected = await checkDatabaseConnection();

      if (!isConnected) {
        throw new AppError('Database is not connected', 503, 'DATABASE_UNAVAILABLE');
      }

      res.status(200).json({
        success: true,
        data: {
          status: 'ok',
          database: 'connected',
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // Authentication API v1 routes
  app.use('/api/v1/auth', authRouter);

  // Device Management API v1 routes
  app.use('/api/v1/devices', deviceRouter);

  // Alerts Management API v1 routes
  app.use('/api/v1/alerts', alertRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Centralized error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
