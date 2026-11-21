import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { OnboardingAnswer } from "@arandu/contracts";
import { nextQuestion, toMessage, withAnswer } from "./answers.ts";

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

describe("toMessage", () => {
  it("joins picks, then words", () => assert.equal(toMessage(["Exatas", "Física"], "Gosto de contas"), "Exatas, Física. Gosto de contas"));
  it("words only", () => assert.equal(toMessage([], "só texto"), "só texto"));
  it("picks only", () => assert.equal(toMessage(["A"], null), "A"));
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
