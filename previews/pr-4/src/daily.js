import { DAILY_TEMPLATE_RULES, DAILY_THEME, buildLevelFromPlan } from "./data.js";

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

function fastener(id, type, slot, config = {}) {
  return {
    id,
    type,
    slot,
    blockedBy: [...(config.blockedBy ?? [])],
    blockedReason: config.blockedReason ?? null
  };
}

const DAILY_TEMPLATES = [
  {
    title: "Daily Garden Commission",
    caption: "A seeded studio order with only left-entry rows and already-unlocked fastener rules.",
    beat: "Daily commissions stay deterministic by UTC date so QA can replay the same board.",
    rows: [
      { id: "r1", title: "Petal row", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Leaf row", entry: "left", segments: ["C", "D"] },
      { id: "r3", title: "Cup row", entry: "left", segments: ["E"] },
      { id: "r4", title: "Seal row", entry: "left", segments: ["F"] }
    ],
    stacks: [
      { id: "bench-a", title: "Bench A", stripIds: ["A"] },
      { id: "bench-b", title: "Bench B", stripIds: ["B", "E"] },
      { id: "bench-c", title: "Bench C", stripIds: ["C"] },
      { id: "bench-d", title: "Bench D", stripIds: ["D", "F"] }
    ],
    strips: [
      { id: "A", name: "Petal ribbon", labels: ["Ribbon", "Bloom"], family: "daily-bloom", fasteners: [fastener("a-clamp", "clamp", "left")] },
      { id: "B", name: "Petal cap", labels: ["Cap"], family: "daily-bloom", fasteners: [fastener("b-clamp", "clamp", "right")] },
      { id: "C", name: "Leaf ladder", labels: ["Ladder", "Curl"], family: "daily-leaf", fasteners: [fastener("c-wax", "wax", "top")] },
      { id: "D", name: "Leaf nib", labels: ["Nib"], family: "daily-leaf", fasteners: [fastener("d-clamp", "clamp", "right")] },
      { id: "E", name: "Cup basin", labels: ["Basin", "Lip"], family: "daily-cup", fasteners: [fastener("e-spacer", "spacer", "mouth")] },
      {
        id: "F",
        name: "Ledger wax",
        labels: ["Wax", "Date"],
        family: "daily-ledger",
        fasteners: [
          fastener("f-clamp", "clamp", "left"),
          fastener("f-wax", "wax", "top", {
            blockedBy: ["f-clamp"],
            blockedReason: "The wax ring is still tucked under the clamp ear."
          })
        ]
      }
    ]
  },
  {
    title: "Daily Garden Commission",
    caption: "A seeded studio order with only left-entry rows and already-unlocked fastener rules.",
    beat: "Daily commissions stay deterministic by UTC date so QA can replay the same board.",
    rows: [
      { id: "r1", title: "Bloom row", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Vine row", entry: "left", segments: ["C", "D"] },
      { id: "r3", title: "Cup row", entry: "left", segments: ["E", "F"] },
      { id: "r4", title: "Tag row", entry: "left", segments: ["G"] }
    ],
    stacks: [
      { id: "bench-a", title: "Bench A", stripIds: ["A"] },
      { id: "bench-b", title: "Bench B", stripIds: ["B", "E"] },
      { id: "bench-c", title: "Bench C", stripIds: ["C"] },
      { id: "bench-d", title: "Bench D", stripIds: ["D", "F"] },
      { id: "bench-e", title: "Bench E", stripIds: ["G"] }
    ],
    strips: [
      { id: "A", name: "Bloom panel", labels: ["Panel", "Glow"], family: "daily-bloom", fasteners: [fastener("a-clamp", "clamp", "left")] },
      { id: "B", name: "Bloom cap", labels: ["Cap"], family: "daily-bloom", fasteners: [fastener("b-clamp", "clamp", "right")] },
      { id: "C", name: "Vine stretch", labels: ["Stretch", "Curl"], family: "daily-vine", fasteners: [fastener("c-wax", "wax", "top")] },
      { id: "D", name: "Vine notch", labels: ["Notch"], family: "daily-vine", fasteners: [fastener("d-clamp", "clamp", "right")] },
      { id: "E", name: "Cup body", labels: ["Body", "Rim"], family: "daily-cup", fasteners: [fastener("e-spacer", "spacer", "mouth")] },
      { id: "F", name: "Cup cap", labels: ["Cap"], family: "daily-cup", fasteners: [fastener("f-clamp", "clamp", "left")] },
      { id: "G", name: "Seal ledger", labels: ["Seal", "Date", "Wax"], family: "daily-ledger", fasteners: [fastener("g-clamp", "clamp", "left")] }
    ]
  },
  {
    title: "Daily Garden Commission",
    caption: "A seeded studio order with only left-entry rows and already-unlocked fastener rules.",
    beat: "Daily commissions stay deterministic by UTC date so QA can replay the same board.",
    rows: [
      { id: "r1", title: "Petal row", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Leaf row", entry: "left", segments: ["C", "D"] },
      { id: "r3", title: "Cup row", entry: "left", segments: ["E"] },
      { id: "r4", title: "Ledger row", entry: "left", segments: ["F", "G"] }
    ],
    stacks: [
      { id: "bench-a", title: "Bench A", stripIds: ["A"] },
      { id: "bench-b", title: "Bench B", stripIds: ["B", "E"] },
      { id: "bench-c", title: "Bench C", stripIds: ["C"] },
      { id: "bench-d", title: "Bench D", stripIds: ["D", "F"] },
      { id: "bench-e", title: "Bench E", stripIds: ["G"] }
    ],
    strips: [
      { id: "A", name: "Petal arc", labels: ["Arc", "Light"], family: "daily-bloom", fasteners: [fastener("a-clamp", "clamp", "left")] },
      { id: "B", name: "Petal cap", labels: ["Cap"], family: "daily-bloom", fasteners: [fastener("b-clamp", "clamp", "right")] },
      { id: "C", name: "Leaf braid", labels: ["Braid", "Curl"], family: "daily-leaf", fasteners: [fastener("c-wax", "wax", "top")] },
      { id: "D", name: "Leaf cap", labels: ["Cap"], family: "daily-leaf", fasteners: [fastener("d-clamp", "clamp", "right")] },
      {
        id: "E",
        name: "Cup ledger",
        labels: ["Cup", "Lip", "Saucer"],
        family: "daily-cup",
        fasteners: [
          fastener("e-clamp", "clamp", "left"),
          fastener("e-spacer", "spacer", "mouth", {
            blockedBy: ["e-clamp"],
            blockedReason: "The spacer tail is still tucked behind the lifted clamp."
          })
        ]
      },
      { id: "F", name: "Ledger curve", labels: ["Curve"], family: "daily-ledger", fasteners: [fastener("f-clamp", "clamp", "left")] },
      { id: "G", name: "Wax ledger", labels: ["Wax", "Seal"], family: "daily-ledger", fasteners: [fastener("g-clamp", "clamp", "left")] }
    ]
  }
];

export function dailySeedFromDate(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function generateDailyLevel(seed = dailySeedFromDate()) {
  const random = mulberry32(hashSeed(seed)());
  const template = DAILY_TEMPLATES[Math.floor(random() * DAILY_TEMPLATES.length)];
  const paletteOrder = shuffle(DAILY_TEMPLATE_RULES.allowedPalettes, random);

  const strips = template.strips.map((strip, index) => ({
    id: strip.id,
    name: strip.name,
    stackId: template.stacks.find((stack) => stack.stripIds.includes(strip.id))?.id ?? template.stacks[0].id,
    family: strip.family,
    paletteId: paletteOrder[index % paletteOrder.length],
    labels: [...strip.labels],
    fasteners: strip.fasteners.map((entry) => ({ ...entry }))
  }));

  return buildLevelFromPlan({
    id: `daily-${seed}`,
    kind: "daily",
    seed,
    packId: DAILY_THEME.id,
    title: `${template.title} • ${seed}`,
    caption: template.caption,
    beat: template.beat,
    mechanics: ["Seeded UTC daily", "Unlocked pack-one fasteners", "First-clear wax ledger stamp"],
    callouts: [
      {
        trigger: "start",
        text: `Daily seed ${seed}. Boards refresh on UTC midnight and stay stable for QA.`
      }
    ],
    reward: {
      title: DAILY_THEME.rewardTitle,
      detail: `First clear on ${seed} adds a dated wax ledger stamp to the studio book.`
    },
    rows: template.rows,
    stacks: template.stacks,
    strips
  });
}
