import type { AranduProfile, OnboardingTopic } from '@arandu/contracts';
import { z } from 'zod';

/** The onboarding's topics, in the order Arandu asks them (docs/05-functional-map.md S1). */
export const TOPICS = [
  'situation',
  'likedSubjects',
  'hardSubjects',
  'interests',
  'workStyle',
  'admired',
  'careerIdea',
] as const satisfies readonly OnboardingTopic[];

/** The profile as the model writes it. */
export const profileSchema = z.object({
  situation: z.string().nullable(),
  likedSubjects: z.array(z.string()),
  hardSubjects: z.array(z.string()),
  interests: z.array(z.string()),
  workStyle: z.array(z.string()),
  admired: z.array(z.string()),
  careerIdea: z.string().nullable(),
  covered: z.array(z.enum(TOPICS)),
});

const ITEM_MAX = 200;
const ITEMS_MAX = 10;

// Trust boundary: the profile comes back from the client, edited by the person (S3), so every field is bounded.
const item = z.string().trim().min(1).max(ITEM_MAX);
const items = z.array(item).max(ITEMS_MAX);

/** The profile as a request carries it. */
export const profileInput = z.object({
  situation: item.nullable(),
  likedSubjects: items,
  hardSubjects: items,
  interests: items,
  workStyle: items,
  admired: items,
  careerIdea: item.nullable(),
  covered: z.array(z.enum(TOPICS)).max(TOPICS.length),
});

/** The model's profile cut to profileInput's bounds, so the client can send back what the API gave it. */
export function boundProfile(p: z.infer<typeof profileSchema>): AranduProfile {
  // A cut emoji leaves a lone high surrogate, which Postgres rejects in jsonb.
  const cut = (s: string) =>
    s
      .trim()
      .slice(0, ITEM_MAX)
      .replace(/[\uD800-\uDBFF]$/, '');
  const one = (s: string | null) => (s === null ? null : cut(s) || null);
  const many = (list: string[]) =>
    list
      .map(cut)
      .filter(Boolean)
      .slice(0, ITEMS_MAX);
  return {
    situation: one(p.situation),
    likedSubjects: many(p.likedSubjects),
    hardSubjects: many(p.hardSubjects),
    interests: many(p.interests),
    workStyle: many(p.workStyle),
    admired: many(p.admired),
    careerIdea: one(p.careerIdea),
    covered: [...new Set(p.covered)],
  };
}

/** The onboarding's answers as a request carries them (O02-O08): one per topic at most. */
export const answersInput = z
  .array(
    z.object({
      topic: z.enum(TOPICS),
      picks: items,
      text: z.string().trim().min(1).max(1000).nullable(),
    }),
  )
  .max(TOPICS.length)
  .refine(
    (answers) => new Set(answers.map((a) => a.topic)).size === answers.length,
    'One answer per topic',
  );
