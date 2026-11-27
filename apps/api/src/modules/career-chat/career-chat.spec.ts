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
import {
  CareersRepository,
  type ProfessionFirstTerm,
} from '../careers/careers.repository.js';
import { SAFE_REPLY } from '../arandu/arandu.safety.js';
import { CareerChatModule } from './career-chat.module.js';
import { ProgressRepository } from '../progress/progress.repository.js';
import {
  careerChatInstructions,
  choosingInstructions,
} from './career-chat.prompt.js';

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
      [ProgressRepository, { studied: vi.fn().mockResolvedValue([]) }],
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
      professionSlug: 'direito',
      chosenCourseId: null,
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

  it('answers an abusive message with the safe reply, calling no model and recording nothing', async () => {
    const res = await post({ ...body, message: 'seu viado' }).expect(200);

    expect(res.body).toEqual({
      sessionId: SESSION_ID,
      reply: SAFE_REPLY,
      sources: [],
      professionSlug: 'direito',
      chosenCourseId: null,
    });
    expect(model.calls).toHaveLength(0);
    expect(memory.addMessages).not.toHaveBeenCalled();
  });

  it('sends a distress message with a blocked word to the model', async () => {
    await post({
      ...body,
      message: 'Foda-se, não aguento mais, quero morrer',
    }).expect(200);

    expect(model.calls).toHaveLength(1);
    expect(memory.addMessages).toHaveBeenCalled();
  });

  it('404s for a blocked message on a session that is not the person own, with no model call', async () => {
    memory.sessionMessages.mockResolvedValue(null);

    await post({
      ...body,
      message: 'seu viado',
      sessionId: SESSION_ID,
    }).expect(404);

    expect(model.calls).toHaveLength(0);
    expect(memory.createSession).not.toHaveBeenCalled();
  });

  it('replaces an abusive model reply with the safe reply, in the answer and in the record', async () => {
    await app.close();
    model = fakeModel('vai se foder');
    memory = fakeMemoryRepository();
    app = await createHttpApp([CareerChatModule], model, [
      withMemory(memory),
      [CareersRepository, { firstTerm }],
      [ProgressRepository, { studied: vi.fn().mockResolvedValue([]) }],
    ]);

    const res = await post().expect(200);

    expect(res.body.reply).toBe(SAFE_REPLY);
    expect(memory.addMessages).toHaveBeenCalledWith(SESSION_ID, [
      { role: 'user', content: 'Oi!' },
      { role: 'assistant', content: SAFE_REPLY },
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

describe('POST /arandu/chat among the recommended careers', () => {
  let app: INestApplication;
  let model: FakeModel;
  let memory: ReturnType<typeof fakeMemoryRepository>;
  let firstTerm: ReturnType<typeof vi.fn>;
  const slugs = ['direito', 'arquitetura'];
  const body = { professionSlugs: slugs, message: 'E a de arquitetura?' };
  const fauSource = {
    label: 'FAU USP',
    url: 'https://example.org/fau',
    retrievedAt: '2026-11-01T00:00:00.000Z',
  };

  const start = async (object: {
    professionSlug: string | null;
    chosenCourseId?: number | null;
  }) => {
    model = fakeModel({
      object: {
        chosenCourseId: null,
        moreCareers: false,
        ...object,
        reply: 'Claro!',
      },
    });
    memory = fakeMemoryRepository();
    firstTerm = vi.fn(async (slug: string) =>
      slug === 'arquitetura'
        ? ({
            name: 'Arquitetura',
            courses: [course({ course: 'Arquitetura', source: fauSource })],
          } as ProfessionFirstTerm)
        : slug === 'direito'
          ? direito()
          : null,
    );
    app = await createHttpApp([CareerChatModule], model, [
      withMemory(memory),
      [CareersRepository, { firstTerm }],
      [ProgressRepository, { studied: vi.fn().mockResolvedValue([]) }],
    ]);
  };

  beforeEach(() => start({ professionSlug: 'arquitetura' }));
  afterEach(() => app.close());

  const post = (b: unknown = body) =>
    request(app.getHttpServer())
      .post('/arandu/chat')
      .send(b as object);

  it('answers about the career the model picks, with only its sources, in a choosing session without slug', async () => {
    const res = await post().expect(200);

    expect(res.body).toEqual({
      sessionId: SESSION_ID,
      reply: 'Claro!',
      sources: [fauSource],
      professionSlug: 'arquitetura',
      chosenCourseId: null,
    });
    expect(memory.createSession).toHaveBeenCalledWith(
      USER_ID,
      'choosing',
      null,
    );
    expect(memory.addMessages).toHaveBeenCalledWith(SESSION_ID, [
      { role: 'user', content: 'E a de arquitetura?' },
      { role: 'assistant', content: 'Claro!' },
    ]);
  });

  it('has no sources and no career when the model asks which one', async () => {
    await app.close();
    await start({ professionSlug: null });

    const res = await post().expect(200);

    expect(res.body.professionSlug).toBeNull();
    expect(res.body.sources).toEqual([]);
  });

  const choices = [
    {
      courseId: 7,
      course: 'Arquitetura',
      institution: 'Mackenzie',
      city: 'São Paulo',
    },
    {
      courseId: 9,
      course: 'Arquitetura',
      institution: 'USP',
      city: 'São Paulo',
    },
  ];
  const withChoices = { ...body, choices };

  it.each([
    ['an id that is in choices', 9, 9],
    ['an id that is not in choices', 99, null],
    ['no decision', null, null],
  ])('with choices, the model returning %s gives %s', async (_, got, want) => {
    await app.close();
    await start({ professionSlug: 'arquitetura', chosenCourseId: got });

    const res = await post(withChoices).expect(200);

    expect(res.body.chosenCourseId).toBe(want);
    expect(res.body.reply).toBe('Claro!');
  });

  it('takes a distance course, which has no city', async () => {
    await app.close();
    await start({ professionSlug: 'arquitetura', chosenCourseId: 11 });
    const distance = {
      courseId: 11,
      course: 'Arquitetura',
      institution: 'Unip',
      city: null,
    };

    const res = await post({ ...body, choices: [distance] }).expect(200);

    expect(res.body.chosenCourseId).toBe(11);
  });

  it('returns null when the model picks an id but no choices were sent', async () => {
    await app.close();
    await start({ professionSlug: 'arquitetura', chosenCourseId: 7 });

    const res = await post().expect(200);

    expect(res.body.chosenCourseId).toBeNull();
  });

  it('answers an abusive message with the safe reply, calling no model and recording nothing', async () => {
    const res = await post({ ...withChoices, message: 'V1@D0' }).expect(200);

    expect(res.body).toEqual({
      sessionId: SESSION_ID,
      reply: SAFE_REPLY,
      sources: [],
      professionSlug: null,
      chosenCourseId: null,
    });
    expect(model.calls).toHaveLength(0);
    expect(memory.addMessages).not.toHaveBeenCalled();
  });

  it('sends a distress message with a blocked word to the model', async () => {
    await post({
      ...withChoices,
      message: 'Na escola me chamam de viado… quero sumir',
    }).expect(200);

    expect(model.calls).toHaveLength(1);
  });

  it('404s for a blocked message on a session that is not the person own, with no model call', async () => {
    memory.sessionMessages.mockResolvedValue(null);

    await post({
      ...withChoices,
      message: 'seu viado',
      sessionId: SESSION_ID,
    }).expect(404);

    expect(model.calls).toHaveLength(0);
    expect(memory.createSession).not.toHaveBeenCalled();
  });

  it('opens no session for an abusive message that continues one', async () => {
    const res = await post({
      ...withChoices,
      message: 'seu viado',
      sessionId: SESSION_ID,
    }).expect(200);

    expect(res.body.sessionId).toBe(SESSION_ID);
    expect(memory.createSession).not.toHaveBeenCalled();
  });

  it('brings other careers than the ones on screen when the person asks for them, from what they said', async () => {
    await app.close();
    model = fakeModel(
      {
        object: {
          professionSlug: null,
          chosenCourseId: null,
          moreCareers: true,
          reply: 'Separei outras carreiras.',
        },
      },
      {
        object: {
          careers: [{ slug: 'quimica', reason: 'Porque você curte química.' }],
        },
      },
    );
    memory = fakeMemoryRepository();
    memory.read.mockResolvedValue({
      profile: { likedSubjects: ['química'] },
      summary: null,
      sessions: [],
    });
    const quimica = {
      profession: { slug: 'quimica', name: 'Química' },
      offerings: [],
    };
    const withFirstTerm = vi
      .fn()
      .mockResolvedValue([
        {
          profession: { slug: 'arquitetura', name: 'Arquitetura' },
          offerings: [],
        },
        quimica,
      ]);
    app = await createHttpApp([CareerChatModule], model, [
      withMemory(memory),
      [CareersRepository, { firstTerm, withFirstTerm }],
      [ProgressRepository, { studied: vi.fn().mockResolvedValue([]) }],
    ]);

    const res = await post({
      ...body,
      message: 'Não gostei, me mostra outras',
    }).expect(200);

    expect(res.body).toMatchObject({
      reply: 'Separei outras carreiras.',
      professionSlug: null,
      chosenCourseId: null,
      recommendations: {
        careers: [{ ...quimica, reason: 'Porque você curte química.' }],
      },
    });
    // The careers seen are not offered again, and the person's words reach the pick.
    expect(model.lastCall?.instructions).not.toMatch(/^arquitetura:/m);
    expect(model.lastCall?.instructions).toContain(
      'Não gostei, me mostra outras',
    );
  });

  it('replaces an abusive model reply and drops its chosen course, even when the id is on screen', async () => {
    await app.close();
    model = fakeModel({
      object: {
        professionSlug: 'arquitetura',
        chosenCourseId: 9,
        moreCareers: false,
        reply: 'arrombado',
      },
    });
    memory = fakeMemoryRepository();
    app = await createHttpApp([CareerChatModule], model, [
      withMemory(memory),
      [CareersRepository, { firstTerm }],
      [ProgressRepository, { studied: vi.fn().mockResolvedValue([]) }],
    ]);

    const res = await post(withChoices).expect(200);

    expect(res.body.reply).toBe(SAFE_REPLY);
    expect(res.body.chosenCourseId).toBeNull();
    expect(memory.addMessages).toHaveBeenCalledWith(SESSION_ID, [
      { role: 'user', content: 'E a de arquitetura?' },
      { role: 'assistant', content: SAFE_REPLY },
    ]);
  });

  it('gives the careers on screen to the model, without their places', async () => {
    await post(withChoices).expect(200);

    expect(model.lastCall?.instructions).toContain('7: Arquitetura');
    expect(model.lastCall?.instructions).not.toContain('Mackenzie');
  });

  it.each([
    [
      'more than 12 choices',
      Array.from({ length: 13 }, (_, i) => ({
        ...choices[0],
        courseId: i + 1,
      })),
    ],
    ['duplicate courseIds', [choices[0], choices[0]]],
  ])('400s validation_failed for %s', async (_, invalid) => {
    const res = await post({ ...body, choices: invalid }).expect(400);

    expect(res.body.error.code).toBe('validation_failed');
    expect(memory.createSession).not.toHaveBeenCalled();
    expect(model.calls).toHaveLength(0);
  });

  it('reads the history of a choosing session', async () => {
    memory.sessionMessages.mockResolvedValue([
      { role: 'user', content: 'antes' },
      { role: 'assistant', content: 'resposta' },
    ]);

    await post({ ...body, sessionId: SESSION_ID }).expect(200);

    expect(memory.createSession).not.toHaveBeenCalled();
    expect(memory.sessionMessages).toHaveBeenCalledWith(
      USER_ID,
      SESSION_ID,
      'choosing',
      11,
      null,
    );
  });

  it('404s for an unknown slug, opening no session and not calling the model', async () => {
    await post({ ...body, professionSlugs: ['direito', 'nao-existe'] }).expect(
      404,
    );

    expect(memory.createSession).not.toHaveBeenCalled();
    expect(model.calls).toHaveLength(0);
  });

  it.each([
    ['no slugs', { ...body, professionSlugs: [] }],
    ['five slugs', { ...body, professionSlugs: ['a', 'b', 'c', 'd', 'e'] }],
    ['duplicate slugs', { ...body, professionSlugs: ['direito', 'direito'] }],
    [
      'both professionSlug and professionSlugs',
      { ...body, professionSlug: 'direito' },
    ],
  ])('400s validation_failed for %s', async (_, invalid) => {
    const res = await post(invalid).expect(400);

    expect(res.body.error.code).toBe('validation_failed');
    expect(firstTerm).not.toHaveBeenCalled();
    expect(memory.createSession).not.toHaveBeenCalled();
    expect(model.calls).toHaveLength(0);
  });
});

describe('career chat prompts', () => {
  it('lists every career name and slug, in order, for the choosing talk', () => {
    const prompt = choosingInstructions([
      { slug: 'direito', profession: direito() },
      {
        slug: 'arquitetura',
        profession: { name: 'Arquitetura', courses: [] } as ProfessionFirstTerm,
      },
    ]);

    expect(prompt).toContain('1. Direito (slug: direito)');
    expect(prompt).toContain('2. Arquitetura (slug: arquitetura)');
    expect(prompt.indexOf('(slug: direito)')).toBeLessThan(
      prompt.indexOf('(slug: arquitetura)'),
    );
  });

  it('lists the careers on screen and the confirmation rule, or says the choice is always null', () => {
    const professions = [{ slug: 'direito', profession: direito() }];
    const withChoices = choosingInstructions(professions, undefined, [
      { courseId: 7, course: 'Direito', institution: 'USP', city: 'São Paulo' },
      { courseId: 9, course: 'Direito', institution: 'PUC', city: 'Santos' },
      { courseId: 11, course: 'Direito', institution: 'Unip', city: null },
    ]);

    // The person picks a career: a choice's place never reaches the model, so it cannot ask for one.
    expect(withChoices).toContain('7: Direito');
    expect(withChoices).toContain('11: Direito');
    expect(withChoices).not.toContain('Unip');
    expect(withChoices).toContain('never a place');
    expect(withChoices).toContain('short warm confirmation');
    expect(withChoices).toContain(
      'replaces the one about ending with exactly one question',
    );
    expect(withChoices).not.toContain('always null');
    expect(choosingInstructions(professions)).toContain(
      'chosenCourseId: always null',
    );
  });

  it('keeps the exact grounding lines in the single-career prompt', () => {
    const prompt = careerChatInstructions(direito());

    expect(prompt).toContain(
      'The real first-term subjects of this career at São Paulo institutions are listed below, with their sources. When',
    );
    expect(prompt).toContain('What you know, and its limits:');
  });

  it('both chats know the subjects the person tried, as information, and say nothing without any', () => {
    const studied = [
      {
        name: 'Cálculo',
        done: 3,
        made: 6,
        stuck: 'Limites',
        feeling: { chips: ['difícil'], text: 'gostei das contas' },
        suggestion: 'rever_capitulo' as const,
      },
      {
        name: 'Física',
        done: 1,
        made: 6,
        stuck: null,
        feeling: null,
        suggestion: null,
      },
    ];
    const line =
      '- Cálculo: 3 of 6 chapters; hardest: Limites; felt: difícil, gostei das contas; your suggestion when it ended: rever_capitulo\n- Física: 1 of 6 chapters';

    expect(careerChatInstructions(direito(), undefined, studied)).toContain(
      line,
    );
    expect(
      choosingInstructions(
        [{ slug: 'direito', profession: direito() }],
        undefined,
        [],
        studied,
      ),
    ).toContain(line);
    expect(careerChatInstructions(direito())).not.toContain(
      'already tried in the app',
    );
  });
});
