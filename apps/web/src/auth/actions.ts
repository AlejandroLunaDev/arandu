"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authApi } from "@/app-shell/api";
import { clearSession, getSession } from "./session";
import { supabaseServer } from "./sign-in";

/**
 * O01's "Já tenho uma conta" and O21: Google through Supabase, back to /auth/callback, where the API opens its own
 * session (keeping or replacing the guest's).
 */
export async function signInWithGoogle(): Promise<void> {
  const origin = (await headers()).get("origin");
  if (!origin) throw new Error("A sign-in needs the page's origin");
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/auth/callback` } });
  if (error || !data.url) throw error ?? new Error("Supabase gave no Google URL");
  redirect(data.url);
}

/** Você's "Sair": the API ends this session, the cookie goes, and the person is back on the landing. */
export async function signOut(): Promise<void> {
  const session = await getSession().catch(() => null);
  // A session the API already ended, or an API that is down, must not keep the person signed in here.
  if (session) await authApi("/auth/logout", session.accessToken, { method: "POST" }).catch(() => undefined);
  await clearSession();
  redirect("/");
}
