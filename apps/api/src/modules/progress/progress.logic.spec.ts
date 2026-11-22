import {
  achievementsOf,
  addDays,
  type Finish,
  MAX_NOVELOS,
  REFILL_MS,
  refill,
} from './progress.logic.js';

const T0 = new Date('2026-03-10T12:00:00.000Z');
const after = (ms: number) => new Date(T0.getTime() + ms);

describe('refill', () => {
  it('gives nothing before 30 minutes', () => {
    expect(refill(2, T0, after(REFILL_MS - 1))).toEqual({ novelos: 2, at: T0 });
  });

  it('gives one at exactly 30 minutes and moves at by 30 minutes', () => {
    expect(refill(2, T0, after(REFILL_MS))).toEqual({
      novelos: 3,
      at: after(REFILL_MS),
    });
  });

  it('keeps the remainder: 59 minutes gives one and at moves by 30', () => {
    expect(refill(0, T0, after(59 * 60_000))).toEqual({
      novelos: 1,
      at: after(REFILL_MS),
    });
  });

  it('gives several at once', () => {
    expect(refill(0, T0, after(3 * REFILL_MS + 5))).toEqual({
      novelos: 3,
      at: after(3 * REFILL_MS),
    });
  });

  it('caps at 5 and sets at to now once full', () => {
    const now = after(10 * REFILL_MS);
    expect(refill(3, T0, now)).toEqual({ novelos: MAX_NOVELOS, at: now });
  });

  it('is full exactly when the last step lands', () => {
    const now = after(2 * REFILL_MS);
    expect(refill(3, T0, now)).toEqual({ novelos: 5, at: now });
  });

  it('does not reach full one step early', () => {
    expect(refill(3, T0, after(REFILL_MS))).toEqual({
      novelos: 4,
      at: after(REFILL_MS),
    });
  });

  it('a full wallet stays full and at follows now', () => {
    const now = after(1000);
    expect(refill(5, T0, now)).toEqual({ novelos: 5, at: now });
  });

  it('ignores an at in the future (clock skew)', () => {
    expect(refill(1, after(5000), T0)).toEqual({
      novelos: 1,
      at: after(5000),
    });
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

  it('first finish earns primeira_parada at its time, nothing else', () => {
    const f = finish('2026-03-10');
    expect(achievementsOf([f], topics)).toEqual([
      { code: 'primeira_parada', earnedAt: f.completedAt.toISOString() },
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
        'primeira_parada',
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
      'primeira_parada',
      'nenhum_novelo_perdido',
      'primeiro_livro',
    ]);
  });
});
