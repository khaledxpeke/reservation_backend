import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  imageUrl: z.string().url().optional().nullable(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  imageUrl: z.string().url().optional().nullable(),
});

export const createSubCategorySchema = z.object({
  name: z.string().min(2).max(100),
  defaultDurationMin: z.number().int().min(15).max(480),
  imageUrl: z.string().url().optional().nullable(),
});

export const updateSubCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  defaultDurationMin: z.number().int().min(15).max(480).optional(),
  imageUrl: z.string().url().optional().nullable(),
});

export const categoryIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateSubCategoryInput = z.infer<typeof createSubCategorySchema>;
export type UpdateSubCategoryInput = z.infer<typeof updateSubCategorySchema>;
