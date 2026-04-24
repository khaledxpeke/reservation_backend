import { z } from 'zod';

export const availableSlotsQuerySchema = z.object({
  resourceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  durationMin: z.coerce.number().int().min(15).max(480),
});

export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>;

