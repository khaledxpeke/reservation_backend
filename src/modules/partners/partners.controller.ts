import { Request, Response, NextFunction } from 'express';
import * as partnersService from './partners.service';
import { getParam } from '../../lib/helpers';

export async function listPartners(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await partnersService.listPartners(req.query as any);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getPartner(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await partnersService.getPartner(getParam(req, 'id'));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updatePartner(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await partnersService.updatePartner(
      getParam(req, 'id'),
      req.user!.userId,
      req.user!.role,
      req.body,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function verifyPartner(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await partnersService.verifyPartner(getParam(req, 'id'), req.body.isVerified);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function assignPack(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await partnersService.assignPack(getParam(req, 'id'), req.body.packId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createPartner(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await partnersService.createPartner(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deletePartner(req: Request, res: Response, next: NextFunction) {
  try {
    await partnersService.deletePartner(getParam(req, 'id'));
    res.json({ success: true, data: { message: 'Partner deleted' } });
  } catch (err) {
    next(err);
  }
}
