import { Request, Response, NextFunction } from 'express';
import * as offersService from './offers.service';
import { getParam } from '../../lib/helpers';
import { ListOffersQuery } from './offers.schema';

export async function createOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await offersService.createOffer(req.user!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listPartnerOffers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await offersService.listPartnerOffers(
      req.user!.userId,
      req.query as unknown as ListOffersQuery,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listPublicOffers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await offersService.listPublicOffers(req.query as unknown as ListOffersQuery);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateApproval(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await offersService.updateApproval(getParam(req, 'id'), req.body.approvalStatus);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listAllOffers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await offersService.listAllOffers(req.query as unknown as ListOffersQuery);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
