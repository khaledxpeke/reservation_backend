import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import { getParam } from '../../lib/helpers';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await usersService.listUsers(req.query as any);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await usersService.updateUserStatus(getParam(req, 'id'), req.body.status);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    await usersService.deleteUser(getParam(req, 'id'));
    res.json({ success: true, data: { message: 'User deleted' } });
  } catch (err) {
    next(err);
  }
}
