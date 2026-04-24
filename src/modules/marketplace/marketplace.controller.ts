import { Request, Response, NextFunction } from 'express';
import * as marketplaceService from './marketplace.service';
import { getParam } from '../../lib/helpers';
import { MarketplaceSearchQuery, CourtSlotsQuery } from './marketplace.schema';

export async function searchPartners(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await marketplaceService.searchPartners(req.query as unknown as MarketplaceSearchQuery);
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

export async function searchCourtOffers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await marketplaceService.searchCourtOffers(req.query as unknown as CourtSlotsQuery);
    res.json({ success: true, data: { items: data } });
  } catch (err) {
    next(err);
  }
}
