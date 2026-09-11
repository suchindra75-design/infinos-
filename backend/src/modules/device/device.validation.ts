import { z } from 'zod';

export const createDeviceSchema = z.object({
  deviceCode: z
    .string()
    .trim()
    .min(2, 'Device code must be at least 2 characters')
    .max(50, 'Device code must not exceed 50 characters'),
  name: z
    .string()
    .trim()
    .min(2, 'Device name must be at least 2 characters')
    .max(100, 'Device name must not exceed 100 characters'),
  thingSpeakChannelId: z
    .string()
    .trim()
    .min(1, 'ThingSpeak Channel ID is required')
    .max(50, 'ThingSpeak Channel ID must not exceed 50 characters'),
  thingSpeakReadApiKey: z
    .string()
    .trim()
    .max(100, 'API key must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  fieldMappings: z.array(z.any()).optional(),
});

export const updateDeviceSchema = z.object({
  deviceCode: z
    .string()
    .trim()
    .min(2, 'Device code must be at least 2 characters')
    .max(50, 'Device code must not exceed 50 characters')
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, 'Device name must be at least 2 characters')
    .max(100, 'Device name must not exceed 100 characters')
    .optional(),
  thingSpeakChannelId: z
    .string()
    .trim()
    .min(1, 'ThingSpeak Channel ID cannot be empty')
    .max(50, 'ThingSpeak Channel ID must not exceed 50 characters')
    .optional(),
  thingSpeakReadApiKey: z
    .string()
    .trim()
    .max(100, 'API key must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  fieldMappings: z.array(z.any()).optional(),
  isArchived: z.boolean().optional(),
});

export const testConnectionSchema = z.object({
  thingSpeakChannelId: z
    .string()
    .trim()
    .min(1, 'ThingSpeak Channel ID is required')
    .max(50, 'ThingSpeak Channel ID must not exceed 50 characters'),
  thingSpeakReadApiKey: z
    .string()
    .trim()
    .max(100, 'API key must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
});

export const getReadingsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(Math.max(Number.parseInt(val, 10) || 50, 1), 8000) : undefined)),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type TestConnectionInput = z.infer<typeof testConnectionSchema>;
export interface GetReadingsQueryInput {
  limit?: number;
  from?: string;
  to?: string;
}


