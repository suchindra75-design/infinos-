import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM

/**
 * Derives a 32-byte key from the configured ENCRYPTION_KEY using SHA-256
 */
function getDerivedKey(): Buffer {
  const secret = env.ENCRYPTION_KEY;
  if (!secret) {
    throw new AppError('Server encryption key is not configured', 500, 'CRYPTO_CONFIG_ERROR');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: <ivHex>:<tagHex>:<cipherHex>
 */
export function encryptText(plainText: string): string {
  if (!plainText) {
    throw new AppError('Cannot encrypt empty data', 400, 'INVALID_INPUT');
  }

  try {
    const key = getDerivedKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to encrypt sensitive data', 500, 'ENCRYPTION_FAILED');
  }
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Expects format: <ivHex>:<tagHex>:<cipherHex>
 */
export function decryptText(encryptedText: string): string {
  if (!encryptedText) {
    throw new AppError('Cannot decrypt empty data', 400, 'INVALID_INPUT');
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new AppError('Invalid encrypted payload format', 500, 'DECRYPTION_ERROR');
    }

    const [ivHex, tagHex, cipherHex] = parts;
    if (!ivHex || !tagHex || !cipherHex) {
      throw new AppError('Missing cryptographic components in ciphertext', 500, 'DECRYPTION_ERROR');
    }

    const key = getDerivedKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to decrypt data or authentication tag failed', 500, 'DECRYPTION_FAILED');
  }
}
