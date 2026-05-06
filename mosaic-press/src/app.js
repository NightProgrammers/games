import { DAILY_THEME, DAILY_UNLOCK_LEVEL, HANDCRAFTED_LEVELS, PACKS, STORAGE_KEY } from "./data.js";
import { dailySeedFromDate, generateDailyLevel } from "./daily.js";
import {
  applyAction,
  collectVisibleFasteners,
  createInitialState,
  createRuntime,
  findHint,
  getFillRatio,
  getFrontStrip,
  restartLevel,
  undoAction
} from "./engine.js";

const root = document.querySelector("#app");

const appState = {
  screen: "gallery",
  mode: "ftue",
  levelIndex: 0,
  dailySeed: dailySeedFromDate(),
  progress: loadProgress(),
  level: null,
  runtime: null,
  puzzle: null,
  modal: null
};

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return {
      clearedLevelIds: Array.isArray(parsed.clearedLevelIds) ? parsed.clearedLevelIds : [],
      dailySeeds: Array.isArray(parsed.dailySeeds) ? parsed.dailySeeds : [],
      rewards: Array.isArray(parsed.rewards) ? parsed.rewards : []
    };
  } catch {
    return {
      clearedLevelIds: [],
      dailySeeds: [],
      rewards: []
    };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.progress));
}

function isLevelCleared(level) {
  return appState.progress.clearedLevelIds.includes(level.id);
}

function isDailyCleared(seed = appState.dailySeed) {
  return appState.progress.dailySeeds.includes(seed);
}

function isLevelUnlocked(index) {
  if (index === 0) {
    return true;
  }
  return appState.progress.clearedLevelIds.includes(HANDCRAFTED_LEVELS[index - 1].id);
}

function isDailyUnlocked() {
  return appState.progress.clearedLevelIds.includes(HANDCRAFTED_LEVELS[DAILY_UNLOCK_LEVEL - 1].id);
}

function recordWin(level) {
  if (level.kind === "daily") {
    if (!appState.progress.dailySeeds.includes(level.seed)) {
      appState.progress.dailySeeds.push(level.seed);
    }
  } else if (!appState.progress.clearedLevelIds.includes(level.id)) {
    appState.progress.clearedLevelIds.push(level.id);
  }

  if (level.reward?.title && !appState.progress.rewards.includes(level.reward.title)) {
    appState.progress.rewards.push(level.reward.title);
  }

  saveProgress();
}

function currentLevel() {
  return appState.level;
}

function currentPack() {
  if (!appState.level || appState.level.kind === "daily") {
    return DAILY_THEME;
  }
  return PACKS.find((pack) => pack.id === appState.level.packId) ?? PACKS[0];
}

function levelLabel(level = currentLevel()) {
  if (!level) {
    return "";
  }
  return level.kind === "daily" ? `Daily • ${level.seed}` : `Level ${level.number}`;
}

function loadLevel({ mode = "ftue", levelIndex = 0, showStart = true, dailySeed = appState.dailySeed } = {}) {
  appState.mode = mode;
  appState.levelIndex = levelIndex;
  appState.dailySeed = dailySeed;
  appState.level = mode === "daily" ? generateDailyLevel(dailySeed) : HANDCRAFTED_LEVELS[levelIndex];
  appState.runtime = createRuntime(appState.level);
  appState.puzzle = createInitialState(appState.level);
  appState.screen = "level";
  appState.modal = showStart ? "start" : null;
  document.title = `Mosaic Press • ${levelLabel(appState.level)}`;
  render();
}

function backToGallery() {
  appState.screen = "gallery";
  appState.modal = null;
  document.title = "Mosaic Press";
  render();
}

function openNextLevel() {
  if (appState.level.kind === "daily") {
    backToGallery();
    return;
  }

  if (appState.levelIndex < HANDCRAFTED_LEVELS.length - 1) {
    loadLevel({ levelIndex: appState.levelIndex + 1, showStart: true });
    return;
  }

  backToGallery();
}

function applyHint() {
  const hint = findHint(appState.level, appState.puzzle, appState.runtime);
  appState.puzzle = {
    ...appState.puzzle,
    hintAction: hint.action,
    message: hint.message
  };
  render();
}

function performUndo() {
  appState.puzzle = undoAction(appState.puzzle);
  if (!appState.puzzle.failed) {
    appState.modal = null;
  }
  render();
}

function performRestart(showStart = false) {
  appState.puzzle = restartLevel(appState.level);
  appState.modal = showStart ? "start" : null;
  render();
}

function handleFastener(id) {
  appState.puzzle = applyAction(
    appState.level,
    appState.puzzle,
    { type: "fastener", id },
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

function getPackLevels(packId) {
  return HANDCRAFTED_LEVELS.filter((level) => level.packId === packId);
}

function getPackProgress(packId) {
  const levels = getPackLevels(packId);
  const cleared = levels.filter((level) => isLevelCleared(level)).length;
  return {
    cleared,
    total: levels.length
  };
}

function formatFastenerLabel(type) {
  return {
    clamp: "Clamp",
    wax: "Wax",
    spacer: "Spacer"
  }[type];
}

function fastenerGlyph(type) {
  return {
    clamp: "C",
    wax: "W",
    spacer: "S"
  }[type];
}

function rowEntryGlyph(entry) {
  return entry === "left" ? ">>" : "<<";
}

function visibleFastenerMap() {
  return new Map(
    collectVisibleFasteners(appState.level, appState.puzzle, appState.runtime).map((entry) => [
      entry.fastener.id,
      entry
    ])
  );
}

function cellMap() {
  return new Map(appState.level.tray.cells.map((cell) => [cell.id, cell]));
}

function renderGallery() {
  return `
    <section class="gallery-screen">
      <header class="hero">
        <div class="hero__copy">
          <p class="eyebrow">Cozy Release-Order Mosaic Puzzle</p>
          <h1>Mosaic Press</h1>
          <p class="hero__text">Lift clamps, wax tabs, and paper spacers so ceramic strips can slide into the right tray cells before the gutter seals shut.</p>
        </div>
        <div class="hero__status">
          <div class="hero__stat">
            <span>Cleared cards</span>
            <strong>${appState.progress.clearedLevelIds.length}/12</strong>
          </div>
          <div class="hero__stat">
            <span>Daily ledger</span>
            <strong>${appState.progress.dailySeeds.length}</strong>
          </div>
          <div class="hero__stat">
            <span>Frames & stamps</span>
            <strong>${appState.progress.rewards.length}</strong>
          </div>
        </div>
      </header>
      <section class="gallery-card gallery-card--daily">
        <div>
          <p class="eyebrow">Daily Commission</p>
          <h2>${DAILY_THEME.title}</h2>
          <p>${isDailyUnlocked() ? "Deterministic UTC board with already-unlocked mechanics." : `Unlocks after level ${DAILY_UNLOCK_LEVEL}.`}</p>
        </div>
        <div class="gallery-card__actions">
          <button class="button ${isDailyUnlocked() ? "" : "button--ghost"}" data-action="open-daily" ${isDailyUnlocked() ? "" : "disabled"}>
            ${isDailyUnlocked() ? `Open ${appState.dailySeed}` : "Locked"}
          </button>
          <span class="gallery-pill">${isDailyCleared() ? "Cleared today" : "Not cleared today"}</span>
        </div>
      </section>
      ${PACKS.map((pack) => renderPackSection(pack)).join("")}
    </section>
  `;
}

function renderPackSection(pack) {
  const progress = getPackProgress(pack.id);
  const levels = getPackLevels(pack.id);

  return `
    <section class="gallery-pack" style="--pack-accent:${pack.accent};">
      <header class="gallery-pack__header">
        <div>
          <p class="eyebrow">${progress.cleared}/${progress.total} cleared</p>
          <h2>${pack.title}</h2>
        </div>
        <span class="gallery-pill">${pack.rewardTitle}</span>
      </header>
      <div class="level-grid">
        ${levels
          .map((level) => {
            const index = HANDCRAFTED_LEVELS.findIndex((entry) => entry.id === level.id);
            const unlocked = isLevelUnlocked(index);
            const cleared = isLevelCleared(level);
            const state = cleared ? "cleared" : unlocked ? "open" : "locked";
            return `
              <article class="level-tile level-tile--${state}">
                <div class="level-tile__head">
                  <span>${level.number}</span>
                  <strong>${level.title}</strong>
                </div>
                <p>${level.beat}</p>
                <button class="button ${cleared ? "button--ghost" : ""}" data-action="open-level" data-level-index="${index}" ${
                  unlocked ? "" : "disabled"
                }>
                  ${cleared ? "Replay" : unlocked ? "Play" : "Locked"}
                </button>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderLevel() {
  const level = currentLevel();
  const pack = currentPack();
  const fasteners = visibleFastenerMap();
  const cellsById = cellMap();
  const progress = Math.round(getFillRatio(level, appState.puzzle, appState.runtime) * 100);

  return `
    <section class="play-screen" style="--pack-accent:${pack.accent};">
      <header class="hud">
        <div class="hud__left">
          <button class="hud__back" data-action="back">Gallery</button>
          <div>
            <p class="eyebrow">${pack.title}</p>
            <h1>${levelLabel(level)}</h1>
          </div>
        </div>
        <div class="hud__meta">
          <span class="gallery-pill">${progress}% filled</span>
          <button class="hud__button" data-action="undo">Undo</button>
          <button class="hud__button" data-action="hint">Hint</button>
          <button class="hud__button" data-action="restart">Restart</button>
        </div>
      </header>
      <section class="card-ribbon">
        <div class="card-ribbon__copy">
          <p class="eyebrow">${level.title}</p>
          <h2>${level.card.caption}</h2>
        </div>
        <div class="card-ribbon__preview">
          ${renderPreviewRows(level, cellsById)}
        </div>
      </section>
      <section class="press-field">
        <div class="press-field__board">
          ${level.stacks.map((stack) => renderStack(stack, fasteners)).join("")}
        </div>
        <aside class="beat-panel">
          <div class="beat-panel__chip">${level.mechanics.join(" • ")}</div>
          <p>${appState.puzzle.message}</p>
          ${renderContextCallout()}
        </aside>
      </section>
      <section class="tray">
        ${level.tray.rows.map((row) => renderRow(row, cellsById)).join("")}
      </section>
      ${renderModal()}
    </section>
  `;
}

function renderPreviewRows(level, cellsById) {
  return level.tray.rows
    .map(
      (row) => `
        <div class="preview-row preview-row--${row.entry}">
          <span class="preview-row__entry">${rowEntryGlyph(row.entry)}</span>
          ${row.cellIds
            .map((cellId) => {
              const cell = cellsById.get(cellId);
              const filled = appState.puzzle.filledCells.includes(cellId);
              return `
                <div class="preview-cell ${filled ? "is-filled" : ""}" style="--tone:${cell.tone};--trim:${cell.trim};">
                  <span>${cell.short}</span>
                </div>
              `;
            })
            .join("")}
        </div>
      `
    )
    .join("");
}

function renderStack(stack, fasteners) {
  const unresolved = stack.stripIds
    .map((stripId) => appState.runtime.stripMap.get(stripId))
    .filter((strip) => !appState.puzzle.resolvedStrips.includes(strip.id));
  const frontStrip = getFrontStrip(appState.runtime, appState.puzzle, stack.id);

  return `
    <article class="stack ${frontStrip ? "" : "stack--cleared"}">
      <header class="stack__header">
        <span>Stack ${stack.laneIndex + 1}</span>
        <strong>${stack.title}</strong>
      </header>
      <div class="stack__body">
        ${unresolved
          .map((strip, index) => renderStrip(strip, index, strip.id === frontStrip?.id, fasteners))
          .reverse()
          .join("")}
        ${!unresolved.length ? '<div class="stack__empty">Cleared</div>' : ""}
      </div>
    </article>
  `;
}

function renderStrip(strip, index, isFront, fasteners) {
  const hintId = appState.puzzle.hintAction?.id;
  const stackDepth = Math.max(0, 18 - index * 6);

  return `
    <div class="strip-card ${isFront ? "is-front" : "is-hidden"}" style="--lift:${stackDepth}px;">
      <div class="strip-card__meta">
        <strong>${strip.name}</strong>
        <span>${appState.runtime.rowMap.get(strip.rowId)?.title ?? strip.rowId}</span>
      </div>
      <div class="strip-card__shards">
        ${strip.shards
          .map(
            (shard) => `
              <div class="strip-shard" style="--tone:${shard.tone};--trim:${shard.trim};">
                <span>${shard.short}</span>
              </div>
            `
          )
          .join("")}
      </div>
      ${
        isFront
          ? strip.blockerIds
              .map((fastenerId) => {
                const entry = fasteners.get(fastenerId);
                if (!entry) {
                  return "";
                }
                return `
                  <button
                    class="fastener fastener--${entry.fastener.type} fastener--${entry.fastener.slot} ${
                      entry.removable ? "" : "is-locked"
                    } ${hintId === fastenerId ? "is-hint" : ""}"
                    data-action="fastener"
                    data-fastener-id="${fastenerId}"
                    aria-label="${formatFastenerLabel(entry.fastener.type)} on ${strip.name}"
                    title="${entry.reason}"
                  >
                    <span>${fastenerGlyph(entry.fastener.type)}</span>
                  </button>
                `;
              })
              .join("")
          : ""
      }
    </div>
  `;
}

function renderRow(row, cellsById) {
  const overflowPath = appState.puzzle.lastEvent?.type === "overflow" ? appState.puzzle.lastEvent.pathCellIds ?? [] : [];
  return `
    <article class="tray-row tray-row--${row.entry}">
      <header class="tray-row__header">
        <strong>${row.title}</strong>
        <span>${row.entry === "left" ? "Left entry" : "Right entry"}</span>
      </header>
      <div class="tray-row__cells">
        <span class="tray-row__entry">${rowEntryGlyph(row.entry)}</span>
        ${row.cellIds
          .map((cellId) => {
            const cell = cellsById.get(cellId);
            const filled = appState.puzzle.filledCells.includes(cellId);
            return `
              <div
                class="tray-cell ${filled ? "is-filled" : "is-open"} ${overflowPath.includes(cellId) ? "is-overflow" : ""}"
                style="--tone:${cell.tone};--trim:${cell.trim};--glaze:${cell.glaze};"
              >
                <span>${cell.short}</span>
              </div>
            `;
          })
          .join("")}
      </div>
    </article>
  `;
}

function renderContextCallout() {
  const failTrigger = appState.puzzle.failed ? `fail:${appState.puzzle.failReason}` : null;
  const winTrigger = appState.puzzle.completed ? "win" : null;
  const callout = currentLevel().callouts.find((entry) => entry.trigger === failTrigger || entry.trigger === winTrigger);
  if (!callout) {
    return "";
  }

  return `<p class="context-callout">${callout.text}</p>`;
}

function renderModal() {
  if (!appState.modal) {
    return "";
  }

  if (appState.modal === "start") {
    return `
      <div class="modal-shell">
        <div class="modal-card">
          <p class="eyebrow">${levelLabel()}</p>
          <h2>${currentLevel().title}</h2>
          <p>${currentLevel().beat}</p>
          <div class="modal-card__callouts">
            ${currentLevel().callouts
              .filter((entry) => entry.trigger === "start")
              .map((entry) => `<p>${entry.text}</p>`)
              .join("")}
          </div>
          <div class="modal-card__actions">
            <button class="button" data-action="start-level">Start Pressing</button>
            <button class="button button--ghost" data-action="back">Back</button>
          </div>
        </div>
      </div>
    `;
  }

  if (appState.modal === "fail") {
    return `
      <div class="modal-shell">
        <div class="modal-card">
          <p class="eyebrow">${appState.puzzle.failReason === "overflow" ? "Gutter Overflow" : "No Move"}</p>
          <h2>${appState.puzzle.message}</h2>
          <p>${currentLevel().callouts.find((entry) => entry.trigger === `fail:${appState.puzzle.failReason}`)?.text ?? "Undo rewinds the last successful fastener removal."}</p>
          <div class="modal-card__actions">
            <button class="button" data-action="undo">Undo</button>
            <button class="button button--ghost" data-action="restart">Restart</button>
            <button class="button button--ghost" data-action="hint">Hint</button>
            <button class="button button--ghost" data-action="back">Quit</button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="modal-shell">
      <div class="modal-card">
        <p class="eyebrow">Card Complete</p>
        <h2>${currentLevel().reward?.title ?? "Commission complete"}</h2>
        <p>${currentLevel().reward?.detail ?? "The finished card lifts into the gallery frame."}</p>
        <div class="modal-card__actions">
          <button class="button" data-action="next-level">${currentLevel().kind === "daily" ? "Back To Gallery" : "Next Card"}</button>
          <button class="button button--ghost" data-action="replay">Replay</button>
          ${
            isDailyUnlocked() && currentLevel().kind !== "daily"
              ? `<button class="button button--ghost" data-action="open-daily">Daily Commission</button>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

function render() {
  root.innerHTML = appState.screen === "gallery" ? renderGallery() : renderLevel();
}

root.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const action = target.dataset.action;
  if (action === "open-level") {
    loadLevel({ levelIndex: Number(target.dataset.levelIndex), showStart: true });
    return;
  }

  if (action === "open-daily") {
    if (!isDailyUnlocked()) {
      return;
    }
    loadLevel({ mode: "daily", dailySeed: appState.dailySeed, showStart: true });
    return;
  }

  if (action === "back") {
    backToGallery();
    return;
  }

  if (action === "start-level") {
    appState.modal = null;
    render();
    return;
  }

  if (action === "fastener") {
    handleFastener(target.dataset.fastenerId);
    return;
  }

  if (action === "undo") {
    performUndo();
    return;
  }

  if (action === "hint") {
    appState.modal = appState.modal === "start" ? appState.modal : null;
    applyHint();
    return;
  }

  if (action === "restart") {
    performRestart(false);
    return;
  }

  if (action === "replay") {
    performRestart(true);
    return;
  }

  if (action === "next-level") {
    openNextLevel();
  }
});

render();
