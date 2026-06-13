import { z } from 'zod';

/** Durée max demandée pour les créneaux (minutes). Aligner le front (blocage partenaire, etc.). */
export const SLOTS_DURATION_MAX_MINUTES = 480;

export const availableSlotsQuerySchema = z.object({
  resourceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  durationMin: z.coerce
    .number()
    .int()
    .min(15)
    .max(SLOTS_DURATION_MAX_MINUTES),
});

export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>;

