"use client";

import { useEffect, useState } from "react";
import { Cat } from "./cat";
import type { CatMood } from "./cat-scene";
import styles from "./ui.module.css";

/** What Arandu does beside his bubble: one of the 3D cat's clips. */
export type Pose = CatMood;

const WORD_MS = 70;
/** How long he walks from the bubble's tail to his place under it: the CSS waits 0.3s, then moves him for 0.9s. */
const WALK_MS = 1200;

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

/**
 * The thought's trail: three small bubbles from Arandu up to his words, the smallest nearest him. They belong under
 * the words (inside a `ui.bubble`), where he is once the words are over him, and come one after another when `on`.
 */
export function Trail({ on }: { on: boolean }) {
  return (
    <span className={styles.trail} data-on={on || undefined} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * Arandu's thought, the cat at its trail: a cat does not talk, so what he tells is what goes through his head. `free`, on a screen where the person answers in the field below: once he has
 * said it all the bubble floats up a little and he walks out from beside it to wait under it. Sitting there he is on
 * his own: the 3D cat taps, stretches, turns and watches the pointer until the answer comes.
 */
export function AranduSays({ text, shown, pose, free = false }: { text: string; shown: number; pose: Pose; free?: boolean }) {
  const said = free && shown >= text.split(" ").length;
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    if (!said) return;
    const id = setTimeout(() => setArrived(true), WALK_MS);
    return () => clearTimeout(id);
  }, [said]);
  return (
    <section className={styles.talk} data-free={free || undefined} data-said={said || undefined}>
      <Cat mood={!said ? pose : arrived ? "sit" : "walk"} size={104} className={styles.talkCat} />
      <div className={styles.bubble} role="status">
        <Said text={text} shown={shown} />
        {free && <Trail on={said} />}
      </div>
    </section>
  );
}
