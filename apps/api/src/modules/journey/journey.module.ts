import { Module } from '@nestjs/common';
import { JourneyController } from './journey.controller.js';
import { JourneyRepository } from './journey.repository.js';

@Module({
  controllers: [JourneyController],
  providers: [JourneyRepository],
  exports: [JourneyRepository],
})
export class JourneyModule {}
