/** A chapter is this many lessons, composed from its pieces; the last one finishes the chapter. */
export const LESSONS = 3;
/** Sabedoria each lesson gives the first time (demo value, #123). */
export const LESSON_SABEDORIA = 4;
/** Mistakes a lesson allows (#145). */
export const LESSON_LIVES = 3;

/** Lessons 1 and 2 open in any order; lesson 3 once both are done. */
export const lessonOpen = (lesson: number, done: ReadonlySet<number>) =>
  lesson < LESSONS || (done.has(1) && done.has(2));

/**
 * A lesson's share of the chapter's cards, earlier lessons first: 5 cards are 2, 2 and 1. A chapter with fewer cards
 * than lessons shows them all in each.
 */
export function lessonCards<T>(cards: readonly T[], lesson: number): T[] {
  if (cards.length < LESSONS) return [...cards];
  const base = Math.floor(cards.length / LESSONS);
  const extra = cards.length % LESSONS;
  const start = (lesson - 1) * base + Math.min(lesson - 1, extra);
  return cards.slice(start, start + base + (lesson <= extra ? 1 : 0));
}

/** A number generator seeded by a string (FNV-1a into mulberry32): the same seed always gives the same sequence. */
export function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
