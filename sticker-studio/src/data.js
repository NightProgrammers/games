export const STORAGE_KEY = "sticker-studio-progress-v1";
export const DAILY_UNLOCK_LEVEL = 6;

export const PACKS = Object.freeze([
  {
    id: "kitchen-keepsakes",
    title: "Kitchen Keepsakes",
    accent: "#b96d56",
    gradient: ["#f5ebde", "#efd9c9", "#d9b59f"],
    rewardTitle: "Apricot album tab"
  },
  {
    id: "garden-notes",
    title: "Garden Notes",
    accent: "#688a67",
    gradient: ["#eef4e8", "#d8e8d4", "#bfd3bf"],
    rewardTitle: "Moss album tab"
  }
]);

export const DAILY_THEME = Object.freeze({
  id: "daily-foil",
  title: "Daily Foil Page",
  accent: "#7b6d9d",
  gradient: ["#f3edf8", "#e0d7ef", "#c8bfe1"],
  rewardTitle: "Date-stamped foil badge"
});

const PACK_BY_ID = Object.fromEntries(PACKS.map((pack) => [pack.id, pack]));

const VISUALS = Object.freeze({
  coral: {
    target: "#f8ddd3",
    trim: "#bb6a55",
    sheet: "#ffd6ca",
    accent: "#8f4e3c"
  },
  gold: {
    target: "#f6e3b9",
    trim: "#b78828",
    sheet: "#f9e6bb",
    accent: "#83611b"
  },
  sage: {
    target: "#dcead7",
    trim: "#6a9467",
    sheet: "#d7ead3",
    accent: "#4e704d"
  },
  sky: {
    target: "#dfe9f6",
    trim: "#5d7da6",
    sheet: "#dce8fb",
    accent: "#425e85"
  },
  plum: {
    target: "#e8ddf2",
    trim: "#7e67a8",
    sheet: "#e9ddfb",
    accent: "#59457f"
  },
  rose: {
    target: "#f1dbe4",
    trim: "#b56980",
    sheet: "#f6dce5",
    accent: "#874a61"
  },
  mint: {
    target: "#d9efe7",
    trim: "#4d8a7d",
    sheet: "#d6f2ea",
    accent: "#34675c"
  },
  ink: {
    target: "#ece8eb",
    trim: "#7c7278",
    sheet: "#f1ecef",
    accent: "#585256"
  }
});

const TARGET_SLOTS = Object.freeze({
  hero: { x: 34, y: 11, w: 34, h: 18, shape: "ticket", rotation: -4 },
  topLeft: { x: 8, y: 12, w: 20, h: 16, shape: "seal", rotation: -8 },
  topRight: { x: 72, y: 10, w: 18, h: 16, shape: "seal", rotation: 8 },
  midLeft: { x: 8, y: 34, w: 24, h: 18, shape: "tag", rotation: -6 },
  center: { x: 37, y: 34, w: 26, h: 17, shape: "strip", rotation: 2 },
  midRight: { x: 68, y: 34, w: 20, h: 18, shape: "frame", rotation: 5 },
  accentLeft: { x: 24, y: 24, w: 12, h: 10, shape: "mini", rotation: -8 },
  accentRight: { x: 78, y: 25, w: 10, h: 8, shape: "mini", rotation: 8 },
  lowLeft: { x: 12, y: 60, w: 22, h: 16, shape: "leaf", rotation: -10 },
  lowCenter: { x: 39, y: 59, w: 28, h: 17, shape: "ticket", rotation: -2 },
  lowRight: { x: 70, y: 60, w: 18, h: 16, shape: "seal", rotation: 9 },
  footer: { x: 27, y: 78, w: 46, h: 14, shape: "strip", rotation: 1 }
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const motif = (title, short, paletteId, family = title, variant = "a") => ({
  title,
  short,
  paletteId,
  family,
  variant
});

const reward = (title, detail) => ({ title, detail });

export function makeTarget(slotId, config) {
  const slot = TARGET_SLOTS[slotId];
  const visual = VISUALS[config.paletteId];
  if (!slot) {
    throw new Error(`Unknown target slot ${slotId}.`);
  }
  if (!visual) {
    throw new Error(`Unknown target palette ${config.paletteId}.`);
  }

  return {
    id: config.id,
    title: config.title,
    short: config.short,
    family: config.family ?? config.title,
    variant: config.variant ?? "a",
    paletteId: config.paletteId,
    tone: visual.target,
    trim: visual.trim,
    shape: config.shape ?? slot.shape,
    x: slot.x,
    y: slot.y,
    w: slot.w,
    h: slot.h,
    rotation: config.rotation ?? slot.rotation,
    prereqs: [...(config.prereqs ?? [])]
  };
}

export function makeSheet(id, name, paletteId, targetIds) {
  const visual = VISUALS[paletteId];
  if (!visual) {
    throw new Error(`Unknown sheet palette ${paletteId}.`);
  }

  return {
    id,
    name,
    paletteId,
    color: visual.sheet,
    accent: visual.accent,
    stickers: targetIds.map((targetId, index) => ({
      id: `${id}-${index + 1}`,
      targetId
    }))
  };
}

export function buildLevelFromPlan({
  id,
  kind = "ftue",
  seed = null,
  number = null,
  packId,
  title,
  caption,
  beat,
  clipCount,
  mechanics,
  callouts,
  reward: rewardData,
  layout,
  motifs,
  sheets,
  solution
}) {
  const pack = kind === "daily" ? DAILY_THEME : PACK_BY_ID[packId];
  if (!pack) {
    throw new Error(`Unknown pack ${packId}.`);
  }

  if (layout.length !== solution.length || motifs.length !== solution.length) {
    throw new Error(`Level ${id} has mismatched layout, motif, or solution lengths.`);
  }

  const sheetMap = new Map(sheets.map((sheet) => [sheet.id, sheet]));
  const usageBySheet = new Map(sheets.map((sheet) => [sheet.id, []]));
  const targetIds = solution.map((_, index) => `t${index + 1}`);
  const lastIndexBySheet = new Map();

  const targets = solution.map((sheetId, index) => {
    if (!sheetMap.has(sheetId)) {
      throw new Error(`Level ${id} references unknown sheet ${sheetId} in its solution.`);
    }

    const previousIndex = lastIndexBySheet.get(sheetId) ?? -1;
    const prereqs = targetIds.slice(previousIndex + 1, index);
    lastIndexBySheet.set(sheetId, index);
    usageBySheet.get(sheetId).push(targetIds[index]);

    return makeTarget(layout[index], {
      id: targetIds[index],
      ...motifs[index],
      prereqs
    });
  });

  const builtSheets = sheets.map((sheet) =>
    makeSheet(sheet.id, sheet.name, sheet.paletteId, usageBySheet.get(sheet.id))
  );

  return {
    id,
    kind,
    seed,
    number,
    packId,
    title,
    beat,
    clipCount,
    mechanics: [...mechanics],
    callouts: clone(callouts),
    reward: clone(rewardData),
    page: {
      title,
      caption,
      accent: pack.accent,
      gradient: [...pack.gradient],
      targets
    },
    sheets: builtSheets
  };
}

const kitchenPlans = [
  {
    id: "ftue-01",
    title: "First Peel",
    caption: "Clear each short strip in order to finish the first scrapbook card.",
    beat: "Follow one sheet through both stickers before you touch the next strip.",
    clipCount: 0,
    mechanics: ["Two-tap placement", "Ordered sheet chains", "No clips yet"],
    callouts: [
      { focus: "tray", text: "Untouched sheets wait in the tray and cost nothing yet." },
      { focus: "page", text: "All silhouettes are visible from the start on every page." }
    ],
    reward: reward("Warm-up tile", "Adds the first collage tile to Kitchen Keepsakes."),
    layout: ["hero", "center", "topLeft", "midLeft", "lowCenter", "lowRight"],
    motifs: [
      motif("Teacup base", "CUP", "coral"),
      motif("Cup steam", "STEM", "rose"),
      motif("Lemon round", "LEMN", "gold"),
      motif("Lemon sparkle", "ZEST", "gold"),
      motif("Jam jar", "JAR", "sage"),
      motif("Jar lid", "LID", "sage")
    ],
    sheets: [
      { id: "A", name: "Teacup strip", paletteId: "coral" },
      { id: "B", name: "Lemon strip", paletteId: "gold" },
      { id: "C", name: "Jam strip", paletteId: "sage" }
    ],
    solution: ["A", "A", "B", "B", "C", "C"]
  },
  {
    id: "ftue-02",
    title: "First Clip",
    caption: "A long strip jams unless you park it and come back after the right pieces land.",
    beat: "After the first placement, the strip must wait in the only binder clip.",
    clipCount: 1,
    mechanics: ["First binder clip", "Return to a parked strip", "Three-sticker chain"],
    callouts: [
      { focus: "clips", text: "Half-used sheets wait here. Clips are limited." },
      { focus: "hud", text: "If a revealed sticker cannot fit and no clip is free, the page jams." }
    ],
    reward: reward("Citrus tab", "Unlocks a lemon tab on the album edge."),
    layout: ["hero", "topLeft", "midLeft", "center", "midRight", "lowCenter", "lowRight"],
    motifs: [
      motif("Recipe card", "CARD", "ink"),
      motif("Ribbon knot", "KNOT", "coral"),
      motif("Salt label", "SALT", "sky"),
      motif("Pepper label", "PEPR", "sky"),
      motif("Cup saucer", "SAUC", "coral"),
      motif("Berry spoon", "SPOON", "plum"),
      motif("Berry shine", "SHNE", "plum")
    ],
    sheets: [
      { id: "A", name: "Recipe strip", paletteId: "coral" },
      { id: "B", name: "Seasoning strip", paletteId: "sky" },
      { id: "C", name: "Berry strip", paletteId: "plum" }
    ],
    solution: ["A", "B", "B", "A", "C", "C", "C"]
  },
  {
    id: "ftue-03",
    title: "Return Pass",
    caption: "You will park one strip, clear two others, then come back for the final sticker.",
    beat: "Retrieving a parked sheet is part of the main loop, not a special case.",
    clipCount: 1,
    mechanics: ["Clip retrieval", "One-sticker closer", "Deadlock-free recall"],
    callouts: [
      { focus: "clips", text: "Clipped sheets still show the next sticker and the remaining count." },
      { focus: "page", text: "A matching silhouette pulses only when the exposed sticker can fit now." }
    ],
    reward: reward("Pantry stamp", "Adds a pantry stamp tile to the album strip."),
    layout: ["hero", "topRight", "midLeft", "center", "midRight", "lowLeft", "footer"],
    motifs: [
      motif("Jar note", "NOTE", "sage"),
      motif("Note pin", "PIN", "rose"),
      motif("Tea tin", "TIN", "sky"),
      motif("Tin label", "LBL", "sky"),
      motif("Toast tag", "TOST", "gold"),
      motif("Toast crumb", "CRMB", "gold"),
      motif("Counter tab", "TAB", "ink")
    ],
    sheets: [
      { id: "A", name: "Jar strip", paletteId: "sage" },
      { id: "B", name: "Tin strip", paletteId: "sky" },
      { id: "C", name: "Toast strip", paletteId: "gold" },
      { id: "D", name: "Counter strip", paletteId: "ink" }
    ],
    solution: ["A", "B", "B", "C", "C", "A", "D"]
  },
  {
    id: "ftue-04",
    title: "Read Before You Peel",
    caption: "Two strips can open the page, but one order keeps the clip free for the right return.",
    beat: "Blocked taps only nudge locally, so the player can probe without punishment.",
    clipCount: 1,
    mechanics: ["Multiple legal openers", "Non-punishing reject feedback", "One-clip planning"],
    callouts: [
      { focus: "tray", text: "A blocked strip tells you it does not fit yet, but it spends nothing." },
      { focus: "page", text: "Repeated taps on the wrong silhouette only give local feedback." }
    ],
    reward: reward("Ribbon stamp", "Adds a ribbon-stamped collage tile."),
    layout: ["topLeft", "hero", "topRight", "midLeft", "center", "midRight", "lowLeft", "lowCenter"],
    motifs: [
      motif("Envelope front", "MAIL", "ink"),
      motif("Envelope seal", "SEAL", "rose"),
      motif("Teabag tag", "BAG", "gold"),
      motif("Teabag string", "STR", "gold"),
      motif("Butter dish", "DISH", "coral"),
      motif("Butter curl", "CURL", "coral"),
      motif("Apron patch", "PATCH", "sage"),
      motif("Apron stitch", "STCH", "sage")
    ],
    sheets: [
      { id: "A", name: "Envelope strip", paletteId: "rose" },
      { id: "B", name: "Teabag strip", paletteId: "gold" },
      { id: "C", name: "Butter strip", paletteId: "coral" },
      { id: "D", name: "Apron strip", paletteId: "sage" }
    ],
    solution: ["A", "B", "B", "C", "C", "D", "D", "A"]
  },
  {
    id: "ftue-05",
    title: "First Jam",
    caption: "This page can deadlock if both clips hold the wrong partial strips.",
    beat: "The first real jam branch teaches why clip order matters before the capstone page.",
    clipCount: 2,
    mechanics: ["Deadlock branch", "Two clip slots", "Three delayed returns"],
    callouts: [
      { focus: "hud", text: "If no exposed sticker matches any open silhouette, the page is jammed." },
      { focus: "clips", text: "You can park an active strip even when its next sticker fits, if you need to switch." }
    ],
    reward: reward("Mixer badge", "Adds a brass mixer badge to the album strip."),
    layout: ["topLeft", "hero", "topRight", "midLeft", "center", "midRight", "lowLeft", "lowRight"],
    motifs: [
      motif("Mix bowl", "BOWL", "sky"),
      motif("Whisk loop", "WHSK", "sky"),
      motif("Spoon rest", "REST", "coral"),
      motif("Spoon shine", "SHNE", "coral"),
      motif("Herb bunch", "HERB", "sage"),
      motif("Twine knot", "TWNE", "sage"),
      motif("Pie note", "PIE", "gold"),
      motif("Pie star", "STAR", "gold")
    ],
    sheets: [
      { id: "A", name: "Bowl strip", paletteId: "sky" },
      { id: "B", name: "Spoon strip", paletteId: "coral" },
      { id: "C", name: "Herb strip", paletteId: "sage" },
      { id: "D", name: "Pie strip", paletteId: "gold" }
    ],
    solution: ["A", "B", "A", "C", "B", "D", "C", "D"]
  },
  {
    id: "ftue-06",
    title: "Pack Finale",
    caption: "The last kitchen page asks for two clean parks before the long return chain resolves.",
    beat: "Clear the finale to unlock the daily foil page.",
    clipCount: 2,
    mechanics: ["Pack finale", "Daily unlock", "Two-step return chain"],
    callouts: [
      { focus: "daily", text: "Clear this page to unlock the seeded daily foil page." },
      { focus: "clips", text: "Only partial sheets consume clip space. Untouched strips stay in the tray." }
    ],
    reward: reward("Apricot album tab", "Unlocks the Kitchen Keepsakes album tab color and the daily card."),
    layout: ["hero", "topLeft", "topRight", "midLeft", "center", "midRight", "lowLeft", "footer"],
    motifs: [
      motif("Recipe frame", "FRME", "ink"),
      motif("Frame tack", "TACK", "rose"),
      motif("Rolling pin", "ROLL", "coral"),
      motif("Rolling grain", "WOOD", "coral"),
      motif("Spice clip", "SPCE", "gold"),
      motif("Spice star", "ANIS", "gold"),
      motif("Napkin fold", "FOLD", "sage"),
      motif("Napkin trim", "TRIM", "sage")
    ],
    sheets: [
      { id: "A", name: "Frame strip", paletteId: "rose" },
      { id: "B", name: "Rolling strip", paletteId: "coral" },
      { id: "C", name: "Spice strip", paletteId: "gold" },
      { id: "D", name: "Napkin strip", paletteId: "sage" }
    ],
    solution: ["A", "B", "A", "D", "B", "C", "C", "D"]
  }
];

const gardenPlans = [
  {
    id: "ftue-07",
    title: "Repeated Family",
    caption: "Two leaf stickers share a family, so the notch and label variant matter now.",
    beat: "Repeated families begin here, but both variants stay visible and readable.",
    clipCount: 2,
    mechanics: ["Repeated family variants", "Two clips", "Variant readability"],
    callouts: [
      { focus: "page", text: "Repeated families use a notch variant and a short label so color is never the only cue." },
      { focus: "tray", text: "The tray still keeps untouched sheets free, even with repeated sticker families." }
    ],
    reward: reward("Leaf tile", "Adds the first Garden Notes tile to the album strip."),
    layout: ["hero", "topLeft", "topRight", "midLeft", "center", "midRight", "lowLeft", "lowCenter"],
    motifs: [
      motif("Seed packet", "SEED", "gold"),
      motif("Leaf marker A", "LEF1", "sage", "leaf-marker", "a"),
      motif("Leaf marker B", "LEF2", "sage", "leaf-marker", "b"),
      motif("Tulip base", "TULP", "rose"),
      motif("Tulip shine", "GLSS", "rose"),
      motif("Garden twine", "TWNE", "mint"),
      motif("Moth stamp", "MOTH", "plum"),
      motif("Moth spark", "SPRK", "plum")
    ],
    sheets: [
      { id: "A", name: "Seed strip", paletteId: "gold" },
      { id: "B", name: "Leaf strip", paletteId: "sage" },
      { id: "C", name: "Tulip strip", paletteId: "rose" },
      { id: "D", name: "Moth strip", paletteId: "plum" }
    ],
    solution: ["A", "B", "A", "C", "C", "D", "D", "B"]
  },
  {
    id: "ftue-08",
    title: "Long Chain",
    caption: "The first four-sticker strip stretches across the page and keeps coming back.",
    beat: "A long chain is introduced here, even though one opener strip stays only one sticker long in the slice data.",
    clipCount: 2,
    mechanics: ["First four-sticker strip", "Long returns", "Readable long-chain pacing"],
    callouts: [
      { focus: "clips", text: "A long strip still shows the exposed sticker plus a remaining-count pip while clipped." },
      { focus: "hud", text: "Use Undo if the long strip parks in the wrong order." }
    ],
    reward: reward("Pressed bloom tile", "Adds a pressed bloom collage tile to Garden Notes."),
    layout: ["hero", "topLeft", "topRight", "midLeft", "center", "midRight", "lowLeft", "lowCenter", "lowRight"],
    motifs: [
      motif("Butterfly wing", "WING", "plum"),
      motif("Wing spot", "SPOT", "plum"),
      motif("Seed note", "NOTE", "gold"),
      motif("Seed tie", "TIE", "gold"),
      motif("Leaf wash", "WASH", "sage"),
      motif("Leaf line", "LINE", "sage"),
      motif("Tulip tag", "TAG", "rose", "petal", "a"),
      motif("Petal gloss", "GLOS", "rose", "petal", "b"),
      motif("Postmark sprig", "SPRG", "mint")
    ],
    sheets: [
      { id: "A", name: "Wing strip", paletteId: "plum" },
      { id: "B", name: "Seed strip", paletteId: "gold" },
      { id: "C", name: "Leaf strip", paletteId: "sage" },
      { id: "D", name: "Tulip strip", paletteId: "rose" },
      { id: "E", name: "Sprig strip", paletteId: "mint" }
    ],
    solution: ["A", "B", "B", "A", "C", "A", "D", "A", "E"]
  },
  {
    id: "ftue-09",
    title: "Double Parking",
    caption: "Both clips must hold the correct strips before the center of the page unlocks.",
    beat: "This page makes the player use both clips correctly at once.",
    clipCount: 2,
    mechanics: ["Double parking", "Two active returns", "Shared family read"],
    callouts: [
      { focus: "clips", text: "This is the first page that expects both clips to be occupied correctly." },
      { focus: "page", text: "Deadlocks stay deterministic: the page only jams when nothing exposed can fit." }
    ],
    reward: reward("Sprout badge", "Adds a sprout badge tile to the album strip."),
    layout: ["topLeft", "hero", "topRight", "midLeft", "center", "midRight", "lowLeft", "lowCenter", "footer"],
    motifs: [
      motif("Butterfly tab", "BUTA", "plum", "butterfly", "a"),
      motif("Seed tab", "SEDA", "gold", "seed-tag", "a"),
      motif("Leaf marker A", "LEF1", "sage", "leaf-marker", "a"),
      motif("Leaf marker B", "LEF2", "sage", "leaf-marker", "b"),
      motif("Butterfly shine", "BUTB", "plum", "butterfly", "b"),
      motif("Stem wrap", "STEM", "mint"),
      motif("Stem knot", "KNOT", "mint"),
      motif("Tulip note", "NOTE", "rose"),
      motif("Garden pin", "PIN", "ink")
    ],
    sheets: [
      { id: "A", name: "Butterfly strip", paletteId: "plum" },
      { id: "B", name: "Seed strip", paletteId: "gold" },
      { id: "C", name: "Leaf strip", paletteId: "sage" },
      { id: "D", name: "Stem strip", paletteId: "mint" },
      { id: "E", name: "Garden pin strip", paletteId: "ink" }
    ],
    solution: ["A", "B", "C", "C", "A", "D", "D", "B", "E"]
  },
  {
    id: "ftue-10",
    title: "Dense Spread",
    caption: "The page gets busier, but every silhouette keeps its own outline and family cue.",
    beat: "Readability, not a new rule, is the main pressure point here.",
    clipCount: 3,
    mechanics: ["Dense portrait spread", "Three clips", "Five live strip families"],
    callouts: [
      { focus: "page", text: "Even dense pages keep all empty silhouettes outlined and readable on a phone." },
      { focus: "hud", text: "Hint only reveals one exact sheet and target, never a full sequence." }
    ],
    reward: reward("Glasshouse tile", "Adds a glasshouse collage tile to the album strip."),
    layout: ["hero", "topLeft", "topRight", "midLeft", "accentLeft", "center", "midRight", "lowLeft", "lowCenter", "lowRight"],
    motifs: [
      motif("Seed frame", "FRME", "gold"),
      motif("Leaf marker A", "LEF1", "sage", "leaf-marker", "a"),
      motif("Moth stamp", "MOTH", "plum"),
      motif("Seed seal", "SEAL", "gold"),
      motif("Leaf marker B", "LEF2", "sage", "leaf-marker", "b"),
      motif("Tulip petal", "PETL", "rose"),
      motif("Moth trail", "TRIL", "plum"),
      motif("Sprig clip", "CLIP", "mint"),
      motif("Tulip shine", "SHNE", "rose"),
      motif("Sprig knot", "KNOT", "mint")
    ],
    sheets: [
      { id: "A", name: "Seed strip", paletteId: "gold" },
      { id: "B", name: "Leaf strip", paletteId: "sage" },
      { id: "C", name: "Moth strip", paletteId: "plum" },
      { id: "D", name: "Tulip strip", paletteId: "rose" },
      { id: "E", name: "Sprig strip", paletteId: "mint" }
    ],
    solution: ["A", "B", "C", "A", "D", "B", "E", "C", "D", "E"]
  },
  {
    id: "ftue-11",
    title: "Two Openers",
    caption: "Several clean starts are visible, but the return order still decides whether the page opens or jams.",
    beat: "This is the first late-game page with multiple reasonable opening reads.",
    clipCount: 3,
    mechanics: ["Multiple good openings", "Three-way clip pressure", "Late return chain"],
    callouts: [
      { focus: "tray", text: "More than one opener is valid here. The puzzle lives in the follow-up parking order." },
      { focus: "clips", text: "Clips are strategic storage, not punishment. Use them to hold later chains." }
    ],
    reward: reward("Pressed fern tile", "Adds a pressed fern tile to the album strip."),
    layout: ["topLeft", "hero", "topRight", "midLeft", "center", "accentRight", "midRight", "lowLeft", "lowCenter", "footer"],
    motifs: [
      motif("Butterfly wing A", "WNGA", "plum", "butterfly", "a"),
      motif("Leaf tag A", "LEA1", "sage", "leaf-tag", "a"),
      motif("Tulip bud", "BUD", "rose"),
      motif("Leaf tag B", "LEA2", "sage", "leaf-tag", "b"),
      motif("Seed packet", "PACK", "gold"),
      motif("Butterfly wing B", "WNGB", "plum", "butterfly", "b"),
      motif("Clip shine", "SHNE", "ink"),
      motif("Tulip gloss", "GLOS", "rose"),
      motif("Seed pin", "PIN", "gold"),
      motif("Clip tab", "TAB", "ink")
    ],
    sheets: [
      { id: "A", name: "Butterfly strip", paletteId: "plum" },
      { id: "B", name: "Leaf strip", paletteId: "sage" },
      { id: "C", name: "Tulip strip", paletteId: "rose" },
      { id: "D", name: "Seed strip", paletteId: "gold" },
      { id: "E", name: "Clip strip", paletteId: "ink" }
    ],
    solution: ["A", "B", "C", "B", "D", "A", "E", "C", "D", "E"]
  },
  {
    id: "ftue-12",
    title: "Capstone Collage",
    caption: "The last page combines repeated families, a long return chain, and full clip management without new rules.",
    beat: "Everything from the slice comes together on one readable portrait page.",
    clipCount: 3,
    mechanics: ["Capstone collage", "Repeated families", "Long return chain", "Full clip management"],
    callouts: [
      { focus: "daily", text: "The daily foil page stays available after this clear." },
      { focus: "page", text: "If dense decoration ever hides open silhouettes, the page art needs simplification before more content." }
    ],
    reward: reward("Moss album tab", "Unlocks the Garden Notes album tab color."),
    layout: ["hero", "topLeft", "topRight", "midLeft", "accentLeft", "center", "midRight", "lowLeft", "lowCenter", "lowRight"],
    motifs: [
      motif("Butterfly band", "BAND", "plum", "butterfly", "a"),
      motif("Leaf marker A", "LEF1", "sage", "leaf-marker", "a"),
      motif("Leaf marker B", "LEF2", "sage", "leaf-marker", "b"),
      motif("Tulip frame", "FRME", "rose"),
      motif("Frame gloss", "GLOS", "rose"),
      motif("Seed stamp", "SEED", "gold"),
      motif("Sprig twine", "TWNE", "mint"),
      motif("Twine knot", "KNOT", "mint"),
      motif("Butterfly pin", "PIN", "plum", "butterfly", "b"),
      motif("Foil tag", "FOIL", "ink")
    ],
    sheets: [
      { id: "A", name: "Butterfly strip", paletteId: "plum" },
      { id: "B", name: "Leaf strip", paletteId: "sage" },
      { id: "C", name: "Tulip strip", paletteId: "rose" },
      { id: "D", name: "Seed strip", paletteId: "gold" },
      { id: "E", name: "Foil strip", paletteId: "ink" }
    ],
    solution: ["A", "B", "C", "A", "B", "D", "E", "C", "D", "A"]
  }
];

export const HANDCRAFTED_LEVELS = Object.freeze([
  ...kitchenPlans.map((plan, index) =>
    buildLevelFromPlan({
      ...plan,
      number: index + 1,
      packId: "kitchen-keepsakes"
    })
  ),
  ...gardenPlans.map((plan, index) =>
    buildLevelFromPlan({
      ...plan,
      number: kitchenPlans.length + index + 1,
      packId: "garden-notes"
    })
  )
]);

export function getPackForLevel(level) {
  if (!level || level.kind === "daily") {
    return DAILY_THEME;
  }
  return PACK_BY_ID[level.packId];
}
