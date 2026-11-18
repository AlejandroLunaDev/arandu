import type {
  AranduMemory,
  AranduProfile,
  ChatMessage,
} from '@arandu/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { SQL, type Sql } from '../platform/database/database.module.js';

/** The memory's limit: Arandu's note on past sessions never grows past this. */
export const SUMMARY_MAX = 1500;

export type SessionKind = 'onboarding' | 'career';

// Every read is bounded, so one person with a long history never loads it all into the API's memory.
/** The sessions GET /arandu/memory lists, newest first. */
const SESSIONS_LISTED = 50;
/** The newest messages of unsummarized sessions the summary reads; older ones are folded in without being read. */
const MESSAGES_SUMMARIZED = 200;

/** Where Arandu's memory of each person lives: sessions, messages, the confirmed profile and the summary. */
@Injectable()
export class MemoryRepository {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  async read(userId: string): Promise<AranduMemory> {
    const [memory] = await this.sql<
      { profile: AranduProfile | null; summary: string }[]
    >`
      select profile, summary from public.arandu_memories where user_id = ${userId}`;
    const sessions = await this.sql<
      { kind: SessionKind; professionSlug: string | null; startedAt: Date }[]
    >`
      select kind, profession_slug as "professionSlug", started_at as "startedAt"
      from public.arandu_sessions where user_id = ${userId}
      order by started_at desc limit ${SESSIONS_LISTED}`;
    return {
      profile: memory?.profile ?? null,
      summary: memory?.summary ?? '',
      sessions: sessions.map((s) => ({
        ...s,
        startedAt: s.startedAt.toISOString(),
      })),
    };
  }

  async createSession(
    userId: string,
    kind: SessionKind,
    professionSlug: string | null = null,
  ): Promise<string> {
    const [{ id }] = await this.sql<{ id: string }[]>`
      insert into public.arandu_sessions (user_id, kind, profession_slug)
      values (${userId}, ${kind}, ${professionSlug}) returning id`;
    return id;
  }

  /** The session's last `limit` messages, oldest first; null when it is not this person's session of this kind and career. */
  async sessionMessages(
    userId: string,
    sessionId: string,
    kind: SessionKind,
    limit: number,
    professionSlug: string | null = null,
  ): Promise<ChatMessage[] | null> {
    const [session] = await this.sql`
      select 1 from public.arandu_sessions
      where id = ${sessionId} and user_id = ${userId} and kind = ${kind}
        and profession_slug is not distinct from ${professionSlug}`;
    if (!session) return null;
    return this.sql<ChatMessage[]>`
      select role, content from (
        select id, role, content from public.arandu_messages
        where session_id = ${sessionId} order by id desc limit ${limit}
      ) recent order by id`;
  }

  async addMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
    await this.sql`insert into public.arandu_messages ${this.sql(
      messages.map((m) => ({ session_id: sessionId, ...m })),
    )}`;
  }

  async saveProfile(userId: string, profile: AranduProfile): Promise<void> {
    await this.sql`
      insert into public.arandu_memories (user_id, profile) values (${userId}, ${this.sql.json(profile as never)})
      on conflict (user_id) do update set profile = excluded.profile, updated_at = now()`;
  }

  /** The person's sessions not yet folded into the summary, and their newest messages as one transcript. */
  async unsummarized(
    userId: string,
  ): Promise<{ sessionIds: string[]; transcript: string }> {
    const sessions = await this.sql<{ id: string }[]>`
      select id from public.arandu_sessions where user_id = ${userId} and summarized_at is null`;
    if (!sessions.length) return { sessionIds: [], transcript: '' };
    const rows = await this.sql<
      {
        id: string;
        kind: SessionKind;
        slug: string | null;
        role: string;
        content: string;
      }[]
    >`
      select * from (
        select s.id, s.kind, s.profession_slug as slug, m.role, m.content, s.started_at, m.id as message_id
        from public.arandu_sessions s join public.arandu_messages m on m.session_id = s.id
        where s.user_id = ${userId} and s.summarized_at is null
        order by s.started_at desc, m.id desc limit ${MESSAGES_SUMMARIZED}
      ) newest order by started_at, message_id`;
    const sessionIds = sessions.map((r) => r.id);
    const transcript = [...new Set(rows.map((r) => r.id))]
      .map((id) => {
        const lines = rows.filter((r) => r.id === id);
        const about =
          lines[0].kind === 'career' ? `career ${lines[0].slug}` : 'onboarding';
        return `Session (${about}):\n${lines.map((r) => `${r.role}: ${r.content}`).join('\n')}`;
      })
      .join('\n\n');
    return { sessionIds, transcript };
  }

  async saveSummary(
    userId: string,
    summary: string,
    sessionIds: string[],
  ): Promise<void> {
    await this.sql.begin(async (tx) => {
      await tx`
        insert into public.arandu_memories (user_id, summary) values (${userId}, ${summary.slice(0, SUMMARY_MAX)})
        on conflict (user_id) do update set summary = excluded.summary, updated_at = now()`;
      await tx`update public.arandu_sessions set summarized_at = now() where id in ${tx(sessionIds)}`;
    });
  }

  /** Forgets the person: their profile, summary, sessions and messages. Their account stays. */
  async forget(userId: string): Promise<void> {
    await this.sql.begin(async (tx) => {
      await tx`delete from public.arandu_sessions where user_id = ${userId}`;
      await tx`delete from public.arandu_memories where user_id = ${userId}`;
    });
  }
}
