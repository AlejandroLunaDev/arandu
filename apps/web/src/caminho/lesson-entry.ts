import type { Lesson } from "@arandu/contracts";

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
};

const KEY = "arandu:lesson";
let entered = "";

// Entering costs peixinhos, so the lesson is kept for the tab: a reload opens it again instead of charging twice.
export function enterLesson(entry: LessonEntry) {
  entered = JSON.stringify(entry);
  try {
    sessionStorage.setItem(KEY, entered);
  } catch {
    // No storage (private mode, quota): the lesson still opens, and only a reload loses it.
  }
}

export function leaveLesson() {
  entered = "";
  sessionStorage.removeItem(KEY);
}

/** The entry as it was stored, "" when there is none: the same string between reads, for useSyncExternalStore. */
export const enteredLesson = () => (entered ||= sessionStorage.getItem(KEY) ?? "");

/** null when what was stored is not an entry. */
export function readEntry(raw: string): LessonEntry | null {
  try {
    const entry = JSON.parse(raw) as LessonEntry;
    return Array.isArray(entry?.lesson?.exercises) && Array.isArray(entry.lesson.cards) ? entry : null;
  } catch {
    return null;
  }
}
