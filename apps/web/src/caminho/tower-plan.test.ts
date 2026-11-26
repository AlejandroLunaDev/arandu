import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { seeded, towerPlan } from "./tower-plan.ts";

describe("towerPlan", () => {
  it("goes down house, lessons, next house", () =>
    assert.deepEqual(towerPlan(1), [
      { hung: "crown", floor: { house: 0 } },
      { hung: { lessons: 0 }, floor: "end" },
    ]));

  it("gives a special lesson its own bay after every second chapter, with a tunnel before it", () =>
    assert.deepEqual(towerPlan(3), [
      { hung: "crown", floor: { house: 0 } },
      { hung: { lessons: 0 }, floor: { house: 1 } },
      { hung: { lessons: 1 }, floor: "tunnel" },
      { hung: "special", floor: { house: 2 } },
      { hung: { lessons: 2 }, floor: "end" },
    ]));

  it("ends on the last chapter's lessons, never on a special lesson", () => assert.equal(towerPlan(2).at(-1)?.floor, "end"));

  it("still stands with no chapters", () => assert.deepEqual(towerPlan(0), [{ hung: "crown", floor: "end" }]));
});

describe("seeded", () => {
  it("repeats for the same seed and differs for another", () => {
    const a = seeded(7);
    const b = seeded(7);
    const c = seeded(8);
    const first = a();
    assert.equal(first, b());
    assert.notEqual(first, c());
    assert.ok(first >= 0 && first < 1);
  });
});
