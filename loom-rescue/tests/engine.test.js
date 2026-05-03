import test from "node:test";
import assert from "node:assert/strict";

import { HANDCRAFTED_LEVELS } from "../src/data.js";
import {
  applyAction,
  createInitialState,
  createRuntime,
  findHint,
  undoAction,
  validateLevel
} from "../src/engine.js";
import { generateDailyLevel } from "../src/daily.js";

test("every handcrafted level validates and solves", () => {
  for (const level of HANDCRAFTED_LEVELS) {
    const validation = validateLevel(level);
    assert.equal(validation.ok, true, `${level.id} failed: ${validation.issues.join(" | ")}`);
    assert.equal(validation.solution.ok, true, `${level.id} did not solve cleanly.`);
  }
});

test("blocked pulls add a knot and explain the blocker locally", () => {
  const level = HANDCRAFTED_LEVELS[2];
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const next = applyAction(level, start, { type: "bundle", id: "A" }, runtime);

  assert.equal(next.knots, 1);
  assert.match(next.message, /snags under Harbor Cord/);
  assert.equal(next.failed, false);
});

test("undo restores removed bundles and knot count", () => {
  const level = HANDCRAFTED_LEVELS[2];
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const first = applyAction(level, start, { type: "bundle", id: "B" }, runtime);
  const second = applyAction(level, first, { type: "bundle", id: "A" }, runtime);
  const undone = undoAction(second);

  assert.deepEqual(undone.removedBundles, ["B"]);
  assert.equal(undone.knots, 0);
  assert.equal(undone.completed, false);
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
});
