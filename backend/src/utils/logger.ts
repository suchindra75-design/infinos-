type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'password_hash',
  'jwtsecret',
  'jwt_secret',
  'secret',
  'apikey',
  'api_key',
  'encryptionkey',
  'encryption_key',
  'authorization',
  'token',
  'accesstoken',
  'refreshtoken',
  'thingspeakreadkey',
  'thingspeakwritekey',
];

function maskSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item));
  }

  if (typeof data === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive));

      if (isSensitive) {
        masked[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  return data;
}

function formatLog(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase().padEnd(5);
  let metaString = '';

  if (meta !== undefined) {
    try {
      const sanitized = maskSensitiveData(meta);
      if (sanitized instanceof Error) {
        metaString = ` ${sanitized.stack || sanitized.message}`;
      } else {
        metaString = ` ${JSON.stringify(sanitized)}`;
      }
    } catch {
      metaString = ' [Unserializable metadata]';
    }
  }

  return `[${timestamp}] [${levelUpper}] ${message}${metaString}`;
}

export const logger = {
  info(message: string, meta?: unknown): void {
    console.log(formatLog('info', message, meta));
  },
  warn(message: string, meta?: unknown): void {
    console.warn(formatLog('warn', message, meta));
  },
  error(message: string, meta?: unknown): void {
    console.error(formatLog('error', message, meta));
  },
  debug(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog('debug', message, meta));
    }
  },
};
