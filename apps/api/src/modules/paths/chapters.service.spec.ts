import type { Lesson, LessonExercise } from '@arandu/contracts';
import type { Mock } from 'vitest';
import { AiModelError, AiOutputError, type AiService } from '@nestjs/ai';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../core/config/env.js';
import { CONTINUE_PRICE, LESSON_PRICE } from '../progress/progress.logic.js';
import type { ProgressRepository } from '../progress/progress.repository.js';
import type { ProgressService } from '../progress/progress.service.js';
import { ChaptersService } from './chapters.service.js';
import { composeChapter, composeLesson } from './composer.js';
import { type Page, searchPages } from './firecrawl.js';
import type { PathsRepository } from './paths.repository.js';
import { type PiecesDraft, piecesOf, type StoredChapter } from './pieces.js';

vi.mock('./firecrawl.js', () => ({ searchPages: vi.fn() }));

const LONG = 'l'.repeat(301);
const academic: Page = {
  url: 'https://a.org/1',
  title: 'Página acadêmica',
  markdown: `# Limites\n\nO **limite** descreve q1. Também q-a, q-b, q-c, q-good, q-other, q-zero, q-seven, q-c1, q-c2, q-c3, q-c4. ${LONG}`,
};
const wiki: Page = {
  url: 'https://pt.wikipedia.org/wiki/Limite',
  title: 'Limite – Wikipédia',
  markdown: 'Na matemática, w1.',
};
const sourceOf = (page: Page, quote: string) => ({
  label: page.title,
  url: page.url,
  quote,
});

const cardsReply = () => ({
  cards: [
    { title: 't1', text: 'x', page: 1, quote: 'q1' },
    { title: 't2', text: 'x', page: 2, quote: 'w1' },
    { title: 't3', text: 'x', page: 1, quote: 'q-a' },
  ],
});

const piecesReply = (): PiecesDraft => ({
  concepts: [
    { term: 'Limite', definition: 'O valor de que uma função se aproxima.' },
    { term: 'Derivada', definition: 'A taxa de variação instantânea.' },
    { term: 'Integral', definition: 'A área sob uma curva.' },
    { term: 'Continuidade', definition: 'Quando o gráfico não tem saltos.' },
  ],
  statements: [
    {
      right: 'A derivada mede a taxa de variação de uma função',
      wrong: 'A derivada mede a área sob uma função',
      why: 'w',
    },
    {
      right: 'Uma função contínua não tem saltos no gráfico',
      wrong: 'Uma função contínua tem muitos saltos no gráfico',
      why: 'w',
    },
    {
      right: 'O limite descreve o valor de que a função se aproxima',
      wrong: 'O limite descreve o valor de que a função se afasta',
      why: 'w',
    },
  ],
  classification: [],
  sequence: [
    {
      prompt: 'Ordene os passos.',
      steps: ['Escrever a função', 'Calcular o limite', 'Interpretar'],
      why: 'w',
    },
  ],
  sentence: [],
  question: {
    prompt: 'O que é um limite?',
    ideas: ['aproximação', 'valor'],
    why: 'w',
  },
  cases: [
    {
      situation: 'Um carro chega cada vez mais perto de um sinal.',
      term: 'Limite',
      why: 'w',
    },
  ],
  problems: [],
  code: [],
});

describe('ChaptersService', () => {
  const discipline = {
    id: 7,
    name: 'Cálculo',
    topics: ['Limites', 'Derivadas'],
  };
  type Step = Mock<
    (call: {
      label?: string;
      instructions?: string;
      prompt?: string;
      maxOutputTokens?: number;
    }) => unknown
  >;
  type Fn = Mock<(...args: never[]) => unknown>;
  // One mock per model call; `ai.generateObject` routes to it by the call's label.
  let steps: { subject: Step; cards: Step; practice: Step; pieces: Step };
  let ai: { generateObject: Step };
  let paths: Record<
    | 'discipline'
    | 'madeCount'
    | 'chapterCards'
    | 'saveChapterCards'
    | 'chapterContent'
    | 'saveChapterContent'
    | 'subjectPieces'
    | 'finishChapter'
    | 'lessons'
    | 'chapterFinished'
    | 'finishLesson',
    Fn
  >;
  let progress: { achievements: Fn };
  let wallet: { pay: Fn };
  let config: { get: Mock<() => string | undefined> };
  let service: ChaptersService;

  const reply = (object: unknown) => ({ object });
  const outputError = () => new AiOutputError('bad schema', '{}');
  const promptOf = (step: Step) => step.mock.calls[0]![0].prompt!;
  const saved = () =>
    paths.saveChapterContent.mock.calls[0]![0] as unknown as StoredChapter;

  beforeEach(() => {
    vi.mocked(searchPages)
      .mockReset()
      .mockImplementation(async (_key, _query, _limit, wikipedia) =>
        wikipedia ? [wiki] : [academic],
      );
    steps = {
      // By default the block search verifies nothing, so a chapter falls back to its own search.
      subject: vi.fn().mockResolvedValue(reply({ cards: [] })),
      cards: vi.fn().mockResolvedValue(reply(cardsReply())),
      practice: vi.fn().mockResolvedValue(reply({ problems: [], code: [] })),
      pieces: vi.fn().mockResolvedValue(reply(piecesReply())),
    };
    ai = {
      generateObject: vi.fn((o) =>
        o.label === 'arandu-subject-cards'
          ? steps.subject(o)
          : o.label === 'arandu-chapter-cards'
            ? steps.cards(o)
            : o.label === 'arandu-chapter-practice'
              ? steps.practice(o)
              : steps.pieces(o),
      ),
    };
    paths = {
      discipline: vi.fn().mockResolvedValue(discipline),
      madeCount: vi.fn().mockResolvedValue(2),
      chapterCards: vi.fn().mockResolvedValue(new Map()),
      saveChapterCards: vi.fn().mockResolvedValue(undefined),
      chapterContent: vi.fn().mockResolvedValue(null),
      saveChapterContent: vi.fn().mockResolvedValue(undefined),
      subjectPieces: vi.fn().mockResolvedValue([]),
      finishChapter: vi
        .fn()
        .mockResolvedValue({ sabedoria: 15, peixinhos: 5, patinha: true }),
      lessons: vi.fn().mockResolvedValue([]),
      chapterFinished: vi.fn().mockResolvedValue(false),
      finishLesson: vi.fn().mockResolvedValue({
        sabedoria: 4,
        patinha: false,
        caixaId: 1,
        chapterDone: false,
      }),
    };
    progress = { achievements: vi.fn().mockResolvedValue([]) };
    wallet = { pay: vi.fn().mockResolvedValue({}) };
    config = { get: vi.fn(() => 'fc-key') };
    service = new ChaptersService(
      ai as unknown as AiService,
      paths as unknown as PathsRepository,
      progress as unknown as ProgressService,
      config as unknown as ConfigService<Env, true>,
      wallet as unknown as ProgressRepository,
    );
  });

  describe('chapter', () => {
    it.each([
      ['an unknown subject', null, 0],
      ['a topic out of range', discipline, 2],
    ])('404s for %s without calling the model', async (_, found, topic) => {
      paths.discipline.mockResolvedValue(found);

      await expect(service.chapter(7, topic)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(ai.generateObject).not.toHaveBeenCalled();
    });

    it("returns the stored chapter inside the made run without its pieces, composed with the subject's other chapters", async () => {
      const pieces = piecesOf(piecesReply());
      const earlier = { topic: 0, pieces };
      const stored = {
        discipline: { id: 7, name: 'Cálculo' },
        topic: { index: 1, text: 'Derivadas', total: 2 },
        cards: [],
        exercises: [],
      };
      paths.chapterContent.mockResolvedValue({ ...stored, pieces });
      paths.subjectPieces.mockResolvedValue([earlier, { topic: 1, pieces }]);

      await expect(service.chapter(7, 1)).resolves.toEqual({
        ...stored,
        exercises: composeChapter({ topic: 1, pieces }, '7:1', [earlier]),
      });
      expect(paths.chapterContent).toHaveBeenCalledWith(7, 1, 'Derivadas');
      expect(ai.generateObject).not.toHaveBeenCalled();
    });

    it('404s outside the made run even when content is stored, without generating', async () => {
      paths.madeCount.mockResolvedValue(1);
      paths.chapterContent.mockResolvedValue({ cards: [], exercises: [] });

      await expect(service.chapter(7, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(ai.generateObject).not.toHaveBeenCalled();
    });

    it('404s when nothing is stored, without generating', async () => {
      await expect(service.chapter(7, 0)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(ai.generateObject).not.toHaveBeenCalled();
      expect(paths.saveChapterContent).not.toHaveBeenCalled();
    });
  });

  it('make returns the stored chapter without searching or calling the model', async () => {
    const stored = { cards: [], exercises: [] };
    paths.chapterContent.mockResolvedValue(stored);

    await expect(service.make(7, 0)).resolves.toBe(stored);
    expect(searchPages).not.toHaveBeenCalled();
    expect(ai.generateObject).not.toHaveBeenCalled();
  });

  it('make with remake writes the pieces again over a stored chapter', async () => {
    paths.chapterContent.mockResolvedValue({ cards: [], exercises: [] });

    const chapter = await service.make(7, 0, true);

    expect(steps.pieces).toHaveBeenCalledTimes(1);
    expect(paths.saveChapterContent).toHaveBeenCalledWith(chapter);
  });

  it("a remake keeps the chapter's cards and adds a search's, saving them for the topic", async () => {
    const own = {
      title: 'own',
      text: 'x',
      source: { label: 'l', url: 'https://b.org/1', quote: 'o' },
    };
    paths.chapterContent.mockResolvedValue({ cards: [own], exercises: [] });

    const chapter = await service.make(7, 0, true);

    expect(chapter.cards.map((c) => c.title)).toEqual([
      'own',
      't1',
      't2',
      't3',
    ]);
    expect(paths.saveChapterCards).toHaveBeenLastCalledWith(7, [
      { topic: 0, topicText: 'Limites', cards: chapter.cards },
    ]);
  });

  describe('sources', () => {
    it("searches the topic's academic pages, then Wikipedia's, and cites the page each quote is on", async () => {
      const chapter = await service.make(7, 0);

      expect(searchPages).toHaveBeenCalledWith(
        'fc-key',
        'Cálculo Limites',
        5,
        false,
      );
      expect(searchPages).toHaveBeenCalledWith(
        'fc-key',
        'Cálculo Limites',
        5,
        true,
      );
      expect(promptOf(steps.cards)).toContain(
        `[Page 1] Página acadêmica (https://a.org/1)\n${academic.markdown}`,
      );
      expect(promptOf(steps.cards)).toContain(
        '[Page 2, Wikipedia] Limite – Wikipédia (https://pt.wikipedia.org/wiki/Limite)',
      );
      expect(chapter.cards).toEqual([
        { title: 't1', text: 'x', source: sourceOf(academic, 'q1') },
        { title: 't2', text: 'x', source: sourceOf(wiki, 'w1') },
        { title: 't3', text: 'x', source: sourceOf(academic, 'q-a') },
      ]);
    });

    it('drops a card whose quote is not on its page, names a page not given, or is too long', async () => {
      steps.cards.mockResolvedValue(
        reply({
          cards: [
            { title: 'ok', text: 'x', page: 1, quote: 'O limite descreve q1.' },
            { title: 'elsewhere', text: 'x', page: 2, quote: 'q1' },
            { title: 'invented', text: 'x', page: 1, quote: 'não está' },
            { title: 'no page', text: 'x', page: 3, quote: 'q1' },
            { title: 'long', text: 'x', page: 1, quote: LONG },
            { title: 'b', text: 'x', page: 1, quote: 'q-b' },
            { title: 'c', text: 'x', page: 1, quote: 'q-c' },
          ],
        }),
      );

      const chapter = await service.make(7, 0);

      expect(chapter.cards.map((c) => c.title)).toEqual(['ok', 'b', 'c']);
    });

    it('lists a page both searches found once', async () => {
      vi.mocked(searchPages).mockResolvedValue([academic]);
      steps.cards.mockResolvedValue(
        reply({
          cards: ['q1', 'q-a', 'q-b'].map((quote) => ({
            title: quote,
            text: 'x',
            page: 1,
            quote,
          })),
        }),
      );

      await service.make(7, 0);

      expect(promptOf(steps.cards)).not.toContain('[Page 2');
    });

    it('retries the cards once when no card verifies, then succeeds', async () => {
      steps.cards
        .mockResolvedValueOnce(
          reply({ cards: [{ title: 'x', text: 'x', page: 1, quote: 'não' }] }),
        )
        .mockResolvedValueOnce(reply(cardsReply()));

      const chapter = await service.make(7, 0);

      expect(steps.cards).toHaveBeenCalledTimes(2);
      expect(chapter.cards).toHaveLength(3);
    });

    it("keeps the cards a first attempt verified and adds the retry's, each quote once", async () => {
      steps.cards
        .mockResolvedValueOnce(
          reply({ cards: [{ title: 't1', text: 'x', page: 1, quote: 'q1' }] }),
        )
        .mockResolvedValueOnce(reply(cardsReply()));

      const chapter = await service.make(7, 0);

      expect(chapter.cards.map((c) => c.title)).toEqual(['t1', 't2', 't3']);
    });

    it('503s when fewer than three cards verify after the retry, and writes no pieces', async () => {
      steps.cards.mockResolvedValue(
        reply({ cards: cardsReply().cards.slice(0, 2) }),
      );

      await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
      expect(steps.cards).toHaveBeenCalledTimes(2);
      expect(steps.pieces).not.toHaveBeenCalled();
    });

    it('retries the cards after an AiOutputError, then succeeds', async () => {
      steps.cards
        .mockRejectedValueOnce(outputError())
        .mockResolvedValueOnce(reply(cardsReply()));

      await expect(service.make(7, 0)).resolves.toBeDefined();
      expect(steps.cards).toHaveBeenCalledTimes(2);
    });

    it('503s when no card ever verifies, and writes no pieces', async () => {
      steps.cards.mockResolvedValue(
        reply({ cards: [{ title: 'x', text: 'x', page: 1, quote: 'não' }] }),
      );

      await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
      expect(steps.cards).toHaveBeenCalledTimes(2);
      expect(steps.pieces).not.toHaveBeenCalled();
      expect(paths.saveChapterContent).not.toHaveBeenCalled();
    });

    it('503s when the searches find no page, without calling the model', async () => {
      vi.mocked(searchPages).mockResolvedValue([]);

      await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
      expect(ai.generateObject).not.toHaveBeenCalled();
    });

    it('fails without searching when FIRECRAWL_API_KEY is not set', async () => {
      config.get.mockReturnValue(undefined);

      await expect(service.make(7, 0)).rejects.toThrow('FIRECRAWL_API_KEY');
      expect(searchPages).not.toHaveBeenCalled();
      expect(paths.saveChapterContent).not.toHaveBeenCalled();
    });
  });

  describe('pieces', () => {
    it('writes them from the verified cards and stores them with the composed exercises', async () => {
      await service.make(7, 0);

      expect(promptOf(steps.pieces)).toBe(
        'Subject: Cálculo\nTopic 1 of 2: Limites\n\nCards:\n[{"title":"t1","text":"x"},{"title":"t2","text":"x"},{"title":"t3","text":"x"}]',
      );
      const pieces = piecesOf(piecesReply());
      expect(saved()).toMatchObject({
        discipline: { id: 7, name: 'Cálculo' },
        topic: { index: 0, text: 'Limites', total: 2 },
        pieces,
        exercises: composeChapter({ topic: 0, pieces }, '7:0'),
      });
      expect(saved().exercises.at(-1)?.kind).toBe('explique_para_o_arandu');
    });

    it('retries once when there are not enough consistent pieces, then succeeds', async () => {
      steps.pieces
        .mockResolvedValueOnce(
          reply({ ...piecesReply(), cases: [], sequence: [] }),
        )
        .mockResolvedValueOnce(reply(piecesReply()));

      await service.make(7, 0);

      expect(steps.pieces).toHaveBeenCalledTimes(2);
      expect(paths.saveChapterContent).toHaveBeenCalledTimes(1);
    });

    it('503s when the pieces are never enough, and saves nothing', async () => {
      steps.pieces.mockResolvedValue(
        reply({ ...piecesReply(), cases: [], sequence: [] }),
      );

      await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
      expect(steps.pieces).toHaveBeenCalledTimes(2);
      expect(paths.saveChapterContent).not.toHaveBeenCalled();
    });

    it('503s when the pieces miss the schema on every attempt', async () => {
      steps.pieces.mockRejectedValue(outputError());

      await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
      expect(steps.pieces).toHaveBeenCalledTimes(2);
    });

    it('adds the problems the practice call wrote, from the same cards', async () => {
      steps.practice.mockResolvedValue(
        reply({
          problems: [
            {
              statement:
                'Um carro percorre {d} km em {t} h. Qual é a velocidade média?',
              numbers: [
                { name: 'd', min: 60, max: 300, step: 10 },
                { name: 't', min: 1, max: 5, step: 1 },
              ],
              booleans: [],
              answer: 'd / t',
              decimals: 1,
              unit: 'km/h',
              mistakes: [{ formula: 'd * t', why: 'w' }],
              example: [
                { name: 'd', value: 120 },
                { name: 't', value: 2 },
              ],
              exampleAnswer: 60,
              why: 'w',
            },
          ],
          code: [],
        }),
      );

      await service.make(7, 0);

      expect(promptOf(steps.practice)).toBe(promptOf(steps.pieces));
      expect(saved().pieces?.map((p) => p.type)).toContain('problema');
      expect(saved().exercises.map((e) => e.kind)).toContain('resolva');
    });

    it('a practice answer that missed its schema leaves the chapter without problems or code', async () => {
      steps.practice.mockRejectedValue(outputError());

      await service.make(7, 0);

      expect(steps.practice).toHaveBeenCalledTimes(1);
      expect(saved().pieces?.map((p) => p.type)).not.toContain('problema');
    });

    it('shares one generation between concurrent calls for the same chapter', async () => {
      const [a, b] = await Promise.all([
        service.make(7, 0),
        service.make(7, 0),
      ]);

      expect(a).toBe(b);
      expect(steps.pieces).toHaveBeenCalledTimes(1);
    });
  });

  describe('subject cards', () => {
    const topics = Array.from({ length: 14 }, (_, i) => `T${i}`);
    const cardOf = (n: number, title: string) => ({
      title,
      text: 'x',
      page: 1,
      quote: `q-${title}`,
      topic: n,
    });
    const stored = (title: string) => ({
      title,
      text: 'x',
      source: { label: 'l', url: 'https://a.org/s', quote: title },
    });
    const titles = (cards: { title: string }[]) => cards.map((c) => c.title);
    const subjectCall = () => steps.subject.mock.calls[0]![0];
    const savedEntry = (topic: number, ...cardTitles: string[]) => ({
      topic,
      topicText: `T${topic}`,
      cards: cardTitles.map((t) => ({
        title: t,
        text: 'x',
        source: sourceOf(academic, `q-${t}`),
      })),
    });

    beforeEach(() => {
      paths.discipline.mockResolvedValue({ id: 7, name: 'Cálculo', topics });
    });

    it('uses three stored cards and makes no search', async () => {
      paths.chapterCards.mockResolvedValue(
        new Map([[1, ['s1', 's2', 's3'].map(stored)]]),
      );

      const chapter = await service.make(7, 1);

      expect(paths.chapterCards).toHaveBeenCalledWith(7, topics);
      expect(searchPages).not.toHaveBeenCalled();
      expect(steps.subject).not.toHaveBeenCalled();
      expect(steps.cards).not.toHaveBeenCalled();
      expect(titles(chapter.cards)).toEqual(['s1', 's2', 's3']);
    });

    it("a topic with fewer stored cards searches alone, adds to them and saves the topic's", async () => {
      paths.chapterCards.mockResolvedValue(new Map([[1, [stored('s1')]]]));

      const chapter = await service.make(7, 1);

      expect(steps.subject).not.toHaveBeenCalled();
      expect(titles(chapter.cards)).toEqual(['s1', 't1', 't2', 't3']);
      expect(paths.saveChapterCards).toHaveBeenCalledWith(7, [
        { topic: 1, topicText: 'T1', cards: chapter.cards },
      ]);
    });

    it('drops a stored card from a refused site and makes its topic again', async () => {
      paths.chapterCards.mockResolvedValue(
        new Map([
          [
            1,
            [
              {
                title: 'video',
                text: 'x',
                source: {
                  label: 'l',
                  url: 'https://www.youtube.com/watch?v=1',
                  quote: 'q',
                },
              },
            ],
          ],
        ]),
      );
      steps.subject.mockResolvedValue(
        reply({ cards: ['a', 'b', 'c'].map((t) => cardOf(2, t)) }),
      );

      const chapter = await service.make(7, 1);

      expect(steps.subject).toHaveBeenCalledTimes(1);
      expect(titles(chapter.cards)).toEqual(['a', 'b', 'c']);
    });

    it('a block query keeps the first words of every topic, without its numbering', async () => {
      paths.discipline.mockResolvedValue({
        id: 7,
        name: 'Cálculo',
        topics: Array.from(
          { length: 6 },
          (_, i) => `${i + 1}. Tema ${i} com muitas palavras que não cabem`,
        ),
      });

      await service.make(7, 0);

      expect(searchPages).toHaveBeenCalledWith(
        'fc-key',
        'Cálculo ' +
          [0, 1, 2, 3, 4, 5]
            .map((i) => `Tema ${i} com muitas palavras`)
            .join(' '),
        5,
        false,
      );
    });

    it("searches the block once, saves every topic with a verified card and returns this topic's", async () => {
      steps.subject.mockResolvedValue(
        reply({
          cards: [...['a', 'b', 'c'].map((t) => cardOf(2, t)), cardOf(3, 'c1')],
        }),
      );

      const chapter = await service.make(7, 1);

      expect(searchPages).toHaveBeenCalledTimes(2);
      expect(searchPages).toHaveBeenCalledWith(
        'fc-key',
        'Cálculo T0 T1 T2 T3 T4 T5',
        5,
        false,
      );
      expect(searchPages).toHaveBeenCalledWith(
        'fc-key',
        'Cálculo T0 T1 T2 T3 T4 T5',
        5,
        true,
      );
      expect(subjectCall().prompt).toContain(
        'Subject: Cálculo\nTopics:\n1. T0\n2. T1\n3. T2\n4. T3\n5. T4\n6. T5\n\nPages:\n[Page 1] Página acadêmica',
      );
      expect(steps.cards).not.toHaveBeenCalled();
      expect(paths.saveChapterCards).toHaveBeenCalledWith(7, [
        savedEntry(1, 'a', 'b', 'c'),
        savedEntry(2, 'c1'),
      ]);
      expect(chapter.cards).toEqual(savedEntry(1, 'a', 'b', 'c').cards);
    });

    it('starts topic 7 at its block start 6', async () => {
      // numbers count the listed topics: 2 is T7
      steps.subject.mockResolvedValue(
        reply({ cards: ['a', 'b', 'c'].map((t) => cardOf(2, t)) }),
      );

      const chapter = await service.make(7, 7);

      expect(subjectCall().prompt).toContain(
        'Topics:\n1. T6\n2. T7\n3. T8\n4. T9\n5. T10\n6. T11\n',
      );
      expect(paths.saveChapterCards).toHaveBeenCalledWith(7, [
        savedEntry(7, 'a', 'b', 'c'),
      ]);
      expect(titles(chapter.cards)).toEqual(['a', 'b', 'c']);
    });

    it('drops cards with an unverified quote or a topic number outside the block', async () => {
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

      const chapter = await service.make(7, 0);

      expect(paths.saveChapterCards).toHaveBeenNthCalledWith(1, 7, [
        savedEntry(0, 'good'),
      ]);
      // One card is not enough: the topic's own search adds to it.
      expect(titles(chapter.cards)).toEqual(['good', 't1', 't2', 't3']);
    });

    it('keeps at most 5 verified cards per topic', async () => {
      steps.subject.mockResolvedValue(
        reply({
          cards: ['c1', 'c2', 'c3', 'c4', 'a', 'b'].map((t) => cardOf(1, t)),
        }),
      );

      const chapter = await service.make(7, 0);

      expect(titles(chapter.cards)).toEqual(['c1', 'c2', 'c3', 'c4', 'a']);
    });

    it("falls back to the topic's own search when it got no verified card, keeping the others saved", async () => {
      steps.subject.mockResolvedValue(reply({ cards: [cardOf(2, 'other')] }));

      const chapter = await service.make(7, 0);

      expect(paths.saveChapterCards).toHaveBeenCalledWith(7, [
        savedEntry(1, 'other'),
      ]);
      expect(steps.cards).toHaveBeenCalledTimes(1);
      expect(searchPages).toHaveBeenCalledWith(
        'fc-key',
        'Cálculo T0',
        5,
        false,
      );
      expect(titles(chapter.cards)).toEqual(['t1', 't2', 't3']);
    });

    it.each([
      ['an AiOutputError', outputError()],
      ['a provider error', new AiModelError([])],
    ])(
      "falls back to the topic's own search after %s in the block call",
      async (_, error) => {
        steps.subject.mockRejectedValue(error);

        const chapter = await service.make(7, 0);

        expect(steps.subject).toHaveBeenCalledTimes(1);
        // Only the topic's own search is saved.
        expect(paths.saveChapterCards).toHaveBeenCalledExactlyOnceWith(7, [
          { topic: 0, topicText: 'T0', cards: chapter.cards },
        ]);
        expect(steps.cards).toHaveBeenCalledTimes(1);
        expect(chapter.cards).toHaveLength(3);
      },
    );

    it("falls back to the topic's own search when the block search fails", async () => {
      vi.mocked(searchPages).mockRejectedValueOnce(new Error('HTTP 500'));

      const chapter = await service.make(7, 0);

      expect(steps.subject).not.toHaveBeenCalled();
      expect(steps.cards).toHaveBeenCalledTimes(1);
      expect(chapter.cards).toHaveLength(3);
    });

    it('the fallback still retries once, then 503s', async () => {
      steps.cards.mockRejectedValue(outputError());

      await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
      expect(steps.cards).toHaveBeenCalledTimes(2);
    });

    it("an AiModelError from the topic's own search still propagates", async () => {
      const error = new AiModelError([]);
      steps.subject.mockRejectedValue(new AiModelError([]));
      steps.cards.mockRejectedValue(error);

      await expect(service.make(7, 0)).rejects.toBe(error);
      expect(steps.cards).toHaveBeenCalledTimes(1);
      expect(paths.saveChapterContent).not.toHaveBeenCalled();
    });

    it('with one of its topics stored, the block is not searched again: an uncovered topic searches alone', async () => {
      paths.chapterCards.mockResolvedValue(new Map([[3, [stored('s3')]]]));

      const chapter = await service.make(7, 1);

      expect(steps.subject).not.toHaveBeenCalled();
      expect(searchPages).toHaveBeenCalledTimes(2);
      expect(titles(chapter.cards)).toEqual(['t1', 't2', 't3']);
      expect(paths.saveChapterCards).toHaveBeenCalledExactlyOnceWith(7, [
        { topic: 1, topicText: 'T1', cards: chapter.cards },
      ]);
    });

    it('asks for 1500 output tokens per block topic', async () => {
      await service.make(7, 7);

      expect(subjectCall().maxOutputTokens).toBe(9000);
    });
  });

  describe('finish', () => {
    beforeEach(() => {
      paths.chapterContent.mockResolvedValue({ cards: [], exercises: [] });
    });

    it('404s for a topic out of range and writes nothing', async () => {
      await expect(service.finish('u', 7, 2, 0)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(paths.finishChapter).not.toHaveBeenCalled();
    });

    it('404s when the chapter content is not stored, before writing anything', async () => {
      paths.chapterContent.mockResolvedValue(null);

      await expect(service.finish('u', 7, 1, 0)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(paths.chapterContent).toHaveBeenCalledWith(7, 1, 'Derivadas');
      expect(progress.achievements).not.toHaveBeenCalled();
      expect(paths.finishChapter).not.toHaveBeenCalled();
    });

    it('404s for a chapter outside the made run and writes nothing', async () => {
      paths.madeCount.mockResolvedValue(1);

      await expect(service.finish('u', 7, 1, 0)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(paths.finishChapter).not.toHaveBeenCalled();
    });

    it('records the result for a valid topic', async () => {
      await service.finish('u', 7, 1, 3);

      expect(paths.finishChapter).toHaveBeenCalledWith('u', 7, 1, 3, null);
    });

    it('passes the relampago mistakes on', async () => {
      await service.finish('u', 7, 1, 3, 0);

      expect(paths.finishChapter).toHaveBeenCalledWith('u', 7, 1, 3, 0);
    });

    const earned = (...codes: string[]) =>
      codes.map((code) => ({ code, earnedAt: '2026-01-01T00:00:00.000Z' }));

    it('returns only the achievements earned by this finish', async () => {
      progress.achievements
        .mockResolvedValueOnce(earned('primeiro_capitulo'))
        .mockResolvedValueOnce(
          earned('primeiro_capitulo', 'nenhum_novelo_perdido'),
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
      paths.finishChapter.mockResolvedValue({
        sabedoria: 0,
        peixinhos: 0,
        patinha: false,
      });
      progress.achievements.mockResolvedValue(earned('primeiro_capitulo'));

      const result = await service.finish('u', 7, 1, 0);

      expect(result.achievements).toEqual([]);
      expect(progress.achievements).toHaveBeenCalledTimes(1);
    });

    it('does not read achievements for a topic out of range', async () => {
      await expect(service.finish('u', 7, 2, 0)).rejects.toThrow();
      expect(progress.achievements).not.toHaveBeenCalled();
    });
  });

  describe('lessons', () => {
    const pieces = piecesOf(piecesReply());
    const cards = ['a', 'b', 'c', 'd'].map((title) => ({
      title,
      text: 'x',
      source: { label: 'l', url: 'https://a.org/s', quote: title },
    }));
    const chapterOf = (topic: number) => ({
      discipline: { id: 7, name: 'Cálculo' },
      topic: { index: topic, text: discipline.topics[topic], total: 2 },
      cards,
      exercises: [],
      pieces,
    });
    const refsOf = (l: Lesson) =>
      l.exercises.map(({ topic, index }) => ({ topic, index }));
    // Topic 1's lessons for this person: the seed is the person and the chapter.
    const expected = (n: number) =>
      composeLesson(
        { topic: 1, pieces },
        [{ topic: 0, pieces }],
        n,
        'u:7:1',
      ).map((c) => ({ topic: c.ref.topic, index: c.ref.index }));
    const missOf = (e: LessonExercise) => ({
      topic: e.topic,
      index: e.index,
      kind: e.kind,
    });
    const done = (...lessons: number[]) =>
      lessons.map((lesson) => ({ lesson, missed: [] }));
    const locked = async (work: Promise<unknown>) => {
      const error = await work.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: 'lesson_locked',
      });
    };

    beforeEach(() => {
      paths.chapterContent.mockImplementation((_d: number, topic: number) =>
        Promise.resolve(chapterOf(topic)),
      );
      paths.subjectPieces.mockResolvedValue([
        { topic: 0, pieces },
        { topic: 1, pieces },
      ]);
    });

    describe('start', () => {
      it('composes each lesson for this person, the same on every call, with 3 lives', async () => {
        const first = await service.start('u', 7, 1, 1);
        const again = await service.start('u', 7, 1, 1);
        const second = await service.start('u', 7, 1, 2);

        expect(first).toMatchObject({ index: 1, total: 3, lives: 3 });
        expect(refsOf(first)).toEqual(expected(1));
        expect(again).toEqual(first);
        expect(refsOf(second)).toEqual(expected(2));
        expect(paths.subjectPieces).toHaveBeenCalledWith(7, discipline.topics);
      });

      it("gives each lesson its share of the chapter's cards", async () => {
        paths.lessons.mockResolvedValue(done(1, 2));

        const titles = await Promise.all(
          [1, 2, 3].map(async (n) =>
            (await service.start('u', 7, 1, n)).cards.map((c) => c.title),
          ),
        );

        expect(titles).toEqual([['a', 'b'], ['c'], ['d']]);
      });

      it('charges the lesson price in peixinhos on every entry until the lesson is done', async () => {
        await service.start('u', 7, 1, 1);
        await service.start('u', 7, 1, 1);

        expect(wallet.pay).toHaveBeenCalledTimes(2);
        expect(wallet.pay).toHaveBeenCalledWith('u', 'peixinhos', LESSON_PRICE);
      });

      it('charges nothing to practise a done lesson, or any lesson of a finished chapter', async () => {
        paths.lessons.mockResolvedValue(done(1, 2, 3));
        await Promise.all([1, 2, 3].map((n) => service.start('u', 7, 1, n)));

        paths.lessons.mockResolvedValue([]);
        paths.chapterFinished.mockResolvedValue(true);
        await service.start('u', 7, 1, 3);

        expect(wallet.pay).not.toHaveBeenCalled();
      });

      it('still charges a lesson not done yet when the others are', async () => {
        paths.lessons.mockResolvedValue(done(1));
        await service.start('u', 7, 1, 2);

        expect(wallet.pay).toHaveBeenCalledOnce();
      });

      it('serves nothing when the peixinhos are too few', async () => {
        wallet.pay.mockRejectedValue(new ConflictException());

        await expect(service.start('u', 7, 1, 1)).rejects.toBeInstanceOf(
          ConflictException,
        );
      });

      it('opens lesson 2 before lesson 1', async () => {
        await expect(service.start('u', 7, 1, 2)).resolves.toMatchObject({
          index: 2,
        });
      });

      it.each([[[]], [[1]], [[2]]])(
        'refuses lesson 3 with 409 lesson_locked with lessons %j done, and charges nothing',
        async (lessons) => {
          paths.lessons.mockResolvedValue(done(...lessons));

          await locked(service.start('u', 7, 1, 3));
          expect(wallet.pay).not.toHaveBeenCalled();
        },
      );

      it('opens lesson 3 once lessons 1 and 2 are done, or the chapter is finished', async () => {
        paths.lessons.mockResolvedValue(done(1, 2));
        await expect(service.start('u', 7, 1, 3)).resolves.toMatchObject({
          index: 3,
        });

        paths.lessons.mockResolvedValue(done(1));
        paths.chapterFinished.mockResolvedValue(true);
        await expect(service.start('u', 7, 1, 3)).resolves.toMatchObject({
          index: 3,
        });
      });
    });

    describe('continue', () => {
      it('charges the continue price in currency', async () => {
        await service.continue('u', 7, 1, 2);

        expect(wallet.pay).toHaveBeenCalledWith(
          'u',
          'currency',
          CONTINUE_PRICE,
        );
      });

      it('refuses a locked lesson with 409 lesson_locked, and charges nothing', async () => {
        await locked(service.continue('u', 7, 1, 3));
        expect(wallet.pay).not.toHaveBeenCalled();
      });
    });

    describe('extraLife', () => {
      it('spends one stored extra life', async () => {
        await service.extraLife('u', 7, 1, 2);

        expect(wallet.pay).toHaveBeenCalledWith('u', 'vidas', 1);
      });

      it('refuses a locked lesson with 409 lesson_locked, and spends nothing', async () => {
        await locked(service.extraLife('u', 7, 1, 3));
        expect(wallet.pay).not.toHaveBeenCalled();
      });
    });

    describe('finishLesson', () => {
      it('keeps only the misses that were in the lesson, once each, with the kind they were missed in', async () => {
        const [a, b] = (await service.start('u', 7, 1, 2)).exercises;

        await service.finishLesson('u', 7, 1, 2, [
          a!,
          { topic: 0, index: a!.index },
          b!,
          a!,
          { topic: 1, index: 99 },
        ]);

        expect(paths.finishLesson).toHaveBeenCalledWith('u', 7, 1, 2, [
          missOf(a!),
          missOf(b!),
        ]);
      });

      it('returns the achievements this lesson earned', async () => {
        progress.achievements
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { code: 'primeiro_capitulo', earnedAt: 'x' },
          ]);

        const result = await service.finishLesson('u', 7, 1, 1, []);

        expect(result.achievements).toEqual(['primeiro_capitulo']);
      });

      it('on a replay with the same achievements before and after returns none', async () => {
        paths.finishLesson.mockResolvedValue({
          sabedoria: 0,
          patinha: false,
          caixaId: null,
          chapterDone: false,
        });
        progress.achievements.mockResolvedValue([
          { code: 'primeiro_capitulo', earnedAt: 'x' },
        ]);

        const result = await service.finishLesson('u', 7, 1, 1, []);

        expect(result.achievements).toEqual([]);
        expect(progress.achievements).toHaveBeenCalledTimes(2);
      });

      it('with sabedoria 0 still returns semana_de_patinhas earned by the study day', async () => {
        paths.finishLesson.mockResolvedValue({
          sabedoria: 0,
          patinha: true,
          caixaId: 3,
          chapterDone: true,
        });
        progress.achievements
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { code: 'semana_de_patinhas', earnedAt: 'x' },
          ]);

        const result = await service.finishLesson('u', 7, 1, 1, []);

        expect(result).toMatchObject({
          caixaId: 3,
          achievements: ['semana_de_patinhas'],
        });
      });
    });
  });
});
