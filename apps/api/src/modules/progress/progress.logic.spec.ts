import {
  achievementsOf,
  addDays,
  type Finish,
  dayOf,
  MAX_NOVELOS,
  nextMidnight,
  noveloPrice,
  refill,
} from './progress.logic.js';

// 02:59Z is still 23:59 on the 9th in São Paulo; 03:00Z is 00:00 on the 10th.
const BEFORE_MIDNIGHT = new Date('2026-03-10T02:59:00.000Z');
const AT_MIDNIGHT = new Date('2026-03-10T03:00:00.000Z');
const YESTERDAY = new Date('2026-03-09T15:00:00.000Z');

describe('dayOf', () => {
  it('counts the day in São Paulo, not in UTC', () => {
    expect(dayOf(BEFORE_MIDNIGHT)).toBe('2026-03-09');
    expect(dayOf(AT_MIDNIGHT)).toBe('2026-03-10');
  });
});

describe('nextMidnight', () => {
  it.each([
    ['2026-03-10T02:59:00.000Z', '2026-03-10T03:00:00.000Z'],
    ['2026-03-10T03:00:00.000Z', '2026-03-11T03:00:00.000Z'],
    ['2026-03-10T20:00:00.000Z', '2026-03-11T03:00:00.000Z'],
    ['2026-12-31T12:00:00.000Z', '2027-01-01T03:00:00.000Z'],
  ])('after %s comes %s', (now, midnight) => {
    expect(nextMidnight(new Date(now)).toISOString()).toBe(midnight);
  });
});

describe('refill', () => {
  it('keeps the count on the same São Paulo day', () => {
    expect(refill(1, YESTERDAY, BEFORE_MIDNIGHT)).toEqual({
      novelos: 1,
      at: YESTERDAY,
    });
  });

  it('gives all novelos back once São Paulo midnight passes', () => {
    expect(refill(0, YESTERDAY, AT_MIDNIGHT)).toEqual({
      novelos: MAX_NOVELOS,
      at: AT_MIDNIGHT,
    });
  });

  it('does not reset at 03:00Z when at is already on that São Paulo day', () => {
    const at = new Date('2026-03-10T03:30:00.000Z');
    expect(refill(1, at, new Date('2026-03-10T20:00:00.000Z'))).toEqual({
      novelos: 1,
      at,
    });
  });

  it('clamps an old 5-novelo row to 3 on the same day', () => {
    expect(refill(5, YESTERDAY, BEFORE_MIDNIGHT)).toEqual({
      novelos: 3,
      at: YESTERDAY,
    });
  });

  it('is 3 after a day change even from an old 5', () => {
    expect(refill(5, YESTERDAY, AT_MIDNIGHT).novelos).toBe(3);
  });
});

describe('noveloPrice', () => {
  const day = '2026-03-10';
  const now = new Date('2026-03-10T15:00:00.000Z');

  it.each([
    [0, 15],
    [1, 20],
    [2, 35],
    [3, 50],
    [4, 50],
    [9, 50],
  ])('with %i bought today the next costs %i', (bought, price) => {
    expect(noveloPrice(bought, day, now)).toBe(price);
  });

  it('starts again at 15 on a new day', () => {
    expect(noveloPrice(4, '2026-03-09', now)).toBe(15);
  });

  it('is 15 when nothing was ever bought', () => {
    expect(noveloPrice(0, null, now)).toBe(15);
  });
});

describe('addDays', () => {
  it.each([
    ['2026-03-10', 1, '2026-03-11'],
    ['2026-03-31', 1, '2026-04-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2026-02-28', 1, '2026-03-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2026-03-10', 0, '2026-03-10'],
    ['2026-03-10', 7, '2026-03-17'],
  ])('%s + %i = %s', (day, days, expected) => {
    expect(addDays(day, days)).toBe(expected);
  });
});

describe('achievementsOf', () => {
  const finish = (
    day: string,
    over: Partial<Finish> = {},
    hour = 15,
  ): Finish => ({
    disciplineId: 1,
    topic: 0,
    mistakes: 1,
    relampagoMistakes: null,
    day,
    completedAt: new Date(`${day}T${String(hour).padStart(2, '0')}:00:00Z`),
    ...over,
  });
  const codes = (list: ReturnType<typeof achievementsOf>) =>
    list.map((a) => a.code);
  const topics = new Map([[1, 3]]);

  it('is empty with no finishes', () => {
    expect(achievementsOf([], topics)).toEqual([]);
  });

  it('first finish earns primeiro_capitulo at its time, nothing else', () => {
    const f = finish('2026-03-10');
    expect(achievementsOf([f], topics)).toEqual([
      { code: 'primeiro_capitulo', earnedAt: f.completedAt.toISOString() },
    ]);
  });

  it('nenhum_novelo_perdido is the first finish with 0 mistakes, not the first finish', () => {
    const a = finish('2026-03-10', { topic: 0, mistakes: 2 });
    const b = finish('2026-03-11', { topic: 1, mistakes: 0 });
    const c = finish('2026-03-12', { topic: 2, mistakes: 0 }, 9);
    const list = achievementsOf([a, b, c], new Map([[1, 9]]));
    expect(list).toContainEqual({
      code: 'nenhum_novelo_perdido',
      earnedAt: b.completedAt.toISOString(),
    });
  });

  it('no clean finish means no nenhum_novelo_perdido', () => {
    expect(codes(achievementsOf([finish('2026-03-10')], topics))).not.toContain(
      'nenhum_novelo_perdido',
    );
  });

  describe('semana_de_patinhas', () => {
    const days = (n: number, start = '2026-03-01') =>
      Array.from({ length: n }, (_, i) =>
        finish(addDays(start, i), { topic: i % 3 }),
      );

    it('is not earned after 6 consecutive days', () => {
      expect(codes(achievementsOf(days(6), topics))).not.toContain(
        'semana_de_patinhas',
      );
    });

    it('is earned at the first finish of the 7th day', () => {
      const run = days(7);
      const list = achievementsOf(run, topics);
      expect(list.find((a) => a.code === 'semana_de_patinhas')).toEqual({
        code: 'semana_de_patinhas',
        earnedAt: run[6]!.completedAt.toISOString(),
      });
    });

    it('a second finish on the 7th day does not move it', () => {
      const run = [...days(7), finish('2026-03-07', { topic: 1 }, 20)];
      const week = achievementsOf(run, topics).find(
        (a) => a.code === 'semana_de_patinhas',
      );
      expect(week?.earnedAt).toBe(run[6]!.completedAt.toISOString());
    });

    it('repeated days count once', () => {
      const run = [
        ...days(3),
        finish('2026-03-03', {}, 18),
        finish('2026-03-03', {}, 19),
        ...days(4, '2026-03-04'),
      ];
      const week = achievementsOf(run, topics).find(
        (a) => a.code === 'semana_de_patinhas',
      );
      expect(week?.earnedAt).toBe(
        new Date('2026-03-07T15:00:00Z').toISOString(),
      );
    });

    it('a gap resets the run', () => {
      const run = [...days(4), ...days(6, '2026-03-06')];
      expect(codes(achievementsOf(run, topics))).not.toContain(
        'semana_de_patinhas',
      );
    });

    it('a run of 7 after an earlier gap is found', () => {
      const run = [...days(2), ...days(7, '2026-03-10')];
      const week = achievementsOf(run, topics).find(
        (a) => a.code === 'semana_de_patinhas',
      );
      expect(week?.earnedAt).toBe(
        new Date('2026-03-16T15:00:00Z').toISOString(),
      );
    });

    it('crosses a month boundary', () => {
      expect(codes(achievementsOf(days(7, '2026-02-26'), topics))).toContain(
        'semana_de_patinhas',
      );
    });

    it('is earned once even with a longer run', () => {
      const list = achievementsOf(days(10), topics);
      expect(
        codes(list).filter((c) => c === 'semana_de_patinhas'),
      ).toHaveLength(1);
    });
  });

  describe('primeiro_livro', () => {
    const spaced = (list: number[], disciplineId = 1) =>
      list.map((t, i) =>
        finish(addDays('2026-03-10', i * 2), { topic: t, disciplineId }),
      );

    it('is earned when finished distinct topics reach the topic count', () => {
      const run = spaced([0, 1, 2]);
      expect(
        achievementsOf(run, topics).find((a) => a.code === 'primeiro_livro'),
      ).toEqual({
        code: 'primeiro_livro',
        earnedAt: run[2]!.completedAt.toISOString(),
      });
    });

    it('is not earned one topic short', () => {
      expect(codes(achievementsOf(spaced([0, 1]), topics))).not.toContain(
        'primeiro_livro',
      );
    });

    it('repeating a topic does not count twice', () => {
      expect(codes(achievementsOf(spaced([0, 0, 1, 1]), topics))).not.toContain(
        'primeiro_livro',
      );
    });

    it('two subjects: topics are not mixed between them', () => {
      const two = new Map([
        [1, 2],
        [2, 2],
      ]);
      const run = [
        finish('2026-03-10', { disciplineId: 1, topic: 0 }),
        finish('2026-03-12', { disciplineId: 2, topic: 0 }),
        finish('2026-03-14', { disciplineId: 1, topic: 1 }),
      ];
      const book = achievementsOf(run, two).find(
        (a) => a.code === 'primeiro_livro',
      );
      expect(book?.earnedAt).toBe(run[2]!.completedAt.toISOString());
    });

    it('is earned only once when two subjects complete', () => {
      const two = new Map([
        [1, 1],
        [2, 1],
      ]);
      const run = [
        finish('2026-03-10', { disciplineId: 1 }),
        finish('2026-03-12', { disciplineId: 2 }),
      ];
      const list = achievementsOf(run, two);
      expect(codes(list).filter((c) => c === 'primeiro_livro')).toHaveLength(1);
      expect(list.find((a) => a.code === 'primeiro_livro')?.earnedAt).toBe(
        run[0]!.completedAt.toISOString(),
      );
    });

    it('a subject with an unknown topic count never completes', () => {
      expect(
        codes(achievementsOf([finish('2026-03-10')], new Map())),
      ).not.toContain('primeiro_livro');
    });
  });

  describe('relampago', () => {
    it('is the first finish with 0 relampago mistakes', () => {
      const a = finish('2026-03-10', { relampagoMistakes: 2 });
      const b = finish('2026-03-11', { topic: 1, relampagoMistakes: 0 });
      const c = finish('2026-03-12', { topic: 2, relampagoMistakes: 0 });
      expect(
        achievementsOf([a, b, c], topics).find((x) => x.code === 'relampago'),
      ).toEqual({ code: 'relampago', earnedAt: b.completedAt.toISOString() });
    });

    it('is not earned with mistakes or without a relampago round (null)', () => {
      const run = [
        finish('2026-03-10', { relampagoMistakes: 1 }),
        finish('2026-03-11', { topic: 1, relampagoMistakes: null }),
      ];
      expect(codes(achievementsOf(run, topics))).not.toContain('relampago');
    });
  });

  describe('curiosidade_de_gato', () => {
    const asked = (n: number) =>
      Array.from(
        { length: n },
        (_, i) => new Date(`2026-03-10T10:${10 + i}:00Z`),
      );

    it('is earned at the 10th question time', () => {
      const times = asked(12);
      expect(achievementsOf([], topics, times)).toEqual([
        { code: 'curiosidade_de_gato', earnedAt: times[9]!.toISOString() },
      ]);
    });

    it('is not earned with 9 questions', () => {
      expect(achievementsOf([], topics, asked(9))).toEqual([]);
    });

    it('is sorted among the others by earnedAt', () => {
      const f = finish('2026-03-10', { relampagoMistakes: 0 }, 23);
      const list = achievementsOf([f], topics, asked(10));
      expect(codes(list)).toEqual([
        'curiosidade_de_gato',
        'primeiro_capitulo',
        'relampago',
      ]);
    });
  });

  it('returns achievements sorted by earnedAt', () => {
    const run = [0, 1, 2].map((t) =>
      finish(addDays('2026-03-10', t), { topic: t, mistakes: t === 0 ? 1 : 0 }),
    );
    const list = achievementsOf(run, topics);
    const times = list.map((a) => a.earnedAt);
    expect(times).toEqual([...times].sort());
    expect(codes(list)).toEqual([
      'primeiro_capitulo',
      'nenhum_novelo_perdido',
      'primeiro_livro',
    ]);
  });
});
