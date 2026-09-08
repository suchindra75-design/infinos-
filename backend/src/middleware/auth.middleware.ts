import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyJwtToken } from '../utils/jwt.js';
import { prisma } from '../config/database.js';
import { AppError } from './error.middleware.js';
import '../types/auth.types.js';

/**
 * Authentication middleware:
 * Validates JWT Bearer token and verifies the user exists and is active in the database.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Authorization header missing', 401, 'UNAUTHORIZED');
    }

    const parts = authHeader.trim().split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      throw new AppError('Malformed authorization header format. Expected "Bearer <token>"', 401, 'INVALID_TOKEN');
    }

    const token = parts[1];
    if (!token) {
      throw new AppError('Authentication token not provided', 401, 'INVALID_TOKEN');
    }

    // Verify token cryptographic signature and expiration
    const payload = verifyJwtToken(token);

    if (!payload.userId) {
      throw new AppError('Invalid token payload', 401, 'INVALID_TOKEN');
    }

    // Database lookup: verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('Authenticated user account no longer exists', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('User account has been deactivated or disabled', 403, 'ACCOUNT_INACTIVE');
    }

    // Attach verified user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-based authorization middleware factory:
 * Ensures the authenticated user possesses one of the authorized roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden: Insufficient role permissions', 403, 'FORBIDDEN'));
    }

    next();
  };
}
