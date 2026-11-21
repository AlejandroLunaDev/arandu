import type { OnboardingAnswer, OnboardingTopic } from "@arandu/contracts";
import { QUESTIONS, type Question } from "./questions.ts";

/** The question Arandu is on: the first topic it has not covered yet, as the API asks them in order. */
export function nextQuestion(covered: OnboardingTopic[]): Question {
  return QUESTIONS.find((q) => !covered.includes(q.topic)) ?? QUESTIONS[QUESTIONS.length - 1];
}

/** What Arandu reads as the person's answer: the tapped options, then their own words. */
export function toMessage(picks: string[], said: string | null): string {
  return [picks.join(", "), said].filter(Boolean).join(". ");
}

/** The answers with this one in: a topic asked again keeps only its last answer. */
export function withAnswer(answers: OnboardingAnswer[], answer: OnboardingAnswer): OnboardingAnswer[] {
  return [...answers.filter((a) => a.topic !== answer.topic), answer];
}
