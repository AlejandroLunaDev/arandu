"use server";

import type { Caixa, CaixaContents, DailyGift, Home, Journey, Lesson, LessonResult, LessonResultRequest, Wallet } from "@arandu/contracts";
import { updateTag } from "next/cache";
import { ApiError, MINE, api } from "@/app-shell/api";

// The path's calls (P1-P7), run on this server in the person's session. What ends up in a URL is checked here first.
// Each one changes what the person's cached reads show (app-shell/api.ts mine), so each drops them, whatever the API
// answered: a refusal can still have handed out the day's gift.

const isIndex = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 1e9;

const lessonPath = (disciplineId: number, topic: number, lesson: number) => {
  if (!isIndex(disciplineId) || !isIndex(topic) || ![1, 2, 3].includes(lesson)) throw new Error("Not a lesson");
  return `/chapters/${disciplineId}/${topic}/lessons/${lesson}`;
};

/** P1: the book done, the person opens the next subject of their semester. */
export async function startBook(disciplineId: number): Promise<void> {
  if (!isIndex(disciplineId)) throw new Error("Not a subject");
  try {
    await api<Journey>("/me/journey", { method: "PATCH", body: { disciplineId } });
  } finally {
    updateTag(MINE);
  }
}

/** Why the API would not let the person into a lesson; nothing was spent. */
export type LessonRefusal = "not_enough_peixinhos" | "lesson_locked";

/** P1: enters a lesson, paying its peixinhos. */
export async function startLesson(disciplineId: number, topic: number, lesson: number): Promise<Lesson | { refused: LessonRefusal }> {
  try {
    return await api<Lesson>(`${lessonPath(disciplineId, topic, lesson)}/start`, { method: "POST" });
  } catch (error) {
    if (error instanceof ApiError && (error.code === "not_enough_peixinhos" || error.code === "lesson_locked")) return { refused: error.code };
    throw error;
  } finally {
    updateTag(MINE);
  }
}

/** P6: after the last life, goes on with the lesson for the currency; null when there is too little of it. */
export async function continueLesson(disciplineId: number, topic: number, lesson: number): Promise<Wallet | null> {
  try {
    return await api<Wallet>(`${lessonPath(disciplineId, topic, lesson)}/continue`, { method: "POST" });
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_enough_currency") return null;
    throw error;
  } finally {
    updateTag(MINE);
  }
}

/** P7: the lesson is done; what it gave, and the week with it. */
export async function finishLesson(
  disciplineId: number,
  topic: number,
  lesson: number,
  missed: LessonResultRequest["missed"],
): Promise<{ result: LessonResult; home: Home }> {
  if (!Array.isArray(missed) || missed.length > 100 || !missed.every((m) => isIndex(m?.topic) && isIndex(m?.index))) throw new Error("Not a lesson's misses");
  const body: LessonResultRequest = { missed: missed.map(({ topic, index }) => ({ topic, index })) };
  try {
    const result = await api<LessonResult>(`${lessonPath(disciplineId, topic, lesson)}/result`, { method: "POST", body });
    return { result, home: await api<Home>("/me") };
  } finally {
    updateTag(MINE);
  }
}

/** P7: opens the caixa a lesson earned, and says what it held. */
export async function openCaixa(id: number): Promise<CaixaContents> {
  if (!isIndex(id)) throw new Error("Not a caixa");
  try {
    const { contents } = await api<Caixa>(`/me/caixas/${id}/open`, { method: "POST" });
    if (!contents) throw new Error("The caixa came back closed");
    return contents;
  } finally {
    updateTag(MINE);
  }
}

/** S1: takes the day's gift of peixinhos. */
export async function takeDailyGift(): Promise<DailyGift> {
  try {
    return await api<DailyGift>("/me/daily-gift", { method: "POST" });
  } finally {
    updateTag(MINE);
  }
}
