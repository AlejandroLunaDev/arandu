import { AiBudgetExceededError, AiModelError, AiOutputError } from '@nestjs/ai';
import {
  type ArgumentsHost,
  BadRequestException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AllExceptionsFilter,
  validationFailed,
} from './all-exceptions.filter.js';

const catchWith = (exception: unknown) => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'POST', originalUrl: '/arandu/chat' }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
};

describe('AllExceptionsFilter', () => {
  it('keeps the status and message of an HttpException, in the { error } shape', () => {
    const { status, body } = catchWith(new NotFoundException('No session "x"'));

    expect(status).toBe(404);
    expect(body).toEqual({
      error: { statusCode: 404, code: 'not_found', message: 'No session "x"' },
    });
  });

  it('keeps the code and message of an HttpException body', () => {
    const { body } = catchWith(
      new UnauthorizedException({
        code: 'invalid_refresh_token',
        message: 'Sign in again',
      }),
    );

    expect(body).toEqual({
      error: {
        statusCode: 401,
        code: 'invalid_refresh_token',
        message: 'Sign in again',
      },
    });
  });

  it('gives an error without a code the name of its status', () => {
    expect(catchWith(new NotFoundException('x')).body.error.code).toBe(
      'not_found',
    );
    expect(catchWith(new BadRequestException('x')).body.error.code).toBe(
      'bad_request',
    );
    expect(catchWith(new UnauthorizedException()).body.error.code).toBe(
      'unauthorized',
    );
  });

  it('gives a 429 the code too_many_requests', () => {
    const { status, body } = catchWith(new HttpException('slow down', 429));

    expect(status).toBe(429);
    expect(body.error).toEqual({
      statusCode: 429,
      code: 'too_many_requests',
      message: 'slow down',
    });
  });

  it('joins a list of messages', () => {
    const { status, body } = catchWith(
      new BadRequestException(['a is required', 'b is required']),
    );

    expect(status).toBe(400);
    expect(body.error.message).toBe('a is required; b is required');
  });

  it.each([
    ['AiModelError', new AiModelError([])],
    ['AiOutputError', new AiOutputError('bad json', 'secret model text')],
    [
      'AiBudgetExceededError',
      new AiBudgetExceededError(
        { inputTokens: 1, outputTokens: 1, totalTokens: 2 } as never,
        0.5,
        { maxCost: 0.1 },
      ),
    ],
  ])('answers %s with 503 model_unavailable', (_, error) => {
    const { status, body } = catchWith(error);

    expect(status).toBe(503);
    expect(body).toEqual({
      error: {
        statusCode: 503,
        code: 'model_unavailable',
        message: 'Arandu could not answer right now, try again in a moment',
      },
    });
    expect(JSON.stringify(body)).not.toContain('secret model text');
  });

  it('answers anything else with a bare 500 internal_error, leaking nothing internal', () => {
    const { status, body } = catchWith(
      new Error('relation "arandu_memories" does not exist'),
    );

    expect(status).toBe(500);
    expect(body).toEqual({
      error: {
        statusCode: 500,
        code: 'internal_error',
        message: 'Internal server error',
      },
    });
    expect(JSON.stringify(body)).not.toContain('arandu_memories');
  });

  it('answers a thrown non-Error with a bare 500', () => {
    const { status, body } = catchWith('boom');

    expect(status).toBe(500);
    expect(body.error).toMatchObject({
      code: 'internal_error',
      message: 'Internal server error',
    });
  });

  describe('validationFailed', () => {
    it('groups the issues by dotted path, the root as an empty field and { key } segments as their key', () => {
      const { status, body } = catchWith(
        validationFailed([
          { message: 'Required', path: ['professionSlug'] },
          { message: 'Too short', path: ['professionSlug'] },
          { message: 'Invalid', path: ['items', 0, { key: 'name' }] },
          { message: 'Unrecognized key "extra"' },
        ]),
      );

      expect(status).toBe(400);
      expect(body).toEqual({
        error: {
          statusCode: 400,
          code: 'validation_failed',
          message: 'Some fields are invalid',
          details: [
            { field: 'professionSlug', messages: ['Required', 'Too short'] },
            { field: 'items.0.name', messages: ['Invalid'] },
            { field: '', messages: ['Unrecognized key "extra"'] },
          ],
        },
      });
    });

    it('caps the details at 20 issues', () => {
      const issues = Array.from({ length: 50 }, (_, i) => ({
        message: 'bad',
        path: [`f${i}`],
      }));

      const { body } = catchWith(validationFailed(issues));

      expect(body.error.details).toHaveLength(20);
      expect(body.error.details.at(-1)).toEqual({
        field: 'f19',
        messages: ['bad'],
      });
    });
  });
});
