import type { OnboardingReply, OnboardingRequest } from '@arandu/contracts';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { UserId } from '../auth/user-id.decorator.js';
import { message } from '../memory/message.schema.js';
import { OnboardingService } from './onboarding.service.js';

// {} starts a session; then each request carries the session and the person's answer.
const onboardingRequest = z.union([
  z.object({ sessionId: z.uuid(), message }).strict(),
  z.object({}).strict(),
]);

@Controller('arandu/onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post()
  @HttpCode(200)
  answer(
    @UserId() userId: string,
    @Body({ schema: onboardingRequest }) body: OnboardingRequest,
  ): Promise<OnboardingReply> {
    return this.onboarding.answer(userId, body);
  }
}
