import { Request, Response, NextFunction } from 'express';
import * as reservationsService from './reservations.service';
import { getParam } from '../../lib/helpers';

export async function createReservation(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationsService.createReservation(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listPartnerReservations(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationsService.listPartnerReservations(req.user!.userId, req.query as any);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateReservationStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationsService.updateReservationStatus(
      req.user!.userId,
      req.user!.role,
      getParam(req, 'id'),
      req.body.status,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAdminStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationsService.getAdminStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
