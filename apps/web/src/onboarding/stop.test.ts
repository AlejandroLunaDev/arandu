import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Exercise } from "@arandu/contracts";
import { afterAnswer, sentenceRight, shuffled } from "./stop.ts";

describe("afterAnswer", () => {
  it("drops the first on a right answer", () => assert.deepEqual(afterAnswer([0, 1, 2], true), [1, 2]));
  it("moves the first to the end on a wrong answer", () => assert.deepEqual(afterAnswer([0, 1, 2], false), [1, 2, 0]));
  it("stays empty when empty", () => {
    assert.deepEqual(afterAnswer([], true), []);
    assert.deepEqual(afterAnswer([], false), []);
  });
  it("keeps a single wrong item", () => assert.deepEqual(afterAnswer([3], false), [3]));
});

describe("sentenceRight", () => {
  const ex = { kind: "complete_a_frase", answers: ["a", "b"] } as unknown as Extract<Exercise, { kind: "complete_a_frase" }>;
  it("is true when every gap holds its answer in order", () => assert.equal(sentenceRight(ex, ["a", "b"]), true));
  it("is false with a wrong word", () => assert.equal(sentenceRight(ex, ["a", "x"]), false));
  it("is false with a swapped order", () => assert.equal(sentenceRight(ex, ["b", "a"]), false));
  it("is false with a null", () => assert.equal(sentenceRight(ex, ["a", null]), false));
});

describe("shuffled", () => {
  it("keeps the same items and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffled(input);
    assert.deepEqual(input, [1, 2, 3, 4, 5, 6]);
    assert.deepEqual([...out].sort(), input);
  });
});
