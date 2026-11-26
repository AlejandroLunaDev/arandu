import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AranduProfile, OnboardingAnswer } from "@arandu/contracts";
import { nextQuestion, toProfileInput, withAnswer } from "./answers.ts";

describe("nextQuestion", () => {
  it("starts on situation", () => assert.equal(nextQuestion([]).topic, "situation"));
  it("skips covered topics", () =>
    assert.equal(nextQuestion(["situation", "likedSubjects"]).topic, "hardSubjects"));
  it("finds the first uncovered one out of order", () =>
    assert.equal(nextQuestion(["situation", "hardSubjects"]).topic, "likedSubjects"));
  it("stays on the last question when all are covered", () =>
    assert.equal(
      nextQuestion(["situation", "likedSubjects", "hardSubjects", "interests", "workStyle", "admired", "careerIdea"]).topic,
      "careerIdea",
    ));
});

describe("withAnswer", () => {
  const a: OnboardingAnswer = { topic: "situation", picks: [], text: "um" };
  const b: OnboardingAnswer = { topic: "interests", picks: [], text: "dois" };
  it("replaces the same topic, keeping one", () => {
    const out = withAnswer([a, b], { topic: "situation", picks: [], text: "novo" });
    assert.equal(out.filter((x) => x.topic === "situation").length, 1);
    assert.equal(out.length, 2);
    assert.equal(out.find((x) => x.topic === "situation")?.text, "novo");
  });
  it("appends a new topic", () => {
    const out = withAnswer([a], b);
    assert.deepEqual(out, [a, b]);
  });
});

describe("toProfileInput", () => {
  const base: AranduProfile = {
    situation: "Terceiro ano",
    likedSubjects: ["Física"],
    hardSubjects: ["Química"],
    interests: ["Música"],
    workStyle: ["Em grupo"],
    admired: ["Marie Curie"],
    careerIdea: "Medicina",
    covered: ["situation", "likedSubjects"],
  };
  const lists = ["likedSubjects", "hardSubjects", "interests", "workStyle", "admired"] as const;

  it("trims items and drops empty or whitespace-only ones", () => {
    for (const k of lists) {
      assert.deepEqual(toProfileInput({ ...base, [k]: ["  a ", "", "   ", "b"] })[k], ["a", "b"]);
    }
  });
  it("cuts an item over 200 chars to 200", () => {
    for (const k of lists) assert.equal(toProfileInput({ ...base, [k]: ["x".repeat(250)] })[k][0]!.length, 200);
  });
  it("keeps the first 10 of 12 items", () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `i${i}`);
    for (const k of lists) assert.deepEqual(toProfileInput({ ...base, [k]: twelve })[k], twelve.slice(0, 10));
  });
  it("normalizes situation and careerIdea", () => {
    for (const k of ["situation", "careerIdea"] as const) {
      assert.equal(toProfileInput({ ...base, [k]: "  " })[k], null);
      assert.equal(toProfileInput({ ...base, [k]: null })[k], null);
      assert.equal(toProfileInput({ ...base, [k]: " Medicina " })[k], "Medicina");
      assert.equal(toProfileInput({ ...base, [k]: "y".repeat(250) })[k], "y".repeat(200));
    }
  });
  it("removes duplicate covered topics, keeping order", () => {
    const out = toProfileInput({ ...base, covered: ["interests", "situation", "interests", "situation", "admired"] });
    assert.deepEqual(out.covered, ["interests", "situation", "admired"]);
  });
  it("returns a clean profile unchanged", () => assert.deepEqual(toProfileInput(base), base));
});
