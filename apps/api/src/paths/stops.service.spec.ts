import { NotFoundException } from '@nestjs/common';
import type { AiService } from '@nestjs/ai';
import type { ProgressService } from '../progress/progress.service.js';
import type { PathsRepository } from './paths.repository.js';
import { quoteIsOnPage } from './source-check.js';
import { exercisesOf, type StopDraft, StopsService } from './stops.service.js';

vi.mock('./source-check.js', () => ({ quoteIsOnPage: vi.fn() }));

const draft = (): StopDraft => ({
  cards: [
    {
      title: 't1',
      text: 'x',
      source: { label: 'l', url: 'https://a.org/1', quote: 'q1' },
    },
    {
      title: 't2',
      text: 'x',
      source: { label: 'l', url: 'https://a.org/2', quote: 'q2' },
    },
  ],
  escolhaUma: { prompt: 'p', options: ['a', 'b', 'c'], answer: 1, why: 'w' },
  unaOsPares: {
    prompt: 'p',
    pairs: [
      ['a', '1'],
      ['b', '2'],
      ['c', '3'],
    ],
    why: 'w',
  },
  verdadeiroOuFalso: {
    statements: [
      { text: 'a', answer: true, why: 'w' },
      { text: 'b', answer: false, why: 'w' },
      { text: 'c', answer: true, why: 'w' },
    ],
    why: 'w',
  },
  completeAFrase: {
    text: 'A ___ e o ___',
    tiles: ['x', 'y', 'z'],
    answers: ['x', 'y'],
    why: 'w',
  },
});

const full = (): StopDraft => ({
  ...draft(),
  monteAFrase: {
    prompt: 'p',
    answer: ['a', 'b', 'c'],
    distractors: ['d'],
    why: 'w',
  },
  escolhaAFraseCerta: {
    prompt: 'p',
    options: ['a', 'b', 'c'],
    answer: 2,
    why: 'w',
  },
  naGrade: {
    prompt: 'p',
    rows: ['r0', 'r1'],
    columns: ['c0', 'c1'],
    items: [
      { text: 'a', row: 0, column: 0 },
      { text: 'b', row: 0, column: 1 },
      { text: 'c', row: 1, column: 0 },
      { text: 'd', row: 1, column: 1 },
    ],
    why: 'w',
  },
  separeNasCestas: {
    prompt: 'p',
    baskets: ['x', 'y'],
    items: [
      { text: 'a', basket: 0 },
      { text: 'b', basket: 1 },
      { text: 'c', basket: 0 },
      { text: 'd', basket: 1 },
    ],
    why: 'w',
  },
  toqueNoTrecho: {
    prompt: 'p',
    segments: ['a', 'b', 'c'],
    answer: 1,
    why: 'w',
  },
  ordene: { prompt: 'p', steps: ['a', 'b', 'c'], why: 'w' },
  expliqueParaOArandu: { prompt: 'p', ideas: ['i1', 'i2'], why: 'w' },
});

describe('exercisesOf (all kinds)', () => {
  const kinds = (d: StopDraft) => exercisesOf(d).map((e) => e.kind);

  it('keeps all 11 kinds in order, with their mode', () => {
    const list = exercisesOf(full());

    expect(list.map((e) => e.kind)).toEqual([
      'escolha_uma',
      'una_os_pares',
      'verdadeiro_ou_falso',
      'complete_a_frase',
      'monte_a_frase',
      'escolha_a_frase_certa',
      'na_grade',
      'separe_nas_cestas',
      'toque_no_trecho',
      'ordene',
      'explique_para_o_arandu',
    ]);
    expect(
      list.filter((e) => e.mode === 'produzir').map((e) => e.kind),
    ).toEqual(['monte_a_frase', 'ordene', 'explique_para_o_arandu']);
    expect(list.every((e) => e.why === 'w')).toBe(true);
  });

  it('maps grid items to a [row, column] cell', () => {
    const grid = exercisesOf(full()).find((e) => e.kind === 'na_grade');

    expect(grid?.kind === 'na_grade' && grid.items[1]).toEqual({
      text: 'b',
      cell: [0, 1],
    });
  });

  it('a draft without the extra kinds keeps just the four', () => {
    expect(kinds(draft())).toHaveLength(4);
  });

  it.each([-1, 3])('drops escolha_a_frase_certa with answer %i', (answer) => {
    const d = full();
    d.escolhaAFraseCerta!.answer = answer;
    expect(kinds(d)).not.toContain('escolha_a_frase_certa');
  });

  it.each([-1, 2])('drops na_grade with an item row %i', (row) => {
    const d = full();
    d.naGrade!.items[0].row = row;
    expect(kinds(d)).not.toContain('na_grade');
  });

  it.each([-1, 2])('drops na_grade with an item column %i', (column) => {
    const d = full();
    d.naGrade!.items[0].column = column;
    expect(kinds(d)).not.toContain('na_grade');
  });

  it.each([-1, 2])('drops separe_nas_cestas with basket %i', (basket) => {
    const d = full();
    d.separeNasCestas!.items[0].basket = basket;
    expect(kinds(d)).not.toContain('separe_nas_cestas');
  });

  it.each([-1, 3])('drops toque_no_trecho with answer %i', (answer) => {
    const d = full();
    d.toqueNoTrecho!.answer = answer;
    expect(kinds(d)).not.toContain('toque_no_trecho');
  });

  it('dropping one kind keeps the others', () => {
    const d = full();
    d.toqueNoTrecho!.answer = 9;
    expect(kinds(d)).toHaveLength(10);
  });
});

describe('exercisesOf', () => {
  const kinds = (d: StopDraft) => exercisesOf(d).map((e) => e.kind);

  it('keeps all four consistent exercises', () => {
    expect(kinds(draft())).toEqual([
      'escolha_uma',
      'una_os_pares',
      'verdadeiro_ou_falso',
      'complete_a_frase',
    ]);
  });

  it.each([-1, 3, 9])('drops escolha_uma with answer %i', (answer) => {
    const d = draft();
    d.escolhaUma.answer = answer;
    expect(kinds(d)).not.toContain('escolha_uma');
  });

  it('drops complete_a_frase when gaps and answers differ in count', () => {
    const d = draft();
    d.completeAFrase.answers = ['x'];
    expect(kinds(d)).not.toContain('complete_a_frase');
  });

  it('drops complete_a_frase when an answer is not in the tiles', () => {
    const d = draft();
    d.completeAFrase.answers = ['x', 'nope'];
    expect(kinds(d)).not.toContain('complete_a_frase');
  });
});

describe('StopsService', () => {
  const discipline = {
    id: 7,
    name: 'Cálculo',
    topics: ['Limites', 'Derivadas'],
  };
  let ai: { generateObject: ReturnType<typeof vi.fn> };
  let paths: {
    discipline: ReturnType<typeof vi.fn>;
    stopContent: ReturnType<typeof vi.fn>;
    saveStopContent: ReturnType<typeof vi.fn>;
    finishStop: ReturnType<typeof vi.fn>;
  };
  let progress: { achievements: ReturnType<typeof vi.fn> };
  let service: StopsService;

  beforeEach(() => {
    vi.mocked(quoteIsOnPage).mockReset().mockResolvedValue(true);
    ai = { generateObject: vi.fn().mockResolvedValue({ object: draft() }) };
    paths = {
      discipline: vi.fn().mockResolvedValue(discipline),
      stopContent: vi.fn().mockResolvedValue(null),
      saveStopContent: vi.fn().mockResolvedValue(undefined),
      finishStop: vi
        .fn()
        .mockResolvedValue({ sabedoria: 15, peixinhos: 5, patinha: true }),
    };
    progress = { achievements: vi.fn().mockResolvedValue([]) };
    service = new StopsService(
      ai as unknown as AiService,
      paths as unknown as PathsRepository,
      progress as unknown as ProgressService,
    );
  });

  it.each([
    ['an unknown subject', null, 0],
    ['a topic out of range', discipline, 2],
  ])('404s for %s without calling the model', async (_, found, topic) => {
    paths.discipline.mockResolvedValue(found);

    await expect(service.stop(7, topic)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(ai.generateObject).not.toHaveBeenCalled();
  });

  it('returns the stored stop without calling the model', async () => {
    const stored = { cards: [], exercises: [] };
    paths.stopContent.mockResolvedValue(stored);

    await expect(service.stop(7, 0)).resolves.toBe(stored);
    expect(ai.generateObject).not.toHaveBeenCalled();
  });

  it('generates with the web model, saves, and keeps only verified cards', async () => {
    vi.mocked(quoteIsOnPage).mockImplementation(async (_u, q) => q === 'q2');
    ai.generateObject.mockResolvedValue({ object: full() });

    const stop = await service.stop(7, 1);

    expect(ai.generateObject).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'web' }),
    );
    expect(stop.cards.map((c) => c.title)).toEqual(['t2']);
    expect(stop.topic).toEqual({ index: 1, text: 'Derivadas', total: 2 });
    expect(stop.exercises).toHaveLength(11);
    expect(paths.saveStopContent).toHaveBeenCalledWith(stop);
  });

  it('503s on a later stop when only the 4 basic exercises come back', async () => {
    ai.generateObject.mockResolvedValue({ object: draft() });

    await expect(service.stop(7, 1)).rejects.toMatchObject({ status: 503 });
    expect(paths.saveStopContent).not.toHaveBeenCalled();
  });

  const minus = (n: number) => {
    const d = full();
    d.toqueNoTrecho!.answer = 9;
    d.ordene = undefined;
    d.expliqueParaOArandu = undefined;
    if (n >= 8) return d;
    d.separeNasCestas!.items[0].basket = 5;
    return d;
  };

  it('keeps a later stop with exactly 8 consistent exercises', async () => {
    ai.generateObject.mockResolvedValue({ object: minus(8) });

    const stop = await service.stop(7, 1);

    expect(stop.exercises).toHaveLength(8);
  });

  it('503s on a later stop with 7 consistent exercises', async () => {
    ai.generateObject.mockResolvedValue({ object: minus(7) });

    await expect(service.stop(7, 1)).rejects.toMatchObject({ status: 503 });
  });

  it('retries once when no card verifies, then succeeds', async () => {
    vi.mocked(quoteIsOnPage)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);

    const stop = await service.stop(7, 0);

    expect(ai.generateObject).toHaveBeenCalledTimes(2);
    expect(stop.cards).toHaveLength(2);
  });

  it('503s when no card is ever verified, and saves nothing', async () => {
    vi.mocked(quoteIsOnPage).mockResolvedValue(false);

    await expect(service.stop(7, 0)).rejects.toMatchObject({ status: 503 });
    expect(ai.generateObject).toHaveBeenCalledTimes(2);
    expect(paths.saveStopContent).not.toHaveBeenCalled();
  });

  it('503s when even one exercise is inconsistent (all 4 are needed)', async () => {
    const d = draft();
    d.escolhaUma.answer = 9;
    ai.generateObject.mockResolvedValue({ object: d });

    await expect(service.stop(7, 0)).rejects.toMatchObject({ status: 503 });
    expect(paths.saveStopContent).not.toHaveBeenCalled();
  });

  it('shares one generation between concurrent calls for the same stop', async () => {
    const [a, b] = await Promise.all([service.stop(7, 0), service.stop(7, 0)]);

    expect(ai.generateObject).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('finish 404s for a topic out of range and writes nothing', async () => {
    await expect(service.finish('u', 7, 2, 0)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(paths.finishStop).not.toHaveBeenCalled();
  });

  it('finish records the result for a valid topic', async () => {
    await service.finish('u', 7, 1, 3);

    expect(paths.finishStop).toHaveBeenCalledWith('u', 7, 1, 3, null);
  });

  it('finish passes the relampago mistakes on', async () => {
    await service.finish('u', 7, 1, 3, 0);

    expect(paths.finishStop).toHaveBeenCalledWith('u', 7, 1, 3, 0);
  });

  const earned = (...codes: string[]) =>
    codes.map((code) => ({ code, earnedAt: '2026-01-01T00:00:00.000Z' }));

  it('finish returns only the achievements earned by this finish', async () => {
    progress.achievements
      .mockResolvedValueOnce(earned('primeira_parada'))
      .mockResolvedValueOnce(
        earned('primeira_parada', 'nenhum_novelo_perdido'),
      );

    const result = await service.finish('u', 7, 1, 0);

    expect(result).toEqual({
      sabedoria: 15,
      peixinhos: 5,
      patinha: true,
      achievements: ['nenhum_novelo_perdido'],
    });
  });

  it('finish on a replay (sabedoria 0) returns no achievements and skips the second read', async () => {
    paths.finishStop.mockResolvedValue({
      sabedoria: 0,
      peixinhos: 0,
      patinha: false,
    });
    progress.achievements.mockResolvedValue(earned('primeira_parada'));

    const result = await service.finish('u', 7, 1, 0);

    expect(result.achievements).toEqual([]);
    expect(progress.achievements).toHaveBeenCalledTimes(1);
  });

  it('finish does not read achievements for a topic out of range', async () => {
    await expect(service.finish('u', 7, 2, 0)).rejects.toThrow();
    expect(progress.achievements).not.toHaveBeenCalled();
  });
});
