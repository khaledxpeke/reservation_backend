import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const listUsersQuerySchema = paginationSchema.extend({
  role: z.enum(['SUPER_ADMIN', 'PARTNER']).optional(),
  status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
  search: z.string().optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'BLOCKED']),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

