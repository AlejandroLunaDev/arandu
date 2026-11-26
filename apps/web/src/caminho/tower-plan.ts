/** A lesson or a chapter on the tower, as the person meets it. */
export type SpotState = "done" | "open" | "locked";

/** One floor of the tower: what hangs in it, and what stands on its floor. */
export type Bay = {
  hung: "crown" | "special" | { lessons: number };
  floor: "end" | "tunnel" | { house: number };
};

export const chapterKey = (chapter: number) => `c${chapter}`;
export const lessonKey = (chapter: number, lesson: number) => `c${chapter}l${lesson}`;
export const specialKey = (after: number) => `s${after}`;

/**
 * The tower's bays from the top, as plan() in blender/tower/build.py. A chapter's house stands on a floor and its
 * lessons hang in the bay under it, so going down the order is house, lessons, next house. A special lesson takes a
 * bay of its own after every `specialEvery` chapters, and the bay before it holds a tunnel in place of a house.
 * shortcut: a bay has three lesson spots (left, right, front); a chapter with more lessons needs a second bay.
 */
export function towerPlan(chapters: number, specialEvery = 2): Bay[] {
  const bays: Bay[] = [{ hung: "crown", floor: chapters > 0 ? { house: 0 } : "end" }];
  for (let c = 0; c < chapters; c++) {
    const last = c === chapters - 1;
    const special = (c + 1) % specialEvery === 0 && !last;
    bays.push({ hung: { lessons: c }, floor: last ? "end" : special ? "tunnel" : { house: c + 1 } });
    if (special) bays.push({ hung: "special", floor: { house: c + 1 } });
  }
  return bays;
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
