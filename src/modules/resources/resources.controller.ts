import { Request, Response, NextFunction } from 'express';
import * as resourcesService from './resources.service';
import * as partnersService from '../partners/partners.service';
import { getParam } from '../../lib/helpers';

export async function listResources(req: Request, res: Response, next: NextFunction) {
  try {
    const partner = await partnersService.getPartnerByUserId(req.user!.userId);
    const data = await resourcesService.listResources(partner.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createResource(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await resourcesService.createResource(req.user!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateResource(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await resourcesService.updateResource(req.user!.userId, getParam(req, 'id'), req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteResource(req: Request, res: Response, next: NextFunction) {
  try {
    await resourcesService.deleteResource(req.user!.userId, getParam(req, 'id'));
    res.json({ success: true, data: { message: 'Resource deactivated' } });
  } catch (err) {
    next(err);
  }
}
