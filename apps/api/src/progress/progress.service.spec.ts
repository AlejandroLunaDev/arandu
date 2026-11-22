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
  novelos: 5,
  maxNovelos: 5,
  nextNoveloAt: null,
  peixinhos: 0,
  marcadores: 0,
  refillPrice: 100,
};
const discipline = { id: 7, name: 'Cálculo', topics: ['a', 'b', 'c'] };

describe('ProgressService', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;
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
      topicCounts: vi.fn().mockResolvedValue(new Map([[7, 3]])),
      discipline: vi.fn().mockResolvedValue(discipline),
      reflection: vi
        .fn()
        .mockResolvedValue({ stops: [], questions: 0, feeling: null }),
    };
    service = new ProgressService(repo as unknown as ProgressRepository);
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
      repo.finishes.mockResolvedValue([
        finish('2026-03-08', 0), // last Sunday: not this week
        finish('2026-03-09', 1),
        finish('2026-03-09', 2),
        finish('2026-03-11', 0),
      ]);
      repo.journey.mockResolvedValue({ discipline: null, weeklyGoal: 5 });

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
      repo.finishes.mockResolvedValue([finish('2026-03-12', 0)]);

      const { week } = await service.home('u');

      expect(week.days[3]).toEqual({ date: '2026-03-12', studied: false });
      expect(week.studied).toBe(0);
    });

    it('current book points to the first topic not done', async () => {
      repo.journey.mockResolvedValue({ discipline, weeklyGoal: null });
      repo.finishes.mockResolvedValue([
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
      repo.journey.mockResolvedValue({ discipline, weeklyGoal: null });

      expect((await service.home('u')).current?.nextTopic).toBe(0);
    });

    it('nextTopic is null when every topic is done', async () => {
      repo.journey.mockResolvedValue({ discipline, weeklyGoal: null });
      repo.finishes.mockResolvedValue(
        [0, 1, 2].map((t) => finish('2026-03-09', t)),
      );

      const { current, achievements } = await service.home('u');

      expect(current?.nextTopic).toBeNull();
      expect(achievements.map((a) => a.code)).toContain('primeiro_livro');
    });

    it('asks topic counts only for the subjects finished', async () => {
      repo.finishes.mockResolvedValue([
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
      repo.discipline.mockResolvedValue(null);

      await expect(service.book('u', 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('the first stop is current and the rest locked when nothing is done', async () => {
      const book = await service.book('u', 7);

      expect(book.discipline).toEqual({ id: 7, name: 'Cálculo' });
      expect(book.stops.map((s) => s.state)).toEqual([
        'current',
        'locked',
        'locked',
      ]);
      expect(book.stops.map((s) => s.index)).toEqual([0, 1, 2]);
      expect(book.stops.map((s) => s.text)).toEqual(['a', 'b', 'c']);
    });

    it('the first stop not done is current, even after a gap; later ones are locked', async () => {
      repo.finishes.mockResolvedValue([
        finish('2026-03-09', 1),
        finish('2026-03-09', 2, 99),
      ]);

      const { stops } = await service.book('u', 7);

      expect(stops.map((s) => s.state)).toEqual(['current', 'done', 'locked']);
    });

    it('has no current when all are done', async () => {
      repo.finishes.mockResolvedValue(
        [0, 1, 2].map((t) => finish('2026-03-09', t)),
      );

      const { stops } = await service.book('u', 7);

      expect(stops.every((s) => s.state === 'done')).toBe(true);
    });
  });

  describe('reflection', () => {
    const reading = (over: object) =>
      repo.reflection.mockResolvedValue({
        stops: [],
        questions: 0,
        feeling: null,
        ...over,
      });

    it('404s for an unknown subject', async () => {
      repo.discipline.mockResolvedValue(null);

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
      });
    });

    it('counts right items as items minus mistakes, never below zero', async () => {
      reading({
        stops: [
          { topic: 0, mistakes: 1, items: 4 },
          { topic: 1, mistakes: 9, items: 3 },
          { topic: 2, mistakes: 0, items: 5 },
        ],
      });

      const { items } = await service.reflection('u', 7);

      expect(items).toEqual({ right: 3 + 0 + 5, total: 12 });
    });

    it('goes further on stops with no mistakes and is stuck on the one with most', async () => {
      reading({
        stops: [
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
      reading({ stops: [{ topic: 0, mistakes: 0, items: 2 }] });

      expect((await service.reflection('u', 7)).stuck).toBeNull();
    });

    it('is finished once every stop is done', async () => {
      repo.finishes.mockResolvedValue(
        [0, 1, 2].map((t) => finish('2026-03-09', t)),
      );

      expect((await service.reflection('u', 7)).finished).toBe(true);
    });

    it('is not finished when a subject has no stops', async () => {
      repo.discipline.mockResolvedValue({ ...discipline, topics: [] });

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
  });

  it('achievements counts the questions asked: the 10th earns curiosidade_de_gato', async () => {
    const times = Array.from(
      { length: 10 },
      (_, i) => new Date(`2026-03-09T10:0${i}:00Z`),
    );
    repo.questionTimes.mockResolvedValue(times);

    const list = await service.achievements('u');

    expect(list).toEqual([
      { code: 'curiosidade_de_gato', earnedAt: times[9].toISOString() },
    ]);
    expect(repo.questionTimes).toHaveBeenCalledWith('u');
  });

  it('home includes the achievements that come from questions', async () => {
    repo.questionTimes.mockResolvedValue(
      Array.from({ length: 10 }, () => new Date('2026-03-09T10:00:00Z')),
    );

    const { achievements } = await service.home('u');

    expect(achievements.map((a) => a.code)).toEqual(['curiosidade_de_gato']);
  });

  it('achievements derives from the finishes', async () => {
    repo.finishes.mockResolvedValue([finish('2026-03-09', 0)]);

    const list = await service.achievements('u');

    expect(list.map((a) => a.code)).toEqual(['primeira_parada']);
  });
});
