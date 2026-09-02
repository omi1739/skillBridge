import { Request, Response, NextFunction } from 'express';
import { authService, AuthPayload } from '../services/auth.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Require a valid Bearer token. On success populates `req.user` and continues;
 * otherwise responds 401.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Provide a valid Bearer token.' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  const payload = authService.verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Best-effort auth: populates `req.user` when a valid token is present but never
 * rejects the request. Useful for routes that work for anonymous/demo users too.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const payload = authService.verifyToken(header.slice('Bearer '.length).trim());
    if (payload) {
      req.user = payload;
    }
  }
  next();
}
