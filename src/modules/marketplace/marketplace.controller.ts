import { Request, Response, NextFunction } from 'express';
import * as marketplaceService from './marketplace.service';
import { getParam } from '../../lib/helpers';

export async function searchPartners(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await marketplaceService.searchPartners(req.query as any);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getPublicPartner(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await marketplaceService.getPublicPartner(getParam(req, 'id'));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
