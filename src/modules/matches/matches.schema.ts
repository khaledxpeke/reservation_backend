import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/** Accepte les heures type navigateur `9:30` ou `09:30`, normalise en `HH:mm`. */
function parseHHMM(raw: string): { ok: true; value: string } | { ok: false } {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { ok: false };
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || h < 0 || h > 23 || !Number.isInteger(min) || min < 0 || min > 59) {
    return { ok: false };
  }
  return {
    ok: true,
    value: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
  };
}

const hhmmSchema = z
  .string()
  .refine((s) => parseHHMM(s).ok, { message: 'Heure invalide (format HH:mm)' })
  .transform((s) => {
    const r = parseHHMM(s);
    return r.ok ? r.value : s;
  });

export const genderPrefSchema = z.enum(['ANY', 'MALE', 'FEMALE']);
export const matchPostStatusSchema = z.enum(['OPEN', 'CLOSED', 'CANCELLED']);
export const matchRequestStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'DECLINED']);

const scheduleSlotSchema = z
  .object({
    date: z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
    startTime: hhmmSchema,
    endTime: hhmmSchema,
  })
  .refine((s) => s.startTime < s.endTime, {
    message: 'startTime must be before endTime',
    path: ['endTime'],
  });

const metaSchema = z.record(z.string(), z.unknown()).optional();

export const createMatchPostSchema = z.object({
  /** Catégorie marketplace (ex. Sports & Terrains). */
  categoryId: z.string().uuid(),
  /** Sous-catégorie (ex. Padel) — doit appartenir à categoryId. */
  subCategoryId: z.string().uuid(),
  scheduleSlots: z
    .array(scheduleSlotSchema)
    .min(1, 'Au moins un créneau')
    .max(30, 'Maximum 30 créneaux'),
  governorate: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  neededPeople: z.coerce.number().int().min(1).max(50),
  genderPref: genderPrefSchema.default('ANY'),
  skillLevel: z.string().max(200).optional(),
  description: z.string().min(10, 'Description trop courte').max(4000),
  partnerId: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().uuid().optional(),
  ),
  meta: metaSchema,
});

export const updateMatchPostSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    subCategoryId: z.string().uuid().optional(),
    scheduleSlots: z.array(scheduleSlotSchema).min(1).max(30).optional(),
    governorate: z.string().max(100).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    neededPeople: z.coerce.number().int().min(1).max(50).optional(),
    genderPref: genderPrefSchema.optional(),
    skillLevel: z.string().max(200).nullable().optional(),
    description: z.string().min(10).max(4000).nullable().optional(),
    partnerId: z.string().uuid().nullable().optional(),
    meta: metaSchema,
    status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field is required',
  })
  .refine(
    (d) => {
      const c = d.categoryId !== undefined;
      const s = d.subCategoryId !== undefined;
      if (c !== s) return false;
      return true;
    },
    { message: 'Catégorie et sous-catégorie requises ensemble', path: ['subCategoryId'] },
  );

export const listMatchPostsQuerySchema = paginationSchema.extend({
  status: matchPostStatusSchema.optional(),
  governorate: z.string().max(100).optional(),
  /** Filtre : categories (texte) contient une entrée égale à cette valeur. */
  category: z.string().max(100).optional(),
  categoryId: z.string().uuid().optional(),
  subCategoryId: z.string().uuid().optional(),
  genderPref: genderPrefSchema.optional(),
  date: z.string().regex(dateRegex).optional(),
  dateFrom: z.string().regex(dateRegex).optional(),
  dateTo: z.string().regex(dateRegex).optional(),
});

export const createJoinRequestSchema = z.object({
  message: z.string().max(300).optional(),
});

export const updateJoinRequestSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

export const createLeaveRequestSchema = z.object({
  message: z.string().max(300).optional(),
});

export const respondLeaveRequestSchema = z.object({
  status: z.enum(['APPROVED', 'DECLINED']),
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
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type RespondLeaveRequestInput = z.infer<typeof respondLeaveRequestSchema>;
