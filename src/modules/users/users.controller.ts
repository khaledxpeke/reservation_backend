import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import { getParam } from '../../lib/helpers';
import { ListUsersQuery } from './users.schema';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await usersService.listUsers(req.query as unknown as ListUsersQuery);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await usersService.updateUserStatus(
      req.user!.userId,
      getParam(req, 'id'),
      req.body.status,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    await usersService.deleteUser(req.user!.userId, getParam(req, 'id'));
    res.json({ success: true, data: { message: 'User deleted' } });
  } catch (err) {
    next(err);
  }
}

