import type { AranduProfile, Recommendations } from '@arandu/contracts';
import { AiService } from '@nestjs/ai';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CareersRepository } from '../careers/careers.repository.js';
import { MemoryService } from '../memory/memory.service.js';
import {
  type MoreCareers,
  recommendationsInstructions,
} from './recommendations.prompt.js';

/** Careers for a profile (§4.1 step 4, S4), only among those with a real first-term curriculum. */
@Injectable()
export class RecommendationsService {
  constructor(
    private readonly ai: AiService,
    private readonly careers: CareersRepository,
    private readonly memory: MemoryService,
  ) {}

  /** Keeps the profile the person confirmed in their memory, then recommends careers for it. */
  async forPerson(
    userId: string,
    profile: AranduProfile,
  ): Promise<Recommendations> {
    await this.memory.saveProfile(userId, profile);
    return this.recommend(profile);
  }

  /** With `more`, other careers than the ones the person saw, weighing what they said about them. */
  async recommend(
    profile: AranduProfile,
    more?: MoreCareers,
  ): Promise<Recommendations> {
    const careers = (await this.careers.withFirstTerm()).filter(
      (c) => !more?.seen.includes(c.profession.slug),
    );
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
      instructions: recommendationsInstructions(careers, more),
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
