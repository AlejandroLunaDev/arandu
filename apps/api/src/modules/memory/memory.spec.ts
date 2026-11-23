import { fakeModel, type FakeModel } from '@nestjs/ai/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createHttpApp,
  fakeMemoryRepository,
  SESSION_ID,
  USER_ID,
  withMemory,
} from '../../../test/http-app.js';
import { MemoryModule } from './memory.module.js';
import { MemoryService } from './memory.service.js';

describe('Memory', () => {
  let app: INestApplication;
  let model: FakeModel;
  let memory: ReturnType<typeof fakeMemoryRepository>;

  beforeEach(async () => {
    model = fakeModel({
      object: { facts: [{ text: 'Gosta de lógica.', source: 'conversation' }] },
    });
    memory = fakeMemoryRepository();
    app = await createHttpApp([MemoryModule], model, [withMemory(memory)]);
  });

  afterEach(() => app.close());

  describe('GET and DELETE /arandu/memory', () => {
    it('GET returns what Arandu remembers of the person', async () => {
      const remembered = {
        profile: null,
        summary: 'Gosta de lógica.',
        facts: [
          {
            id: 1,
            text: 'Gosta de lógica.',
            source: 'conversation',
            createdAt: '2026-11-01T00:00:00.000Z',
          },
        ],
        sessions: [
          {
            kind: 'career',
            professionSlug: 'direito',
            startedAt: '2026-11-01T00:00:00.000Z',
          },
        ],
      };
      memory.read.mockResolvedValue(remembered);

      const res = await request(app.getHttpServer())
        .get('/arandu/memory')
        .expect(200);

      expect(res.body).toEqual(remembered);
      expect(memory.read).toHaveBeenCalledWith(USER_ID);
    });

    it('DELETE answers 204 and makes the memory forget the person', async () => {
      await request(app.getHttpServer()).delete('/arandu/memory').expect(204);

      expect(memory.forget).toHaveBeenCalledWith(USER_ID);
    });
  });

  describe('GET /arandu/memory/conversations', () => {
    it('returns what the repository gives, asked for the signed-in person only', async () => {
      const listed = {
        conversations: [
          {
            kind: 'career',
            startedAt: '2026-11-02T00:00:00.000Z',
            professionSlug: 'direito',
            stop: null,
            messages: [{ role: 'user', text: 'Oi' }],
          },
        ],
      };
      memory.conversations.mockResolvedValue(listed);

      const res = await request(app.getHttpServer())
        .get('/arandu/memory/conversations')
        .expect(200);

      expect(res.body).toEqual(listed);
      expect(memory.conversations).toHaveBeenCalledOnce();
      expect(memory.conversations).toHaveBeenCalledWith(USER_ID);
    });
  });

  describe('DELETE /arandu/memory/facts/:id', () => {
    it('answers 204 and deletes the fact of the person', async () => {
      await request(app.getHttpServer())
        .delete('/arandu/memory/facts/5')
        .expect(204);

      expect(memory.deleteFact).toHaveBeenCalledWith(USER_ID, 5);
    });

    it('404s when the fact is not theirs', async () => {
      memory.deleteFact.mockResolvedValue(false);

      await request(app.getHttpServer())
        .delete('/arandu/memory/facts/5')
        .expect(404);
    });

    it.each(['0', '-1', 'abc', '1.5', '9007199254740993'])(
      '404s for %s',
      async (id) => {
        await request(app.getHttpServer())
          .delete(`/arandu/memory/facts/${id}`)
          .expect(404);

        expect(memory.deleteFact).not.toHaveBeenCalled();
      },
    );
  });

  describe('openSession', () => {
    const open = () =>
      app.get(MemoryService).openSession(USER_ID, 'career', 'direito');

    it('folds the unsummarized sessions into the facts with one model call', async () => {
      memory.unsummarized.mockResolvedValue({
        sessionIds: ['s1', 's2'],
        questionIds: [],
        transcript: 'Session (source onboarding):\nuser: Gosto de xadrez',
      });
      memory.facts.mockResolvedValue([
        { id: 1, text: 'Nota antiga.', source: 'onboarding', createdAt: 'x' },
      ]);

      const id = await open();

      expect(model.calls).toHaveLength(1);
      expect(model.lastCall?.lastUserMessage).toContain('Nota antiga.');
      expect(model.lastCall?.lastUserMessage).toContain('Gosto de xadrez');
      expect(memory.saveFacts).toHaveBeenCalledWith(
        USER_ID,
        [1],
        [{ text: 'Gosta de lógica.', source: 'conversation' }],
        ['s1', 's2'],
        [],
      );
      expect(memory.createSession).toHaveBeenCalledWith(
        USER_ID,
        'career',
        'direito',
      );
      expect(id).toBe(SESSION_ID);
    });

    it('folds stop questions even with no unsummarized session', async () => {
      memory.unsummarized.mockResolvedValue({
        sessionIds: [],
        questionIds: [9],
        transcript:
          'Questions on stop cards (source stop):\n- (Limites) Por quê?',
      });

      await open();

      expect(model.calls).toHaveLength(1);
      expect(model.lastCall?.lastUserMessage).toContain('Por quê?');
      expect(memory.saveFacts).toHaveBeenCalledWith(
        USER_ID,
        [],
        [{ text: 'Gosta de lógica.', source: 'conversation' }],
        [],
        [9],
      );
    });

    it('still opens the session when the facts changed meanwhile and nothing was saved', async () => {
      memory.unsummarized.mockResolvedValue({
        sessionIds: ['s1'],
        questionIds: [],
        transcript: 't',
      });
      memory.saveFacts.mockResolvedValue(false);

      await expect(open()).resolves.toBe(SESSION_ID);
    });

    it('skips the model when there is nothing to fold', async () => {
      await open();

      expect(model.calls).toHaveLength(0);
      expect(memory.saveFacts).not.toHaveBeenCalled();
      expect(memory.createSession).toHaveBeenCalledOnce();
    });

    it('does not open the session when the model gives more than 15 facts', async () => {
      memory.unsummarized.mockResolvedValue({
        sessionIds: ['s1'],
        questionIds: [],
        transcript: 't',
      });
      await app.close();
      app = await createHttpApp(
        [MemoryModule],
        fakeModel({
          object: {
            facts: Array.from({ length: 16 }, () => ({
              text: 'a',
              source: 'stop',
            })),
          },
        }),
        [withMemory(memory)],
      );

      await expect(open()).rejects.toThrow();
      expect(memory.saveFacts).not.toHaveBeenCalled();
      expect(memory.createSession).not.toHaveBeenCalled();
    });
  });
});
