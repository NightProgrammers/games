import { INGREDIENT_TYPES, getRewardById } from "./data.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

const FASTENER_PRIORITY = {
  band: 3,
  divider: 2,
  pick: 1
};

const arraysEqual = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

function createFilledSlots(level) {
  return Object.fromEntries(
    level.compartments.map((compartment) => [
      compartment.id,
      Array.from({ length: compartment.acceptedSlots.length }, () => null)
    ])
  );
}

function snapshotState(state) {
  return {
    removedFastenerIds: [...state.removedFastenerIds],
    settledLayerIds: [...state.settledLayerIds],
    filledSlots: clone(state.filledSlots),
    failed: state.failed,
    failKind: state.failKind,
    completed: state.completed,
    message: state.message
  };
}

export function createRuntime(level) {
  const stackMap = new Map(level.stacks.map((stack) => [stack.id, stack]));
  const layerMap = new Map(level.layers.map((layer) => [layer.id, layer]));
  const fastenerMap = new Map(level.fasteners.map((fastener) => [fastener.id, fastener]));
  const compartmentMap = new Map(level.compartments.map((compartment) => [compartment.id, compartment]));
  const fastenersByStack = new Map();
  const fastenersByLayer = new Map();

  for (const fastener of level.fasteners) {
    const stackFasteners = fastenersByStack.get(fastener.stackId) ?? [];
    stackFasteners.push(fastener);
    fastenersByStack.set(fastener.stackId, stackFasteners);

    for (const layerId of fastener.controlledLayerIds) {
      const layerFasteners = fastenersByLayer.get(layerId) ?? [];
      layerFasteners.push(fastener.id);
      fastenersByLayer.set(layerId, layerFasteners);
    }
  }

  return {
    stackMap,
    layerMap,
    fastenerMap,
    compartmentMap,
    fastenersByStack,
    fastenersByLayer
  };
}

export function createInitialState(level) {
  return {
    removedFastenerIds: [],
    settledLayerIds: [],
    filledSlots: createFilledSlots(level),
    failed: false,
    failKind: null,
    completed: false,
    message: level.beat,
    hintAction: null,
    history: [],
    lastResolution: null,
    feedback: null,
    feedbackSeq: 0
  };
}

export function isFastenerRemoved(state, fastenerId) {
  return state.removedFastenerIds.includes(fastenerId);
}

export function isLayerSettled(state, layerId) {
  return state.settledLayerIds.includes(layerId);
}

function getRemainingItems(stack, state) {
  return stack.items.filter((item) => {
    if (item.kind === "divider") {
      return !isFastenerRemoved(state, item.id);
    }
    return !isLayerSettled(state, item.id);
  });
}

export function getRemainingItemsForStack(level, state, stackId, runtime = createRuntime(level)) {
  const stack = runtime.stackMap.get(stackId);
  return stack ? getRemainingItems(stack, state) : [];
}

function getFrontItem(stack, state) {
  return getRemainingItems(stack, state)[0] ?? null;
}

function getFrontSegmentLayerIds(stack, state) {
  const result = [];
  for (const item of getRemainingItems(stack, state)) {
    if (item.kind === "divider") {
      break;
    }
    result.push(item.id);
  }
  return result;
}

function findLayerPositionInStack(stack, layerId) {
  return stack.items.findIndex((item) => item.kind === "layer" && item.id === layerId);
}

function getVisibleLayerViews(stack, state, runtime, limit = 3) {
  const visible = [];
  for (const item of getRemainingItems(stack, state)) {
    if (item.kind === "layer") {
      visible.push(runtime.layerMap.get(item.id));
    }
    if (visible.length === limit) {
      break;
    }
  }
  return visible;
}

function nextOpenSlotIndex(compartment, filledSlots, ingredientTypeId) {
  for (let index = 0; index < compartment.acceptedSlots.length; index += 1) {
    if (!filledSlots[index] && compartment.acceptedSlots[index] === ingredientTypeId) {
      return index;
    }
  }
  return -1;
}

function stateSignature(state) {
  const removed = [...state.removedFastenerIds].sort().join(",");
  const settled = [...state.settledLayerIds].sort().join(",");
  return `${removed}|${settled}`;
}

function feedback(state, fastenerId, outcome, message) {
  return {
    ...state,
    hintAction: null,
    lastResolution: null,
    feedbackSeq: state.feedbackSeq + 1,
    feedback: {
      fastenerId,
      outcome,
      message,
      seq: state.feedbackSeq + 1
    },
    message
  };
}

function frontLayerReason() {
  return "Pick head is still covered by the front layer.";
}

function bandCoverReason() {
  return "Band tabs are not fully exposed yet.";
}

function dividerCoverReason() {
  return "Divider tab is not exposed at the stack mouth yet.";
}

function pickInsideBandReason() {
  return "A band still crosses that pick head.";
}

function bandDependencyReason() {
  return "A pick still pins the banded layers.";
}

export function evaluateFastener(level, state, fastenerId, runtime = createRuntime(level)) {
  const fastener = runtime.fastenerMap.get(fastenerId);
  if (!fastener) {
    return { ok: false, status: "missing", reason: `Unknown fastener ${fastenerId}.` };
  }

  if (state.failed || state.completed) {
    return { ok: false, status: "inactive", reason: "The lunch order is no longer active." };
  }

  if (isFastenerRemoved(state, fastener.id)) {
    return { ok: false, status: "spent", reason: `${fastener.label} has already been removed.` };
  }

  const stack = runtime.stackMap.get(fastener.stackId);
  if (!stack) {
    return { ok: false, status: "missing", reason: `Unknown stack ${fastener.stackId}.` };
  }

  if (fastener.type === "divider") {
    const frontItem = getFrontItem(stack, state);
    if (!frontItem || frontItem.kind !== "divider" || frontItem.id !== fastener.id) {
      return { ok: false, status: "covered", reason: dividerCoverReason() };
    }
    return { ok: true, status: "ready", reason: `${fastener.label} can lift now.` };
  }

  if (fastener.type === "pick") {
    const layer = runtime.layerMap.get(fastener.anchorLayerId);
    if (!layer || isLayerSettled(state, layer.id)) {
      return { ok: false, status: "spent", reason: `${fastener.label} no longer matters.` };
    }

    const frontItem = getFrontItem(stack, state);
    if (!frontItem || frontItem.kind !== "layer" || frontItem.id !== layer.id) {
      return { ok: false, status: "covered", reason: frontLayerReason() };
    }

    const blockingBand = fastener.overlappingFastenerIds.find((id) => !isFastenerRemoved(state, id));
    if (blockingBand) {
      return { ok: false, status: "blocked", reason: pickInsideBandReason() };
    }

    return { ok: true, status: "ready", reason: `${fastener.label} can lift now.` };
  }

  const controlledLayerIds = fastener.controlledLayerIds.filter((layerId) => !isLayerSettled(state, layerId));
  const frontSegment = getFrontSegmentLayerIds(stack, state);
  const visiblePrefix = frontSegment.slice(0, controlledLayerIds.length);

  if (!controlledLayerIds.length) {
    return { ok: false, status: "spent", reason: `${fastener.label} no longer matters.` };
  }

  if (!arraysEqual(controlledLayerIds, visiblePrefix)) {
    return { ok: false, status: "covered", reason: bandCoverReason() };
  }

  const blockingPick = fastener.dependencyIds.find((id) => !isFastenerRemoved(state, id));
  if (blockingPick) {
    return { ok: false, status: "blocked", reason: bandDependencyReason() };
  }

  return { ok: true, status: "ready", reason: `${fastener.label} can snap away.` };
}

function simulateChain(level, state, stackId, runtime) {
  const stack = runtime.stackMap.get(stackId);
  const nextState = {
    ...state,
    filledSlots: clone(state.filledSlots),
    settledLayerIds: [...state.settledLayerIds]
  };
  const chainLayerIds = [];
  const chainCompartmentIds = [];

  while (true) {
    const frontItem = getFrontItem(stack, nextState);
    if (!frontItem || frontItem.kind === "divider") {
      break;
    }

    const layer = runtime.layerMap.get(frontItem.id);
    const activeBlocker = layer.blockerIds.find((blockerId) => !isFastenerRemoved(nextState, blockerId));
    if (activeBlocker) {
      break;
    }

    const compartment = runtime.compartmentMap.get(layer.targetCompartmentId);
    const slotIndex = nextOpenSlotIndex(compartment, nextState.filledSlots[compartment.id], layer.ingredientTypeId);
    if (slotIndex === -1) {
      return {
        ok: false,
        failKind: "overflow",
        state: nextState,
        chainLayerIds,
        chainCompartmentIds,
        layerId: layer.id,
        compartmentId: compartment.id
      };
    }

    nextState.filledSlots[compartment.id][slotIndex] = layer.id;
    nextState.settledLayerIds.push(layer.id);
    chainLayerIds.push(layer.id);
    chainCompartmentIds.push(compartment.id);
  }

  return {
    ok: true,
    state: nextState,
    chainLayerIds,
    chainCompartmentIds
  };
}

function countRemainingLayers(level, state) {
  return level.layers.filter((layer) => !isLayerSettled(state, layer.id)).length;
}

function actionScore(level, state, fastener, runtime) {
  let score = FASTENER_PRIORITY[fastener.type] * 10;
  if (fastener.type === "band") {
    score += fastener.controlledLayerIds.length * 4;
  }
  if (fastener.type === "divider") {
    const stack = runtime.stackMap.get(fastener.stackId);
    score += getRemainingItems(stack, state).length;
  }
  if (fastener.type === "pick") {
    const stack = runtime.stackMap.get(fastener.stackId);
    const position = findLayerPositionInStack(stack, fastener.anchorLayerId);
    score += Math.max(0, 5 - position);
  }
  return score;
}

export function collectReadyFasteners(level, state, runtime = createRuntime(level)) {
  if (state.failed || state.completed) {
    return [];
  }

  return level.fasteners
    .map((fastener) => {
      const evaluation = evaluateFastener(level, state, fastener.id, runtime);
      return {
        id: fastener.id,
        type: fastener.type,
        label: fastener.label,
        evaluation,
        score: actionScore(level, state, fastener, runtime)
      };
    })
    .filter((entry) => entry.evaluation.ok)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

function finishState(level, state, runtime, fastenerId, chainLayerIds, chainCompartmentIds) {
  const nextState = {
    ...state,
    hintAction: null,
    lastResolution: {
      fastenerId,
      chainLayerIds,
      chainCompartmentIds
    },
    feedbackSeq: state.feedbackSeq + 1,
    feedback: {
      fastenerId,
      outcome: "valid",
      message: state.message,
      seq: state.feedbackSeq + 1
    }
  };

  if (nextState.settledLayerIds.length === level.layers.length) {
    return {
      ...nextState,
      completed: true,
      failed: false,
      failKind: null,
      message: "Lunch packed. Every recipe slot is filled."
    };
  }

  if (!collectReadyFasteners(level, nextState, runtime).length && countRemainingLayers(level, nextState) > 0) {
    return {
      ...nextState,
      failed: true,
      completed: false,
      failKind: "jammed",
      message: "No exposed fasteners remain. The lunch jams shut."
    };
  }

  return nextState;
}

export function applyFastener(level, state, fastenerId, runtime = createRuntime(level)) {
  const evaluation = evaluateFastener(level, state, fastenerId, runtime);
  const fastener = runtime.fastenerMap.get(fastenerId);

  if (!fastener) {
    return feedback(state, fastenerId, "invalid", `Unknown fastener ${fastenerId}.`);
  }

  if (!evaluation.ok) {
    return feedback(state, fastenerId, "invalid", evaluation.reason);
  }

  const stagedState = {
    ...state,
    removedFastenerIds: [...state.removedFastenerIds, fastenerId],
    history: [...state.history, snapshotState(state)],
    message: `${fastener.label} comes away.`,
    filledSlots: clone(state.filledSlots),
    settledLayerIds: [...state.settledLayerIds]
  };

  const resolved = simulateChain(level, stagedState, fastener.stackId, runtime);
  if (!resolved.ok) {
    const layer = runtime.layerMap.get(resolved.layerId);
    const ingredient = INGREDIENT_TYPES[layer.ingredientTypeId];
    const compartment = runtime.compartmentMap.get(resolved.compartmentId);
    return {
      ...stagedState,
      filledSlots: resolved.state.filledSlots,
      settledLayerIds: resolved.state.settledLayerIds,
      failed: true,
      completed: false,
      failKind: "overflow",
      hintAction: null,
      feedbackSeq: state.feedbackSeq + 1,
      feedback: {
        fastenerId,
        outcome: "fail",
        message: `${ingredient.family} has no room in ${compartment.label}.`,
        seq: state.feedbackSeq + 1
      },
      lastResolution: {
        fastenerId,
        chainLayerIds: resolved.chainLayerIds,
        chainCompartmentIds: resolved.chainCompartmentIds
      },
      message: `${ingredient.family} has no room in ${compartment.label}.`
    };
  }

  const chainCount = resolved.chainLayerIds.length;
  const message =
    chainCount > 1
      ? `${fastener.label} frees a ${chainCount}-ingredient slide chain.`
      : chainCount === 1
        ? `${fastener.label} frees one clean slide.`
        : `${fastener.label} clears the blocker, but this stack still holds.`;

  return finishState(
    level,
    {
      ...stagedState,
      filledSlots: resolved.state.filledSlots,
      settledLayerIds: resolved.state.settledLayerIds,
      message
    },
    runtime,
    fastenerId,
    resolved.chainLayerIds,
    resolved.chainCompartmentIds
  );
}

export function undoAction(state) {
  if (!state.history.length) {
    return {
      ...state,
      hintAction: null,
      lastResolution: null,
      feedbackSeq: state.feedbackSeq + 1,
      feedback: {
        fastenerId: null,
        outcome: "invalid",
        message: "Nothing to undo yet.",
        seq: state.feedbackSeq + 1
      },
      message: "Nothing to undo yet."
    };
  }

  const snapshot = state.history[state.history.length - 1];
  return {
    ...clone(snapshot),
    history: state.history.slice(0, -1),
    hintAction: null,
    lastResolution: null,
    feedbackSeq: state.feedbackSeq + 1,
    feedback: {
      fastenerId: null,
      outcome: "valid",
      message: "Last successful removal undone.",
      seq: state.feedbackSeq + 1
    },
    message: "Last successful removal undone."
  };
}

export function restartLevel(level) {
  return createInitialState(level);
}

export function solveLevel(level, runtime = createRuntime(level), fromState = createInitialState(level)) {
  const seen = new Set();

  function search(state) {
    if (state.completed) {
      return [];
    }
    if (state.failed) {
      return null;
    }

    const signature = stateSignature(state);
    if (seen.has(signature)) {
      return null;
    }
    seen.add(signature);

    const actions = collectReadyFasteners(level, state, runtime);
    for (const action of actions) {
      const next = applyFastener(level, state, action.id, runtime);
      const suffix = search(next);
      if (suffix) {
        return [action, ...suffix];
      }
    }

    return null;
  }

  const sequence = search(fromState);
  if (!sequence) {
    return {
      ok: false,
      sequence: [],
      reason: fromState.failed ? fromState.message : "No solution path was found."
    };
  }

  return {
    ok: true,
    sequence
  };
}

export function findHint(level, state, runtime = createRuntime(level)) {
  if (state.failed || state.completed) {
    return {
      action: null,
      message: "This order is not currently playable."
    };
  }

  const solution = solveLevel(level, runtime, state);
  if (!solution.ok || !solution.sequence.length) {
    const fallback = collectReadyFasteners(level, state, runtime)[0] ?? null;
    if (!fallback) {
      return {
        action: null,
        message: "No legal fastener is exposed from this state."
      };
    }

    return {
      action: { id: fallback.id, type: fallback.type },
      message: `Hint: remove ${fallback.label}.`
    };
  }

  const [action] = solution.sequence;
  const fastener = runtime.fastenerMap.get(action.id);
  const preview = applyFastener(level, state, action.id, runtime);
  const chainCount = preview.lastResolution?.chainLayerIds.length ?? 0;

  return {
    action: { id: action.id, type: action.type },
    message:
      chainCount > 1
        ? `Hint: remove ${fastener.label} to release a ${chainCount}-ingredient chain.`
        : `Hint: remove ${fastener.label}.`
  };
}

export function getCompletionRatio(level, state) {
  if (!level.layers.length) {
    return 0;
  }
  return state.settledLayerIds.length / level.layers.length;
}

export function getCompartmentStates(level, state, runtime = createRuntime(level)) {
  return level.compartments.map((compartment) => {
    const filledSlots = state.filledSlots[compartment.id];
    const remaining = filledSlots.filter((slot) => !slot).length;
    return {
      ...compartment,
      filledSlots,
      filledCount: filledSlots.filter(Boolean).length,
      remainingCount: remaining,
      highlighted: state.lastResolution?.chainCompartmentIds.includes(compartment.id) ?? false
    };
  });
}

function buildFastenerView(level, state, stack, runtime, visibleLayerIds) {
  const activeFasteners = (runtime.fastenersByStack.get(stack.id) ?? [])
    .filter((fastener) => !isFastenerRemoved(state, fastener.id))
    .map((fastener) => {
      const evaluation = evaluateFastener(level, state, fastener.id, runtime);
      let anchorLayerId = fastener.anchorLayerId ?? fastener.controlledLayerIds[0] ?? null;
      let visible = true;
      let anchorDepth = 0;

      if (fastener.type === "divider") {
        const frontItem = getFrontItem(stack, state);
        visible = frontItem?.kind === "divider" && frontItem.id === fastener.id;
        anchorDepth = -0.35;
      } else if (anchorLayerId) {
        anchorDepth = visibleLayerIds.indexOf(anchorLayerId);
        visible = anchorDepth !== -1;
      }

      return {
        ...fastener,
        status: evaluation.status,
        reason: evaluation.reason,
        visible,
        anchorDepth,
        highlighted:
          state.hintAction?.id === fastener.id ||
          state.lastResolution?.fastenerId === fastener.id
      };
    })
    .filter((fastener) => fastener.visible)
    .sort((left, right) => left.anchorDepth - right.anchorDepth || left.id.localeCompare(right.id));

  return activeFasteners;
}

export function buildBoardView(level, state, runtime = createRuntime(level)) {
  const compartments = getCompartmentStates(level, state, runtime);
  const stacks = level.stacks.map((stack) => {
    const visibleLayers = getVisibleLayerViews(stack, state, runtime, 3);
    const visibleLayerIds = visibleLayers.map((layer) => layer.id);
    const remainingItems = getRemainingItems(stack, state);
    const layerCount = remainingItems.filter((item) => item.kind === "layer").length;
    const frontItem = remainingItems[0] ?? null;

    return {
      ...stack,
      visibleLayers: visibleLayers.map((layerDefinition, index) => ({
        ...layerDefinition,
        ingredient: INGREDIENT_TYPES[layerDefinition.ingredientTypeId],
        depth: index,
        isFront: index === 0 && frontItem?.kind === "layer" && frontItem.id === layerDefinition.id,
        highlighted: state.lastResolution?.chainLayerIds.includes(layerDefinition.id) ?? false,
        remainingBlockers: layerDefinition.blockerIds.filter(
          (blockerId) => !isFastenerRemoved(state, blockerId)
        )
      })),
      compressedCount: Math.max(0, layerCount - visibleLayers.length),
      frontDividerId: frontItem?.kind === "divider" ? frontItem.id : null,
      fasteners: buildFastenerView(level, state, stack, runtime, visibleLayerIds)
    };
  });

  return {
    compartments,
    stacks,
    readyFasteners: collectReadyFasteners(level, state, runtime)
  };
}

export function validateLevel(level) {
  const runtime = createRuntime(level);
  const issues = [];

  if (level.kind === "campaign") {
    if (level.stacks.length < 2 || level.stacks.length > 5) {
      issues.push("Campaign levels must author 2 to 5 stacks.");
    }
    if (level.compartments.length < 2 || level.compartments.length > 4) {
      issues.push("Campaign levels must author 2 to 4 compartments.");
    }
    if (level.layers.length < 4 || level.layers.length > 11) {
      issues.push("Campaign levels must author 4 to 11 ingredients.");
    }
  } else {
    if (level.stacks.length < 4 || level.stacks.length > 5) {
      issues.push("Daily levels should author 4 to 5 stacks.");
    }
    if (level.compartments.length < 3 || level.compartments.length > 4) {
      issues.push("Daily levels should author 3 to 4 compartments.");
    }
    if (level.layers.length < 9 || level.layers.length > 10) {
      issues.push("Daily levels should author 9 to 10 ingredients.");
    }
  }

  if (!getRewardById(level.rewardId ?? "reward-daily") && level.kind === "campaign") {
    issues.push(`Missing reward definition for ${level.rewardId}.`);
  }

  const stackIds = new Set();
  const layerIds = new Set();
  const fastenerIds = new Set();
  const compartmentIds = new Set();

  for (const stack of level.stacks) {
    if (stackIds.has(stack.id)) {
      issues.push(`Duplicate stack id ${stack.id}.`);
    }
    stackIds.add(stack.id);
  }

  for (const layer of level.layers) {
    if (layerIds.has(layer.id)) {
      issues.push(`Duplicate layer id ${layer.id}.`);
    }
    layerIds.add(layer.id);
    if (!runtime.compartmentMap.has(layer.targetCompartmentId)) {
      issues.push(`Layer ${layer.id} targets unknown compartment ${layer.targetCompartmentId}.`);
    }
    if (!INGREDIENT_TYPES[layer.ingredientTypeId] && !["A", "B", "C", "D"].includes(layer.ingredientTypeId)) {
      issues.push(`Layer ${layer.id} uses unknown ingredient ${layer.ingredientTypeId}.`);
    }
  }

  for (const compartment of level.compartments) {
    if (compartmentIds.has(compartment.id)) {
      issues.push(`Duplicate compartment id ${compartment.id}.`);
    }
    compartmentIds.add(compartment.id);
  }

  for (const fastener of level.fasteners) {
    if (fastenerIds.has(fastener.id)) {
      issues.push(`Duplicate fastener id ${fastener.id}.`);
    }
    fastenerIds.add(fastener.id);
    if (!runtime.stackMap.has(fastener.stackId)) {
      issues.push(`Fastener ${fastener.id} uses unknown stack ${fastener.stackId}.`);
    }

    for (const layerId of fastener.controlledLayerIds) {
      if (!runtime.layerMap.has(layerId)) {
        issues.push(`Fastener ${fastener.id} references unknown layer ${layerId}.`);
      }
    }

    for (const dependencyId of fastener.dependencyIds) {
      if (!runtime.fastenerMap.has(dependencyId)) {
        issues.push(`Fastener ${fastener.id} depends on unknown fastener ${dependencyId}.`);
      }
    }

    if (fastener.type === "pick" && !runtime.layerMap.has(fastener.anchorLayerId)) {
      issues.push(`Pick ${fastener.id} references unknown anchor layer ${fastener.anchorLayerId}.`);
    }

    if (fastener.type === "band") {
      if (fastener.controlledLayerIds.length < 1 || fastener.controlledLayerIds.length > 3) {
        issues.push(`Band ${fastener.id} must wrap 1 to 3 layers.`);
      }

      const stack = runtime.stackMap.get(fastener.stackId);
      const positions = fastener.controlledLayerIds.map((layerId) => findLayerPositionInStack(stack, layerId));
      const contiguous = positions.every(
        (position, index) => index === 0 || position === positions[index - 1] + 1
      );
      if (!contiguous) {
        issues.push(`Band ${fastener.id} must wrap consecutive layers in its stack.`);
      }
    }

    if (fastener.type === "divider") {
      const stack = runtime.stackMap.get(fastener.stackId);
      const dividerExists = stack.items.some((item) => item.kind === "divider" && item.id === fastener.id);
      if (!dividerExists) {
        issues.push(`Divider ${fastener.id} does not match a divider item in ${fastener.stackId}.`);
      }
    }
  }

  for (const layer of level.layers) {
    for (const blockerId of layer.blockerIds) {
      if (!runtime.fastenerMap.has(blockerId)) {
        issues.push(`Layer ${layer.id} references unknown blocker ${blockerId}.`);
      }
    }
  }

  for (const compartment of level.compartments) {
    const expected = compartment.acceptedSlots.length;
    const authored = level.layers.filter((layer) => layer.targetCompartmentId === compartment.id).length;
    if (expected !== authored) {
      issues.push(
        `Compartment ${compartment.id} expects ${expected} ingredient(s) but ${authored} layer(s) target it.`
      );
    }
  }

  const openingState = createInitialState(level);
  if (!collectReadyFasteners(level, openingState, runtime).length) {
    issues.push("Level starts with no exposed legal fasteners.");
  }

  for (const step of level.tutorialSteps ?? []) {
    for (const id of step.highlightedIds) {
      if (
        !runtime.fastenerMap.has(id) &&
        !runtime.layerMap.has(id) &&
        !runtime.compartmentMap.has(id)
      ) {
        issues.push(`Tutorial step ${step.id} highlights unknown id ${id}.`);
      }
    }
  }

  const families = new Set(level.layers.map((layer) => layer.ingredientTypeId));
  if (families.size > 5 && level.kind === "campaign") {
    issues.push("Levels should limit visible ingredient families to 5.");
  }

  const solution = solveLevel(level, runtime);
  if (!solution.ok) {
    issues.push(solution.reason);
  }

  return {
    ok: issues.length === 0,
    issues,
    solution
  };
}
