"use server";

import type { Home, Journey, ChapterResult, Wallet } from "@arandu/contracts";
import { ApiError, api } from "@/app-shell/api";

// The path's calls (P1-P7), run on this server in the person's session. What ends up in a URL is checked here first.

const isIndex = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 1e9;

/** P1: the book done, the person opens the next subject of their semester. */
export async function startBook(disciplineId: number): Promise<void> {
  if (!isIndex(disciplineId)) throw new Error("Not a subject");
  await api<Journey>("/me/journey", { method: "PATCH", body: { disciplineId } });
}

/** P5: a wrong answer spends a novelo. */
export async function spendNovelo(): Promise<Wallet> {
  return api<Wallet>("/me/novelos/spend", { method: "POST" });
}

/** P6: at 0 novelos, re-reading the chapter's cards gives one back, once per chapter; null when the API says it already did. */
export async function rereadChapter(disciplineId: number, topic: number): Promise<Wallet | null> {
  if (!isIndex(disciplineId) || !isIndex(topic)) throw new Error("Not a chapter");
  try {
    return await api<Wallet>(`/chapters/${disciplineId}/${topic}/reread`, { method: "POST" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return null;
    throw error;
  }
}

/**
 * P6: one novelo for peixinhos, at today's price; null when there are too few of them. Novelos already back (midnight
 * passed while P6 was open) are no refusal: the wallet as it is now comes back.
 */
export async function refillNovelos(): Promise<Wallet | null> {
  try {
    return await api<Wallet>("/me/shop/novelos", { method: "POST" });
  } catch (error) {
    if (error instanceof ApiError && error.code === "novelos_left") return (await api<Home>("/me")).wallet;
    if (error instanceof ApiError && error.status === 409) return null;
    throw error;
  }
}

/** P7: the chapter is done; what it gave, and the week with it. */
export async function finishChapter(disciplineId: number, topic: number, mistakes: number): Promise<{ result: ChapterResult; home: Home }> {
  if (!isIndex(disciplineId) || !isIndex(topic)) throw new Error("Not a chapter");
  const result = await api<ChapterResult>(`/chapters/${disciplineId}/${topic}/result`, { method: "POST", body: { mistakes } });
  return { result, home: await api<Home>("/me") };
}
