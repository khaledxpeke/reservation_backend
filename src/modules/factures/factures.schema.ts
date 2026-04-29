import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const listFacturesQuerySchema = paginationSchema.extend({
  partnerId: z.string().uuid().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM format').optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format').optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format').optional(),
  clientName: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['UNPAID', 'PARTIAL', 'PAID']).optional(),
});

export const factureIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const updateFacturePaymentSchema = z.object({
  amountPaid: z.number().min(0),
});

export type ListFacturesQuery = z.infer<typeof listFacturesQuerySchema>;
