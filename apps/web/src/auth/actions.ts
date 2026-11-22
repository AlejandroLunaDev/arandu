"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
