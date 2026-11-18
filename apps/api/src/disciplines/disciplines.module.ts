import { Module } from '@nestjs/common';
import { DisciplinesRepository } from './disciplines.repository.js';
import { DisciplinesService } from './disciplines.service.js';

@Module({
  providers: [DisciplinesRepository, DisciplinesService],
  exports: [DisciplinesService],
})
export class DisciplinesModule {}
