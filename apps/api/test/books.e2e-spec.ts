import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { BooksRepository } from '../src/modules/books/books.repository.js';

// The real AppModule (real AuthGuard and ThrottlerGuard) with dummy variables and a fake repository: nothing here
// reaches a database.
process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:1/none';
process.env.SUPABASE_URL = 'https://dummy.supabase.co';
process.env.OPENROUTER_API_KEY = 'dummy';
process.env.SUPABASE_PUBLISHABLE_KEY = 'dummy';
process.env.JWT_SECRET = 'j'.repeat(32);
process.env.INTERNAL_API_SECRET = 'i'.repeat(32);

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
        ownBook: vi.fn().mockImplementation(async (b: string) => ({
          book: b,
          pages: [
            { title: 't', facts: [] },
            { title: 'u', facts: [] },
            { title: 'v', facts: [] },
          ],
        })),
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

  it('GET /books/:slug answers 404 and 404 without a token', async () => {
    await request(app.getHttpServer()).get('/books/outro').expect(404);
    await request(app.getHttpServer()).get('/books/Invalid_Slug').expect(404);
  });

  it('GET /books/own/:book is public and cached, 404 for an unknown book', async () => {
    const res = await request(app.getHttpServer())
      .get('/books/own/produto')
      .expect(200);

    expect(res.body).toEqual({
      book: 'produto',
      pages: [
        { title: 't', facts: [] },
        { title: 'u', facts: [] },
        { title: 'v', facts: [] },
      ],
    });
    expect(res.headers['cache-control']).toBe('public, max-age=21600');
    await request(app.getHttpServer()).get('/books/own/xyz').expect(404);
  });

  it('is not rate limited: 25 calls in a row from one IP never get 429', async () => {
    for (let i = 0; i < 25; i++)
      await request(app.getHttpServer()).get('/books').expect(200);
    for (let i = 0; i < 25; i++)
      await request(app.getHttpServer()).get('/books/direito').expect(200);
  });
});
