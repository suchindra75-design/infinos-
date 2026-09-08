import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  from: z
    .string()
    .datetime({ message: 'from must be a valid ISO-8601 date string' })
    .optional(),
  to: z
    .string()
    .datetime({ message: 'to must be a valid ISO-8601 date string' })
    .optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
