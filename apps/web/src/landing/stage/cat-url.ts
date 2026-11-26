// Which model of Arandu a page loads; apart from cat.ts, so a page can ask without loading three.js.

/** The league whose outfit Arandu wears on this element's page ([data-league], app-shell/dressed.tsx), or none. */
export const leagueOf = (el: Element) =>
  // In development, ?liga=<league> tries another league's outfit on.
  (process.env.NODE_ENV === "development" && new URLSearchParams(location.search).get("liga")) ||
  (el.closest<HTMLElement>("[data-league]")?.dataset.league ?? null);
/** His model: with the outfits for a page with a league, the light one without. */
export const catUrl = (league: string | null) => (league ? "/models/arandu-dressed.glb" : "/models/arandu.glb");
