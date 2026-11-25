import "server-only";
import type { CareerPaths, StopContent } from "@arandu/contracts";
import { cacheLife, cacheTag } from "next/cache";
import { publicApi } from "@/app-shell/api";

// Reads every person shares, so this server caches them with no token in the key. Their content changes only when the
// catalog or a stop is regenerated: an hour's staleness is fine, and a tag expires one on demand.

/** A career's courses and their first-semester subjects (O10-O11). */
export async function careerPaths(slug: string): Promise<CareerPaths> {
  "use cache";
  cacheLife("hours");
  cacheTag(`paths:${slug}`);
  return publicApi<CareerPaths>(`/careers/${slug}/paths`);
}

/** A stop's cards and exercises (O14-O18 and every later stop). */
export async function stopContent(disciplineId: number, topic: number): Promise<StopContent> {
  "use cache";
  cacheLife("hours");
  cacheTag(`stop:${disciplineId}:${topic}`);
  return publicApi<StopContent>(`/stops/${disciplineId}/${topic}`);
}
