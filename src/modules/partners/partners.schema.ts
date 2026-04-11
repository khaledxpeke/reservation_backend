import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const listPartnersQuerySchema = paginationSchema.extend({
  city: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  isVerified: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const updatePartnerSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logo: z.string().url().optional().nullable(),
  city: z.string().min(2).max(100).optional(),
  phone: z.string().min(6).max(20).optional(),
  address: z.string().max(255).optional(),
  categoryId: z.string().uuid().optional(),
});

export const verifyPartnerSchema = z.object({
  isVerified: z.boolean(),
});

export const assignPackSchema = z.object({
  packId: z.string().uuid().nullable(),
});

export const partnerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ListPartnersQuery = z.infer<typeof listPartnersQuerySchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
