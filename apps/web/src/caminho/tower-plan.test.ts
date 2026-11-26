import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { seeded, towerPlan } from "./tower-plan.ts";

describe("towerPlan", () => {
  it("gives each chapter a storey", () => assert.deepEqual(towerPlan(1), [{ chapter: 0 }]));

  it("puts a special lesson on its own storey after every second chapter", () =>
    assert.deepEqual(towerPlan(5), [{ chapter: 0 }, { chapter: 1 }, { special: 2 }, { chapter: 2 }, { chapter: 3 }, { special: 4 }, { chapter: 4 }]));

  it("never ends on a special lesson", () => assert.deepEqual(towerPlan(2).at(-1), { chapter: 1 }));

  it("is empty with no chapters", () => assert.deepEqual(towerPlan(0), []));
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
