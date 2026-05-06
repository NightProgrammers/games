import test from "node:test";
import assert from "node:assert/strict";

import { HANDCRAFTED_LEVELS, DAILY_THEME, buildLevelFromPlan } from "../src/data.js";
import {
  applyAction,
  collectProductiveActions,
  createInitialState,
  createRuntime,
  findHint,
  validateLevel
} from "../src/engine.js";
import { dailySeedFromDate, generateDailyLevel } from "../src/daily.js";

test("handcrafted levels follow the expected stack, row, and cell ramp", () => {
  const expected = [
    [2, 2, 4],
    [2, 2, 5],
    [3, 3, 6],
    [3, 3, 7],
    [3, 3, 8],
    [4, 3, 9],
    [4, 3, 9],
    [4, 3, 10],
    [4, 4, 10],
    [5, 4, 11],
    [5, 4, 12],
    [5, 4, 12]
  ];

  HANDCRAFTED_LEVELS.forEach((level, index) => {
    assert.deepEqual(
      [level.stacks.length, level.tray.rows.length, level.tray.cells.length],
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

test("blocked wax tabs reject taps until the clamp lifts", () => {
  const level = HANDCRAFTED_LEVELS[7];
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const next = applyAction(level, start, { type: "fastener", id: "f-wax" }, runtime);

  assert.deepEqual(next.removedFasteners, []);
  assert.match(next.message, /wax ring is still tucked/i);
});

test("overflow fail triggers when a near cap seals the deeper cells", () => {
  const level = HANDCRAFTED_LEVELS[4];
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const afterNearCap = applyAction(level, start, { type: "fastener", id: "b-clamp" }, runtime);
  const overflow = applyAction(level, afterNearCap, { type: "fastener", id: "a-clamp" }, runtime);

  assert.equal(afterNearCap.failed, false);
  assert.equal(overflow.failed, true);
  assert.equal(overflow.failReason, "overflow");
  assert.match(overflow.message, /Gutter Overflow/i);
});

test("no move fail triggers when only nonproductive fasteners remain", () => {
  const level = buildLevelFromPlan({
    id: "no-move-check",
    number: 99,
    packId: "garden-tiles",
    title: "No Move Check",
    caption: "Fixture",
    beat: "Fixture",
    mechanics: [],
    callouts: [],
    reward: { title: "Fixture", detail: "Fixture" },
    rows: [{ id: "r1", title: "Fixture row", entry: "left", segments: ["A", "B"] }],
    stacks: [
      { id: "bench-a", title: "Bench A", stripIds: ["A"] },
      { id: "bench-b", title: "Bench B", stripIds: ["B"] }
    ],
    strips: [
      {
        id: "A",
        name: "Deep strip",
        paletteId: "sky",
        stackId: "bench-a",
        labels: ["Deep", "Band"],
        fasteners: [
          { id: "a-clamp", type: "clamp", slot: "left", blockedBy: [] },
          {
            id: "a-spacer",
            type: "spacer",
            slot: "mouth",
            blockedBy: ["a-clamp"],
            blockedReason: "The spacer tail is still tucked behind the lifted clamp."
          }
        ]
      },
      {
        id: "B",
        name: "Near cap",
        paletteId: "cream",
        stackId: "bench-b",
        labels: ["Cap"],
        fasteners: [{ id: "b-clamp", type: "clamp", slot: "right", blockedBy: [] }]
      }
    ]
  });
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const productive = collectProductiveActions(level, start, runtime);
  const next = applyAction(level, start, { type: "fastener", id: "b-clamp" }, runtime);

  assert.equal(productive.length, 1);
  assert.equal(next.failed, true);
  assert.equal(next.failReason, "no_move");
  assert.match(next.message, /No productive releases remain/i);
});

test("hint returns the next solvable fastener", () => {
  const level = HANDCRAFTED_LEVELS[9];
  const runtime = createRuntime(level);
  const hint = findHint(level, createInitialState(level), runtime);

  assert.ok(hint.action);
  assert.match(hint.message, /Hint:/);
});

test("daily seed uses UTC formatting and generation is deterministic", () => {
  const seed = dailySeedFromDate(new Date("2026-05-04T16:20:00+08:00"));
  assert.equal(seed, "2026-05-04");

  const first = generateDailyLevel("2026-05-04");
  const second = generateDailyLevel("2026-05-04");
  assert.deepEqual(first, second);
  assert.equal(first.packId, DAILY_THEME.id);

  const validation = validateLevel(first);
  assert.equal(validation.ok, true, validation.issues.join(" | "));
  assert.equal(validation.solution.ok, true);
  assert.ok(first.stacks.length >= 4 && first.stacks.length <= 5);
  assert.ok(first.tray.cells.length >= 10 && first.tray.cells.length <= 12);
  assert.ok(validation.solution.sequence.length >= 6 && validation.solution.sequence.length <= 8);
});
