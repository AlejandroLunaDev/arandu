"use client";

import { createClient } from "@supabase/supabase-js";

const API = process.env.NEXT_PUBLIC_API_URL!.replace(/\/$/, "");

/** Supabase Auth only: the app reads and writes everything else through the API. */
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

export class ApiError extends Error {
  constructor(readonly status: number, path: string) {
    super(`${path} answered ${status}`);
  }
}

let signingIn: Promise<string> | null = null;

/** The session's token. On first open the person gets an anonymous user; O21 links Google to it later. */
async function token(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.access_token;
  // One anonymous sign-in even when several calls start at once.
  signingIn ??= supabase.auth.signInAnonymously().then(({ data, error }) => {
    signingIn = null;
    if (error || !data.session) throw error ?? new Error("No session after the anonymous sign-in");
    return data.session.access_token;
  });
  return signingIn;
}

/** A call to the API with the person's token, the anonymous user's included. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${await token()}`,
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!response.ok) throw new ApiError(response.status, path);
  return response.status === 204 ? (undefined as T) : response.json();
}
