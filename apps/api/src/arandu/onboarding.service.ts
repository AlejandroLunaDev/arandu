import type {
  ChatMessage,
  OnboardingReply,
  OnboardingTopic,
  Recommendations,
  RecommendationsRequest,
} from '@arandu/contracts';
import { AiService } from '@nestjs/ai';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { SQL, type Sql } from '../database.module.js';
import {
  onboardingInstructions,
  recommendationsInstructions,
} from './arandu.prompt.js';
import { findCareers } from './careers.js';

export const TOPICS = [
  'situation',
  'likedSubjects',
  'hardSubjects',
  'interests',
  'workStyle',
  'admired',
  'careerIdea',
] as const satisfies readonly OnboardingTopic[];

const profileSchema = z.object({
  situation: z.string().nullable(),
  likedSubjects: z.array(z.string()),
  hardSubjects: z.array(z.string()),
  interests: z.array(z.string()),
  workStyle: z.array(z.string()),
  admired: z.array(z.string()),
  careerIdea: z.string().nullable(),
  covered: z.array(z.enum(TOPICS)),
});

// The profile comes first, so the model takes stock of what it knows before it writes the next question.
const onboardingTurn = z.object({
  profile: profileSchema,
  reply: z.string(),
  quickReplies: z.array(z.string()),
});

/** A cap on the onboarding: after this many answers it ends even with a topic left, so it never loops. */
const MAX_ANSWERS = 10;

@Injectable()
export class OnboardingService {
  constructor(
    private readonly ai: AiService,
    @Inject(SQL) private readonly sql: Sql,
  ) {}

  async turn(messages: ChatMessage[]): Promise<OnboardingReply> {
    const { object } = await this.ai.generateObject({
      label: 'arandu-onboarding',
      schema: onboardingTurn,
      instructions: onboardingInstructions(),
      ...(messages.length ? { messages } : { prompt: 'Start the onboarding.' }),
      maxOutputTokens: 700,
    });
    const covered = [...new Set(object.profile.covered)];
    const answers = messages.filter((m) => m.role === 'user').length;
    const done = covered.length === TOPICS.length || answers >= MAX_ANSWERS;
    return {
      reply: object.reply,
      quickReplies: done ? [] : object.quickReplies.slice(0, 5),
      profile: { ...object.profile, covered },
      progress: { answered: covered.length, total: TOPICS.length },
      done,
    };
  }

  async recommend({
    profile,
  }: RecommendationsRequest): Promise<Recommendations> {
    const careers = await findCareers(this.sql);
    const slugs = careers.map((c) => c.profession.slug) as [
      string,
      ...string[],
    ];
    // The slug is an enum of the careers with a real curriculum: the model cannot name one that does not exist.
    const { object } = await this.ai.generateObject({
      label: 'arandu-recommendations',
      schema: z.object({
        careers: z.array(z.object({ slug: z.enum(slugs), reason: z.string() })),
      }),
      instructions: recommendationsInstructions(careers),
      prompt: `The person's profile:\n${JSON.stringify(profile, null, 2)}`,
      maxOutputTokens: 600,
    });

    const bySlug = new Map(careers.map((c) => [c.profession.slug, c]));
    const picked = [
      ...new Map(object.careers.map((c) => [c.slug, c])).values(),
    ];
    return {
      careers: picked
        .slice(0, 4)
        .map(({ slug, reason }) => ({ ...bySlug.get(slug)!, reason })),
    };
  }
}
