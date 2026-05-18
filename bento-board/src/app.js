import { dailySeedFromDate, generateDailyLevel, getUnlockedDailyPool } from "./daily.js";
import {
  HANDCRAFTED_LEVELS,
  MENU_PACKS,
  REWARD_DEFINITIONS,
  getPackById,
  getRewardById
} from "./data.js";
import {
  applyFastener,
  buildBoardView,
  createInitialState,
  createRuntime,
  findHint,
  getCompletionRatio,
  restartLevel,
  undoAction
} from "./engine.js";

const STORAGE_KEY = "bento-board-progress-v1";
const root = document.querySelector("#app");

const appState = {
  view: "home",
  mode: "campaign",
  levelIndex: 0,
  dailySeed: dailySeedFromDate(),
  progress: loadProgress(),
  level: null,
  runtime: null,
  puzzle: null,
  boardView: null,
  modal: null
};

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return {
      clearedLevels: Array.isArray(parsed.clearedLevels) ? parsed.clearedLevels : [],
      clearedDailySeeds: Array.isArray(parsed.clearedDailySeeds) ? parsed.clearedDailySeeds : [],
      unlockedRewards: Array.isArray(parsed.unlockedRewards) ? parsed.unlockedRewards : []
    };
  } catch {
    return {
      clearedLevels: [],
      clearedDailySeeds: [],
      unlockedRewards: []
    };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.progress));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function currentReward() {
  if (!appState.level) {
    return null;
  }
  return getRewardById(appState.level.rewardId ?? "reward-daily");
}

function highestClearedLevelNumber() {
  const clearedNumbers = HANDCRAFTED_LEVELS.filter((level) =>
    appState.progress.clearedLevels.includes(level.id)
  ).map((level) => level.number);

  return clearedNumbers.length ? Math.max(...clearedNumbers) : 0;
}

function isLevelCleared(level) {
  return appState.progress.clearedLevels.includes(level.id);
}

function isDailyCleared(seed = appState.dailySeed) {
  return appState.progress.clearedDailySeeds.includes(seed);
}

function isLevelUnlocked(index) {
  if (index <= 0) {
    return true;
  }
  return appState.progress.clearedLevels.includes(HANDCRAFTED_LEVELS[index - 1].id);
}

function isDailyUnlocked() {
  return highestClearedLevelNumber() >= 6;
}

function unlockedRewardCount() {
  return appState.progress.unlockedRewards.length;
}

function packProgress(packId) {
  const packLevels = HANDCRAFTED_LEVELS.filter((level) => level.packId === packId);
  const cleared = packLevels.filter((level) => isLevelCleared(level)).length;
  return {
    cleared,
    total: packLevels.length,
    percent: Math.round((cleared / packLevels.length) * 100)
  };
}

function refreshBoard() {
  if (!appState.level || !appState.puzzle || !appState.runtime) {
    appState.boardView = null;
    return;
  }
  appState.boardView = buildBoardView(appState.level, appState.puzzle, appState.runtime);
}

function updateTitle() {
  if (appState.view === "home") {
    document.title = "Bento Board";
    return;
  }
  const suffix =
    appState.level.kind === "daily"
      ? `Daily ${appState.level.seed}`
      : `${getPackById(appState.level.packId).title} • Level ${appState.level.number}`;
  document.title = `Bento Board • ${suffix}`;
}

function openHome() {
  appState.view = "home";
  appState.modal = null;
  refreshBoard();
  updateTitle();
  render();
}

function recordWin(level) {
  if (level.kind === "daily") {
    if (!appState.progress.clearedDailySeeds.includes(level.seed)) {
      appState.progress.clearedDailySeeds.push(level.seed);
    }
  } else if (!appState.progress.clearedLevels.includes(level.id)) {
    appState.progress.clearedLevels.push(level.id);
  }

  if (level.rewardId && !appState.progress.unlockedRewards.includes(level.rewardId)) {
    appState.progress.unlockedRewards.push(level.rewardId);
  }
  saveProgress();
}

function getUnlockedPool() {
  return getUnlockedDailyPool(highestClearedLevelNumber());
}

function loadLevelByIndex(levelIndex, { showStart = true } = {}) {
  const boundedIndex = Math.min(Math.max(levelIndex, 0), HANDCRAFTED_LEVELS.length - 1);
  const level = HANDCRAFTED_LEVELS[boundedIndex];
  appState.view = "play";
  appState.mode = "campaign";
  appState.levelIndex = boundedIndex;
  appState.level = level;
  appState.runtime = createRuntime(level);
  appState.puzzle = createInitialState(level);
  appState.modal = showStart ? "start" : null;
  refreshBoard();
  updateTitle();
  render();
}

function loadDaily({ seed = appState.dailySeed, showStart = true } = {}) {
  appState.view = "play";
  appState.mode = "daily";
  appState.dailySeed = seed;
  appState.level = generateDailyLevel(seed, { unlockedIngredientIds: getUnlockedPool() });
  appState.runtime = createRuntime(appState.level);
  appState.puzzle = createInitialState(appState.level);
  appState.modal = showStart ? "start" : null;
  refreshBoard();
  updateTitle();
  render();
}

function applyPuzzle(nextPuzzle) {
  appState.puzzle = nextPuzzle;

  if (nextPuzzle.completed) {
    recordWin(appState.level);
    appState.modal = "win";
  } else if (nextPuzzle.failed) {
    appState.modal = "fail";
  }

  refreshBoard();
  render();
}

function handleFastener(fastenerId) {
  if (!appState.level || !appState.puzzle || appState.modal === "start") {
    return;
  }
  const nextPuzzle = applyFastener(appState.level, appState.puzzle, fastenerId, appState.runtime);
  applyPuzzle(nextPuzzle);
}

function handleUndo() {
  if (!appState.puzzle) {
    return;
  }
  appState.modal = null;
  appState.puzzle = undoAction(appState.puzzle);
  refreshBoard();
  render();
}

function handleRestart() {
  if (!appState.level) {
    return;
  }
  appState.modal = null;
  appState.puzzle = restartLevel(appState.level);
  refreshBoard();
  render();
}

function handleHint() {
  if (!appState.level || !appState.puzzle || appState.puzzle.failed || appState.puzzle.completed) {
    return;
  }

  const hint = findHint(appState.level, appState.puzzle, appState.runtime);
  appState.puzzle = {
    ...appState.puzzle,
    hintAction: hint.action,
    feedback: null,
    message: hint.message
  };
  refreshBoard();
  render();
}

function openNextOrder() {
  if (!appState.level) {
    return;
  }

  if (appState.level.kind === "daily") {
    const nextDate = new Date(`${appState.level.seed}T00:00:00Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    loadDaily({ seed: dailySeedFromDate(nextDate), showStart: true });
    return;
  }

  if (appState.levelIndex < HANDCRAFTED_LEVELS.length - 1) {
    loadLevelByIndex(appState.levelIndex + 1, { showStart: true });
    return;
  }

  if (isDailyUnlocked()) {
    loadDaily({ seed: dailySeedFromDate(), showStart: true });
    return;
  }

  openHome();
}

function currentPack() {
  if (!appState.level || appState.level.kind === "daily") {
    return null;
  }
  return getPackById(appState.level.packId);
}

function levelChipText(level) {
  return level.kind === "daily" ? `Daily • ${level.seed}` : `Level ${level.number}`;
}

function packLevelProgress(level) {
  if (level.kind === "daily") {
    return [];
  }
  const pack = getPackById(level.packId);
  return pack.levelNumbers.map((number) => {
    const target = HANDCRAFTED_LEVELS.find((entry) => entry.number === number);
    return {
      number,
      current: target.id === level.id,
      cleared: isLevelCleared(target)
    };
  });
}

function activeTutorialStep() {
  if (!appState.level || !appState.puzzle) {
    return null;
  }

  for (const step of appState.level.tutorialSteps ?? []) {
    if (step.trigger === "start" && appState.puzzle.history.length === 0) {
      return step;
    }
    if (step.trigger.startsWith("after:")) {
      const fastenerId = step.trigger.slice("after:".length);
      if (appState.puzzle.lastResolution?.fastenerId === fastenerId) {
        return step;
      }
    }
  }

  return null;
}

function ingredientPips(compartment) {
  return compartment.acceptedSlots
    .map((ingredientTypeId, index) => {
      const filled = Boolean(compartment.filledSlots[index]);
      return `<span class="slot-pip ${filled ? "is-filled" : ""}" aria-hidden="true">${escapeHtml(
        ingredientTypeId.slice(0, 2).toUpperCase()
      )}</span>`;
    })
    .join("");
}

function feedbackBubble(fastenerId) {
  if (!appState.puzzle?.feedback) {
    return "";
  }

  if (appState.puzzle.feedback.fastenerId !== fastenerId || appState.puzzle.feedback.outcome === "valid") {
    return "";
  }

  return `<div class="fastener-bubble">${escapeHtml(appState.puzzle.feedback.message)}</div>`;
}

function renderFastener(fastener) {
  const classes = [
    "fastener",
    `fastener--${fastener.type}`,
    `is-${fastener.status}`,
    fastener.highlighted ? "is-highlighted" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <button
      class="${classes}"
      type="button"
      data-action="fastener"
      data-fastener-id="${escapeHtml(fastener.id)}"
      style="--anchor-depth:${fastener.anchorDepth};"
      aria-label="${escapeHtml(fastener.label)}"
      title="${escapeHtml(fastener.reason)}"
    >
      <span class="fastener__shape"></span>
      <span class="fastener__label">${escapeHtml(fastener.type)}</span>
      ${feedbackBubble(fastener.id)}
    </button>
  `;
}

function renderLayer(layer) {
  return `
    <div
      class="ingredient-layer ${layer.isFront ? "is-front" : ""} ${layer.highlighted ? "is-highlighted" : ""}"
      style="--depth:${layer.depth}; --tint:${layer.ingredient.tint}; --accent:${layer.ingredient.accent};"
    >
      <div class="ingredient-layer__mark">${escapeHtml(layer.ingredient.shortLabel)}</div>
      <div class="ingredient-layer__body">
        <strong>${escapeHtml(layer.ingredient.family)}</strong>
        <span>${escapeHtml(layer.artVariant)}</span>
      </div>
      <div class="ingredient-layer__blockers">${layer.remainingBlockers.length} blocker${layer.remainingBlockers.length === 1 ? "" : "s"}</div>
    </div>
  `;
}

function renderStack(stack) {
  return `
    <section class="stack-lane" style="--stack-accent:${stack.accent};">
      <header class="stack-lane__head">
        <span>${escapeHtml(stack.title)}</span>
        <span>${stack.compressedCount > 0 ? `+${stack.compressedCount} tucked` : `${stack.visibleLayers.length} visible`}</span>
      </header>
      <div class="stack-card">
        ${stack.frontDividerId ? `<div class="divider-tab">Divider Ready</div>` : ""}
        ${stack.visibleLayers.map(renderLayer).join("")}
        ${stack.fasteners.map(renderFastener).join("")}
        ${stack.compressedCount > 0 ? `<div class="stack-card__count">+${stack.compressedCount}</div>` : ""}
      </div>
    </section>
  `;
}

function renderCompartment(compartment) {
  return `
    <article class="compartment ${compartment.highlighted ? "is-highlighted" : ""}">
      <header class="compartment__head">
        <span>${escapeHtml(compartment.label)}</span>
        <span>${compartment.remainingCount} left</span>
      </header>
      <div class="compartment__slots">
        ${compartment.acceptedSlots
          .map((ingredientTypeId, index) => {
            const filled = compartment.filledSlots[index];
            return `
              <div class="compartment__slot ${filled ? "is-filled" : ""}">
                <span>${escapeHtml(ingredientTypeId.slice(0, 2).toUpperCase())}</span>
              </div>
            `;
          })
          .join("")}
      </div>
    </article>
  `;
}

function renderRecipeRibbon() {
  return `
    <section class="recipe-ribbon">
      ${appState.boardView.compartments
        .map(
          (compartment) => `
            <article class="recipe-card ${compartment.highlighted ? "is-highlighted" : ""}">
              <header>
                <strong>${escapeHtml(compartment.label)}</strong>
                <span>${compartment.remainingCount}/${compartment.acceptedSlots.length}</span>
              </header>
              <div class="recipe-card__pips">${ingredientPips(compartment)}</div>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderHud() {
  const pack = currentPack();
  const progressPips = pack
    ? packLevelProgress(appState.level)
        .map(
          (entry) => `
            <span class="hud-pip ${entry.current ? "is-current" : ""} ${entry.cleared ? "is-cleared" : ""}">
              ${entry.number}
            </span>
          `
        )
        .join("")
    : `<span class="hud-pip is-current">DAILY</span>`;

  const progressPercent = Math.round(getCompletionRatio(appState.level, appState.puzzle) * 100);

  return `
    <header class="play-hud">
      <div class="play-hud__meta">
        <button type="button" class="back-button" data-action="home">Menu</button>
        <div>
          <span class="eyebrow">${escapeHtml(pack?.title ?? "Daily Special")}</span>
          <h1>${escapeHtml(appState.level.title)}</h1>
        </div>
      </div>
      <div class="play-hud__status">
        <div class="chip-row">
          <span class="mode-chip">${escapeHtml(levelChipText(appState.level))}</span>
          <span class="mode-chip">${progressPercent}% packed</span>
        </div>
        <div class="hud-pips">${progressPips}</div>
      </div>
      <div class="play-hud__buttons">
        <button type="button" data-action="undo">Undo</button>
        <button type="button" data-action="hint">Hint</button>
        <button type="button" data-action="restart">Restart</button>
      </div>
    </header>
  `;
}

function renderTutorial() {
  const tutorial = activeTutorialStep();
  const copy = tutorial?.copy ?? appState.level.beat;
  return `
    <section class="callout-card">
      <span class="eyebrow">${tutorial ? "Tutorial" : "Beat"}</span>
      <p>${escapeHtml(copy)}</p>
    </section>
  `;
}

function renderPlayModal() {
  if (!appState.modal || !appState.level) {
    return "";
  }

  const reward = currentReward();
  if (appState.modal === "start") {
    return `
      <div class="modal-scrim">
        <section class="modal-card">
          <span class="eyebrow">${escapeHtml(levelChipText(appState.level))}</span>
          <h2>${escapeHtml(appState.level.title)}</h2>
          <p>${escapeHtml(appState.level.beat)}</p>
          <div class="modal-card__reward">
            <strong>${escapeHtml(reward?.title ?? "Recipe Card")}</strong>
            <span>${escapeHtml(reward?.copy ?? "Clear the order to stamp the journal.")}</span>
          </div>
          <div class="modal-card__actions">
            <button type="button" data-action="close-modal">Start Packing</button>
            <button type="button" data-action="home">Back to Menu</button>
          </div>
        </section>
      </div>
    `;
  }

  if (appState.modal === "fail") {
    const title = appState.puzzle.failKind === "overflow" ? "Lunch Overflow" : "Lunch Jammed";
    return `
      <div class="modal-scrim">
        <section class="modal-card">
          <span class="eyebrow">Order Failed</span>
          <h2>${title}</h2>
          <p>${escapeHtml(appState.puzzle.message)}</p>
          <div class="modal-card__actions">
            <button type="button" data-action="undo">Undo</button>
            <button type="button" data-action="restart">Restart</button>
            <button type="button" data-action="hint">Hint</button>
            <button type="button" data-action="home">Quit</button>
          </div>
        </section>
      </div>
    `;
  }

  return `
    <div class="modal-scrim">
      <section class="modal-card">
        <span class="eyebrow">Order Cleared</span>
        <h2>Lunch Packed</h2>
        <p>${escapeHtml(appState.puzzle.message)}</p>
        <div class="modal-card__reward">
          <strong>${escapeHtml(reward?.title ?? "Recipe Stamp")}</strong>
          <span>${escapeHtml(reward?.copy ?? "The journal gets a new stamp.")}</span>
        </div>
        <div class="modal-card__actions">
          <button type="button" data-action="next-order">Next Order</button>
          <button type="button" data-action="replay">Replay</button>
          ${
            isDailyUnlocked() && appState.level.kind !== "daily"
              ? '<button type="button" data-action="open-daily">Daily Special</button>'
              : '<button type="button" data-action="home">Back to Menu</button>'
          }
        </div>
      </section>
    </div>
  `;
}

function renderPlayView() {
  const themeAccent =
    appState.level.kind === "daily"
      ? appState.level.theme.accent
      : currentPack()?.accent ?? "#cc714b";

  return `
    <main class="play-shell" style="--theme-accent:${themeAccent};">
      ${renderHud()}
      ${renderRecipeRibbon()}
      <section class="message-strip">
        <span class="eyebrow">Kitchen Note</span>
        <p>${escapeHtml(appState.puzzle.message)}</p>
      </section>
      ${renderTutorial()}
      <section class="stack-field">
        ${appState.boardView.stacks.map(renderStack).join("")}
      </section>
      <section class="lunchbox-tray">
        <header class="lunchbox-tray__head">
          <div>
            <span class="eyebrow">Lunchbox</span>
            <h2>Compartment Tray</h2>
          </div>
          <span>${appState.boardView.readyFasteners.length} exposed fastener${appState.boardView.readyFasteners.length === 1 ? "" : "s"}</span>
        </header>
        <div class="lunchbox-tray__grid">
          ${appState.boardView.compartments.map(renderCompartment).join("")}
        </div>
      </section>
      ${renderPlayModal()}
    </main>
  `;
}

function renderPackCard(pack) {
  const progress = packProgress(pack.id);
  const levelButtons = pack.levelNumbers
    .map((number) => {
      const level = HANDCRAFTED_LEVELS.find((entry) => entry.number === number);
      const index = HANDCRAFTED_LEVELS.findIndex((entry) => entry.id === level.id);
      const unlocked = isLevelUnlocked(index);
      return `
        <button
          type="button"
          class="level-pill ${isLevelCleared(level) ? "is-cleared" : ""} ${unlocked ? "" : "is-locked"}"
          data-action="open-level"
          data-level-index="${index}"
          ${unlocked ? "" : "disabled"}
        >
          <span>${number}</span>
          <small>${isLevelCleared(level) ? "done" : unlocked ? "play" : "lock"}</small>
        </button>
      `;
    })
    .join("");

  return `
    <article class="menu-card" style="--card-accent:${pack.accent};">
      <header class="menu-card__head">
        <div>
          <span class="eyebrow">Menu Pack</span>
          <h2>${escapeHtml(pack.title)}</h2>
        </div>
        <div class="menu-card__meter">
          <strong>${progress.cleared}/${progress.total}</strong>
          <span>${progress.percent}% cleared</span>
        </div>
      </header>
      <p>${escapeHtml(pack.clothTitle)} cloth unlocks when this pack is fully stamped.</p>
      <div class="level-pill-grid">${levelButtons}</div>
    </article>
  `;
}

function renderDailyCard() {
  const unlocked = isDailyUnlocked();
  const pool = getUnlockedPool();
  return `
    <article class="menu-card menu-card--daily">
      <header class="menu-card__head">
        <div>
          <span class="eyebrow">Daily Special</span>
          <h2>${escapeHtml(appState.dailySeed)}</h2>
        </div>
        <div class="menu-card__meter">
          <strong>${appState.progress.clearedDailySeeds.length}</strong>
          <span>foil seals</span>
        </div>
      </header>
      <p>
        ${
          unlocked
            ? `Today's UTC-seeded order uses the unlocked pool: ${pool.map((id) => escapeHtml(id)).join(", ")}.`
            : "Unlocks after clearing level 6."
        }
      </p>
      <button type="button" class="daily-button" data-action="open-daily" ${unlocked ? "" : "disabled"}>
        ${unlocked ? (isDailyCleared() ? "Replay Daily" : "Open Daily") : "Locked"}
      </button>
    </article>
  `;
}

function renderJournal() {
  const unlocked = REWARD_DEFINITIONS.filter((reward) =>
    appState.progress.unlockedRewards.includes(reward.id)
  );

  return `
    <section class="journal-panel">
      <header class="journal-panel__head">
        <div>
          <span class="eyebrow">Lunch Journal</span>
          <h2>${unlockedRewardCount()} rewards collected</h2>
        </div>
        <button type="button" data-action="continue">Continue Latest</button>
      </header>
      <div class="journal-strip">
        ${unlocked.length
          ? unlocked
              .slice(-6)
              .map(
                (reward) => `
                  <article class="journal-card">
                    <strong>${escapeHtml(reward.title)}</strong>
                    <span>${escapeHtml(reward.copy)}</span>
                  </article>
                `
              )
              .join("")
          : '<article class="journal-card is-empty"><strong>First stamp waits on level 1.</strong><span>Clear an order to start the journal.</span></article>'}
      </div>
    </section>
  `;
}

function latestUnlockedLevelIndex() {
  for (let index = HANDCRAFTED_LEVELS.length - 1; index >= 0; index -= 1) {
    if (isLevelUnlocked(index)) {
      return index;
    }
  }
  return 0;
}

function renderHomeView() {
  return `
    <main class="home-shell">
      <section class="hero-card">
        <div>
          <span class="eyebrow">Mobile First Prototype</span>
          <h1>Bento Board</h1>
          <p>
            Remove lunch picks, cloth bands, and paper dividers so layered ingredients slide into the right lunchbox compartments.
          </p>
        </div>
        <div class="hero-card__stats">
          <div><strong>${appState.progress.clearedLevels.length}</strong><span>main clears</span></div>
          <div><strong>${appState.progress.clearedDailySeeds.length}</strong><span>daily seals</span></div>
          <div><strong>${unlockedRewardCount()}</strong><span>journal rewards</span></div>
        </div>
      </section>
      <section class="menu-grid">
        ${MENU_PACKS.map(renderPackCard).join("")}
        ${renderDailyCard()}
      </section>
      ${renderJournal()}
    </main>
  `;
}

function render() {
  if (appState.view === "play" && appState.level && appState.puzzle) {
    root.innerHTML = renderPlayView();
  } else {
    root.innerHTML = renderHomeView();
  }
}

function continueLatest() {
  if (isDailyUnlocked() && !appState.progress.clearedLevels.length) {
    loadLevelByIndex(0, { showStart: true });
    return;
  }
  loadLevelByIndex(latestUnlockedLevelIndex(), { showStart: true });
}

root.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const { action } = button.dataset;

  if (action === "fastener") {
    handleFastener(button.dataset.fastenerId);
    return;
  }

  if (action === "open-level") {
    loadLevelByIndex(Number(button.dataset.levelIndex), { showStart: true });
    return;
  }

  if (action === "open-daily") {
    if (isDailyUnlocked()) {
      loadDaily({ seed: dailySeedFromDate(), showStart: true });
    }
    return;
  }

  if (action === "home") {
    openHome();
    return;
  }

  if (action === "close-modal") {
    appState.modal = null;
    render();
    return;
  }

  if (action === "undo") {
    handleUndo();
    return;
  }

  if (action === "hint") {
    appState.modal = null;
    handleHint();
    return;
  }

  if (action === "restart") {
    handleRestart();
    return;
  }

  if (action === "next-order") {
    openNextOrder();
    return;
  }

  if (action === "replay") {
    if (appState.level.kind === "daily") {
      loadDaily({ seed: appState.level.seed, showStart: false });
    } else {
      loadLevelByIndex(appState.levelIndex, { showStart: false });
    }
    return;
  }

  if (action === "continue") {
    continueLatest();
  }
});

openHome();
