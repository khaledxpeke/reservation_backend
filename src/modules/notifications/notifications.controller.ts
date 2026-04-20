import { NextFunction, Request, Response } from 'express';
import * as notificationsService from './notifications.service';
import { getParam } from '../../lib/helpers';

export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await notificationsService.listMyNotifications(
      req.user!.userId,
      req.query as any,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function unreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await notificationsService.getUnreadCount(req.user!.userId);
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await notificationsService.markRead(req.user!.userId, getParam(req, 'id'));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await notificationsService.markAllRead(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
