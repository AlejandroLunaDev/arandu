import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../core/config/env.js';
import { SupabaseIdentity } from './supabase-identity.js';

const config = {
  get: (key: string) =>
    key === 'SUPABASE_URL' ? 'https://p.supabase.co' : 'publishable',
} as unknown as ConfigService<Env, true>;

describe('SupabaseIdentity', () => {
  const fetchMock = vi.fn();
  const identity = new SupabaseIdentity(config);

  beforeEach(() => vi.stubGlobal('fetch', fetchMock.mockReset()));
  afterEach(() => vi.unstubAllGlobals());

  it('takes the sub and profile of the Google identity, calling Supabase with the token', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        user_metadata: { sub: 'forged' },
        identities: [
          { provider: 'email', identity_data: { sub: 'email-sub' } },
          {
            provider: 'google',
            identity_data: {
              sub: 'g-1',
              email: 'a@b.c',
              full_name: 'Ana',
              picture: 'http://img',
            },
          },
        ],
      }),
    );

    await expect(identity.verify('tok')).resolves.toEqual({
      googleSub: 'g-1',
      email: 'a@b.c',
      name: 'Ana',
      avatarUrl: 'http://img',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://p.supabase.co/auth/v1/user',
    );
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      apikey: 'publishable',
      authorization: 'Bearer tok',
    });
  });

  it('is null without a Google identity, even when user_metadata carries a sub', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        user_metadata: { sub: 'forged', provider: 'google' },
        identities: [{ provider: 'email', identity_data: { sub: 'x' } }],
      }),
    );

    await expect(identity.verify('tok')).resolves.toBeNull();
  });

  it('is null when the Google identity has no sub', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        identities: [{ provider: 'google', identity_data: {} }],
      }),
    );

    await expect(identity.verify('tok')).resolves.toBeNull();
  });

  it.each([401, 403])('is null when Supabase answers %i', async (status) => {
    fetchMock.mockResolvedValue(new Response('{}', { status }));

    await expect(identity.verify('tok')).resolves.toBeNull();
  });

  it('answers 503 when Supabase fails with a 500', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }));

    await expect(identity.verify('tok')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('answers 503 on a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(identity.verify('tok')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
