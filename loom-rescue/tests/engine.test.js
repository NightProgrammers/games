import test from "node:test";
import assert from "node:assert/strict";

import { HANDCRAFTED_LEVELS, makeCrossing, makePin, pickBundles } from "../src/data.js";
import {
  applyAction,
  createInitialState,
  createRuntime,
  findHint,
  undoAction,
  validateLevel
} from "../src/engine.js";
import { generateDailyLevel } from "../src/daily.js";

test("ftue level authoring matches the gameplay spec progression counts", () => {
  const expected = [
    [2, 0, 0, 0],
    [3, 0, 0, 1],
    [3, 0, 0, 0],
    [3, 1, 0, 0],
    [4, 1, 0, 1],
    [4, 0, 1, 0],
    [4, 0, 1, 1],
    [5, 2, 0, 0],
    [5, 0, 0, 0],
    [5, 2, 1, 1],
    [5, 0, 0, 2],
    [6, 1, 0, 3],
    [6, 0, 0, 3],
    [6, 2, 2, 4],
    [6, 3, 2, 4]
  ];

  HANDCRAFTED_LEVELS.forEach((level, index) => {
    assert.deepEqual(
      [level.bundles.length, level.pins.length, level.guides.length, level.crossings.length],
      expected[index],
      `Unexpected authoring counts for level ${level.number}`
    );
  });
});

test("every handcrafted level validates and solves", () => {
  for (const level of HANDCRAFTED_LEVELS) {
    const validation = validateLevel(level);
    assert.equal(validation.ok, true, `${level.id} failed: ${validation.issues.join(" | ")}`);
    assert.equal(validation.solution.ok, true, `${level.id} did not solve cleanly.`);
  }
});

test("blocked pulls add a knot and explain the blocker locally", () => {
  const level = HANDCRAFTED_LEVELS[1];
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const next = applyAction(level, start, { type: "bundle", id: "A" }, runtime);

  assert.equal(next.knots, 1);
  assert.match(next.message, /snags under Harbor Cord/);
  assert.equal(next.failed, false);
});

test("undo does not refund knots from invalid pulls", () => {
  const level = HANDCRAFTED_LEVELS[1];
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const knotted = applyAction(level, start, { type: "bundle", id: "A" }, runtime);
  const undone = undoAction(knotted);

  assert.equal(knotted.knots, 1);
  assert.equal(undone.knots, 1);
  assert.equal(undone.message, "Nothing to undo yet.");
});

test("undo restores removed bundles and knot count", () => {
  const level = HANDCRAFTED_LEVELS[2];
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const first = applyAction(level, start, { type: "bundle", id: "B" }, runtime);
  const second = applyAction(level, first, { type: "bundle", id: "D" }, runtime);
  const undone = undoAction(second);

  assert.deepEqual(undone.removedBundles, ["B"]);
  assert.equal(undone.knots, 0);
  assert.equal(undone.completed, false);
});

test("deadlock states fail immediately after a successful action", () => {
  const level = {
    id: "deadlock-check",
    kind: "ftue",
    number: 99,
    packId: "coastal-morning",
    title: "Deadlock Check",
    beat: "Custom test fixture",
    mechanics: [],
    board: { cols: 6, rows: 8 },
    failLimit: 3,
    postcard: {
      title: "Fixture",
      caption: "Fixture",
      gradient: ["#fff", "#eee", "#ddd"],
      accent: "#000"
    },
    bundles: pickBundles(["A", "B", "E"]),
    pins: [
      makePin("B", {
        id: "pin-b-deadlock",
        name: "Deadlock pin",
        blocks: ["B"],
        requiresClear: ["A"]
      })
    ],
    guides: [],
    crossings: [makeCrossing("AB", "B", "A")]
  };
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const next = applyAction(level, start, { type: "bundle", id: "E" }, runtime);

  assert.equal(next.failed, true);
  assert.match(next.message, /deadlocks/);
});

test("hint surfaces a legal next action", () => {
  const level = HANDCRAFTED_LEVELS[4];
  const runtime = createRuntime(level);
  const state = createInitialState(level);
  const hint = findHint(level, state, runtime);

  assert.ok(hint.action);
  assert.match(hint.message, /Hint:/);
});

test("daily generation is deterministic and validates", () => {
  const first = generateDailyLevel("2026-05-03");
  const second = generateDailyLevel("2026-05-03");

  assert.deepEqual(first, second);

  const validation = validateLevel(first);
  assert.equal(validation.ok, true, validation.issues.join(" | "));
  assert.equal(validation.solution.ok, true);
  assert.equal(first.pins.length, 2);
  assert.equal(first.guides.length, 2);
  assert.ok(first.crossings.length >= 3 && first.crossings.length <= 4);
  assert.ok(validation.solution.sequence.length >= 7 && validation.solution.sequence.length <= 9);
});
