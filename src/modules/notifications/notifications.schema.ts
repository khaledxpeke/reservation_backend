import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const listNotificationsQuerySchema = paginationSchema.extend({
  unreadOnly: z.coerce.boolean().optional(),
});

export const notificationIdParamSchema = z.object({ id: z.string().uuid() });

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

