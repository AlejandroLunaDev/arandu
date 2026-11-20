import { Hero } from "./hero/hero";
import { Reveals } from "./reveals";
import { GITHUB_URL } from "./links";
import { Stage } from "./stage/stage";

// The landing page: the hero, a scene with no bar over it, and the 3D layer with Arandu. The link to the
// code is a plaque on the room's wall (run-stage); this one is for the keyboard, seen once focused.
export function LandingPage() {
  return (
    <>
      <a
        className="ar-btn ar-btn--primary sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-10"
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Ver o código no GitHub
      </a>
      <main className="overflow-x-clip">
        <Hero />
      </main>
      <Stage />
      <Reveals />
    </>
  );
}
