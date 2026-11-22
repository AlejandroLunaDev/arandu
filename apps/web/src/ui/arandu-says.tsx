"use client";

import { useEffect, useState } from "react";
import { Cat } from "./cat";
import type { CatMood } from "./cat-scene";
import styles from "./ui.module.css";

/** What Arandu does beside his bubble: one of the 3D cat's clips. */
export type Pose = CatMood;

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

/** The bubble's words: the said ones show, the rest keep their place. Screen readers get the whole text at once, with its first word. */
export function Said({ text, shown }: { text: string; shown: number }) {
  const words = text.split(" ");
  return (
    <>
      <span className="sr-only">{shown > 0 && text}</span>
      <span aria-hidden="true">
        {words.slice(0, shown).join(" ")} <span className={styles.unsaid}>{words.slice(shown).join(" ")}</span>
      </span>
    </>
  );
}

/** Arandu's bubble, the cat at its tail. */
export function AranduSays({ text, shown, pose }: { text: string; shown: number; pose: Pose }) {
  return (
    <section className={styles.talk}>
      <Cat mood={pose} size={104} className={styles.talkCat} />
      <div className={styles.bubble} role="status">
        <Said text={text} shown={shown} />
      </div>
    </section>
  );
}
