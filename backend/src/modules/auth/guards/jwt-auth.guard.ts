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
      throw new UnauthorizedException('Authentication required. Provide a valid Bearer token.');
    }

    const token = header.slice('Bearer '.length).trim();
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
      const payload = authService.verifyToken(header.slice('Bearer '.length).trim());
      if (payload) {
        request.user = payload;
      }
    }
    return true;
  }
}
