import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';

/**
 * Authenticates the request if a valid Bearer token is provided. If the header
 * is missing or invalid, the request continues anonymously (req.user is undefined).
 * Use for endpoints that allow both guests and signed-in users.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = header.split(' ')[1];
    req.user = verifyAccessToken(token);
  } catch {
    // Ignore invalid/expired tokens — treat the request as anonymous.
  }
  next();
}
