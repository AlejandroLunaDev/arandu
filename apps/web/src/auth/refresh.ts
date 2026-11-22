import type { TokenPair } from "@arandu/contracts";
import type { AuthConfig } from "./config";

/** After this long the API refuses to rotate: nobody would be waiting for the new token. */
const REFRESH_DEADLINE_MS = 8_000;
/** Stops waiting for the API, later than the deadline so an in-time rotation still gets its answer back. */
const REFRESH_TIMEOUT_MS = 10_000;
/** The API's answers that end the session for good: anything else is transient and must not sign the person out. */
const SESSION_OVER = new Set(["invalid_refresh_token", "user_banned"]);

/** The `code` of an API error body (`{ error: { statusCode, code, message } }`), or null when it has none. */
export async function errorCode(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as { error?: { code?: unknown } } | null;
  return typeof body?.error?.code === "string" ? body.error.code : null;
}

const inFlight = new Map<string, Promise<TokenPair | null>>();

/**
 * Exchanges a refresh token for a new pair. Null when the API ends the session (an invalid refresh token or a banned
 * user); any other failure (the API asleep or busy, a timeout) throws, so a transient error never signs anyone out.
 * The deadline keeps a request that reaches a waking API too late from spending the token for a pair nobody receives.
 * Single-flight: parallel requests holding the same refresh token share one call (one server instance; the API's
 * 30-second rotation grace covers the rest). Plain fetch: this runs in the proxy.
 */
export function refreshTokens(config: AuthConfig, refreshToken: string, headers: Record<string, string>): Promise<TokenPair | null> {
  const pending = inFlight.get(refreshToken);
  if (pending) return pending;

  const call = (async () => {
    const response = await fetch(`${config.apiUrl}/auth/refresh`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ refreshToken, deadline: Date.now() + REFRESH_DEADLINE_MS }),
      cache: "no-store",
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });
    if (response.ok) return (await response.json()) as TokenPair;
    const code = await errorCode(response);
    if (code && SESSION_OVER.has(code)) return null;
    throw new Error(`POST /auth/refresh failed with ${response.status}`);
  })().finally(() => inFlight.delete(refreshToken));

  inFlight.set(refreshToken, call);
  return call;
}
