import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RequestLoggerMiddleware } from './request-logger.middleware.js';

const run = (method: string, originalUrl: string) => {
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  const next = vi.fn();
  const response = {
    statusCode: 200,
    on: (_: string, cb: () => void) => cb(),
  } as unknown as Response;
  new RequestLoggerMiddleware().use(
    { method, originalUrl } as Request,
    response,
    next,
  );
  return { log, next };
};

describe('RequestLoggerMiddleware', () => {
  afterEach(() => vi.restoreAllMocks());

  it('skips GET / (the health check) but still continues', () => {
    const { log, next } = run('GET', '/');

    expect(log).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it.each([
    ['GET', '/me'],
    ['POST', '/'],
  ])('logs %s %s', (method, url) => {
    const { log, next } = run(method, url);

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(`${method} ${url} 200`),
    );
    expect(next).toHaveBeenCalled();
  });
});
