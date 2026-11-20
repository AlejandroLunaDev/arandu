import { Module } from '@nestjs/common';
import { PathsController } from './paths.controller.js';
import { PathsRepository } from './paths.repository.js';
import { StopsService } from './stops.service.js';

@Module({
  controllers: [PathsController],
  providers: [PathsRepository, StopsService],
  exports: [PathsRepository],
})
export class PathsModule {}
