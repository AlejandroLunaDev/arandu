import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Env } from '../config/env.js';
import { unauthorized } from './auth.errors.js';
import { IS_PUBLIC, OPEN_TO_BROWSERS } from './public.decorator.js';
import { type Caller, SessionsService } from './sessions.service.js';
import { sameSecret } from './tokens.js';

export interface AuthedRequest {
  headers: Record<string, string | string[] | undefined>;
  /** The browser's IP, as the web server forwards it: the rate limits count by it before there is a user. */
  clientIp?: string;
  clientUserAgent?: string;
  userId?: string;
  caller?: Caller;
}

const header = (request: AuthedRequest, name: string) => {
  const value = request.headers[name];
  return typeof value === 'string' && value ? value : undefined;
};

/**
 * Global guard. Browsers never call the API (the web is a backend-for-frontend), so every route but the health check
 * and the landing's books needs the web server's internal secret; then every route but sign-in needs a live session,
 * whose user is not banned. Supabase is not involved after sign-in.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly secret: string;

  constructor(
    config: ConfigService<Env, true>,
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
  ) {
    this.secret = config.get('INTERNAL_API_SECRET', { infer: true });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(OPEN_TO_BROWSERS, targets))
      return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (!sameSecret(request.headers['x-internal-secret'], this.secret))
      throw unauthorized();
    request.clientIp = header(request, 'x-client-ip');
    request.clientUserAgent = header(request, 'x-client-user-agent');
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets))
      return true;

    request.caller = await this.sessions.authenticate(
      header(request, 'authorization'),
    );
    request.userId = request.caller.userId;
    return true;
  }
}
