import type { Journey } from "@arandu/contracts";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/auth/session";
import { api } from "./api";

// The app's front door, on the server: with no session, or an onboarding not finished (its last answer is the age,
// O20), the person goes to the onboarding; otherwise into the room. Reading the session creates no user: the guest is
// made at "Começar".
// shortcut: an onboarding left halfway starts over at O01; it resumes from the journey once that matters.
export async function EntryGate({ children }: { children: ReactNode }) {
  if (!(await getSession())) redirect("/app/onboarding");
  const journey = await api<Journey>("/me/journey");
  if (journey.age === null) redirect("/app/onboarding");
  return children;
}
