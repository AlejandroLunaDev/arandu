import type { Journey } from "@arandu/contracts";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { mine } from "./api";

// The app's front door, on the server: with no session, or an onboarding not finished (its last answer is the age,
// O20), the person goes to the onboarding; otherwise into the room (mine() sends a person with no session to the
// onboarding). Reading the session creates no user: the guest is made at "Começar". The session is read only inside
// mine()'s private cache: read out here, its clock check would stop the router's prefetch of the app.
// shortcut: an onboarding left halfway starts over at O01; it resumes from the journey once that matters.
export async function EntryGate({ children }: { children: ReactNode }) {
  const journey = await mine<Journey>("/me/journey");
  if (journey.age === null) redirect("/app/onboarding");
  return children;
}
