import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { signJwtToken } from '../../utils/jwt.js';
import { SafeUser } from '../../types/auth.types.js';
import { RegisterInput, LoginInput } from './auth.validation.js';

export class AuthService {
  /**
   * Registers a new user with secure password hashing.
   * Default role is VIEWER. Public registration cannot create ADMIN users.
   */
  async register(input: RegisterInput): Promise<SafeUser> {
    const email = input.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('Email address is already registered', 409, 'EMAIL_EXISTS');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        role: UserRole.VIEWER,
        isActive: true,
      },
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

    return newUser;
  }

  /**
   * Verifies user credentials and generates a JWT token.
   * Returns generic error on failure to protect against user enumeration.
   */
  async login(input: LoginInput): Promise<{ token: string; user: SafeUser }> {
    const email = input.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('User account has been deactivated or disabled', 403, 'ACCOUNT_INACTIVE');
    }

    const token = signJwtToken({
      userId: user.id,
      role: user.role,
    });

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { token, user: safeUser };
  }
}

export const authService = new AuthService();
