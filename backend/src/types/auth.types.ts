import { UserRole } from '@prisma/client';

export interface JwtUserPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}
