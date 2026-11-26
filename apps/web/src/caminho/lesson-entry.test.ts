import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { type LessonEntry, enterLesson, enteredLesson, keepLesson, leaveLesson, readEntry } from "./lesson-entry.ts";

// Node has no sessionStorage: these run as a browser with storage blocked, where the tab's copy is all there is.
const entry = {
  disciplineId: 1,
  discipline: "Anatomia",
  topic: 0,
  number: 1,
  text: "Ossos",
  total: 5,
  lesson: { index: 1, total: 3, lives: 3, cards: [], exercises: [] },
} as unknown as LessonEntry;

describe("lesson entry", () => {
  it("keeps the lives spent, so a reload does not give them back", () => {
    enterLesson(entry);
    keepLesson({ left: 0 });
    assert.equal(readEntry(enteredLesson())?.left, 0);
  });

  it("keeps the result once the lesson is done", () => {
    enterLesson(entry);
    const finished = { result: { caixaId: 7 }, home: {}, caixa: null } as unknown as LessonEntry["finished"];
    keepLesson({ finished });
    assert.deepEqual(readEntry(enteredLesson())?.finished, finished);
  });

  it("leaves without storage, and keeps nothing after", () => {
    enterLesson(entry);
    assert.doesNotThrow(leaveLesson);
    assert.equal(enteredLesson(), "");
    keepLesson({ left: 1 });
    assert.equal(enteredLesson(), "");
  });
});
