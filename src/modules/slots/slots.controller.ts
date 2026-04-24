import { Request, Response, NextFunction } from 'express';
import * as slotsService from './slots.service';
import { AvailableSlotsQuery } from './slots.schema';

export async function getAvailableSlots(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await slotsService.getAvailableSlots(req.query as unknown as AvailableSlotsQuery);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
