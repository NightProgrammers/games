import assert from "node:assert/strict";
import test from "node:test";

import { generateDailyLevel, getUnlockedDailyPool } from "../src/daily.js";
import { HANDCRAFTED_LEVELS } from "../src/data.js";
import {
  applyFastener,
  createInitialState,
  createRuntime,
  evaluateFastener,
  findHint,
  solveLevel,
  undoAction,
  validateLevel
} from "../src/engine.js";

test("every handcrafted level validates and has a solution", () => {
  for (const level of HANDCRAFTED_LEVELS) {
    const validation = validateLevel(level);
    assert.equal(validation.ok, true, `${level.id} failed: ${validation.issues.join(" | ")}`);
    assert.equal(validation.solution.ok, true, `${level.id} did not produce a solution.`);
  }
});

test("bands stay blocked until all dependency picks clear", () => {
  const level = HANDCRAFTED_LEVELS.find((entry) => entry.id === "picnic-02");
  const runtime = createRuntime(level);
  const start = createInitialState(level);

  const initialBand = evaluateFastener(level, start, "l2-band-a", runtime);
  assert.equal(initialBand.ok, false);
  assert.equal(initialBand.status, "blocked");

  const afterPick = applyFastener(level, start, "l2-pick-a1", runtime);
  const readyBand = evaluateFastener(level, afterPick, "l2-band-a", runtime);
  assert.equal(readyBand.ok, true);
  assert.equal(readyBand.status, "ready");
});

test("dividers stay covered until they reach the stack mouth", () => {
  const level = HANDCRAFTED_LEVELS.find((entry) => entry.id === "picnic-03");
  const runtime = createRuntime(level);
  const start = createInitialState(level);

  const initialDivider = evaluateFastener(level, start, "l3-divider-a", runtime);
  assert.equal(initialDivider.ok, false);
  assert.equal(initialDivider.status, "covered");

  const afterPick = applyFastener(level, start, "l3-pick-a1", runtime);
  const readyDivider = evaluateFastener(level, afterPick, "l3-divider-a", runtime);
  assert.equal(readyDivider.ok, true);
});

test("undo restores the previous successful state including chain results", () => {
  const level = HANDCRAFTED_LEVELS.find((entry) => entry.id === "picnic-02");
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const afterPick = applyFastener(level, start, "l2-pick-a1", runtime);
  const afterBand = applyFastener(level, afterPick, "l2-band-a", runtime);
  const undone = undoAction(afterBand);

  assert.deepEqual(undone.removedFastenerIds, ["l2-pick-a1"]);
  assert.deepEqual(undone.settledLayerIds, []);
  assert.equal(undone.message, "Last successful removal undone.");
});

test("overflow fail triggers when a freed ingredient has no open slot", () => {
  const level = {
    id: "overflow-fixture",
    kind: "campaign",
    number: 99,
    packId: "picnic-basics",
    title: "Overflow Fixture",
    beat: "Fixture",
    mechanics: [],
    rewardId: "reward-01",
    journalTitle: "Fixture",
    journalCaption: "Fixture",
    compartments: [
      {
        id: "egg-box",
        label: "Tamago Cup",
        acceptedSlots: ["tamago"],
        artSkin: "coral"
      }
    ],
    stacks: [
      {
        id: "of-stack-a",
        laneIndex: 0,
        title: "Overflow A",
        accent: "#c77755",
        exitPosition: "down",
        items: [{ kind: "layer", id: "of-a1" }]
      },
      {
        id: "of-stack-b",
        laneIndex: 1,
        title: "Overflow B",
        accent: "#9c6a4f",
        exitPosition: "down",
        items: [{ kind: "layer", id: "of-b1" }]
      }
    ],
    layers: [
      {
        id: "of-a1",
        kind: "layer",
        ingredientTypeId: "tamago",
        targetCompartmentId: "egg-box",
        blockerIds: ["of-pick-a1"],
        artVariant: "strip",
        stackId: "of-stack-a"
      },
      {
        id: "of-b1",
        kind: "layer",
        ingredientTypeId: "tamago",
        targetCompartmentId: "egg-box",
        blockerIds: ["of-pick-b1"],
        artVariant: "strip",
        stackId: "of-stack-b"
      }
    ],
    fasteners: [
      {
        id: "of-pick-a1",
        type: "pick",
        stackId: "of-stack-a",
        label: "Overflow pick A",
        anchorLayerId: "of-a1",
        controlledLayerIds: ["of-a1"],
        dependencyIds: [],
        overlappingFastenerIds: [],
        visibilityRule: "front-layer-head",
        hitTarget: { width: 56, height: 56 }
      },
      {
        id: "of-pick-b1",
        type: "pick",
        stackId: "of-stack-b",
        label: "Overflow pick B",
        anchorLayerId: "of-b1",
        controlledLayerIds: ["of-b1"],
        dependencyIds: [],
        overlappingFastenerIds: [],
        visibilityRule: "front-layer-head",
        hitTarget: { width: 56, height: 56 }
      }
    ],
    tutorialSteps: []
  };

  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const first = applyFastener(level, start, "of-pick-a1", runtime);
  const second = applyFastener(level, first, "of-pick-b1", runtime);

  assert.equal(second.failed, true);
  assert.equal(second.failKind, "overflow");
  assert.match(second.message, /has no room/);
});

test("jam fail triggers when ingredients remain but no fastener is exposed", () => {
  const level = {
    id: "jam-fixture",
    kind: "campaign",
    number: 100,
    packId: "picnic-basics",
    title: "Jam Fixture",
    beat: "Fixture",
    mechanics: [],
    rewardId: "reward-01",
    journalTitle: "Fixture",
    journalCaption: "Fixture",
    compartments: [
      {
        id: "rice-box",
        label: "Rice Bay",
        acceptedSlots: ["rice"],
        artSkin: "amber"
      },
      {
        id: "egg-box",
        label: "Tamago Cup",
        acceptedSlots: ["tamago", "tamago"],
        artSkin: "coral"
      }
    ],
    stacks: [
      {
        id: "jam-stack-a",
        laneIndex: 0,
        title: "Safe Stack",
        accent: "#c77755",
        exitPosition: "down",
        items: [{ kind: "layer", id: "jam-a1" }]
      },
      {
        id: "jam-stack-b",
        laneIndex: 1,
        title: "Jammed Stack",
        accent: "#9c6a4f",
        exitPosition: "down",
        items: [
          { kind: "layer", id: "jam-b1" },
          { kind: "layer", id: "jam-b2" }
        ]
      }
    ],
    layers: [
      {
        id: "jam-a1",
        kind: "layer",
        ingredientTypeId: "rice",
        targetCompartmentId: "rice-box",
        blockerIds: ["jam-pick-a1"],
        artVariant: "strip",
        stackId: "jam-stack-a"
      },
      {
        id: "jam-b1",
        kind: "layer",
        ingredientTypeId: "tamago",
        targetCompartmentId: "egg-box",
        blockerIds: ["jam-band-b"],
        artVariant: "strip",
        stackId: "jam-stack-b"
      },
      {
        id: "jam-b2",
        kind: "layer",
        ingredientTypeId: "tamago",
        targetCompartmentId: "egg-box",
        blockerIds: ["jam-pick-b2", "jam-band-b"],
        artVariant: "strip",
        stackId: "jam-stack-b"
      }
    ],
    fasteners: [
      {
        id: "jam-pick-a1",
        type: "pick",
        stackId: "jam-stack-a",
        label: "Safe pick",
        anchorLayerId: "jam-a1",
        controlledLayerIds: ["jam-a1"],
        dependencyIds: [],
        overlappingFastenerIds: [],
        visibilityRule: "front-layer-head",
        hitTarget: { width: 56, height: 56 }
      },
      {
        id: "jam-pick-b2",
        type: "pick",
        stackId: "jam-stack-b",
        label: "Hidden pick",
        anchorLayerId: "jam-b2",
        controlledLayerIds: ["jam-b2"],
        dependencyIds: [],
        overlappingFastenerIds: [],
        visibilityRule: "front-layer-head",
        hitTarget: { width: 56, height: 56 }
      },
      {
        id: "jam-band-b",
        type: "band",
        stackId: "jam-stack-b",
        label: "Jammed band",
        anchorLayerId: null,
        controlledLayerIds: ["jam-b1", "jam-b2"],
        dependencyIds: ["jam-pick-b2"],
        overlappingFastenerIds: [],
        visibilityRule: "front-segment-tabs",
        hitTarget: { width: 60, height: 60 }
      }
    ],
    tutorialSteps: []
  };

  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const afterSafePick = applyFastener(level, start, "jam-pick-a1", runtime);

  assert.equal(afterSafePick.failed, true);
  assert.equal(afterSafePick.failKind, "jammed");
  assert.match(afterSafePick.message, /No exposed fasteners remain/);
});

test("hints use a solvable next move", () => {
  const level = HANDCRAFTED_LEVELS.find((entry) => entry.id === "market-10");
  const runtime = createRuntime(level);
  const start = createInitialState(level);
  const hint = findHint(level, start, runtime);
  const solution = solveLevel(level, runtime, start);

  assert.ok(hint.action);
  assert.equal(hint.action.id, solution.sequence[0].id);
  assert.match(hint.message, /Hint:/);
});

test("daily generation is deterministic and uses the unlocked pool", () => {
  const pool = getUnlockedDailyPool(12);
  const first = generateDailyLevel("2026-05-05", { unlockedIngredientIds: pool });
  const second = generateDailyLevel("2026-05-05", { unlockedIngredientIds: pool });

  assert.deepEqual(first, second);
  const validation = validateLevel(first);
  assert.equal(validation.ok, true, validation.issues.join(" | "));
  assert.equal(validation.solution.ok, true);
  assert.ok(first.layers.length >= 9 && first.layers.length <= 10);
  assert.ok(first.stacks.length >= 4 && first.stacks.length <= 5);
  assert.ok(first.compartments.length >= 3 && first.compartments.length <= 4);
  assert.ok(first.layers.every((layer) => pool.includes(layer.ingredientTypeId)));
});
