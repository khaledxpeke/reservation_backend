import { z } from 'zod';

export const createPackSchema = z.object({
  name: z.string().min(2).max(50),
  maxResources: z.number().int().min(1),
  features: z.array(z.string()).default([]),
  priceMonthly: z.number().min(0),
});

export const updatePackSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  maxResources: z.number().int().min(1).optional(),
  features: z.array(z.string()).optional(),
  priceMonthly: z.number().min(0).optional(),
});

export const packIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreatePackInput = z.infer<typeof createPackSchema>;
export type UpdatePackInput = z.infer<typeof updatePackSchema>;

