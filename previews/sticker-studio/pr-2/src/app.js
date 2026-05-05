import { DAILY_UNLOCK_LEVEL, HANDCRAFTED_LEVELS, STORAGE_KEY, getPackForLevel } from "./data.js";
import { dailySeedFromDate, generateDailyLevel } from "./daily.js";
import {
  applyAction,
  createInitialState,
  createRuntime,
  evaluateParkAction,
  evaluateSheet,
  findHint,
  getCurrentSticker,
  getEmptyClipCount,
  getSheetLocation,
  getTargetStatus,
  restartLevel,
  undoAction,
  validateLevel
} from "./engine.js";

const root = document.querySelector("#app");

const appState = {
  mode: "campaign",
  levelIndex: 0,
  dailySeed: dailySeedFromDate(),
  progress: loadProgress(),
  level: null,
  runtime: null,
  puzzle: null,
  validation: null,
  modal: "start",
  selectedSheetId: null
};

function createEmptyProgress() {
  return {
    clearedLevels: [],
    dailySeeds: [],
    rewards: []
  };
}

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return {
      clearedLevels: Array.isArray(parsed.clearedLevels) ? parsed.clearedLevels : [],
      dailySeeds: Array.isArray(parsed.dailySeeds) ? parsed.dailySeeds : [],
      rewards: Array.isArray(parsed.rewards) ? parsed.rewards : []
    };
  } catch {
    return createEmptyProgress();
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.progress));
}

function clearedCampaignCount() {
  let count = 0;
  for (const level of HANDCRAFTED_LEVELS) {
    if (!appState.progress.clearedLevels.includes(level.id)) {
      break;
    }
    count += 1;
  }
  return count;
}

function isDailyUnlocked() {
  return clearedCampaignCount() >= DAILY_UNLOCK_LEVEL;
}

function getCurrentPack() {
  return getPackForLevel(appState.level);
}

function isLevelCleared(level) {
  if (level.kind === "daily") {
    return appState.progress.dailySeeds.includes(level.seed);
  }
  return appState.progress.clearedLevels.includes(level.id);
}

function rewardKeyFor(level) {
  if (level.kind === "daily") {
    return `daily:${level.seed}`;
  }
  return level.id;
}

function recordWin(level) {
  if (level.kind === "daily") {
    if (!appState.progress.dailySeeds.includes(level.seed)) {
      appState.progress.dailySeeds.push(level.seed);
    }
  } else if (!appState.progress.clearedLevels.includes(level.id)) {
    appState.progress.clearedLevels.push(level.id);
  }

  const rewardKey = rewardKeyFor(level);
  if (!appState.progress.rewards.includes(rewardKey)) {
    appState.progress.rewards.push(rewardKey);
  }

  saveProgress();
}

function loadLevel({
  mode = appState.mode,
  levelIndex = appState.levelIndex,
  dailySeed = appState.dailySeed,
  showStart = true
} = {}) {
  if (mode === "daily" && !isDailyUnlocked()) {
    mode = "campaign";
  }

  appState.mode = mode;
  appState.levelIndex = Math.min(levelIndex, HANDCRAFTED_LEVELS.length - 1);
  appState.dailySeed = dailySeed;
  appState.level =
    mode === "daily" ? generateDailyLevel(dailySeed) : HANDCRAFTED_LEVELS[appState.levelIndex];
  appState.runtime = createRuntime(appState.level);
  appState.puzzle = createInitialState(appState.level);
  appState.validation = validateLevel(appState.level);
  appState.modal = showStart ? "start" : null;
  appState.selectedSheetId = null;
  document.title =
    appState.level.kind === "daily"
      ? `Sticker Studio • Daily ${appState.level.seed}`
      : `Sticker Studio • Level ${appState.level.number}`;
  render();
}

function getPackLevels(packId) {
  return HANDCRAFTED_LEVELS.filter((level) => level.packId === packId);
}

function getPackProgress(packId) {
  const levels = getPackLevels(packId);
  const cleared = levels.filter((level) => appState.progress.clearedLevels.includes(level.id)).length;
  return {
    cleared,
    total: levels.length,
    percent: levels.length ? Math.round((cleared / levels.length) * 100) : 0
  };
}

function setLocalMessage(message, hintAction = null) {
  appState.puzzle = {
    ...appState.puzzle,
    message,
    hintAction
  };
}

function syncSelectionAfterState() {
  if (appState.puzzle.activeSheetId) {
    appState.selectedSheetId = appState.puzzle.activeSheetId;
    return;
  }

  if (appState.selectedSheetId && !getCurrentSticker(appState.level, appState.puzzle, appState.selectedSheetId, appState.runtime)) {
    appState.selectedSheetId = null;
  }
}

function applyAndRender(nextPuzzle) {
  const justCompleted = !appState.puzzle.completed && nextPuzzle.completed;
  const justFailed = !appState.puzzle.failed && nextPuzzle.failed;

  appState.puzzle = nextPuzzle;
  syncSelectionAfterState();

  if (justCompleted) {
    recordWin(appState.level);
    appState.modal = "win";
  } else if (justFailed) {
    appState.modal = "fail";
    appState.selectedSheetId = appState.puzzle.activeSheetId ?? appState.selectedSheetId;
  }

  render();
}

function handleSheetPick(sheetId) {
  if (appState.puzzle.activeSheetId && appState.puzzle.activeSheetId !== sheetId) {
    const evaluation = evaluateSheet(appState.level, appState.puzzle, sheetId, appState.runtime);
    setLocalMessage(evaluation.reason);
    render();
    return;
  }

  const sticker = getCurrentSticker(appState.level, appState.puzzle, sheetId, appState.runtime);
  if (!sticker) {
    setLocalMessage("That sheet is already exhausted.");
    render();
    return;
  }

  const evaluation = evaluateSheet(appState.level, appState.puzzle, sheetId, appState.runtime);
  appState.selectedSheetId = sheetId;
  setLocalMessage(evaluation.ok ? `${sticker.target.title} is ready to place.` : evaluation.reason);
  render();
}

function handleTargetPick(targetId) {
  if (!appState.selectedSheetId) {
    setLocalMessage("Pick a sheet first.");
    render();
    return;
  }

  applyAndRender(
    applyAction(
      appState.level,
      appState.puzzle,
      {
        type: "place",
        sheetId: appState.selectedSheetId,
        targetId
      },
      appState.runtime
    )
  );
}

function handlePark() {
  applyAndRender(
    applyAction(
      appState.level,
      appState.puzzle,
      {
        type: "park",
        sheetId: appState.puzzle.activeSheetId
      },
      appState.runtime
    )
  );
}

function handleHint() {
  const hint = findHint(appState.level, appState.puzzle, appState.runtime);
  if (hint.action?.sheetId) {
    appState.selectedSheetId = hint.action.sheetId;
  }
  setLocalMessage(hint.message, hint.action);
  render();
}

function handleUndo() {
  appState.modal = null;
  appState.puzzle = undoAction(appState.puzzle);
  syncSelectionAfterState();
  render();
}

function handleRestart() {
  appState.modal = null;
  appState.selectedSheetId = null;
  appState.puzzle = restartLevel(appState.level);
  render();
}

function openNextLevel() {
  if (appState.mode === "campaign" && appState.levelIndex < HANDCRAFTED_LEVELS.length - 1) {
    loadLevel({ mode: "campaign", levelIndex: appState.levelIndex + 1, showStart: true });
    return;
  }

  if (isDailyUnlocked()) {
    loadLevel({ mode: "daily", dailySeed: appState.dailySeed, showStart: true });
    return;
  }

  loadLevel({ mode: "campaign", levelIndex: appState.levelIndex, showStart: true });
}

function isLevelUnlocked(levelIndex) {
  return levelIndex <= clearedCampaignCount();
}

function openLevelChip(levelIndex) {
  if (!isLevelUnlocked(levelIndex)) {
    setLocalMessage("That page unlocks by clearing the pages before it.");
    render();
    return;
  }
  loadLevel({ mode: "campaign", levelIndex, showStart: true });
}

function formatLevelLabel(level) {
  if (level.kind === "daily") {
    return `Daily • ${level.seed}`;
  }
  return `Level ${String(level.number).padStart(2, "0")}`;
}

function renderPackMeter() {
  const pack = getCurrentPack();
  if (appState.level.kind === "daily") {
    return `
      <div class="meter">
        <span style="width:${isLevelCleared(appState.level) ? 100 : 0}%"></span>
      </div>
      <p class="meta-copy">First clear earns one foil badge for ${appState.level.seed}.</p>
    `;
  }

  const progress = getPackProgress(pack.id);
  return `
    <div class="meter">
      <span style="width:${progress.percent}%"></span>
    </div>
    <p class="meta-copy">${progress.cleared}/${progress.total} pages restored in ${pack.title}.</p>
  `;
}

function renderLevelRail() {
  return HANDCRAFTED_LEVELS.map((level, index) => {
    const locked = !isLevelUnlocked(index);
    const active = appState.mode === "campaign" && appState.levelIndex === index;
    const cleared = appState.progress.clearedLevels.includes(level.id);
    const classes = [
      "rail-chip",
      active ? "is-active" : "",
      locked ? "is-locked" : "",
      cleared ? "is-cleared" : ""
    ]
      .filter(Boolean)
      .join(" ");

    return `
      <button class="${classes}" data-action="open-level" data-index="${index}" ${locked ? "disabled" : ""}>
        ${index + 1}
      </button>
    `;
  }).join("");
}

function renderDailyCard() {
  const unlocked = isDailyUnlocked();
  return `
    <div class="daily-panel ${unlocked ? "" : "is-locked"}">
      <div>
        <p class="eyebrow">Daily Page</p>
        <h3>${unlocked ? "Foil Badge Page" : `Unlocks After Level ${DAILY_UNLOCK_LEVEL}`}</h3>
        <p class="meta-copy">${
          unlocked
            ? "Seeded by UTC date, validated by the same solver, and clearable once per day."
            : "Clear the Kitchen Keepsakes finale to reveal the daily retention stub."
        }</p>
      </div>
      <label class="daily-seed">
        <span>UTC Seed</span>
        <input
          type="date"
          data-action="daily-seed"
          value="${appState.dailySeed}"
          ${unlocked ? "" : "disabled"}
        />
      </label>
      <button class="primary-button" data-action="open-daily" ${unlocked ? "" : "disabled"}>Open Daily</button>
    </div>
  `;
}

function sheetGhosts(sheetId) {
  const sheet = appState.runtime.sheetMap.get(sheetId);
  const index = appState.puzzle.sheetIndices[sheetId] ?? 0;
  return sheet.stickers
    .slice(index + 1, index + 3)
    .map((sticker) => appState.runtime.targetMap.get(sticker.targetId)?.short ?? sticker.targetId);
}

function sheetStatus(sheetId) {
  const sheet = appState.runtime.sheetMap.get(sheetId);
  const sticker = getCurrentSticker(appState.level, appState.puzzle, sheetId, appState.runtime);
  if (!sticker) {
    return { label: "Done", detail: "Exhausted" };
  }

  if (appState.puzzle.activeSheetId === sheetId) {
    const status = getTargetStatus(appState.level, appState.puzzle, sticker.targetId, appState.runtime);
    if (status.open) {
      return { label: "Active", detail: "Keep placing or park it." };
    }
    if (getEmptyClipCount(appState.puzzle)) {
      return { label: "Active", detail: "Park it before you switch." };
    }
    return { label: "Jammed", detail: "No free clip for the active strip." };
  }

  const evaluation = evaluateSheet(appState.level, appState.puzzle, sheetId, appState.runtime);
  if (evaluation.ok) {
    return { label: "Ready", detail: sticker.target.title };
  }
  return { label: getSheetLocation(appState.puzzle, sheetId) === "clip" ? "Clipped" : "Waiting", detail: evaluation.reason };
}

function renderSheetCard(sheetId, options = {}) {
  const sheet = appState.runtime.sheetMap.get(sheetId);
  const sticker = getCurrentSticker(appState.level, appState.puzzle, sheetId, appState.runtime);
  if (!sheet || !sticker) {
    return "";
  }

  const status = sheetStatus(sheetId);
  const ghosts = sheetGhosts(sheetId);
  const selected = appState.selectedSheetId === sheetId;
  const active = appState.puzzle.activeSheetId === sheetId;
  const hinted = appState.puzzle.hintAction?.sheetId === sheetId;
  const location = options.location ?? getSheetLocation(appState.puzzle, sheetId);
  const classes = [
    "sheet-card",
    selected ? "is-selected" : "",
    active ? "is-active" : "",
    hinted ? "is-hinted" : "",
    location === "clip" ? "is-clip" : "",
    options.compact ? "is-compact" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <button class="${classes}" data-action="pick-sheet" data-id="${sheetId}" style="--sheet:${sheet.color}; --sheet-accent:${sheet.accent};">
      <span class="sheet-card__stripe"></span>
      <span class="sheet-card__top">
        <strong>${sheet.name}</strong>
        <span class="sheet-card__status">${status.label}</span>
      </span>
      <span class="sheet-card__preview">
        <span class="sheet-badge">
          ${sticker.target.short}
          <small>${sticker.target.variant.toUpperCase()}</small>
        </span>
        <span class="sheet-card__target">${sticker.target.title}</span>
      </span>
      <span class="sheet-card__bottom">
        <span class="sheet-card__count">${sticker.remaining} left</span>
        <span class="sheet-card__ghosts">${ghosts.length ? ghosts.join(" · ") : "No ghosts"}</span>
      </span>
      <span class="sheet-card__detail">${status.detail}</span>
    </button>
  `;
}

function renderActiveSheet() {
  const sheetId = appState.puzzle.activeSheetId;
  if (!sheetId) {
    return `
      <div class="active-well is-empty">
        <p class="eyebrow">Active Strip</p>
        <p class="meta-copy">Place a sticker from the tray or a clip to bring a strip into hand.</p>
      </div>
    `;
  }

  const parkEnabled = evaluateParkAction(
    appState.level,
    appState.puzzle,
    { type: "park", sheetId },
    appState.runtime
  ).ok;

  return `
    <div class="active-well">
      <div>
        <p class="eyebrow">Active Strip</p>
        <h3>${appState.runtime.sheetMap.get(sheetId)?.name ?? sheetId}</h3>
        <p class="meta-copy">You can keep placing from this strip or park it to switch.</p>
      </div>
      ${renderSheetCard(sheetId, { compact: true, location: "active" })}
      <button class="ghost-button" data-action="park-active" ${parkEnabled ? "" : "disabled"}>Park In Clip</button>
    </div>
  `;
}

function renderClipRail() {
  return appState.puzzle.clips
    .map((sheetId, index) => {
      if (!sheetId) {
        return `
          <div class="clip-slot is-empty">
            <span>Clip ${index + 1}</span>
            <small>Open</small>
          </div>
        `;
      }

      return `
        <div class="clip-slot">
          <span>Clip ${index + 1}</span>
          ${renderSheetCard(sheetId, { compact: true, location: "clip" })}
        </div>
      `;
    })
    .join("");
}

function renderTray() {
  const sheets = appState.runtime.sheets
    .filter((sheet) => getCurrentSticker(appState.level, appState.puzzle, sheet.id, appState.runtime))
    .filter((sheet) => getSheetLocation(appState.puzzle, sheet.id) === "tray");

  if (!sheets.length) {
    return `<div class="tray-empty">No untouched sheets remain in the tray.</div>`;
  }

  return sheets.map((sheet) => renderSheetCard(sheet.id)).join("");
}

function repeatedFamilyCounts() {
  const counts = new Map();
  for (const target of appState.runtime.targets) {
    counts.set(target.family, (counts.get(target.family) ?? 0) + 1);
  }
  return counts;
}

function renderTargetButton(target, familyCounts) {
  const status = getTargetStatus(appState.level, appState.puzzle, target.id, appState.runtime);
  const selectedSticker = appState.selectedSheetId
    ? getCurrentSticker(appState.level, appState.puzzle, appState.selectedSheetId, appState.runtime)
    : null;
  const selectedMatch = selectedSticker?.targetId === target.id;
  const hinted =
    appState.puzzle.hintAction?.type === "place" &&
    appState.puzzle.hintAction.targetId === target.id &&
    appState.puzzle.hintAction.sheetId === appState.selectedSheetId;
  const classes = [
    "target-node",
    status.filled ? "is-filled" : "",
    status.open ? "is-open" : "is-locked",
    selectedMatch ? "is-match" : "",
    hinted ? "is-hinted" : "",
    selectedSticker && !selectedMatch && !status.filled ? "is-dimmed" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const variantBadge =
    familyCounts.get(target.family) > 1
      ? `<span class="target-node__variant">${target.variant.toUpperCase()}</span>`
      : "";

  return `
    <button
      class="${classes}"
      data-action="pick-target"
      data-id="${target.id}"
      style="left:${target.x}%; top:${target.y}%; width:${target.w}%; height:${target.h}%; transform:rotate(${target.rotation}deg); --tone:${target.tone}; --trim:${target.trim};"
    >
      <span class="target-node__outline"></span>
      <span class="target-node__label">${target.short}</span>
      ${variantBadge}
      <span class="target-node__name">${target.title}</span>
    </button>
  `;
}

function renderPage() {
  const familyCounts = repeatedFamilyCounts();
  return `
    <div class="page-art" style="--tone-a:${appState.level.page.gradient[0]}; --tone-b:${appState.level.page.gradient[1]}; --tone-c:${appState.level.page.gradient[2]};">
      <div class="page-art__wash"></div>
      ${appState.runtime.targets.map((target) => renderTargetButton(target, familyCounts)).join("")}
    </div>
  `;
}

function renderMechanicTags() {
  return appState.level.mechanics.map((mechanic) => `<span class="tag">${mechanic}</span>`).join("");
}

function renderCallouts() {
  return appState.level.callouts
    .map(
      (callout, index) => `
        <li class="callout-row">
          <span class="callout-row__index">${index + 1}</span>
          <span>${callout.text}</span>
        </li>
      `
    )
    .join("");
}

function renderRewardRail() {
  if (!appState.progress.rewards.length) {
    return `<div class="reward-empty">Clear a page to add the first collage reward.</div>`;
  }

  return appState.progress.rewards
    .slice(-6)
    .map((rewardId) => `<span class="reward-chip">${rewardId.startsWith("daily:") ? rewardId.slice(6) : rewardId.replace("ftue-", "L")}</span>`)
    .join("");
}

function renderToolbar() {
  return `
    <div class="toolbar">
      <button class="ghost-button" data-action="hint">Hint</button>
      <button class="ghost-button" data-action="undo">Undo</button>
      <button class="ghost-button" data-action="restart">Restart</button>
    </div>
  `;
}

function renderTraySection() {
  return `
    <section class="tray-panel">
      <div class="tray-panel__top">
        <div>
          <p class="eyebrow">Sheet Tray</p>
          <h3>Untouched strips stay down here until you start peeling them.</h3>
        </div>
        <p class="meta-copy">${getEmptyClipCount(appState.puzzle)} open clip slot${getEmptyClipCount(appState.puzzle) === 1 ? "" : "s"}.</p>
      </div>
      <div class="tray-grid">${renderTray()}</div>
    </section>
  `;
}

function renderModal() {
  if (!appState.modal) {
    return "";
  }

  if (appState.modal === "start") {
    return `
      <div class="modal-backdrop">
        <section class="modal-card">
          <p class="eyebrow">${formatLevelLabel(appState.level)}</p>
          <h2>${appState.level.title}</h2>
          <p>${appState.level.page.caption}</p>
          <p class="meta-copy">${appState.level.clipCount} clip slot${appState.level.clipCount === 1 ? "" : "s"} • ${appState.level.page.targets.length} silhouettes • ${appState.validation.solution.sequence.length} validated steps</p>
          <ul class="callout-list">${renderCallouts()}</ul>
          <div class="modal-actions">
            <button class="primary-button" data-action="close-modal">Play</button>
          </div>
        </section>
      </div>
    `;
  }

  if (appState.modal === "fail") {
    return `
      <div class="modal-backdrop">
        <section class="modal-card">
          <p class="eyebrow">Page Jammed</p>
          <h2>${appState.puzzle.failReason === "overflow" ? "The active strip needed a free clip." : "No open spot matches any exposed sticker."}</h2>
          <p>${appState.puzzle.message}</p>
          <div class="modal-actions">
            <button class="primary-button" data-action="undo">Undo</button>
            <button class="ghost-button" data-action="hint">Hint</button>
            <button class="ghost-button" data-action="restart">Restart</button>
            <button class="ghost-button" data-action="close-modal">Back</button>
          </div>
        </section>
      </div>
    `;
  }

  return `
    <div class="modal-backdrop">
      <section class="modal-card">
        <p class="eyebrow">Page Cleared</p>
        <h2>${appState.level.reward.title}</h2>
        <p>${appState.level.reward.detail}</p>
        <p class="meta-copy">${appState.level.page.caption}</p>
        <div class="modal-actions">
          <button class="primary-button" data-action="next-level">${
            appState.mode === "campaign" && appState.levelIndex < HANDCRAFTED_LEVELS.length - 1
              ? "Next Page"
              : appState.mode === "daily"
                ? "Replay Daily"
                : isDailyUnlocked()
                  ? "Open Daily"
                  : "Replay"
          }</button>
          <button class="ghost-button" data-action="restart">Replay</button>
          ${
            isDailyUnlocked()
              ? `<button class="ghost-button" data-action="open-daily">Daily</button>`
              : ""
          }
        </div>
      </section>
    </div>
  `;
}

function render() {
  const pack = getCurrentPack();
  const progressPips =
    appState.level.kind === "daily"
      ? `${clearedCampaignCount()} campaign clears`
      : `${getPackProgress(pack.id).cleared} / ${getPackProgress(pack.id).total} pages`;

  root.innerHTML = `
    <div class="shell">
      <section class="hero-card">
        <div class="hero-copy">
          <p class="eyebrow">Sticker Studio</p>
          <h1>Ordered sticker sheets, limited binder clips, one calm scrapbook page at a time.</h1>
          <p>${appState.level.beat}</p>
          ${renderPackMeter()}
        </div>
        <div class="hero-side">
          <div class="mini-card">
            <p class="eyebrow">Current Page</p>
            <h3>${appState.level.title}</h3>
            <p class="meta-copy">${formatLevelLabel(appState.level)} • ${progressPips}</p>
          </div>
          <div class="mini-card">
            <p class="eyebrow">Album Rewards</p>
            <div class="reward-rail">${renderRewardRail()}</div>
          </div>
        </div>
      </section>

      <section class="rail-card">
        <div class="rail-card__top">
          <div>
            <p class="eyebrow">Mainline Pages</p>
            <h3>${pack.title}</h3>
          </div>
          <p class="meta-copy">Daily unlocks after level ${DAILY_UNLOCK_LEVEL}.</p>
        </div>
        <div class="rail-grid">${renderLevelRail()}</div>
        ${renderDailyCard()}
      </section>

      <section class="play-layout">
        <article class="board-card">
          <div class="hud-row">
            <div>
              <p class="eyebrow">${formatLevelLabel(appState.level)}</p>
              <h2>${appState.level.page.title}</h2>
            </div>
            <div class="hud-meta">
              <span>${appState.puzzle.placedTargets.length}/${appState.level.page.targets.length} placed</span>
              <span>${appState.level.clipCount} clips</span>
            </div>
          </div>
          <div class="page-frame">${renderPage()}</div>
          ${renderActiveSheet()}
          <div class="clip-rail">${renderClipRail()}</div>
          ${renderToolbar()}
          ${renderTraySection()}
        </article>

        <aside class="info-card">
          <div class="info-block">
            <p class="eyebrow">Status</p>
            <div class="message-card">${appState.puzzle.message}</div>
          </div>
          <div class="info-block">
            <p class="eyebrow">Mechanics</p>
            <div class="tag-row">${renderMechanicTags()}</div>
          </div>
          <div class="info-block">
            <p class="eyebrow">Callouts</p>
            <ul class="callout-list">${renderCallouts()}</ul>
          </div>
          <div class="info-block">
            <p class="eyebrow">Reward</p>
            <h3>${appState.level.reward.title}</h3>
            <p class="meta-copy">${appState.level.reward.detail}</p>
          </div>
          <div class="info-block">
            <p class="eyebrow">Validation</p>
            <p class="meta-copy">${appState.validation.solution.sequence.length} step solver path • ${appState.validation.ok ? "Validated" : "Needs review"}</p>
          </div>
        </aside>
      </section>

      ${renderModal()}
    </div>
  `;
}

root.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const { action } = target.dataset;
  if (action === "pick-sheet") {
    handleSheetPick(target.dataset.id);
    return;
  }
  if (action === "pick-target") {
    handleTargetPick(target.dataset.id);
    return;
  }
  if (action === "park-active") {
    handlePark();
    return;
  }
  if (action === "hint") {
    appState.modal = null;
    handleHint();
    return;
  }
  if (action === "undo") {
    handleUndo();
    return;
  }
  if (action === "restart") {
    handleRestart();
    return;
  }
  if (action === "close-modal") {
    appState.modal = null;
    render();
    return;
  }
  if (action === "next-level") {
    openNextLevel();
    return;
  }
  if (action === "open-level") {
    openLevelChip(Number(target.dataset.index));
    return;
  }
  if (action === "open-daily") {
    if (!isDailyUnlocked()) {
      setLocalMessage(`Clear level ${DAILY_UNLOCK_LEVEL} to unlock the daily page.`);
      render();
      return;
    }
    loadLevel({ mode: "daily", dailySeed: appState.dailySeed, showStart: true });
  }
});

root.addEventListener("change", (event) => {
  const target = event.target.closest("[data-action='daily-seed']");
  if (!target) {
    return;
  }
  appState.dailySeed = target.value || dailySeedFromDate();
});

loadLevel();
