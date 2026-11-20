import { Module } from '@nestjs/common';
import { CareersModule } from '../careers/careers.module.js';
import { MemoryModule } from '../memory/memory.module.js';
import { RecommendationsController } from './recommendations.controller.js';
import { RecommendationsService } from './recommendations.service.js';

@Module({
  imports: [CareersModule, MemoryModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
