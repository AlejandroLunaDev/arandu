"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./ui.module.css";

/** Arandu's 2D poses, renders of the 3D cat (the boards' stand-ins until the 3D cat is in the app). */
export type Pose = "sitting" | "paws-up" | "lying" | "looking-down" | "standing";

const WORD_MS = 70;

/** How many of the text's words are out: Arandu says them one by one, or all at once with reduced motion.
 * It starts at none, so the bubble's live region mounts empty and screen readers announce the text when it comes. */
export function useReveal(text: string) {
  const total = text.split(" ").length;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= total) return;
    const all = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(() => setShown(all ? total : shown + 1), all ? 0 : WORD_MS);
    return () => clearTimeout(id);
  }, [shown, total]);
  return { shown, done: shown >= total };
}

/** Arandu's bubble, the cat at its tail. Screen readers get the whole text at once, with its first word. */
export function AranduSays({ text, shown, pose }: { text: string; shown: number; pose: Pose }) {
  return (
    <section className={styles.talk}>
      <Image src={`/img/arandu/${pose}.webp`} alt="Arandu" width={76} height={76} priority />
      <div className={styles.bubble} role="status">
        <span className="sr-only">{shown > 0 && text}</span>
        <span aria-hidden="true">
          {text.split(" ").slice(0, shown).join(" ")}
          <span className={styles.caret} />
        </span>
      </div>
    </section>
  );
}
