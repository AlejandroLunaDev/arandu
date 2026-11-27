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
      choices: z
        .array(
          z
            .object({
              courseId: z.number().int().positive(),
              course: z.string().trim().min(1).max(200),
              institution: z.string().trim().min(1).max(200),
              city: z.string().trim().min(1).max(100).nullable(),
            })
            .strict(),
        )
        .max(12)
        .refine(
          (c) => new Set(c.map((x) => x.courseId)).size === c.length,
          'courseIds must be unique',
        )
        .optional(),
      seenSlugs: z.array(slug).max(40).optional(),
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
