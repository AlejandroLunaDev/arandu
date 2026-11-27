"use server";

import type {
  AskReply,
  AranduChatReply,
  AranduProfile,
  CareerPaths,
  CourseChoice,
  Journey,
  JourneyUpdate,
  Me,
  OnboardingReply,
  Recommendations,
  ChapterContent,
} from "@arandu/contracts";
import { updateTag } from "next/cache";
import { MINE, api } from "@/app-shell/api";
import { ensureGuest } from "@/auth/sign-in";
import { careerPaths, chapterContent } from "./catalog";

// The onboarding's calls (O01-O21), run on this server in the person's session. Each is a public endpoint: the API
// validates every body, and what ends up in a URL is checked here first.

const SLUG = /^[a-z0-9-]{1,100}$/;
const isIndex = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 1e9;

/** O01 "Começar": a guest's session (unless the person has one), then Arandu's first question. */
export async function startOnboarding(): Promise<OnboardingReply> {
  const token = await ensureGuest();
  return api<OnboardingReply>("/arandu/onboarding", { method: "POST", body: {}, token });
}

export async function answerOnboarding(sessionId: string, message: string): Promise<OnboardingReply> {
  return api<OnboardingReply>("/arandu/onboarding", { method: "POST", body: { sessionId, message } });
}

/** The journey is what the app's door reads (app-shell/entry-gate.tsx): a change drops the cached copy. */
export async function saveJourney(update: JourneyUpdate): Promise<void> {
  try {
    await api<Journey>("/me/journey", { method: "PATCH", body: update });
  } finally {
    updateTag(MINE);
  }
}

export async function recommend(profile: AranduProfile): Promise<Recommendations> {
  return api<Recommendations>("/arandu/recommendations", { method: "POST", body: { profile } });
}

/** O10: the person asks about the recommended careers before choosing; Arandu works out which one they mean. */
export async function askAboutCareers(
  professionSlugs: string[],
  message: string,
  sessionId?: string,
  choices?: CourseChoice[],
  seenSlugs?: string[],
): Promise<AranduChatReply> {
  const slugs = (list: unknown) => Array.isArray(list) && list.every((s) => typeof s === "string" && SLUG.test(s));
  if (!slugs(professionSlugs) || (seenSlugs !== undefined && !slugs(seenSlugs))) throw new Error("Not career slugs");
  return api<AranduChatReply>("/arandu/chat", { method: "POST", body: { professionSlugs, message, sessionId, choices, seenSlugs } });
}

export async function getCareerPaths(slug: string): Promise<CareerPaths> {
  if (typeof slug !== "string" || !SLUG.test(slug)) throw new Error("Not a career slug");
  return careerPaths(slug);
}

export async function getChapter(disciplineId: number, topic: number): Promise<ChapterContent> {
  if (!isIndex(disciplineId) || !isIndex(topic)) throw new Error("Not a chapter");
  return chapterContent(disciplineId, topic);
}

/** T1: a question about a chapter's cards, asked while reading them (never during the exercises). */
export async function askAboutChapter(disciplineId: number, topic: number, question: string): Promise<AskReply> {
  if (!isIndex(disciplineId) || !isIndex(topic)) throw new Error("Not a chapter");
  const asked = typeof question === "string" ? question.trim().slice(0, 1000) : "";
  if (!asked) throw new Error("No question");
  return api<AskReply>(`/chapters/${disciplineId}/${topic}/ask`, { method: "POST", body: { question: asked } });
}

/** O20: whether the person still has to link Google (O21), or already came in with it. */
export async function isGuest(): Promise<boolean> {
  return (await api<Me>("/auth/me")).guest;
}
