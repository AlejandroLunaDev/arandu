import type { Journey, JourneyUpdate } from '@arandu/contracts';
import { Body, Controller, Get, Patch } from '@nestjs/common';
import { z } from 'zod';
import { UserId } from '../auth/user-id.decorator.js';
import { answersInput } from '../memory/profile.schema.js';
import { JourneyRepository } from './journey.repository.js';

const id = z.number().int().positive();

// Trust boundary: every field bounded; the database checks the career, course and subject exist.
const journeyUpdate = z
  .object({
    answers: answersInput.nullable(),
    professionSlug: z
      .string()
      .max(100)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .nullable(),
    courseId: id.nullable(),
    disciplineId: id.nullable(),
    weeklyGoal: z.union([z.literal(3), z.literal(5), z.literal(7)]).nullable(),
    age: z.number().int().min(10).max(120).nullable(),
  })
  .partial()
  .strict();

/** The person's choices so far: saved step by step, the same before and after login. */
@Controller('me/journey')
export class JourneyController {
  constructor(private readonly journey: JourneyRepository) {}

  @Get()
  read(@UserId() userId: string): Promise<Journey> {
    return this.journey.read(userId);
  }

  @Patch()
  update(
    @UserId() userId: string,
    @Body({ schema: journeyUpdate }) body: JourneyUpdate,
  ): Promise<Journey> {
    return this.journey.update(userId, body);
  }
}
