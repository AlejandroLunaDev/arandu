import type { CaixaContents, Home, Lesson, LessonResult } from "@arandu/contracts";

/** A lesson the person paid to enter, on its way from the path to the lesson's screen. */
export type LessonEntry = {
  disciplineId: number;
  discipline: string;
  /** The chapter: its topic index for the API, its number on the path, its title, and how many the book has. */
  topic: number;
  number: number;
  text: string;
  total: number;
  lesson: Lesson;
  /** Lives left once one is spent: a reload must not give them back. */
  left?: number;
  /** The lesson is done: what it gave, and its caixa once opened. A reload shows it again instead of a fresh lesson. */
  finished?: { result: LessonResult; home: Home; caixa: CaixaContents | null };
};

const KEY = "arandu:lesson";
let entered = "";

// Entering costs peixinhos, so the lesson is kept for the tab: a reload opens it again instead of charging twice, with
// the lives it has left and, once done, its result.
export function enterLesson(entry: LessonEntry) {
  entered = JSON.stringify(entry);
  try {
    sessionStorage.setItem(KEY, entered);
  } catch {
    // No storage (private mode, quota): the lesson still opens, and only a reload loses it.
  }
}

/** Keeps a change to the lesson the tab holds. */
export function keepLesson(change: Partial<LessonEntry>) {
  const entry = readEntry(enteredLesson());
  if (entry) enterLesson({ ...entry, ...change });
}

export function leaveLesson() {
  entered = "";
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // No storage: nothing was kept.
  }
}

/** The entry as it was stored, "" when there is none: the same string between reads, for useSyncExternalStore. */
export const enteredLesson = () => {
  try {
    return (entered ||= sessionStorage.getItem(KEY) ?? "");
  } catch {
    return entered;
  }
};

/** null when what was stored is not an entry. */
export function readEntry(raw: string): LessonEntry | null {
  try {
    const entry = JSON.parse(raw) as LessonEntry;
    return Array.isArray(entry?.lesson?.exercises) && Array.isArray(entry.lesson.cards) ? entry : null;
  } catch {
    return null;
  }
}
