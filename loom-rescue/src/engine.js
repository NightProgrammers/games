import { BOARD } from "./data.js";

const EDGE_TO_DIRECTION = {
  top: "up",
  right: "right",
  bottom: "down",
  left: "left"
};

const clone = (value) => JSON.parse(JSON.stringify(value));

export const cellKey = (cell) => `${cell.x},${cell.y}`;

export const cellLabel = (cell) =>
  `${String.fromCharCode(65 + cell.x)}${cell.y + 1}`;

export function inferEdge(cell, board = BOARD) {
  if (cell.y === 0) {
    return "top";
  }
  if (cell.y === board.rows - 1) {
    return "bottom";
  }
  if (cell.x === 0) {
    return "left";
  }
  if (cell.x === board.cols - 1) {
    return "right";
  }
  return null;
}

function inferBundleEdge(bundle, board = BOARD) {
  const start = bundle.points[0];
  const next = bundle.points[1];

  if (next) {
    if (start.y === 0 && next.y > start.y) {
      return "top";
    }
    if (start.y === board.rows - 1 && next.y < start.y) {
      return "bottom";
    }
    if (start.x === 0 && next.x > start.x) {
      return "left";
    }
    if (start.x === board.cols - 1 && next.x < start.x) {
      return "right";
    }
  }

  return inferEdge(start, board);
}

export function inferPullDirection(bundle, board = BOARD) {
  const edge = inferBundleEdge(bundle, board);
  if (!edge) {
    throw new Error(`Bundle ${bundle.id} does not start on the board edge.`);
  }
  return EDGE_TO_DIRECTION[edge];
}

export function expandPolyline(points) {
  if (!points.length) {
    return [];
  }

  const cells = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);

    if (dx !== 0 && dy !== 0) {
      throw new Error(
        `Diagonal segment from ${cellLabel(from)} to ${cellLabel(to)} is not supported.`
      );
    }

    const length = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
    for (let step = 0; step <= length; step += 1) {
      const cell = { x: from.x + dx * step, y: from.y + dy * step };
      if (!cells.length || cellKey(cells[cells.length - 1]) !== cellKey(cell)) {
        cells.push(cell);
      }
    }
  }

  if (points.length === 1) {
    return [clone(points[0])];
  }

  return cells;
}

export function createRuntime(level) {
  const board = level.board ?? BOARD;
  const bundles = level.bundles.map((bundle) => ({
    ...clone(bundle),
    cells: expandPolyline(bundle.points),
    pullDirection: inferPullDirection(bundle, board),
    exitEdge: inferBundleEdge(bundle, board)
  }));
  const bundleMap = new Map(bundles.map((bundle) => [bundle.id, bundle]));
  const pathCellSets = new Map(
    bundles.map((bundle) => [bundle.id, new Set(bundle.cells.map(cellKey))])
  );

  const pins = (level.pins ?? []).map(clone);
  const pinMap = new Map(pins.map((pin) => [pin.id, pin]));

  const guides = (level.guides ?? []).map(clone);
  const guidesByBundle = new Map();
  for (const guide of guides) {
    for (const bundleId of guide.bundleIds) {
      const existing = guidesByBundle.get(bundleId) ?? [];
      existing.push(guide);
      guidesByBundle.set(bundleId, existing);
    }
  }

  const crossings = (level.crossings ?? []).map(clone);
  const crossingsByUnder = new Map();
  const crossingsByOver = new Map();
  for (const crossing of crossings) {
    const underList = crossingsByUnder.get(crossing.under) ?? [];
    underList.push(crossing);
    crossingsByUnder.set(crossing.under, underList);

    const overList = crossingsByOver.get(crossing.over) ?? [];
    overList.push(crossing);
    crossingsByOver.set(crossing.over, overList);
  }

  return {
    board,
    bundles,
    bundleMap,
    pathCellSets,
    pins,
    pinMap,
    guides,
    guidesByBundle,
    crossings,
    crossingsByUnder,
    crossingsByOver
  };
}

export function createInitialState(level) {
  return {
    removedBundles: [],
    removedPins: [],
    knots: 0,
    failed: false,
    completed: false,
    message:
      level.beat ?? "Read the exits first, then pull one loose bundle at a time.",
    hintAction: null,
    history: []
  };
}

function snapshotState(state) {
  return {
    removedBundles: [...state.removedBundles],
    removedPins: [...state.removedPins],
    knots: state.knots,
    failed: state.failed,
    completed: state.completed,
    message: state.message,
    hintAction: state.hintAction ? { ...state.hintAction } : null
  };
}

export function isBundleRemoved(state, bundleId) {
  return state.removedBundles.includes(bundleId);
}

export function isPinRemoved(state, pinId) {
  return state.removedPins.includes(pinId);
}

export function getRevealRatio(level, state) {
  if (!level.bundles.length) {
    return 0;
  }
  return state.removedBundles.length / level.bundles.length;
}

export function evaluateBundle(level, state, bundleId, runtime = createRuntime(level)) {
  const bundle = runtime.bundleMap.get(bundleId);
  if (!bundle) {
    return { ok: false, reason: `Unknown bundle ${bundleId}.` };
  }

  if (state.failed || state.completed) {
    return { ok: false, reason: "The level is no longer active." };
  }

  if (isBundleRemoved(state, bundleId)) {
    return { ok: false, reason: `${bundle.name} has already been cleared.` };
  }

  const activePin = runtime.pins.find(
    (pin) => pin.blocks.includes(bundleId) && !isPinRemoved(state, pin.id)
  );
  if (activePin) {
    return {
      ok: false,
      reason: `${bundle.name} is still pinned at ${cellLabel(activePin.cell)}.`
    };
  }

  const blockingCrossing = (runtime.crossingsByUnder.get(bundleId) ?? []).find(
    (crossing) => !isBundleRemoved(state, crossing.over)
  );
  if (blockingCrossing) {
    const blocker = runtime.bundleMap.get(blockingCrossing.over);
    return {
      ok: false,
      reason: `${bundle.name} snags under ${blocker.name} at ${cellLabel(blockingCrossing.cell)}.`
    };
  }

  const badGuide = (runtime.guidesByBundle.get(bundleId) ?? []).find(
    (guide) => guide.direction !== bundle.pullDirection
  );
  if (badGuide) {
    return {
      ok: false,
      reason: `${bundle.name} fights the ${badGuide.name} guide.`
    };
  }

  return {
    ok: true,
    reason: `${bundle.name} can leave toward the ${bundle.pullDirection}.`
  };
}

export function evaluatePin(level, state, pinId, runtime = createRuntime(level)) {
  const pin = runtime.pinMap.get(pinId);
  if (!pin) {
    return { ok: false, reason: `Unknown pin ${pinId}.` };
  }

  if (state.failed || state.completed) {
    return { ok: false, reason: "The level is no longer active." };
  }

  if (isPinRemoved(state, pinId)) {
    return { ok: false, reason: `${pin.name} has already been lifted.` };
  }

  const blockedPresent = pin.blocks.some((bundleId) => !isBundleRemoved(state, bundleId));
  if (!blockedPresent) {
    return { ok: false, reason: `${pin.name} is already irrelevant.` };
  }

  const waitingOn = pin.requiresClear.filter((bundleId) => !isBundleRemoved(state, bundleId));
  if (waitingOn.length) {
    const bundleNames = waitingOn
      .map((bundleId) => runtime.bundleMap.get(bundleId)?.name ?? bundleId)
      .join(", ");
    return {
      ok: false,
      reason: `${pin.name} still catches on ${bundleNames}.`
    };
  }

  return {
    ok: true,
    reason: `${pin.name} can lift now.`
  };
}

function scoreAction(action, state, runtime) {
  if (action.type === "pin") {
    const pin = runtime.pinMap.get(action.id);
    const frees = pin.blocks.filter((bundleId) => !isBundleRemoved(state, bundleId)).length;
    return 20 + frees * 5;
  }

  const uncovers = (runtime.crossingsByOver.get(action.id) ?? []).filter(
    (crossing) => !isBundleRemoved(state, crossing.under)
  ).length;
  return 10 + uncovers * 3;
}

export function collectLegalActions(level, state, runtime = createRuntime(level)) {
  if (state.failed || state.completed) {
    return [];
  }

  const actions = [];

  for (const pin of runtime.pins) {
    const evaluation = evaluatePin(level, state, pin.id, runtime);
    if (evaluation.ok) {
      actions.push({ type: "pin", id: pin.id, score: scoreAction({ type: "pin", id: pin.id }, state, runtime) });
    }
  }

  for (const bundle of runtime.bundles) {
    const evaluation = evaluateBundle(level, state, bundle.id, runtime);
    if (evaluation.ok) {
      actions.push({
        type: "bundle",
        id: bundle.id,
        score: scoreAction({ type: "bundle", id: bundle.id }, state, runtime)
      });
    }
  }

  return actions.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

function finalizeProgress(level, nextState) {
  if (nextState.removedBundles.length === level.bundles.length) {
    nextState.completed = true;
    nextState.failed = false;
  }
  return nextState;
}

export function applyAction(level, state, action, runtime = createRuntime(level)) {
  if (action.type === "pin") {
    const evaluation = evaluatePin(level, state, action.id, runtime);
    if (!evaluation.ok) {
      return {
        ...state,
        message: evaluation.reason,
        hintAction: null
      };
    }

    const pin = runtime.pinMap.get(action.id);
    const nextState = {
      ...state,
      removedPins: [...state.removedPins, action.id],
      history: [...state.history, snapshotState(state)],
      message: `${pin.name} lifts away.`,
      hintAction: null
    };
    return finalizeProgress(level, nextState);
  }

  const evaluation = evaluateBundle(level, state, action.id, runtime);
  const bundle = runtime.bundleMap.get(action.id);

  if (!evaluation.ok) {
    const knots = state.knots + 1;
    const failed = knots >= level.failLimit;
    return {
      ...state,
      knots,
      failed,
      completed: false,
      history: [...state.history, snapshotState(state)],
      hintAction: null,
      message: failed
        ? `${evaluation.reason} Knot ${knots}/${level.failLimit}. The weave locks shut.`
        : `${evaluation.reason} Knot ${knots}/${level.failLimit}.`
    };
  }

  const nextState = finalizeProgress(level, {
    ...state,
    removedBundles: [...state.removedBundles, action.id],
    history: [...state.history, snapshotState(state)],
    hintAction: null,
    message: `${bundle.name} slides free toward the ${bundle.pullDirection}.`
  });

  if (nextState.completed) {
    nextState.message = `${bundle.name} completes the postcard reveal.`;
  }

  return nextState;
}

export function undoAction(state) {
  if (!state.history.length) {
    return {
      ...state,
      message: "Nothing to undo yet.",
      hintAction: null
    };
  }

  const snapshot = state.history[state.history.length - 1];
  return {
    ...clone(snapshot),
    history: state.history.slice(0, -1),
    message: "Last action undone.",
    hintAction: null
  };
}

export function restartLevel(level) {
  return createInitialState(level);
}

export function findHint(level, state, runtime = createRuntime(level)) {
  const candidate = collectLegalActions(level, state, runtime)[0];
  if (!candidate) {
    return {
      action: null,
      message: "No legal move is available from this state."
    };
  }

  if (candidate.type === "pin") {
    const pin = runtime.pinMap.get(candidate.id);
    const blocks = pin.blocks
      .map((bundleId) => runtime.bundleMap.get(bundleId)?.name ?? bundleId)
      .join(", ");
    return {
      action: candidate,
      message: `Hint: lift ${pin.name} to free ${blocks}.`
    };
  }

  const bundle = runtime.bundleMap.get(candidate.id);
  return {
    action: candidate,
    message: `Hint: pull ${bundle.name} toward the ${bundle.pullDirection}.`
  };
}

export function validateLevel(level) {
  const issues = [];
  const runtime = createRuntime(level);

  if (runtime.bundles.length > 6) {
    issues.push("Board exceeds the 6-bundle slice cap.");
  }
  if (runtime.pins.length > 3) {
    issues.push("Board exceeds the 3-pin slice cap.");
  }
  if (runtime.guides.length > 3) {
    issues.push("Board exceeds the 3-guide-cluster slice cap.");
  }
  if (runtime.crossings.length > 4) {
    issues.push("Board exceeds the 4-crossing slice cap.");
  }

  if (level.kind === "daily") {
    if (level.failLimit !== 2) {
      issues.push("Daily levels must use a 2-knot fail meter.");
    }
  } else if (level.failLimit !== 3) {
    issues.push("Standard FTUE levels must use a 3-knot fail meter.");
  }

  const bundleIds = new Set();
  for (const bundle of runtime.bundles) {
    if (bundleIds.has(bundle.id)) {
      issues.push(`Duplicate bundle id ${bundle.id}.`);
    }
    bundleIds.add(bundle.id);

    if (!inferBundleEdge(bundle, runtime.board)) {
      issues.push(`Bundle ${bundle.id} does not start on an edge cell.`);
    }
  }

  const pinIds = new Set();
  for (const pin of runtime.pins) {
    if (pinIds.has(pin.id)) {
      issues.push(`Duplicate pin id ${pin.id}.`);
    }
    pinIds.add(pin.id);

    for (const bundleId of [...pin.blocks, ...pin.requiresClear]) {
      if (!runtime.bundleMap.has(bundleId)) {
        issues.push(`Pin ${pin.id} references unknown bundle ${bundleId}.`);
      }
    }

    const blockedCells = pin.blocks.every((bundleId) =>
      runtime.pathCellSets.get(bundleId)?.has(cellKey(pin.cell))
    );
    if (!blockedCells) {
      issues.push(`Pin ${pin.id} is not placed on all blocked bundle paths.`);
    }
  }

  for (const guide of runtime.guides) {
    for (const bundleId of guide.bundleIds) {
      const bundle = runtime.bundleMap.get(bundleId);
      if (!bundle) {
        issues.push(`Guide ${guide.id} references unknown bundle ${bundleId}.`);
        continue;
      }
      if (guide.direction !== bundle.pullDirection) {
        issues.push(
          `Guide ${guide.id} points ${guide.direction} but bundle ${bundleId} pulls ${bundle.pullDirection}.`
        );
      }
      const pathSet = runtime.pathCellSets.get(bundleId);
      const allCellsOnPath = guide.cells.every((cell) => pathSet?.has(cellKey(cell)));
      if (!allCellsOnPath) {
        issues.push(`Guide ${guide.id} is not aligned with bundle ${bundleId}.`);
      }
    }
  }

  for (const crossing of runtime.crossings) {
    if (!runtime.bundleMap.has(crossing.over) || !runtime.bundleMap.has(crossing.under)) {
      issues.push(`Crossing ${crossing.id} references an unknown bundle.`);
      continue;
    }

    const overPath = runtime.pathCellSets.get(crossing.over);
    const underPath = runtime.pathCellSets.get(crossing.under);
    if (!overPath?.has(cellKey(crossing.cell)) || !underPath?.has(cellKey(crossing.cell))) {
      issues.push(`Crossing ${crossing.id} is not placed on both bundle paths.`);
    }
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

export function solveLevel(level, runtime = createRuntime(level)) {
  let state = createInitialState(level);
  const sequence = [];

  for (let step = 0; step < 40; step += 1) {
    if (state.completed) {
      return { ok: true, sequence };
    }

    const nextAction = collectLegalActions(level, state, runtime)[0];
    if (!nextAction) {
      const remaining = runtime.bundles.filter((bundle) => !isBundleRemoved(state, bundle.id)).length;
      return {
        ok: false,
        sequence,
        reason: `Validator stalled with ${remaining} bundle(s) still on the board.`
      };
    }

    sequence.push(nextAction);
    state = applyAction(level, state, nextAction, runtime);
  }

  return {
    ok: false,
    sequence,
    reason: "Validator exceeded the expected step budget."
  };
}
