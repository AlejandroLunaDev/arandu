import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { internalHeaders, readAuthConfig } from "@/auth/config";
import { errorCode } from "@/auth/refresh";
import { getSession } from "@/auth/session";

/** A call the API refused: its status and the `code` of its error body. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    path: string,
  ) {
    super(`${path} answered ${status}${code ? ` ${code}` : ""}`);
  }
}

/** `token`: the session just opened in this same action, which the request's cookies do not hold yet. */
type Init = { method?: string; body?: unknown; token?: string };

async function call<T>(path: string, init: Init, extra: Record<string, string>): Promise<T> {
  const config = readAuthConfig();
  const response = await fetch(`${config.apiUrl}${path}`, {
    method: init.method ?? "GET",
    headers: { "x-internal-secret": config.internalSecret, ...extra, ...(init.body === undefined ? {} : { "content-type": "application/json" }) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ApiError(response.status, await errorCode(response), path);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

/**
 * The API in the person's name, with the browser's IP and user agent. With no session, or one the API no longer
 * honors (ended, or the person banned), the person goes back to the start of the app.
 */
export async function api<T>(path: string, init: Init = {}): Promise<T> {
  const token = init.token ?? (await getSession())?.accessToken;
  if (!token) redirect("/app/onboarding");
  try {
    return await call<T>(path, init, { ...internalHeaders(readAuthConfig(), await headers()), authorization: `Bearer ${token}` });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.code === "user_banned")) redirect("/app/onboarding");
    throw error;
  }
}

/** The tag on every read of the person's own data: each action that changes it calls updateTag(MINE). */
export const MINE = "mine";

/**
 * A read of the person's own data that a page can show again without waiting: the router keeps the page for five
 * minutes, and an action that changes the data drops it (updateTag(MINE)). Never kept on the server across requests.
 */
export async function mine<T>(path: string): Promise<T> {
  "use cache: private";
  cacheLife({ stale: 300 });
  cacheTag(MINE);
  return api<T>(path);
}

/**
 * The API's sign-in routes, which answer a refusal instead of sending the person anywhere: the browser's IP counts
 * their rate limit, and the session the caller names (or none) goes along.
 */
export async function authApi<T>(path: string, token: string | null, init: Init = {}): Promise<T> {
  return call<T>(path, init, { ...internalHeaders(readAuthConfig(), await headers()), ...(token ? { authorization: `Bearer ${token}` } : {}) });
}

/**
 * The API with no person, for reads every visitor shares (a career's paths, a chapter's content): it never reads the
 * request, so a `use cache` function can call it and the cache key holds no token.
 */
export function publicApi<T>(path: string): Promise<T> {
  return call<T>(path, {}, {});
}
