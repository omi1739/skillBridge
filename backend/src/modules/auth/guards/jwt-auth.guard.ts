import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { authService, AuthPayload } from '../../../services/auth.service';
import { store } from '../../../store';
import { demoAccessAllowed, DEMO_USER_ID, DEMO_EMAIL } from '../../../common/demo-access';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Resolves the real role for the shared demo identity from the database,
 * instead of hardcoding ADMIN. The demo user is a regular USER, so the demo
 * token can never reach ADMIN-only routes — real role separation is enforced.
 */
async function resolveDemoRole(): Promise<string> {
  const demoUser = await store.getUser(DEMO_USER_ID);
  return demoUser?.role || 'USER';
}

/**
 * The demo token is a development convenience that always resolves to the
 * fixed demo identity. Only exact, known-bad tokens are accepted so the
 * suffix can never be abused to claim another identity.
 */
const DEMO_TOKEN = 'demo_token';
const DEMO_TOKEN_FOR_USER = `${DEMO_TOKEN}_${DEMO_USER_ID}`;

function isDemoToken(token: string): boolean {
  return token === DEMO_TOKEN || token === DEMO_TOKEN_FOR_USER;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required. Provide a valid Bearer token.');
    }

    const token = header.slice('Bearer '.length).trim();
    if (isDemoToken(token)) {
      if (!demoAccessAllowed()) {
        throw new UnauthorizedException('Demo access is disabled in this environment.');
      }
      const role = await resolveDemoRole();
      request.user = { userId: DEMO_USER_ID, email: DEMO_EMAIL, role };
      return true;
    }

    const payload = authService.verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    request.user = payload;
    return true;
  }
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (header && header.startsWith('Bearer ')) {
      const token = header.slice('Bearer '.length).trim();
      if (isDemoToken(token)) {
        if (demoAccessAllowed()) {
          const role = await resolveDemoRole();
          request.user = { userId: DEMO_USER_ID, email: DEMO_EMAIL, role };
        }
        return true;
      }
      const payload = authService.verifyToken(token);
      if (payload) {
        request.user = payload;
      }
    }
    return true;
  }
}
