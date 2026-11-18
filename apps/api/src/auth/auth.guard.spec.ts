import type { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  exportJWK,
  generateKeyPair,
  type JWK,
  type CryptoKey,
  SignJWT,
} from 'jose';
import type { Env } from '../config/env.js';
import { AuthGuard, type AuthedRequest } from './auth.guard.js';
import { Public } from './public.decorator.js';

const SUPABASE_URL = 'https://project.supabase.co';
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const JWKS_URL = `${ISSUER}/.well-known/jwks.json`;
const KID = 'test-key';

class Private {}
@Public()
class OpenRoutes {
  open() {}
}

describe('AuthGuard', () => {
  let privateKey: CryptoKey;
  let jwks: { keys: JWK[] };
  let guard: AuthGuard;

  beforeAll(async () => {
    const pair = await generateKeyPair('ES256');
    privateKey = pair.privateKey;
    jwks = {
      keys: [{ ...(await exportJWK(pair.publicKey)), kid: KID, alg: 'ES256' }],
    };
  });

  beforeEach(() => {
    // The real verification runs; only the JWKS download is local.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: URL | string) => {
        if (url.toString() !== JWKS_URL) throw new Error('Unexpected fetch');
        return Response.json(jwks);
      }),
    );
    guard = new AuthGuard(
      { get: () => SUPABASE_URL } as unknown as ConfigService<Env, true>,
      new Reflector(),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  const sign = (
    claims: Record<string, unknown> = {},
    { key = privateKey, expires = '1h' } = {},
  ) =>
    new SignJWT({ ...claims })
      .setProtectedHeader({ alg: 'ES256', kid: KID })
      .setSubject('user-1')
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime(expires)
      .sign(key);

  const run = (
    authorization?: string,
    target: typeof Private | typeof OpenRoutes = Private,
  ) => {
    const request: AuthedRequest = { headers: { authorization } };
    const context = {
      getHandler: () => () => {},
      getClass: () => target,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { request, result: guard.canActivate(context) };
  };

  it('401s without an authorization header', async () => {
    await expect(run().result).rejects.toMatchObject({ status: 401 });
  });

  it('401s for a scheme other than Bearer', async () => {
    await expect(run(`Basic ${await sign()}`).result).rejects.toMatchObject({
      status: 401,
    });
  });

  it('401s for a malformed token', async () => {
    await expect(run('Bearer not-a-jwt').result).rejects.toMatchObject({
      status: 401,
    });
  });

  it('401s for a token signed by another key', async () => {
    const other = await generateKeyPair('ES256');

    await expect(
      run(`Bearer ${await sign({}, { key: other.privateKey })}`).result,
    ).rejects.toMatchObject({ status: 401 });
  });

  it('401s for an expired token', async () => {
    await expect(
      run(`Bearer ${await sign({}, { expires: '-1m' })}`).result,
    ).rejects.toMatchObject({ status: 401 });
  });

  it('401s for an anonymous token', async () => {
    await expect(
      run(`Bearer ${await sign({ is_anonymous: true })}`).result,
    ).rejects.toMatchObject({ status: 401 });
  });

  it('lets a valid token in and sets the userId', async () => {
    const { request, result } = run(
      `Bearer ${await sign({ is_anonymous: false })}`,
    );

    await expect(result).resolves.toBe(true);
    expect(request.userId).toBe('user-1');
  });

  it('lets a @Public route in without a token', async () => {
    const { request, result } = run(undefined, OpenRoutes);

    await expect(result).resolves.toBe(true);
    expect(request.userId).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
