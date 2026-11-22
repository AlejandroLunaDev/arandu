import type {
  CreateSessionRequest,
  Me,
  RefreshSessionRequest,
  TokenPair,
} from '@arandu/contracts';
import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import type { AuthedRequest } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { Public } from './public.decorator.js';
import { type Client, SessionsService } from './sessions.service.js';
import { UserId } from './user-id.decorator.js';

// Trust boundary: a Supabase access token and one of ours are a few hundred bytes to a few KB.
const createSession = z
  .object({ supabaseToken: z.string().min(1).max(8000) })
  .strict();
const refreshSession = z
  .object({
    refreshToken: z.string().min(1).max(200),
    deadline: z.number().int().positive(),
  })
  .strict();

const client = (request: AuthedRequest): Client => ({
  userAgent: request.clientUserAgent?.slice(0, 500) ?? null,
  ip: request.clientIp?.slice(0, 100) ?? null,
});

/** Sign-in and sessions. Called only by the web's Next server, with the browser's IP and user agent forwarded. */
// Before sign-in the limits count by IP, and a whole class opening Arandu shares one: 20 a minute would lock it out.
@Throttle({
  burst: { limit: 60, ttl: 60_000 },
  daily: { limit: 1000, ttl: 86_400_000 },
})
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
  ) {}

  /** A guest: a user with no identity yet, and its session. */
  @Public()
  @Post('guest')
  @HttpCode(200)
  guest(@Req() request: AuthedRequest): Promise<TokenPair> {
    return this.auth.guest(client(request));
  }

  /** Google sign-in. With the current session's bearer, a guest is promoted or left for the account it signs into. */
  @Public()
  @Post('session')
  @HttpCode(200)
  async session(
    @Req() request: AuthedRequest,
    @Body({ schema: createSession }) body: CreateSessionRequest,
  ): Promise<TokenPair> {
    const authorization = request.headers.authorization;
    // An invalid bearer is a 401 that changes nothing: a plain sign-in would silently lose the guest's progress.
    const current =
      typeof authorization === 'string'
        ? await this.sessions.authenticate(authorization)
        : null;
    return this.auth.signIn(body.supabaseToken, current, client(request));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(
    @Body({ schema: refreshSession }) body: RefreshSessionRequest,
  ): Promise<TokenPair> {
    return this.sessions.rotate(body.refreshToken, body.deadline);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Req() request: AuthedRequest): Promise<void> {
    return this.sessions.revoke(request.caller!.sessionId, 'logout');
  }

  @Post('logout-all')
  @HttpCode(204)
  logoutAll(@UserId() userId: string): Promise<void> {
    return this.sessions.revokeAll(userId);
  }

  @Get('me')
  me(@UserId() userId: string): Promise<Me> {
    return this.auth.me(userId);
  }
}
