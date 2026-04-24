import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createReservationSchema = z.object({
  resourceId: z.string().uuid(),
  guestName: z.string().min(2).max(100),
  guestPhone: z.string().min(6).max(20),
  guestEmail: z.string().email().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format').optional(),
  startTime: z.string().regex(timeRegex, 'Must be HH:mm format'),
  endTime: z.string().regex(timeRegex, 'Must be HH:mm format'),
}).refine((data) => {
  if (data.endDate) {
    return data.date <= data.endDate;
  }
  return data.startTime < data.endTime;
}, {
  message: 'Invalid time or date range',
});

export const updateReservationStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'REJECTED', 'CANCELLED']),
});

export const reservationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listReservationsQuerySchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  resourceId: z.string().uuid().optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;

