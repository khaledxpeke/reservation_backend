import { Request, Response, NextFunction } from 'express';
import * as availabilitiesService from './availabilities.service';
import { getParam } from '../../lib/helpers';

export async function getAvailabilities(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await availabilitiesService.getAvailabilities(getParam(req, 'resourceId'));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function setAvailabilities(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await availabilitiesService.setAvailabilities(
      req.user!.userId,
      getParam(req, 'resourceId'),
      req.body,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
