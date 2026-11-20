import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from '../config/env.js';
import { IS_PUBLIC } from './public.decorator.js';

export interface AuthedRequest {
  headers: { authorization?: string };
  userId?: string;
}

/**
 * Global guard: lets a request in only with a valid Supabase access token, of a signed-in or an anonymous person.
 * Supabase signs with asymmetric keys (ES256), checked against the project's public JWKS, which jose caches.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly issuer: string;
  private readonly keys: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    config: ConfigService<Env, true>,
    private readonly reflector: Reflector,
  ) {
    this.issuer = `${config.get('SUPABASE_URL', { infer: true })}/auth/v1`;
    this.keys = createRemoteJWKSet(
      new URL(`${this.issuer}/.well-known/jwks.json`),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token)
      throw new UnauthorizedException('Sign in to talk with Arandu');
    try {
      const { payload } = await jwtVerify(token, this.keys, {
        issuer: this.issuer,
        audience: 'authenticated',
        // A few seconds of drift between this server's clock and Supabase's must not reject a fresh token.
        clockTolerance: 5,
      });
      // Anonymous users (signed in before login, O01-O21) get every endpoint: the login wall lives in the UI only.
      if (!payload.sub) throw new Error();
      request.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
