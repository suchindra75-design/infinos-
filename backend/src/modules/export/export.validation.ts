import { z } from 'zod';

/**
 * Validation schema for CSV/PDF sensor data export queries.
 */
export const exportQuerySchema = z
  .object({
    from: z
      .string()
      .datetime({ message: "Invalid ISO 8601 format for 'from' parameter" })
      .optional(),
    to: z
      .string()
      .datetime({ message: "Invalid ISO 8601 format for 'to' parameter" })
      .optional(),
    limit: z.coerce
      .number()
      .int({ message: "'limit' must be an integer" })
      .positive({ message: "'limit' must be positive" })
      .max(10000, { message: "'limit' cannot exceed 10000 records" })
      .optional()
      .default(1000),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    {
      message: "'from' timestamp must be earlier than or equal to 'to' timestamp",
      path: ['from'],
    }
  );

export type ExportQueryInput = z.infer<typeof exportQuerySchema>;
