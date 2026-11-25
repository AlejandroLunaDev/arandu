import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module.js';
import { CardTalkService } from './card-talk.service.js';
import { PathsController } from './paths.controller.js';
import { PathsRepository } from './paths.repository.js';
import { ChaptersService } from './chapters.service.js';

@Module({
  imports: [ProgressModule],
  controllers: [PathsController],
  providers: [PathsRepository, ChaptersService, CardTalkService],
  exports: [PathsRepository],
})
export class PathsModule {}
