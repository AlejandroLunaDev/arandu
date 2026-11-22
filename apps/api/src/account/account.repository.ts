import { Inject, Injectable } from '@nestjs/common';
import { SQL, type Sql } from '../platform/database/database.module.js';

/** Every table that holds a person's data, keyed by user_id. A new one must be added here to be exported. */
const PERSON_TABLES = [
  'journeys',
  'arandu_memories',
  'arandu_facts',
  'arandu_sessions',
  'stop_results',
  'stop_questions',
  'stop_rereads',
  'book_reflections',
  'wallets',
  'players',
  'owned_items',
  'caixas',
  'season_claims',
] as const;

/** The person's own account: their data to take with them, and deleting it all (LGPD, K5). */
@Injectable()
export class AccountRepository {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  async export(userId: string): Promise<Record<string, readonly unknown[]>> {
    const data: Record<string, readonly unknown[]> = {};
    for (const table of PERSON_TABLES)
      data[table] = await this.sql`
        select * from ${this.sql(table)} where user_id = ${userId}`;
    data.arandu_messages = await this.sql`
      select m.* from public.arandu_messages m join public.arandu_sessions s on s.id = m.session_id
      where s.user_id = ${userId} order by m.id`;
    data.users = await this.sql`
      select id, email, name, avatar_url, created_at, last_seen_at from public.users where id = ${userId}`;
    data.sessions = await this.sql`
      select id, user_agent, ip, created_at, last_seen_at, expires_at, revoked_at
      from public.sessions where user_id = ${userId} order by created_at`;
    return data;
  }

  /**
   * Deletes the user, from which every table above and the sessions cascade, and the Supabase Auth user of its Google
   * identity, so nothing about the person is left behind.
   */
  async delete(userId: string): Promise<void> {
    await this.sql.begin(async (tx) => {
      await tx`
        delete from auth.users where id in (
          select i.user_id from auth.identities i join public.users u on u.google_sub = i.provider_id
          where u.id = ${userId} and i.provider = 'google')`;
      await tx`delete from public.users where id = ${userId}`;
    });
  }
}
