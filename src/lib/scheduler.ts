import cron from 'node-cron';
import { closeExpiredMatchPosts } from '../modules/matches/matches.service';
import { logger } from './logger';

export function startScheduler(): void {
  closeExpiredMatchPosts().catch((err: unknown) => {
    logger.error({ err }, 'Scheduler: failed to close expired match posts on startup');
  });

  // Toutes les heures : clôturer les annonces dont le dernier créneau est passé
  cron.schedule('0 * * * *', () => {
    closeExpiredMatchPosts().catch((err: unknown) => {
      logger.error({ err }, 'Scheduler: failed to close expired match posts');
    });
  });

  logger.info('Scheduler started — expired match posts closed on startup and hourly');
}
