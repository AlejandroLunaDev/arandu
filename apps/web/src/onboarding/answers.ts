import type { AranduProfile, OnboardingAnswer, OnboardingTopic } from "@arandu/contracts";
import { QUESTIONS, type Question } from "./questions.ts";

/** The question Arandu is on: the first topic it has not covered yet, as the API asks them in order. */
export function nextQuestion(covered: OnboardingTopic[]): Question {
  return QUESTIONS.find((q) => !covered.includes(q.topic)) ?? QUESTIONS[QUESTIONS.length - 1]!;
}

/** What Arandu reads as the person's answer: the tapped options, then their own words. */
export function toMessage(picks: string[], said: string | null): string {
  return [picks.join(", "), said].filter(Boolean).join(". ");
}

/** The answers with this one in: a topic asked again keeps only its last answer. */
export function withAnswer(answers: OnboardingAnswer[], answer: OnboardingAnswer): OnboardingAnswer[] {
  return [...answers.filter((a) => a.topic !== answer.topic), answer];
}

// POST /arandu/recommendations bounds the profile (items 1-200 chars, 10 per list), but the model that writes it
// has no bounds: trim, drop the empty, cut the long, so a talkative model never blocks O10.
const clean = (text: string | null) => text?.trim().slice(0, 200) || null;
const cleanAll = (items: string[]) => items.map(clean).filter((item): item is string => item !== null).slice(0, 10);

export function toProfileInput(profile: AranduProfile): AranduProfile {
  return {
    situation: clean(profile.situation),
    likedSubjects: cleanAll(profile.likedSubjects),
    hardSubjects: cleanAll(profile.hardSubjects),
    interests: cleanAll(profile.interests),
    workStyle: cleanAll(profile.workStyle),
    admired: cleanAll(profile.admired),
    careerIdea: clean(profile.careerIdea),
    covered: [...new Set(profile.covered)],
  };
}
