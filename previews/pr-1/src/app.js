import { dailySeedFromDate, generateDailyLevel } from "./daily.js";
import { HANDCRAFTED_LEVELS, MILESTONE_LEVELS, POSTCARD_SETS } from "./data.js";
import {
  applyAction,
  collectLegalActions,
  createInitialState,
  createRuntime,
  evaluateBundle,
  evaluatePin,
  findHint,
  getRevealRatio,
  isBundleRemoved,
  isPinRemoved,
  restartLevel,
  undoAction,
  validateLevel
} from "./engine.js";

const STORAGE_KEY = "loom-rescue-progress-v1";
const root = document.querySelector("#app");
const CELL_SIZE = 100;
const BUNDLE_OFFSET_SCALE = 18;

const appState = {
  mode: "ftue",
  levelIndex: 0,
  dailySeed: dailySeedFromDate(),
  progress: loadProgress(),
  level: null,
  runtime: null,
  puzzle: null,
  validation: null,
  modal: "start"
};

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return {
      clearedFtue: Array.isArray(parsed.clearedFtue) ? parsed.clearedFtue : [],
      dailySeeds: Array.isArray(parsed.dailySeeds) ? parsed.dailySeeds : [],
      stamps: Array.isArray(parsed.stamps) ? parsed.stamps : []
    };
  } catch {
    return {
      clearedFtue: [],
      dailySeeds: [],
      stamps: []
    };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.progress));
}

function isDailyUnlocked() {
  return appState.progress.clearedFtue.includes("ftue-15");
}

function getPackForLevel(level = appState.level) {
  if (!level || level.kind === "daily") {
    return null;
  }
  return POSTCARD_SETS.find((pack) => pack.id === level.packId) ?? null;
}

function getNextPack(level = appState.level) {
  const pack = getPackForLevel(level);
  if (!pack) {
    return null;
  }
  const index = POSTCARD_SETS.findIndex((entry) => entry.id === pack.id);
  return POSTCARD_SETS[index + 1] ?? null;
}

function getCompletedPackCount() {
  return [...MILESTONE_LEVELS].filter((levelNumber) =>
    appState.progress.stamps.includes(`level:${levelNumber}`)
  ).length;
}

function getPackProgressPercent(level = appState.level, puzzle = appState.puzzle) {
  if (!level) {
    return 0;
  }

  if (level.kind === "daily") {
    return appState.progress.dailySeeds.includes(level.seed) ? 100 : 0;
  }

  const packStart = Math.floor((level.number - 1) / 5) * 5 + 1;
  const packEnd = packStart + 4;
  const packLevels = HANDCRAFTED_LEVELS.filter(
    (entry) => entry.number >= packStart && entry.number <= packEnd
  );
  const clearedCount = packLevels.filter((entry) =>
    appState.progress.clearedFtue.includes(entry.id)
  ).length;

  if (isLevelCleared(level)) {
    return Math.min(100, clearedCount * 20);
  }

  const currentFill = getRevealRatio(level, puzzle) * 20;
  const clearedBeforeCurrent = packLevels.filter(
    (entry) => entry.id !== level.id && appState.progress.clearedFtue.includes(entry.id)
  ).length;
  return Math.min(100, clearedBeforeCurrent * 20 + currentFill);
}

function stampKeyFor(level) {
  if (level.kind === "daily") {
    return `daily:${level.seed}`;
  }
  if (MILESTONE_LEVELS.has(level.number)) {
    return `level:${level.number}`;
  }
  return null;
}

function isLevelCleared(level) {
  if (level.kind === "daily") {
    return appState.progress.dailySeeds.includes(level.seed);
  }
  return appState.progress.clearedFtue.includes(level.id);
}

function recordWin(level) {
  if (level.kind === "daily") {
    if (!appState.progress.dailySeeds.includes(level.seed)) {
      appState.progress.dailySeeds.push(level.seed);
    }
  } else if (!appState.progress.clearedFtue.includes(level.id)) {
    appState.progress.clearedFtue.push(level.id);
  }

  const stampKey = stampKeyFor(level);
  if (stampKey && !appState.progress.stamps.includes(stampKey)) {
    appState.progress.stamps.push(stampKey);
  }

  saveProgress();
}

function loadLevel({
  mode = appState.mode,
  levelIndex = appState.levelIndex,
  dailySeed = appState.dailySeed,
  showStart = true
} = {}) {
  const dailyMode = mode === "daily" && isDailyUnlocked();

  appState.mode = dailyMode ? "daily" : "ftue";
  appState.levelIndex = dailyMode ? levelIndex : Math.min(levelIndex, HANDCRAFTED_LEVELS.length - 1);
  appState.dailySeed = dailySeed;
  appState.level =
    dailyMode ? generateDailyLevel(dailySeed) : HANDCRAFTED_LEVELS[appState.levelIndex];
  appState.runtime = createRuntime(appState.level);
  appState.puzzle = createInitialState(appState.level);
  appState.validation = validateLevel(appState.level);
  appState.modal = showStart ? "start" : null;
  document.title =
    appState.level.kind === "daily"
      ? `Loom Rescue • Daily ${appState.level.seed}`
      : `Loom Rescue • Level ${appState.level.number}`;
  render();
}

function currentStampEarned() {
  const stampKey = stampKeyFor(appState.level);
  return stampKey ? appState.progress.stamps.includes(stampKey) : false;
}

function handleBundle(bundleId) {
  appState.puzzle = applyAction(
    appState.level,
    appState.puzzle,
    { type: "bundle", id: bundleId },
    appState.runtime
  );

  if (appState.puzzle.completed) {
    recordWin(appState.level);
    appState.modal = "win";
  } else if (appState.puzzle.failed) {
    appState.modal = "fail";
  }

  render();
}

function handlePin(pinId) {
  appState.puzzle = applyAction(
    appState.level,
    appState.puzzle,
    { type: "pin", id: pinId },
    appState.runtime
  );
  if (appState.puzzle.failed) {
    appState.modal = "fail";
  }
  render();
}

function openNextLevel() {
  if (appState.mode === "ftue" && appState.levelIndex < HANDCRAFTED_LEVELS.length - 1) {
    loadLevel({ levelIndex: appState.levelIndex + 1, showStart: true });
    return;
  }
  loadLevel({ mode: "daily", dailySeed: appState.dailySeed, showStart: true });
}

function arrowFor(direction) {
  return {
    up: "↑",
    right: "→",
    down: "↓",
    left: "←"
  }[direction];
}

function statusForBundle(bundle) {
  const removed = isBundleRemoved(appState.puzzle, bundle.id);
  if (removed) {
    return { label: "Cleared", className: "is-cleared" };
  }

  const evaluation = evaluateBundle(appState.level, appState.puzzle, bundle.id, appState.runtime);
  if (evaluation.ok) {
    return { label: "Loose", className: "is-ready" };
  }

  return { label: "Blocked", className: "is-blocked", reason: evaluation.reason };
}

function pointToScreen(point, bundle) {
  return {
    x: point.x * CELL_SIZE + CELL_SIZE / 2 + (bundle.offset?.x ?? 0) * BUNDLE_OFFSET_SCALE,
    y: point.y * CELL_SIZE + CELL_SIZE / 2 + (bundle.offset?.y ?? 0) * BUNDLE_OFFSET_SCALE
  };
}

function pathFromBundle(bundle) {
  return bundle.points
    .map((point, index) => {
      const screen = pointToScreen(point, bundle);
      return `${index === 0 ? "M" : "L"} ${screen.x} ${screen.y}`;
    })
    .join(" ");
}

function renderBoardSvg() {
  const hintAction = appState.puzzle.hintAction;

  const guides = appState.runtime.guides
    .map((guide) =>
      guide.cells
        .map((cell) => {
          const x = cell.x * CELL_SIZE + 14;
          const y = cell.y * CELL_SIZE + 14;
          return `
            <g class="guide-cluster">
              <rect x="${x}" y="${y}" width="72" height="32" rx="12" />
              <text x="${x + 36}" y="${y + 22}" text-anchor="middle">${arrowFor(guide.direction)}</text>
            </g>
          `;
        })
        .join("")
    )
    .join("");

  const crossings = appState.runtime.crossings
    .map((crossing) => {
      const over = appState.runtime.bundleMap.get(crossing.over);
      const under = appState.runtime.bundleMap.get(crossing.under);
      const centerX = crossing.cell.x * CELL_SIZE + CELL_SIZE / 2;
      const centerY = crossing.cell.y * CELL_SIZE + CELL_SIZE / 2;
      const inactive =
        isBundleRemoved(appState.puzzle, crossing.over) ||
        isBundleRemoved(appState.puzzle, crossing.under);

      return `
        <g class="crossing-badge ${inactive ? "is-inactive" : ""}" transform="translate(${centerX} ${centerY})">
          <rect x="-24" y="-18" width="48" height="36" rx="12"></rect>
          <rect x="-16" y="2" width="32" height="10" rx="5" fill="${under.color}"></rect>
          <rect x="-16" y="-12" width="32" height="10" rx="5" fill="${over.color}"></rect>
          <text y="-20" text-anchor="middle">${over.id}</text>
        </g>
      `;
    })
    .join("");

  const pins = appState.runtime.pins
    .filter(
      (pin) =>
        !isPinRemoved(appState.puzzle, pin.id) &&
        pin.blocks.some((bundleId) => !isBundleRemoved(appState.puzzle, bundleId))
    )
    .map((pin) => {
      const evaluation = evaluatePin(appState.level, appState.puzzle, pin.id, appState.runtime);
      const x = pin.cell.x * CELL_SIZE + CELL_SIZE / 2;
      const y = pin.cell.y * CELL_SIZE + CELL_SIZE / 2;
      return `
        <g class="pin-node ${evaluation.ok ? "is-ready" : "is-blocked"}" data-action="pin" data-id="${pin.id}" transform="translate(${x} ${y})">
          <circle r="22"></circle>
          <text text-anchor="middle" y="7">PIN</text>
        </g>
      `;
    })
    .join("");

  const bundles = appState.runtime.bundles
    .map((bundle) => {
      const removed = isBundleRemoved(appState.puzzle, bundle.id);
      const evaluation = evaluateBundle(appState.level, appState.puzzle, bundle.id, appState.runtime);
      const isHint = hintAction?.type === "bundle" && hintAction.id === bundle.id;
      const path = pathFromBundle(bundle);
      const start = pointToScreen(bundle.points[0], bundle);
      const end = pointToScreen(bundle.points[bundle.points.length - 1], bundle);
      const classNames = [
        "thread-bundle",
        removed ? "is-removed" : "",
        evaluation.ok ? "is-ready" : "is-blocked",
        isHint ? "is-hinted" : ""
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <g class="${classNames}" data-action="bundle" data-id="${bundle.id}">
          <path class="thread-shadow" d="${path}"></path>
          <path class="thread-main" d="${path}" stroke="${bundle.color}"></path>
          <path class="thread-hit" d="${path}"></path>
          <circle class="exit-chip ${isHint ? "is-hinted" : ""}" cx="${start.x}" cy="${start.y}" r="18"></circle>
          <text class="exit-arrow ${isHint ? "is-hinted" : ""}" x="${start.x}" y="${start.y + 6}" text-anchor="middle">${arrowFor(
            bundle.pullDirection
          )}</text>
          <text class="bundle-tag" x="${end.x + 14}" y="${end.y - 10}">${bundle.id}</text>
        </g>
      `;
    })
    .join("");

  return `
    <svg class="board-svg" viewBox="0 0 600 800" aria-label="Loom Rescue board">
      <defs>
        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(115, 87, 58, 0.12)" stroke-width="1.4"></path>
        </pattern>
      </defs>
      <rect class="board-grid" width="600" height="800"></rect>
      <rect class="board-grid-lines" width="600" height="800" fill="url(#grid)"></rect>
      ${guides}
      ${bundles}
      ${crossings}
      ${pins}
    </svg>
  `;
}

function renderBundleTray() {
  return appState.runtime.bundles
    .map((bundle) => {
      const status = statusForBundle(bundle);
      const hint = appState.puzzle.hintAction?.type === "bundle" && appState.puzzle.hintAction.id === bundle.id;
      return `
        <button class="bundle-pill ${status.className} ${hint ? "is-hinted" : ""}" data-action="bundle" data-id="${bundle.id}">
          <span class="bundle-pill__head">${bundle.id} ${arrowFor(bundle.pullDirection)} ${bundle.name}</span>
          <span class="bundle-pill__meta">${status.reason ?? status.label}</span>
        </button>
      `;
    })
    .join("");
}

function renderRemainingList() {
  return appState.runtime.bundles
    .map((bundle) => {
      const status = statusForBundle(bundle);
      return `
        <li class="status-row ${status.className}">
          <span class="status-row__name">${bundle.id} ${bundle.name}</span>
          <span class="status-row__value">${status.label}</span>
        </li>
      `;
    })
    .join("");
}

function renderSolutionSequence() {
  const steps = appState.validation.solution.sequence
    .map((action) => {
      if (action.type === "pin") {
        return `Lift ${appState.runtime.pinMap.get(action.id)?.name ?? action.id}`;
      }
      return `Pull ${appState.runtime.bundleMap.get(action.id)?.name ?? action.id}`;
    })
    .join(" → ");

  return steps || "Validator did not need a sequence.";
}

function renderKnotMeter() {
  return Array.from({ length: appState.level.failLimit }, (_, index) => {
    const filled = index < appState.puzzle.knots;
    return `<span class="knot ${filled ? "is-filled" : ""}"></span>`;
  }).join("");
}

function renderModal() {
  if (!appState.modal) {
    return "";
  }

  const pack = getPackForLevel();
  const nextPack = getNextPack();
  const packProgress = Math.round(getPackProgressPercent());

  if (appState.modal === "start") {
    return `
      <div class="modal-backdrop">
        <section class="modal-card">
          <p class="modal-kicker">${appState.level.kind === "daily" ? "Daily Challenge" : `Level ${appState.level.number}`}</p>
          <h2>${appState.level.title}</h2>
          <p>${appState.level.beat}</p>
          <p class="modal-support">${
            appState.level.kind === "daily"
              ? `Foil stamp board • Seed ${appState.level.seed} • 2-knot limit`
              : `${pack?.title ?? "Postcard pack"} • ${packProgress}% stitched • ${appState.level.failLimit}-knot meter`
          }</p>
          <ul class="modal-list">
            ${appState.level.mechanics.map((mechanic) => `<li>${mechanic}</li>`).join("")}
          </ul>
          <button class="primary-button" data-action="start-level">Play</button>
        </section>
      </div>
    `;
  }

  if (appState.modal === "fail") {
    return `
      <div class="modal-backdrop">
        <section class="modal-card">
          <p class="modal-kicker">Knotted Shut</p>
          <h2>The loom locked before the postcard cleared.</h2>
          <p>${appState.puzzle.message}</p>
          <div class="modal-actions">
            <button class="primary-button" data-action="retry-level">Retry</button>
            <button class="ghost-button" data-action="fail-hint">Hint</button>
            <button class="ghost-button" data-action="quit-level">Quit to Packs</button>
          </div>
        </section>
      </div>
    `;
  }

  if (appState.modal === "postcard") {
    return `
      <div class="modal-backdrop">
        <section class="modal-card postcard-card">
          <p class="modal-kicker">${appState.level.kind === "daily" ? "Foil Stamp" : "Postcard Reveal"}</p>
          <h2>${appState.level.postcard.title}</h2>
          <p>${appState.level.postcard.caption}</p>
          <div class="modal-postcard modal-postcard--full" style="--tone-a:${appState.level.postcard.gradient[0]}; --tone-b:${appState.level.postcard.gradient[1]}; --tone-c:${appState.level.postcard.gradient[2]};">
            <span>${appState.level.kind === "daily" ? "DAILY" : `${pack?.title ?? "FTUE"}`}</span>
          </div>
          ${
            appState.level.kind === "ftue" && MILESTONE_LEVELS.has(appState.level.number)
              ? `<div class="next-pack-preview">
                   <p class="next-pack-preview__label">Next Pack Preview</p>
                   <strong>${nextPack?.title ?? "Daily Foil Stamp"}</strong>
                   <span>${nextPack ? `Unlocked after ${pack?.title}.` : "Daily challenge now available."}</span>
                 </div>`
              : ""
          }
          <div class="modal-actions">
            <button class="primary-button" data-action="next-level">${
              appState.mode === "ftue" && appState.levelIndex < HANDCRAFTED_LEVELS.length - 1
                ? "Next Level"
                : appState.mode === "daily"
                  ? "Replay Daily"
                  : "Open Daily"
            }</button>
            <button class="ghost-button" data-action="close-postcard">Back</button>
          </div>
        </section>
      </div>
    `;
  }

  const stampKey = stampKeyFor(appState.level);
  const stampLine = stampKey
    ? `<p class="stamp-line">${currentStampEarned() ? (appState.level.kind === "daily" ? "Foil stamp added to album." : "Stamp added to album.") : "Stamp ready."}</p>`
    : "";

  return `
    <div class="modal-backdrop">
      <section class="modal-card win-card">
        <p class="modal-kicker">Postcard Restored</p>
        <h2>${appState.level.postcard.title}</h2>
        <p>${appState.level.postcard.caption}</p>
        <div class="modal-postcard" style="--tone-a:${appState.level.postcard.gradient[0]}; --tone-b:${appState.level.postcard.gradient[1]}; --tone-c:${appState.level.postcard.gradient[2]};">
          <span>${appState.level.kind === "daily" ? "DAILY" : `FTUE ${appState.level.number}`}</span>
        </div>
        ${stampLine}
        <div class="modal-actions">
          <button class="primary-button" data-action="next-level">${
            appState.mode === "ftue" && appState.levelIndex < HANDCRAFTED_LEVELS.length - 1
              ? "Next Level"
              : appState.mode === "daily"
                ? "Replay Daily"
                : "Open Daily"
          }</button>
          <button class="ghost-button" data-action="view-postcard">View Postcard</button>
        </div>
      </section>
    </div>
  `;
}

function render() {
  const revealPercent = Math.round(getRevealRatio(appState.level, appState.puzzle) * 100);
  const completedPacks = getCompletedPackCount();
  const legalActions = collectLegalActions(appState.level, appState.puzzle, appState.runtime);
  const currentPack = getPackForLevel();
  const packProgress = Math.round(getPackProgressPercent());
  const dailyUnlocked = isDailyUnlocked();

  root.innerHTML = `
    <div class="shell">
      <header class="hero-card">
        <div>
          <p class="eyebrow">Loom Rescue</p>
          <h1>Restore quiet postcard scenes by releasing thread bundles in the right order.</h1>
          <p class="hero-copy">
            Whole bundles only. Static guides. Crossing order and pin timing carry the puzzle.
          </p>
        </div>
        <section class="album-card">
          <p class="album-card__label">Album Progress</p>
          <p class="album-card__value">${completedPacks}/3 postcard sets</p>
          <p class="album-card__sub">${appState.progress.clearedFtue.length}/15 level repairs complete</p>
          <div class="meter">
            <span style="width:${(appState.progress.clearedFtue.length / 15) * 100}%"></span>
          </div>
          <div class="stamp-grid">
            <span class="stamp ${appState.progress.stamps.includes("level:5") ? "is-earned" : ""}">L5</span>
            <span class="stamp ${appState.progress.stamps.includes("level:10") ? "is-earned" : ""}">L10</span>
            <span class="stamp ${appState.progress.stamps.includes("level:15") ? "is-earned" : ""}">L15</span>
            <span class="stamp ${
              appState.progress.stamps.includes(`daily:${appState.dailySeed}`) ? "is-earned" : ""
            }">DAY</span>
          </div>
        </section>
      </header>

      <section class="level-rail">
        <div class="level-rail__list">
          ${HANDCRAFTED_LEVELS.map(
            (level, index) => `
              <button class="rail-chip ${
                appState.mode === "ftue" && appState.levelIndex === index ? "is-active" : ""
              } ${appState.progress.clearedFtue.includes(level.id) ? "is-cleared" : ""}" data-action="select-ftue" data-index="${index}">
                ${level.number}
              </button>
            `
          ).join("")}
        </div>
        <div class="daily-rail">
          <label>
            <span>Daily Seed</span>
            <input type="date" value="${appState.dailySeed}" data-seed-input ${dailyUnlocked ? "" : "disabled"} />
          </label>
          <button class="rail-chip ${appState.mode === "daily" ? "is-active" : ""} ${dailyUnlocked ? "" : "is-locked"}" data-action="select-daily" ${dailyUnlocked ? "" : "disabled"}>
            ${dailyUnlocked ? "Daily" : "Daily Locked"}
          </button>
        </div>
      </section>

      <main class="play-layout">
        <section class="board-card">
          <div class="board-card__top">
            <div class="board-card__heading">
              <button class="ghost-button board-back" data-action="quit-level">Back</button>
              <div>
              <p class="board-card__kicker">${appState.level.kind === "daily" ? "Daily Challenge" : `Level ${appState.level.number}`}</p>
              <h2>${appState.level.title}</h2>
              <p>${appState.level.postcard.caption}</p>
              </div>
            </div>
            <div class="hud-block">
              <span class="hud-label">${appState.level.kind === "daily" ? "Foil Stamp" : currentPack?.title ?? "Postcard Pack"}</span>
              <div class="meter hud-meter">
                <span style="width:${appState.level.kind === "daily" ? revealPercent : packProgress}%"></span>
              </div>
              <span class="hud-label">Knots</span>
              <div class="knot-meter">${renderKnotMeter()}</div>
              <span class="hud-label">Reveal ${revealPercent}%</span>
            </div>
          </div>

          <div class="board-frame">
            <div class="postcard-art" style="--reveal:${revealPercent}%; --tone-a:${appState.level.postcard.gradient[0]}; --tone-b:${appState.level.postcard.gradient[1]}; --tone-c:${appState.level.postcard.gradient[2]};"></div>
            ${renderBoardSvg()}
          </div>

          <div class="toolbar">
            <button class="ghost-button" data-action="undo">Undo</button>
            <button class="ghost-button" data-action="hint">Hint</button>
            <button class="ghost-button" data-action="restart-level">Restart</button>
          </div>

          <section class="bundle-tray">
            ${renderBundleTray()}
          </section>
        </section>

        <aside class="info-column">
          <section class="info-card message-card">
            <p class="info-card__label">Local Read</p>
            <p class="message-text">${appState.puzzle.message}</p>
            <p class="message-foot">${legalActions.length} legal action${legalActions.length === 1 ? "" : "s"} visible.</p>
          </section>

          <section class="info-card">
            <p class="info-card__label">Postcard Fill</p>
            <h3>${appState.level.kind === "daily" ? "Daily Foil Stamp" : currentPack?.title ?? appState.level.postcard.title}</h3>
            <p>${appState.level.beat}</p>
            <div class="meter">
              <span style="width:${appState.level.kind === "daily" ? revealPercent : packProgress}%"></span>
            </div>
            <p class="info-foot">${
              appState.level.kind === "daily"
                ? `Seed ${appState.level.seed} • first clear awards a foil stamp`
                : `${packProgress}% of the current 5-level postcard set is stitched`
            }</p>
          </section>

          <section class="info-card">
            <p class="info-card__label">Board Status</p>
            <ul class="status-list">
              ${renderRemainingList()}
            </ul>
          </section>

          <section class="info-card">
            <p class="info-card__label">Validator Notes</p>
            <p class="validator-copy">${appState.validation.ok ? "This board validates from data with one legal solution path available." : "Validator warning."}</p>
            <p class="validator-sequence">${renderSolutionSequence()}</p>
          </section>

          <section class="info-card">
            <p class="info-card__label">Implementation Notes</p>
            <ul class="note-list">
              <li>Dense boards stay readable by offsetting route render lanes, but a production art pass should strengthen true over/under depth cues.</li>
              <li>The built-in validator is enough for this slice because pins and crossings only remove blockers; if rules become dynamic, replace it with a deeper solver.</li>
              <li>QA focus: invalid pull copy, deadlock fail messaging, daily 2-knot tuning, and whether the portrait layout stays legible on narrow screens.</li>
            </ul>
          </section>
        </aside>
      </main>
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
  if (action === "select-ftue") {
    loadLevel({ mode: "ftue", levelIndex: Number(target.dataset.index), showStart: true });
    return;
  }

  if (action === "select-daily") {
    if (isDailyUnlocked()) {
      loadLevel({ mode: "daily", dailySeed: appState.dailySeed, showStart: true });
    }
    return;
  }

  if (action === "start-level") {
    appState.modal = null;
    render();
    return;
  }

  if (action === "bundle") {
    if (!appState.modal) {
      handleBundle(target.dataset.id);
    }
    return;
  }

  if (action === "pin") {
    if (!appState.modal) {
      handlePin(target.dataset.id);
    }
    return;
  }

  if (action === "undo") {
    appState.puzzle = undoAction(appState.puzzle);
    appState.modal = null;
    render();
    return;
  }

  if (action === "hint") {
    const hint = findHint(appState.level, appState.puzzle, appState.runtime);
    appState.puzzle = {
      ...appState.puzzle,
      hintAction: hint.action,
      message: hint.message
    };
    render();
    return;
  }

  if (action === "restart-level") {
    appState.puzzle = restartLevel(appState.level);
    appState.modal = "start";
    render();
    return;
  }

  if (action === "retry-level") {
    appState.puzzle = restartLevel(appState.level);
    appState.modal = null;
    render();
    return;
  }

  if (action === "fail-hint") {
    appState.puzzle = restartLevel(appState.level);
    const hint = findHint(appState.level, appState.puzzle, appState.runtime);
    appState.puzzle = {
      ...appState.puzzle,
      hintAction: hint.action,
      message: hint.message
    };
    appState.modal = null;
    render();
    return;
  }

  if (action === "quit-level") {
    appState.puzzle = restartLevel(appState.level);
    appState.modal = "start";
    render();
    return;
  }

  if (action === "view-postcard") {
    appState.modal = "postcard";
    render();
    return;
  }

  if (action === "close-postcard") {
    appState.modal = "win";
    render();
    return;
  }

  if (action === "next-level") {
    openNextLevel();
  }
});

root.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.matches("[data-seed-input]") && target.value) {
    appState.dailySeed = target.value;
    if (appState.mode === "daily" && isDailyUnlocked()) {
      loadLevel({ mode: "daily", dailySeed: target.value, showStart: true });
    } else {
      render();
    }
  }
});

loadLevel();
