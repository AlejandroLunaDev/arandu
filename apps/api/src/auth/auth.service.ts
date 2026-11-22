import type { Me, TokenPair } from '@arandu/contracts';
import { Injectable } from '@nestjs/common';
import { invalidIdentityToken, unauthorized, userBanned } from './auth.errors.js';
import { AuthRepository } from './auth.repository.js';
import { type Caller, type Client, SessionsService } from './sessions.service.js';
import { SupabaseIdentity } from './supabase-identity.js';

/**
 * Users and their sign-in. A guest is a user with no Google identity; each user has at most one, matched by Google's
 * subject id. Nothing is ever merged: a Google that already has a user loads that user, as games do.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly sessions: SessionsService,
    private readonly supabase: SupabaseIdentity,
  ) {}

  async guest(client: Client): Promise<TokenPair> {
    return this.sessions.open(await this.repository.createGuest(), client);
  }

  /**
   * `current` is the caller's session, if any. A guest signing in with a Google nobody has becomes that Google's user,
   * keeping its progress. A Google that already has a user loads it, and the guest left behind is deleted with its
   * progress. Always a new session: the current one ends.
   */
  async signIn(
    supabaseToken: string,
    current: Caller | null,
    client: Client,
  ): Promise<TokenPair> {
    const identity = await this.supabase.verify(supabaseToken);
    if (!identity) throw invalidIdentityToken();

    const owner = await this.repository.findUserByGoogle(identity.googleSub);
    if (owner?.bannedAt) throw userBanned();
    // shortcut: two simultaneous first sign-ins of one Google can make promote break the unique key (a 500 the
    // retry clears); a transaction with a row lock would close it if it ever shows up.
    const userId =
      !owner &&
      current?.guest &&
      (await this.repository.promote(current.userId, identity))
        ? current.userId
        : await this.repository.saveGoogleUser(identity);

    if (current?.guest && current.userId !== userId)
      await this.repository.deleteUser(current.userId);
    else if (current) await this.sessions.revoke(current.sessionId, 'switched');

    return this.sessions.open(userId, client);
  }

  async me(userId: string): Promise<Me> {
    const user = await this.repository.findUser(userId);
    if (!user) throw unauthorized();
    return {
      id: user.id,
      guest: user.googleSub === null,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
  }
}
