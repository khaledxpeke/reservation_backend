import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

const RECURRENCE = ['NONE', 'DAILY', 'WEEKDAY', 'WEEKEND', 'WEEKLY'] as const;
const DAY_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createOfferSchema = z
  .object({
    title: z.string().min(2).max(200),
    description: z.string().max(1000).optional(),
    discountPercent: z.number().min(0).max(100),

    // validFrom is always required; must not be in the past
    validFrom: z.coerce.date(),
    // validUntil is required for one-shot offers; optional for recurring
    validUntil: z.coerce.date().optional(),

    // Recurrence
    recurrence: z.enum(RECURRENCE).default('NONE'),
    recurrenceDays: z.array(z.enum(DAY_OF_WEEK)).default([]),
    timeStart: z.string().regex(TIME_RE, 'Format HH:mm requis').optional(),
    timeEnd: z.string().regex(TIME_RE, 'Format HH:mm requis').optional(),
  })
  .superRefine((data, ctx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (data.validFrom < today) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['validFrom'], message: 'La date de début ne peut pas être dans le passé' });
    }
    if (data.recurrence === 'NONE') {
      if (!data.validUntil) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['validUntil'], message: 'Requis pour une offre ponctuelle' });
      }
      if (data.validUntil && data.validUntil <= data.validFrom) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['validUntil'], message: 'La date de fin doit être après la date de début' });
      }
    }
    if (data.validUntil && data.validUntil <= data.validFrom) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['validUntil'], message: 'La date de fin doit être après la date de début' });
    }
    if (data.recurrence === 'WEEKLY' && data.recurrenceDays.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recurrenceDays'], message: 'Sélectionnez au moins un jour' });
    }
    if (data.timeStart && data.timeEnd && data.timeEnd <= data.timeStart) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['timeEnd'], message: 'L\'heure de fin doit être après l\'heure de début' });
    }
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

