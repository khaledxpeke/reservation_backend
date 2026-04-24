import { Request, Response, NextFunction } from 'express';
import * as matchesService from './matches.service';
import { getParam } from '../../lib/helpers';
import { ListMatchPostsQuery } from './matches.schema';

export async function listPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await matchesService.listMatchPosts(req.query as unknown as ListMatchPostsQuery, req.user?.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getPost(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await matchesService.getMatchPost(
      getParam(req, 'id'),
      req.user?.userId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await matchesService.createMatchPost(req.user!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updatePost(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await matchesService.updateMatchPost(
      req.user!.userId,
      getParam(req, 'id'),
      req.body,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function cancelPost(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await matchesService.cancelMatchPost(req.user!.userId, getParam(req, 'id'));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listMyCreated(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await matchesService.listMyCreatedPosts(req.user!.userId, req.query as unknown as ListMatchPostsQuery);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listMyRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await matchesService.listMyJoinRequests(req.user!.userId, req.query as unknown as ListMatchPostsQuery);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function joinPost(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await matchesService.createJoinRequest(
      req.user!.userId,
      getParam(req, 'id'),
      req.body,
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function respondRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await matchesService.respondToJoinRequest(
      req.user!.userId,
      getParam(req, 'id'),
      getParam(req, 'requestId'),
      req.body,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function withdrawRequest(req: Request, res: Response, next: NextFunction) {
  try {
    await matchesService.withdrawJoinRequest(req.user!.userId, getParam(req, 'id'));
    res.json({ success: true, data: { message: 'Request withdrawn' } });
  } catch (err) {
    next(err);
  }
}

