import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const RATE_LIMIT_KEY = 'rate_limit';
export const RATE_WINDOW_KEY = 'rate_window';

/**
 * Lightweight, in-process token-bucket rate limiter applied as a route guard
 * (approved use of a guard because it needs no external state and works in a
 * single instance). Protects mutating assessment endpoints from brute-force
 * answer submission and session-spam.
 *
 * Usage:
 *   @UseGuards(RateLimitGuard)
 *   @RateLimit(60)            // max 60 requests
 *   @RateWindow(60_000)       // per 60s window (default 60_000)
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private buckets = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const limit = this.reflector.getAllAndOverride<number | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!limit) return true;

    const windowMs = this.reflector.getAllAndOverride<number | undefined>(RATE_WINDOW_KEY, [
      context.getHandler(),
      context.getClass()
    ]) ?? 60_000;

    const request = context.switchToHttp().getRequest<Request & { user?: { userId?: string } }>();
    const key = request.user?.userId || request.ip || 'anonymous';
    const now = Date.now();

    let timestamps = this.buckets.get(key) || [];
    timestamps = timestamps.filter(t => now - t < windowMs);

    if (timestamps.length >= limit) {
      const retryAfterSec = Math.ceil((windowMs - (now - timestamps[0])) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please slow down.',
          error: 'Too Many Requests'
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    timestamps.push(now);
    this.buckets.set(key, timestamps);

    // Prevent unbounded memory growth.
    if (this.buckets.size > 10_000) {
      this.buckets = new Map<string, number[]>();
    }

    return true;
  }
}
