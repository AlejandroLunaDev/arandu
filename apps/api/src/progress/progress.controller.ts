import type {
  BookProgress,
  BookReflection,
  BookReflectionRequest,
  Home,
  Wallet,
} from '@arandu/contracts';
import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { UserId } from '../auth/user-id.decorator.js';
import { ProgressRepository } from './progress.repository.js';
import { ProgressService } from './progress.service.js';

const id = z.coerce.number().int().positive().max(2_147_483_647);
const topic = z.coerce.number().int().min(0).max(200);
const reflection = z
  .object({
    chips: z.array(z.string().trim().min(1).max(40)).max(5),
    text: z.string().trim().min(1).max(500).nullable(),
  })
  .strict()
  .refine((r) => r.chips.length > 0 || r.text !== null, {
    message: 'A chip or their own words',
  });

@Controller()
export class ProgressController {
  constructor(
    private readonly progress: ProgressService,
    private readonly repository: ProgressRepository,
  ) {}

  /** S1 and K1: wallet, sabedoria, the week's patinhas, the current book and the achievements. */
  @Get('me')
  home(@UserId() userId: string): Promise<Home> {
    return this.progress.home(userId);
  }

  @Get('me/books/:disciplineId')
  book(
    @UserId() userId: string,
    @Param('disciplineId', { schema: id }) disciplineId: number,
  ): Promise<BookProgress> {
    return this.progress.book(userId, disciplineId);
  }

  /** S4: the book's reading. */
  @Get('me/books/:disciplineId/reflection')
  reflection(
    @UserId() userId: string,
    @Param('disciplineId', { schema: id }) disciplineId: number,
  ): Promise<BookReflection> {
    return this.progress.reflection(userId, disciplineId);
  }

  /** S4: how the book felt to the person. */
  @Post('me/books/:disciplineId/reflection')
  @HttpCode(204)
  async reflect(
    @UserId() userId: string,
    @Param('disciplineId', { schema: id }) disciplineId: number,
    @Body({ schema: reflection }) body: BookReflectionRequest,
  ): Promise<void> {
    await this.progress.book(userId, disciplineId); // 404 for an unknown subject
    await this.repository.saveReflection(userId, disciplineId, body);
  }

  /** A mistake in an exercise (P5). */
  @Post('me/novelos/spend')
  @HttpCode(200)
  spend(@UserId() userId: string): Promise<Wallet> {
    return this.repository.spend(userId);
  }

  /** P6: at 0 novelos, re-reading the stop's cards gives one back, once per stop. */
  @Post('stops/:disciplineId/:topic/reread')
  @HttpCode(200)
  async reread(
    @UserId() userId: string,
    @Param('disciplineId', { schema: id }) disciplineId: number,
    @Param('topic', { schema: topic }) topicIndex: number,
  ): Promise<Wallet> {
    const stop = (await this.progress.book(userId, disciplineId)).stops[
      topicIndex
    ];
    if (!stop)
      throw new NotFoundException(
        `No stop ${topicIndex} in subject ${disciplineId}`,
      );
    // Only the stop the person is on, or one they finished: never a novelo per stop of the catalog.
    if (stop.state === 'locked')
      throw new ConflictException('This stop is not open yet');
    return this.repository.reread(userId, disciplineId, topicIndex);
  }
}
