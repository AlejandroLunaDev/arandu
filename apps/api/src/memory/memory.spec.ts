import { fakeModel, type FakeModel } from '@nestjs/ai/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createHttpApp,
  fakeMemoryRepository,
  SESSION_ID,
  USER_ID,
  withMemory,
} from '../../test/http-app.js';
import { MemoryModule } from './memory.module.js';
import { MemoryService } from './memory.service.js';

describe('Memory', () => {
  let app: INestApplication;
  let model: FakeModel;
  let memory: ReturnType<typeof fakeMemoryRepository>;

  beforeEach(async () => {
    model = fakeModel('Você gosta de lógica.  ');
    memory = fakeMemoryRepository();
    app = await createHttpApp([MemoryModule], model, [withMemory(memory)]);
  });

  afterEach(() => app.close());

  describe('GET and DELETE /arandu/memory', () => {
    it('GET returns what Arandu remembers of the person', async () => {
      const remembered = {
        profile: null,
        summary: 'Gosta de lógica.',
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

  describe('openSession', () => {
    const open = () =>
      app.get(MemoryService).openSession(USER_ID, 'career', 'direito');

    it('folds the unsummarized sessions into the summary with one model call', async () => {
      memory.unsummarized.mockResolvedValue({
        sessionIds: ['s1', 's2'],
        transcript: 'Session (onboarding):\nuser: Gosto de xadrez',
      });
      memory.read.mockResolvedValue({
        profile: null,
        summary: 'Nota antiga.',
        sessions: [],
      });

      const id = await open();

      expect(model.calls).toHaveLength(1);
      expect(model.lastCall?.lastUserMessage).toContain('Nota antiga.');
      expect(model.lastCall?.lastUserMessage).toContain('Gosto de xadrez');
      expect(memory.saveSummary).toHaveBeenCalledWith(
        USER_ID,
        'Você gosta de lógica.',
        ['s1', 's2'],
      );
      expect(memory.createSession).toHaveBeenCalledWith(
        USER_ID,
        'career',
        'direito',
      );
      expect(id).toBe(SESSION_ID);
    });

    it('skips the model when there is nothing to fold', async () => {
      await open();

      expect(model.calls).toHaveLength(0);
      expect(memory.saveSummary).not.toHaveBeenCalled();
      expect(memory.createSession).toHaveBeenCalledOnce();
    });
  });
});
