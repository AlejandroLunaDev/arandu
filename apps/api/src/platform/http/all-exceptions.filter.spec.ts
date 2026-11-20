import { AiBudgetExceededError, AiModelError, AiOutputError } from '@nestjs/ai';
import {
  type ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

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
  it('keeps the status and message of an HttpException, in the common body shape', () => {
    const { status, body } = catchWith(new NotFoundException('No session "x"'));

    expect(status).toBe(404);
    expect(body).toEqual({
      statusCode: 404,
      error: 'NOT_FOUND',
      message: 'No session "x"',
      path: '/arandu/chat',
      timestamp: expect.any(String),
    });
  });

  it('keeps a list of messages', () => {
    const { status, body } = catchWith(
      new BadRequestException(['a is required', 'b is required']),
    );

    expect(status).toBe(400);
    expect(body.message).toEqual(['a is required', 'b is required']);
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
  ])(
    'answers %s with 503 and a message that tells to try again',
    (_, error) => {
      const { status, body } = catchWith(error);

      expect(status).toBe(503);
      expect(body.message).toBe(
        'Arandu could not answer right now, try again in a moment',
      );
      expect(JSON.stringify(body)).not.toContain('secret model text');
    },
  );

  it('answers anything else with a bare 500, leaking no internal message', () => {
    const { status, body } = catchWith(
      new Error('relation "arandu_memories" does not exist'),
    );

    expect(status).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('arandu_memories');
  });

  it('answers a thrown non-Error with a bare 500', () => {
    const { status, body } = catchWith('boom');

    expect(status).toBe(500);
    expect(body.message).toBe('Internal server error');
  });
});
