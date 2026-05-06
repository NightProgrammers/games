import test from "node:test";
import assert from "node:assert/strict";

import { HANDCRAFTED_LEVELS, buildLevelFromPlan } from "../src/data.js";
import {
  applyAction,
  collectLegalActions,
  createInitialState,
  createRuntime,
  evaluateParkAction,
  findHint,
  solveLevel,
  undoAction,
  validateLevel
} from "../src/engine.js";
import { dailySeedFromDate, generateDailyLevel } from "../src/daily.js";

test("handcrafted levels follow the expected clip and target ramp", () => {
  const expected = [
    [0, 6, 3],
    [1, 7, 3],
    [1, 7, 4],
    [1, 8, 4],
    [2, 8, 4],
    [2, 8, 4],
    [2, 8, 4],
    [2, 9, 5],
    [2, 9, 5],
    [3, 10, 5],
    [3, 10, 5],
    [3, 10, 5]
  ];

  HANDCRAFTED_LEVELS.forEach((level, index) => {
    assert.deepEqual(
      [level.clipCount, level.page.targets.length, level.sheets.length],
      expected[index],
      `Unexpected authored counts for level ${level.number}`
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

test("authored pages respect the silhouette overlap cap", () => {
  for (const level of HANDCRAFTED_LEVELS) {
    const overlapIssues = validateLevel(level).issues.filter((issue) => issue.includes("overlap too much"));
    assert.deepEqual(overlapIssues, [], `${level.id} exceeds the overlap cap: ${overlapIssues.join(" | ")}`);
  }
});

test("park becomes the only legal action when an active sheet reveals a blocked sticker", () => {
  const level = HANDCRAFTED_LEVELS[1];
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const firstMove = applyAction(
    level,
    start,
    {
      type: "place",
      sheetId: "A",
      targetId: "t1"
    },
    runtime
  );

  const legal = collectLegalActions(level, firstMove, runtime);
  assert.equal(firstMove.activeSheetId, "A");
  assert.equal(legal.length, 1);
  assert.equal(legal[0].type, "park");
  assert.match(firstMove.message, /waits for an open clip/i);
});

test("parking a sheet enables the next authored line", () => {
  const level = HANDCRAFTED_LEVELS[1];
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const afterPlace = applyAction(level, start, { type: "place", sheetId: "A", targetId: "t1" }, runtime);
  const afterPark = applyAction(level, afterPlace, { type: "park", sheetId: "A" }, runtime);

  assert.equal(afterPark.activeSheetId, null);
  assert.deepEqual(afterPark.clips, ["A"]);
  assert.ok(collectLegalActions(level, afterPark, runtime).some((action) => action.sheetId === "B"));
});

test("undo rewinds successful place and park steps", () => {
  const level = HANDCRAFTED_LEVELS[4];
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const first = applyAction(level, start, { type: "place", sheetId: "A", targetId: "t1" }, runtime);
  const parked = applyAction(level, first, { type: "park", sheetId: "A" }, runtime);
  const undonePark = undoAction(parked);
  const undonePlace = undoAction(undonePark);

  assert.equal(undonePark.activeSheetId, "A");
  assert.equal(undonePlace.activeSheetId, null);
  assert.deepEqual(undonePlace.placedTargets, []);
});

test("overflow fail triggers when a required park has no free clip", () => {
  const level = buildLevelFromPlan({
    id: "overflow-check",
    number: 99,
    packId: "kitchen-keepsakes",
    title: "Overflow Check",
    caption: "Fixture",
    beat: "Fixture",
    clipCount: 0,
    mechanics: [],
    callouts: [],
    reward: { title: "Fixture", detail: "Fixture" },
    layout: ["hero", "center", "lowCenter"],
    motifs: [
      { title: "Base", short: "BASE", paletteId: "coral" },
      { title: "Blocked", short: "BLCK", paletteId: "gold" },
      { title: "Opener", short: "OPEN", paletteId: "sage" }
    ],
    sheets: [
      { id: "A", name: "Fixture A", paletteId: "coral" },
      { id: "B", name: "Fixture B", paletteId: "sage" }
    ],
    solution: ["A", "B", "A"]
  });
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const next = applyAction(level, start, { type: "place", sheetId: "A", targetId: "t1" }, runtime);

  assert.equal(next.failed, true);
  assert.equal(next.failReason, "overflow");
  assert.match(next.message, /binder clip is full|binder clip is full|binder clips are full|needs a clip/i);
});

test("hint returns a legal next action", () => {
  const level = HANDCRAFTED_LEVELS[9];
  const runtime = createRuntime(level);
  const state = createInitialState(level);
  const hint = findHint(level, state, runtime);

  assert.ok(hint.action);
  assert.match(hint.message, /Hint:/);
});

test("daily seed uses UTC formatting and generation is deterministic", () => {
  const seed = dailySeedFromDate(new Date("2026-05-04T16:20:00+08:00"));
  assert.equal(seed, "2026-05-04");

  const first = generateDailyLevel("2026-05-04");
  const second = generateDailyLevel("2026-05-04");
  assert.deepEqual(first, second);

  const validation = validateLevel(first);
  assert.equal(validation.ok, true, validation.issues.join(" | "));
  assert.equal(solveLevel(first).ok, true);
  assert.equal(first.clipCount, 2);
  assert.ok(first.page.targets.length >= 9 && first.page.targets.length <= 10);
});

test("active sheet can always be parked while a clip remains open", () => {
  const level = HANDCRAFTED_LEVELS[4];
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const first = applyAction(level, start, { type: "place", sheetId: "A", targetId: "t1" }, runtime);
  const parkEvaluation = evaluateParkAction(level, first, { type: "park", sheetId: "A" }, runtime);

  assert.equal(parkEvaluation.ok, true);
});
