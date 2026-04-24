import { Request, Response, NextFunction } from 'express';
import * as packsService from './packs.service';
import { getParam } from '../../lib/helpers';

export async function listPacks(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await packsService.listPacks();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createPack(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await packsService.createPack(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updatePack(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await packsService.updatePack(getParam(req, 'id'), req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deletePack(req: Request, res: Response, next: NextFunction) {
  try {
    await packsService.deletePack(getParam(req, 'id'));
    res.json({ success: true, data: { message: 'Pack deleted' } });
  } catch (err) {
    next(err);
  }
}

