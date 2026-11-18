import { fakeModel, type FakeModel } from '@nestjs/ai/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createHttpApp,
  fakeMemoryRepository,
  USER_ID,
  withMemory,
} from '../../test/http-app.js';
import { CareersRepository } from '../careers/careers.repository.js';
import { RecommendationsModule } from './recommendations.module.js';

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
const career = (
  slug: string,
  offerings = [{ institution: 'USP', city: 'São Paulo' }],
) => ({ profession: { slug, name: slug.toUpperCase() }, offerings });
const catalog = [
  career('a', [
    { institution: 'USP', city: 'São Paulo' },
    { institution: 'FIAP', city: 'São Paulo' },
  ]),
  ...['b', 'c', 'd', 'e'].map((s) => career(s)),
];

describe('POST /arandu/recommendations', () => {
  let app: INestApplication;
  let model: FakeModel;
  let memory: ReturnType<typeof fakeMemoryRepository>;

  const start = async (picks: string[]) => {
    model = fakeModel({
      object: {
        careers: picks.map((slug) => ({ slug, reason: `why ${slug}` })),
      },
    });
    memory = fakeMemoryRepository();
    app = await createHttpApp([RecommendationsModule], model, [
      withMemory(memory),
      [
        CareersRepository,
        { withFirstTerm: vi.fn().mockResolvedValue(catalog) },
      ],
    ]);
  };
  const post = (body: unknown) =>
    request(app.getHttpServer())
      .post('/arandu/recommendations')
      .send(body as object);

  afterEach(() => app.close());

  it('saves the profile, then returns at most 4 deduped careers with offerings', async () => {
    await start(['a', 'a', 'b', 'c', 'd', 'e']);
    const confirmed = profile({
      interests: ['música'],
      covered: ['interests'],
    });

    const res = await post({ profile: confirmed }).expect(200);

    expect(memory.saveProfile).toHaveBeenCalledWith(USER_ID, confirmed);
    expect(
      res.body.careers.map(
        (c: { profession: { slug: string } }) => c.profession.slug,
      ),
    ).toEqual(['a', 'b', 'c', 'd']);
    expect(res.body.careers[0]).toEqual({ ...catalog[0], reason: 'why a' });
    expect(model.lastCall?.lastUserMessage).toContain('música');
  });

  it('400s without saving or calling the model when admired is missing', async () => {
    await start(['a']);
    const { admired: _, ...rest } = profile();

    await post({ profile: rest }).expect(400);

    expect(model.calls).toHaveLength(0);
    expect(memory.saveProfile).not.toHaveBeenCalled();
  });

  it.each([
    ['an unknown covered topic', profile({ covered: ['astrology'] })],
    ['an item over 200 chars', profile({ interests: ['a'.repeat(201)] })],
  ])('400s without saving or calling the model for %s', async (_, p) => {
    await start(['a']);

    await post({ profile: p }).expect(400);

    expect(model.calls).toHaveLength(0);
    expect(memory.saveProfile).not.toHaveBeenCalled();
  });
});
