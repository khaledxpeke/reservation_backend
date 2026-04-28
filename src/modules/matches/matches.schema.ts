import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const skillLevelSchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
export const genderPrefSchema = z.enum(['ANY', 'MALE', 'FEMALE']);
export const matchPostStatusSchema = z.enum(['OPEN', 'CLOSED', 'CANCELLED']);
export const matchRequestStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'DECLINED']);
export const sportTypeSchema = z.enum(['PADEL', 'TENNIS', 'FOOTBALL', 'BASKETBALL', 'VOLLEYBALL', 'OTHER']);

export const createMatchPostSchema = z
  .object({
    date: z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
    startTime: z.string().regex(timeRegex, 'Must be HH:mm'),
    endTime: z.string().regex(timeRegex, 'Must be HH:mm'),
    governorate: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    neededPlayers: z.coerce.number().int().min(1).max(20),
    sport: sportTypeSchema.default('PADEL'),
    genderPref: genderPrefSchema.default('ANY'),
    skillLevel: skillLevelSchema,
    description: z.string().max(500).optional(),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: 'startTime must be before endTime',
    path: ['endTime'],
  });

export const updateMatchPostSchema = z
  .object({
    date: z.string().regex(dateRegex).optional(),
    startTime: z.string().regex(timeRegex).optional(),
    endTime: z.string().regex(timeRegex).optional(),
    governorate: z.string().max(100).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    neededPlayers: z.coerce.number().int().min(1).max(20).optional(),
    sport: sportTypeSchema.optional(),
    genderPref: genderPrefSchema.optional(),
    skillLevel: skillLevelSchema.optional(),
    description: z.string().max(500).nullable().optional(),
    status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field is required',
  });

export const listMatchPostsQuerySchema = paginationSchema.extend({
  status: matchPostStatusSchema.optional(),
  governorate: z.string().max(100).optional(),
  skillLevel: skillLevelSchema.optional(),
  genderPref: genderPrefSchema.optional(),
  sport: sportTypeSchema.optional(),
  date: z.string().regex(dateRegex).optional(),
  /** earliest date (inclusive) */
  dateFrom: z.string().regex(dateRegex).optional(),
  /** latest date (inclusive) */
  dateTo: z.string().regex(dateRegex).optional(),
});

export const createJoinRequestSchema = z.object({
  message: z.string().max(300).optional(),
});

export const updateJoinRequestSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

export const matchIdParamSchema = z.object({ id: z.string().uuid() });
export const matchAndRequestIdParamSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
});

export type CreateMatchPostInput = z.infer<typeof createMatchPostSchema>;
export type UpdateMatchPostInput = z.infer<typeof updateMatchPostSchema>;
export type ListMatchPostsQuery = z.infer<typeof listMatchPostsQuerySchema>;
export type CreateJoinRequestInput = z.infer<typeof createJoinRequestSchema>;
export type UpdateJoinRequestInput = z.infer<typeof updateJoinRequestSchema>;
export type SportTypeInput = z.infer<typeof sportTypeSchema>;

