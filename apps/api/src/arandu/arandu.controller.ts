import type {
  AranduChatReply,
  AranduChatRequest,
  OnboardingReply,
  OnboardingRequest,
  Recommendations,
  RecommendationsRequest,
} from '@arandu/contracts';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { AranduService } from './arandu.service.js';
import { OnboardingService, TOPICS } from './onboarding.service.js';

// Trust boundary: bounds keep one request's prompt, and its cost, small.
const messages = z
  .array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().trim().min(1).max(2000),
    }),
  )
  .max(30)
  .refine((list) => !list.length || list.at(-1)?.role === 'user', {
    message: 'The last message must be the person’s',
  });

const chatRequest = z.object({
  professionSlug: z
    .string()
    .max(100)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  messages: messages.refine((list) => list.length > 0, {
    message: 'At least one message',
  }),
});

const onboardingRequest = z.object({ messages });

// The profile comes back from the client, edited by the person (S3): every field is bounded.
const item = z.string().trim().min(1).max(200);
const items = z.array(item).max(10);
const recommendationsRequest = z.object({
  profile: z.object({
    situation: item.nullable(),
    likedSubjects: items,
    hardSubjects: items,
    interests: items,
    workStyle: items,
    careerIdea: item.nullable(),
    covered: z.array(z.enum(TOPICS)).max(TOPICS.length),
  }),
});

@Controller('arandu')
export class AranduController {
  constructor(
    private readonly arandu: AranduService,
    private readonly onboarding: OnboardingService,
  ) {}

  @Post('chat')
  @HttpCode(200)
  chat(
    @Body({ schema: chatRequest }) body: AranduChatRequest,
  ): Promise<AranduChatReply> {
    return this.arandu.chat(body);
  }

  @Post('onboarding')
  @HttpCode(200)
  onboardingTurn(
    @Body({ schema: onboardingRequest }) body: OnboardingRequest,
  ): Promise<OnboardingReply> {
    return this.onboarding.turn(body.messages);
  }

  @Post('recommendations')
  @HttpCode(200)
  recommendations(
    @Body({ schema: recommendationsRequest }) body: RecommendationsRequest,
  ): Promise<Recommendations> {
    return this.onboarding.recommend(body);
  }
}
