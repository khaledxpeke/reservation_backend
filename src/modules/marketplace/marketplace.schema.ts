import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const marketplaceSearchSchema = paginationSchema.extend({
  categoryId: z.string().uuid().optional(),
  subCategoryId: z.string().uuid().optional(),
  /** Region / governorate (partial match) */
  governorate: z.string().optional(),
  city: z.string().optional(),
  search: z.string().optional(),
});

export const courtSlotsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  subCategoryId: z.string().uuid().optional(),
  governorate: z.string().optional(),
  city: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  durationMin: z.coerce.number().int().min(15).max(240).default(90),
  timeBand: z.enum(['morning', 'afternoon', 'evening', 'all']).default('all'),
});

export const partnerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type MarketplaceSearchQuery = z.infer<typeof marketplaceSearchSchema>;
export type CourtSlotsQuery = z.infer<typeof courtSlotsQuerySchema>;

