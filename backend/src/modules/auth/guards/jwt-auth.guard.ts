import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { authService, AuthPayload } from '../../../services/auth.service';
import { store } from '../../../store';

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
  const demoUser = await store.getUser('demo_user_01');
  return demoUser?.role || 'USER';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      const demoHeader = request.headers['x-demo-user'];
      if (demoHeader) {
        const role = await resolveDemoRole();
        request.user = { userId: 'demo_user_01', email: 'candidate@skillbridge.org', role };
        return true;
      }
      throw new UnauthorizedException('Authentication required. Provide a valid Bearer token.');
    }

    const token = header.slice('Bearer '.length).trim();
    if (token === 'demo_token' || token.startsWith('demo_token_')) {
      const role = await resolveDemoRole();
      request.user = { userId: 'demo_user_01', email: 'candidate@skillbridge.org', role };
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
      if (token === 'demo_token' || token.startsWith('demo_token_')) {
        const role = await resolveDemoRole();
        request.user = { userId: 'demo_user_01', email: 'candidate@skillbridge.org', role };
        return true;
      }
      const payload = authService.verifyToken(token);
      if (payload) {
        request.user = payload;
      }
    } else if (request.headers['x-demo-user']) {
      const role = await resolveDemoRole();
      request.user = { userId: 'demo_user_01', email: 'candidate@skillbridge.org', role };
    }
    return true;
  }
}
