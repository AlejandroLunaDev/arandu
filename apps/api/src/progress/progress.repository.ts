import type { Wallet } from '@arandu/contracts';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { TransactionSql } from 'postgres';
import { PersonGoneError } from '../memory/memory.repository.js';
import { SQL, type Sql } from '../platform/database/database.module.js';
import {
  CURIOSITY_QUESTIONS,
  type Finish,
  MAX_NOVELOS,
  REFILL_MS,
  refill,
} from './progress.logic.js';

/** Days, patinhas and weeks are counted in Brazil's time. */
export const TIME_ZONE = 'America/Sao_Paulo';

type Tx = Sql | TransactionSql;

interface WalletRow {
  novelos: number;
  novelos_at: Date;
  peixinhos: number;
  marcadores: number;
}

function toWallet(row: WalletRow, now: Date): Wallet {
  const { novelos, at } = refill(row.novelos, row.novelos_at, now);
  return {
    novelos,
    maxNovelos: MAX_NOVELOS,
    nextNoveloAt:
      novelos < MAX_NOVELOS
        ? new Date(at.getTime() + REFILL_MS).toISOString()
        : null,
    peixinhos: row.peixinhos,
    marcadores: row.marcadores,
  };
}

async function asPerson<T>(work: Promise<T>): Promise<T> {
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

/** Each person's wallet and the stops they finished: the economy and progress of the daily loop. */
@Injectable()
export class ProgressRepository {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  /** The person's wallet row, created full on first use and locked for the rest of the transaction. */
  private async lockWallet(tx: Tx, userId: string): Promise<WalletRow> {
    await tx`insert into public.wallets (user_id) values (${userId}) on conflict do nothing`;
    const [row] = await tx<WalletRow[]>`
      select novelos, novelos_at, peixinhos, marcadores from public.wallets where user_id = ${userId} for update`;
    return row;
  }

  wallet(userId: string): Promise<Wallet> {
    return asPerson(
      this.sql.begin(async (tx) =>
        toWallet(await this.lockWallet(tx, userId), new Date()),
      ),
    );
  }

  /** A mistake. Free until the person's first stop is finished; 409 at 0 novelos. */
  spend(userId: string): Promise<Wallet> {
    return asPerson(
      this.sql.begin(async (tx) => {
        const row = await this.lockWallet(tx, userId);
        const now = new Date();
        const [{ finished }] = await tx<{ finished: boolean }[]>`
          select exists (select 1 from public.stop_results where user_id = ${userId}) as finished`;
        if (!finished) return toWallet(row, now);
        const { novelos, at } = refill(row.novelos, row.novelos_at, now);
        if (novelos === 0) throw new ConflictException('No novelos left');
        // Spending from full starts the refill clock now.
        const since = novelos === MAX_NOVELOS ? now : at;
        const [updated] = await tx<WalletRow[]>`
          update public.wallets set novelos = ${novelos - 1}, novelos_at = ${since}, updated_at = now()
          where user_id = ${userId} returning novelos, novelos_at, peixinhos, marcadores`;
        return toWallet(updated, now);
      }),
    );
  }

  /** Re-reading a stop's cards at 0 novelos gives one back, once per stop; 409 otherwise. */
  reread(userId: string, disciplineId: number, topic: number): Promise<Wallet> {
    return asPerson(
      this.sql.begin(async (tx) => {
        const row = await this.lockWallet(tx, userId);
        const now = new Date();
        const { novelos, at } = refill(row.novelos, row.novelos_at, now);
        if (novelos > 0)
          throw new ConflictException('Re-reading gives a novelo only at 0');
        const inserted = await tx`
          insert into public.stop_rereads (user_id, discipline_id, topic) values (${userId}, ${disciplineId}, ${topic})
          on conflict do nothing returning 1`;
        if (!inserted.length)
          throw new ConflictException('This stop already gave its novelo');
        const [updated] = await tx<WalletRow[]>`
          update public.wallets set novelos = 1, novelos_at = ${at}, updated_at = now()
          where user_id = ${userId} returning novelos, novelos_at, peixinhos, marcadores`;
        return toWallet(updated, now);
      }),
    );
  }

  /** Every stop the person finished, oldest first. */
  // shortcut: reads all of a person's finishes (a demo has tens); keep a running summary if people reach thousands.
  finishes(userId: string): Promise<Finish[]> {
    return this.sql<Finish[]>`
      select discipline_id::int as "disciplineId", topic, mistakes, relampago_mistakes as "relampagoMistakes",
        completed_at as "completedAt",
        to_char(completed_at at time zone ${TIME_ZONE}, 'YYYY-MM-DD') as day
      from public.stop_results where user_id = ${userId} order by completed_at`;
  }

  /** When the person asked their first questions about the cards, oldest first: enough for "Curiosidade de gato". */
  async questionTimes(userId: string): Promise<Date[]> {
    const rows = await this.sql<{ created_at: Date }[]>`
      select created_at from public.stop_questions where user_id = ${userId}
      order by created_at limit ${CURIOSITY_QUESTIONS}`;
    return rows.map((r) => r.created_at);
  }

  async topicCounts(disciplineIds: number[]): Promise<Map<number, number>> {
    if (!disciplineIds.length) return new Map();
    const rows = await this.sql<{ id: number; n: number }[]>`
      select id::int, cardinality(coalesce(topics, '{}'))::int as n from public.disciplines where id in ${this.sql(disciplineIds)}`;
    return new Map(rows.map((r) => [r.id, r.n]));
  }

  async sabedoria(userId: string): Promise<{ total: number; week: number }> {
    const [row] = await this.sql<{ total: number; week: number }[]>`
      select coalesce(sum(sabedoria), 0)::int as total,
        coalesce(sum(sabedoria) filter (
          where completed_at at time zone ${TIME_ZONE} >= date_trunc('week', now() at time zone ${TIME_ZONE})
        ), 0)::int as week
      from public.stop_results where user_id = ${userId}`;
    return row;
  }

  /** Today's São Paulo day and the Monday of its week. */
  async calendar(): Promise<{ today: string; monday: string }> {
    const [row] = await this.sql<{ today: string; monday: string }[]>`
      select to_char(now() at time zone ${TIME_ZONE}, 'YYYY-MM-DD') as today,
        to_char(date_trunc('week', now() at time zone ${TIME_ZONE}), 'YYYY-MM-DD') as monday`;
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
      select j.weekly_goal, d.id::int, d.name, coalesce(d.topics, '{}') as topics
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

  async discipline(
    id: number,
  ): Promise<{ id: number; name: string; topics: string[] } | null> {
    const [row] = await this.sql<
      { id: number; name: string; topics: string[] }[]
    >`
      select id::int, name, coalesce(topics, '{}') as topics from public.disciplines where id = ${id}`;
    return row ?? null;
  }
}
