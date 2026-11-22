"use server";

import type {
  AranduChatReply,
  AranduProfile,
  CareerPaths,
  Journey,
  JourneyUpdate,
  Me,
  OnboardingReply,
  Recommendations,
  StopContent,
  StopResult,
} from "@arandu/contracts";
import { api } from "@/app-shell/api";
import { ensureGuest } from "@/auth/sign-in";
import { careerPaths, stopContent } from "./catalog";

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

export async function saveJourney(update: JourneyUpdate): Promise<void> {
  await api<Journey>("/me/journey", { method: "PATCH", body: update });
}

export async function recommend(profile: AranduProfile): Promise<Recommendations> {
  return api<Recommendations>("/arandu/recommendations", { method: "POST", body: { profile } });
}

/** O10: the person asks about the recommended careers before choosing; Arandu works out which one they mean. */
export async function askAboutCareers(professionSlugs: string[], message: string, sessionId?: string): Promise<AranduChatReply> {
  if (!Array.isArray(professionSlugs) || !professionSlugs.every((s) => typeof s === "string" && SLUG.test(s))) throw new Error("Not career slugs");
  return api<AranduChatReply>("/arandu/chat", { method: "POST", body: { professionSlugs, message, sessionId } });
}

export async function getCareerPaths(slug: string): Promise<CareerPaths> {
  if (typeof slug !== "string" || !SLUG.test(slug)) throw new Error("Not a career slug");
  return careerPaths(slug);
}

export async function getStop(disciplineId: number, topic: number): Promise<StopContent> {
  if (!isIndex(disciplineId) || !isIndex(topic)) throw new Error("Not a stop");
  return stopContent(disciplineId, topic);
}

export async function saveStopResult(disciplineId: number, topic: number, mistakes: number): Promise<StopResult> {
  if (!isIndex(disciplineId) || !isIndex(topic)) throw new Error("Not a stop");
  return api<StopResult>(`/stops/${disciplineId}/${topic}/result`, { method: "POST", body: { mistakes } });
}

/** O20: whether the person still has to link Google (O21), or already came in with it. */
export async function isGuest(): Promise<boolean> {
  return (await api<Me>("/auth/me")).guest;
}
