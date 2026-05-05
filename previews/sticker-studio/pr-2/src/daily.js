import { DAILY_THEME, buildLevelFromPlan } from "./data.js";

const DAILY_LAYOUTS = [
  ["hero", "topLeft", "topRight", "midLeft", "center", "midRight", "lowLeft", "lowCenter", "footer"],
  ["topLeft", "hero", "topRight", "midLeft", "accentLeft", "center", "midRight", "lowCenter", "lowRight"],
  ["hero", "topLeft", "topRight", "midLeft", "center", "accentRight", "midRight", "lowLeft", "lowCenter", "lowRight"]
];

const DAILY_MOTIFS = [
  { title: "Foil wing A", short: "WNGA", paletteId: "plum", family: "foil-wing", variant: "a" },
  { title: "Foil wing B", short: "WNGB", paletteId: "plum", family: "foil-wing", variant: "b" },
  { title: "Leaf tab A", short: "LEA1", paletteId: "sage", family: "leaf-tab", variant: "a" },
  { title: "Leaf tab B", short: "LEA2", paletteId: "sage", family: "leaf-tab", variant: "b" },
  { title: "Petal gloss", short: "PETL", paletteId: "rose", family: "petal", variant: "a" },
  { title: "Petal frame", short: "FRME", paletteId: "rose", family: "petal", variant: "b" },
  { title: "Seed mark", short: "SEED", paletteId: "gold", family: "seed-mark", variant: "a" },
  { title: "Seed pin", short: "PIN", paletteId: "gold", family: "seed-mark", variant: "b" },
  { title: "Sprig wrap", short: "WRAP", paletteId: "mint", family: "sprig", variant: "a" },
  { title: "Sprig knot", short: "KNOT", paletteId: "mint", family: "sprig", variant: "b" }
];

const DAILY_SHEETS = [
  { id: "A", name: "Foil strip", paletteId: "plum" },
  { id: "B", name: "Leaf strip", paletteId: "sage" },
  { id: "C", name: "Petal strip", paletteId: "rose" },
  { id: "D", name: "Seed strip", paletteId: "gold" },
  { id: "E", name: "Sprig strip", paletteId: "mint" }
];

const DAILY_TEMPLATES = [
  {
    title: "Daily Foil Spread",
    caption: "A seeded foil page with two clip slots and one date-stamped badge.",
    beat: "Daily pages reuse the same sheet and clip rules with a deterministic UTC date seed.",
    sheets: DAILY_SHEETS.slice(0, 4),
    solution: ["A", "B", "A", "C", "B", "D", "C", "D", "A"]
  },
  {
    title: "Daily Foil Spread",
    caption: "A seeded foil page with two clip slots and one date-stamped badge.",
    beat: "Daily pages reuse the same sheet and clip rules with a deterministic UTC date seed.",
    sheets: DAILY_SHEETS,
    solution: ["A", "B", "C", "C", "A", "D", "D", "B", "E"]
  },
  {
    title: "Daily Foil Spread",
    caption: "A seeded foil page with two clip slots and one date-stamped badge.",
    beat: "Daily pages reuse the same sheet and clip rules with a deterministic UTC date seed.",
    sheets: DAILY_SHEETS,
    solution: ["A", "B", "B", "A", "C", "A", "D", "E", "C", "A"]
  }
];

function hashSeed(seed) {
  let hash = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}

function mulberry32(seed) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function dailySeedFromDate(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function generateDailyLevel(seed = dailySeedFromDate()) {
  const random = mulberry32(hashSeed(seed)());
  const templateIndex = Math.floor(random() * DAILY_TEMPLATES.length);
  const template = DAILY_TEMPLATES[templateIndex];
  const layout = DAILY_LAYOUTS[template.solution.length === 10 ? 2 : templateIndex % 2];
  const motifs = shuffle(DAILY_MOTIFS, random).slice(0, template.solution.length);

  return buildLevelFromPlan({
    id: `daily-${seed}`,
    kind: "daily",
    seed,
    packId: DAILY_THEME.id,
    title: `${template.title} • ${seed}`,
    caption: template.caption,
    beat: template.beat,
    clipCount: 2,
    mechanics: ["Seeded daily page", "Two clip slots", "Date-stamped foil badge"],
    callouts: [
      { focus: "daily", text: "Daily pages are seeded by UTC date for stable QA and first-clear rewards." }
    ],
    reward: {
      title: DAILY_THEME.rewardTitle,
      detail: `First clear on ${seed} adds a foil badge to the album strip.`
    },
    layout: layout.slice(0, template.solution.length),
    motifs,
    sheets: template.sheets,
    solution: template.solution
  });
}
