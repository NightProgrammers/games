import { DAILY_TEMPLATE_DEFINITIONS, INGREDIENT_TYPES, MENU_PACKS } from "./data.js";
import { validateLevel } from "./engine.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

const DAILY_CARD_THEMES = [
  {
    id: "sunset-lacquer",
    accent: "#c96f4e",
    gradient: ["#f3e0c8", "#d18c64", "#925240"]
  },
  {
    id: "market-leaf",
    accent: "#678564",
    gradient: ["#efe4d0", "#95aa6d", "#5f7859"]
  },
  {
    id: "foil-seal",
    accent: "#9f6f53",
    gradient: ["#f2e6d3", "#d9b56f", "#8d6a54"]
  }
];

function hashSeed(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

function pickTheme(random) {
  return clone(DAILY_CARD_THEMES[Math.floor(random() * DAILY_CARD_THEMES.length)]);
}

export function dailySeedFromDate(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getUnlockedDailyPool(highestClearedLevelNumber = 0) {
  if (highestClearedLevelNumber >= 12) {
    return [...MENU_PACKS[1].ingredientPool];
  }
  return [...MENU_PACKS[0].ingredientPool];
}

function labelForIngredient(ingredientId) {
  return INGREDIENT_TYPES[ingredientId]?.family ?? ingredientId;
}

function instantiateTemplate(template, ingredientIds, seed) {
  const tokenMap = Object.fromEntries(template.tokenOrder.map((token, index) => [token, ingredientIds[index]]));
  const mappedCompartments = template.compartments.map((compartment) => {
    const ingredientId = tokenMap[compartment.acceptedSlots[0]];
    return {
      ...clone(compartment),
      label: `${labelForIngredient(ingredientId)} Bay`,
      acceptedSlots: compartment.acceptedSlots.map((token) => tokenMap[token])
    };
  });

  const mappedLayers = template.layers.map((layer) => ({
    ...clone(layer),
    ingredientTypeId: tokenMap[layer.ingredientTypeId]
  }));

  return {
    id: `daily-${seed}-${template.id}`,
    kind: "daily",
    seed,
    templateId: template.id,
    title: `Daily Special • ${seed}`,
    beat: "Daily specials keep the same fastener-first rules, but the foil seal only appears once per UTC date.",
    mechanics: ["Daily special", "Seeded template"],
    rewardId: "reward-daily",
    journalTitle: "Foil Seal",
    journalCaption: "A daily lunch order built from a deterministic UTC seed.",
    compartments: mappedCompartments,
    stacks: clone(template.stacks),
    layers: mappedLayers,
    fasteners: clone(template.fasteners),
    tutorialSteps: [],
    theme: pickTheme(mulberry32(hashSeed(seed + template.id)))
  };
}

export function generateDailyLevel(
  seed = dailySeedFromDate(),
  { unlockedIngredientIds = getUnlockedDailyPool(6) } = {}
) {
  const baseSeed = hashSeed(seed);
  const random = mulberry32(baseSeed);
  const templateOrder = shuffle(DAILY_TEMPLATE_DEFINITIONS, random);
  const pool = unlockedIngredientIds.filter((ingredientId) => Boolean(INGREDIENT_TYPES[ingredientId]));

  if (pool.length < 4) {
    throw new Error("Daily generation requires at least four unlocked ingredients.");
  }

  for (let attempt = 0; attempt < templateOrder.length * 6; attempt += 1) {
    const template = templateOrder[attempt % templateOrder.length];
    const attemptRandom = mulberry32(baseSeed + attempt * 97);
    const ingredientIds = shuffle(pool, attemptRandom).slice(0, template.tokenOrder.length);
    const level = instantiateTemplate(template, ingredientIds, seed);
    const validation = validateLevel(level);

    if (validation.ok) {
      return {
        ...level,
        solveTarget: template.solveTarget
      };
    }
  }

  throw new Error(`Unable to generate a valid daily special for ${seed}.`);
}
