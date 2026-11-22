import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

// The real AppModule, with dummy variables: the database client connects lazily and the model is only called with a
// valid token, so nothing here reaches a database, Supabase or OpenRouter.
process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:1/none';
process.env.SUPABASE_URL = 'https://dummy.supabase.co';
process.env.OPENROUTER_API_KEY = 'dummy';
process.env.SUPABASE_PUBLISHABLE_KEY = 'dummy';
process.env.JWT_SECRET = 'j'.repeat(32);
process.env.INTERNAL_API_SECRET = 'i'.repeat(32);

describe('AppModule (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    // The same call as main.ts.
    app.useBodyParser('json', { limit: '20kb' });
    await app.init();
  });

  afterEach(() => app.close());

  it('GET / is public', () =>
    request(app.getHttpServer()).get('/').expect(200).expect('Hello World!'));

  it('POST /arandu/chat without a token is 401 with the error body shape', async () => {
    const res = await request(app.getHttpServer())
      .post('/arandu/chat')
      .send({ professionSlug: 'direito', message: 'Oi' })
      .expect(401);

    expect(res.body).toEqual({
      error: {
        statusCode: 401,
        code: 'unauthorized',
        message: 'Sign in again',
      },
    });
  });

  it('GET /arandu/memory/conversations without a token is 401', () =>
    request(app.getHttpServer())
      .get('/arandu/memory/conversations')
      .expect(401));

  it('refuses a JSON body over 20 kb with 413', () =>
    request(app.getHttpServer())
      .post('/arandu/chat')
      .send({ professionSlug: 'direito', message: 'x'.repeat(21 * 1024) })
      .expect(413));
});
