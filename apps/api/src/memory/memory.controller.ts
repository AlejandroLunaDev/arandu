import type { AranduMemory } from '@arandu/contracts';
import { Controller, Delete, Get, HttpCode } from '@nestjs/common';
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

  /** Arandu forgets the person and everything starts again from the onboarding. */
  @Delete()
  @HttpCode(204)
  forget(@UserId() userId: string): Promise<void> {
    return this.memory.forget(userId);
  }
}
