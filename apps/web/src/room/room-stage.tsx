"use client";

import { useEffect, useRef, useState } from "react";
import { useWalkOff } from "@/app-shell/walk-off";
import { BookPages } from "@/landing/book/book-pages";
import { leagueOf } from "@/landing/stage/cat-url";
import { FrameCredits } from "@/landing/stage/stage";
import stage from "@/landing/stage/stage.module.css";
import { Loading } from "@/ui/loading";
import styles from "./room.module.css";

// Whether the room has been up once in this page's life: only the first entry shows the loading, as coming back
// from the path he walks in and covers it.
let shown = false;

// The Quarto's 3D room: the landing's stage (run-stage) with one room, "quarto" (rooms.ts), on an anchor along the
// bottom of the space between the top line and the ways on. The scene bounds its physics (data-pin: its top is the
// ceiling; data-sides: its sides are the walls) and, on a wide screen, the canvas is cut to its column. three.js loads
// in its own chunk, after the page is up.

const warmTower = () => {
  const room = document.querySelector("[data-room]");
  import("@/caminho/tower-scene")
    .then(({ preloadTower }) => preloadTower(room && leagueOf(room)))
    .catch((error: unknown) => console.error("The path's tower could not preload", error));
};

export function RoomStage() {
  const scene = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [first] = useState(() => !shown);

  // A way to the path: he gets down and walks off to the right, as the path's tower has him come in from the left. The
  // tower's 3D loads meanwhile, so the path shows no loading.
  useWalkOff("/app/caminho", "Tô indo pro caminho!", warmTower);

  useEffect(() => {
    const el = host.current;
    const box = scene.current;
    if (!el || !box) return;
    const cut = () => {
      const r = box.getBoundingClientRect();
      el.style.setProperty("--cut-left", `${r.left}px`);
      el.style.setProperty("--cut-right", `${innerWidth - r.right}px`);
    };
    cut();
    const watcher = new ResizeObserver(cut);
    watcher.observe(document.body);
    let stop: (() => void) | null = null;
    let cancelled = false;
    import("@/landing/stage/run-stage")
      .then(({ runStage }) => {
        if (cancelled) return;
        stop = runStage(el);
        shown = true;
      })
      .catch((error: unknown) => console.error("The 3D room could not load", error));
    return () => {
      cancelled = true;
      watcher.disconnect();
      stop?.();
    };
  }, []);

  return (
    <div ref={scene} data-scene data-pin data-sides className={styles.scene}>
      <span data-room="quarto" className={styles.anchor} />
      {first && (
        <div className={styles.wait}>
          <Loading />
        </div>
      )}
      <div ref={host} className={`${stage.stage} ${styles.cut}`} aria-hidden="true">
        {/* His bubble, as on the landing, for what he says on his way out only (data-quiet: none of its lines). */}
        <p data-say data-quiet className={`${stage.say} type-small`} />
      </div>
      <FrameCredits />
      {/* A book off the shelves opens over the room: its profession's pages (the landing's). */}
      <BookPages />
    </div>
  );
}
