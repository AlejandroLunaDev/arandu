import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AiBudgetExceededError, AiModelError, AiOutputError } from '@nestjs/ai';
import type { Request, Response } from 'express';

/** The body of every error response. */
export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Turns every error into one JSON shape. Expected errors (HttpException) keep their status and message; the model
 * failing becomes 503 so the web can tell the person to try again; anything else is logged with its stack and
 * answered as a bare 500, so no internal detail (SQL, stack, model output) reaches the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const where = `${request.method} ${request.originalUrl}`;

    let status: number;
    let message: string | string[];
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ??
            exception.message);
    } else if (
      exception instanceof AiModelError ||
      exception instanceof AiOutputError ||
      exception instanceof AiBudgetExceededError
    ) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Arandu could not answer right now, try again in a moment';
      this.logger.error(`${where}: ${exception.name}: ${exception.message}`);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      this.logger.error(
        `${where}: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    } satisfies ErrorBody);
  }
}
