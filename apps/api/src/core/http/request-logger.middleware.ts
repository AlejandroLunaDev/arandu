import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/** One line per request: method, path, status, time and who asked. Never bodies: they hold personal data (LGPD). */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    // Render's health check (render.yaml healthCheckPath) would be most of the log.
    if (request.method === 'GET' && request.originalUrl === '/') return next();
    const started = performance.now();
    response.on('finish', () => {
      const { statusCode } = response;
      const user = (request as { userId?: string }).userId;
      const line = `${request.method} ${request.originalUrl} ${statusCode} ${Math.round(performance.now() - started)} ms${user ? ` user ${user}` : ''}`;
      if (statusCode >= 500) this.logger.error(line);
      else if (statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });
    next();
  }
}
