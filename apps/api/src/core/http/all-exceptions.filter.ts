import type { ApiError, ErrorResponse } from '@arandu/contracts';
import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AiBudgetExceededError, AiModelError, AiOutputError } from '@nestjs/ai';
import type { Request, Response } from 'express';

/** A Standard Schema issue, as the validation pipe hands it over. */
interface Issue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
}

/** Bounds the 400 body: the issues are as many as the request makes them. */
const MAX_ISSUES = 20;

/** The validation pipe's exception: a 400 `validation_failed`, with what is wrong with each field. */
export function validationFailed(
  issues: readonly Issue[],
): BadRequestException {
  const details = new Map<string, string[]>();
  for (const issue of issues.slice(0, MAX_ISSUES)) {
    const field = (issue.path ?? [])
      .map((segment) =>
        typeof segment === 'object' ? String(segment.key) : String(segment),
      )
      .join('.');
    details.set(field, [...(details.get(field) ?? []), issue.message]);
  }
  return new BadRequestException({
    code: 'validation_failed',
    message: 'Some fields are invalid',
    details: [...details].map(([field, messages]) => ({ field, messages })),
  });
}

/** Postgres's unique_violation (23505), as postgres.js throws it. */
const isUniqueViolation = (e: unknown) =>
  typeof e === 'object' &&
  e !== null &&
  (e as { code?: unknown }).code === '23505';

/** `NOT_FOUND` → `not_found`: the code of an error thrown without one. */
const codeOf = (status: number) =>
  (HttpStatus[status] ?? 'error').toLowerCase();

/**
 * Turns every error into `{ error: { statusCode, code, message, details? } }`. Expected errors (HttpException) keep
 * their status, message and code, or get the status's name as code; the model failing becomes 503 so the web can tell
 * the person to try again; anything else is logged with its stack and answered as a bare 500, so no internal detail
 * (SQL, stack, model output) reaches the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const where = `${request.method} ${request.originalUrl}`;

    let error: ApiError;
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse() as
        | string
        | { code?: unknown; message?: unknown; details?: ApiError['details'] };
      const raw = typeof body === 'string' ? body : body.message;
      const message =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw)
            ? raw.join('; ')
            : exception.message;
      error = {
        statusCode,
        code:
          typeof body === 'object' && typeof body.code === 'string'
            ? body.code
            : codeOf(statusCode),
        message,
        ...(typeof body === 'object' &&
          body.details && { details: body.details }),
      };
    } else if (
      exception instanceof AiModelError ||
      exception instanceof AiOutputError ||
      exception instanceof AiBudgetExceededError
    ) {
      error = {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'model_unavailable',
        message: 'Arandu could not answer right now, try again in a moment',
      };
      this.logger.error(`${where}: ${exception.name}: ${exception.message}`);
    } else if (isUniqueViolation(exception)) {
      // Two requests raced to create the same row: the caller asked for something that already exists.
      error = {
        statusCode: HttpStatus.CONFLICT,
        code: 'conflict',
        message: 'It already exists',
      };
    } else {
      error = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'internal_error',
        message: 'Internal server error',
      };
      this.logger.error(
        `${where}: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(error.statusCode).json({ error } satisfies ErrorResponse);
  }
}
