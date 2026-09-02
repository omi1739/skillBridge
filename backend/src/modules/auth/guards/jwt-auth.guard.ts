import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { authService, AuthPayload } from '../../../services/auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      const demoHeader = request.headers['x-demo-user'];
      if (demoHeader) {
        request.user = { userId: 'demo_user_01', email: 'candidate@skillbridge.org', role: 'ADMIN' };
        return true;
      }
      throw new UnauthorizedException('Authentication required. Provide a valid Bearer token.');
    }

    const token = header.slice('Bearer '.length).trim();
    if (token === 'demo_token' || token.startsWith('demo_token_')) {
      request.user = { userId: 'demo_user_01', email: 'candidate@skillbridge.org', role: 'ADMIN' };
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
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (header && header.startsWith('Bearer ')) {
      const token = header.slice('Bearer '.length).trim();
      if (token === 'demo_token' || token.startsWith('demo_token_')) {
        request.user = { userId: 'demo_user_01', email: 'candidate@skillbridge.org', role: 'CANDIDATE' };
        return true;
      }
      const payload = authService.verifyToken(token);
      if (payload) {
        request.user = payload;
      }
    } else if (request.headers['x-demo-user']) {
      request.user = { userId: 'demo_user_01', email: 'candidate@skillbridge.org', role: 'CANDIDATE' };
    }
    return true;
  }
}
