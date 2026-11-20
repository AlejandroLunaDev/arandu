import type { AranduChatReply, AranduChatRequest } from '@arandu/contracts';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { UserId } from '../auth/user-id.decorator.js';
import { message } from '../memory/message.schema.js';
import { CareerChatService } from './career-chat.service.js';

const chatRequest = z
  .object({
    professionSlug: z
      .string()
      .max(100)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    sessionId: z.uuid().optional(),
    message,
  })
  .strict();

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
