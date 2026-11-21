import type { Mock } from 'vitest';
import { AiModelError, AiOutputError, type AiService } from '@nestjs/ai';
import { NotFoundException } from '@nestjs/common';
import type { ProgressService } from '../progress/progress.service.js';
import type { PathsRepository } from './paths.repository.js';
import { quoteIsOnPage } from './source-check.js';
import { exercisesOf, type StopDraft, StopsService } from './stops.service.js';
import { exercisesInstructions } from './stop.prompt.js';

vi.mock('./source-check.js', () => ({ quoteIsOnPage: vi.fn() }));

const cardsReply = () => ({
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
});

const draft = (): StopDraft => ({
  escolhaUma: { prompt: 'p', options: ['a', 'b', 'c'], answer: 1, why: 'w' },
  unaOsPares: {
    prompt: 'p',
    pairs: [
      { term: 'a', match: '1' },
      { term: 'b', match: '2' },
      { term: 'c', match: '3' },
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
    rows: { first: 'r0', second: 'r1' },
    columns: { first: 'c0', second: 'c1' },
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
    baskets: { first: 'x', second: 'y' },
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

describe('exercisesOf (repeated choices)', () => {
  const kinds = (d: StopDraft) => exercisesOf(d).map((e) => e.kind);

  it.each<[string, string, (d: StopDraft) => void]>([
    ['escolha_uma', 'options', (d) => (d.escolhaUma.options[2] = 'a')],
    [
      'una_os_pares',
      'matches',
      (d) => (d.unaOsPares.pairs[2].match = d.unaOsPares.pairs[0].match),
    ],
    [
      'una_os_pares',
      'terms differing only in case and spaces',
      (d) => {
        d.unaOsPares.pairs[0].term = 'Termo';
        d.unaOsPares.pairs[1].term = ' termo ';
      },
    ],
    [
      'escolha_a_frase_certa',
      'options',
      (d) => (d.escolhaAFraseCerta!.options[0] = 'c'),
    ],
    ['na_grade', 'item texts', (d) => (d.naGrade!.items[3].text = 'a')],
    [
      'separe_nas_cestas',
      'item texts',
      (d) => (d.separeNasCestas!.items[2].text = 'a'),
    ],
    [
      'toque_no_trecho',
      'segments',
      (d) => (d.toqueNoTrecho!.segments[0] = 'b'),
    ],
    ['ordene', 'steps', (d) => (d.ordene!.steps[2] = 'A')],
  ])(
    'drops %s with the same text in two %s, keeping the others',
    (kind, _, repeat) => {
      const d = full();
      repeat(d);

      const list = kinds(d);
      expect(list).not.toContain(kind);
      expect(list).toHaveLength(10);
    },
  );
});

describe('exercisesOf (complete_a_frase tiles)', () => {
  const kinds = (d: StopDraft) => exercisesOf(d).map((e) => e.kind);

  it('drops it when an answer repeats and its tile is there only once', () => {
    const d = draft();
    d.completeAFrase.answers = ['quê', 'quê'];
    d.completeAFrase.tiles = ['quê', 'y', 'z'];
    expect(kinds(d)).not.toContain('complete_a_frase');
  });

  it('keeps it when the repeated answer has a tile for each gap', () => {
    const d = draft();
    d.completeAFrase.answers = ['quê', 'quê'];
    d.completeAFrase.tiles = ['quê', 'quê', 'z'];
    expect(kinds(d)).toContain('complete_a_frase');
  });
});

describe('exercisesOf (objects back to contract tuples)', () => {
  const find = (kind: string) =>
    exercisesOf(full()).find((e) => e.kind === kind);

  it('una_os_pares: {term, match} becomes [term, match]', () => {
    expect(find('una_os_pares')).toMatchObject({
      pairs: [
        ['a', '1'],
        ['b', '2'],
        ['c', '3'],
      ],
    });
  });

  it('na_grade: rows and columns become [first, second]', () => {
    expect(find('na_grade')).toMatchObject({
      rows: ['r0', 'r1'],
      columns: ['c0', 'c1'],
    });
  });

  it('separe_nas_cestas: baskets become [first, second]', () => {
    expect(find('separe_nas_cestas')).toMatchObject({ baskets: ['x', 'y'] });
  });
});

describe('StopsService', () => {
  const discipline = {
    id: 7,
    name: 'Cálculo',
    topics: ['Limites', 'Derivadas'],
  };
  type Fn = Mock<(...args: any[]) => any>;
  // One mock per step; `ai.generateObject` routes to it by the call's model / instructions.
  let steps: { subject: Fn; cards: Fn; basic: Fn; extra: Fn };
  let ai: { generateObject: Fn };
  let paths: {
    discipline: Fn;
    madeCount: Fn;
    stopCards: Fn;
    saveStopCards: Fn;
    stopContent: Fn;
    saveStopContent: Fn;
    finishStop: Fn;
  };
  let progress: { achievements: Fn };
  let service: StopsService;

  const basicOf = (d: StopDraft) => ({
    escolhaUma: d.escolhaUma,
    unaOsPares: d.unaOsPares,
    verdadeiroOuFalso: d.verdadeiroOuFalso,
    completeAFrase: d.completeAFrase,
  });
  const extraOf = (d: StopDraft) => ({
    monteAFrase: d.monteAFrase,
    escolhaAFraseCerta: d.escolhaAFraseCerta,
    naGrade: d.naGrade,
    separeNasCestas: d.separeNasCestas,
    toqueNoTrecho: d.toqueNoTrecho,
    ordene: d.ordene,
    expliqueParaOArandu: d.expliqueParaOArandu,
  });
  const reply = (object: unknown) => ({ object });
  const outputError = () => new AiOutputError('bad schema', '{}');
  const extraPromptOf = () => steps.extra.mock.calls[0][0].prompt as string;

  beforeEach(() => {
    vi.mocked(quoteIsOnPage).mockReset().mockResolvedValue(true);
    steps = {
      // By default the subject search finds nothing, so a stop falls back to its own search.
      subject: vi.fn().mockResolvedValue(reply({ cards: [] })),
      cards: vi.fn().mockResolvedValue(reply(cardsReply())),
      basic: vi.fn().mockResolvedValue(reply(basicOf(full()))),
      extra: vi.fn().mockResolvedValue(reply(extraOf(full()))),
    };
    ai = {
      generateObject: vi.fn(
        (o: { model?: string; label?: string; instructions: string }) =>
          o.label === 'arandu-subject-cards'
            ? steps.subject(o)
            : o.model === 'web'
              ? steps.cards(o)
              : o.instructions === exercisesInstructions('basic')
                ? steps.basic(o)
                : steps.extra(o),
      ),
    };
    paths = {
      discipline: vi.fn().mockResolvedValue(discipline),
      madeCount: vi.fn().mockResolvedValue(2),
      stopCards: vi.fn().mockResolvedValue(new Map()),
      saveStopCards: vi.fn().mockResolvedValue(undefined),
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

  describe('stop', () => {
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

    it('returns the stored stop inside the made run without calling the model', async () => {
      const stored = { cards: [], exercises: [] };
      paths.stopContent.mockResolvedValue(stored);

      await expect(service.stop(7, 1)).resolves.toBe(stored);
      expect(paths.stopContent).toHaveBeenCalledWith(7, 1, 'Derivadas');
      expect(ai.generateObject).not.toHaveBeenCalled();
    });

    it('404s outside the made run even when content is stored, without generating', async () => {
      paths.madeCount.mockResolvedValue(1);
      paths.stopContent.mockResolvedValue({ cards: [], exercises: [] });

      await expect(service.stop(7, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(ai.generateObject).not.toHaveBeenCalled();
    });

    it('404s when nothing is stored, without generating', async () => {
      await expect(service.stop(7, 0)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(ai.generateObject).not.toHaveBeenCalled();
      expect(paths.saveStopContent).not.toHaveBeenCalled();
    });
  });

  it('make returns the stored stop without calling the model', async () => {
    const stored = { cards: [], exercises: [] };
    paths.stopContent.mockResolvedValue(stored);

    await expect(service.make(7, 0)).resolves.toBe(stored);
    expect(ai.generateObject).not.toHaveBeenCalled();
  });

  it('make with remake generates again over a stored stop', async () => {
    paths.stopContent.mockResolvedValue({ cards: [], exercises: [] });

    const stop = await service.make(7, 0, true);

    expect(steps.basic).toHaveBeenCalledTimes(1);
    expect(paths.saveStopContent).toHaveBeenCalledWith(stop);
    expect(stop.exercises).toHaveLength(4);
  });

  it('generates in two steps, saves, and keeps only verified cards', async () => {
    vi.mocked(quoteIsOnPage).mockImplementation(async (_u, q) => q === 'q2');

    const stop = await service.make(7, 1);

    expect(steps.cards).toHaveBeenCalledTimes(1);
    expect(steps.cards.mock.calls[0][0]).toMatchObject({ model: 'web' });
    expect(steps.basic).toHaveBeenCalledTimes(1);
    expect(steps.extra).toHaveBeenCalledTimes(1);
    expect(steps.basic.mock.calls[0][0].model).toBeUndefined();
    expect(extraPromptOf()).toBe(steps.basic.mock.calls[0][0].prompt);
    expect(stop.cards.map((c) => c.title)).toEqual(['t2']);
    expect(stop.topic).toEqual({ index: 1, text: 'Derivadas', total: 2 });
    expect(stop.exercises).toHaveLength(11);
    expect(paths.saveStopContent).toHaveBeenCalledWith(stop);
  });

  it('writes the exercises from the verified cards only', async () => {
    vi.mocked(quoteIsOnPage).mockImplementation(async (_u, q) => q === 'q2');

    await service.make(7, 1);

    const prompt = extraPromptOf();
    expect(prompt).toContain('Derivadas');
    expect(prompt).toContain('"title":"t2"');
    expect(prompt).not.toContain('t1');
  });

  it('on the first topic makes only the basic exercises call', async () => {
    const stop = await service.make(7, 0);

    expect(steps.extra).not.toHaveBeenCalled();
    expect(steps.basic).toHaveBeenCalledTimes(1);
    expect(stop.exercises).toHaveLength(4);
  });

  it('503s on a later stop when only the 4 basic exercises come back', async () => {
    steps.extra.mockResolvedValue(reply({}));

    await expect(service.make(7, 1)).rejects.toMatchObject({ status: 503 });
    expect(steps.basic).toHaveBeenCalledTimes(2);
    expect(steps.extra).toHaveBeenCalledTimes(2);
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
    steps.extra.mockResolvedValue(reply(extraOf(minus(8))));

    const stop = await service.make(7, 1);

    expect(stop.exercises).toHaveLength(8);
  });

  it('503s on a later stop with 7 consistent exercises', async () => {
    steps.extra.mockResolvedValue(reply(extraOf(minus(7))));

    await expect(service.make(7, 1)).rejects.toMatchObject({ status: 503 });
    expect(paths.saveStopContent).not.toHaveBeenCalled();
  });

  it('retries the exercises once when they are below the minimum, then succeeds', async () => {
    steps.extra
      .mockResolvedValueOnce(reply({}))
      .mockResolvedValueOnce(reply(extraOf(full())));

    const stop = await service.make(7, 1);

    expect(steps.cards).toHaveBeenCalledTimes(1);
    expect(steps.basic).toHaveBeenCalledTimes(2);
    expect(stop.exercises).toHaveLength(11);
  });

  it('retries the cards once when no card verifies, then succeeds', async () => {
    vi.mocked(quoteIsOnPage)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);

    const stop = await service.make(7, 0);

    expect(steps.cards).toHaveBeenCalledTimes(2);
    expect(stop.cards).toHaveLength(2);
  });

  it('503s when no card is ever verified, and writes no exercises', async () => {
    vi.mocked(quoteIsOnPage).mockResolvedValue(false);

    await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
    expect(steps.cards).toHaveBeenCalledTimes(2);
    expect(steps.basic).not.toHaveBeenCalled();
    expect(paths.saveStopContent).not.toHaveBeenCalled();
  });

  it('retries cards after an AiOutputError, then succeeds', async () => {
    steps.cards
      .mockRejectedValueOnce(outputError())
      .mockResolvedValueOnce(reply(cardsReply()));

    const stop = await service.make(7, 0);

    expect(steps.cards).toHaveBeenCalledTimes(2);
    expect(stop.cards).toHaveLength(2);
  });

  it('503s when the cards miss the schema on every attempt', async () => {
    steps.cards.mockRejectedValue(outputError());

    await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
    expect(steps.cards).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['basic', 0],
    ['extra', 1],
  ] as const)(
    'retries after an AiOutputError in the %s exercises, then succeeds',
    async (which, topic) => {
      steps[which].mockRejectedValueOnce(outputError());

      const stop = await service.make(7, topic);

      expect(steps[which]).toHaveBeenCalledTimes(2);
      expect(stop.exercises).toHaveLength(topic === 0 ? 4 : 11);
      expect(paths.saveStopContent).toHaveBeenCalledTimes(1);
    },
  );

  it('503s when the exercises miss the schema on every attempt', async () => {
    steps.basic.mockRejectedValue(outputError());

    await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
    expect(steps.basic).toHaveBeenCalledTimes(2);
    expect(paths.saveStopContent).not.toHaveBeenCalled();
  });

  it.each(['cards', 'basic', 'extra'] as const)(
    'an AiModelError in the %s call propagates without a retry',
    async (which) => {
      const error = new AiModelError([]);
      steps[which].mockRejectedValue(error);

      await expect(service.make(7, 1)).rejects.toBe(error);
      expect(steps[which]).toHaveBeenCalledTimes(1);
      expect(paths.saveStopContent).not.toHaveBeenCalled();
    },
  );

  it('503s when even one basic exercise is inconsistent (all 4 are needed)', async () => {
    const d = basicOf(full());
    d.escolhaUma.answer = 9;
    steps.basic.mockResolvedValue(reply(d));

    await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
    expect(paths.saveStopContent).not.toHaveBeenCalled();
  });

  it('saves the tuple shapes of the contract', async () => {
    const stop = await service.make(7, 1);

    expect(stop.exercises.find((e) => e.kind === 'una_os_pares')).toMatchObject(
      {
        pairs: [
          ['a', '1'],
          ['b', '2'],
          ['c', '3'],
        ],
      },
    );
    expect(stop.exercises.find((e) => e.kind === 'na_grade')).toMatchObject({
      rows: ['r0', 'r1'],
      columns: ['c0', 'c1'],
    });
  });

  it('shares one generation between concurrent calls for the same stop', async () => {
    const [a, b] = await Promise.all([service.make(7, 0), service.make(7, 0)]);

    expect(steps.cards).toHaveBeenCalledTimes(1);
    expect(steps.basic).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  describe('subject cards', () => {
    const topics = Array.from({ length: 14 }, (_, i) => `T${i}`);
    const cardOf = (n: number, title: string) => ({
      title,
      text: 'x',
      source: {
        label: 'l',
        url: `https://a.org/${title}`,
        quote: `q-${title}`,
      },
      topic: n,
    });
    const stored = (title: string) => ({
      title,
      text: 'x',
      source: { label: 'l', url: 'https://a.org/s', quote: 'q' },
    });
    const titles = (cards: { title: string }[]) => cards.map((c) => c.title);
    const subjectCall = () => steps.subject.mock.calls[0][0];
    const savedEntry = (topic: number, ...cardTitles: string[]) => ({
      topic,
      topicText: `T${topic}`,
      cards: cardTitles.map((t) => expect.objectContaining({ title: t })),
    });

    beforeEach(() => {
      paths.discipline.mockResolvedValue({ id: 7, name: 'Cálculo', topics });
    });

    it('uses the stored cards and makes no web call', async () => {
      paths.stopCards.mockResolvedValue(new Map([[1, [stored('s1')]]]));

      const stop = await service.make(7, 1);

      expect(paths.stopCards).toHaveBeenCalledWith(7, topics);
      expect(steps.subject).not.toHaveBeenCalled();
      expect(steps.cards).not.toHaveBeenCalled();
      expect(paths.saveStopCards).not.toHaveBeenCalled();
      expect(titles(stop.cards)).toEqual(['s1']);
    });

    it("saves every block topic with a verified card and returns this topic's", async () => {
      steps.subject.mockResolvedValue(
        reply({ cards: [cardOf(2, 'a'), cardOf(3, 'b'), cardOf(3, 'c')] }),
      );

      const stop = await service.make(7, 1);

      expect(subjectCall()).toMatchObject({
        model: 'web',
        label: 'arandu-subject-cards',
      });
      expect(subjectCall().prompt).toBe(
        'Subject: Cálculo\nTopics:\n1. T0\n2. T1\n3. T2\n4. T3\n5. T4\n6. T5',
      );
      expect(steps.cards).not.toHaveBeenCalled();
      expect(paths.saveStopCards).toHaveBeenCalledWith(7, [
        savedEntry(1, 'a'),
        savedEntry(2, 'b', 'c'),
      ]);
      expect(titles(stop.cards)).toEqual(['a']);
      expect(stop.cards[0]).not.toHaveProperty('topic');
    });

    it('starts topic 7 at its block start 6', async () => {
      // numbers count the listed topics: 2 is T7
      steps.subject.mockResolvedValue(reply({ cards: [cardOf(2, 'a')] }));

      const stop = await service.make(7, 7);

      expect(subjectCall().prompt).toBe(
        'Subject: Cálculo\nTopics:\n1. T6\n2. T7\n3. T8\n4. T9\n5. T10\n6. T11',
      );
      expect(paths.saveStopCards).toHaveBeenCalledWith(7, [savedEntry(7, 'a')]);
      expect(titles(stop.cards)).toEqual(['a']);
    });

    it('drops cards with an unverified quote or a topic number outside the block', async () => {
      vi.mocked(quoteIsOnPage).mockImplementation(
        async (_u, q) => q !== 'q-bad',
      );
      steps.subject.mockResolvedValue(
        reply({
          cards: [
            cardOf(1, 'bad'),
            cardOf(1, 'good'),
            cardOf(0, 'zero'),
            cardOf(7, 'seven'),
          ],
        }),
      );

      const stop = await service.make(7, 0);

      expect(paths.saveStopCards).toHaveBeenCalledWith(7, [
        savedEntry(0, 'good'),
      ]);
      expect(titles(stop.cards)).toEqual(['good']);
    });

    it('keeps at most 3 verified cards per topic', async () => {
      steps.subject.mockResolvedValue(
        reply({ cards: [1, 2, 3, 4].map((n) => cardOf(1, `c${n}`)) }),
      );

      const stop = await service.make(7, 0);

      expect(titles(stop.cards)).toEqual(['c1', 'c2', 'c3']);
    });

    it("falls back to the topic's own search when it got no verified card, keeping the others saved", async () => {
      steps.subject.mockResolvedValue(reply({ cards: [cardOf(2, 'other')] }));

      const stop = await service.make(7, 0);

      expect(paths.saveStopCards).toHaveBeenCalledWith(7, [
        savedEntry(1, 'other'),
      ]);
      expect(steps.cards).toHaveBeenCalledTimes(1);
      expect(steps.cards.mock.calls[0][0]).toMatchObject({ model: 'web' });
      expect(titles(stop.cards)).toEqual(['t1', 't2']);
    });

    it("falls back to the topic's own search after an AiOutputError", async () => {
      steps.subject.mockRejectedValue(outputError());

      const stop = await service.make(7, 0);

      expect(steps.subject).toHaveBeenCalledTimes(1);
      expect(paths.saveStopCards).not.toHaveBeenCalled();
      expect(steps.cards).toHaveBeenCalledTimes(1);
      expect(stop.cards).toHaveLength(2);
    });

    it('the fallback still retries once, then 503s', async () => {
      steps.cards.mockRejectedValue(outputError());

      await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
      expect(steps.cards).toHaveBeenCalledTimes(2);
    });

    it("a provider error in the subject call falls back to the topic's own search", async () => {
      steps.subject.mockRejectedValue(new AiModelError([]));

      const stop = await service.make(7, 0);

      expect(steps.subject).toHaveBeenCalledTimes(1);
      expect(paths.saveStopCards).not.toHaveBeenCalled();
      expect(steps.cards).toHaveBeenCalledTimes(1);
      expect(stop.cards).toHaveLength(2);
    });

    it("an AiModelError from the topic's own search still propagates", async () => {
      const error = new AiModelError([]);
      steps.subject.mockRejectedValue(new AiModelError([]));
      steps.cards.mockRejectedValue(error);

      await expect(service.make(7, 0)).rejects.toBe(error);
      expect(steps.cards).toHaveBeenCalledTimes(1);
      expect(paths.saveStopContent).not.toHaveBeenCalled();
    });

    it('searches the block once: with one of its topics stored, an uncovered topic goes to its own search', async () => {
      paths.stopCards.mockResolvedValue(new Map([[3, [stored('s3')]]]));

      const stop = await service.make(7, 1);

      expect(steps.subject).not.toHaveBeenCalled();
      expect(paths.saveStopCards).not.toHaveBeenCalled();
      expect(steps.cards).toHaveBeenCalledTimes(1);
      expect(titles(stop.cards)).toEqual(['t1', 't2']);
    });

    it('asks for 900 output tokens per block topic', async () => {
      await service.make(7, 7);

      expect(subjectCall().maxOutputTokens).toBe(5400);
    });
  });

  describe('finish', () => {
    beforeEach(() => {
      paths.stopContent.mockResolvedValue({ cards: [], exercises: [] });
    });

    it('404s for a topic out of range and writes nothing', async () => {
      await expect(service.finish('u', 7, 2, 0)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(paths.finishStop).not.toHaveBeenCalled();
    });

    it('404s when the stop content is not stored, before writing anything', async () => {
      paths.stopContent.mockResolvedValue(null);

      await expect(service.finish('u', 7, 1, 0)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(paths.stopContent).toHaveBeenCalledWith(7, 1, 'Derivadas');
      expect(progress.achievements).not.toHaveBeenCalled();
      expect(paths.finishStop).not.toHaveBeenCalled();
    });

    it('404s for a stop outside the made run and writes nothing', async () => {
      paths.madeCount.mockResolvedValue(1);

      await expect(service.finish('u', 7, 1, 0)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(paths.finishStop).not.toHaveBeenCalled();
    });

    it('records the result for a valid topic', async () => {
      await service.finish('u', 7, 1, 3);

      expect(paths.finishStop).toHaveBeenCalledWith('u', 7, 1, 3, null);
    });

    it('passes the relampago mistakes on', async () => {
      await service.finish('u', 7, 1, 3, 0);

      expect(paths.finishStop).toHaveBeenCalledWith('u', 7, 1, 3, 0);
    });

    const earned = (...codes: string[]) =>
      codes.map((code) => ({ code, earnedAt: '2026-01-01T00:00:00.000Z' }));

    it('returns only the achievements earned by this finish', async () => {
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

    it('on a replay (sabedoria 0) returns no achievements and skips the second read', async () => {
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

    it('does not read achievements for a topic out of range', async () => {
      await expect(service.finish('u', 7, 2, 0)).rejects.toThrow();
      expect(progress.achievements).not.toHaveBeenCalled();
    });
  });
});
