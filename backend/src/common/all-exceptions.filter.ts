import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { reportError } from './error-reporter';

/**
 * Global catch-all filter. It preserves Nest's standard error response shape for
 * HttpExceptions (so existing clients and tests are unaffected) and only adds two
 * things:
 *   - consistent 500 body for unexpected errors, and
 *   - server-error logging + best-effort alert-webhook reporting.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const isServerError = status >= 500;

    let body: Record<string, unknown>;
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      body = typeof res === 'string' ? { statusCode: status, message: res } : (res as Record<string, unknown>);
    } else {
      body = { statusCode: status, message: 'Internal server error', error: 'Internal Server Error' };
    }

    if (isServerError) {
      const route = `${request?.method || '?'} ${request?.url || '?'}`;
      this.logger.error(
        `${route} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception)
      );
      reportError(exception, { method: request?.method, url: request?.url, status });
    }

    response.status(status).json(body);
  }
}
