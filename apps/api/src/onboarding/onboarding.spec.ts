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
import { PersonGoneError } from '../memory/memory.repository.js';
import { profileInput } from '../memory/profile.schema.js';
import { OnboardingModule } from './onboarding.module.js';

const ALL_TOPICS = [
  'situation',
  'likedSubjects',
  'hardSubjects',
  'interests',
  'workStyle',
  'admired',
  'careerIdea',
];
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
const turn = (over: Record<string, unknown> = {}) => ({
  profile: profile(),
  reply: 'Próxima pergunta?',
  quickReplies: ['a', 'b'],
  ...over,
});
const messyProfile = (over: Record<string, unknown> = {}) =>
  profile({
    situation: '   ',
    interests: Array.from({ length: 12 }, (_, i) => `i${i}`),
    likedSubjects: ['', 'a'.repeat(250)],
    ...over,
  });
const user = (content = 'Oi') => ({ role: 'user', content });

describe('POST /arandu/onboarding', () => {
  let app: INestApplication;
  let model: FakeModel;
  let memory: ReturnType<typeof fakeMemoryRepository>;

  const start = async (over: Record<string, unknown> = {}) => {
    model = fakeModel({ object: turn(over) });
    memory = fakeMemoryRepository();
    app = await createHttpApp([OnboardingModule], model, [withMemory(memory)]);
  };
  const post = (body: unknown) =>
    request(app.getHttpServer())
      .post('/arandu/onboarding')
      .send(body as object);
  const answer = (message = 'Oi') => post({ sessionId: SESSION_ID, message });

  afterEach(() => app.close());

  it('401s with the filter body when the account no longer exists', async () => {
    await start();
    memory.createSession.mockRejectedValue(new PersonGoneError());

    const res = await post({}).expect(401);

    expect(res.body).toEqual({
      error: {
        statusCode: 401,
        code: 'unauthorized',
        message: 'This account no longer exists',
      },
    });
    expect(model.calls).toHaveLength(0);
  });

  it('opens a session and records the first message of Arandu on {}', async () => {
    await start();

    const res = await post({}).expect(200);

    expect(res.body).toMatchObject({
      sessionId: SESSION_ID,
      reply: 'Próxima pergunta?',
      quickReplies: ['a', 'b'],
      done: false,
    });
    expect(model.lastCall?.lastUserMessage).toBe('Start the onboarding.');
    expect(memory.createSession).toHaveBeenCalledWith(
      USER_ID,
      'onboarding',
      null,
    );
    expect(memory.addMessages).toHaveBeenCalledWith(SESSION_ID, [
      { role: 'assistant', content: 'Próxima pergunta?' },
    ]);
  });

  it('loads the history and records both messages on an answer', async () => {
    await start();
    memory.sessionMessages.mockResolvedValue([
      { role: 'assistant', content: 'Oi, o que você faz?' },
    ]);

    await answer('Estudo').expect(200);

    expect(memory.sessionMessages).toHaveBeenCalledWith(
      USER_ID,
      SESSION_ID,
      'onboarding',
      30,
      null,
    );
    expect(model.lastCall?.lastUserMessage).toBe('Estudo');
    expect(memory.createSession).not.toHaveBeenCalled();
    expect(memory.addMessages).toHaveBeenCalledWith(SESSION_ID, [
      { role: 'user', content: 'Estudo' },
      { role: 'assistant', content: 'Próxima pergunta?' },
    ]);
  });

  it('404s without calling the model for a session that is not the person own', async () => {
    await start();
    memory.sessionMessages.mockResolvedValue(null);

    await answer().expect(404);

    expect(model.calls).toHaveLength(0);
    expect(memory.addMessages).not.toHaveBeenCalled();
  });

  it('is done, with no quick replies, once the profile covers every topic', async () => {
    await start({ profile: profile({ covered: ALL_TOPICS }) });

    const res = await answer().expect(200);

    expect(res.body.done).toBe(true);
    expect(res.body.quickReplies).toEqual([]);
    expect(res.body.progress).toEqual({ answered: 7, total: 7 });
  });

  it('is done at the 10th answer even with topics missing', async () => {
    await start();
    memory.sessionMessages.mockResolvedValue(
      Array.from({ length: 9 }, () => user()),
    );

    const res = await answer().expect(200);

    expect(res.body.done).toBe(true);
    expect(res.body.quickReplies).toEqual([]);
  });

  it('is not done at the 9th answer', async () => {
    await start();
    memory.sessionMessages.mockResolvedValue(
      Array.from({ length: 8 }, () => user()),
    );

    const res = await answer().expect(200);

    expect(res.body.done).toBe(false);
  });

  it('dedupes covered, reports progress and caps quick replies at 5', async () => {
    await start({
      profile: profile({ covered: ['situation', 'situation', 'interests'] }),
      quickReplies: ['1', '2', '3', '4', '5', '6', '7'],
    });

    const res = await answer().expect(200);

    expect(res.body.profile.covered).toEqual(['situation', 'interests']);
    expect(res.body.progress).toEqual({ answered: 2, total: 7 });
    expect(res.body.quickReplies).toEqual(['1', '2', '3', '4', '5']);
    expect(res.body.done).toBe(false);
  });

  it('returns a profile that passes profileInput when the model goes out of bounds', async () => {
    await start({
      profile: messyProfile({ covered: ['situation', 'situation'] }),
    });

    const res = await answer().expect(200);

    expect(profileInput.safeParse(res.body.profile).success).toBe(true);
    expect(res.body.profile.interests).toHaveLength(10);
  });

  it.each([
    ['an extra key', { sessionId: SESSION_ID, message: 'Oi', extra: 1 }],
    ['an extra key on {}', { extra: 1 }],
    [
      'a 2001-char message',
      { sessionId: SESSION_ID, message: 'a'.repeat(2001) },
    ],
    ['a bad session id', { sessionId: 'not-a-uuid', message: 'Oi' }],
    ['a session without message', { sessionId: SESSION_ID }],
    ['a blank message', { sessionId: SESSION_ID, message: '   ' }],
  ])('400s without calling the model or the memory for %s', async (_, body) => {
    await start();

    await post(body).expect(400);

    expect(model.calls).toHaveLength(0);
    expect(memory.createSession).not.toHaveBeenCalled();
    expect(memory.sessionMessages).not.toHaveBeenCalled();
  });
});

describe('POST /arandu/onboarding/profile', () => {
  let app: INestApplication;
  let model: FakeModel;

  const start = async (over: Record<string, unknown> = {}) => {
    model = fakeModel({ object: profile(over) });
    app = await createHttpApp([OnboardingModule], model, [
      withMemory(fakeMemoryRepository()),
    ]);
  };
  const post = (body: unknown) =>
    request(app.getHttpServer())
      .post('/arandu/onboarding/profile')
      .send(body as object);

  afterEach(() => app.close());

  it('sets covered to the answered topics, whatever the model says', async () => {
    await start({ covered: ALL_TOPICS });

    const res = await post({
      answers: [
        { topic: 'interests', picks: ['música'], text: null },
        { topic: 'situation', picks: [], text: 'Estou no 3º ano' },
      ],
    }).expect(200);

    expect(res.body.covered).toEqual(['interests', 'situation']);
  });

  it('returns a profile that passes profileInput when the model goes out of bounds', async () => {
    await start(messyProfile());

    const res = await post({
      answers: [{ topic: 'interests', picks: ['música'], text: null }],
    }).expect(200);

    expect(profileInput.safeParse(res.body).success).toBe(true);
    expect(res.body.interests).toHaveLength(10);
  });

  it.each([
    ['an unknown topic', [{ topic: 'x', picks: [], text: null }]],
    [
      'a repeated topic',
      [
        { topic: 'interests', picks: [], text: null },
        { topic: 'interests', picks: [], text: null },
      ],
    ],
    [
      '11 picks',
      [{ topic: 'interests', picks: Array(11).fill('a'), text: null }],
    ],
    [
      'a 201-char pick',
      [{ topic: 'interests', picks: ['a'.repeat(201)], text: null }],
    ],
    [
      'a 1001-char text',
      [{ topic: 'interests', picks: [], text: 'a'.repeat(1001) }],
    ],
    ['8 answers', Array(8).fill({ topic: 'interests', picks: [], text: null })],
  ])('400s without calling the model for %s', async (_, answers) => {
    await start();

    await post({ answers }).expect(400);

    expect(model.calls).toHaveLength(0);
  });

  it('400s on an extra key', async () => {
    await start();

    await post({ answers: [], extra: 1 }).expect(400);

    expect(model.calls).toHaveLength(0);
  });
});
