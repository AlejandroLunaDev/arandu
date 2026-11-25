import { createHash, randomInt } from 'node:crypto';
import type { CaixaContents, LeagueId, SeasonReward } from '@arandu/contracts';

// Demo values (issue #65): every reward comes from studying, never from paying.

export const LEAGUES: { id: LeagueId; name: string }[] = [
  { id: 'calouro', name: 'Calouro' },
  { id: 'veterano', name: 'Veterano' },
  { id: 'monitor', name: 'Monitor' },
  { id: 'mestre', name: 'Mestre' },
  { id: 'filosofo', name: 'Filósofo' },
  { id: 'sabio', name: 'Sábio' },
];
export const LEAGUE_SIZE = 12;
export const PROMOTE_TOP = 7;

const RIVALS = [
  'Coruja Noturna',
  'Lápis Veloz',
  'Marca-Texto',
  'Nota Dez',
  'Café e Livros',
  'Pergunta Boa',
  'Caderno Azul',
  'Leitora Voraz',
  'Rascunho',
  'Ideia Fixa',
  'Sublinhado',
  'Ponto e Vírgula',
  'Fichamento',
  'Biblioteca Viva',
];

function seeded(...parts: (string | number)[]): number {
  return createHash('sha256').update(parts.join(':')).digest().readUInt32BE(0);
}

/**
 * Demo rivals of a league round: stable names and a weekly pace of sabedoria, times the weeks of the round gone by
 * (a full 1-day round is 1/7), so a short round asks as much per day as a week does.
 * shortcut: they stand in while there are few people; drop them once leagues fill with real ones.
 */
export function rivals(
  rank: number,
  start: string,
  count: number,
  weeks: number,
) {
  return Array.from({ length: count }, (_, i) => {
    const seed = seeded(rank, start, i);
    const total = (rank - 1) * 15 + (seed % 120);
    return {
      nickname: RIVALS[(seed >>> 8) % RIVALS.length] ?? 'Leitor',
      sabedoria: Math.round(total * weeks),
    };
  });
}

/** The name others see when the person chose none. */
export const defaultNickname = (userId: string) =>
  `Leitor ${seeded(userId) % 10_000}`;

/** Seasons are 4 weeks, counted from this Monday. */
const SEASON_EPOCH = Date.UTC(2026, 10, 2);
const SEASON_DAYS = 28;
export const PER_LEVEL = 50;
export const LEVELS = 8;

export function seasonOf(today: string): {
  season: number;
  start: string;
  endsOn: string;
} {
  const days = Math.floor((Date.parse(today) - SEASON_EPOCH) / 86_400_000);
  const index = Math.max(0, Math.floor(days / SEASON_DAYS));
  const day = (n: number) =>
    new Date(SEASON_EPOCH + n * 86_400_000).toISOString().slice(0, 10);
  return {
    season: index + 1,
    start: day(index * SEASON_DAYS),
    endsOn: day((index + 1) * SEASON_DAYS - 1),
  };
}

export const levelOf = (sabedoria: number) =>
  Math.min(LEVELS, Math.floor(sabedoria / PER_LEVEL));

/** The league of a rank (1 = calouro); the database keeps ranks in range. */
export function leagueAt(rank: number): { id: LeagueId; name: string } {
  const league = LEAGUES[rank - 1];
  if (!league) throw new Error(`No league ${rank}`);
  return league;
}

/** The free track's reward of a level (1-based); the route only accepts reached levels. */
export function rewardAt(level: number): SeasonReward {
  const reward = FREE_TRACK[level - 1];
  if (!reward) throw new Error(`No reward for level ${level}`);
  return reward;
}

export const FREE_TRACK: SeasonReward[] = [
  { kind: 'peixinhos', amount: 20 },
  { kind: 'caixa' },
  { kind: 'marcador' },
  { kind: 'peixinhos', amount: 40 },
  { kind: 'caixa' },
  { kind: 'novelos_cheios' },
  { kind: 'peixinhos', amount: 60 },
  { kind: 'caixa' },
];

/** Shown locked, never purchasable here. */
export const PLUS_TRACK = [
  { level: 2, item: 'cachecol' },
  { level: 4, item: 'luminaria' },
  { level: 6, item: 'estante_alta' },
  { level: 8, item: 'chapeu_de_inverno' },
];

/** What a caixa holds: 15-60 peixinhos, a page marker 35%, full novelos 25%, the room plant 12%. */
export function rollCaixa(
  roll: (max: number) => number = randomInt,
): CaixaContents {
  return {
    peixinhos: 15 + roll(46),
    marcador: roll(100) < 35,
    novelosCheios: roll(100) < 25,
    roomItem: roll(100) < 12 ? 'planta' : null,
  };
}

/** The page marker's price; a novelo's is NOVELO_PRICES (progress.logic). */
export const SHOP = { marcador: 50 } as const;
export const MAX_MARCADORES = 2;
