const clone = (value) => JSON.parse(JSON.stringify(value));

function snapshotState(state) {
  return {
    removedFasteners: [...state.removedFasteners],
    resolvedStrips: [...state.resolvedStrips],
    filledCells: [...state.filledCells],
    failed: state.failed,
    completed: state.completed,
    failReason: state.failReason,
    message: state.message,
    hintAction: state.hintAction ? { ...state.hintAction } : null,
    lastEvent: state.lastEvent ? clone(state.lastEvent) : null
  };
}

export function createRuntime(level) {
  const rows = level.tray.rows.map((row) => clone(row));
  const cells = level.tray.cells.map((cell) => clone(cell));
  const strips = level.strips.map((strip) => clone(strip));
  const fasteners = level.fasteners.map((fastener) => clone(fastener));
  const stacks = level.stacks.map((stack) => clone(stack));

  return {
    level,
    rows,
    rowMap: new Map(rows.map((row) => [row.id, row])),
    cells,
    cellMap: new Map(cells.map((cell) => [cell.id, cell])),
    strips,
    stripMap: new Map(strips.map((strip) => [strip.id, strip])),
    fasteners,
    fastenerMap: new Map(fasteners.map((fastener) => [fastener.id, fastener])),
    stacks,
    stackMap: new Map(stacks.map((stack) => [stack.id, stack])),
    fastenersByStrip: new Map(
      strips.map((strip) => [
        strip.id,
        fasteners.filter((fastener) => fastener.stripId === strip.id)
      ])
    ),
    totalCells: cells.length
  };
}

export function createInitialState(level) {
  return {
    removedFasteners: [],
    resolvedStrips: [],
    filledCells: [],
    failed: false,
    completed: false,
    failReason: null,
    message: level.beat,
    hintAction: null,
    lastEvent: { type: "start" },
    history: []
  };
}

export function isFastenerRemoved(state, fastenerId) {
  return state.removedFasteners.includes(fastenerId);
}

export function isStripResolved(state, stripId) {
  return state.resolvedStrips.includes(stripId);
}

export function getFillRatio(level, state, runtime = createRuntime(level)) {
  if (!runtime.totalCells) {
    return 0;
  }
  return state.filledCells.length / runtime.totalCells;
}

export function getFrontStrip(runtime, state, stackId) {
  const stack = runtime.stackMap.get(stackId);
  if (!stack) {
    return null;
  }

  const frontId = stack.stripIds.find((stripId) => !isStripResolved(state, stripId));
  return frontId ? runtime.stripMap.get(frontId) ?? null : null;
}

export function getFrontStripIds(level, state, runtime = createRuntime(level)) {
  return runtime.stacks
    .map((stack) => getFrontStrip(runtime, state, stack.id)?.id ?? null)
    .filter(Boolean);
}

function defaultBlockedReason(fastener, strip) {
  if (fastener.type === "wax") {
    return `${strip.name} still tucks the wax ring under another layer.`;
  }
  if (fastener.type === "spacer") {
    return `${strip.name} still hides the spacer tail at the row mouth.`;
  }
  return `${strip.name} is still covered by another strip edge.`;
}

function defaultHiddenReason(fastener, strip) {
  if (fastener.type === "spacer") {
    return `${strip.name} has not reached the row mouth yet.`;
  }
  if (fastener.type === "wax") {
    return `${strip.name} is still tucked behind the front strip.`;
  }
  return `${strip.name} is still behind another strip.`;
}

function blockersForStrip(strip, state) {
  return strip.blockerIds.filter((fastenerId) => !isFastenerRemoved(state, fastenerId));
}

function remainingBlockerLabel(runtime, blockerId) {
  const fastener = runtime.fastenerMap.get(blockerId);
  if (!fastener) {
    return "another fastener";
  }

  if (fastener.type === "wax") {
    return "wax tab";
  }
  if (fastener.type === "spacer") {
    return "paper spacer";
  }
  return "clamp";
}

function getFastenerRenderState(level, state, fastenerId, runtime = createRuntime(level)) {
  const fastener = runtime.fastenerMap.get(fastenerId);
  if (!fastener) {
    return {
      fastener: null,
      strip: null,
      visible: false,
      removable: false,
      reason: `Unknown fastener ${fastenerId}.`
    };
  }

  const strip = runtime.stripMap.get(fastener.stripId);
  if (!strip) {
    return {
      fastener,
      strip: null,
      visible: false,
      removable: false,
      reason: `Fastener ${fastenerId} has no strip.`
    };
  }

  if (isStripResolved(state, strip.id) || isFastenerRemoved(state, fastenerId)) {
    return {
      fastener,
      strip,
      visible: false,
      removable: false,
      reason: `${strip.name} has already cleared.`
    };
  }

  const frontStrip = getFrontStrip(runtime, state, strip.stackId);
  if (!frontStrip || frontStrip.id !== strip.id) {
    return {
      fastener,
      strip,
      visible: false,
      removable: false,
      reason: defaultHiddenReason(fastener, strip)
    };
  }

  const blockingFastener = fastener.blockedBy.find((candidateId) => !isFastenerRemoved(state, candidateId));
  if (blockingFastener) {
    return {
      fastener,
      strip,
      visible: true,
      removable: false,
      reason: fastener.blockedReason ?? defaultBlockedReason(fastener, strip)
    };
  }

  return {
    fastener,
    strip,
    visible: true,
    removable: true,
    reason: `${strip.name} is exposed.`
  };
}

export function collectVisibleFasteners(level, state, runtime = createRuntime(level)) {
  return runtime.fasteners
    .map((fastener) => getFastenerRenderState(level, state, fastener.id, runtime))
    .filter((entry) => entry.visible);
}

function pathForStrip(strip, runtime) {
  const row = runtime.rowMap.get(strip.rowId);
  if (!row) {
    return {
      ok: false,
      reason: `Unknown row ${strip.rowId}.`,
      row: null,
      pathCellIds: []
    };
  }

  const indices = strip.targetCellIds.map((cellId) => row.cellIds.indexOf(cellId));
  if (indices.some((index) => index < 0)) {
    return {
      ok: false,
      reason: `${strip.name} references a cell outside ${row.title}.`,
      row,
      pathCellIds: []
    };
  }

  const pathCellIds =
    row.entry === "left"
      ? row.cellIds.slice(0, Math.max(...indices) + 1)
      : row.cellIds.slice(Math.min(...indices));

  return {
    ok: true,
    row,
    pathCellIds
  };
}

function evaluatePlacement(strip, state, runtime) {
  const path = pathForStrip(strip, runtime);
  if (!path.ok) {
    return path;
  }

  const occupied = new Set(state.filledCells);
  const occupiedTarget = strip.targetCellIds.find((cellId) => occupied.has(cellId));
  if (occupiedTarget) {
    return {
      ok: false,
      row: path.row,
      pathCellIds: path.pathCellIds,
      blockedCellId: occupiedTarget,
      reason: "target-occupied"
    };
  }

  const blockingCellId = path.pathCellIds.find(
    (cellId) => occupied.has(cellId) && !strip.targetCellIds.includes(cellId)
  );
  if (blockingCellId) {
    return {
      ok: false,
      row: path.row,
      pathCellIds: path.pathCellIds,
      blockedCellId: blockingCellId,
      reason: "gutter-blocked"
    };
  }

  return {
    ok: true,
    row: path.row,
    pathCellIds: path.pathCellIds
  };
}

function simulateFastener(level, state, fastenerId, runtime = createRuntime(level)) {
  const renderState = getFastenerRenderState(level, state, fastenerId, runtime);
  if (!renderState.fastener || !renderState.strip) {
    return {
      ok: false,
      visible: false,
      removable: false,
      reason: renderState.reason
    };
  }

  if (!renderState.visible || !renderState.removable) {
    return {
      ok: false,
      visible: renderState.visible,
      removable: renderState.removable,
      reason: renderState.reason,
      fastener: renderState.fastener,
      strip: renderState.strip
    };
  }

  const provisional = {
    ...state,
    removedFasteners: [...state.removedFasteners, fastenerId]
  };
  const frontStrip = getFrontStrip(runtime, provisional, renderState.strip.stackId);
  if (!frontStrip) {
    return {
      ok: true,
      visible: true,
      removable: true,
      fastener: renderState.fastener,
      strip: renderState.strip,
      outcome: {
        type: "remove-only",
        remainingBlockers: []
      }
    };
  }

  const remainingBlockers = blockersForStrip(frontStrip, provisional);
  if (remainingBlockers.length) {
    return {
      ok: true,
      visible: true,
      removable: true,
      fastener: renderState.fastener,
      strip: renderState.strip,
      outcome: {
        type: "remove-only",
        remainingBlockers
      }
    };
  }

  const placement = evaluatePlacement(frontStrip, provisional, runtime);
  if (!placement.ok) {
    return {
      ok: true,
      visible: true,
      removable: true,
      fastener: renderState.fastener,
      strip: renderState.strip,
      outcome: {
        type: "overflow",
        stripId: frontStrip.id,
        rowId: frontStrip.rowId,
        rowTitle: placement.row?.title ?? frontStrip.rowId,
        blockedCellId: placement.blockedCellId,
        pathCellIds: placement.pathCellIds
      }
    };
  }

  return {
    ok: true,
    visible: true,
    removable: true,
    fastener: renderState.fastener,
    strip: renderState.strip,
    outcome: {
      type: "place",
      stripId: frontStrip.id,
      rowId: frontStrip.rowId,
      pathCellIds: placement.pathCellIds
    }
  };
}

export function evaluateFastener(level, state, fastenerId, runtime = createRuntime(level)) {
  return simulateFastener(level, state, fastenerId, runtime);
}

function scoreAction(result, runtime) {
  if (!result.outcome) {
    return -1;
  }

  if (result.outcome.type === "place") {
    const strip = runtime.stripMap.get(result.outcome.stripId);
    return 100 + (strip?.shardCount ?? 0) * 5;
  }

  if (result.outcome.type === "remove-only") {
    return 20 - result.outcome.remainingBlockers.length;
  }

  return 1;
}

export function collectLegalActions(level, state, runtime = createRuntime(level)) {
  if (state.failed || state.completed) {
    return [];
  }

  return collectVisibleFasteners(level, state, runtime)
    .map((entry) => evaluateFastener(level, state, entry.fastener.id, runtime))
    .filter((result) => result.ok && result.removable)
    .map((result) => ({
      type: "fastener",
      id: result.fastener.id,
      stripId: result.strip.id,
      outcome: result.outcome,
      score: scoreAction(result, runtime)
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.stripId.localeCompare(right.stripId) ||
        left.id.localeCompare(right.id)
    );
}

export function collectProductiveActions(level, state, runtime = createRuntime(level)) {
  return collectLegalActions(level, state, runtime).filter((action) => action.outcome.type === "place");
}

function finalizeProgress(level, state, runtime) {
  if (state.filledCells.length === runtime.totalCells) {
    return {
      ...state,
      completed: true,
      failed: false,
      failReason: null,
      hintAction: null,
      lastEvent: { type: "win" },
      message: "The commission is complete."
    };
  }

  if (!collectProductiveActions(level, state, runtime).length) {
    return {
      ...state,
      completed: false,
      failed: true,
      failReason: "no_move",
      hintAction: null,
      lastEvent: { type: "no_move" },
      message: "No productive releases remain."
    };
  }

  return state;
}

function placeStrip(state, strip, fastenerId) {
  return {
    ...state,
    removedFasteners: [...state.removedFasteners, fastenerId],
    resolvedStrips: [...state.resolvedStrips, strip.id],
    filledCells: [...state.filledCells, ...strip.targetCellIds]
  };
}

function removeOnly(state, fastenerId) {
  return {
    ...state,
    removedFasteners: [...state.removedFasteners, fastenerId]
  };
}

function overflowMessage(strip, rowTitle) {
  return `Gutter Overflow. ${strip.name} needed the deeper cells in ${rowTitle} first.`;
}

function removeOnlyMessage(strip, remainingBlockerId, runtime) {
  return `${strip.name} still waits on the ${remainingBlockerLabel(runtime, remainingBlockerId)}.`;
}

export function applyAction(
  level,
  state,
  action,
  runtime = createRuntime(level),
  options = {}
) {
  const recordHistory = options.recordHistory !== false;

  if (action.type !== "fastener") {
    return {
      ...state,
      hintAction: null,
      message: "Only fastener taps are supported in this slice."
    };
  }

  const evaluation = evaluateFastener(level, state, action.id, runtime);
  if (!evaluation.ok || !evaluation.removable || !evaluation.outcome) {
    return {
      ...state,
      hintAction: null,
      message: evaluation.reason ?? "That fastener cannot move right now."
    };
  }

  const history = recordHistory ? [...state.history, snapshotState(state)] : state.history;
  const baseState = {
    ...state,
    history,
    hintAction: null,
    failReason: null
  };

  if (evaluation.outcome.type === "overflow") {
    const strip = runtime.stripMap.get(evaluation.outcome.stripId);
    const next = removeOnly(baseState, action.id);
    return {
      ...next,
      failed: true,
      completed: false,
      failReason: "overflow",
      lastEvent: {
        type: "overflow",
        stripId: evaluation.outcome.stripId,
        rowId: evaluation.outcome.rowId,
        pathCellIds: evaluation.outcome.pathCellIds,
        blockedCellId: evaluation.outcome.blockedCellId
      },
      message: overflowMessage(strip, evaluation.outcome.rowTitle)
    };
  }

  if (evaluation.outcome.type === "remove-only") {
    const strip = evaluation.strip;
    const next = removeOnly(baseState, action.id);
    return finalizeProgress(
      level,
      {
        ...next,
        failed: false,
        completed: false,
        lastEvent: {
          type: "remove-only",
          stripId: strip.id,
          fastenerId: action.id
        },
        message: removeOnlyMessage(strip, evaluation.outcome.remainingBlockers[0], runtime)
      },
      runtime
    );
  }

  const placedStrip = runtime.stripMap.get(evaluation.outcome.stripId);
  const next = placeStrip(baseState, placedStrip, action.id);
  return finalizeProgress(
    level,
    {
      ...next,
      failed: false,
      completed: false,
      lastEvent: {
        type: "place",
        stripId: placedStrip.id,
        fastenerId: action.id,
        rowId: placedStrip.rowId,
        targetCellIds: placedStrip.targetCellIds
      },
      message: `${placedStrip.name} settles into ${runtime.rowMap.get(placedStrip.rowId)?.title ?? placedStrip.rowId}.`
    },
    runtime
  );
}

export function undoAction(state) {
  if (!state.history.length) {
    return {
      ...state,
      hintAction: null,
      message: "Nothing to undo yet."
    };
  }

  const snapshot = state.history[state.history.length - 1];
  return {
    ...clone(snapshot),
    history: state.history.slice(0, -1),
    hintAction: null,
    message: "Last release undone."
  };
}

export function restartLevel(level) {
  return createInitialState(level);
}

export function stateKey(level, state) {
  const removed = [...state.removedFasteners].sort().join(",");
  const resolved = [...state.resolvedStrips].sort().join(",");
  return `${removed}|${resolved}`;
}

export function solveLevel(level, runtime = createRuntime(level), startState = createInitialState(level)) {
  const queue = [{ state: startState, sequence: [] }];
  const visited = new Set([stateKey(level, startState)]);

  while (queue.length) {
    const current = queue.shift();
    if (current.state.completed) {
      return {
        ok: true,
        sequence: current.sequence
      };
    }

    if (current.state.failed) {
      continue;
    }

    for (const action of collectLegalActions(level, current.state, runtime)) {
      const next = applyAction(level, current.state, action, runtime, { recordHistory: false });
      if (next.failed) {
        continue;
      }

      const key = stateKey(level, next);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      queue.push({
        state: next,
        sequence: [...current.sequence, { type: action.type, id: action.id }]
      });
    }
  }

  return {
    ok: false,
    sequence: [],
    reason: "Validator could not find a completion path."
  };
}

export function findHint(level, state, runtime = createRuntime(level)) {
  if (state.failed || state.completed) {
    return {
      action: null,
      message: "No hint is available right now."
    };
  }

  const solution = solveLevel(level, runtime, {
    ...state,
    history: []
  });

  if (!solution.ok || !solution.sequence.length) {
    return {
      action: null,
      message: "No legal hint is available from this state."
    };
  }

  const action = solution.sequence[0];
  const evaluation = evaluateFastener(level, state, action.id, runtime);
  const strip = evaluation.strip;
  const row = strip ? runtime.rowMap.get(strip.rowId) : null;

  return {
    action,
    message: `Hint: lift ${strip?.name ?? action.id} toward ${row?.title ?? "its row"}.`
  };
}

export function validateLevel(level) {
  const runtime = createRuntime(level);
  const issues = [];

  if (runtime.rows.length < 2 || runtime.rows.length > 4) {
    issues.push("Each board should use 2 to 4 tray rows.");
  }

  if (runtime.stacks.length < 2 || runtime.stacks.length > 5) {
    issues.push("Each board should use 2 to 5 press stacks.");
  }

  if (runtime.totalCells < 4 || runtime.totalCells > 12) {
    issues.push("Each board should contain 4 to 12 tray cells.");
  }

  const fastenerCount = runtime.fasteners.length;
  if (fastenerCount < 1 || fastenerCount > 8) {
    issues.push("Fastener count should stay between 1 and 8 for this slice.");
  }

  const rowIds = new Set();
  for (const row of runtime.rows) {
    if (rowIds.has(row.id)) {
      issues.push(`Duplicate row id ${row.id}.`);
    }
    rowIds.add(row.id);

    if (row.entry !== "left" && row.entry !== "right") {
      issues.push(`Row ${row.id} must enter from the left or right.`);
    }

    if (row.cellIds.length < 2 || row.cellIds.length > 4) {
      issues.push(`Row ${row.id} should contain 2 to 4 cells in this prototype.`);
    }
  }

  if (level.kind === "ftue" && level.number < 9 && runtime.rows.some((row) => row.entry === "right")) {
    issues.push(`Level ${level.number} introduces right-entry rows too early.`);
  }

  if (level.kind === "daily" && runtime.rows.some((row) => row.entry !== "left")) {
    issues.push("Daily boards should only use already-unlocked left-entry rows.");
  }

  const stripIds = new Set();
  for (const strip of runtime.strips) {
    if (stripIds.has(strip.id)) {
      issues.push(`Duplicate strip id ${strip.id}.`);
    }
    stripIds.add(strip.id);

    if (strip.shardCount < 1 || strip.shardCount > 3) {
      issues.push(`Strip ${strip.id} must contain 1 to 3 shards.`);
    }

    if (strip.blockerIds.length < 1 || strip.blockerIds.length > 2) {
      issues.push(`Strip ${strip.id} must carry 1 or 2 fasteners.`);
    }

    if (!runtime.stackMap.has(strip.stackId)) {
      issues.push(`Strip ${strip.id} references unknown stack ${strip.stackId}.`);
    }

    if (!runtime.rowMap.has(strip.rowId)) {
      issues.push(`Strip ${strip.id} references unknown row ${strip.rowId}.`);
    }
  }

  const fastenerIds = new Set();
  for (const fastener of runtime.fasteners) {
    if (fastenerIds.has(fastener.id)) {
      issues.push(`Duplicate fastener id ${fastener.id}.`);
    }
    fastenerIds.add(fastener.id);

    if (!runtime.stripMap.has(fastener.stripId)) {
      issues.push(`Fastener ${fastener.id} references unknown strip ${fastener.stripId}.`);
    }

    for (const blockedId of fastener.blockedBy) {
      if (!runtime.fastenerMap.has(blockedId)) {
        issues.push(`Fastener ${fastener.id} is blocked by unknown fastener ${blockedId}.`);
      }
    }
  }

  for (const stack of runtime.stacks) {
    const stripSet = new Set();
    for (const stripId of stack.stripIds) {
      if (!runtime.stripMap.has(stripId)) {
        issues.push(`Stack ${stack.id} references unknown strip ${stripId}.`);
      }
      if (stripSet.has(stripId)) {
        issues.push(`Stack ${stack.id} repeats strip ${stripId}.`);
      }
      stripSet.add(stripId);
    }
  }

  const initialState = createInitialState(level);
  if (!collectProductiveActions(level, initialState, runtime).length) {
    issues.push("The board starts with no productive fastener.");
  }

  if (level.mechanics.some((mechanic) => /repeated/i.test(mechanic))) {
    const familyCounts = new Map();
    for (const strip of runtime.strips) {
      familyCounts.set(strip.family, (familyCounts.get(strip.family) ?? 0) + 1);
    }
    if (![...familyCounts.values()].some((count) => count > 1)) {
      issues.push(`${level.id} advertises repeated motifs but does not author any repeated family.`);
    }
  }

  if (level.kind === "daily") {
    if (runtime.stacks.length < 4 || runtime.stacks.length > 5) {
      issues.push("Daily boards should use 4 to 5 stacks.");
    }
    if (runtime.totalCells < 10 || runtime.totalCells > 12) {
      issues.push("Daily boards should use 10 to 12 cells.");
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
