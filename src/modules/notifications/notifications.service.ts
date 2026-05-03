import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { NotFoundError } from '../../lib/errors';
import { paginate, paginatedResponse, PaginationInput } from '../../lib/pagination';
import { ListNotificationsQuery } from './notifications.schema';
import { emitNotification } from '../../lib/socket';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  url?: string;
  data?: Prisma.InputJsonValue;
}

/**
 * Persist a notification and push it in real-time via WebSocket.
 * Errors are swallowed so that a notification failure never breaks the
 * underlying business operation.
 */
export async function createNotification(input: CreateNotificationInput) {
  try {
    const notif = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        url: input.url,
        data: input.data,
      },
    });
    // Push real-time; safe even if socket server isn't initialised yet
    emitNotification(input.userId, notif);
    return notif;
  } catch (err) {
    logger.error({ err }, 'Failed to create notification');
    return null;
  }
}

export async function listMyNotifications(userId: string, query: ListNotificationsQuery) {
  const where: Prisma.NotificationWhereInput = { userId };
  if (query.unreadOnly) where.readAt = null;

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { ...paginatedResponse(items, total, pagination), unreadCount: unread };
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markRead(userId: string, id: string) {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif || notif.userId !== userId) throw new NotFoundError('Notification');
  if (notif.readAt) return notif;
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}

