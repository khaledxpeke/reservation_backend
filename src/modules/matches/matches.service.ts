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

/**
 * Internal user select — includes phone/email. These fields must never be
 * returned to unrelated viewers; use `scrubCreator` / `scrubRequester` before
 * sending the payload out of the service layer.
 */
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

const INTERNAL_POST_INCLUDE = {
  creator: { select: INTERNAL_USER_SELECT },
  _count: { select: { requests: { where: { status: 'ACCEPTED' } } } },
} satisfies Prisma.MatchPostInclude;

const INTERNAL_DETAIL_INCLUDE = {
  creator: { select: INTERNAL_USER_SELECT },
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

export interface PublicMatchPost
  extends Omit<InternalMatchPost, 'creator'> {
  creator: PublicUser;
}

export interface PublicMatchDetail
  extends Omit<InternalMatchDetail, 'creator' | 'requests'> {
  creator: PublicUser;
  requests: Array<
    Omit<InternalMatchDetail['requests'][number], 'user'> & { user: PublicUser }
  >;
}

function scrubUser(
  user: InternalUser,
  options: { revealContact: boolean },
): PublicUser {
  return {
    id: user.id,
    ...(options.revealContact ? { email: user.email } : {}),
    customerProfile: user.customerProfile
      ? {
          firstName: user.customerProfile.firstName,
          lastName: user.customerProfile.lastName,
          gender: user.customerProfile.gender,
          region: user.customerProfile.region,
          ...(options.revealContact
            ? { phone: user.customerProfile.phone }
            : {}),
        }
      : null,
  };
}

/**
 * Scrub a post for a listing. Creator contact stays hidden — listings should
 * never leak contact details.
 */
function toPublicPost(post: InternalMatchPost, viewerId?: string): PublicMatchPost {
  const isSelf = viewerId === post.creatorId;
  return {
    ...post,
    creator: scrubUser(post.creator, { revealContact: isSelf }),
  };
}

/**
 * Scrub a detailed post. Contact info is revealed:
 *  - Organiser + everyone with an ACCEPTED request form a group: they all see
 *    each other's phone/email (organiser + accepted players).
 *  - Each user always sees their own contact on their request row.
 *  - Pending / declined rows: contact stays hidden except for the requester themself.
 */
function toPublicDetail(post: InternalMatchDetail, viewerId?: string): PublicMatchDetail {
  const viewerIsCreator = viewerId === post.creatorId;
  const viewerInGroup =
    !!viewerId &&
    (viewerIsCreator ||
      post.requests.some((r) => r.userId === viewerId && r.status === 'ACCEPTED'));

  return {
    ...post,
    creator: scrubUser(post.creator, { revealContact: viewerInGroup }),
    requests: post.requests.map((r) => {
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

export async function listMatchPosts(query: ListMatchPostsQuery, viewerId?: string) {
  const where: Prisma.MatchPostWhereInput = {};

  where.status = query.status ?? 'OPEN';
  if (query.governorate) where.governorate = query.governorate;
  if (query.skillLevel) where.skillLevel = query.skillLevel;
  if (query.genderPref) where.genderPref = query.genderPref;
  if (query.sport) where.sport = query.sport;

  if (query.date) {
    where.date = startOfUtcDay(query.date);
  } else if (query.dateFrom || query.dateTo) {
    where.date = {};
    if (query.dateFrom) (where.date as Prisma.DateTimeFilter).gte = startOfUtcDay(query.dateFrom);
    if (query.dateTo) (where.date as Prisma.DateTimeFilter).lte = startOfUtcDay(query.dateTo);
  } else if (where.status === 'OPEN') {
    where.date = { gte: startOfUtcDay(new Date()) };
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
    items.map((p) => toPublicPost(p, viewerId)),
    total,
    pagination,
  );
}

export async function getMatchPost(
  id: string,
  viewerId?: string,
): Promise<PublicMatchDetail> {
  const post = await prisma.matchPost.findUnique({
    where: { id },
    include: INTERNAL_DETAIL_INCLUDE,
  });
  if (!post) throw new NotFoundError('Match post');
  return toPublicDetail(post, viewerId);
}

export async function createMatchPost(creatorId: string, input: CreateMatchPostInput) {
  const created = await prisma.matchPost.create({
    data: {
      creatorId,
      date: new Date(input.date),
      startTime: input.startTime,
      endTime: input.endTime,
      governorate: input.governorate,
      city: input.city,
      neededPlayers: input.neededPlayers,
      sport: input.sport,
      genderPref: input.genderPref,
      skillLevel: input.skillLevel,
      description: input.description,
    },
    include: INTERNAL_POST_INCLUDE,
  });
  return toPublicPost(created, creatorId);
}

export async function updateMatchPost(
  userId: string,
  id: string,
  input: UpdateMatchPostInput,
) {
  const post = await prisma.matchPost.findUnique({ where: { id } });
  if (!post) throw new NotFoundError('Match post');
  if (post.creatorId !== userId) {
    throw new ForbiddenError('Only the creator can edit this post');
  }

  if (input.startTime && input.endTime && input.startTime >= input.endTime) {
    throw new BadRequestError('INVALID_RANGE', 'startTime must be before endTime');
  }

  const data: Prisma.MatchPostUpdateInput = {};
  if (input.date !== undefined) data.date = new Date(input.date);
  if (input.startTime !== undefined) data.startTime = input.startTime;
  if (input.endTime !== undefined) data.endTime = input.endTime;
  if (input.governorate !== undefined) data.governorate = input.governorate;
  if (input.city !== undefined) data.city = input.city;
  if (input.neededPlayers !== undefined) data.neededPlayers = input.neededPlayers;
  if (input.sport !== undefined) data.sport = input.sport;
  if (input.genderPref !== undefined) data.genderPref = input.genderPref;
  if (input.skillLevel !== undefined) data.skillLevel = input.skillLevel;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;

  const updated = await prisma.matchPost.update({
    where: { id },
    data,
    include: INTERNAL_DETAIL_INCLUDE,
  });
  emitMatchPostWatchers(id);
  return toPublicDetail(updated, userId);
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

  const updated = await prisma.matchPost.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  const label = `${formatDateFR(post.date)} ${post.startTime}`;
  await Promise.all(
    post.requests.map((r) =>
      createNotification({
        userId: r.userId,
        type: 'MATCH_POST_CANCELLED',
        title: 'Annonce annulée',
        body: `L'organisateur a annulé l'annonce du ${label}.`,
        url: `/jouer/${post.id}`,
        data: { matchPostId: post.id },
      }),
    ),
  );

  emitMatchPostWatchers(post.id);

  return updated;
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
    items.map((p) => toPublicDetail(p, creatorId)),
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

  // Reveal the creator's contact info when the viewer's own request is ACCEPTED.
  const cleaned = items.map((row) => ({
    ...row,
    matchPost: {
      ...row.matchPost,
      creator: scrubUser(row.matchPost.creator, {
        revealContact: row.status === 'ACCEPTED',
      }),
    },
  }));

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
  if (post._count.requests >= post.neededPlayers) {
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
    : 'Un joueur';

  await createNotification({
    userId: post.creatorId,
    type: 'MATCH_REQUEST_RECEIVED',
    title: 'Nouvelle demande',
    body: `${requesterName} souhaite rejoindre votre annonce du ${formatDateFR(post.date)} ${post.startTime}.`,
    url: `/jouer/${post.id}`,
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

  if (input.status === 'ACCEPTED' && post._count.requests >= post.neededPlayers) {
    throw new BadRequestError('FULL', 'This match is already full');
  }

  const updated = await prisma.matchJoinRequest.update({
    where: { id: requestId },
    data: { status: input.status },
  });

  const label = `${formatDateFR(post.date)} ${post.startTime}`;

  if (input.status === 'ACCEPTED') {
    await createNotification({
      userId: request.userId,
      type: 'MATCH_REQUEST_ACCEPTED',
      title: 'Demande acceptée',
      body: `Votre demande pour le match du ${label} a été acceptée. Les coordonnées sont désormais visibles.`,
      url: `/jouer/${post.id}`,
      data: { matchPostId: post.id, requestId: updated.id },
    });

    // Automatically add the new member to the live chat room
    emitMatchEvent(post.id, 'match:member_added', {
      matchPostId: post.id,
      userId: request.userId,
    });

    // Tell the new member to join the chat room on their side
    if (io) {
      io.to(`user:${request.userId}`).emit('chat:auto_join', { matchPostId: post.id });
    }

    if (post._count.requests + 1 >= post.neededPlayers) {
      await prisma.matchPost.update({
        where: { id: matchPostId },
        data: { status: 'CLOSED' },
      });
      await createNotification({
        userId: creatorId,
        type: 'MATCH_POST_FULL',
        title: 'Votre annonce est complète',
        body: `L'annonce du ${label} a atteint le nombre de joueurs. Elle a été clôturée automatiquement.`,
        url: `/jouer/${post.id}`,
        data: { matchPostId: post.id },
      });
    }
  } else {
    await createNotification({
      userId: request.userId,
      type: 'MATCH_REQUEST_DECLINED',
      title: 'Demande refusée',
      body: `Votre demande pour le match du ${label} a été refusée.`,
      url: `/jouer/${post.id}`,
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

