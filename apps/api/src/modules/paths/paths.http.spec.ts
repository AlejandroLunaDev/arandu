import { fakeModel } from '@nestjs/ai/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHttpApp, USER_ID } from '../../../test/http-app.js';
import { JourneyModule } from '../journey/journey.module.js';
import { JourneyRepository } from '../journey/journey.repository.js';
import { PathsModule } from './paths.module.js';
import { ProgressRepository } from '../progress/progress.repository.js';
import { PathsRepository } from './paths.repository.js';
import { lessonLocked } from './paths.errors.js';

describe('paths and journey routes', () => {
  let app: INestApplication;
  const journey = { read: vi.fn(), update: vi.fn() };
  const progress = {
    finishes: vi.fn(),
    achievements: vi.fn(),
    topicCounts: vi.fn(),
    questionTimes: vi.fn(),
    studyTimes: vi.fn(),
  };
  const paths = {
    careerPaths: vi.fn(),
    discipline: vi.fn(),
    lessons: vi.fn(),
    chapterFinished: vi.fn(),
    finishLesson: vi.fn(),
    madeCount: vi.fn(),
    chapterContent: vi.fn(),
    subjectPieces: vi.fn(),
    saveChapterContent: vi.fn(),
    finishChapter: vi.fn(),
    saveQuestion: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    journey.update.mockResolvedValue({});
    paths.discipline.mockResolvedValue({
      id: 7,
      name: 'C',
      topics: ['a', 'b'],
    });
    paths.madeCount.mockResolvedValue(2);
    paths.subjectPieces.mockResolvedValue([]);
    progress.finishes.mockResolvedValue([]);
    progress.topicCounts.mockResolvedValue(new Map());
    progress.questionTimes.mockResolvedValue([]);
    progress.studyTimes.mockResolvedValue([]);
    paths.finishChapter.mockResolvedValue({
      sabedoria: 15,
      peixinhos: 5,
      patinha: true,
    });
    app = await createHttpApp(
      [JourneyModule, PathsModule],
      fakeModel({ object: {} }),
      [
        [JourneyRepository, journey],
        [PathsRepository, paths],
        [ProgressRepository, progress],
      ],
    );
  });
  afterEach(() => app.close());

  const server = () => request(app.getHttpServer());

  describe('PATCH /me/journey', () => {
    it('passes a valid partial update with the user id', async () => {
      await server()
        .patch('/me/journey')
        .send({ weeklyGoal: 5, age: null })
        .expect(200);

      expect(journey.update).toHaveBeenCalledWith(USER_ID, {
        weeklyGoal: 5,
        age: null,
      });
    });

    it.each([
      ['weeklyGoal 4', { weeklyGoal: 4 }],
      ['age 9', { age: 9 }],
      ['age 121', { age: 121 }],
      ['age 20.5', { age: 20.5 }],
      ['courseId 0', { courseId: 0 }],
      ['disciplineId -1', { disciplineId: -1 }],
      ['courseId 1.5', { courseId: 1.5 }],
      ['a bad slug', { professionSlug: 'Direito!' }],
      ['an extra key', { nope: 1 }],
      [
        '11 picks',
        {
          answers: [
            { topic: 'interests', picks: Array(11).fill('a'), text: null },
          ],
        },
      ],
    ])('400s for %s without touching the repository', async (_, body) => {
      await server().patch('/me/journey').send(body).expect(400);

      expect(journey.update).not.toHaveBeenCalled();
    });
  });

  describe('GET /careers/:slug/paths', () => {
    it('404s for an unknown career', async () => {
      paths.careerPaths.mockResolvedValue(null);

      await server().get('/careers/direito/paths').expect(404);
    });

    it('404s for a bad slug', async () => {
      await server().get('/careers/Direito_X/paths').expect(404);

      expect(paths.careerPaths).not.toHaveBeenCalled();
    });
  });

  describe('GET /chapters/:disciplineId/:topic', () => {
    it.each([
      '/chapters/0/0',
      '/chapters/abc/0',
      '/chapters/7/-1',
      '/chapters/7/201',
    ])('404s for %s', async (url) => {
      await server().get(url).expect(404);

      expect(paths.discipline).not.toHaveBeenCalled();
    });

    it('404s for a topic out of range', async () => {
      await server().get('/chapters/7/2').expect(404);
    });
  });

  describe('POST /chapters/:disciplineId/:topic/result', () => {
    beforeEach(() => {
      paths.chapterContent.mockResolvedValue({ cards: [], exercises: [] });
    });

    it('404s when the chapter was never opened (no stored content)', async () => {
      paths.chapterContent.mockResolvedValue(null);

      await server()
        .post('/chapters/7/1/result')
        .send({ mistakes: 0 })
        .expect(404);

      expect(paths.finishChapter).not.toHaveBeenCalled();
    });

    it('records the finish for the user', async () => {
      const res = await server()
        .post('/chapters/7/1/result')
        .send({ mistakes: 2 })
        .expect(200);

      expect(paths.finishChapter).toHaveBeenCalledWith(USER_ID, 7, 1, 2, null);
      expect(res.body.sabedoria).toBe(15);
      expect(res.body.peixinhos).toBe(5);
      expect(res.body.achievements).toEqual([]);
    });

    it('passes relampagoMistakes through', async () => {
      await server()
        .post('/chapters/7/1/result')
        .send({ mistakes: 2, relampagoMistakes: 0 })
        .expect(200);

      expect(paths.finishChapter).toHaveBeenCalledWith(USER_ID, 7, 1, 2, 0);
    });

    it('drops relampagoMistakes when there were no mistakes to review', async () => {
      await server()
        .post('/chapters/7/1/result')
        .send({ mistakes: 0, relampagoMistakes: 0 })
        .expect(200);

      expect(paths.finishChapter).toHaveBeenCalledWith(USER_ID, 7, 1, 0, null);
    });

    it('accepts relampagoMistakes null', async () => {
      await server()
        .post('/chapters/7/1/result')
        .send({ mistakes: 2, relampagoMistakes: null })
        .expect(200);

      expect(paths.finishChapter).toHaveBeenCalledWith(USER_ID, 7, 1, 2, null);
    });

    it.each([
      ['relampagoMistakes -1', { mistakes: 0, relampagoMistakes: -1 }],
      ['relampagoMistakes 101', { mistakes: 0, relampagoMistakes: 101 }],
      ['relampagoMistakes 1.5', { mistakes: 0, relampagoMistakes: 1.5 }],
      ['mistakes -1', { mistakes: -1 }],
      ['mistakes 101', { mistakes: 101 }],
      ['mistakes 1.5', { mistakes: 1.5 }],
      ['no mistakes', {}],
      ['an extra key', { mistakes: 0, extra: 1 }],
    ])('400s for %s', async (_, body) => {
      await server().post('/chapters/7/1/result').send(body).expect(400);

      expect(paths.finishChapter).not.toHaveBeenCalled();
    });

    it('404s for a topic out of range', async () => {
      await server()
        .post('/chapters/7/2/result')
        .send({ mistakes: 0 })
        .expect(404);

      expect(paths.finishChapter).not.toHaveBeenCalled();
    });
  });

  describe('lesson routes', () => {
    it.each(['start', 'continue', 'extra-life'])(
      'POST lesson 0, 4 and abc %s 404',
      async (action) => {
        for (const n of ['0', '4', 'abc'])
          await server()
            .post(`/chapters/7/1/lessons/${n}/${action}`)
            .expect(404);

        expect(paths.lessons).not.toHaveBeenCalled();
      },
    );

    it.each(['0', '4', 'abc'])('GET sample lesson %s 404s', async (n) => {
      await server().get(`/chapters/7/1/lessons/${n}`).expect(404);

      expect(paths.discipline).not.toHaveBeenCalled();
    });

    it('GET serves a sample lesson and records nothing', async () => {
      paths.chapterContent.mockResolvedValue({
        discipline: { id: 7, name: 'C' },
        topic: { index: 1, text: 'b', total: 2 },
        cards: [],
        exercises: [],
        pieces: [],
      });

      const { body } = await server()
        .get('/chapters/7/1/lessons/1')
        .expect(200);

      expect(body).toMatchObject({ index: 1, total: 3, lives: 3 });
      expect(paths.lessons).not.toHaveBeenCalled();
      expect(paths.finishLesson).not.toHaveBeenCalled();
    });

    it.each(['0', '4'])('POST lesson %s result 404s', async (n) => {
      await server()
        .post(`/chapters/7/1/lessons/${n}/result`)
        .send({ missed: [] })
        .expect(404);

      expect(paths.finishLesson).not.toHaveBeenCalled();
    });

    it.each([
      ['an unknown key', { missed: [], extra: 1 }],
      ['an unknown key in a miss', { missed: [{ topic: 0, index: 0, x: 1 }] }],
      ['no missed', {}],
      ['index 100', { missed: [{ topic: 0, index: 100 }] }],
      ['topic 201', { missed: [{ topic: 201, index: 0 }] }],
      ['51 misses', { missed: Array(51).fill({ topic: 0, index: 0 }) }],
    ])('POST result 400s for %s', async (_, body) => {
      await server()
        .post('/chapters/7/1/lessons/1/result')
        .send(body)
        .expect(400);

      expect(paths.finishLesson).not.toHaveBeenCalled();
    });
  });

  describe('POST lesson result when an earlier lesson is not done', () => {
    it('409s with lesson_locked', async () => {
      paths.chapterContent.mockResolvedValue({
        topic: { index: 1 },
        discipline: { id: 7 },
        cards: [],
        exercises: [],
      });
      paths.lessons.mockResolvedValue([]);
      progress.achievements.mockResolvedValue([]);
      paths.finishLesson.mockRejectedValue(lessonLocked());

      const res = await server()
        .post('/chapters/7/1/lessons/3/result')
        .send({ missed: [] })
        .expect(409);

      expect(res.body).toMatchObject({ error: { code: 'lesson_locked' } });
    });
  });

  describe('POST /chapters/:disciplineId/:topic/explain and /ask', () => {
    it.each([
      ['explain', { answer: '' }],
      ['explain', { answer: '   ' }],
      ['explain', { answer: 'a'.repeat(1501) }],
      ['explain', { answer: 'ok', extra: 1 }],
      ['explain', {}],
      ['ask', { question: '' }],
      ['ask', { question: 'a'.repeat(501) }],
      ['ask', { question: 'ok', extra: 1 }],
      ['ask', {}],
    ])(
      '400s for %s with %j without reading the chapter',
      async (route, body) => {
        await server().post(`/chapters/7/1/${route}`).send(body).expect(400);

        expect(paths.chapterContent).not.toHaveBeenCalled();
        expect(paths.saveQuestion).not.toHaveBeenCalled();
      },
    );

    it.each(['explain', 'ask'])(
      '%s 404s when the chapter is not open',
      async (route) => {
        paths.chapterContent.mockResolvedValue(null);
        const body = route === 'ask' ? { question: 'q' } : { answer: 'a' };

        await server().post(`/chapters/7/1/${route}`).send(body).expect(404);
      },
    );

    it('explain accepts an answer of 1500 characters (limit passes validation)', async () => {
      paths.chapterContent.mockResolvedValue(null);

      await server()
        .post('/chapters/7/1/explain')
        .send({ answer: 'a'.repeat(1500) })
        .expect(404);
    });
  });
});
