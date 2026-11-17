import { Hero } from "./hero/hero";
import { Reveals } from "./reveals";
import { SiteNav } from "./site-nav/site-nav";
import { Stage } from "./stage/stage";

// The landing page: the hero under a fixed nav, and the 3D layer with Arandu over them.
export function LandingPage() {
  return (
    <>
      <SiteNav />
      <main className="overflow-x-clip">
        <Hero />
      </main>
      <Stage />
      <Reveals />
    </>
  );
}
