import {
  BOARD,
  BUNDLE_LIBRARY,
  CROSSING_LIBRARY,
  GUIDE_LIBRARY,
  PIN_SLOTS,
  pickBundles
} from "./data.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

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
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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

const DAILY_POSTCARDS = [
  {
    title: "Daily Harbor",
    caption: "Two knots only. Read the top layer before you pull.",
    gradient: ["#efe2d0", "#7f91b5", "#47647b"],
    accent: "#647da8"
  },
  {
    title: "Daily Garden",
    caption: "Static guides stay fixed. Use them to scan the clean exit.",
    gradient: ["#f5e6d4", "#a7b765", "#68895a"],
    accent: "#8fa95a"
  },
  {
    title: "Daily Lantern",
    caption: "The daily template reorders pins and crossings from the same data model.",
    gradient: ["#f2e2cf", "#c1735c", "#7b62ac"],
    accent: "#ac634b"
  }
];

export function dailySeedFromDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function generateDailyLevel(seed = dailySeedFromDate()) {
  const random = mulberry32(hashSeed(seed)());
  const bundleIds = shuffle(Object.keys(BUNDLE_LIBRARY), random);
  const bundles = pickBundles(bundleIds);
  const order = shuffle(bundleIds, random);
  const orderIndex = Object.fromEntries(order.map((bundleId, index) => [bundleId, index]));

  const crossings = shuffle(Object.values(CROSSING_LIBRARY), random)
    .filter((crossing) => crossing.pair.every((bundleId) => bundleIds.includes(bundleId)))
    .slice(0, 4)
    .map((crossing, index) => {
      const [first, second] = crossing.pair;
      const over = orderIndex[first] < orderIndex[second] ? first : second;
      const under = over === first ? second : first;
      return {
        id: `daily-cross-${index + 1}`,
        slot: crossing.slot,
        label: crossing.label,
        cell: clone(crossing.cell),
        over,
        under
      };
    });

  const pinTargets = shuffle(order.slice(1), random).slice(0, 3);
  const pins = pinTargets.map((bundleId, index) => {
    const earlier = order.slice(0, orderIndex[bundleId]);
    const requiredCount = Math.min(earlier.length, 1 + Math.floor(random() * Math.min(2, earlier.length)));
    const requiresClear = shuffle(earlier, random).slice(0, requiredCount);
    return {
      id: `daily-pin-${index + 1}`,
      name: `${BUNDLE_LIBRARY[bundleId].name} clasp`,
      cell: clone(PIN_SLOTS[bundleId]),
      blocks: [bundleId],
      requiresClear
    };
  });

  const guides = shuffle(bundleIds, random)
    .slice(0, 3)
    .map((bundleId, index) => ({
      ...clone(GUIDE_LIBRARY[bundleId]),
      id: `daily-guide-${index + 1}`
    }));

  const postcard = clone(DAILY_POSTCARDS[Math.floor(random() * DAILY_POSTCARDS.length)]);

  return {
    id: `daily-${seed}`,
    kind: "daily",
    seed,
    title: `Daily Tangle • ${seed}`,
    number: null,
    beat: "Daily boards keep the same rules but only allow two knots before failure.",
    mechanics: ["2-knot fail meter", "Seeded template"],
    board: BOARD,
    failLimit: 2,
    postcard,
    bundles,
    pins,
    guides,
    crossings
  };
}
