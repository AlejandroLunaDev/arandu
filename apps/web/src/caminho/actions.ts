"use server";

import type { Home, Journey, StopResult, Wallet } from "@arandu/contracts";
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

/** P6: at 0 novelos, re-reading the stop's cards gives one back, once per stop; null when the API says it already did. */
export async function rereadStop(disciplineId: number, topic: number): Promise<Wallet | null> {
  if (!isIndex(disciplineId) || !isIndex(topic)) throw new Error("Not a stop");
  try {
    return await api<Wallet>(`/stops/${disciplineId}/${topic}/reread`, { method: "POST" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return null;
    throw error;
  }
}

/** P6: full novelos for peixinhos; null when there are not enough of them. */
export async function refillNovelos(): Promise<Wallet | null> {
  try {
    return await api<Wallet>("/me/shop/novelos", { method: "POST" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return null;
    throw error;
  }
}

/** P7: the stop is done; what it gave, and the week with it. */
export async function finishStop(disciplineId: number, topic: number, mistakes: number): Promise<{ result: StopResult; home: Home }> {
  if (!isIndex(disciplineId) || !isIndex(topic)) throw new Error("Not a stop");
  const result = await api<StopResult>(`/stops/${disciplineId}/${topic}/result`, { method: "POST", body: { mistakes } });
  return { result, home: await api<Home>("/me") };
}
