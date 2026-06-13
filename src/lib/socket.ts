import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { isOriginAllowed } from './corsOrigins';
import { verifyAccessToken } from './jwt';
import { prisma } from './prisma';
import { logger } from './logger';

export let io: SocketServer;

// Rooms:
//  match:{matchPostId}  — chat members
//  post:{matchPostId}   — viewers of the post detail page (live refresh)
//  user:{userId}        — personal room for notifications

export function initSocket(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) callback(null, true);
        else callback(new Error(`CORS: origin '${origin ?? '(none)'}' not allowed`));
      },
      credentials: true,
    },
    path: '/socket.io',
  });

  // JWT auth middleware
  io.use((socket: Socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('UNAUTHORIZED'));
    }

    try {
      const payload = verifyAccessToken(token);
      (socket as AuthSocket).userId = payload.userId;
      (socket as AuthSocket).role = payload.role;
      return next();
    } catch {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthSocket;
    const { userId } = socket;

    // Always join personal room so we can push notifications to this user
    socket.join(`user:${userId}`);
    logger.debug({ userId }, 'WS connected');

    /** Anyone on /annonces/[id] can subscribe for live list updates (demands, statut). */
    socket.on('match:watch', (matchPostId: string) => {
      if (typeof matchPostId !== 'string' || !matchPostId) return;
      socket.join(`post:${matchPostId}`);
    });

    socket.on('match:unwatch', (matchPostId: string) => {
      if (typeof matchPostId !== 'string' || !matchPostId) return;
      socket.leave(`post:${matchPostId}`);
    });

    // ── join a match chat room ──────────────────────────────────────────────
    socket.on('chat:join', async (matchPostId: string) => {
      const allowed = await isMatchMember(matchPostId, userId);
      if (!allowed) {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Not a member of this match' });
        return;
      }
      socket.join(`match:${matchPostId}`);
      socket.emit('chat:joined', { matchPostId });
    });

    socket.on('chat:leave', (matchPostId: string) => {
      if (typeof matchPostId !== 'string' || !matchPostId) return;
      socket.leave(`match:${matchPostId}`);
      socket.emit('chat:left', { matchPostId });
    });

    // ── send a chat message ─────────────────────────────────────────────────
    socket.on('chat:send', async (payload: { matchPostId: string; content: string }) => {
      const { matchPostId, content } = payload;
      if (!content?.trim()) return;

      const allowed = await isMatchMember(matchPostId, userId);
      if (!allowed) {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Not a member of this match' });
        return;
      }

      try {
        const msg = await prisma.chatMessage.create({
          data: { matchPostId, senderId: userId, content: content.trim() },
          include: {
            sender: {
              select: {
                id: true,
                customerProfile: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        });

        // Broadcast to everyone in the room (including sender)
        io.to(`match:${matchPostId}`).emit('chat:message', msg);

        // Notify other group members (bell + websocket), Facebook-style preview
        const postRecipients = await prisma.matchPost.findUnique({
          where: { id: matchPostId },
          select: {
            requests: {
              where: { status: 'ACCEPTED' },
              select: { userId: true },
            },
            creatorId: true,
          },
        });
        if (postRecipients) {
          const recipientIds = new Set<string>();
          if (postRecipients.creatorId !== userId) {
            recipientIds.add(postRecipients.creatorId);
          }
          for (const r of postRecipients.requests) {
            if (r.userId !== userId) recipientIds.add(r.userId);
          }

          const senderLabel = msg.sender.customerProfile
            ? `${msg.sender.customerProfile.firstName} ${msg.sender.customerProfile.lastName}`.trim()
            : 'Un joueur';
          const raw = content.trim();
          const bodyPreview = raw.length > 160 ? `${raw.slice(0, 160)}…` : raw;

          const { createNotification } = await import('../modules/notifications/notifications.service');
          await Promise.all(
            [...recipientIds].map((uid) =>
              createNotification({
                userId: uid,
                // Enum value from schema; run `npx prisma generate` if TS complains on stale client
                type: 'MATCH_CHAT_MESSAGE' as import('@prisma/client').NotificationType,
                title: senderLabel,
                body: bodyPreview,
                url: `/annonces/${matchPostId}`,
                data: {
                  matchPostId,
                  messageId: msg.id,
                  senderId: userId,
                },
              }),
            ),
          );
        }
      } catch (err) {
        logger.error({ err }, 'chat:send error');
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Could not send message' });
      }
    });

    socket.on('disconnect', () => {
      logger.debug({ userId }, 'WS disconnected');
    });
  });

  return io;
}

/** Emit a notification event to a specific user (called from service layer) */
export function emitNotification(userId: string, notification: object) {
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notification);
  }
}

/** Notify all sockets watching a post (creator, requesters, etc.) to refetch. */
export function emitMatchPostWatchers(matchPostId: string) {
  if (io) {
    io.to(`post:${matchPostId}`).emit('match:updated', { matchPostId });
  }
}

/** Emit a match-room event (e.g. a new member joined) */
export function emitMatchEvent(matchPostId: string, event: string, data: object) {
  if (io) {
    io.to(`match:${matchPostId}`).emit(event, data);
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function isMatchMember(matchPostId: string, userId: string): Promise<boolean> {
  const post = await prisma.matchPost.findUnique({
    where: { id: matchPostId },
    select: {
      creatorId: true,
      requests: {
        where: { userId, status: 'ACCEPTED' },
        select: { id: true },
      },
    },
  });
  if (!post) return false;
  return post.creatorId === userId || post.requests.length > 0;
}

interface AuthSocket extends Socket {
  userId: string;
  role: string;
}
