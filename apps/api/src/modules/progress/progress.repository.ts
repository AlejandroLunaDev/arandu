import type { BookReflectionRequest, Wallet } from '@arandu/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type { TransactionSql } from 'postgres';
import { PersonGoneError } from '../memory/memory.repository.js';
import { SQL, type Sql } from '../../core/database/database.module.js';
import {
  CURIOSITY_QUESTIONS,
  type Finish,
  MAX_NOVELOS,
  nextMidnight,
  noveloPrice,
  refill,
  TIME_ZONE,
} from './progress.logic.js';
import { noNovelosLeft, novelosLeft, rereadUsed } from './progress.errors.js';
import { one } from '../../core/database/one.js';

export { TIME_ZONE };

type Tx = Sql | TransactionSql;

/**
 * Everything that gave sabedoria or counts as studying, aliased by the caller: chapters finished in one pass and lessons
 * (#123). League, season, totals and patinhas read this, never chapter_results alone.
 */
export const sabedoriaRows = (sql: Tx) => sql`(
  select user_id, sabedoria, completed_at from public.chapter_results
  union all
  select user_id, sabedoria, completed_at from public.lesson_results)`;

/** The wallet columns every query returns, for toWallet. */
export const walletColumns = (sql: Tx) =>
  sql`novelos, novelos_at, peixinhos, marcadores, novelos_bought, novelos_bought_on::text as novelos_bought_on`;

/**
 * SQL for how many leading topics of the discipline aliased `d` have a stored chapter for the same topic text: the chapters a
 * book offers (the paths list the same run), so no screen points at a chapter that would be generated live.
 */
export const madeChapters = (sql: Tx) => sql`
  coalesce((
    select min(g.t)::int from generate_series(0, cardinality(coalesce(d.topics, '{}')) - 1) g(t)
    where not exists (
      select 1 from public.chapter_contents s
      where s.discipline_id = d.id and s.topic = g.t and s.topic_text = d.topics[g.t + 1])
  ), cardinality(coalesce(d.topics, '{}')))`;

export interface WalletRow {
  novelos: number;
  novelos_at: Date;
  peixinhos: number;
  marcadores: number;
  /** Novelos bought on novelos_bought_on, the São Paulo day of the last purchase. */
  novelos_bought: number;
  novelos_bought_on: string | null;
}

export function toWallet(row: WalletRow, now: Date): Wallet {
  const { novelos } = refill(row.novelos, row.novelos_at, now);
  return {
    novelos,
    maxNovelos: MAX_NOVELOS,
    nextNoveloAt:
      novelos < MAX_NOVELOS ? nextMidnight(now).toISOString() : null,
    peixinhos: row.peixinhos,
    marcadores: row.marcadores,
    refillPrice: noveloPrice(row.novelos_bought, row.novelos_bought_on, now),
  };
}

export async function asPerson<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    const { code, constraint_name } = error as {
      code?: string;
      constraint_name?: string;
    };
    if (code === '23503' && constraint_name?.endsWith('_user_id_fkey'))
      throw new PersonGoneError();
    throw error;
  }
}

/** Each person's wallet and the chapters they finished: the economy and progress of the daily loop. */
@Injectable()
export class ProgressRepository {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  /** The person's wallet row, created full on first use and locked for the rest of the transaction. */
  async lockWallet(tx: Tx, userId: string): Promise<WalletRow> {
    await tx`insert into public.wallets (user_id) values (${userId}) on conflict do nothing`;
    const row = one(
      await tx<WalletRow[]>`
      select ${walletColumns(tx)} from public.wallets where user_id = ${userId} for update`,
    );
    return row;
  }

  wallet(userId: string): Promise<Wallet> {
    return asPerson(
      this.sql.begin(async (tx) =>
        toWallet(await this.lockWallet(tx, userId), new Date()),
      ),
    );
  }

  /** A mistake. Free until the person's first chapter is finished; 409 at 0 novelos. */
  spend(userId: string): Promise<Wallet> {
    return asPerson(
      this.sql.begin(async (tx) => {
        const row = await this.lockWallet(tx, userId);
        const now = new Date();
        const { finished } = one(
          await tx<{ finished: boolean }[]>`
          select exists (select 1 from public.chapter_results where user_id = ${userId}) as finished`,
        );
        if (!finished) return toWallet(row, now);
        const { novelos } = refill(row.novelos, row.novelos_at, now);
        if (novelos === 0) throw noNovelosLeft();
        // novelos_at holds the day the count belongs to.
        const updated = one(
          await tx<WalletRow[]>`
          update public.wallets set novelos = ${novelos - 1}, novelos_at = ${now}, updated_at = now()
          where user_id = ${userId} returning ${walletColumns(tx)}`,
        );
        return toWallet(updated, now);
      }),
    );
  }

  /** Re-reading a chapter's cards at 0 novelos gives one back, once per chapter; 409 otherwise. */
  reread(userId: string, disciplineId: number, topic: number): Promise<Wallet> {
    return asPerson(
      this.sql.begin(async (tx) => {
        const row = await this.lockWallet(tx, userId);
        const now = new Date();
        const { novelos, at } = refill(row.novelos, row.novelos_at, now);
        if (novelos > 0) throw novelosLeft();
        const inserted = await tx`
          insert into public.chapter_rereads (user_id, discipline_id, topic) values (${userId}, ${disciplineId}, ${topic})
          on conflict do nothing returning 1`;
        if (!inserted.length) throw rereadUsed();
        const updated = one(
          await tx<WalletRow[]>`
          update public.wallets set novelos = 1, novelos_at = ${at}, updated_at = now()
          where user_id = ${userId} returning ${walletColumns(tx)}`,
        );
        return toWallet(updated, now);
      }),
    );
  }

  /** Every chapter the person finished, oldest first. */
  // shortcut: reads all of a person's finishes (a demo has tens); keep a running summary if people reach thousands.
  finishes(userId: string): Promise<Finish[]> {
    return this.sql<Finish[]>`
      select discipline_id::int as "disciplineId", topic, mistakes, relampago_mistakes as "relampagoMistakes",
        completed_at as "completedAt",
        to_char(completed_at at time zone ${TIME_ZONE}, 'YYYY-MM-DD') as day
      from public.chapter_results where user_id = ${userId} order by completed_at`;
  }

  /** When the person asked their first questions about the cards, oldest first: enough for "Curiosidade de gato". */
  async questionTimes(userId: string): Promise<Date[]> {
    const rows = await this.sql<{ created_at: Date }[]>`
      select created_at from public.chapter_questions where user_id = ${userId}
      order by created_at limit ${CURIOSITY_QUESTIONS}`;
    return rows.map((r) => r.created_at);
  }

  async topicCounts(disciplineIds: number[]): Promise<Map<number, number>> {
    if (!disciplineIds.length) return new Map();
    const rows = await this.sql<{ id: number; n: number }[]>`
      select d.id::int, ${madeChapters(this.sql)} as n from public.disciplines d where d.id in ${this.sql(disciplineIds)}`;
    return new Map(rows.map((r) => [r.id, r.n]));
  }

  async sabedoria(userId: string): Promise<{ total: number; week: number }> {
    const row = one(
      await this.sql<{ total: number; week: number }[]>`
      select coalesce(sum(sabedoria), 0)::int as total,
        coalesce(sum(sabedoria) filter (
          where completed_at at time zone ${TIME_ZONE} >= date_trunc('week', now() at time zone ${TIME_ZONE})
        ), 0)::int as week
      from ${sabedoriaRows(this.sql)} s where user_id = ${userId}`,
    );
    return row;
  }

  /** When the person studied (a chapter or a lesson finished), oldest first: the patinhas. */
  studyTimes(userId: string): Promise<{ completedAt: Date; day: string }[]> {
    return this.sql<{ completedAt: Date; day: string }[]>`
      select completed_at as "completedAt",
        to_char(completed_at at time zone ${TIME_ZONE}, 'YYYY-MM-DD') as day
      from ${sabedoriaRows(this.sql)} s where user_id = ${userId} order by completed_at`;
  }

  /** Lessons done per chapter of a subject, for the circles. */
  async lessonsDone(
    userId: string,
    disciplineId: number,
  ): Promise<Map<number, number>> {
    const rows = await this.sql<{ topic: number; n: number }[]>`
      select topic, count(*)::int as n from public.lesson_results
      where user_id = ${userId} and discipline_id = ${disciplineId} group by topic`;
    return new Map(rows.map((r) => [r.topic, r.n]));
  }

  /** Today's São Paulo day and the Monday of its week. */
  async calendar(): Promise<{ today: string; monday: string }> {
    const row = one(
      await this.sql<{ today: string; monday: string }[]>`
      select to_char(now() at time zone ${TIME_ZONE}, 'YYYY-MM-DD') as today,
        to_char(date_trunc('week', now() at time zone ${TIME_ZONE}), 'YYYY-MM-DD') as monday`,
    );
    return row;
  }

  /** The person's weekly goal and the subject their path is on. */
  async journey(userId: string): Promise<{
    weeklyGoal: 3 | 5 | 7 | null;
    discipline: { id: number; name: string; topics: string[] } | null;
  }> {
    const [row] = await this.sql<
      {
        weekly_goal: 3 | 5 | 7 | null;
        id: number | null;
        name: string | null;
        topics: string[] | null;
      }[]
    >`
      select j.weekly_goal, d.id::int, d.name, coalesce(d.topics[1:${madeChapters(this.sql)}], '{}') as topics
      from public.journeys j left join public.disciplines d on d.id = j.discipline_id
      where j.user_id = ${userId}`;
    return {
      weeklyGoal: row?.weekly_goal ?? null,
      discipline:
        row?.id != null
          ? { id: row.id, name: row.name!, topics: row.topics! }
          : null,
    };
  }

  /** S4: each finished chapter of a book with its mistakes and how many exercises it has, the questions and the feeling. */
  async reflection(userId: string, disciplineId: number) {
    const chapters = await this.sql<
      { topic: number; mistakes: number; items: number }[]
    >`
      select r.topic, r.mistakes, coalesce(jsonb_array_length(c.content -> 'exercises'), 0)::int as items
      from public.chapter_results r
      left join public.chapter_contents c on c.discipline_id = r.discipline_id and c.topic = r.topic
      where r.user_id = ${userId} and r.discipline_id = ${disciplineId} order by r.topic`;
    const { questions } = one(
      await this.sql<{ questions: number }[]>`
      select count(*)::int as questions from public.chapter_questions
      where user_id = ${userId} and discipline_id = ${disciplineId}`,
    );
    const [feeling] = await this.sql<BookReflectionRequest[]>`
      select chips, text from public.book_reflections where user_id = ${userId} and discipline_id = ${disciplineId}`;
    return { chapters, questions, feeling: feeling ?? null };
  }

  async saveReflection(
    userId: string,
    disciplineId: number,
    { chips, text }: BookReflectionRequest,
  ): Promise<void> {
    await asPerson(this.sql`
      insert into public.book_reflections (user_id, discipline_id, chips, text)
      values (${userId}, ${disciplineId}, ${chips}, ${text})
      on conflict (user_id, discipline_id) do update
        set chips = excluded.chips, text = excluded.text, updated_at = now()`);
  }

  async discipline(
    id: number,
  ): Promise<{ id: number; name: string; topics: string[] } | null> {
    const [row] = await this.sql<
      { id: number; name: string; topics: string[] }[]
    >`
      select d.id::int, d.name, coalesce(d.topics[1:${madeChapters(this.sql)}], '{}') as topics
      from public.disciplines d where d.id = ${id}`;
    return row ?? null;
  }
}
