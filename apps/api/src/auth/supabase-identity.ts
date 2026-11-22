import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import type { GoogleIdentity } from './auth.repository.js';

interface SupabaseUser {
  identities?: { provider?: unknown; identity_data?: Record<string, unknown> }[];
}

/**
 * Supabase proves who the person is at sign-in and plays no part in the session afterwards. Only the Google identity
 * counts, read from `identities` (written by Supabase from Google's token): never `user_metadata`, which the person can
 * edit, and never the email, which would hand an account to whoever shows the same address.
 */
@Injectable()
export class SupabaseIdentity {
  private readonly url: string;
  private readonly key: string;

  constructor(config: ConfigService<Env, true>) {
    this.url = `${config.get('SUPABASE_URL', { infer: true })}/auth/v1/user`;
    this.key = config.get('SUPABASE_PUBLISHABLE_KEY', { infer: true });
  }

  /** Null when Supabase refuses the token or it carries no Google identity. */
  async verify(token: string): Promise<GoogleIdentity | null> {
    const response = await fetch(this.url, {
      headers: { apikey: this.key, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (response && response.status >= 400 && response.status < 500)
      return null;
    if (!response?.ok)
      throw new ServiceUnavailableException(
        'Sign-in is unavailable right now, try again in a moment',
      );

    const user = (await response.json()) as SupabaseUser;
    const data = user.identities?.find(
      (identity) => identity.provider === 'google',
    )?.identity_data;
    if (!data || typeof data.sub !== 'string' || !data.sub) return null;
    return {
      googleSub: data.sub,
      email: text(data.email),
      name: text(data.full_name) ?? text(data.name),
      avatarUrl: text(data.avatar_url) ?? text(data.picture),
    };
  }
}

const text = (value: unknown) =>
  typeof value === 'string' && value ? value : null;
