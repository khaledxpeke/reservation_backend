import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const listPartnersQuerySchema = paginationSchema.extend({
  city: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  isVerified: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

/** Super-admin: create linked User + Partner (same shape as public registration, plus admin options). */
export const createPartnerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  name: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  phone: z.string().min(6).max(20),
  address: z.string().max(255).optional(),
  categoryId: z.string().uuid(),
  logo: z.string().url().optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  packId: z.string().uuid().optional().nullable(),
  isVerified: z.boolean().optional(),
});

export const updatePartnerSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logo: z.string().url().optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
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
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
