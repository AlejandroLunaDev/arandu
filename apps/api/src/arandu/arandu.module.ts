import { Module } from '@nestjs/common';
import { AranduController } from './arandu.controller.js';
import { AranduService } from './arandu.service.js';
import { OnboardingService } from './onboarding.service.js';

@Module({
  controllers: [AranduController],
  providers: [AranduService, OnboardingService],
})
export class AranduModule {}
