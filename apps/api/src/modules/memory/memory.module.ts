import { Module } from '@nestjs/common';
import { MemoryController } from './memory.controller.js';
import { MemoryRepository } from './memory.repository.js';
import { MemoryService } from './memory.service.js';

@Module({
  controllers: [MemoryController],
  providers: [MemoryRepository, MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
