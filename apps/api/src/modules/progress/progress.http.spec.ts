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
    novelos: 4,
    maxNovelos: 5,
    nextNoveloAt: '2026-03-10T12:30:00.000Z',
    peixinhos: 0,
    marcadores: 0,
    refillPrice: 100,
  };
  const repo = {
    wallet: vi.fn(),
    finishes: vi.fn(),
    sabedoria: vi.fn(),
    calendar: vi.fn(),
    journey: vi.fn(),
    topicCounts: vi.fn(),
    questionTimes: vi.fn(),
    discipline: vi.fn(),
    spend: vi.fn(),
    reread: vi.fn(),
    reflection: vi.fn(),
    saveReflection: vi.fn(),
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
    repo.discipline.mockResolvedValue({ id: 7, name: 'C', topics: ['a', 'b'] });
    repo.spend.mockResolvedValue(wallet);
    repo.reread.mockResolvedValue(wallet);
    repo.reflection.mockResolvedValue({
      stops: [],
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
    it('returns the stops with their state', async () => {
      const res = await server().get('/me/books/7').expect(200);

      expect(res.body.stops.map((s: { state: string }) => s.state)).toEqual([
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

  describe('POST /me/novelos/spend', () => {
    it('spends for the user and returns the wallet', async () => {
      const res = await server().post('/me/novelos/spend').expect(200);

      expect(repo.spend).toHaveBeenCalledWith(USER_ID);
      expect(res.body).toEqual(wallet);
    });
  });

  describe('POST /stops/:disciplineId/:topic/reread', () => {
    it('gives back for the current stop', async () => {
      const res = await server().post('/stops/7/0/reread').expect(200);

      expect(repo.reread).toHaveBeenCalledWith(USER_ID, 7, 0);
      expect(res.body).toEqual(wallet);
    });

    it('gives back for a finished stop', async () => {
      repo.finishes.mockResolvedValue([
        {
          disciplineId: 7,
          topic: 0,
          mistakes: 0,
          day: '2026-03-10',
          completedAt: new Date('2026-03-10T15:00:00Z'),
        },
      ]);

      await server().post('/stops/7/0/reread').expect(200);

      expect(repo.reread).toHaveBeenCalledWith(USER_ID, 7, 0);
    });

    it('409s for a locked stop', async () => {
      await server().post('/stops/7/1/reread').expect(409);

      expect(repo.reread).not.toHaveBeenCalled();
    });

    it('404s for an unknown subject', async () => {
      repo.discipline.mockResolvedValue(null);

      await server().post('/stops/7/0/reread').expect(404);

      expect(repo.reread).not.toHaveBeenCalled();
    });

    it('404s for a topic out of range', async () => {
      await server().post('/stops/7/2/reread').expect(404);

      expect(repo.reread).not.toHaveBeenCalled();
    });

    it.each([
      '/stops/0/0/reread',
      '/stops/7/-1/reread',
      '/stops/7/201/reread',
      '/stops/x/0/reread',
    ])('404s for %s', async (url) => {
      await server().post(url).expect(404);

      expect(repo.reread).not.toHaveBeenCalled();
    });
  });
});
