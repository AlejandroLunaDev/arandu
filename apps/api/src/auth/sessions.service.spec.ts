import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import type {
  AuthRepository,
  RefreshTokenRow,
  SessionRow,
} from './auth.repository.js';
import { SessionsService } from './sessions.service.js';
import { hashToken, signAccessToken } from './tokens.js';

const SECRET = 'k'.repeat(32);
const HOUR = 3_600_000;

const session = (over: Partial<SessionRow> = {}): SessionRow => ({
  id: 'sess-1',
  userId: 'user-1',
  expiresAt: new Date(Date.now() + 24 * HOUR),
  revokedAt: null,
  guest: true,
  bannedAt: null,
  ...over,
});

const refreshToken = (
  over: Partial<RefreshTokenRow> = {},
): RefreshTokenRow => ({
  id: 'rt-1',
  sessionId: 'sess-1',
  expiresAt: new Date(Date.now() + HOUR),
  revokedAt: null,
  ...over,
});

describe('SessionsService', () => {
  const repository = {
    createSession: vi.fn(),
    createRefreshToken: vi.fn(),
    findRefreshToken: vi.fn(),
    findSession: vi.fn(),
    revokeRefreshToken: vi.fn(),
    revokeSession: vi.fn(),
    touch: vi.fn(),
  };
  let service: SessionsService;
  const future = () => Date.now() + 60_000;

  beforeEach(() => {
    for (const fn of Object.values(repository)) fn.mockReset();
    repository.createSession.mockResolvedValue('sess-1');
    repository.findSession.mockResolvedValue(session());
    repository.findRefreshToken.mockResolvedValue(refreshToken());
    service = new SessionsService(
      repository as unknown as AuthRepository,
      { get: () => SECRET } as unknown as ConfigService<Env, true>,
    );
  });

  describe('open', () => {
    it('creates the session and answers a pair whose refresh token is stored only as a hash', async () => {
      const pair = await service.open('user-1', {
        userAgent: 'UA',
        ip: '1.1.1.1',
      });

      expect(repository.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          userAgent: 'UA',
          ip: '1.1.1.1',
        }),
      );
      expect(repository.createRefreshToken).toHaveBeenCalledWith(
        'sess-1',
        hashToken(pair.refreshToken),
        expect.any(Date),
      );
      expect(pair.accessTokenExpiresIn).toBe(900);
    });
  });

  describe('rotate', () => {
    it('rotates a live token: spends it and answers a new pair', async () => {
      const pair = await service.rotate('old', future());

      expect(repository.findRefreshToken).toHaveBeenCalledWith(
        hashToken('old'),
      );
      expect(repository.revokeRefreshToken).toHaveBeenCalledWith(
        'rt-1',
        expect.any(Date),
      );
      expect(repository.touch).toHaveBeenCalled();
      expect(pair.refreshToken).not.toBe('old');
      expect(repository.createRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('answers 408 refresh_deadline_passed past the deadline, touching nothing', async () => {
      await expect(service.rotate('old', Date.now() - 1)).rejects.toMatchObject(
        {
          status: 408,
          response: { code: 'refresh_deadline_passed' },
        },
      );
      expect(repository.findRefreshToken).not.toHaveBeenCalled();
      expect(repository.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it('answers 401 invalid_refresh_token for an unknown token', async () => {
      repository.findRefreshToken.mockResolvedValue(null);

      await expect(service.rotate('x', future())).rejects.toMatchObject({
        status: 401,
        response: { code: 'invalid_refresh_token' },
      });
    });

    it('still rotates a token spent less than 30 s ago (a concurrent refresh)', async () => {
      repository.findRefreshToken.mockResolvedValue(
        refreshToken({ revokedAt: new Date(Date.now() - 10_000) }),
      );

      await expect(service.rotate('old', future())).resolves.toHaveProperty(
        'refreshToken',
      );
      expect(repository.revokeSession).not.toHaveBeenCalled();
    });

    it('revokes the session as reuse_detected for a token spent more than 30 s ago', async () => {
      repository.findRefreshToken.mockResolvedValue(
        refreshToken({ revokedAt: new Date(Date.now() - 31_000) }),
      );

      await expect(service.rotate('old', future())).rejects.toMatchObject({
        status: 401,
        response: { code: 'invalid_refresh_token' },
      });
      expect(repository.revokeSession).toHaveBeenCalledWith(
        'sess-1',
        'reuse_detected',
        expect.any(Date),
      );
      expect(repository.createRefreshToken).not.toHaveBeenCalled();
    });

    it('answers 401 for an expired token', async () => {
      repository.findRefreshToken.mockResolvedValue(
        refreshToken({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.rotate('old', future())).rejects.toMatchObject({
        status: 401,
      });
      expect(repository.createRefreshToken).not.toHaveBeenCalled();
    });

    it.each([
      ['revoked', session({ revokedAt: new Date() })],
      ['expired', session({ expiresAt: new Date(Date.now() - 1000) })],
      ['missing', null],
    ])('answers 401 when the session is %s', async (_, found) => {
      repository.findSession.mockResolvedValue(found);

      await expect(service.rotate('old', future())).rejects.toMatchObject({
        status: 401,
        response: { code: 'invalid_refresh_token' },
      });
      expect(repository.createRefreshToken).not.toHaveBeenCalled();
    });

    it('answers 403 user_banned for a banned user', async () => {
      repository.findSession.mockResolvedValue(
        session({ bannedAt: new Date() }),
      );

      await expect(service.rotate('old', future())).rejects.toMatchObject({
        status: 403,
        response: { code: 'user_banned' },
      });
      expect(repository.createRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('authenticate', () => {
    const bearer = async (sub = 'user-1', sid = 'sess-1') =>
      `Bearer ${await signAccessToken({ sub, sid }, SECRET, 60)}`;

    it('answers the caller of a live session', async () => {
      await expect(service.authenticate(await bearer())).resolves.toEqual({
        userId: 'user-1',
        sessionId: 'sess-1',
        guest: true,
      });
    });

    it('answers 401 for a missing header, a wrong scheme and a bad token', async () => {
      const valid = (await bearer()).split(' ')[1];

      for (const header of [
        undefined,
        'Bearer',
        `Basic ${valid}`,
        'Bearer nope',
      ])
        await expect(service.authenticate(header)).rejects.toMatchObject({
          status: 401,
          response: { code: 'unauthorized' },
        });
    });

    it('answers 401 when the session belongs to another user', async () => {
      repository.findSession.mockResolvedValue(session({ userId: 'user-2' }));

      await expect(service.authenticate(await bearer())).rejects.toMatchObject({
        status: 401,
      });
    });

    it('answers 401 for a revoked, expired or missing session', async () => {
      for (const found of [
        session({ revokedAt: new Date() }),
        session({ expiresAt: new Date(Date.now() - 1000) }),
        null,
      ]) {
        repository.findSession.mockResolvedValue(found);
        await expect(
          service.authenticate(await bearer()),
        ).rejects.toMatchObject({
          status: 401,
        });
      }
    });

    it('answers 403 user_banned for a banned user', async () => {
      repository.findSession.mockResolvedValue(
        session({ bannedAt: new Date() }),
      );

      await expect(service.authenticate(await bearer())).rejects.toMatchObject({
        status: 403,
        response: { code: 'user_banned' },
      });
    });
  });
});
