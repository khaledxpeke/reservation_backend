import { Request, Response, NextFunction } from 'express';
import * as customersService from './customers.service';
import { getParam } from '../../lib/helpers';

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await customersService.getMyAccount(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await customersService.updateMyProfile(req.user!.userId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listMyReservations(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await customersService.listMyReservations(
      req.user!.userId,
      req.query as any,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function cancelMyReservation(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await customersService.cancelMyReservation(
      req.user!.userId,
      getParam(req, 'id'),
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
