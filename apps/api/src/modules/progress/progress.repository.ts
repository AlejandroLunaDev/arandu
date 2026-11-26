import type {
  BookClosing,
  BookReflectionRequest,
  Wallet,
} from '@arandu/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type { TransactionSql } from 'postgres';
import { PersonGoneError } from '../memory/memory.repository.js';
import { SQL, type Sql } from '../../core/database/database.module.js';
import {
  CONTINUE_PRICE,
  CURIOSITY_QUESTIONS,
  DAILY_PEIXINHOS,
  type Finish,
  LESSON_PRICE,
  nextMidnight,
  TIME_ZONE,
} from './progress.logic.js';
import { notEnoughCurrency, notEnoughPeixinhos } from './progress.errors.js';
import { one } from '../../core/database/one.js';

export { TIME_ZONE };

type Tx = Sql | TransactionSql;

/**
 * Everything that counts as studying, aliased by the caller: chapters finished in one pass and lessons (#123). The
 * patinhas and the days studied read this.
 */
export const studyRows = (sql: Tx) => sql`(
  select user_id, sabedoria, completed_at from public.chapter_results
  union all
  select user_id, sabedoria, completed_at from public.lesson_results)`;

/**
 * Everything that gave sabedoria, aliased by the caller: studying, and the caixas opened (#145), on the day they were
 * opened. League, season and totals read this, never chapter_results alone.
 */
export const sabedoriaRows = (sql: Tx) => sql`(
  select user_id, sabedoria, completed_at from public.chapter_results
  union all
  select user_id, sabedoria, completed_at from public.lesson_results
  union all
  select user_id, (contents ->> 'sabedoria')::int, opened_at from public.caixas
  where opened_at is not null and contents ? 'sabedoria')`;

/** The wallet columns every query returns, for toWallet. */
export const walletColumns = (sql: Tx) => sql`peixinhos, currency, marcadores`;

/**
 * Creates the wallet on first use with a day's peixinhos (not the column's older default), then gives the day's top-up,
 * once per São Paulo day: peixinhos below the daily amount go up to it, more is kept.
 */
export async function openWallet(tx: Tx, userId: string): Promise<void> {
  await tx`
    insert into public.wallets (user_id, peixinhos) values (${userId}, ${DAILY_PEIXINHOS}) on conflict do nothing`;
  await tx`
  update public.wallets set peixinhos = greatest(peixinhos, ${DAILY_PEIXINHOS}),
    peixinhos_on = (now() at time zone ${TIME_ZONE})::date, updated_at = now()
  where user_id = ${userId} and peixinhos_on is distinct from (now() at time zone ${TIME_ZONE})::date`;
}

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

/** A subject the person studied, as Arandu's chats see it. */
export interface Studied {
  name: string;
  /** Chapters finished, of the made ones people can open. */
  done: number;
  made: number;
  /** The chapter with the most mistakes; null when none had any. */
  stuck: string | null;
  feeling: BookReflectionRequest | null;
  suggestion: BookClosing['suggestion'] | null;
}

export interface WalletRow {
  peixinhos: number;
  currency: number;
  marcadores: number;
}

export function toWallet(row: WalletRow, now: Date): Wallet {
  return {
    peixinhos: row.peixinhos,
    dailyPeixinhos: DAILY_PEIXINHOS,
    nextRefillAt: nextMidnight(now).toISOString(),
    lessonPrice: LESSON_PRICE,
    currency: row.currency,
    continuePrice: CONTINUE_PRICE,
    marcadores: row.marcadores,
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

  /** The person's wallet row, created on first use, topped up for the day and locked for the rest of the transaction. */
  async lockWallet(tx: Tx, userId: string): Promise<WalletRow> {
    await openWallet(tx, userId);
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

  /**
   * Takes peixinhos (entering a lesson) or currency (going on after a lesson's last life). 409 `not_enough_peixinhos`
   * or `not_enough_currency` with too few, and nothing is taken.
   */
  pay(
    userId: string,
    what: 'peixinhos' | 'currency',
    amount: number,
  ): Promise<Wallet> {
    return asPerson(
      this.sql.begin(async (tx) => {
        const row = await this.lockWallet(tx, userId);
        if (row[what] < amount)
          throw what === 'peixinhos'
            ? notEnoughPeixinhos()
            : notEnoughCurrency();
        const updated = one(
          await tx<WalletRow[]>`
          update public.wallets set ${tx(what)} = ${tx(what)} - ${amount}, updated_at = now()
          where user_id = ${userId} returning ${walletColumns(tx)}`,
        );
        return toWallet(updated, new Date());
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
      from ${studyRows(this.sql)} s where user_id = ${userId} order by completed_at`;
  }

  /** The lessons done per chapter of a subject, for the path. */
  async lessonsDone(
    userId: string,
    disciplineId: number,
  ): Promise<Map<number, Set<number>>> {
    const rows = await this.sql<{ topic: number; lessons: number[] }[]>`
      select topic, array_agg(lesson::int) as lessons from public.lesson_results
      where user_id = ${userId} and discipline_id = ${disciplineId} group by topic`;
    return new Map(rows.map((r) => [r.topic, new Set(r.lessons)]));
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
    const [row] = await this.sql<
      (BookReflectionRequest & { closing: BookClosing | null })[]
    >`
      select chips, text, closing from public.book_reflections where user_id = ${userId} and discipline_id = ${disciplineId}`;
    return {
      chapters,
      questions,
      feeling: row ? { chips: row.chips, text: row.text } : null,
      closing: row?.closing ?? null,
    };
  }

  /** Keeps Arandu's first closing of a book: one written at the same time by a second read is dropped. */
  async saveClosing(
    userId: string,
    disciplineId: number,
    closing: BookClosing,
  ): Promise<void> {
    await this.sql`
      update public.book_reflections set closing = ${this.sql.json(closing as never)}
      where user_id = ${userId} and discipline_id = ${disciplineId} and closing is null`;
  }

  /** The subjects the person studied: how far they got, where it was hardest and how it felt, for Arandu's chats. */
  async studied(userId: string): Promise<Studied[]> {
    return this.sql<Studied[]>`
      select d.name, ${madeChapters(this.sql)} as made,
        (select count(*)::int from public.chapter_results r
          where r.user_id = ${userId} and r.discipline_id = d.id) as done,
        (select d.topics[r.topic + 1] from public.chapter_results r
          where r.user_id = ${userId} and r.discipline_id = d.id and r.mistakes > 0
          order by r.mistakes desc, r.topic limit 1) as stuck,
        case when b.user_id is null then null
          else jsonb_build_object('chips', b.chips, 'text', b.text) end as feeling,
        b.closing ->> 'suggestion' as suggestion
      from public.disciplines d
      left join public.book_reflections b on b.user_id = ${userId} and b.discipline_id = d.id
      where d.id in (
        select discipline_id from public.chapter_results where user_id = ${userId}
        union select discipline_id from public.lesson_results where user_id = ${userId})
      order by d.name`;
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
