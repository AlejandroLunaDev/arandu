import { Module } from '@nestjs/common';
import { CareersModule } from '../careers/careers.module.js';
import { MemoryModule } from '../memory/memory.module.js';
import { ProgressModule } from '../progress/progress.module.js';
import { RecommendationsModule } from '../recommendations/recommendations.module.js';
import { CareerChatController } from './career-chat.controller.js';
import { CareerChatService } from './career-chat.service.js';

@Module({
  imports: [CareersModule, MemoryModule, ProgressModule, RecommendationsModule],
  controllers: [CareerChatController],
  providers: [CareerChatService],
  exports: [CareerChatService],
})
export class CareerChatModule {}
