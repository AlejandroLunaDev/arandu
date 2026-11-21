"use client";

import type { Journey } from "@arandu/contracts";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { api, supabase } from "./api";

// The app's front door: with no session on this device, or an onboarding not finished (its last answer is the age,
// O20), the person goes to the onboarding; otherwise into the room.
// shortcut: an onboarding left halfway starts over at O01; it resumes from the journey once that matters. Reading the session creates no user: the anonymous one is made at
// "Começar".
export function EntryGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [inside, setInside] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      // O21's link comes back with this error when the Google account already has its own user: that account is
      // who the person is, so they sign in to it (what this device did anonymously stays with the anonymous user).
      const back = new URLSearchParams(`${location.search.slice(1)}&${location.hash.slice(1)}`);
      if (back.get("error_code") === "identity_already_exists") {
        await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/app` } });
        return;
      }
      const { data } = await supabase.auth.getSession();
      const journey = data.session ? await api<Journey>("/me/journey").catch(() => null) : null;
      if (!live) return;
      // shortcut: when the API can't be reached the person stays in the room rather than redoing the onboarding.
      if (!data.session || (journey && journey.age === null)) router.replace("/app/onboarding");
      else setInside(true);
    })();
    return () => {
      live = false;
    };
  }, [router]);

  return inside ? children : null;
}
