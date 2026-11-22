import type { Book, BookSummary, OwnBook } from '@arandu/contracts';
import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { z } from 'zod';
import { OpenToBrowsers } from '../auth/public.decorator.js';
import { BooksRepository } from './books.repository.js';

const OWN_BOOKS: readonly OwnBook['book'][] = ['produto', 'solucao'];

const slug = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

// The data changes when the engine loads a batch, not per visit: a few hours of browser and proxy cache spare the
// free instance a cold start on every turn of the shelf.
const CACHE = 'public, max-age=21600';

/** The landing's shelf: public, no sign-in. */
@OpenToBrowsers()
// Not rate limited: the limits guard the paid model key and a book never calls the model. A school's visitors share
// one IP, and 20 a minute would lock the shelf for the whole class.
@SkipThrottle({ burst: true, daily: true })
@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksRepository) {}

  @Get()
  @Header('Cache-Control', CACHE)
  list(): Promise<BookSummary[]> {
    return this.books.list();
  }

  /** Two segments, so it never meets :slug. Before it anyway: Nest matches routes in order. */
  @Get('own/:book')
  @Header('Cache-Control', CACHE)
  ownBook(@Param('book') book: string): Promise<OwnBook> {
    if (!OWN_BOOKS.includes(book as OwnBook['book']))
      throw new NotFoundException(`No own book "${book}"`);
    return this.books.ownBook(book as OwnBook['book']);
  }

  @Get(':slug')
  @Header('Cache-Control', CACHE)
  async book(
    @Param('slug', { schema: slug }) professionSlug: string,
  ): Promise<Book> {
    const book = await this.books.book(professionSlug);
    if (!book) throw new NotFoundException(`No book for "${professionSlug}"`);
    return book;
  }
}
