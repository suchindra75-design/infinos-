import { z } from 'zod';
import { AlertSeverity, AlertType } from '@prisma/client';

export const listAlertsQuerySchema = z.object({
  deviceId: z.string().uuid().optional(),
  status: z.enum(['active', 'resolved', 'all']).optional().default('all'),
  isResolved: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  type: z.nativeEnum(AlertType).optional(),
  severity: z.nativeEnum(AlertSeverity).optional(),
  from: z
    .string()
    .datetime({ message: 'from must be a valid ISO-8601 date string' })
    .optional(),
  to: z
    .string()
    .datetime({ message: 'to must be a valid ISO-8601 date string' })
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type ListAlertsQueryInput = z.infer<typeof listAlertsQuerySchema>;
