import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { BooksRepository } from '../src/books/books.repository.js';

// The real AppModule (real AuthGuard and ThrottlerGuard) with dummy variables and a fake repository: nothing here
// reaches a database.
process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:1/none';
process.env.SUPABASE_URL = 'https://dummy.supabase.co';
process.env.OPENROUTER_API_KEY = 'dummy';

const book = {
  profession: { slug: 'direito', name: 'Direito' },
  offerings: [],
  sample: [],
};

describe('Books (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BooksRepository)
      .useValue({
        list: vi.fn().mockResolvedValue([]),
        book: vi
          .fn()
          .mockImplementation(async (slug: string) =>
            slug === 'direito' ? book : null,
          ),
      })
      .compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.useBodyParser('json', { limit: '20kb' });
    await app.init();
  });

  afterEach(() => app.close());

  it('GET /books is public: no Authorization header needed', () =>
    request(app.getHttpServer()).get('/books').expect(200).expect([]));

  it('GET /books/:slug is public and cached', async () => {
    const res = await request(app.getHttpServer())
      .get('/books/direito')
      .expect(200);

    expect(res.body).toEqual(book);
    expect(res.headers['cache-control']).toBe('public, max-age=21600');
  });

  it('GET /books/:slug answers 404 and 400 without a token', async () => {
    await request(app.getHttpServer()).get('/books/outro').expect(404);
    await request(app.getHttpServer()).get('/books/Invalid_Slug').expect(400);
  });

  it('is not rate limited: 25 calls in a row from one IP never get 429', async () => {
    for (let i = 0; i < 25; i++)
      await request(app.getHttpServer()).get('/books').expect(200);
    for (let i = 0; i < 25; i++)
      await request(app.getHttpServer()).get('/books/direito').expect(200);
  });
});
