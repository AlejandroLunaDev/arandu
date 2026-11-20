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
import {
  CareersRepository,
  type ProfessionFirstTerm,
} from '../careers/careers.repository.js';
import { CareerChatModule } from './career-chat.module.js';

const course = (over: Record<string, unknown> = {}) => ({
  institution: 'USP',
  course: 'Direito',
  city: 'São Paulo',
  shift: null,
  wholeYear: false,
  subjects: [
    { name: 'Introdução ao Estudo do Direito', hours: 60, isElective: false },
  ],
  source: {
    label: 'Jupiterweb USP',
    url: 'https://example.org/usp',
    retrievedAt: '2026-11-01T00:00:00.000Z',
  },
  ...over,
});
const direito = (courses: unknown[] = [course()]) =>
  ({ name: 'Direito', courses }) as ProfessionFirstTerm;

describe('POST /arandu/chat', () => {
  let app: INestApplication;
  let model: FakeModel;
  let memory: ReturnType<typeof fakeMemoryRepository>;
  let firstTerm: ReturnType<typeof vi.fn>;
  const body = { professionSlug: 'direito', message: 'Oi!' };

  beforeEach(async () => {
    model = fakeModel('Oi, tudo bem?');
    memory = fakeMemoryRepository();
    firstTerm = vi.fn().mockResolvedValue(direito());
    app = await createHttpApp([CareerChatModule], model, [
      withMemory(memory),
      [CareersRepository, { firstTerm }],
    ]);
  });

  afterEach(() => app.close());

  const post = (b: unknown = body) =>
    request(app.getHttpServer())
      .post('/arandu/chat')
      .send(b as object);

  it('opens a session, answers grounded on the subjects with deduped sources and records the exchange', async () => {
    firstTerm.mockResolvedValue(
      direito([course(), course({ institution: 'PUC' })]),
    );

    const res = await post().expect(200);

    expect(res.body).toEqual({
      sessionId: SESSION_ID,
      reply: 'Oi, tudo bem?',
      sources: [
        {
          label: 'Jupiterweb USP',
          url: 'https://example.org/usp',
          retrievedAt: '2026-11-01T00:00:00.000Z',
        },
      ],
    });
    expect(memory.createSession).toHaveBeenCalledWith(
      USER_ID,
      'career',
      'direito',
    );
    expect(model.lastCall?.instructions).toContain(
      'Introdução ao Estudo do Direito',
    );
    expect(memory.addMessages).toHaveBeenCalledWith(SESSION_ID, [
      { role: 'user', content: 'Oi!' },
      { role: 'assistant', content: 'Oi, tudo bem?' },
    ]);
  });

  it('continues the given session without opening another', async () => {
    memory.sessionMessages.mockResolvedValue([
      { role: 'user', content: 'antes' },
      { role: 'assistant', content: 'resposta' },
    ]);

    const res = await post({ ...body, sessionId: SESSION_ID }).expect(200);

    expect(res.body.sessionId).toBe(SESSION_ID);
    expect(memory.createSession).not.toHaveBeenCalled();
    expect(memory.sessionMessages).toHaveBeenCalledWith(
      USER_ID,
      SESSION_ID,
      'career',
      11,
      'direito',
    );
  });

  it('404s for a session that is not the person own, without calling the model', async () => {
    memory.sessionMessages.mockResolvedValue(null);

    await post({ ...body, sessionId: SESSION_ID }).expect(404);

    expect(model.calls).toHaveLength(0);
  });

  it.each([
    ['an unknown slug', null],
    ['a profession with no curriculum', direito([])],
  ])(
    '404s for %s, opening no session and not calling the model',
    async (_, found) => {
      firstTerm.mockResolvedValue(found);

      await post().expect(404);

      expect(memory.createSession).not.toHaveBeenCalled();
      expect(model.calls).toHaveLength(0);
    },
  );

  it('sends only the last 12 messages, starting on a user message', async () => {
    // 14 stored + the new one = 15; the last 12 start on an assistant message, which is dropped.
    memory.sessionMessages.mockResolvedValue(
      Array.from({ length: 14 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `m${i}`,
      })),
    );

    await post({ ...body, sessionId: SESSION_ID }).expect(200);

    const sent = (model.lastCall?.options.prompt ?? []).filter(
      (m) => m.role !== 'system',
    );
    expect(sent).toHaveLength(11);
    expect(sent[0]?.role).toBe('user');
    expect(model.lastCall?.lastUserMessage).toBe('Oi!');
  });

  it('gives the memory summary and profile to the model', async () => {
    memory.read.mockResolvedValue({
      profile: { interests: ['xadrez'] },
      summary: 'Gosta de lógica.',
      sessions: [],
    });

    await post().expect(200);

    expect(model.lastCall?.instructions).toContain('Gosta de lógica.');
    expect(model.lastCall?.instructions).toContain('xadrez');
  });

  it('marks a course with no term as the whole first year', async () => {
    firstTerm.mockResolvedValue(
      direito([
        course(),
        course({
          institution: 'FIAP',
          wholeYear: true,
          source: {
            label: 'FIAP',
            url: 'https://example.org/fiap',
            retrievedAt: '2026-11-01T00:00:00.000Z',
          },
        }),
      ]),
    );

    await post().expect(200);

    const prompt = model.lastCall?.instructions ?? '';
    expect(prompt.match(/Source: /g)).toHaveLength(2);
    expect(prompt).toMatch(/FIAP, Direito, São Paulo: first year/);
    expect(prompt).toMatch(/USP, Direito, São Paulo: first semester/);
  });

  it.each([
    ['a bad slug', { ...body, professionSlug: 'Direito!' }],
    ['an extra key', { ...body, extra: 1 }],
    ['a 2001-char message', { ...body, message: 'a'.repeat(2001) }],
    ['a bad session id', { ...body, sessionId: 'nope' }],
    ['no message', { professionSlug: 'direito' }],
  ])(
    '400s without touching the catalog, memory or model for %s',
    async (_, invalid) => {
      await post(invalid).expect(400);

      expect(firstTerm).not.toHaveBeenCalled();
      expect(memory.createSession).not.toHaveBeenCalled();
      expect(model.calls).toHaveLength(0);
    },
  );
});
