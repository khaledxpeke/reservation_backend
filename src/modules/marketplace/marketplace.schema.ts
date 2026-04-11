import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const marketplaceSearchSchema = paginationSchema.extend({
  categoryId: z.string().uuid().optional(),
  subCategoryId: z.string().uuid().optional(),
  city: z.string().optional(),
  search: z.string().optional(),
});

export const partnerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type MarketplaceSearchQuery = z.infer<typeof marketplaceSearchSchema>;
