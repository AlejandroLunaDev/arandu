import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Env } from '../../core/config/env.js';
import { AuthGuard, type AuthedRequest } from './auth.guard.js';
import { OpenToBrowsers, Public } from './public.decorator.js';
import type { Caller, SessionsService } from './sessions.service.js';

const SECRET = 's'.repeat(32);

class Private {}
@Public()
class SignInRoutes {}
@OpenToBrowsers()
class BrowserRoutes {}

describe('AuthGuard', () => {
  const caller: Caller = { userId: 'user-1', sessionId: 's-1', guest: false };
  const sessions = { authenticate: vi.fn() };
  let guard: AuthGuard;

  beforeEach(() => {
    sessions.authenticate.mockReset().mockResolvedValue(caller);
    guard = new AuthGuard(
      { get: () => SECRET } as unknown as ConfigService<Env, true>,
      new Reflector(),
      sessions as unknown as SessionsService,
    );
  });

  const run = (
    headers: AuthedRequest['headers'],
    target: new () => object = Private,
  ) => {
    const request: AuthedRequest = { headers };
    const context = {
      getHandler: () => () => {},
      getClass: () => target,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { request, result: guard.canActivate(context) };
  };

  it.each([
    ['no secret', {}],
    ['a wrong secret', { 'x-internal-secret': 'x'.repeat(32) }],
    ['a secret of another length', { 'x-internal-secret': 'short' }],
  ])('401s with %s, even with a bearer', async (_, headers) => {
    await expect(
      run({ ...headers, authorization: 'Bearer t' }).result,
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'unauthorized' },
    });
    expect(sessions.authenticate).not.toHaveBeenCalled();
  });

  it('lets an @OpenToBrowsers route in without the secret', async () => {
    const { request, result } = run({}, BrowserRoutes);

    await expect(result).resolves.toBe(true);
    expect(request.userId).toBeUndefined();
    expect(sessions.authenticate).not.toHaveBeenCalled();
  });

  it('401s a @Public route without the secret', async () => {
    await expect(run({}, SignInRoutes).result).rejects.toMatchObject({
      status: 401,
    });
  });

  it('lets a @Public route in with the secret, with no session, and sets the client', async () => {
    const { request, result } = run(
      {
        'x-internal-secret': SECRET,
        'x-client-ip': '1.2.3.4',
        'x-client-user-agent': 'UA',
      },
      SignInRoutes,
    );

    await expect(result).resolves.toBe(true);
    expect(request.clientIp).toBe('1.2.3.4');
    expect(request.clientUserAgent).toBe('UA');
    expect(request.userId).toBeUndefined();
    expect(sessions.authenticate).not.toHaveBeenCalled();
  });

  it('authenticates a protected route and sets the caller and userId', async () => {
    const { request, result } = run({
      'x-internal-secret': SECRET,
      'x-client-ip': '1.2.3.4',
      authorization: 'Bearer abc',
    });

    await expect(result).resolves.toBe(true);
    expect(sessions.authenticate).toHaveBeenCalledWith('Bearer abc');
    expect(request.userId).toBe('user-1');
    expect(request.caller).toBe(caller);
    expect(request.clientIp).toBe('1.2.3.4');
  });

  it('passes the session failure of a protected route through', async () => {
    sessions.authenticate.mockRejectedValue(
      Object.assign(new Error('no'), { status: 401 }),
    );

    await expect(
      run({ 'x-internal-secret': SECRET }).result,
    ).rejects.toMatchObject({ status: 401 });
  });
});
