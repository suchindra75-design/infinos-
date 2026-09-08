import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodIssue } from 'zod';
import { AppError } from './error.middleware.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMessages = result.error.issues
        .map((issue: ZodIssue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; ');
      return next(new AppError(`Validation error: ${errorMessages}`, 400, 'VALIDATION_ERROR'));
    }
    req.body = result.data;
    next();
  };
}
