import "server-only";
import type { Me, TokenPair } from "@arandu/contracts";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ApiError, authApi } from "@/app-shell/api";
import { getSession, setSession } from "./session";

/**
 * The person's session, a guest's if they have none (O01's "Começar"). A cookie the API no longer honors (the session
 * ended, the guest was cleaned up) makes way for a new guest. Returns the access token, since the request's cookies do
 * not hold a session set in this same action.
 */
export async function ensureGuest(): Promise<string> {
  const session = await getSession();
  if (session) {
    try {
      await authApi<Me>("/auth/me", session.accessToken);
      return session.accessToken;
    } catch (error) {
      if (!(error instanceof ApiError && (error.status === 401 || error.status === 403))) throw error;
    }
  }
  const pair = await authApi<TokenPair>("/auth/guest", null, { method: "POST" });
  await setSession(pair);
  return pair.accessToken;
}

/**
 * Supabase only proves the Google identity (PKCE): its code verifier, and the session the exchange makes, live in
 * httpOnly cookies just until the API has its own session.
 */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (entries) => entries.forEach(({ name, value, options }) => store.set(name, value, { ...options, httpOnly: true })),
    },
  });
}

/**
 * Exchanges a Google sign-in for an API session: a guest becomes that Google's user, or gives way to the account it
 * already has (the API decides). A session the API no longer honors is not worth keeping, so the sign-in goes on as
 * a plain one.
 */
export async function signInWithIdentity(supabaseToken: string): Promise<void> {
  const current = (await getSession())?.accessToken ?? null;
  const body = { supabaseToken };
  const pair = await authApi<TokenPair>("/auth/session", current, { method: "POST", body }).catch((error: unknown) => {
    if (current && error instanceof ApiError && error.code === "unauthorized") return authApi<TokenPair>("/auth/session", null, { method: "POST", body });
    throw error;
  });
  await setSession(pair);
}
