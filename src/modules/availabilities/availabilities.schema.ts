import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const dayOfWeekEnum = z.enum([
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
]);

const availabilityEntry = z.object({
  dayOfWeek: dayOfWeekEnum,
  startTime: z.string().regex(timeRegex, 'Must be HH:mm format'),
  endTime: z.string().regex(timeRegex, 'Must be HH:mm format'),
  slotIntervalMin: z.number().int().min(15).max(480).default(60),
}).refine((data) => data.startTime < data.endTime, {
  message: 'startTime must be before endTime',
});

export const setAvailabilitiesSchema = z.object({
  availabilities: z.array(availabilityEntry).min(1).max(7),
});

export const resourceIdParamSchema = z.object({
  resourceId: z.string().uuid(),
});

export type SetAvailabilitiesInput = z.infer<typeof setAvailabilitiesSchema>;

