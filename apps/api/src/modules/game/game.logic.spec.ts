import {
  defaultNickname,
  FREE_TRACK,
  LEAGUES,
  leagueAt,
  levelOf,
  rewardAt,
  rivals,
  rollCaixa,
  seasonOf,
} from './game.logic.js';
import { LESSON_PRICE } from '../progress/progress.logic.js';

describe('rivals', () => {
  it('is deterministic for the same rank and monday', () => {
    expect(rivals(2, '2026-03-09', 5, 0.5)).toEqual(
      rivals(2, '2026-03-09', 5, 0.5),
    );
  });

  it('differs between ranks or weeks', () => {
    const base = rivals(2, '2026-03-09', 11, 1);

    expect(rivals(3, '2026-03-09', 11, 1)).not.toEqual(base);
    expect(rivals(2, '2026-03-16', 11, 1)).not.toEqual(base);
  });

  it.each([0, 1, 11])('returns %i rivals', (count) => {
    expect(rivals(1, '2026-03-09', count, 1)).toHaveLength(count);
  });

  it('scales sabedoria with elapsed and is 0 at the start of the week', () => {
    const none = rivals(3, '2026-03-09', 11, 0);
    const half = rivals(3, '2026-03-09', 11, 0.5);
    const full = rivals(3, '2026-03-09', 11, 1);

    expect(none.every((r) => r.sabedoria === 0)).toBe(true);
    half.forEach((r, i) => {
      expect(r.sabedoria).toBe(Math.round(full[i]!.sabedoria * 0.5));
      expect(r.nickname).toBe(full[i]!.nickname);
    });
    expect(full.some((r) => r.sabedoria > 0)).toBe(true);
  });

  it('gives a full 1-day round (weeks = 1/7) a seventh of a week, rounded', () => {
    const week = rivals(3, '2026-03-09', 11, 1);
    const day = rivals(3, '2026-03-09', 11, 1 / 7);

    day.forEach((r, i) => {
      expect(r.sabedoria).toBe(Math.round(week[i]!.sabedoria / 7));
      expect(r.nickname).toBe(week[i]!.nickname);
    });
  });
});

describe('seasonOf', () => {
  it('starts season 1 on 2026-11-02 and ends it on 2026-11-29', () => {
    expect(seasonOf('2026-11-02')).toEqual({
      season: 1,
      start: '2026-11-02',
      endsOn: '2026-11-29',
    });
    expect(seasonOf('2026-11-29').season).toBe(1);
  });

  it('moves to season 2 on 2026-11-30', () => {
    expect(seasonOf('2026-11-30')).toEqual({
      season: 2,
      start: '2026-11-30',
      endsOn: '2026-12-27',
    });
  });

  it('keeps dates before the epoch in season 1', () => {
    expect(seasonOf('2026-10-15')).toEqual({
      season: 1,
      start: '2026-11-02',
      endsOn: '2026-11-29',
    });
  });
});

describe('levelOf', () => {
  it.each([
    [0, 0],
    [49, 0],
    [50, 1],
    [99, 1],
    [100, 2],
    [399, 7],
    [400, 8],
    [10_000, 8],
  ])('%i sabedoria is level %i', (sabedoria, level) => {
    expect(levelOf(sabedoria)).toBe(level);
  });
});

describe('rollCaixa', () => {
  /** Answers each roll in the order rollCaixa asks: peixinhos, currency, sabedoria, marcador, planta. */
  const rolls = (...values: number[]) => {
    const queue = [...values];
    return vi.fn((_max: number) => queue.shift() ?? 0);
  };

  it('gives 10-20 peixinhos, 1-3 currency and 1-5 sabedoria at the extremes', () => {
    expect(rollCaixa(rolls(0, 0, 0, 99, 99))).toMatchObject({
      peixinhos: 10,
      currency: 1,
      sabedoria: 1,
    });
    expect(rollCaixa(rolls(10, 2, 4, 99, 99))).toMatchObject({
      peixinhos: 20,
      currency: 3,
      sabedoria: 5,
    });
  });

  it('asks for 11, 3 and 5 values for the amounts and 100 for each chance', () => {
    const roll = rolls(0, 0, 0, 0, 0);

    rollCaixa(roll);

    expect(roll.mock.calls.map(([max]) => max)).toEqual([11, 3, 5, 100, 100]);
  });

  it('gives a marcador below 35 only', () => {
    expect(rollCaixa(rolls(0, 0, 0, 34, 99)).marcador).toBe(true);
    expect(rollCaixa(rolls(0, 0, 0, 35, 99)).marcador).toBe(false);
  });

  it('gives the planta below 12 only', () => {
    expect(rollCaixa(rolls(0, 0, 0, 99, 11)).roomItem).toBe('planta');
    expect(rollCaixa(rolls(0, 0, 0, 99, 12)).roomItem).toBeNull();
  });

  it("averages a lesson's price in peixinhos, so winning pays the next lesson", () => {
    const least = rollCaixa(rolls(0, 0, 0, 99, 99)).peixinhos;
    const most = rollCaixa(rolls(10, 0, 0, 99, 99)).peixinhos;
    expect((least + most) / 2).toBe(LESSON_PRICE);
  });

  it('keeps its peixinhos between 10 and 20 with the real random source', () => {
    for (let i = 0; i < 200; i++) {
      const { peixinhos, currency, sabedoria } = rollCaixa();
      expect(peixinhos).toBeGreaterThanOrEqual(10);
      expect(peixinhos).toBeLessThanOrEqual(20);
      expect(currency).toBeGreaterThanOrEqual(1);
      expect(currency).toBeLessThanOrEqual(3);
      expect(sabedoria).toBeGreaterThanOrEqual(1);
      expect(sabedoria).toBeLessThanOrEqual(5);
    }
  });
});

describe('defaultNickname', () => {
  it('is stable per user and looks like Leitor N', () => {
    const id = '11111111-1111-4111-8111-111111111111';

    expect(defaultNickname(id)).toBe(defaultNickname(id));
    expect(defaultNickname(id)).toMatch(/^Leitor \d{1,4}$/);
  });

  it('differs between users', () => {
    const names = new Set(
      Array.from({ length: 20 }, (_, i) => defaultNickname(`user-${i}`)),
    );

    expect(names.size).toBeGreaterThan(1);
  });
});

describe('leagueAt', () => {
  it('returns the league of a rank, 1-based', () => {
    expect(leagueAt(1)).toBe(LEAGUES[0]);
    expect(leagueAt(LEAGUES.length)).toBe(LEAGUES.at(-1));
  });

  it.each([0, LEAGUES.length + 1])('throws for rank %s', (rank) => {
    expect(() => leagueAt(rank)).toThrow(`No league ${rank}`);
  });
});

describe('rewardAt', () => {
  it('returns the reward of a level, 1-based', () => {
    expect(rewardAt(1)).toBe(FREE_TRACK[0]);
    expect(rewardAt(FREE_TRACK.length)).toBe(FREE_TRACK.at(-1));
  });

  it.each([0, FREE_TRACK.length + 1])('throws for level %s', (level) => {
    expect(() => rewardAt(level)).toThrow(`No reward for level ${level}`);
  });
});
