import { Request, Response, NextFunction } from 'express';
import * as matchesService from './matches.service';
import { getParam } from '../../lib/helpers';
import { ListMatchPostsQuery } from './matches.schema';
import { prisma } from '../../lib/prisma';
import { ForbiddenError } from '../../lib/errors';

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

export async function requestLeave(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await matchesService.requestLeave(
      req.user!.userId,
      getParam(req, 'id'),
      req.body,
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function respondLeave(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await matchesService.respondLeaveRequest(
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

export async function getChatMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const matchPostId = getParam(req, 'id');
    const userId = req.user!.userId;

    // Only members (creator or accepted) can read the chat
    const post = await prisma.matchPost.findUnique({
      where: { id: matchPostId },
      select: {
        creatorId: true,
        requests: { where: { userId, status: 'ACCEPTED' }, select: { id: true } },
      },
    });
    if (!post) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }
    const isMember = post.creatorId === userId || post.requests.length > 0;
    if (!isMember) throw new ForbiddenError('Not a member of this match');

    const cursor = req.query.before as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 50), 100);

    const messages = await prisma.chatMessage.findMany({
      where: {
        matchPostId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            customerProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    next(err);
  }
}

