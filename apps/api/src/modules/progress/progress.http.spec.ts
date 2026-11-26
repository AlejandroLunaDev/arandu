import { fakeModel } from '@nestjs/ai/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHttpApp, USER_ID } from '../../../test/http-app.js';
import { ProgressModule } from './progress.module.js';
import { ProgressRepository } from './progress.repository.js';

const list = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);

describe('progress routes', () => {
  let app: INestApplication;
  const wallet = {
    peixinhos: 50,
    dailyPeixinhos: 60,
    dailyGift: 10,
    nextRefillAt: '2026-03-11T03:00:00.000Z',
    lessonPrice: 15,
    currency: 0,
    continuePrice: 5,
    marcadores: 0,
    vidas: 0,
  };
  const repo = {
    wallet: vi.fn(),
    finishes: vi.fn(),
    sabedoria: vi.fn(),
    calendar: vi.fn(),
    journey: vi.fn(),
    topicCounts: vi.fn(),
    questionTimes: vi.fn(),
    studyTimes: vi.fn(),
    lessonsDone: vi.fn(),
    discipline: vi.fn(),
    reflection: vi.fn(),
    saveReflection: vi.fn(),
    dailyGift: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    repo.wallet.mockResolvedValue(wallet);
    repo.finishes.mockResolvedValue([]);
    repo.sabedoria.mockResolvedValue({ total: 0, week: 0 });
    repo.calendar.mockResolvedValue({
      today: '2026-03-11',
      monday: '2026-03-09',
    });
    repo.journey.mockResolvedValue({ discipline: null, weeklyGoal: null });
    repo.topicCounts.mockResolvedValue(new Map());
    repo.questionTimes.mockResolvedValue([]);
    repo.studyTimes.mockResolvedValue([]);
    repo.lessonsDone.mockResolvedValue(new Map());
    repo.discipline.mockResolvedValue({ id: 7, name: 'C', topics: ['a', 'b'] });
    repo.reflection.mockResolvedValue({
      chapters: [],
      questions: 2,
      feeling: null,
    });
    repo.saveReflection.mockResolvedValue(undefined);
    app = await createHttpApp([ProgressModule], fakeModel({ object: {} }), [
      [ProgressRepository, repo],
    ]);
  });
  afterEach(() => app.close());

  const server = () => request(app.getHttpServer());

  it('GET /me returns the home for the user', async () => {
    const res = await server().get('/me').expect(200);

    expect(repo.wallet).toHaveBeenCalledWith(USER_ID);
    expect(res.body.wallet).toEqual(wallet);
    expect(res.body.week.days).toHaveLength(7);
    expect(res.body.current).toBeNull();
  });

  describe('GET /me/books/:disciplineId', () => {
    it('returns the chapters with their state', async () => {
      const res = await server().get('/me/books/7').expect(200);

      expect(res.body.chapters.map((s: { state: string }) => s.state)).toEqual([
        'current',
        'locked',
      ]);
    });

    it('404s for an unknown subject', async () => {
      repo.discipline.mockResolvedValue(null);

      await server().get('/me/books/7').expect(404);
    });

    it.each(['0', 'abc', '-1', '2147483648'])('404s for %s', async (id) => {
      await server().get(`/me/books/${id}`).expect(404);

      expect(repo.discipline).not.toHaveBeenCalled();
    });
  });

  describe('GET /me/books/:disciplineId/reflection', () => {
    it("returns Arandu's reading of the book", async () => {
      const res = await server().get('/me/books/7/reflection').expect(200);

      expect(repo.reflection).toHaveBeenCalledWith(USER_ID, 7);
      expect(res.body).toMatchObject({
        discipline: { id: 7, name: 'C' },
        finished: false,
        questions: 2,
        stuck: null,
        feeling: null,
      });
    });

    it('404s for an unknown subject', async () => {
      repo.discipline.mockResolvedValue(null);

      await server().get('/me/books/7/reflection').expect(404);
    });

    it.each(['0', 'abc', '2147483648'])('404s for %s', async (id) => {
      await server().get(`/me/books/${id}/reflection`).expect(404);
    });
  });

  describe('POST /me/books/:disciplineId/reflection', () => {
    const post = (body: unknown, id = '7') =>
      server()
        .post(`/me/books/${id}/reflection`)
        .send(body as object);

    it.each([
      [{ chips: ['difícil'], text: null }],
      [{ chips: [], text: 'Gostei' }],
      [{ chips: ['a', 'b', 'c', 'd', 'e'], text: 'x'.repeat(500) }],
    ])('saves %j and answers 204', async (body) => {
      await post(body).expect(204);

      expect(repo.saveReflection).toHaveBeenCalledWith(USER_ID, 7, body);
    });

    it('trims the chips and the text', async () => {
      await post({ chips: ['  ok '], text: ' oi ' }).expect(204);

      expect(repo.saveReflection).toHaveBeenCalledWith(USER_ID, 7, {
        chips: ['ok'],
        text: 'oi',
      });
    });

    it('404s for an unknown subject and saves nothing', async () => {
      repo.discipline.mockResolvedValue(null);

      await post({ chips: ['a'], text: null }).expect(404);

      expect(repo.saveReflection).not.toHaveBeenCalled();
    });

    it.each([
      ['neither chips nor text', { chips: [], text: null }],
      ['more than 5 chips', { chips: list(6), text: null }],
      ['an empty chip', { chips: [''], text: null }],
      ['a blank chip', { chips: ['   '], text: null }],
      ['a chip over 40', { chips: ['x'.repeat(41)], text: null }],
      ['an empty text', { chips: ['a'], text: '' }],
      ['a text over 500', { chips: [], text: 'x'.repeat(501) }],
      ['an unknown key', { chips: ['a'], text: null, extra: 1 }],
      ['no text key', { chips: ['a'] }],
      ['no body', {}],
    ])('400s for %s', async (_, body) => {
      await post(body).expect(400);

      expect(repo.saveReflection).not.toHaveBeenCalled();
    });

    it('404s for a bad subject id', async () => {
      await post({ chips: ['a'], text: null }, '0').expect(404);
    });
  });

  it("gives the day's gift on POST /me/daily-gift", async () => {
    repo.dailyGift.mockResolvedValue({ peixinhos: 10, wallet });
    const res = await server().post('/me/daily-gift').expect(200);
    expect(repo.dailyGift).toHaveBeenCalledWith(USER_ID);
    expect(res.body).toEqual({ peixinhos: 10, wallet });
  });

  it.each(['/me/novelos/spend', '/chapters/7/0/reread'])(
    'has no novelos route: %s is a 404',
    async (url) => {
      await server().post(url).expect(404);
    },
  );
});
