/** A chapter is this many lessons: three composed from its pieces, then a review. */
export const LESSONS = 4;
/** Sabedoria each lesson gives the first time (demo value, #123). */
export const LESSON_SABEDORIA = 4;
/** Misses from earlier chapters of the same subject added to a review. */
export const EARLIER_MISSES = 2;
/** Pieces a review takes from the chapter when nothing was missed. */
export const REVIEW_WHEN_CLEAN = 3;

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
