import { Request, Response, NextFunction } from 'express';
import * as slotsService from './slots.service';

export async function getAvailableSlots(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await slotsService.getAvailableSlots(req.query as any);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
