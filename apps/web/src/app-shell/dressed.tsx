import type { League } from "@arandu/contracts";
import type { ReactNode } from "react";
import { mine } from "./api";

// Arandu wears the person's league's outfit on every screen past the onboarding: the 3D scenes read it from here
// (leagueOf in landing/stage/cat.ts). display: contents, so the page lays out as without it.
export async function Dressed({ children }: { children: ReactNode }) {
  const { league } = await mine<League>("/me/league");
  return (
    <div data-league={league.id} className="contents">
      {children}
    </div>
  );
}
