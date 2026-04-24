import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const updateCustomerProfileSchema = z
  .object({
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().min(1).max(80).optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    dob: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date')
      .optional(),
    phone: z.string().min(6).max(20).optional(),
    region: z.string().max(100).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const listMyReservationsQuerySchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED']).optional(),
  scope: z.enum(['upcoming', 'past', 'all']).default('all'),
});

export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;
export type ListMyReservationsQuery = z.infer<typeof listMyReservationsQuerySchema>;

