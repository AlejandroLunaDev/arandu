import {
  type INestApplication,
  Controller,
  Get,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { AllExceptionsFilter } from '../../core/http/all-exceptions.filter.js';
import { RateLimitModule } from '../../core/rate-limit/rate-limit.module.js';
import { BooksModule } from './books.module.js';
import { BooksRepository } from './books.repository.js';

// A route outside the shelf, throttled like every other route: proves the global limit is really in force.
@Controller('ping')
class PingController {
  @Get()
  ping() {
    return 'pong';
  }
}

const book = {
  profession: { slug: 'direito', name: 'Direito' },
  offerings: [],
  sample: [],
};

describe('Books HTTP', () => {
  let app: INestApplication;
  const repository = {
    list: vi.fn(),
    book: vi.fn(),
    ownBook: vi.fn(),
  };

  beforeEach(async () => {
    repository.list.mockReset().mockResolvedValue([]);
    repository.book.mockReset().mockResolvedValue(book);
    repository.ownBook.mockReset().mockImplementation(async (b: string) => ({
      book: b,
      pages: [
        { title: 't', facts: [] },
        { title: 'u', facts: [] },
        { title: 'v', facts: [] },
      ],
    }));
    const moduleRef = await Test.createTestingModule({
      // The same limits, guard order and pipe as AppModule, with no sign-in at all.
      imports: [RateLimitModule, BooksModule],
      controllers: [PingController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    })
      .overrideProvider(BooksRepository)
      .useValue(repository)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  const get = (path: string) => request(app.getHttpServer()).get(path);

  describe('GET /books', () => {
    it('returns the summaries from the repository', async () => {
      const summaries = [
        { profession: { slug: 'direito', name: 'Direito' }, offeringCount: 3 },
      ];
      repository.list.mockResolvedValue(summaries);

      const res = await get('/books').expect(200);

      expect(res.body).toEqual(summaries);
    });

    it('is cached for six hours', async () => {
      const res = await get('/books').expect(200);

      expect(res.headers['cache-control']).toBe('public, max-age=21600');
    });
  });

  describe('GET /books/:slug', () => {
    it('returns the book of the profession', async () => {
      const res = await get('/books/direito').expect(200);

      expect(res.body).toEqual(book);
      expect(repository.book).toHaveBeenCalledWith('direito');
    });

    it('is cached for six hours', async () => {
      const res = await get('/books/direito').expect(200);

      expect(res.headers['cache-control']).toBe('public, max-age=21600');
    });

    it('answers 404 with the error body shape when the profession is not on the shelf', async () => {
      repository.book.mockResolvedValue(null);

      const res = await get('/books/sem-livro').expect(404);

      expect(res.body).toEqual({
        error: {
          statusCode: 404,
          code: 'book_not_found',
          message: 'No such book',
        },
      });
    });

    it.each([
      ['uppercase', 'Direito'],
      ['underscore', 'ciencia_da_computacao'],
      ['double dash', 'a--b'],
      ['leading dash', '-a'],
      ['trailing dash', 'a-'],
      ['space', 'a%20b'],
      ['over 100 characters', 'a'.repeat(101)],
    ])(
      'answers 404 for an invalid slug (%s) without querying',
      async (_n, slug) => {
        await get(`/books/${slug}`).expect(404);

        expect(repository.book).not.toHaveBeenCalled();
      },
    );

    it('accepts a slug of exactly 100 characters', async () => {
      await get(`/books/${'a'.repeat(100)}`).expect(200);
    });
  });

  describe('GET /books/own/:book', () => {
    it.each(['produto', 'solucao'])(
      'delegates %s to the repository',
      async (b) => {
        const res = await get(`/books/own/${b}`).expect(200);

        expect(res.body).toEqual({
          book: b,
          pages: [
            { title: 't', facts: [] },
            { title: 'u', facts: [] },
            { title: 'v', facts: [] },
          ],
        });
        expect(repository.ownBook).toHaveBeenCalledWith(b);
      },
    );

    it('does not reach the :slug handler', async () => {
      await get('/books/own/produto').expect(200);

      expect(repository.book).not.toHaveBeenCalled();
    });

    it('is cached for six hours', async () => {
      const res = await get('/books/own/solucao').expect(200);

      expect(res.headers['cache-control']).toBe('public, max-age=21600');
    });

    it.each(['outro', 'direito', 'Produto', 'produto-2'])(
      'answers 404 for the unknown book %s without querying',
      async (b) => {
        const res = await get(`/books/own/${b}`).expect(404);

        expect(res.body.error.message).toBe('No such book');
        expect(repository.ownBook).not.toHaveBeenCalled();
      },
    );
  });

  describe('rate limit', () => {
    it('does not limit the shelf (25 calls in a row) while another route still gets 429', async () => {
      for (let i = 0; i < 25; i++) {
        await get('/books').expect(200);
        await get('/books/direito').expect(200);
        await get('/books/own/produto').expect(200);
      }

      for (let i = 0; i < 20; i++) await get('/ping').expect(200);
      await get('/ping').expect(429);
    });
  });
});
