import type { Mock } from 'vitest';
import { AiModelError, type AiService } from '@nestjs/ai';
import { NotFoundException } from '@nestjs/common';
import type { Finish } from './progress.logic.js';
import type { ProgressRepository } from './progress.repository.js';
import { ProgressService } from './progress.service.js';

const finish = (day: string, topic: number, disciplineId = 7): Finish => ({
  disciplineId,
  topic,
  mistakes: 1,
  relampagoMistakes: null,
  day,
  completedAt: new Date(`${day}T15:00:00Z`),
});

const wallet = {
  peixinhos: 50,
  dailyPeixinhos: 50,
  nextRefillAt: '2026-03-11T03:00:00.000Z',
  lessonPrice: 10,
  currency: 0,
  continuePrice: 5,
  marcadores: 0,
  vidas: 0,
};
const discipline = { id: 7, name: 'Cálculo', topics: ['a', 'b', 'c'] };

describe('ProgressService', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let ai: { generateObject: Mock };
  let service: ProgressService;

  beforeEach(() => {
    repo = {
      wallet: vi.fn().mockResolvedValue(wallet),
      finishes: vi.fn().mockResolvedValue([]),
      sabedoria: vi.fn().mockResolvedValue({ total: 0, week: 0 }),
      // Wednesday 2026-03-11, its Monday is 2026-03-09.
      calendar: vi
        .fn()
        .mockResolvedValue({ today: '2026-03-11', monday: '2026-03-09' }),
      journey: vi
        .fn()
        .mockResolvedValue({ discipline: null, weeklyGoal: null }),
      questionTimes: vi.fn().mockResolvedValue([]),
      // Study times mirror the finishes unless a test says otherwise.
      studyTimes: vi.fn((userId: string) => (repo.finishes as Mock)(userId)),
      lessonsDone: vi.fn().mockResolvedValue(new Map()),
      topicCounts: vi.fn().mockResolvedValue(new Map([[7, 3]])),
      discipline: vi.fn().mockResolvedValue(discipline),
      reflection: vi.fn().mockResolvedValue({
        chapters: [],
        questions: 0,
        feeling: null,
        closing: null,
      }),
      saveClosing: vi.fn().mockResolvedValue(undefined),
    };
    ai = { generateObject: vi.fn() };
    service = new ProgressService(
      repo as unknown as ProgressRepository,
      ai as unknown as AiService,
    );
  });

  describe('home', () => {
    it('is empty for a new person', async () => {
      const home = await service.home('u');

      expect(home).toMatchObject({
        wallet,
        sabedoria: { total: 0, week: 0 },
        lastStudiedOn: null,
        current: null,
        achievements: [],
        week: { studied: 0, goal: null },
      });
      expect(home.week.days.map((d) => d.date)).toEqual([
        '2026-03-09',
        '2026-03-10',
        '2026-03-11',
        '2026-03-12',
        '2026-03-13',
        '2026-03-14',
        '2026-03-15',
      ]);
      expect(home.week.days.every((d) => !d.studied)).toBe(true);
    });

    it('marks studied days of this week, Monday first, and counts them', async () => {
      repo.finishes!.mockResolvedValue([
        finish('2026-03-08', 0), // last Sunday: not this week
        finish('2026-03-09', 1),
        finish('2026-03-09', 2),
        finish('2026-03-11', 0),
      ]);
      repo.journey!.mockResolvedValue({ discipline: null, weeklyGoal: 5 });

      const { week, lastStudiedOn } = await service.home('u');

      expect(week.days.map((d) => d.studied)).toEqual([
        true,
        false,
        true,
        false,
        false,
        false,
        false,
      ]);
      expect(week.studied).toBe(2);
      expect(week.goal).toBe(5);
      expect(lastStudiedOn).toBe('2026-03-11');
    });

    it('never marks a future day as studied', async () => {
      repo.finishes!.mockResolvedValue([finish('2026-03-12', 0)]);

      const { week } = await service.home('u');

      expect(week.days[3]).toEqual({ date: '2026-03-12', studied: false });
      expect(week.studied).toBe(0);
    });

    it('current book points to the first topic not done', async () => {
      repo.journey!.mockResolvedValue({ discipline, weeklyGoal: null });
      repo.finishes!.mockResolvedValue([
        finish('2026-03-09', 0),
        finish('2026-03-10', 2),
        finish('2026-03-10', 5, 99), // another subject: ignored
      ]);

      const { current } = await service.home('u');

      expect(current).toEqual({
        disciplineId: 7,
        name: 'Cálculo',
        nextTopic: 1,
        total: 3,
      });
    });

    it('current book is at topic 0 with no finishes', async () => {
      repo.journey!.mockResolvedValue({ discipline, weeklyGoal: null });

      expect((await service.home('u')).current?.nextTopic).toBe(0);
    });

    it('nextTopic is null when every topic is done', async () => {
      repo.journey!.mockResolvedValue({ discipline, weeklyGoal: null });
      repo.finishes!.mockResolvedValue(
        [0, 1, 2].map((t) => finish('2026-03-09', t)),
      );

      const { current, achievements } = await service.home('u');

      expect(current?.nextTopic).toBeNull();
      expect(achievements.map((a) => a.code)).toContain('primeiro_livro');
    });

    it('asks topic counts only for the subjects finished', async () => {
      repo.finishes!.mockResolvedValue([
        finish('2026-03-09', 0, 7),
        finish('2026-03-09', 1, 7),
        finish('2026-03-10', 0, 8),
      ]);

      await service.home('u');

      expect(repo.topicCounts).toHaveBeenCalledWith([7, 8]);
    });
  });

  describe('book', () => {
    it('404s for an unknown subject', async () => {
      repo.discipline!.mockResolvedValue(null);

      await expect(service.book('u', 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('the first chapter is current and the rest locked when nothing is done', async () => {
      const book = await service.book('u', 7);

      expect(book.discipline).toEqual({ id: 7, name: 'Cálculo' });
      expect(book.chapters.map((s) => s.state)).toEqual([
        'current',
        'locked',
        'locked',
      ]);
      expect(book.chapters.map((s) => s.index)).toEqual([0, 1, 2]);
      expect(book.chapters.map((s) => s.text)).toEqual(['a', 'b', 'c']);
    });

    it('the first chapter not done is current, even after a gap; later ones are locked', async () => {
      repo.finishes!.mockResolvedValue([
        finish('2026-03-09', 1),
        finish('2026-03-09', 2, 99),
      ]);

      const { chapters } = await service.book('u', 7);

      expect(chapters.map((s) => s.state)).toEqual([
        'current',
        'done',
        'locked',
      ]);
    });

    const states = (chapter: { lessons: { state: string }[] } | undefined) =>
      chapter?.lessons.map((l) => l.state);

    it('gives each lesson its state: all done in a done chapter, all locked in a locked one', async () => {
      repo.finishes!.mockResolvedValue([finish('2026-03-09', 0)]);
      repo.lessonsDone!.mockResolvedValue(new Map([[2, new Set([1])]]));

      const { chapters } = await service.book('u', 7);

      expect(repo.lessonsDone).toHaveBeenCalledWith('u', 7);
      expect(chapters[0]?.lessons).toEqual([
        { index: 1, state: 'done' },
        { index: 2, state: 'done' },
        { index: 3, state: 'done' },
      ]);
      expect(states(chapters[1])).toEqual(['open', 'open', 'locked']);
      // A locked chapter's lessons stay locked, whatever was played in it.
      expect(states(chapters[2])).toEqual(['locked', 'locked', 'locked']);
    });

    it.each([
      [[1], ['done', 'open', 'locked']],
      [[2], ['open', 'done', 'locked']],
      [
        [1, 2],
        ['done', 'done', 'open'],
      ],
    ])(
      'opens lesson 3 only once 1 and 2 are done (done: %j)',
      async (done, expected) => {
        repo.lessonsDone!.mockResolvedValue(new Map([[0, new Set(done)]]));

        const { chapters } = await service.book('u', 7);

        expect(states(chapters[0])).toEqual(expected);
      },
    );

    it('has no current when all are done', async () => {
      repo.finishes!.mockResolvedValue(
        [0, 1, 2].map((t) => finish('2026-03-09', t)),
      );

      const { chapters } = await service.book('u', 7);

      expect(chapters.every((s) => s.state === 'done')).toBe(true);
    });
  });

  describe('reflection', () => {
    const reading = (over: object) =>
      repo.reflection!.mockResolvedValue({
        chapters: [],
        questions: 0,
        feeling: null,
        closing: null,
        ...over,
      });

    it('404s for an unknown subject', async () => {
      repo.discipline!.mockResolvedValue(null);

      await expect(service.reflection('u', 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.reflection).not.toHaveBeenCalled();
    });

    it('is not finished and empty when nothing was read', async () => {
      expect(await service.reflection('u', 7)).toEqual({
        discipline: { id: 7, name: 'Cálculo' },
        finished: false,
        items: { right: 0, total: 0 },
        questions: 0,
        further: [],
        stuck: null,
        feeling: null,
        closing: null,
      });
    });

    it('counts right items as items minus mistakes, never below zero', async () => {
      reading({
        chapters: [
          { topic: 0, mistakes: 1, items: 4 },
          { topic: 1, mistakes: 9, items: 3 },
          { topic: 2, mistakes: 0, items: 5 },
        ],
      });

      const { items } = await service.reflection('u', 7);

      expect(items).toEqual({ right: 3 + 0 + 5, total: 12 });
    });

    it('goes further on chapters with no mistakes and is stuck on the one with most', async () => {
      reading({
        chapters: [
          { topic: 0, mistakes: 0, items: 2 },
          { topic: 1, mistakes: 1, items: 2 },
          { topic: 2, mistakes: 3, items: 2 },
        ],
      });

      const r = await service.reflection('u', 7);

      expect(r.further).toEqual(['a']);
      expect(r.stuck).toBe('c');
    });

    it('is not stuck when there were no mistakes', async () => {
      reading({ chapters: [{ topic: 0, mistakes: 0, items: 2 }] });

      expect((await service.reflection('u', 7)).stuck).toBeNull();
    });

    it('is finished once every chapter is done', async () => {
      repo.finishes!.mockResolvedValue(
        [0, 1, 2].map((t) => finish('2026-03-09', t)),
      );

      expect((await service.reflection('u', 7)).finished).toBe(true);
    });

    it('is not finished when a subject has no chapters', async () => {
      repo.discipline!.mockResolvedValue({ ...discipline, topics: [] });

      expect((await service.reflection('u', 7)).finished).toBe(false);
    });

    it('passes the questions and the feeling through', async () => {
      const feeling = { chips: ['difícil'], text: null };
      reading({ questions: 6, feeling });

      const r = await service.reflection('u', 7);

      expect(r.questions).toBe(6);
      expect(r.feeling).toEqual(feeling);
      expect(repo.reflection).toHaveBeenCalledWith('u', 7);
    });

    describe('closing', () => {
      const feeling = { chips: ['difícil'], text: 'gostei das contas' };
      const draft = (over: object = {}) =>
        ai.generateObject.mockResolvedValue({
          object: {
            suggestion: 'seguir',
            chapter: 0,
            text: 'Você foi longe em a. Qual matéria você quer provar agora?',
            ...over,
          },
        });

      beforeEach(() => {
        // Every chapter of the book done, c the hardest.
        repo.finishes!.mockResolvedValue(
          [0, 1, 2].map((t) => finish('2026-03-09', t)),
        );
        reading({
          feeling,
          questions: 2,
          chapters: [
            { topic: 0, mistakes: 0, items: 4 },
            { topic: 1, mistakes: 1, items: 4 },
            { topic: 2, mistakes: 3, items: 4 },
          ],
        });
        draft();
      });

      it('is written once a finished book has its feeling, from its results, and stored', async () => {
        const r = await service.reflection('u', 7);

        const closing = {
          text: 'Você foi longe em a. Qual matéria você quer provar agora?',
          suggestion: 'seguir',
          chapter: null,
        };
        expect(r.closing).toEqual(closing);
        expect(repo.saveClosing).toHaveBeenCalledWith('u', 7, closing);
        const call = ai.generateObject.mock.calls[0]![0] as { prompt: string };
        expect(call.prompt).toBe(
          'Subject: Cálculo\nChapters (number. topic: mistakes):\n1. a: 0\n2. b: 1\n3. c: 3\n' +
            'Questions they asked you about the cards: 2\nHow it felt: difícil\nIn their words: gostei das contas',
        );
      });

      it('a stored closing comes back without calling the model', async () => {
        const closing = { text: 't', suggestion: 'seguir', chapter: null };
        reading({ feeling, closing });

        expect((await service.reflection('u', 7)).closing).toEqual(closing);
        expect(ai.generateObject).not.toHaveBeenCalled();
      });

      it('is not written before the feeling, or before the book is finished', async () => {
        reading({ feeling: null });
        expect((await service.reflection('u', 7)).closing).toBeNull();

        reading({ feeling });
        repo.finishes!.mockResolvedValue([finish('2026-03-09', 0)]);
        expect((await service.reflection('u', 7)).closing).toBeNull();

        expect(ai.generateObject).not.toHaveBeenCalled();
      });

      it('hides a stored closing while the book is not finished, as when chapters were added after it', async () => {
        reading({
          feeling,
          closing: { text: 't', suggestion: 'seguir', chapter: null },
        });
        repo.finishes!.mockResolvedValue([finish('2026-03-09', 0)]);

        expect((await service.reflection('u', 7)).closing).toBeNull();
      });

      it('keeps the chapter to go back to, as its topic index', async () => {
        draft({ suggestion: 'rever_capitulo', chapter: 2 });

        expect((await service.reflection('u', 7)).closing).toMatchObject({
          suggestion: 'rever_capitulo',
          chapter: 1,
        });
      });

      it('a chapter to go back to outside the book becomes the hardest one', async () => {
        draft({ suggestion: 'rever_capitulo', chapter: 9 });

        expect((await service.reflection('u', 7)).closing).toMatchObject({
          suggestion: 'rever_capitulo',
          chapter: 2,
        });
      });

      it('with no chapter to go back to and no mistakes, going back becomes seguir', async () => {
        reading({
          feeling,
          chapters: [0, 1, 2].map((topic) => ({
            topic,
            mistakes: 0,
            items: 4,
          })),
        });
        draft({ suggestion: 'rever_capitulo', chapter: 0 });

        expect((await service.reflection('u', 7)).closing).toMatchObject({
          suggestion: 'seguir',
          chapter: null,
        });
      });

      it('a model failure leaves it null and stores nothing, so the next read tries again', async () => {
        ai.generateObject.mockRejectedValue(new AiModelError([]));

        expect((await service.reflection('u', 7)).closing).toBeNull();
        expect(repo.saveClosing).not.toHaveBeenCalled();
      });

      it('an unsafe text is never stored', async () => {
        draft({ text: 'vai se foder' });

        expect((await service.reflection('u', 7)).closing).toBeNull();
        expect(repo.saveClosing).not.toHaveBeenCalled();
      });
    });
  });

  it('achievements counts the questions asked: the 10th earns curiosidade_de_gato', async () => {
    const times = Array.from(
      { length: 10 },
      (_, i) => new Date(`2026-03-09T10:0${i}:00Z`),
    );
    repo.questionTimes!.mockResolvedValue(times);

    const list = await service.achievements('u');

    expect(list).toEqual([
      { code: 'curiosidade_de_gato', earnedAt: times[9]!.toISOString() },
    ]);
    expect(repo.questionTimes).toHaveBeenCalledWith('u');
  });

  it('home includes the achievements that come from questions', async () => {
    repo.questionTimes!.mockResolvedValue(
      Array.from({ length: 10 }, () => new Date('2026-03-09T10:00:00Z')),
    );

    const { achievements } = await service.home('u');

    expect(achievements.map((a) => a.code)).toEqual(['curiosidade_de_gato']);
  });

  it('achievements derives from the finishes', async () => {
    repo.finishes!.mockResolvedValue([finish('2026-03-09', 0)]);

    const list = await service.achievements('u');

    expect(list.map((a) => a.code)).toEqual(['primeiro_capitulo']);
  });
});
