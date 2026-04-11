import { z } from 'zod';

export const createResourceSchema = z.object({
  name: z.string().min(1).max(100),
  capacity: z.number().int().min(1).default(1),
});

export const updateResourceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  capacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const resourceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
