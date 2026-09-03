import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * Structured request logging + a stable request ID for tracing.
 * - Every request receives an X-Request-Id header (incoming one is honoured).
 * - A single-line JSON log line is emitted per request with method, path,
 *   status and duration so logs are machine-parsable.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string) || crypto.randomBytes(8).toString('hex');
    (req as Request & { requestId?: string }).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const startedAt = Date.now();
    const method = req.method;
    const path = req.originalUrl || req.url;

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      this.logger.log(
        JSON.stringify({
          type: 'http_request',
          requestId,
          method,
          path,
          status: res.statusCode,
          durationMs
        })
      );
    });

    next();
  }
}
