import type { AranduChatReply, AranduChatRequest } from '@arandu/contracts';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { UserId } from '../auth/user-id.decorator.js';
import { message } from '../memory/message.schema.js';
import { CareerChatService } from './career-chat.service.js';
import { slug } from '../../core/http/params.js';

const chatRequest = z.union([
  z
    .object({ professionSlug: slug, sessionId: z.uuid().optional(), message })
    .strict(),
  // O10: the recommended careers, before the person chooses one.
  z
    .object({
      professionSlugs: z
        .array(slug)
        .min(1)
        .max(4)
        .refine((s) => new Set(s).size === s.length, 'must be unique'),
      sessionId: z.uuid().optional(),
      message,
    })
    .strict(),
]);

@Controller('arandu/chat')
export class CareerChatController {
  constructor(private readonly careerChat: CareerChatService) {}

  @Post()
  @HttpCode(200)
  answer(
    @UserId() userId: string,
    @Body({ schema: chatRequest }) body: AranduChatRequest,
  ): Promise<AranduChatReply> {
    return this.careerChat.answer(userId, body);
  }
}
