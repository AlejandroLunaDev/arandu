import { createHash, randomInt } from 'node:crypto';
import type {
  CaixaContents,
  LeagueId,
  SeasonReward,
  ShopItem,
} from '@arandu/contracts';
import { addDays } from '../progress/progress.logic.js';

// Demo values (issue #65): every reward comes from studying, never from paying.

export const LEAGUES: { id: LeagueId; name: string }[] = [
  { id: 'calouro', name: 'Calouro' },
  { id: 'veterano', name: 'Veterano' },
  { id: 'monitor', name: 'Monitor' },
  { id: 'mestre', name: 'Mestre' },
  { id: 'filosofo', name: 'Filósofo' },
  { id: 'sabio', name: 'Sábio' },
];
// Small for the demo, so a few test accounts fill a league (#150).
export const LEAGUE_SIZE = 6;
export const PROMOTE_TOP = 3;

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
  { kind: 'peixinhos', amount: 50 },
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

/**
 * What a caixa holds (#145): 10-20 peixinhos, 1-3 of the currency, 1-5 sabedoria, a page marker 35%, the room plant 12%.
 * Every finished lesson gives one, and its peixinhos average a lesson's price: winning pays the next lesson, losing
 * spends the energy.
 */
export function rollCaixa(
  roll: (max: number) => number = randomInt,
): CaixaContents {
  return {
    peixinhos: 10 + roll(11),
    currency: 1 + roll(3),
    sabedoria: 1 + roll(5),
    marcador: roll(100) < 35,
    roomItem: roll(100) < 12 ? 'planta' : null,
    vidas: 0,
  };
}

export const MAX_MARCADORES = 2;

type Gives = ShopItem['gives'];
const span = (min: number, max = min) => ({ min, max });
const gives = (g: Partial<Gives>): Gives => ({
  peixinhos: span(0),
  vidas: span(0),
  marcador: 0,
  planta: 0,
  ...g,
});

// #153, Alejandro's prices. While caixas are bought with the currency, the currency is never sold for money (ECA
// Digital, art. 20).
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'marcador',
    price: 50,
    pays: 'peixinhos',
    caixa: false,
    gives: gives({ marcador: 100 }),
  },
  {
    id: 'peixinhos',
    price: 2,
    pays: 'currency',
    caixa: false,
    gives: gives({ peixinhos: span(15) }),
  },
  {
    id: 'vida',
    price: 2,
    pays: 'currency',
    caixa: false,
    gives: gives({ vidas: span(1) }),
  },
  {
    id: 'caixa_comum',
    price: 3,
    pays: 'currency',
    caixa: true,
    gives: gives({ peixinhos: span(10, 20), vidas: span(0, 1) }),
  },
  {
    id: 'caixa_media',
    price: 6,
    pays: 'currency',
    caixa: true,
    gives: gives({ peixinhos: span(25, 40), vidas: span(1), marcador: 20 }),
  },
  {
    id: 'caixa_premium',
    price: 10,
    pays: 'currency',
    caixa: true,
    gives: gives({
      peixinhos: span(40, 60),
      vidas: span(1, 2),
      marcador: 40,
      planta: 10,
    }),
  },
];

/** The week's promotions, one per São Paulo week in turn. */
const PROMOTIONS: Gives[] = [
  gives({ vidas: span(10) }),
  gives({ peixinhos: span(45) }),
];

/** The promotion of the São Paulo week starting on `monday`, and when it ends. */
export function promotionOf(monday: string): {
  item: ShopItem;
  endsAt: string;
} {
  const week = Math.round(
    (Date.parse(monday) - SEASON_EPOCH) / (7 * 86_400_000),
  );
  const n = PROMOTIONS.length;
  return {
    item: {
      id: 'promotion',
      price: 4,
      pays: 'currency',
      caixa: false,
      gives: PROMOTIONS[((week % n) + n) % n]!,
    },
    // shortcut: São Paulo midnight is 03:00 UTC with no daylight saving (as nextMidnight); use a tz library if it returns.
    endsAt: `${addDays(monday, 7)}T03:00:00.000Z`,
  };
}

/** The shop item of a bought caixa's reason, "shop:<tier>:<uuid>"; undefined for an earned caixa. */
export const shopTier = (reason: string) =>
  reason.startsWith('shop:')
    ? SHOP_ITEMS.find((i) => i.caixa && i.id === reason.split(':')[1])
    : undefined;

/** What a bought caixa holds: rolled within its tier's ranges, never the currency or sabedoria. */
export function rollShopCaixa(
  tier: ShopItem,
  roll: (max: number) => number = randomInt,
): CaixaContents {
  const within = ({ min, max }: { min: number; max: number }) =>
    min + roll(max - min + 1);
  const { peixinhos, vidas, marcador, planta } = tier.gives;
  return {
    peixinhos: within(peixinhos),
    currency: 0,
    sabedoria: 0,
    vidas: within(vidas),
    marcador: roll(100) < marcador,
    roomItem: roll(100) < planta ? 'planta' : null,
  };
}
