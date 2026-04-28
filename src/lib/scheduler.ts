import cron from 'node-cron';
import { prisma } from './prisma';
import { createNotification } from '../modules/notifications/notifications.service';
import { logger } from './logger';

function startOfUtcToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function closeExpiredMatchPosts(): Promise<void> {
  const today = startOfUtcToday();

  const expiredPosts = await prisma.matchPost.findMany({
    where: { status: 'OPEN', date: { lt: today } },
    include: {
      requests: {
        where: { status: 'ACCEPTED' },
        select: { userId: true },
      },
    },
  });

  if (expiredPosts.length === 0) return;

  logger.info(`Scheduler: closing ${expiredPosts.length} expired match post(s)`);

  for (const post of expiredPosts) {
    await prisma.matchPost.update({
      where: { id: post.id },
      data: { status: 'CLOSED' },
    });

    for (const request of post.requests) {
      await createNotification({
        userId: request.userId,
        type: 'MATCH_POST_EXPIRED',
        title: 'Partie terminée',
        body: `La partie du ${new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${post.startTime} est maintenant terminée.`,
        url: `/jouer/${post.id}`,
        data: { matchPostId: post.id },
      });
    }
  }
}

export function startScheduler(): void {
  // Run daily at 00:05 UTC
  cron.schedule('5 0 * * *', () => {
    closeExpiredMatchPosts().catch((err: unknown) => {
      logger.error({ err }, 'Scheduler: failed to close expired match posts');
    });
  });

  logger.info('Scheduler started — expired match posts will be closed daily at 00:05 UTC');
}
