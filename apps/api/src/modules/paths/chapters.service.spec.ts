import type { Lesson, LessonExercise } from '@arandu/contracts';
import type { Mock } from 'vitest';
import { AiOutputError, type AiService } from '@nestjs/ai';
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

/** A card on the academic page, its quote q-<name>. */
const card = (name: string) => ({
  title: name,
  text: 'x',
  page: 1,
  quote: `q-${name}`,
});

const lessonsReply = () => ({
  lessons: [
    {
      title: 'L1',
      cards: [
        { title: 't1', text: 'x', page: 1, quote: 'q1' },
        { title: 't2', text: 'x', page: 2, quote: 'w1' },
        { title: 't3', text: 'x', page: 1, quote: 'q-a' },
      ],
    },
    { title: 'L2', cards: [card('b'), card('c'), card('good')] },
    { title: 'L3', cards: [card('other'), card('zero'), card('seven')] },
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
  let steps: {
    lessons: Step;
    lessonCards: Step;
    practice: Step;
    pieces: Step;
  };
  let ai: { generateObject: Step };
  let paths: Record<
    | 'discipline'
    | 'madeCount'
    | 'careersOf'
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
      lessons: vi.fn().mockResolvedValue(reply(lessonsReply())),
      lessonCards: vi.fn().mockResolvedValue(reply({ cards: [] })),
      practice: vi.fn().mockResolvedValue(reply({ problems: [], code: [] })),
      pieces: vi.fn().mockResolvedValue(reply(piecesReply())),
    };
    ai = {
      generateObject: vi.fn((o) =>
        o.label === 'arandu-chapter-lessons'
          ? steps.lessons(o)
          : o.label === 'arandu-lesson-cards'
            ? steps.lessonCards(o)
            : o.label === 'arandu-chapter-practice'
              ? steps.practice(o)
              : steps.pieces(o),
      ),
    };
    paths = {
      discipline: vi.fn().mockResolvedValue(discipline),
      madeCount: vi.fn().mockResolvedValue(2),
      careersOf: vi.fn().mockResolvedValue(['Engenharia civil']),
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
        lessonTitles: [],
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

  describe('lessons', () => {
    it("searches the topic's 5 academic pages and 10 Wikipedia's, and stores its three lessons with their verified cards", async () => {
      const chapter = await service.make(7, 0);

      expect(searchPages).toHaveBeenCalledTimes(2);
      expect(searchPages).toHaveBeenCalledWith(
        'fc-key',
        'Cálculo Limites',
        5,
        false,
      );
      expect(searchPages).toHaveBeenCalledWith(
        'fc-key',
        'Cálculo Limites',
        10,
        true,
      );
      expect(promptOf(steps.lessons)).toContain(
        `Subject: Cálculo\nTopic 1 of 2: Limites\n\nPages:\n[Page 1] Página acadêmica (https://a.org/1)\n${academic.markdown}`,
      );
      expect(promptOf(steps.lessons)).toContain(
        '[Page 2, Wikipedia] Limite – Wikipédia (https://pt.wikipedia.org/wiki/Limite)',
      );
      expect(chapter.lessons?.map((l) => l.title)).toEqual(['L1', 'L2', 'L3']);
      expect(chapter.lessons?.[0]?.cards).toEqual([
        { title: 't1', text: 'x', source: sourceOf(academic, 'q1') },
        { title: 't2', text: 'x', source: sourceOf(wiki, 'w1') },
        { title: 't3', text: 'x', source: sourceOf(academic, 'q-a') },
      ]);
      expect(chapter.cards.map((c) => c.title)).toEqual(
        lessonsReply().lessons.flatMap((l) => l.cards.map((c) => c.title)),
      );
      expect(steps.lessonCards).not.toHaveBeenCalled();
      expect(saved()).toBe(chapter);
    });

    it('drops a card whose quote is not on its page, names a page not given or is too long, and keeps a card in one lesson', async () => {
      const r = lessonsReply();
      r.lessons[0]!.cards.push(
        { title: 'elsewhere', text: 'x', page: 2, quote: 'q1' },
        { title: 'invented', text: 'x', page: 1, quote: 'não está' },
        { title: 'no page', text: 'x', page: 3, quote: 'q1' },
        { title: 'long', text: 'x', page: 1, quote: LONG },
      );
      // L2's first card repeats one of L1's.
      r.lessons[1]!.cards.unshift({
        title: 'again',
        text: 'x',
        page: 1,
        quote: 'q1',
      });
      steps.lessons.mockResolvedValue(reply(r));

      const chapter = await service.make(7, 0);

      expect(chapter.lessons?.map((l) => l.cards.map((c) => c.title))).toEqual([
        ['t1', 't2', 't3'],
        ['b', 'c', 'good'],
        ['other', 'zero', 'seven'],
      ]);
    });

    it('a lesson left short gets more cards from the same pages first, without a search', async () => {
      const r = lessonsReply();
      r.lessons[2]!.cards = r.lessons[2]!.cards.slice(0, 1);
      steps.lessons.mockResolvedValue(reply(r));
      steps.lessonCards.mockResolvedValue(
        reply({
          cards: [
            card('c1'),
            { title: 'dup', text: 'x', page: 1, quote: 'q1' },
            card('c2'),
          ],
        }),
      );

      const chapter = await service.make(7, 0);

      expect(searchPages).toHaveBeenCalledTimes(2);
      expect(promptOf(steps.lessonCards)).toContain(
        'Subject: Cálculo\nTopic 1 of 2: Limites\nLesson 3 of 3: L3\nOther lessons: L1; L2\nCards it has: other\n\nPages:\n[Page 1]',
      );
      // q1 is L1's: not used twice.
      expect(chapter.lessons?.[2]?.cards.map((c) => c.title)).toEqual([
        'other',
        'c1',
        'c2',
      ]);
    });

    it("then searches the lesson's own part, and keeps what both gave", async () => {
      const r = lessonsReply();
      r.lessons[2]!.cards = r.lessons[2]!.cards.slice(0, 1);
      steps.lessons.mockResolvedValue(reply(r));
      steps.lessonCards
        .mockResolvedValueOnce(reply({ cards: [card('c1')] }))
        .mockResolvedValueOnce(reply({ cards: [card('c2'), card('c3')] }));

      const chapter = await service.make(7, 0);

      expect(searchPages).toHaveBeenCalledTimes(4);
      expect(searchPages).toHaveBeenCalledWith(
        'fc-key',
        'Cálculo Limites L3',
        5,
        true,
      );
      expect(chapter.lessons?.[2]?.cards.map((c) => c.title)).toEqual([
        'other',
        'c1',
        'c2',
      ]);
    });

    it('keeps a lesson with 2 cards after both tries', async () => {
      const r = lessonsReply();
      r.lessons[1]!.cards = r.lessons[1]!.cards.slice(0, 2);
      steps.lessons.mockResolvedValue(reply(r));
      steps.lessonCards.mockResolvedValue(reply({ cards: [] }));

      const chapter = await service.make(7, 0);

      expect(steps.lessonCards).toHaveBeenCalledTimes(2);
      expect(chapter.lessons?.[1]?.cards).toHaveLength(2);
    });

    it('503s when a lesson stays under 2 cards, and writes no pieces', async () => {
      const r = lessonsReply();
      r.lessons[1]!.cards = r.lessons[1]!.cards.slice(0, 1);
      steps.lessons.mockResolvedValue(reply(r));
      steps.lessonCards.mockResolvedValue(reply({ cards: [] }));

      await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
      expect(steps.pieces).not.toHaveBeenCalled();
      expect(paths.saveChapterContent).not.toHaveBeenCalled();
    });

    it('retries the lessons once after an AiOutputError or fewer than 3 lessons, then succeeds', async () => {
      steps.lessons
        .mockRejectedValueOnce(outputError())
        .mockResolvedValueOnce(reply(lessonsReply()));
      await expect(service.make(7, 0)).resolves.toBeDefined();

      steps.lessons
        .mockReset()
        .mockResolvedValueOnce(
          reply({ lessons: lessonsReply().lessons.slice(0, 2) }),
        )
        .mockResolvedValueOnce(reply(lessonsReply()));
      await expect(service.make(7, 1)).resolves.toBeDefined();
      expect(steps.lessons).toHaveBeenCalledTimes(2);
    });

    it('503s when the lessons never come, and writes nothing', async () => {
      steps.lessons.mockRejectedValue(outputError());

      await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
      expect(steps.lessons).toHaveBeenCalledTimes(2);
      expect(steps.pieces).not.toHaveBeenCalled();
      expect(paths.saveChapterContent).not.toHaveBeenCalled();
    });

    it('503s when the searches find no page, without calling the model', async () => {
      vi.mocked(searchPages).mockResolvedValue([]);

      await expect(service.make(7, 0)).rejects.toMatchObject({ status: 503 });
      expect(ai.generateObject).not.toHaveBeenCalled();
    });

    it('lists a page both searches found once', async () => {
      vi.mocked(searchPages).mockResolvedValue([academic]);
      const r = lessonsReply();
      for (const l of r.lessons) for (const c of l.cards) c.page = 1;
      r.lessons[0]!.cards[1]!.quote = 'q-c1';
      steps.lessons.mockResolvedValue(reply(r));

      await service.make(7, 0);

      expect(promptOf(steps.lessons)).not.toContain('[Page 2');
    });

    it('fails without searching when FIRECRAWL_API_KEY is not set', async () => {
      config.get.mockReturnValue(undefined);

      await expect(service.make(7, 0)).rejects.toThrow('FIRECRAWL_API_KEY');
      expect(searchPages).not.toHaveBeenCalled();
      expect(paths.saveChapterContent).not.toHaveBeenCalled();
    });
  });

  describe('pieces', () => {
    it("writes each lesson's from its own cards, with the other lessons and the careers, tagged with the lesson", async () => {
      await service.make(7, 0);

      expect(steps.pieces).toHaveBeenCalledTimes(3);
      expect(promptOf(steps.pieces)).toBe(
        'Subject: Cálculo\nTopic 1 of 2: Limites\nLesson 1 of 3: L1\nOther lessons: L2; L3\nCareers that study this subject: Engenharia civil\n\nCards:\n[{"title":"t1","text":"x"},{"title":"t2","text":"x"},{"title":"t3","text":"x"}]',
      );
      expect(steps.pieces.mock.calls[2]![0].prompt).toContain(
        'Lesson 3 of 3: L3\nOther lessons: L1; L2\n',
      );
      expect(paths.careersOf).toHaveBeenCalledWith(7);
      const one = piecesOf(piecesReply());
      const pieces = [1, 2, 3].flatMap((lesson) =>
        one.map((p) => ({ ...p, lesson })),
      );
      expect(saved()).toMatchObject({
        discipline: { id: 7, name: 'Cálculo' },
        topic: { index: 0, text: 'Limites', total: 2 },
        pieces,
        exercises: composeChapter({ topic: 0, pieces }, '7:0'),
      });
      expect(saved().exercises.at(-1)?.kind).toBe('explique_para_o_arandu');
    });

    it('names no careers when no grid plays the subject', async () => {
      paths.careersOf.mockResolvedValue([]);

      await service.make(7, 0);

      expect(promptOf(steps.pieces)).not.toContain('Careers');
    });

    it('retries a lesson once when its pieces are not enough, then succeeds', async () => {
      steps.pieces
        .mockResolvedValueOnce(
          reply({ ...piecesReply(), cases: [], sequence: [] }),
        )
        .mockResolvedValue(reply(piecesReply()));

      await service.make(7, 0);

      expect(steps.pieces).toHaveBeenCalledTimes(4);
      expect(paths.saveChapterContent).toHaveBeenCalledTimes(1);
    });

    it('503s when a lesson never has enough pieces, and saves nothing', async () => {
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

    it('adds the problems the practice call wrote, from the same lesson', async () => {
      steps.practice.mockResolvedValueOnce(
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
      expect(
        saved()
          .pieces?.filter((p) => p.type === 'problema')
          .map((p) => p.lesson),
      ).toEqual([1]);
    });

    it('a practice answer that missed its schema leaves the lesson without problems or code', async () => {
      steps.practice.mockRejectedValue(outputError());

      await service.make(7, 0);

      expect(steps.practice).toHaveBeenCalledTimes(3);
      expect(saved().pieces?.map((p) => p.type)).not.toContain('problema');
    });

    it("a remake writes the pieces again from the stored lessons' cards, without a search", async () => {
      const lessons = [1, 2, 3].map((n) => ({
        title: `S${n}`,
        cards: [card(`s${n}`), card(`r${n}`)].map((c) => ({
          title: c.title,
          text: c.text,
          source: sourceOf(academic, c.quote),
        })),
      }));
      paths.chapterContent.mockResolvedValue({
        cards: [],
        exercises: [],
        lessons,
      });

      const chapter = await service.make(7, 0, true);

      expect(searchPages).not.toHaveBeenCalled();
      expect(steps.lessons).not.toHaveBeenCalled();
      expect(chapter.lessons).toBe(lessons);
      expect(promptOf(steps.pieces)).toContain(
        'Lesson 1 of 3: S1\nOther lessons: S2; S3',
      );
    });

    it('a remake of a chapter made before lessons makes it again from a search', async () => {
      paths.chapterContent.mockResolvedValue({ cards: [], exercises: [] });

      const chapter = await service.make(7, 0, true);

      expect(searchPages).toHaveBeenCalledTimes(2);
      expect(chapter.lessons).toHaveLength(3);
    });

    it('shares one generation between concurrent calls for the same chapter', async () => {
      const [a, b] = await Promise.all([
        service.make(7, 0),
        service.make(7, 0),
      ]);

      expect(a).toBe(b);
      expect(steps.lessons).toHaveBeenCalledTimes(1);
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
        expect((await service.start('u', 7, 1, 1)).title).toBeNull();
      });

      it('in a chapter made since #157, gives each lesson its own title and cards and plays only its own pieces', async () => {
        const tagged = [1, 2, 3].flatMap((lesson) =>
          pieces.map((p) => ({ ...p, lesson })),
        );
        const lessons = [1, 2, 3].map((n) => ({
          title: `L${n}`,
          cards: [cards[n - 1]!],
        }));
        paths.chapterContent.mockResolvedValue({
          ...chapterOf(1),
          pieces: tagged,
          lessons,
        });
        paths.lessons.mockResolvedValue(done(1, 2));

        for (const n of [1, 2, 3]) {
          const lesson = await service.start('u', 7, 1, n);
          expect(lesson.title).toBe(`L${n}`);
          expect(lesson.cards).toEqual(lessons[n - 1]!.cards);
          expect(
            lesson.exercises.every((e) => tagged[e.index]!.lesson === n),
          ).toBe(true);
        }
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
