import type { AranduMemory, Conversations } from '@arandu/contracts';
import { Controller, Delete, Get, HttpCode, Param } from '@nestjs/common';
import { z } from 'zod';
import { UserId } from '../auth/user-id.decorator.js';
import { MemoryService } from './memory.service.js';

@Controller('arandu/memory')
export class MemoryController {
  constructor(private readonly memory: MemoryService) {}

  /** Everything Arandu remembers about the person, so they can see it (§5 transparency). */
  @Get()
  read(@UserId() userId: string): Promise<AranduMemory> {
    return this.memory.read(userId);
  }

  /** S2: the conversations with Arandu as text, newest first. */
  @Get('conversations')
  conversations(@UserId() userId: string): Promise<Conversations> {
    return this.memory.conversations(userId);
  }

  /** The person deletes one thing Arandu remembers (K5). */
  @Delete('facts/:id')
  @HttpCode(204)
  deleteFact(
    @UserId() userId: string,
    @Param('id', {
      schema: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    })
    id: number,
  ): Promise<void> {
    return this.memory.deleteFact(userId, id);
  }

  /** Arandu forgets the person and everything starts again from the onboarding. */
  @Delete()
  @HttpCode(204)
  forget(@UserId() userId: string): Promise<void> {
    return this.memory.forget(userId);
  }
}
