import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authController } from './auth.controller.js';
import { registerSchema, loginSchema } from './auth.validation.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimit.middleware.js';

export const authRouter = Router();

// Public auth routes
authRouter.post('/register', authRateLimiter, validateBody(registerSchema), (req, res, next) => {
  authController.register(req, res, next);
});

authRouter.post('/login', authRateLimiter, validateBody(loginSchema), (req, res, next) => {
  authController.login(req, res, next);
});

authRouter.post('/logout', (req, res, next) => {
  authController.logout(req, res, next);
});

// Authenticated current-user route
authRouter.get('/me', authenticate, (req, res, next) => {
  authController.getMe(req, res, next);
});

const adminRole = UserRole?.ADMIN || ('ADMIN' as const);

// Role-protected route example for administrative access validation
authRouter.get('/admin-only', authenticate, requireRole(adminRole), (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: 'Admin access granted',
      user: req.user,
    },
  });
});
