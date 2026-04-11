import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
});

export const createSubCategorySchema = z.object({
  name: z.string().min(2).max(100),
  defaultDurationMin: z.number().int().min(15).max(480),
});

export const updateSubCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  defaultDurationMin: z.number().int().min(15).max(480).optional(),
});

export const categoryIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateSubCategoryInput = z.infer<typeof createSubCategorySchema>;
