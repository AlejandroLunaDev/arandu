import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CLOUD_OUT, cloudPath } from "./cloud-path.ts";

/** Every number in a path, and the end points of its arcs (the two numbers before each next command). */
const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const puffs = (d: string) => (d.match(/M/g) ?? []).length;

describe("cloudPath", () => {
  it("draws only finite numbers, for a line of words and for a long answer", () => {
    for (const [w, h] of [
      [270, 50],
      [270, 240],
      [120, 56],
      [40, 40],
    ] as const) {
      const { fill, line } = cloudPath(w, h);
      assert.ok(fill.startsWith("M") && fill.endsWith("Z"));
      assert.ok(numbers(fill + line).every(Number.isFinite), `${w}x${h}`);
    }
  });

  it("stays inside its drawing, the box and a puff's reach round it", () => {
    const [w, h] = [270, 120];
    const { fill } = cloudPath(w, h);
    // The arcs' end points sit on the box's outline, which starts CLOUD_OUT in.
    const ends = [...fill.matchAll(/ 0 0 1 (-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
    for (const [x, y] of ends) {
      assert.ok(x >= CLOUD_OUT - 0.1 && x <= w + CLOUD_OUT + 0.1, `x ${x}`);
      assert.ok(y >= CLOUD_OUT - 0.1 && y <= h + CLOUD_OUT + 0.1, `y ${y}`);
    }
  });

  it("gives a bigger box more puffs, not bigger ones", () => {
    const small = puffs(cloudPath(200, 60).line);
    const big = puffs(cloudPath(300, 240).line);
    assert.ok(small >= 6);
    assert.ok(big > small);
  });
});
