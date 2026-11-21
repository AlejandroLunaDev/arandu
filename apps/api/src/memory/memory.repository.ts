import type {
  AranduFact,
  AranduMemory,
  AranduProfile,
  ChatMessage,
  Conversations,
} from '@arandu/contracts';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SQL, type Sql } from '../platform/database/database.module.js';

/** The memory's limit: Arandu's note on past sessions never grows past this. */
export const SUMMARY_MAX = 1500;

export type SessionKind = 'onboarding' | 'career';

// Every read is bounded, so one person with a long history never loads it all into the API's memory.
/** The sessions GET /arandu/memory lists, newest first. */
const SESSIONS_LISTED = 50;
/** S2 lists this many of the newest conversations, each with at most its newest CONVERSATION_MESSAGES messages. */
const CONVERSATIONS_LISTED = 50;
const CONVERSATION_MESSAGES = 100;
/** The newest messages of unsummarized sessions the summary reads; older ones are folded in without being read. */
const MESSAGES_SUMMARIZED = 200;

/** The person's account was deleted while their access token was still valid: they must sign in again. */
export class PersonGoneError extends UnauthorizedException {
  constructor() {
    super('This account no longer exists');
  }
}

// The foreign keys to auth.users: a write that breaks one is for a deleted account.
const USER_KEYS = new Set([
  'arandu_memories_user_id_fkey',
  'arandu_sessions_user_id_fkey',
  'arandu_facts_user_id_fkey',
]);

export type FactSource = AranduFact['source'];
/** Card questions folded into the facts at a time. */
const QUESTIONS_SUMMARIZED = 50;

async function asPerson<T>(write: Promise<T>): Promise<T> {
  try {
    return await write;
  } catch (error) {
    const { code, constraint_name } = error as {
      code?: string;
      constraint_name?: string;
    };
    if (code === '23503' && USER_KEYS.has(constraint_name ?? ''))
      throw new PersonGoneError();
    throw error;
  }
}

/** Where Arandu's memory of each person lives: sessions, messages, the confirmed profile and the summary. */
@Injectable()
export class MemoryRepository {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  /** S2: the sessions with messages and the card questions, as one list, newest first. */
  async conversations(userId: string): Promise<Conversations> {
    const sessions = await this.sql<
      {
        kind: SessionKind;
        professionSlug: string | null;
        startedAt: Date;
        messages: Conversations['conversations'][number]['messages'];
      }[]
    >`
      select s.kind, s.profession_slug as "professionSlug", s.started_at as "startedAt",
        (select json_agg(json_build_object('role', m.role, 'text', m.content) order by m.id)
          from (select id, role, content from public.arandu_messages where session_id = s.id
            order by id desc limit ${CONVERSATION_MESSAGES}) m) as messages
      from public.arandu_sessions s
      where s.user_id = ${userId} and exists (select 1 from public.arandu_messages m where m.session_id = s.id)
      order by s.started_at desc limit ${CONVERSATIONS_LISTED}`;
    const questions = await this.sql<
      {
        disciplineId: number;
        topic: number;
        question: string;
        answer: string;
        createdAt: Date;
      }[]
    >`
      select discipline_id::int as "disciplineId", topic, question, answer, created_at as "createdAt"
      from public.stop_questions where user_id = ${userId}
      order by created_at desc limit ${CONVERSATIONS_LISTED}`;
    const conversations: Conversations['conversations'] = [
      ...sessions.map((s) => ({
        kind: s.kind,
        startedAt: s.startedAt.toISOString(),
        professionSlug: s.professionSlug,
        stop: null,
        messages: s.messages,
      })),
      ...questions.map((q) => ({
        kind: 'card' as const,
        startedAt: q.createdAt.toISOString(),
        professionSlug: null,
        stop: { disciplineId: q.disciplineId, topic: q.topic },
        messages: [
          { role: 'user' as const, text: q.question },
          { role: 'assistant' as const, text: q.answer },
        ],
      })),
    ];
    return {
      conversations: conversations
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, CONVERSATIONS_LISTED),
    };
  }

  async read(userId: string): Promise<AranduMemory> {
    const [memory] = await this.sql<{ profile: AranduProfile | null }[]>`
      select profile from public.arandu_memories where user_id = ${userId}`;
    const facts = await this.facts(userId);
    const sessions = await this.sql<
      { kind: SessionKind; professionSlug: string | null; startedAt: Date }[]
    >`
      select kind, profession_slug as "professionSlug", started_at as "startedAt"
      from public.arandu_sessions where user_id = ${userId}
      order by started_at desc limit ${SESSIONS_LISTED}`;
    return {
      profile: memory?.profile ?? null,
      summary: facts.map((f) => f.text).join('\n'),
      facts,
      sessions: sessions.map((s) => ({
        ...s,
        startedAt: s.startedAt.toISOString(),
      })),
    };
  }

  /** What Arandu remembers, oldest first. */
  async facts(userId: string): Promise<AranduFact[]> {
    const rows = await this.sql<
      { id: number; text: string; source: FactSource; created_at: Date }[]
    >`
      select id::int, text, source, created_at from public.arandu_facts where user_id = ${userId} order by id`;
    return rows.map((r) => ({
      id: r.id,
      text: r.text,
      source: r.source,
      createdAt: r.created_at.toISOString(),
    }));
  }

  /** Deletes one fact; false when it is not this person's. */
  async deleteFact(userId: string, id: number): Promise<boolean> {
    const rows = await this
      .sql`delete from public.arandu_facts where id = ${id} and user_id = ${userId} returning 1`;
    return rows.length > 0;
  }

  async createSession(
    userId: string,
    kind: SessionKind,
    professionSlug: string | null = null,
  ): Promise<string> {
    const [{ id }] = await asPerson(this.sql<{ id: string }[]>`
      insert into public.arandu_sessions (user_id, kind, profession_slug)
      values (${userId}, ${kind}, ${professionSlug}) returning id`);
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
    await asPerson(this.sql`
      insert into public.arandu_memories (user_id, profile) values (${userId}, ${this.sql.json(profile as never)})
      on conflict (user_id) do update set profile = excluded.profile, updated_at = now()`);
  }

  /** The person's sessions not yet folded into the summary, and their newest messages as one transcript. */
  async unsummarized(userId: string): Promise<{
    sessionIds: string[];
    questionIds: number[];
    transcript: string;
  }> {
    const sessions = await this.sql<{ id: string }[]>`
      select id from public.arandu_sessions where user_id = ${userId} and summarized_at is null`;
    const questions = await this.sql<
      { id: number; topic_text: string; question: string }[]
    >`
      select q.id::int, coalesce(d.topics[q.topic + 1], d.name) as topic_text, q.question
      from public.stop_questions q join public.disciplines d on d.id = q.discipline_id
      where q.user_id = ${userId} and q.summarized_at is null
      order by q.id desc limit ${QUESTIONS_SUMMARIZED}`;
    const asked = questions.length
      ? `\n\nQuestions on stop cards (source stop):\n${questions
          .map((q) => `- (${q.topic_text}) ${q.question}`)
          .join('\n')}`
      : '';
    const questionIds = questions.map((q) => q.id);
    if (!sessions.length)
      return { sessionIds: [], questionIds, transcript: asked.trim() };
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
          lines[0].kind === 'career'
            ? `source conversation, career ${lines[0].slug}`
            : 'source onboarding';
        return `Session (${about}):\n${lines.map((r) => `${r.role}: ${r.content}`).join('\n')}`;
      })
      .join('\n\n');
    return { sessionIds, questionIds, transcript: transcript + asked };
  }

  /**
   * Replaces the person's facts with the new list and marks what it folded in. The list was written from `readIds`:
   * when the person deleted a fact or forgot everything meanwhile, nothing is saved (false), so nothing comes back;
   * the sessions stay unfolded for the next time.
   */
  async saveFacts(
    userId: string,
    readIds: number[],
    facts: { text: string; source: FactSource }[],
    sessionIds: string[],
    questionIds: number[],
  ): Promise<boolean> {
    return asPerson(
      this.sql.begin(async (tx) => {
        const now = await tx<{ id: number; text: string }[]>`
          select id::int, text from public.arandu_facts where user_id = ${userId} order by id for update`;
        // Still there and unfolded: forgetting deletes the sessions and marks the questions folded.
        const sessions = sessionIds.length
          ? (
              await tx`
                select 1 from public.arandu_sessions
                where user_id = ${userId} and summarized_at is null and id in ${tx(sessionIds)} for update`
            ).length
          : 0;
        const questions = questionIds.length
          ? (
              await tx`
                select 1 from public.stop_questions
                where user_id = ${userId} and summarized_at is null and id in ${tx(questionIds)} for update`
            ).length
          : 0;
        if (
          now.map((f) => f.id).join() !== readIds.join() ||
          sessions !== sessionIds.length ||
          questions !== questionIds.length
        )
          return false;
        // Facts the new list keeps word for word keep their id and date.
        const texts = facts.map((f) => f.text.slice(0, 300));
        const gone = now
          .filter((f) => !texts.includes(f.text))
          .map((f) => f.id);
        if (gone.length)
          await tx`delete from public.arandu_facts where id in ${tx(gone)}`;
        const kept = new Set(now.map((f) => f.text));
        const added = facts.filter((f) => !kept.has(f.text.slice(0, 300)));
        if (added.length)
          await tx`insert into public.arandu_facts ${tx(
            added.map((f) => ({
              user_id: userId,
              text: f.text.slice(0, 300),
              source: f.source,
            })),
          )}`;
        if (sessionIds.length)
          await tx`update public.arandu_sessions set summarized_at = now() where id in ${tx(sessionIds)}`;
        if (questionIds.length)
          await tx`update public.stop_questions set summarized_at = now() where id in ${tx(questionIds)}`;
        return true;
      }),
    );
  }

  /** Forgets the person: their profile, facts, sessions and messages. Their account stays. */
  async forget(userId: string): Promise<void> {
    await this.sql.begin(async (tx) => {
      // Facts, then sessions, then questions: the order saveFacts locks them in, so the two never deadlock.
      await tx`delete from public.arandu_facts where user_id = ${userId}`;
      await tx`delete from public.arandu_sessions where user_id = ${userId}`;
      await tx`delete from public.arandu_memories where user_id = ${userId}`;
      // Card questions already in the facts would come back on the next fold: keep them, but never fold them again.
      await tx`update public.stop_questions set summarized_at = coalesce(summarized_at, now()) where user_id = ${userId}`;
    });
  }
}
