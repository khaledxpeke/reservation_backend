import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../lib/errors';
import { paginate, paginatedResponse, PaginationInput } from '../../lib/pagination';
import {
  CreateJoinRequestInput,
  CreateMatchPostInput,
  ListMatchPostsQuery,
  UpdateJoinRequestInput,
  UpdateMatchPostInput,
} from './matches.schema';
import { createNotification } from '../notifications/notifications.service';
import { emitMatchEvent, emitMatchPostWatchers, io } from '../../lib/socket';

export type ScheduleSlot = { date: string; startTime: string; endTime: string };

const INTERNAL_USER_SELECT = {
  id: true,
  email: true,
  customerProfile: {
    select: {
      firstName: true,
      lastName: true,
      gender: true,
      region: true,
      phone: true,
    },
  },
} satisfies Prisma.UserSelect;

const INTERNAL_PARTNER_SELECT = {
  id: true,
  name: true,
  city: true,
} satisfies Prisma.PartnerSelect;

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.CategorySelect;

const SUBCATEGORY_SELECT = {
  id: true,
  name: true,
} satisfies Prisma.SubCategorySelect;

const INTERNAL_POST_INCLUDE = {
  creator: { select: INTERNAL_USER_SELECT },
  partner: { select: INTERNAL_PARTNER_SELECT },
  category: { select: CATEGORY_SELECT },
  subCategory: { select: SUBCATEGORY_SELECT },
  _count: { select: { requests: { where: { status: 'ACCEPTED' as const } } } },
} satisfies Prisma.MatchPostInclude;

const INTERNAL_DETAIL_INCLUDE = {
  creator: { select: INTERNAL_USER_SELECT },
  partner: { select: INTERNAL_PARTNER_SELECT },
  category: { select: CATEGORY_SELECT },
  subCategory: { select: SUBCATEGORY_SELECT },
  requests: {
    include: { user: { select: INTERNAL_USER_SELECT } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.MatchPostInclude;

type InternalUser = Prisma.UserGetPayload<{ select: typeof INTERNAL_USER_SELECT }>;
type InternalMatchPost = Prisma.MatchPostGetPayload<{ include: typeof INTERNAL_POST_INCLUDE }>;
type InternalMatchDetail = Prisma.MatchPostGetPayload<{
  include: typeof INTERNAL_DETAIL_INCLUDE;
}>;

export interface PublicCustomerProfile {
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  region: string | null;
  phone?: string;
}

export interface PublicUser {
  id: string;
  email?: string;
  customerProfile: PublicCustomerProfile | null;
}

export interface PublicPartnerBrief {
  id: string;
  name: string;
  city: string;
}

export interface PublicCategoryBrief {
  id: string;
  name: string;
  slug: string;
}

export interface PublicSubCategoryBrief {
  id: string;
  name: string;
}

/** Row returned to clients (listing + detail) */
export type PublicMatchPost = Omit<
  InternalMatchPost,
  'creator' | 'partner' | 'scheduleSlots' | 'meta' | 'category' | 'subCategory'
> & {
  creator: PublicUser;
  partner: PublicPartnerBrief | null;
  category: PublicCategoryBrief;
  subCategory: PublicSubCategoryBrief;
  scheduleSlots: ScheduleSlot[];
  meta: Record<string, unknown>;
};

export type PublicMatchDetail = Omit<
  InternalMatchDetail,
  'creator' | 'requests' | 'partner' | 'scheduleSlots' | 'meta' | 'category' | 'subCategory'
> & {
  creator: PublicUser;
  partner: PublicPartnerBrief | null;
  category: PublicCategoryBrief;
  subCategory: PublicSubCategoryBrief;
  scheduleSlots: ScheduleSlot[];
  meta: Record<string, unknown>;
  requests: Array<
    Omit<InternalMatchDetail['requests'][number], 'user'> & { user: PublicUser }
  >;
};

function scrubUser(user: InternalUser, options: { revealContact: boolean }): PublicUser {
  return {
    id: user.id,
    ...(options.revealContact ? { email: user.email } : {}),
    customerProfile: user.customerProfile
      ? {
          firstName: user.customerProfile.firstName,
          lastName: user.customerProfile.lastName,
          gender: user.customerProfile.gender,
          region: user.customerProfile.region,
          ...(options.revealContact ? { phone: user.customerProfile.phone } : {}),
        }
      : null,
  };
}

function parseYmdToUtcDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function deriveSchedule(slots: ScheduleSlot[]): {
  date: Date;
  startTime: string;
  endTime: string;
  lastSlotDate: Date;
  scheduleSlots: Prisma.InputJsonValue;
} {
  const sorted = [...slots].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  );
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  return {
    date: parseYmdToUtcDate(first.date),
    startTime: first.startTime,
    endTime: first.endTime,
    lastSlotDate: parseYmdToUtcDate(last.date),
    scheduleSlots: sorted as unknown as Prisma.InputJsonValue,
  };
}

export function normalizeScheduleSlots(post: {
  scheduleSlots: unknown;
  date: Date;
  startTime: string;
  endTime: string;
}): ScheduleSlot[] {
  const raw = post.scheduleSlots;
  if (Array.isArray(raw) && raw.length > 0) {
    const out: ScheduleSlot[] = [];
    for (const item of raw) {
      if (
        item &&
        typeof item === 'object' &&
        'date' in item &&
        'startTime' in item &&
        'endTime' in item
      ) {
        const s = item as Record<string, unknown>;
        if (
          typeof s.date === 'string' &&
          typeof s.startTime === 'string' &&
          typeof s.endTime === 'string'
        ) {
          out.push({ date: s.date, startTime: s.startTime, endTime: s.endTime });
        }
      }
    }
    if (out.length > 0) return out;
  }
  const ymd = post.date.toISOString().slice(0, 10);
  return [{ date: ymd, startTime: post.startTime, endTime: post.endTime }];
}

function asMetaRecord(meta: unknown): Record<string, unknown> {
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    return { ...(meta as Record<string, unknown>) };
  }
  return {};
}

function isSportsMarketplaceCategory(slug: string): boolean {
  return slug === 'sports';
}

function shapePublicPost(post: InternalMatchPost, viewerId?: string): PublicMatchPost {
  const { creator, partner, scheduleSlots: _s, meta: rawMeta, category, subCategory, ...rest } =
    post;
  return {
    ...rest,
    category,
    subCategory,
    scheduleSlots: normalizeScheduleSlots(post),
    meta: asMetaRecord(rawMeta),
    partner: partner ? { id: partner.id, name: partner.name, city: partner.city } : null,
    creator: scrubUser(creator, { revealContact: viewerId === post.creatorId }),
  };
}

function shapePublicDetail(post: InternalMatchDetail, viewerId?: string): PublicMatchDetail {
  const viewerIsCreator = viewerId === post.creatorId;
  const viewerInGroup =
    !!viewerId &&
    (viewerIsCreator ||
      post.requests.some((r) => r.userId === viewerId && r.status === 'ACCEPTED'));

  const {
    creator,
    partner,
    requests,
    scheduleSlots: _s,
    meta: rawMeta,
    category,
    subCategory,
    ...rest
  } = post;

  return {
    ...rest,
    category,
    subCategory,
    scheduleSlots: normalizeScheduleSlots(post),
    meta: asMetaRecord(rawMeta),
    partner: partner ? { id: partner.id, name: partner.name, city: partner.city } : null,
    creator: scrubUser(creator, { revealContact: viewerInGroup }),
    requests: requests.map((r) => {
      const isSelf = r.userId === viewerId;
      const revealAcceptedPeer = r.status === 'ACCEPTED' && viewerInGroup;
      return {
        ...r,
        user: scrubUser(r.user, { revealContact: isSelf || revealAcceptedPeer }),
      };
    }),
  };
}

function startOfUtcDay(value: string | Date): Date {
  const d = typeof value === 'string' ? new Date(value) : new Date(value);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatDateFR(date: Date | string): string {
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return String(date);
  }
}

function postScheduleSummary(post: {
  scheduleSlots: unknown;
  date: Date;
  startTime: string;
  endTime: string;
}): string {
  const slots = normalizeScheduleSlots(post);
  if (slots.length === 1) {
    return `${formatDateFR(slots[0]!.date)} ${slots[0]!.startTime}`;
  }
  return `${slots.length} jours · dès le ${formatDateFR(slots[0]!.date)}`;
}

async function assertPartnerExists(partnerId: string | null | undefined): Promise<void> {
  if (!partnerId) return;
  const p = await prisma.partner.findUnique({ where: { id: partnerId }, select: { id: true } });
  if (!p) throw new NotFoundError('Partner');
}

export async function listMatchPosts(query: ListMatchPostsQuery, viewerId?: string) {
  const where: Prisma.MatchPostWhereInput = {};

  where.status = query.status ?? 'OPEN';
  if (query.governorate) where.governorate = query.governorate;
  if (query.category) where.categories = { has: query.category };
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.subCategoryId) where.subCategoryId = query.subCategoryId;
  if (query.genderPref) where.genderPref = query.genderPref;

  const rangeAnd: Prisma.MatchPostWhereInput[] = [];

  if (query.date) {
    const day = startOfUtcDay(query.date);
    rangeAnd.push({ date: { lte: day } }, { lastSlotDate: { gte: day } });
  } else if (query.dateFrom || query.dateTo) {
    if (query.dateFrom) {
      rangeAnd.push({ lastSlotDate: { gte: startOfUtcDay(query.dateFrom) } });
    }
    if (query.dateTo) {
      rangeAnd.push({ date: { lte: startOfUtcDay(query.dateTo) } });
    }
  } else if (where.status === 'OPEN') {
    where.lastSlotDate = { gte: startOfUtcDay(new Date()) };
  }

  if (rangeAnd.length > 0) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), ...rangeAnd];
  }

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [items, total] = await Promise.all([
    prisma.matchPost.findMany({
      where,
      include: INTERNAL_POST_INCLUDE,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      skip,
      take,
    }),
    prisma.matchPost.count({ where }),
  ]);

  return paginatedResponse(
    items.map((p) => shapePublicPost(p, viewerId)),
    total,
    pagination,
  );
}

export async function getMatchPost(id: string, viewerId?: string): Promise<PublicMatchDetail> {
  const post = await prisma.matchPost.findUnique({
    where: { id },
    include: INTERNAL_DETAIL_INCLUDE,
  });
  if (!post) throw new NotFoundError('Match post');
  return shapePublicDetail(post, viewerId);
}

export async function createMatchPost(creatorId: string, input: CreateMatchPostInput) {
  await assertPartnerExists(input.partnerId ?? undefined);

  const sub = await prisma.subCategory.findUnique({
    where: { id: input.subCategoryId },
    include: { category: true },
  });
  if (!sub) {
    throw new BadRequestError('INVALID_SUBCATEGORY', 'Sous-catégorie introuvable.');
  }
  if (sub.categoryId !== input.categoryId) {
    throw new BadRequestError(
      'CATEGORY_MISMATCH',
      'La sous-catégorie ne correspond pas à la catégorie choisie.',
    );
  }

  const isSport = isSportsMarketplaceCategory(sub.category.slug);

  const metaObj = (input.meta ?? {}) as Record<string, unknown>;
  if (sub.category.slug === 'vehicules') {
    const from = metaObj.transportFrom;
    const to = metaObj.transportTo;
    if (typeof from !== 'string' || !from.trim()) {
      throw new BadRequestError(
        'TRANSPORT_META',
        'Indiquez le lieu ou la ville de départ.',
      );
    }
    if (typeof to !== 'string' || !to.trim()) {
      throw new BadRequestError('TRANSPORT_META', 'Indiquez la destination.');
    }
  }

  const derived = deriveSchedule(input.scheduleSlots as ScheduleSlot[]);
  const meta = metaObj as Prisma.InputJsonValue;

  const created = await prisma.matchPost.create({
    data: {
      creatorId,
      categoryId: input.categoryId,
      subCategoryId: input.subCategoryId,
      ...derived,
      governorate: input.governorate,
      city: input.city,
      neededPeople: input.neededPeople,
      categories: [sub.name],
      genderPref: isSport ? input.genderPref : 'ANY',
      skillLevel: isSport ? input.skillLevel?.trim() || null : null,
      description: input.description,
      partnerId: input.partnerId ?? null,
      meta,
    },
    include: INTERNAL_POST_INCLUDE,
  });
  return shapePublicPost(created, creatorId);
}

export async function updateMatchPost(userId: string, id: string, input: UpdateMatchPostInput) {
  const post = await prisma.matchPost.findUnique({
    where: { id },
    include: { category: { select: { slug: true } } },
  });
  if (!post) throw new NotFoundError('Match post');
  if (post.creatorId !== userId) {
    throw new ForbiddenError('Only the creator can edit this post');
  }

  const postMeta = asMetaRecord(post.meta);
  let resolvedCategorySlug = post.category.slug;

  if (input.partnerId !== undefined && input.partnerId !== null) {
    await assertPartnerExists(input.partnerId);
  }

  const data: Prisma.MatchPostUpdateInput = {};
  if (input.scheduleSlots !== undefined && input.scheduleSlots.length > 0) {
    const d = deriveSchedule(input.scheduleSlots as ScheduleSlot[]);
    data.date = d.date;
    data.startTime = d.startTime;
    data.endTime = d.endTime;
    data.lastSlotDate = d.lastSlotDate;
    data.scheduleSlots = d.scheduleSlots;
  }
  if (input.governorate !== undefined) data.governorate = input.governorate;
  if (input.city !== undefined) data.city = input.city;
  if (input.neededPeople !== undefined) data.neededPeople = input.neededPeople;
  if (input.genderPref !== undefined) data.genderPref = input.genderPref;
  if (input.skillLevel !== undefined) data.skillLevel = input.skillLevel;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;

  if (input.categoryId !== undefined && input.subCategoryId !== undefined) {
    const sub = await prisma.subCategory.findUnique({
      where: { id: input.subCategoryId },
      include: { category: true },
    });
    if (!sub) {
      throw new BadRequestError('INVALID_SUBCATEGORY', 'Sous-catégorie introuvable.');
    }
    if (sub.categoryId !== input.categoryId) {
      throw new BadRequestError(
        'CATEGORY_MISMATCH',
        'La sous-catégorie ne correspond pas à la catégorie choisie.',
      );
    }
    const isSport = isSportsMarketplaceCategory(sub.category.slug);
    resolvedCategorySlug = sub.category.slug;
    data.category = { connect: { id: input.categoryId } };
    data.subCategory = { connect: { id: input.subCategoryId } };
    data.categories = { set: [sub.name] };
    if (!isSport) {
      data.skillLevel = null;
      data.genderPref = 'ANY';
    }
  }

  const categoryTouched = input.categoryId !== undefined;
  const metaTouched = input.meta !== undefined;
  if (
    resolvedCategorySlug === 'vehicules' &&
    (metaTouched || categoryTouched)
  ) {
    const merged = {
      ...postMeta,
      ...(metaTouched ? (input.meta as Record<string, unknown>) : {}),
    };
    const from = merged.transportFrom;
    const to = merged.transportTo;
    if (typeof from !== 'string' || !from.trim()) {
      throw new BadRequestError(
        'TRANSPORT_META',
        'Indiquez le lieu ou la ville de départ.',
      );
    }
    if (typeof to !== 'string' || !to.trim()) {
      throw new BadRequestError('TRANSPORT_META', 'Indiquez la destination.');
    }
  }

  if (input.partnerId !== undefined) {
    if (input.partnerId === null) {
      data.partner = { disconnect: true };
    } else {
      data.partner = { connect: { id: input.partnerId } };
    }
  }
  if (input.meta !== undefined) {
    data.meta = { ...postMeta, ...input.meta } as Prisma.InputJsonValue;
  }

  const updated = await prisma.matchPost.update({
    where: { id },
    data,
    include: INTERNAL_DETAIL_INCLUDE,
  });
  emitMatchPostWatchers(id);
  return shapePublicDetail(updated, userId);
}

export async function cancelMatchPost(userId: string, id: string) {
  const post = await prisma.matchPost.findUnique({
    where: { id },
    include: {
      requests: {
        where: { status: 'ACCEPTED' },
        select: { userId: true },
      },
    },
  });
  if (!post) throw new NotFoundError('Match post');
  if (post.creatorId !== userId) {
    throw new ForbiddenError('Only the creator can cancel this post');
  }

  await prisma.matchPost.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  const label = postScheduleSummary(post);

  await Promise.all(
    post.requests.map((r) =>
      createNotification({
        userId: r.userId,
        type: 'MATCH_POST_CANCELLED',
        title: 'Annonce annulée',
        body: `L'organisateur a annulé l'annonce (${label}).`,
        url: `/annonces/${post.id}`,
        data: { matchPostId: post.id },
      }),
    ),
  );

  emitMatchPostWatchers(post.id);

  return post;
}

export async function listMyCreatedPosts(creatorId: string, query: ListMatchPostsQuery) {
  const where: Prisma.MatchPostWhereInput = { creatorId };
  if (query.status) where.status = query.status;

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [items, total] = await Promise.all([
    prisma.matchPost.findMany({
      where,
      include: INTERNAL_DETAIL_INCLUDE,
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      skip,
      take,
    }),
    prisma.matchPost.count({ where }),
  ]);

  return paginatedResponse(
    items.map((p) => shapePublicDetail(p, creatorId)),
    total,
    pagination,
  );
}

export async function listMyJoinRequests(userId: string, query: ListMatchPostsQuery) {
  const where: Prisma.MatchJoinRequestWhereInput = { userId };

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [items, total] = await Promise.all([
    prisma.matchJoinRequest.findMany({
      where,
      include: {
        matchPost: { include: INTERNAL_POST_INCLUDE },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.matchJoinRequest.count({ where }),
  ]);

  const cleaned = items.map((row) => {
    const shaped = shapePublicPost(row.matchPost, undefined);
    return {
      ...row,
      matchPost: {
        ...shaped,
        creator: scrubUser(row.matchPost.creator, {
          revealContact: row.status === 'ACCEPTED',
        }),
      },
    };
  });

  return paginatedResponse(cleaned, total, pagination);
}

export async function createJoinRequest(
  userId: string,
  matchPostId: string,
  input: CreateJoinRequestInput,
) {
  const post = await prisma.matchPost.findUnique({
    where: { id: matchPostId },
    include: { _count: { select: { requests: { where: { status: 'ACCEPTED' } } } } },
  });
  if (!post) throw new NotFoundError('Match post');
  if (post.status !== 'OPEN') {
    throw new BadRequestError('POST_CLOSED', 'This post is no longer open');
  }
  if (post.creatorId === userId) {
    throw new BadRequestError('OWN_POST', 'You cannot request to join your own post');
  }
  if (post._count.requests >= post.neededPeople) {
    throw new BadRequestError('FULL', 'This match is already full');
  }

  const existing = await prisma.matchJoinRequest.findUnique({
    where: { matchPostId_userId: { matchPostId, userId } },
  });
  if (existing) {
    throw new ConflictError('REQUEST_EXISTS', 'You already requested to join this match');
  }

  const created = await prisma.matchJoinRequest.create({
    data: { matchPostId, userId, message: input.message },
    include: { user: { include: { customerProfile: true } } },
  });

  const requesterName = created.user.customerProfile
    ? `${created.user.customerProfile.firstName} ${created.user.customerProfile.lastName}`
    : 'Un participant';

  const label = postScheduleSummary(post);

  await createNotification({
    userId: post.creatorId,
    type: 'MATCH_REQUEST_RECEIVED',
    title: 'Nouvelle demande',
    body: `${requesterName} souhaite rejoindre votre annonce (${label}).`,
    url: `/annonces/${post.id}`,
    data: { matchPostId: post.id, requestId: created.id },
  });

  emitMatchPostWatchers(post.id);

  return created;
}

export async function respondToJoinRequest(
  creatorId: string,
  matchPostId: string,
  requestId: string,
  input: UpdateJoinRequestInput,
) {
  const post = await prisma.matchPost.findUnique({
    where: { id: matchPostId },
    include: { _count: { select: { requests: { where: { status: 'ACCEPTED' } } } } },
  });
  if (!post) throw new NotFoundError('Match post');
  if (post.creatorId !== creatorId) {
    throw new ForbiddenError('Only the creator can respond to requests');
  }

  const request = await prisma.matchJoinRequest.findUnique({ where: { id: requestId } });
  if (!request || request.matchPostId !== matchPostId) {
    throw new NotFoundError('Join request');
  }
  if (request.status !== 'PENDING') {
    throw new BadRequestError('ALREADY_ANSWERED', 'This request has already been answered');
  }

  if (input.status === 'ACCEPTED' && post._count.requests >= post.neededPeople) {
    throw new BadRequestError('FULL', 'This match is already full');
  }

  const updated = await prisma.matchJoinRequest.update({
    where: { id: requestId },
    data: { status: input.status },
  });

  const label = postScheduleSummary(post);

  if (input.status === 'ACCEPTED') {
    await createNotification({
      userId: request.userId,
      type: 'MATCH_REQUEST_ACCEPTED',
      title: 'Demande acceptée',
      body: `Votre demande pour l'annonce du ${label} a été acceptée. Les coordonnées sont désormais visibles.`,
      url: `/annonces/${post.id}`,
      data: { matchPostId: post.id, requestId: updated.id },
    });

    emitMatchEvent(post.id, 'match:member_added', {
      matchPostId: post.id,
      userId: request.userId,
    });

    if (io) {
      io.to(`user:${request.userId}`).emit('chat:auto_join', { matchPostId: post.id });
    }

    if (post._count.requests + 1 >= post.neededPeople) {
      await prisma.matchPost.update({
        where: { id: matchPostId },
        data: { status: 'CLOSED' },
      });
      await createNotification({
        userId: creatorId,
        type: 'MATCH_POST_FULL',
        title: 'Votre annonce est complète',
        body: `L'annonce (${label}) a atteint le nombre de participants prévu.`,
        url: `/annonces/${post.id}`,
        data: { matchPostId: post.id },
      });
    }
  } else {
    await createNotification({
      userId: request.userId,
      type: 'MATCH_REQUEST_DECLINED',
      title: 'Demande refusée',
      body: `Votre demande pour l'annonce du ${label} a été refusée.`,
      url: `/annonces/${post.id}`,
      data: { matchPostId: post.id, requestId: updated.id },
    });
  }

  emitMatchPostWatchers(matchPostId);

  return updated;
}

export async function withdrawJoinRequest(userId: string, matchPostId: string) {
  const request = await prisma.matchJoinRequest.findUnique({
    where: { matchPostId_userId: { matchPostId, userId } },
  });
  if (!request) throw new NotFoundError('Join request');
  if (request.status === 'ACCEPTED') {
    throw new BadRequestError(
      'ALREADY_ACCEPTED',
      'Your request was already accepted; please contact the organizer',
    );
  }
  await prisma.matchJoinRequest.delete({ where: { id: request.id } });
  emitMatchPostWatchers(matchPostId);
}
