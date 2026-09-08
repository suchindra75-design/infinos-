import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JwtUserPayload } from '../types/auth.types.js';
import { AppError } from '../middleware/error.middleware.js';

export function signJwtToken(payload: Omit<JwtUserPayload, 'iat' | 'exp'>, expiresIn?: string): string {
  try {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: (expiresIn || env.JWT_EXPIRES_IN) as jwt.SignOptions['expiresIn'],
    });
  } catch (error) {
    throw new AppError('Failed to sign authentication token', 500, 'TOKEN_SIGN_ERROR');
  }
}

export function verifyJwtToken(token: string): JwtUserPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtUserPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid authentication token', 401, 'INVALID_TOKEN');
    }
    throw new AppError('Failed to authenticate token', 401, 'UNAUTHORIZED');
  }
}
