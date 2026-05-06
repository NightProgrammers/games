const clone = (value) => JSON.parse(JSON.stringify(value));

export function createRuntime(level) {
  const targets = level.page.targets.map((target) => clone(target));
  const sheets = level.sheets.map((sheet) => clone(sheet));

  return {
    level,
    targets,
    targetMap: new Map(targets.map((target) => [target.id, target])),
    sheets,
    sheetMap: new Map(sheets.map((sheet) => [sheet.id, sheet])),
    totalStickers: targets.length
  };
}

export function createInitialState(level) {
  return {
    sheetIndices: Object.fromEntries(level.sheets.map((sheet) => [sheet.id, 0])),
    clips: Array(level.clipCount).fill(null),
    activeSheetId: null,
    placedTargets: [],
    failed: false,
    completed: false,
    message: level.beat,
    failReason: null,
    hintAction: null,
    history: []
  };
}

function snapshotState(state) {
  return {
    sheetIndices: clone(state.sheetIndices),
    clips: [...state.clips],
    activeSheetId: state.activeSheetId,
    placedTargets: [...state.placedTargets],
    failed: state.failed,
    completed: state.completed,
    message: state.message,
    failReason: state.failReason,
    hintAction: state.hintAction ? clone(state.hintAction) : null
  };
}

function targetLabel(runtime, targetId) {
  return runtime.targetMap.get(targetId)?.title ?? targetId;
}

function remainingLabel(sheet, index) {
  const remaining = Math.max(0, sheet.stickers.length - index);
  return remaining === 1 ? "1 sticker left" : `${remaining} stickers left`;
}

export function getSheetLocation(state, sheetId) {
  if (state.activeSheetId === sheetId) {
    return "active";
  }

  const clipIndex = state.clips.findIndex((entry) => entry === sheetId);
  if (clipIndex >= 0) {
    return "clip";
  }

  return "tray";
}

export function getEmptyClipCount(state) {
  return state.clips.filter((entry) => entry === null).length;
}

export function getCurrentSticker(level, state, sheetId, runtime = createRuntime(level)) {
  const sheet = runtime.sheetMap.get(sheetId);
  if (!sheet) {
    return null;
  }

  const index = state.sheetIndices[sheetId] ?? 0;
  if (index >= sheet.stickers.length) {
    return null;
  }

  const sticker = sheet.stickers[index];
  const target = runtime.targetMap.get(sticker.targetId);

  return {
    ...clone(sticker),
    sheetId,
    index,
    remaining: sheet.stickers.length - index,
    target: target ? clone(target) : null
  };
}

export function isTargetFilled(state, targetId) {
  return state.placedTargets.includes(targetId);
}

export function getTargetStatus(level, state, targetId, runtime = createRuntime(level)) {
  const target = runtime.targetMap.get(targetId);
  if (!target) {
    return {
      target: null,
      filled: false,
      open: false,
      missingPrereqs: [],
      reason: `Unknown target ${targetId}.`
    };
  }

  if (isTargetFilled(state, targetId)) {
    return {
      target,
      filled: true,
      open: false,
      missingPrereqs: [],
      reason: `${target.title} is already filled.`
    };
  }

  const missingPrereqs = target.prereqs.filter((prereqId) => !isTargetFilled(state, prereqId));
  if (!missingPrereqs.length) {
    return {
      target,
      filled: false,
      open: true,
      missingPrereqs: [],
      reason: `${target.title} is open.`
    };
  }

  const missingLabels = missingPrereqs.map((prereqId) => targetLabel(runtime, prereqId));
  return {
    target,
    filled: false,
    open: false,
    missingPrereqs,
    reason:
      missingLabels.length > 2
        ? `${target.title} still waits for earlier collage layers.`
        : `${target.title} still waits for ${missingLabels.join(" and ")}.`
  };
}

function liftSheetFromClip(state, sheetId) {
  const clips = [...state.clips];
  const clipIndex = clips.findIndex((entry) => entry === sheetId);
  if (clipIndex >= 0) {
    clips[clipIndex] = null;
  }
  return clips;
}

function assignSheetToClip(state, sheetId) {
  const clips = [...state.clips];
  const openIndex = clips.findIndex((entry) => entry === null);
  if (openIndex < 0) {
    return null;
  }
  clips[openIndex] = sheetId;
  return clips;
}

function canExposeCurrentSticker(level, state, sheetId, runtime) {
  const currentSticker = getCurrentSticker(level, state, sheetId, runtime);
  if (!currentSticker?.target) {
    return { ok: false, reason: "That sheet is already exhausted." };
  }

  const status = getTargetStatus(level, state, currentSticker.targetId, runtime);
  if (!status.open) {
    return { ok: false, reason: status.reason, sticker: currentSticker };
  }

  return {
    ok: true,
    reason: `${currentSticker.target.title} can place now.`,
    sticker: currentSticker,
    targetStatus: status
  };
}

export function evaluateSheet(level, state, sheetId, runtime = createRuntime(level)) {
  if (state.failed || state.completed) {
    return { ok: false, reason: "The page is no longer active." };
  }

  const sheet = runtime.sheetMap.get(sheetId);
  if (!sheet) {
    return { ok: false, reason: `Unknown sheet ${sheetId}.` };
  }

  if (state.activeSheetId && state.activeSheetId !== sheetId) {
    const activeSheet = runtime.sheetMap.get(state.activeSheetId);
    return {
      ok: false,
      reason: `Park or finish ${activeSheet?.name ?? state.activeSheetId} first.`
    };
  }

  return canExposeCurrentSticker(level, state, sheetId, runtime);
}

export function evaluatePlaceAction(level, state, action, runtime = createRuntime(level)) {
  if (action.type !== "place") {
    return { ok: false, reason: "Place evaluation expects a place action." };
  }

  const sheetCheck = evaluateSheet(level, state, action.sheetId, runtime);
  if (!sheetCheck.ok) {
    return sheetCheck;
  }

  const currentSticker = sheetCheck.sticker;
  if (action.targetId !== currentSticker.targetId) {
    return {
      ok: false,
      reason: `${runtime.sheetMap.get(action.sheetId)?.name ?? action.sheetId} exposes ${currentSticker.target.title}, not ${targetLabel(
        runtime,
        action.targetId
      )}.`
    };
  }

  return {
    ok: true,
    reason: `${currentSticker.target.title} can place now.`,
    sticker: currentSticker,
    target: currentSticker.target
  };
}

export function evaluateParkAction(level, state, action, runtime = createRuntime(level)) {
  if (action.type !== "park") {
    return { ok: false, reason: "Park evaluation expects a park action." };
  }

  if (state.failed || state.completed) {
    return { ok: false, reason: "The page is no longer active." };
  }

  if (!state.activeSheetId) {
    return { ok: false, reason: "No partial sheet is active right now." };
  }

  if (action.sheetId && action.sheetId !== state.activeSheetId) {
    return { ok: false, reason: "Only the active partial sheet can be parked." };
  }

  if (!getCurrentSticker(level, state, state.activeSheetId, runtime)) {
    return { ok: false, reason: "That sheet is already exhausted." };
  }

  if (!getEmptyClipCount(state)) {
    return { ok: false, reason: "All binder clips are full." };
  }

  const sheet = runtime.sheetMap.get(state.activeSheetId);
  const sticker = getCurrentSticker(level, state, state.activeSheetId, runtime);
  return {
    ok: true,
    reason: `Park ${sheet?.name ?? state.activeSheetId} with ${remainingLabel(sheet, sticker.index)}.`
  };
}

function scorePlaceAction(level, state, action, runtime) {
  const sticker = getCurrentSticker(level, state, action.sheetId, runtime);
  if (!sticker) {
    return -1;
  }

  const nextIndices = { ...state.sheetIndices, [action.sheetId]: sticker.index + 1 };
  const provisionalState = {
    ...state,
    sheetIndices: nextIndices,
    placedTargets: [...state.placedTargets, sticker.targetId]
  };
  const nextSticker = getCurrentSticker(level, provisionalState, action.sheetId, runtime);
  const unlocks = runtime.targets.filter((target) => {
    if (provisionalState.placedTargets.includes(target.id)) {
      return false;
    }
    return target.prereqs.every((prereqId) => provisionalState.placedTargets.includes(prereqId));
  }).length;

  return (
    (nextSticker ? 6 : 12) +
    unlocks * 3 +
    (state.activeSheetId === action.sheetId ? 2 : 0) +
    (getSheetLocation(state, action.sheetId) === "clip" ? 3 : 0)
  );
}

export function collectLegalActions(level, state, runtime = createRuntime(level)) {
  if (state.failed || state.completed) {
    return [];
  }

  const actions = [];
  if (state.activeSheetId) {
    const currentSticker = getCurrentSticker(level, state, state.activeSheetId, runtime);
    if (currentSticker) {
      const placeAction = {
        type: "place",
        sheetId: state.activeSheetId,
        targetId: currentSticker.targetId
      };
      if (evaluatePlaceAction(level, state, placeAction, runtime).ok) {
        actions.push({
          ...placeAction,
          score: scorePlaceAction(level, state, placeAction, runtime)
        });
      }
    }

    const parkAction = { type: "park", sheetId: state.activeSheetId };
    if (evaluateParkAction(level, state, parkAction, runtime).ok) {
      actions.push({ ...parkAction, score: 4 });
    }
  } else {
    for (const sheet of runtime.sheets) {
      const currentSticker = getCurrentSticker(level, state, sheet.id, runtime);
      if (!currentSticker) {
        continue;
      }
      const placeAction = {
        type: "place",
        sheetId: sheet.id,
        targetId: currentSticker.targetId
      };
      if (evaluatePlaceAction(level, state, placeAction, runtime).ok) {
        actions.push({
          ...placeAction,
          score: scorePlaceAction(level, state, placeAction, runtime)
        });
      }
    }
  }

  return actions.sort((left, right) => right.score - left.score || left.sheetId.localeCompare(right.sheetId));
}

function finalizeOutcome(level, state, runtime) {
  if (state.placedTargets.length === runtime.totalStickers) {
    return {
      ...state,
      completed: true,
      failed: false,
      failReason: null,
      activeSheetId: null,
      hintAction: null,
      message: "The scrapbook page is complete."
    };
  }

  if (!collectLegalActions(level, state, runtime).length) {
    return {
      ...state,
      failed: true,
      completed: false,
      failReason: "deadlock",
      hintAction: null,
      message: "No open spot matches any exposed sticker."
    };
  }

  return state;
}

export function applyAction(level, state, action, runtime = createRuntime(level)) {
  if (action.type === "park") {
    const evaluation = evaluateParkAction(level, state, action, runtime);
    if (!evaluation.ok) {
      return {
        ...state,
        message: evaluation.reason,
        hintAction: null
      };
    }

    const clips = assignSheetToClip(state, state.activeSheetId);
    const sheet = runtime.sheetMap.get(state.activeSheetId);
    return finalizeOutcome(
      level,
      {
        ...state,
        clips,
        activeSheetId: null,
        history: [...state.history, snapshotState(state)],
        hintAction: null,
        message: `${sheet?.name ?? state.activeSheetId} parks in a binder clip.`
      },
      runtime
    );
  }

  const evaluation = evaluatePlaceAction(level, state, action, runtime);
  if (!evaluation.ok) {
    return {
      ...state,
      message: evaluation.reason,
      hintAction: null
    };
  }

  const currentSticker = evaluation.sticker;
  const sheet = runtime.sheetMap.get(action.sheetId);
  const nextSheetIndices = {
    ...state.sheetIndices,
    [action.sheetId]: currentSticker.index + 1
  };
  const nextState = {
    ...state,
    sheetIndices: nextSheetIndices,
    clips: liftSheetFromClip(state, action.sheetId),
    placedTargets: [...state.placedTargets, currentSticker.targetId],
    activeSheetId: action.sheetId,
    history: [...state.history, snapshotState(state)],
    hintAction: null,
    failReason: null,
    message: `${currentSticker.target.title} lands on the page.`
  };

  const revealedSticker = getCurrentSticker(level, nextState, action.sheetId, runtime);
  if (!revealedSticker) {
    return finalizeOutcome(
      level,
      {
        ...nextState,
        activeSheetId: null,
        message: `${sheet?.name ?? action.sheetId} is exhausted and slides away.`
      },
      runtime
    );
  }

  const revealedStatus = getTargetStatus(level, nextState, revealedSticker.targetId, runtime);
  if (!revealedStatus.open && !getEmptyClipCount(nextState)) {
    return {
      ...nextState,
      failed: true,
      completed: false,
      failReason: "overflow",
      hintAction: null,
      message: "Page Jammed. The active sheet needs a clip, but every binder clip is full."
    };
  }

  if (revealedStatus.open) {
    return finalizeOutcome(
      level,
      {
        ...nextState,
        message: `${sheet?.name ?? action.sheetId} reveals ${revealedSticker.target.title}. Keep going or park it.`
      },
      runtime
    );
  }

  return finalizeOutcome(
    level,
    {
      ...nextState,
      message: `${sheet?.name ?? action.sheetId} now waits for an open clip.`
    },
    runtime
  );
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
    hintAction: null,
    message: "Last step undone."
  };
}

export function restartLevel(level) {
  return createInitialState(level);
}

export function findHint(level, state, runtime = createRuntime(level)) {
  const action = collectLegalActions(level, state, runtime)[0];
  if (!action) {
    return {
      action: null,
      message: "No legal move is available from this state."
    };
  }

  if (action.type === "park") {
    const sheet = runtime.sheetMap.get(action.sheetId);
    return {
      action,
      message: `Hint: park ${sheet?.name ?? action.sheetId} so another strip can open the page.`
    };
  }

  const sticker = getCurrentSticker(level, state, action.sheetId, runtime);
  return {
    action,
    message: `Hint: place ${sticker?.target?.title ?? action.targetId} from ${runtime.sheetMap.get(action.sheetId)?.name ?? action.sheetId}.`
  };
}

function sheetCountSummary(level) {
  return level.sheets.map((sheet) => sheet.stickers.length);
}

function overlapArea(left, right) {
  const width = Math.max(
    0,
    Math.min(left.x + left.w, right.x + right.w) - Math.max(left.x, right.x)
  );
  const height = Math.max(
    0,
    Math.min(left.y + left.h, right.y + right.h) - Math.max(left.y, right.y)
  );
  return width * height;
}

export function stateKey(level, state) {
  const sheetIds = level.sheets.map((sheet) => sheet.id);
  const indices = sheetIds.map((sheetId) => state.sheetIndices[sheetId]).join(",");
  return `${indices}|${state.clips.join(",")}|${state.activeSheetId ?? "-"}|${state.placedTargets.join(",")}`;
}

export function solveLevel(level, runtime = createRuntime(level)) {
  const start = createInitialState(level);
  const queue = [{ state: start, sequence: [] }];
  const visited = new Set([stateKey(level, start)]);

  while (queue.length) {
    const current = queue.shift();
    if (current.state.completed) {
      return { ok: true, sequence: current.sequence };
    }

    if (current.state.failed) {
      continue;
    }

    for (const action of collectLegalActions(level, current.state, runtime)) {
      const next = applyAction(level, current.state, action, runtime);
      if (next.failed && next.failReason === "overflow") {
        continue;
      }
      const key = stateKey(level, next);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      queue.push({
        state: next,
        sequence: [...current.sequence, action]
      });
    }
  }

  return {
    ok: false,
    sequence: [],
    reason: "Validator could not find a complete sequence."
  };
}

export function validateLevel(level) {
  const runtime = createRuntime(level);
  const issues = [];

  if (level.clipCount < 0 || level.clipCount > 3) {
    issues.push("Clip count must stay between 0 and 3.");
  }

  if (runtime.targets.length < 6 || runtime.targets.length > 10) {
    issues.push("Each authored page should contain 6 to 10 silhouettes.");
  }

  if (runtime.sheets.length < 3 || runtime.sheets.length > 5) {
    issues.push("Each authored page should contain 3 to 5 sheets.");
  }

  const targetIds = new Set();
  for (const target of runtime.targets) {
    if (targetIds.has(target.id)) {
      issues.push(`Duplicate target id ${target.id}.`);
    }
    targetIds.add(target.id);

    if (target.x < 0 || target.y < 0 || target.x + target.w > 100 || target.y + target.h > 100) {
      issues.push(`Target ${target.id} falls outside the page bounds.`);
    }

    for (const prereqId of target.prereqs) {
      if (prereqId === target.id) {
        issues.push(`Target ${target.id} cannot depend on itself.`);
      }
    }
  }

  for (let leftIndex = 0; leftIndex < runtime.targets.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < runtime.targets.length; rightIndex += 1) {
      const left = runtime.targets[leftIndex];
      const right = runtime.targets[rightIndex];
      const overlap = overlapArea(left, right);
      if (!overlap) {
        continue;
      }

      const leftRatio = overlap / (left.w * left.h);
      const rightRatio = overlap / (right.w * right.h);
      if (leftRatio > 0.15 || rightRatio > 0.15) {
        issues.push(
          `Targets ${left.id} and ${right.id} overlap too much (${Math.round(leftRatio * 100)}% / ${Math.round(rightRatio * 100)}%).`
        );
      }
    }
  }

  const sheetIds = new Set();
  const targetUsage = new Map(runtime.targets.map((target) => [target.id, 0]));
  const lengths = sheetCountSummary(level);

  for (const sheet of runtime.sheets) {
    if (sheetIds.has(sheet.id)) {
      issues.push(`Duplicate sheet id ${sheet.id}.`);
    }
    sheetIds.add(sheet.id);

    if (!sheet.stickers.length) {
      issues.push(`Sheet ${sheet.id} is empty.`);
    }

    if (level.kind === "ftue" && level.number < 8 && sheet.stickers.length > 3) {
      issues.push(`Level ${level.number} introduces a 4-sticker sheet too early.`);
    }

    for (const sticker of sheet.stickers) {
      if (!runtime.targetMap.has(sticker.targetId)) {
        issues.push(`Sheet ${sheet.id} references unknown target ${sticker.targetId}.`);
        continue;
      }
      targetUsage.set(sticker.targetId, (targetUsage.get(sticker.targetId) ?? 0) + 1);
    }
  }

  for (const target of runtime.targets) {
    for (const prereqId of target.prereqs) {
      if (!runtime.targetMap.has(prereqId)) {
        issues.push(`Target ${target.id} references unknown prerequisite ${prereqId}.`);
      }
    }
  }

  for (const [targetId, usage] of targetUsage.entries()) {
    if (usage !== 1) {
      issues.push(`Target ${targetId} should be referenced exactly once, found ${usage}.`);
    }
  }

  if (level.number >= 7) {
    const familyCounts = new Map();
    for (const target of runtime.targets) {
      familyCounts.set(target.family, (familyCounts.get(target.family) ?? 0) + 1);
    }
    const hasRepeat = [...familyCounts.values()].some((count) => count > 1);
    if (!hasRepeat) {
      issues.push(`Level ${level.number} should introduce or use a repeated sticker family.`);
    }
  }

  if (level.kind === "daily") {
    if (level.clipCount !== 2) {
      issues.push("Daily pages should use exactly 2 clip slots.");
    }
    if (runtime.targets.length < 9 || runtime.targets.length > 10) {
      issues.push("Daily pages should contain 9 to 10 silhouettes.");
    }
  }

  if (lengths.some((length) => length < 1 || length > 4)) {
    issues.push("Sheet lengths must stay between 1 and 4 in the slice authoring data.");
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
