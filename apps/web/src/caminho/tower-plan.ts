/** A lesson or a chapter on the tower, as the person meets it. */
export type SpotState = "done" | "open" | "locked";

/**
 * One storey of the tower: a chapter (its house and its three lessons round it), a special lesson, or the low storey
 * over a chapter that carries its chalkboard, its name on it.
 */
export type Storey = { chapter: number } | { special: number } | { title: number };

export const chapterKey = (chapter: number) => `c${chapter}`;
export const lessonKey = (chapter: number, lesson: number) => `c${chapter}l${lesson}`;
export const specialKey = (after: number) => `s${after}`;

/**
 * The tower's storeys from the top: each chapter under its chalkboard's, and a special lesson on a storey of its own
 * after every `specialEvery` chapters, never after the last.
 */
export function towerPlan(chapters: number, specialEvery = 2): Storey[] {
  const storeys: Storey[] = [];
  for (let c = 0; c < chapters; c++) {
    storeys.push({ title: c }, { chapter: c });
    if ((c + 1) % specialEvery === 0 && c < chapters - 1) storeys.push({ special: c + 1 });
  }
  return storeys;
}

/** A seeded random number source (mulberry32): the same book always grows the same tower. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 1831565813) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
