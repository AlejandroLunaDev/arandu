import type {
  BookProgress,
  BookReflection,
  BookReflectionRequest,
  DailyGift,
  Home,
} from '@arandu/contracts';
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { UserId } from '../auth/user-id.decorator.js';
import { ProgressRepository } from './progress.repository.js';
import { ProgressService } from './progress.service.js';
import { subjectNotFound } from './progress.errors.js';
import { id, param } from '../../core/http/params.js';

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

  /** The day's gift (#145): what is missing to reach the daily peixinhos, given once per São Paulo day. */
  @Post('me/daily-gift')
  @HttpCode(200)
  dailyGift(@UserId() userId: string): Promise<DailyGift> {
    return this.repository.dailyGift(userId);
  }

  @Get('me/books/:disciplineId')
  book(
    @UserId() userId: string,
    @Param('disciplineId', param(id, subjectNotFound)) disciplineId: number,
  ): Promise<BookProgress> {
    return this.progress.book(userId, disciplineId);
  }

  /** S4: the book's reading. */
  @Get('me/books/:disciplineId/reflection')
  reflection(
    @UserId() userId: string,
    @Param('disciplineId', param(id, subjectNotFound)) disciplineId: number,
  ): Promise<BookReflection> {
    return this.progress.reflection(userId, disciplineId);
  }

  /** S4: how the book felt to the person. */
  @Post('me/books/:disciplineId/reflection')
  @HttpCode(204)
  async reflect(
    @UserId() userId: string,
    @Param('disciplineId', param(id, subjectNotFound)) disciplineId: number,
    @Body({ schema: reflection }) body: BookReflectionRequest,
  ): Promise<void> {
    await this.progress.book(userId, disciplineId); // 404 for an unknown subject
    await this.repository.saveReflection(userId, disciplineId, body);
  }
}
