"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CatMood } from "./cat-scene";
import styles from "./ui.module.css";

/** The still render shown until the 3D cat is up, or instead of it without WebGL. */
const STILL: Record<CatMood, string> = {
  sit: "sitting",
  lie: "lying",
  read: "looking-down",
  hop: "paws-up",
  stand: "standing",
  walk: "standing",
  surprised: "paws-up",
  angry: "standing",
  sad: "lying",
};

type Run = Awaited<ReturnType<typeof import("./cat-scene").runCat>>;

/**
 * Arandu, alive: the 3D cat (arandu.glb) doing `mood`, filling the square its className sizes (size is the still's
 * pixels). three.js loads in its own chunk after the page is up; the still render holds his place meanwhile.
 */
export function Cat({ mood, size, label = "Arandu", className }: { mood: CatMood; size: number; label?: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const run = useRef<Run | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let cancelled = false;
    import("./cat-scene")
      .then(({ runCat }) => runCat(el, mood, () => !cancelled && setLive(true)))
      .then((r) => {
        if (cancelled) r.stop();
        else run.current = r;
      })
      .catch((error: unknown) => console.error("The 3D cat could not load", error));
    return () => {
      cancelled = true;
      run.current?.stop();
      run.current = null;
    };
    // The scene starts once; mood changes go through setMood below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => run.current?.setMood(mood), [mood]);

  return (
    <div ref={box} className={`${styles.cat} ${className ?? ""}`} role="img" aria-label={label} data-live={live || undefined}>
      {!live && <Image src={`/img/arandu/${STILL[mood]}.webp`} alt="" width={size} height={size} priority />}
    </div>
  );
}
