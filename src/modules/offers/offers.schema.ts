import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const createOfferSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  discountPercent: z.number().min(0).max(100),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
}).refine((data) => data.validUntil > data.validFrom, {
  message: 'validUntil must be after validFrom',
});

export const updateOfferApprovalSchema = z.object({
  approvalStatus: z.enum(['APPROVED', 'REJECTED']),
});

export const offerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listOffersQuerySchema = paginationSchema.extend({
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type ListOffersQuery = z.infer<typeof listOffersQuerySchema>;
