/** A chapter is this many lessons: three over its exercises, then a review. */
export const LESSONS = 4;
/** Sabedoria each lesson gives the first time (demo value, #123). */
export const LESSON_SABEDORIA = 4;
/** Misses from earlier chapters of the same subject added to a review. */
export const EARLIER_MISSES = 2;
/** Exercises a review takes from the chapter when nothing was missed. */
export const REVIEW_WHEN_CLEAN = 3;

export interface ExerciseRef {
  topic: number;
  index: number;
}

/** A number generator seeded by a string (FNV-1a into mulberry32): the same seed always gives the same sequence. */
function seeded(seed: string): () => number {
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

/** 0..count-1 shuffled by the seed (Fisher-Yates). */
export function shuffled(count: number, seed: string): number[] {
  const random = seeded(seed);
  const out = Array.from({ length: count }, (_, i) => i);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** The exercise indexes of lessons 1-3: a per-person shuffle cut in three, the larger groups first (11 → 4, 4, 3). */
export function splitLessons(count: number, seed: string): number[][] {
  const order = shuffled(count, seed);
  const groups = LESSONS - 1;
  const base = Math.floor(count / groups);
  const extra = count % groups;
  const out: number[][] = [];
  let at = 0;
  for (let g = 0; g < groups; g++) {
    const size = base + (g < extra ? 1 : 0);
    out.push(order.slice(at, at + size));
    at += size;
  }
  return out;
}

const key = (r: ExerciseRef) => `${r.topic}:${r.index}`;

/**
 * Lesson 4: what was missed in lessons 1-3 of this chapter, then up to two earlier misses of the subject, each once.
 * With nothing missed in the chapter, a few of its exercises in the person's order.
 */
export function reviewRefs(
  topic: number,
  missedHere: ExerciseRef[],
  missedEarlier: ExerciseRef[],
  count: number,
  seed: string,
): ExerciseRef[] {
  const seen = new Set<string>();
  const once = (refs: ExerciseRef[]) =>
    refs.filter((r) => !seen.has(key(r)) && seen.add(key(r)));
  const here = once(missedHere.filter((r) => r.topic === topic));
  const chapter = here.length
    ? here
    : shuffled(count, `${seed}:review`)
        .slice(0, REVIEW_WHEN_CLEAN)
        .map((index) => ({ topic, index }));
  return [
    ...chapter,
    ...once(missedEarlier.filter((r) => r.topic !== topic)).slice(
      0,
      EARLIER_MISSES,
    ),
  ];
}
