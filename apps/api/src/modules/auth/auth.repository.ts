import { Inject, Injectable } from '@nestjs/common';
import { SQL, type Sql } from '../../core/database/database.module.js';

/** What Google says about the person, through Supabase. */
export interface GoogleIdentity {
  googleSub: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface UserRow {
  id: string;
  googleSub: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  bannedAt: Date | null;
}

/** A session with what every request needs about its user. */
export interface SessionRow {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  guest: boolean;
  bannedAt: Date | null;
}

export interface RefreshTokenRow {
  id: string;
  sessionId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export type RevokedReason =
  | 'logout'
  | 'logout_all'
  | 'reuse_detected'
  | 'switched';

/** Users, their sessions and the sessions' refresh tokens (the API owns them; Supabase only proves identities). */
@Injectable()
export class AuthRepository {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  async createGuest(): Promise<string> {
    const [row] = await this.sql<{ id: string }[]>`
      insert into public.users default values returning id`;
    return row.id;
  }

  async findUser(id: string): Promise<UserRow | null> {
    const [row] = await this.sql<UserRow[]>`
      select id, google_sub as "googleSub", email, name, avatar_url as "avatarUrl", banned_at as "bannedAt"
      from public.users where id = ${id}`;
    return row ?? null;
  }

  async findUserByGoogle(googleSub: string): Promise<UserRow | null> {
    const [row] = await this.sql<UserRow[]>`
      select id, google_sub as "googleSub", email, name, avatar_url as "avatarUrl", banned_at as "bannedAt"
      from public.users where google_sub = ${googleSub}`;
    return row ?? null;
  }

  /** Gives a guest its Google identity; false when the user is no longer a guest. */
  async promote(userId: string, identity: GoogleIdentity): Promise<boolean> {
    const rows = await this.sql`
      update public.users set google_sub = ${identity.googleSub}, email = ${identity.email},
        name = ${identity.name}, avatar_url = ${identity.avatarUrl}
      where id = ${userId} and google_sub is null returning id`;
    return rows.length > 0;
  }

  /** The user of this Google identity, created on its first sign-in; its profile follows Google's. */
  async saveGoogleUser(identity: GoogleIdentity): Promise<string> {
    const [row] = await this.sql<{ id: string }[]>`
      insert into public.users (google_sub, email, name, avatar_url)
      values (${identity.googleSub}, ${identity.email}, ${identity.name}, ${identity.avatarUrl})
      on conflict (google_sub) do update
        set email = excluded.email, name = excluded.name, avatar_url = excluded.avatar_url
      returning id`;
    return row.id;
  }

  /** Every table holding the person's data cascades from users. Only while still a guest: a parallel sign-in may have
   * just promoted it into a real account. */
  async deleteGuest(id: string): Promise<void> {
    await this.sql`delete from public.users where id = ${id} and google_sub is null`;
  }

  /** Ended sessions are never read again; this keeps them from piling up per user. */
  async createSession(input: {
    userId: string;
    userAgent: string | null;
    ip: string | null;
    expiresAt: Date;
  }): Promise<string> {
    await this.sql`
      delete from public.sessions
      where user_id = ${input.userId} and (revoked_at is not null or expires_at < now())`;
    const [row] = await this.sql<{ id: string }[]>`
      insert into public.sessions (user_id, user_agent, ip, expires_at)
      values (${input.userId}, ${input.userAgent}, ${input.ip}, ${input.expiresAt})
      returning id`;
    return row.id;
  }

  async findSession(id: string): Promise<SessionRow | null> {
    const [row] = await this.sql<SessionRow[]>`
      select s.id, s.user_id as "userId", s.expires_at as "expiresAt", s.revoked_at as "revokedAt",
        u.google_sub is null as guest, u.banned_at as "bannedAt"
      from public.sessions s join public.users u on u.id = s.user_id
      where s.id = ${id}`;
    return row ?? null;
  }

  /** On refresh: the session and its user were seen (a guest unseen for 30 days is deleted). */
  async touch(session: SessionRow, now: Date): Promise<void> {
    await this.sql`update public.sessions set last_seen_at = ${now} where id = ${session.id}`;
    await this.sql`update public.users set last_seen_at = ${now} where id = ${session.userId}`;
  }

  async revokeSession(
    id: string,
    reason: RevokedReason,
    now: Date,
  ): Promise<void> {
    await this.sql`
      update public.sessions set revoked_at = ${now}, revoked_reason = ${reason}
      where id = ${id} and revoked_at is null`;
  }

  async revokeUserSessions(
    userId: string,
    reason: RevokedReason,
    now: Date,
  ): Promise<void> {
    await this.sql`
      update public.sessions set revoked_at = ${now}, revoked_reason = ${reason}
      where user_id = ${userId} and revoked_at is null`;
  }

  async createRefreshToken(
    sessionId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.sql`
      insert into public.session_refresh_tokens (session_id, token_hash, expires_at)
      values (${sessionId}, ${tokenHash}, ${expiresAt})`;
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | null> {
    const [row] = await this.sql<RefreshTokenRow[]>`
      select id::text, session_id as "sessionId", expires_at as "expiresAt", revoked_at as "revokedAt"
      from public.session_refresh_tokens where token_hash = ${tokenHash}`;
    return row ?? null;
  }

  async revokeRefreshToken(id: string, now: Date): Promise<void> {
    await this.sql`
      update public.session_refresh_tokens set revoked_at = ${now}
      where id = ${id} and revoked_at is null`;
  }
}
