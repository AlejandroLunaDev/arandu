import type {
  Caixa,
  CaixaContents,
  League,
  Season,
  Wallet,
  Wardrobe,
  WardrobeUpdate,
} from '@arandu/contracts';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TransactionSql } from 'postgres';
import { SQL, type Sql } from '../platform/database/database.module.js';
import { addDays, MAX_NOVELOS, refill } from '../progress/progress.logic.js';
import {
  asPerson,
  ProgressRepository,
  TIME_ZONE,
  toWallet,
} from '../progress/progress.repository.js';
import {
  FREE_TRACK,
  LEAGUE_SIZE,
  LEAGUES,
  LEVELS,
  levelOf,
  MAX_MARCADORES,
  PER_LEVEL,
  PLUS_TRACK,
  PROMOTE_TOP,
  defaultNickname,
  rivals,
  rollCaixa,
  seasonOf,
  SHOP,
} from './game.logic.js';

type Tx = Sql | TransactionSql;

interface PlayerRow {
  nickname: string | null;
  league: number;
  league_week: string;
  promoted_from: number | null;
  wearing: string | null;
}

interface CaixaRow {
  id: number;
  reason: string;
  created_at: Date;
  opened_at: Date | null;
  contents: CaixaContents | null;
}

const toCaixa = (r: CaixaRow): Caixa => ({
  id: r.id,
  reason: r.reason,
  createdAt: r.created_at.toISOString(),
  openedAt: r.opened_at?.toISOString() ?? null,
  contents: r.contents,
});

/** The game around studying (L1-L7, K1): league, season, caixas, shop and wardrobe. */
@Injectable()
export class GameRepository {
  constructor(
    @Inject(SQL) private readonly sql: Sql,
    private readonly progress: ProgressRepository,
  ) {}

  /** São Paulo's today and the league round of game_settings: its first day, length in days, end and share gone by. */
  private async calendar(tx: Tx) {
    const [row] = await tx<
      {
        today: string;
        start: string;
        days: number;
        ends_at: Date;
        elapsed: number;
      }[]
    >`
      select to_char(r.local, 'YYYY-MM-DD') as today, to_char(r.start, 'YYYY-MM-DD') as start, r.days,
        (r.start + r.days * interval '1 day') at time zone ${TIME_ZONE} as ends_at,
        (extract(epoch from r.local - r.start) / (r.days * 86400))::float8 as elapsed
      from (
        select now() at time zone ${TIME_ZONE} as local, s.league_period_days::int as days,
          (s.league_anchor_on + s.league_period_days * floor(
            ((now() at time zone ${TIME_ZONE})::date - s.league_anchor_on)::numeric / s.league_period_days)::int
          )::timestamp as start
        from public.game_settings s
      ) r`;
    return row;
  }

  /** The person's player row, created in Calouro on first use and locked for the rest of the transaction. */
  private async lockPlayer(
    tx: Tx,
    userId: string,
    start: string,
  ): Promise<PlayerRow> {
    await tx`insert into public.players (user_id, league_week) values (${userId}, ${start}) on conflict do nothing`;
    const [row] = await tx<PlayerRow[]>`
      select nickname, league, to_char(league_week, 'YYYY-MM-DD') as league_week, promoted_from, wearing
      from public.players where user_id = ${userId} for update`;
    return row;
  }

  /** A league's room for a round: the person, the best others in that league, and demo rivals up to 12; best first. */
  // shortcut: membership is the others' league now, not the one they had that round; fine while promotions are rare.
  private async room(
    tx: Tx,
    userId: string,
    player: PlayerRow,
    rank: number,
    start: string,
    days: number,
    elapsed: number,
  ): Promise<League['rows']> {
    const round = (who: Tx) => who`
      (r.completed_at at time zone ${TIME_ZONE})::date >= ${start}::date
      and (r.completed_at at time zone ${TIME_ZONE})::date < ${start}::date + ${days}::int`;
    const others = await tx<
      { user_id: string; nickname: string | null; sabedoria: number }[]
    >`
      select p.user_id, p.nickname, coalesce(sum(r.sabedoria), 0)::int as sabedoria
      from public.players p
      left join public.stop_results r on r.user_id = p.user_id and ${round(tx)}
      where p.league = ${rank} and p.user_id <> ${userId}
      group by p.user_id, p.nickname
      order by sabedoria desc limit ${LEAGUE_SIZE - 1}`;
    const [mine] = await tx<{ sabedoria: number }[]>`
      select coalesce(sum(r.sabedoria), 0)::int as sabedoria
      from public.stop_results r where r.user_id = ${userId} and ${round(tx)}`;
    const rows = [
      {
        nickname: player.nickname ?? defaultNickname(userId),
        sabedoria: mine.sabedoria,
        you: true,
        demo: false,
      },
      ...others.map((o) => ({
        nickname: o.nickname ?? defaultNickname(o.user_id),
        sabedoria: o.sabedoria,
        you: false,
        demo: false,
      })),
      ...rivals(
        rank,
        start,
        LEAGUE_SIZE - 1 - others.length,
        (elapsed * days) / 7,
      ).map(
        (r) => ({ ...r, you: false, demo: true }),
      ),
    ];
    // Stable sort: on a tie the person stays ahead.
    return rows
      .sort((a, b) => b.sabedoria - a.sabedoria)
      .map((r, i) => ({ position: i + 1, ...r }));
  }

  /**
   * Once per round, settles the last finished round: the top 7 move up, keep the new outfit and get a caixa (L7).
   * shortcut: only that round counts; earlier unread rounds are not replayed, fine for a demo.
   */
  private async settle(
    tx: Tx,
    userId: string,
    player: PlayerRow,
    start: string,
    days: number,
  ): Promise<PlayerRow> {
    if (player.league_week >= start) return player;
    const rows = await this.room(
      tx,
      userId,
      player,
      player.league,
      addDays(start, -days),
      days,
      1,
    );
    const me = rows.find((r) => r.you)!;
    const up =
      me.sabedoria > 0 &&
      me.position <= PROMOTE_TOP &&
      player.league < LEAGUES.length;
    if (!up) {
      await tx`update public.players set league_week = ${start}, updated_at = now() where user_id = ${userId}`;
      return { ...player, league_week: start };
    }
    const to = LEAGUES[player.league].id;
    await tx`insert into public.owned_items (user_id, item) values (${userId}, ${`outfit:${to}`}) on conflict do nothing`;
    await tx`insert into public.caixas (user_id, reason) values (${userId}, ${`promotion:${to}`}) on conflict do nothing`;
    const [row] = await tx<PlayerRow[]>`
      update public.players set league = ${player.league + 1}, promoted_from = ${player.league},
        league_week = ${start}, updated_at = now()
      where user_id = ${userId}
      returning nickname, league, to_char(league_week, 'YYYY-MM-DD') as league_week, promoted_from, wearing`;
    return row;
  }

  league(userId: string): Promise<League> {
    return asPerson(
      this.sql.begin(async (tx) => {
        const cal = await this.calendar(tx);
        const player = await this.settle(
          tx,
          userId,
          await this.lockPlayer(tx, userId, cal.start),
          cal.start,
          cal.days,
        );
        const league = LEAGUES[player.league - 1];
        let promotion: League['promotion'] = null;
        if (player.promoted_from) {
          const [caixa] = await tx<{ id: number }[]>`
            select id::int from public.caixas where user_id = ${userId} and reason = ${`promotion:${league.id}`}`;
          promotion = {
            from: LEAGUES[player.promoted_from - 1].id,
            to: league.id,
            caixaId: caixa.id,
          };
        }
        return {
          league: { ...league, rank: player.league },
          round: {
            startsOn: cal.start,
            days: cal.days,
            endsAt: cal.ends_at.toISOString(),
          },
          promoteTop: PROMOTE_TOP,
          rows: await this.room(
            tx,
            userId,
            player,
            player.league,
            cal.start,
            cal.days,
            cal.elapsed,
          ),
          promotion,
        };
      }),
    );
  }

  async promotionSeen(userId: string): Promise<void> {
    await this
      .sql`update public.players set promoted_from = null, updated_at = now() where user_id = ${userId}`;
  }

  /** Adds a reward to the wallet: peixinhos, a page marker (max 2), full novelos. */
  private async reward(
    tx: Tx,
    userId: string,
    r: { peixinhos?: number; marcador?: boolean; novelosCheios?: boolean },
  ): Promise<void> {
    await this.progress.lockWallet(tx, userId);
    const full = r.novelosCheios === true;
    await tx`
      update public.wallets set
        peixinhos = peixinhos + ${r.peixinhos ?? 0},
        -- At the max a won page marker is not kept: the person already has every one they can hold.
        marcadores = least(${MAX_MARCADORES}, marcadores + ${r.marcador ? 1 : 0}),
        novelos = case when ${full} then ${MAX_NOVELOS} else novelos end,
        novelos_at = case when ${full} then now() else novelos_at end,
        updated_at = now()
      where user_id = ${userId}`;
  }

  private async seasonState(tx: Tx, userId: string) {
    const { today } = await this.calendar(tx);
    const season = seasonOf(today);
    const [{ sabedoria }] = await tx<{ sabedoria: number }[]>`
      select coalesce(sum(sabedoria), 0)::int as sabedoria from public.stop_results
      where user_id = ${userId}
        and (completed_at at time zone ${TIME_ZONE})::date between ${season.start}::date and ${season.endsOn}::date`;
    return { ...season, sabedoria, level: levelOf(sabedoria) };
  }

  async season(userId: string): Promise<Season> {
    const state = await this.seasonState(this.sql, userId);
    const claims = await this.sql<{ level: number }[]>`
      select level from public.season_claims where user_id = ${userId} and season = ${state.season}`;
    const claimed = new Set(claims.map((c) => c.level));
    return {
      season: state.season,
      endsOn: state.endsOn,
      sabedoria: state.sabedoria,
      level: state.level,
      perLevel: PER_LEVEL,
      free: FREE_TRACK.map((reward, i) => ({
        level: i + 1,
        reward,
        ready: i + 1 <= state.level,
        claimed: claimed.has(i + 1),
      })),
      plus: PLUS_TRACK.map((p) => ({ ...p, locked: true as const })),
    };
  }

  /** Takes a reached level's free reward, once. 409 before the level or when already taken. */
  async claim(userId: string, level: number): Promise<Season> {
    await asPerson(
      this.sql.begin(async (tx) => {
        const state = await this.seasonState(tx, userId);
        if (level > Math.min(state.level, LEVELS))
          throw new ConflictException(`Level ${level} is not reached yet`);
        const inserted = await tx`
          insert into public.season_claims (user_id, season, level) values (${userId}, ${state.season}, ${level})
          on conflict do nothing returning 1`;
        if (!inserted.length)
          throw new ConflictException(`Level ${level} was already claimed`);
        const reward = FREE_TRACK[level - 1];
        if (reward.kind === 'caixa')
          await tx`insert into public.caixas (user_id, reason) values (${userId}, ${`season:${state.season}:${level}`})
            on conflict do nothing`;
        else
          await this.reward(tx, userId, {
            peixinhos: reward.kind === 'peixinhos' ? reward.amount : 0,
            marcador: reward.kind === 'marcador',
            novelosCheios: reward.kind === 'novelos_cheios',
          });
      }),
    );
    return this.season(userId);
  }

  /** The person's caixas, newest first. Finishing every stop of a subject earns the "demo_finished" one here. */
  caixas(userId: string): Promise<Caixa[]> {
    return asPerson(
      (async () => {
        await this.sql`
          insert into public.caixas (user_id, reason)
          select ${userId}, 'demo_finished' where exists (
            select 1 from public.stop_results r join public.disciplines d on d.id = r.discipline_id
            where r.user_id = ${userId} and cardinality(coalesce(d.topics, '{}')) > 0
            group by d.id having count(*) >= cardinality(coalesce(d.topics, '{}')))
          on conflict do nothing`;
        const rows = await this.sql<CaixaRow[]>`
          select id::int, reason, created_at, opened_at, contents from public.caixas
          where user_id = ${userId} order by created_at desc, id desc`;
        return rows.map(toCaixa);
      })(),
    );
  }

  /** Opens a caixa: its contents are rolled here and added at once. 404 when not theirs, 409 when already open. */
  open(userId: string, id: number): Promise<Caixa> {
    return asPerson(
      this.sql.begin(async (tx) => {
        const [caixa] = await tx<{ opened: boolean }[]>`
          select opened_at is not null as opened from public.caixas
          where id = ${id} and user_id = ${userId} for update`;
        if (!caixa) throw new NotFoundException(`No caixa ${id}`);
        if (caixa.opened)
          throw new ConflictException('This caixa is already open');
        const contents = rollCaixa();
        await this.reward(tx, userId, contents);
        if (contents.roomItem)
          await tx`insert into public.owned_items (user_id, item) values (${userId}, ${`room:${contents.roomItem}`})
            on conflict do nothing`;
        const [row] = await tx<CaixaRow[]>`
          update public.caixas set opened_at = now(), contents = ${tx.json(contents)}
          where id = ${id} returning id::int, reason, created_at, opened_at, contents`;
        return toCaixa(row);
      }),
    );
  }

  /** The shop takes only peixinhos, which only studying earns. 409 when unaffordable or already full. */
  buy(userId: string, item: keyof typeof SHOP): Promise<Wallet> {
    return asPerson(
      this.sql.begin(async (tx) => {
        const row = await this.progress.lockWallet(tx, userId);
        const now = new Date();
        const price = SHOP[item];
        if (
          item === 'novelos' &&
          refill(row.novelos, row.novelos_at, now).novelos >= MAX_NOVELOS
        )
          throw new ConflictException('Novelos are already full');
        if (item === 'marcador' && row.marcadores >= MAX_MARCADORES)
          throw new ConflictException(
            'Page markers are already at the maximum',
          );
        if (row.peixinhos < price)
          throw new ConflictException('Not enough peixinhos');
        const [updated] = await tx<
          {
            novelos: number;
            novelos_at: Date;
            peixinhos: number;
            marcadores: number;
          }[]
        >`
          update public.wallets set peixinhos = peixinhos - ${price},
            novelos = case when ${item === 'novelos'} then ${MAX_NOVELOS} else novelos end,
            novelos_at = case when ${item === 'novelos'} then ${now} else novelos_at end,
            marcadores = marcadores + ${item === 'marcador' ? 1 : 0},
            updated_at = now()
          where user_id = ${userId} returning novelos, novelos_at, peixinhos, marcadores`;
        return toWallet(updated, now);
      }),
    );
  }

  private async wardrobeOf(
    tx: Tx,
    userId: string,
    player: PlayerRow,
  ): Promise<Wardrobe> {
    const items = await tx<{ item: string }[]>`
      select item from public.owned_items where user_id = ${userId}`;
    const owned = new Set(items.map((i) => i.item));
    const outfits = LEAGUES.map((l, i) => ({
      id: l.id,
      owned: i === 0 || owned.has(`outfit:${l.id}`),
    }));
    const highest = outfits.filter((o) => o.owned).at(-1)!.id;
    const wearing =
      outfits.find((o) => o.id === player.wearing && o.owned)?.id ?? highest;
    return {
      outfits,
      roomItems: [...owned]
        .filter((i) => i.startsWith('room:'))
        .map((i) => i.slice(5)),
      wearing,
      nickname: player.nickname,
    };
  }

  wardrobe(userId: string): Promise<Wardrobe> {
    return asPerson(
      this.sql.begin(async (tx) => {
        const { start } = await this.calendar(tx);
        return this.wardrobeOf(
          tx,
          userId,
          await this.lockPlayer(tx, userId, start),
        );
      }),
    );
  }

  /** Changes the outfit worn (only an owned one; 409 otherwise) or the nickname. */
  updateWardrobe(userId: string, update: WardrobeUpdate): Promise<Wardrobe> {
    return asPerson(
      this.sql.begin(async (tx) => {
        const { start } = await this.calendar(tx);
        let player = await this.lockPlayer(tx, userId, start);
        if (update.wearing) {
          const { outfits } = await this.wardrobeOf(tx, userId, player);
          if (!outfits.find((o) => o.id === update.wearing)?.owned)
            throw new ConflictException(
              `The ${update.wearing} outfit is not owned yet`,
            );
        }
        const values: Partial<Pick<PlayerRow, 'wearing' | 'nickname'>> = {};
        if (update.wearing !== undefined) values.wearing = update.wearing;
        if (update.nickname !== undefined) values.nickname = update.nickname;
        if (Object.keys(values).length) {
          [player] = await tx<PlayerRow[]>`
            update public.players set ${tx(values)}, updated_at = now() where user_id = ${userId}
            returning nickname, league, to_char(league_week, 'YYYY-MM-DD') as league_week, promoted_from, wearing`;
        }
        return this.wardrobeOf(tx, userId, player);
      }),
    );
  }
}
