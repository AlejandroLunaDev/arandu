import type { BookProgress, Home, Wallet } from '@arandu/contracts';
import {
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
    const discipline = await this.repository.discipline(disciplineId);
    if (!discipline || topicIndex >= discipline.topics.length)
      throw new NotFoundException(
        `No stop ${topicIndex} in subject ${disciplineId}`,
      );
    return this.repository.reread(userId, disciplineId, topicIndex);
  }
}
