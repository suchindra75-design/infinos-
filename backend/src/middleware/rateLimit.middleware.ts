import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';
import { env } from '../config/env.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 10000 : 50, // Limit each IP to 50 requests per windowMs in dev/prod
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response, next: NextFunction) => {
    next(new AppError('Too many authentication attempts, please try again later', 429, 'TOO_MANY_REQUESTS'));
  },
  skip: () => env.NODE_ENV === 'test',
});
