import "server-only";
import type { TokenPair } from "@arandu/contracts";
import { cookies } from "next/headers";
import * as React from "react";
import { readAuthConfig } from "./config";
import { expiredCookieOptions, openSession, sealSession, sessionCookieName, sessionCookieOptions, toSessionCookie, usableToken } from "./cookie";

type Taint = (message: string, lifetime: object, value: string) => void;
// Only in React's experimental channel, which `experimental.taint` turns on.
const taintUniqueValue = (React as unknown as { experimental_taintUniqueValue?: Taint }).experimental_taintUniqueValue;

/**
 * Entry point of the data access layer, once per request. Never refreshes (the proxy does). Null when there is no
 * session; throws SessionUnavailable when the proxy could not refresh it just now, so the error screen offers a retry
 * instead of the onboarding.
 */
export const getSession = React.cache(async (): Promise<{ accessToken: string } | null> => {
  // The request comes first: at build, the prerender stops here instead of reading settings it does not have.
  const store = await cookies();
  const config = readAuthConfig();
  const raw = store.get(sessionCookieName(config.secureCookie))?.value;
  if (!raw) return null;
  const accessToken = usableToken(await openSession(raw, config.cookieSecret));
  if (!accessToken) return null;
  const result = { accessToken };
  // Passing the token to a Client Component fails loudly.
  taintUniqueValue?.("Never pass the access token to the client", result, accessToken);
  return result;
});

/** Stores a new session, replacing any other. Server Actions and Route Handlers only. */
export async function setSession(pair: TokenPair): Promise<void> {
  const config = readAuthConfig();
  const sealed = await sealSession(toSessionCookie(pair), config.cookieSecret);
  (await cookies()).set(sessionCookieName(config.secureCookie), sealed, sessionCookieOptions(config.secureCookie));
}

export async function clearSession(): Promise<void> {
  const config = readAuthConfig();
  (await cookies()).set(sessionCookieName(config.secureCookie), "", expiredCookieOptions(config.secureCookie));
}
