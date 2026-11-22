import type { TokenPair } from '@arandu/contracts';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../core/config/env.js';
import {
  invalidRefreshToken,
  refreshDeadlinePassed,
  unauthorized,
  userBanned,
} from './auth.errors.js';
import {
  AuthRepository,
  type RevokedReason,
  type SessionRow,
} from './auth.repository.js';
import {
  hashToken,
  newRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from './tokens.js';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
/** A refresh token unused this long ends the session; the guest cleanup uses the same 30 days. */
export const REFRESH_IDLE_MS = 30 * 86_400_000;
/** The session ends here even if it is used every day. */
export const SESSION_ABSOLUTE_MS = 90 * 86_400_000;
/**
 * How long after a refresh token was spent it is still taken as a concurrent refresh, not reuse: an idle tab coming
 * back fires several requests with the same expired token, and without this window the losers would end the
 * session. Ported from v2.0.
 */
export const ROTATION_GRACE_MS = 30_000;

/** The browser behind the web server's call, as the web server forwards it. */
export interface Client {
  userAgent: string | null;
  ip: string | null;
}

/** Who is calling: set on the request by AuthGuard. */
export interface Caller {
  userId: string;
  sessionId: string;
  guest: boolean;
}

/** The API's own sessions: rotating refresh tokens with reuse detection, instant revocation and bans. */
@Injectable()
export class SessionsService {
  private readonly secret: string;

  constructor(
    private readonly repository: AuthRepository,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('JWT_SECRET', { infer: true });
  }

  async open(userId: string, client: Client): Promise<TokenPair> {
    const expiresAt = new Date(Date.now() + SESSION_ABSOLUTE_MS);
    const sessionId = await this.repository.createSession({
      userId,
      ...client,
      expiresAt,
    });
    return this.pair(userId, sessionId, expiresAt);
  }

  /**
   * `deadline` is when the web server stops waiting. Past it nothing changes: a new token would reach nobody, and the
   * cookie's token, spent, would later look like reuse and end the session.
   */
  async rotate(refreshToken: string, deadline: number): Promise<TokenPair> {
    if (Date.now() > deadline) throw refreshDeadlinePassed();

    const token = await this.repository.findRefreshToken(
      hashToken(refreshToken),
    );
    if (!token) throw invalidRefreshToken();
    const session = await this.repository.findSession(token.sessionId);
    if (!session || !live(session)) throw invalidRefreshToken();
    if (session.bannedAt) throw userBanned();

    const now = new Date();
    if (token.revokedAt) {
      if (now.getTime() - token.revokedAt.getTime() > ROTATION_GRACE_MS) {
        await this.repository.revokeSession(session.id, 'reuse_detected', now);
        throw invalidRefreshToken();
      }
    } else {
      if (token.expiresAt <= now) throw invalidRefreshToken();
      // Losing this race means a parallel refresh spent the token a moment ago: the case the grace covers.
      await this.repository.revokeRefreshToken(token.id, now);
    }

    await this.repository.touch(session, now);
    return this.pair(session.userId, session.id, session.expiresAt);
  }

  /** The caller behind an `Authorization: Bearer` header: 401 without a live session, 403 when banned. */
  async authenticate(authorization: string | undefined): Promise<Caller> {
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw unauthorized();
    const claims = await verifyAccessToken(token, this.secret);
    if (!claims) throw unauthorized();
    const session = await this.repository.findSession(claims.sid);
    if (!session || session.userId !== claims.sub || !live(session))
      throw unauthorized();
    if (session.bannedAt) throw userBanned();
    return { userId: session.userId, sessionId: session.id, guest: session.guest };
  }

  revoke(sessionId: string, reason: RevokedReason): Promise<void> {
    return this.repository.revokeSession(sessionId, reason, new Date());
  }

  revokeAll(userId: string): Promise<void> {
    return this.repository.revokeUserSessions(userId, 'logout_all', new Date());
  }

  private async pair(
    userId: string,
    sessionId: string,
    sessionEnds: Date,
  ): Promise<TokenPair> {
    const refreshToken = newRefreshToken();
    const expiresAt = new Date(
      Math.min(Date.now() + REFRESH_IDLE_MS, sessionEnds.getTime()),
    );
    await this.repository.createRefreshToken(
      sessionId,
      hashToken(refreshToken),
      expiresAt,
    );
    return {
      accessToken: await signAccessToken(
        { sub: userId, sid: sessionId },
        this.secret,
        ACCESS_TOKEN_TTL_SECONDS,
      ),
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshToken,
    };
  }
}

const live = (session: SessionRow) =>
  !session.revokedAt && session.expiresAt.getTime() > Date.now();
