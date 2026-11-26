import type { Home, League } from "@arandu/contracts";
import { mine } from "@/app-shell/api";
import { HomeView } from "@/room/home";

// Quarto (S1), the app's home. No loading boundary of its own: on the way back from the path the path stays on screen
// while Arandu leaps off and this loads (app-shell/walk-off.ts); a first visit waits in the tabs' boundary.
export default async function QuartoPage() {
  const [home, league] = await Promise.all([mine<Home>("/me"), mine<League>("/me/league")]);
  return <HomeView home={home} league={league} />;
}
