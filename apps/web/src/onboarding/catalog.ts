import "server-only";
import type { CareerPaths, ChapterContent } from "@arandu/contracts";
import { cacheLife, cacheTag } from "next/cache";
import { publicApi } from "@/app-shell/api";

// Reads every person shares, so this server caches them with no token in the key. Their content changes only when the
// catalog or a chapter is regenerated: an hour's staleness is fine, and a tag expires one on demand.

/** A career's courses and their first-semester subjects (O10-O11). */
export async function careerPaths(slug: string): Promise<CareerPaths> {
  "use cache";
  cacheLife("hours");
  cacheTag(`paths:${slug}`);
  return publicApi<CareerPaths>(`/careers/${slug}/paths`);
}

/** A chapter's cards and exercises (O14-O18 and every later chapter). */
export async function chapterContent(disciplineId: number, topic: number): Promise<ChapterContent> {
  "use cache";
  cacheLife("hours");
  cacheTag(`chapter:${disciplineId}:${topic}`);
  return publicApi<ChapterContent>(`/chapters/${disciplineId}/${topic}`);
}
