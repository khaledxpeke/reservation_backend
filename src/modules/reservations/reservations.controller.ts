import { Request, Response, NextFunction } from 'express';
import * as reservationsService from './reservations.service';
import { getParam } from '../../lib/helpers';
import { ListReservationsQuery } from './reservations.schema';

export async function createReservation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.role === 'CUSTOMER' ? req.user.userId : undefined;
    const data = await reservationsService.createReservation(req.body, userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listPartnerReservations(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationsService.listPartnerReservations(req.user!.userId, req.query as unknown as ListReservationsQuery);
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

export async function listAdminReservations(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationsService.listAdminReservations(req.query as unknown as ListReservationsQuery);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteReservation(req: Request, res: Response, next: NextFunction) {
  try {
    await reservationsService.deleteReservation(getParam(req, 'id'));
    res.json({ success: true, data: { message: 'Reservation deleted' } });
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

