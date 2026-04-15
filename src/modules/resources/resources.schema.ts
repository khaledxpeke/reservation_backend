import { z } from 'zod';

export const createResourceSchema = z.object({
  name: z.string().min(1).max(100),
  capacity: z.number().int().min(1).default(1),
  categoryType: z.enum(['SPACE', 'SERVICE', 'ITEM']).default('SPACE'),
  bookingUnit: z.enum(['MINUTES', 'HOURS', 'DAYS']).default('MINUTES'),
  minBookingDuration: z.number().int().min(1).optional(),
  maxBookingDuration: z.number().int().min(1).optional(),
  bufferTimeMin: z.number().int().min(0).default(0),
  price: z.number().min(0).optional(),
});

export const updateResourceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  capacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  categoryType: z.enum(['SPACE', 'SERVICE', 'ITEM']).optional(),
  bookingUnit: z.enum(['MINUTES', 'HOURS', 'DAYS']).optional(),
  minBookingDuration: z.number().int().min(1).optional(),
  maxBookingDuration: z.number().int().min(1).optional(),
  bufferTimeMin: z.number().int().min(0).optional(),
  price: z.number().min(0).optional(),
});

export const resourceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
