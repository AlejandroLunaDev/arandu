import { AiModule } from '@nestjs/ai';
import { fakeModel, type FakeModel } from '@nestjs/ai/testing';
import {
  Global,
  type INestApplication,
  Module,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SQL } from '../database.module.js';
import { AranduModule } from './arandu.module.js';

const row = (over: Record<string, unknown> = {}) => ({
  course_id: 'c1',
  institution: 'USP',
  course: 'Direito',
  city: 'São Paulo',
  shift: null,
  term: 1,
  subject: 'Introdução ao Estudo do Direito',
  hours: '60',
  is_elective: false,
  source_label: 'Jupiterweb USP',
  source_url: 'https://example.org/usp',
  retrieved_at: new Date('2026-11-01T00:00:00Z'),
  ...over,
});

const createApp = async (model: FakeModel, sql: ReturnType<typeof vi.fn>) => {
  @Global()
  @Module({ providers: [{ provide: SQL, useValue: sql }], exports: [SQL] })
  class FakeDatabaseModule {}
  const moduleRef = await Test.createTestingModule({
    imports: [
      FakeDatabaseModule,
      AiModule.forRoot({ isGlobal: true, models: { default: model } }),
      AranduModule,
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  // AppModule registers this pipe as APP_PIPE; this module is built from AranduModule, so mirror it here.
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  await app.init();
  return app;
};

describe('POST /arandu/chat', () => {
  let app: INestApplication;
  let model: FakeModel;
  const sql = vi.fn();
  const body = {
    professionSlug: 'direito',
    messages: [{ role: 'user', content: 'Oi!' }],
  };
  const post = (b: unknown = body) =>
    request(app.getHttpServer())
      .post('/arandu/chat')
      .send(b as object);

  // First query: the profession; second: its first-term subjects.
  const db = (profession: unknown[], subjects: unknown[] = []) =>
    sql.mockResolvedValueOnce(profession).mockResolvedValueOnce(subjects);

  beforeEach(async () => {
    model = fakeModel('Oi, tudo bem?');
    sql.mockReset();
    app = await createApp(model, sql);
  });

  afterEach(() => app.close());

  it('answers with the model reply and deduplicated sources, grounded on the subjects', async () => {
    db([{ name: 'Direito' }], [row(), row({ subject: 'Teoria do Estado' })]);

    const res = await post().expect(200);

    expect(res.body.reply).toBe('Oi, tudo bem?');
    expect(res.body.sources).toEqual([
      {
        label: 'Jupiterweb USP',
        url: 'https://example.org/usp',
        retrievedAt: '2026-11-01T00:00:00.000Z',
      },
    ]);
    expect(model.lastCall?.lastUserMessage).toBe('Oi!');
    expect(model.lastCall?.instructions).toContain(
      'Introdução ao Estudo do Direito',
    );
    expect(model.lastCall?.instructions).toContain('Jupiterweb USP');
  });

  it('groups subjects by course and marks a course without term as the whole first year', async () => {
    db(
      [{ name: 'Design' }],
      [
        row(),
        row({
          course_id: 'c2',
          institution: 'FIAP',
          term: null,
          subject: 'Tipografia',
          source_url: 'https://example.org/fiap',
        }),
      ],
    );

    await post().expect(200);

    const prompt = model.lastCall?.instructions ?? '';
    expect(prompt.match(/Source: /g)).toHaveLength(2);
    expect(prompt).toMatch(/FIAP, Direito, São Paulo: first year/);
    expect(prompt).toMatch(/USP, Direito, São Paulo: first semester/);
  });

  it('splits a course published in two shifts into one block per shift', async () => {
    db(
      [{ name: 'Administração' }],
      [
        row({ shift: 'integral', subject: 'Teoria Geral da Administração' }),
        row({ shift: 'noturno', subject: 'Contabilidade Básica' }),
      ],
    );

    await post().expect(200);

    const prompt = model.lastCall?.instructions ?? '';
    expect(prompt.match(/Source: /g)).toHaveLength(2);
    const [integral, noturno] = ['integral', 'noturno'].map((shift) =>
      prompt.split('\n\n').find((block) => block.includes(`, ${shift}:`)),
    );
    expect(integral).toContain('Teoria Geral da Administração');
    expect(integral).not.toContain('Contabilidade Básica');
    expect(noturno).toContain('Contabilidade Básica');
    expect(noturno).not.toContain('Teoria Geral da Administração');
  });

  it('sends only the recent messages, starting on a user message', async () => {
    db([{ name: 'Direito' }], [row()]);
    const messages = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `m${i}`,
    }));

    await post({ ...body, messages }).expect(200);

    const sent = (model.lastCall?.options.prompt ?? []).filter(
      (m) => m.role !== 'system',
    );
    // 12 sliced, then the leading assistant message dropped.
    expect(sent).toHaveLength(11);
    expect(sent[0]?.role).toBe('user');
    expect(model.lastCall?.lastUserMessage).toBe('m14');
  });

  it.each([
    ['an unknown slug', [], []],
    ['a profession with no subjects', [{ name: 'Direito' }], []],
  ])(
    '404s without calling the model for %s',
    async (_, profession, subjects) => {
      db(profession, subjects);

      await post().expect(404);

      expect(model.calls).toHaveLength(0);
    },
  );

  it.each([
    ['a bad slug', { ...body, professionSlug: 'Direito!' }],
    ['no messages', { ...body, messages: [] }],
    [
      'an assistant last message',
      { ...body, messages: [{ role: 'assistant', content: 'Oi' }] },
    ],
    [
      'a 2001-char message',
      { ...body, messages: [{ role: 'user', content: 'a'.repeat(2001) }] },
    ],
    [
      '31 messages',
      {
        ...body,
        messages: Array.from({ length: 31 }, () => ({
          role: 'user',
          content: 'Oi',
        })),
      },
    ],
  ])('400s without calling the model for %s', async (_, invalid) => {
    await post(invalid).expect(400);

    expect(model.calls).toHaveLength(0);
    expect(sql).not.toHaveBeenCalled();
  });
});

const profile = (over: Record<string, unknown> = {}) => ({
  situation: null,
  likedSubjects: [],
  hardSubjects: [],
  interests: [],
  workStyle: [],
  admired: [],
  careerIdea: null,
  covered: [],
  ...over,
});
const ALL_TOPICS = [
  'situation',
  'likedSubjects',
  'hardSubjects',
  'interests',
  'workStyle',
  'admired',
  'careerIdea',
];
const user = (content = 'Oi') => ({ role: 'user', content });

describe('POST /arandu/onboarding', () => {
  let app: INestApplication;
  let model: FakeModel;
  const sql = vi.fn();
  const post = (b: unknown) =>
    request(app.getHttpServer())
      .post('/arandu/onboarding')
      .send(b as object);
  const turn = (over: Record<string, unknown> = {}) => ({
    profile: profile(),
    reply: 'Próxima pergunta?',
    quickReplies: ['a', 'b'],
    ...over,
  });

  const start = async (over: Record<string, unknown> = {}) => {
    model = fakeModel({ object: turn(over) });
    app = await createApp(model, sql);
  };

  afterEach(() => app.close());

  it('starts with a prompt, not messages, when there are none', async () => {
    await start();

    const res = await post({ messages: [] }).expect(200);

    expect(res.body).toMatchObject({
      reply: 'Próxima pergunta?',
      quickReplies: ['a', 'b'],
      done: false,
    });
    expect(model.lastCall?.lastUserMessage).toBe('Start the onboarding.');
    expect(model.calls).toHaveLength(1);
  });

  it('is done, with no quick replies, once the profile covers every topic', async () => {
    await start({ profile: profile({ covered: ALL_TOPICS }) });

    const res = await post({ messages: [user()] }).expect(200);

    expect(res.body.done).toBe(true);
    expect(res.body.quickReplies).toEqual([]);
    expect(res.body.progress).toEqual({ answered: 7, total: 7 });
  });

  it('is done after 10 answers even with topics missing', async () => {
    await start();

    const res = await post({
      messages: Array.from({ length: 10 }, () => user()),
    }).expect(200);

    expect(res.body.done).toBe(true);
    expect(res.body.quickReplies).toEqual([]);
    expect(res.body.progress.answered).toBe(0);
  });

  it('dedupes covered, reports progress and caps quick replies at 5', async () => {
    await start({
      profile: profile({ covered: ['situation', 'situation', 'interests'] }),
      quickReplies: ['1', '2', '3', '4', '5', '6', '7'],
    });

    const res = await post({ messages: [user()] }).expect(200);

    expect(res.body.profile.covered).toEqual(['situation', 'interests']);
    expect(res.body.progress).toEqual({ answered: 2, total: 7 });
    expect(res.body.quickReplies).toEqual(['1', '2', '3', '4', '5']);
    expect(res.body.done).toBe(false);
  });

  it.each([
    ['an assistant last message', [{ role: 'assistant', content: 'Oi' }]],
    ['a 2001-char message', [user('a'.repeat(2001))]],
    ['31 messages', Array.from({ length: 31 }, () => user())],
  ])('400s without calling the model for %s', async (_, messages) => {
    await start();

    await post({ messages }).expect(400);

    expect(model.calls).toHaveLength(0);
  });
});

describe('POST /arandu/recommendations', () => {
  let app: INestApplication;
  let model: FakeModel;
  const sql = vi.fn();
  const post = (b: unknown) =>
    request(app.getHttpServer())
      .post('/arandu/recommendations')
      .send(b as object);
  const careerRow = (slug: string, institution: string) => ({
    slug,
    name: slug.toUpperCase(),
    institution,
    city: 'São Paulo',
  });
  const slugs = ['a', 'b', 'c', 'd', 'e'];

  const start = async (picks: string[]) => {
    sql
      .mockReset()
      .mockResolvedValue([
        ...slugs.map((s) => careerRow(s, 'USP')),
        careerRow('a', 'FIAP'),
      ]);
    model = fakeModel({
      object: {
        careers: picks.map((slug) => ({ slug, reason: `why ${slug}` })),
      },
    });
    app = await createApp(model, sql);
  };

  afterEach(() => app.close());

  it('groups offerings per profession, dedupes slugs and returns at most 4', async () => {
    await start(['a', 'a', 'b', 'c', 'd', 'e']);

    const res = await post({ profile: profile() }).expect(200);

    expect(
      res.body.careers.map(
        (c: { profession: { slug: string } }) => c.profession.slug,
      ),
    ).toEqual(['a', 'b', 'c', 'd']);
    expect(res.body.careers[0]).toEqual({
      profession: { slug: 'a', name: 'A' },
      offerings: [
        { institution: 'USP', city: 'São Paulo' },
        { institution: 'FIAP', city: 'São Paulo' },
      ],
      reason: 'why a',
    });
  });

  it('400s without calling the model when admired is missing', async () => {
    await start(['a']);
    const { admired: _, ...rest } = profile();

    await post({ profile: rest }).expect(400);

    expect(model.calls).toHaveLength(0);
  });

  it.each([
    ['an unknown covered topic', profile({ covered: ['astrology'] })],
    ['an item over 200 chars', profile({ interests: ['a'.repeat(201)] })],
  ])('400s without calling the model for %s', async (_, p) => {
    await start(['a']);

    await post({ profile: p }).expect(400);

    expect(model.calls).toHaveLength(0);
  });
});
