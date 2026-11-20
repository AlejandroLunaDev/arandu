import { NotFoundException } from '@nestjs/common';
import type { AiService } from '@nestjs/ai';
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
  },
  completeAFrase: {
    text: 'A ___ e o ___',
    tiles: ['x', 'y', 'z'],
    answers: ['x', 'y'],
    why: 'w',
  },
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
  let service: StopsService;

  beforeEach(() => {
    vi.mocked(quoteIsOnPage).mockReset().mockResolvedValue(true);
    ai = { generateObject: vi.fn().mockResolvedValue({ object: draft() }) };
    paths = {
      discipline: vi.fn().mockResolvedValue(discipline),
      stopContent: vi.fn().mockResolvedValue(null),
      saveStopContent: vi.fn().mockResolvedValue(undefined),
      finishStop: vi.fn().mockResolvedValue({ sabedoria: 15 }),
    };
    service = new StopsService(
      ai as unknown as AiService,
      paths as unknown as PathsRepository,
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

    const stop = await service.stop(7, 1);

    expect(ai.generateObject).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'web' }),
    );
    expect(stop.cards.map((c) => c.title)).toEqual(['t2']);
    expect(stop.topic).toEqual({ index: 1, text: 'Derivadas', total: 2 });
    expect(stop.exercises).toHaveLength(4);
    expect(paths.saveStopContent).toHaveBeenCalledWith(stop);
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

    expect(paths.finishStop).toHaveBeenCalledWith('u', 7, 1, 3);
  });
});
