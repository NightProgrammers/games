export const BOARD = Object.freeze({ cols: 6, rows: 8 });
export const STANDARD_FAIL_LIMIT = 3;
export const MILESTONE_LEVELS = new Set([5, 10, 15]);
export const POSTCARD_SETS = Object.freeze([
  {
    id: "coastal-morning",
    title: "Coastal Morning",
    accent: "#cf6f4c",
    gradient: ["#f3dbc0", "#df8d67", "#9f533f"],
    nextTitle: "Flower Shop Window"
  },
  {
    id: "flower-shop-window",
    title: "Flower Shop Window",
    accent: "#8b7a4c",
    gradient: ["#f7e7c9", "#c7ab71", "#7b9d7a"],
    nextTitle: "Tea House Garden"
  },
  {
    id: "tea-house-garden",
    title: "Tea House Garden",
    accent: "#6a7ea3",
    gradient: ["#efe0cf", "#7f91b5", "#47647b"],
    nextTitle: "Daily Foil Stamp"
  }
]);

const pt = (x, y) => ({ x, y });
const clone = (value) => JSON.parse(JSON.stringify(value));
const POSTCARD_SET_MAP = Object.fromEntries(POSTCARD_SETS.map((set) => [set.id, set]));

export const BUNDLE_LIBRARY = Object.freeze({
  A: {
    id: "A",
    name: "Dawn Ribbon",
    color: "#dd6f63",
    accent: "#8f3d38",
    offset: { x: -0.18, y: -0.12 },
    points: [pt(1, 0), pt(1, 2), pt(4, 2), pt(4, 4)]
  },
  B: {
    id: "B",
    name: "Harbor Cord",
    color: "#2e7a78",
    accent: "#1e4f4d",
    offset: { x: 0.18, y: -0.08 },
    points: [pt(5, 1), pt(3, 1), pt(3, 4), pt(1, 4), pt(1, 7)]
  },
  C: {
    id: "C",
    name: "Garden Weft",
    color: "#d8a145",
    accent: "#8c6428",
    offset: { x: 0.12, y: 0.16 },
    points: [pt(5, 7), pt(5, 5), pt(2, 5), pt(2, 1)]
  },
  D: {
    id: "D",
    name: "Lantern Strand",
    color: "#5b66cf",
    accent: "#363d85",
    offset: { x: -0.14, y: 0.12 },
    points: [pt(0, 6), pt(2, 6), pt(2, 3), pt(5, 3)]
  },
  E: {
    id: "E",
    name: "Postmark Loop",
    color: "#7b9b72",
    accent: "#4d6549",
    offset: { x: -0.08, y: -0.18 },
    points: [pt(3, 0), pt(3, 1), pt(0, 1)]
  },
  F: {
    id: "F",
    name: "Shore Twine",
    color: "#b86a96",
    accent: "#73415d",
    offset: { x: 0.16, y: 0.14 },
    points: [pt(5, 4), pt(4, 4), pt(4, 7)]
  }
});

export const GUIDE_LIBRARY = Object.freeze({
  A: {
    id: "guide-a",
    name: "North Sleeve",
    direction: "up",
    bundleIds: ["A"],
    cells: [pt(1, 1)]
  },
  B: {
    id: "guide-b",
    name: "Harbor Gate",
    direction: "right",
    bundleIds: ["B"],
    cells: [pt(4, 1), pt(3, 1)]
  },
  C: {
    id: "guide-c",
    name: "Garden Drop",
    direction: "down",
    bundleIds: ["C"],
    cells: [pt(5, 6)]
  },
  D: {
    id: "guide-d",
    name: "Lantern Rail",
    direction: "left",
    bundleIds: ["D"],
    cells: [pt(1, 6)]
  },
  E: {
    id: "guide-e",
    name: "Postmark Notch",
    direction: "up",
    bundleIds: ["E"],
    cells: [pt(3, 0)]
  },
  F: {
    id: "guide-f",
    name: "Shore Slide",
    direction: "right",
    bundleIds: ["F"],
    cells: [pt(5, 4)]
  }
});

export const PIN_SLOTS = Object.freeze({
  A: pt(4, 3),
  B: pt(1, 6),
  C: pt(5, 6),
  D: pt(2, 4),
  E: pt(2, 1),
  F: pt(4, 6)
});

export const CROSSING_LIBRARY = Object.freeze({
  AB: { slot: "AB", cell: pt(3, 2), pair: ["A", "B"], label: "braid shelf" },
  AC: { slot: "AC", cell: pt(2, 2), pair: ["A", "C"], label: "flower latch" },
  AD: { slot: "AD", cell: pt(4, 3), pair: ["A", "D"], label: "loom bridge" },
  AE: { slot: "AE", cell: pt(1, 1), pair: ["A", "E"], label: "dawn notch" },
  AF: { slot: "AF", cell: pt(4, 4), pair: ["A", "F"], label: "shore seam" },
  BD: { slot: "BD", cell: pt(3, 3), pair: ["B", "D"], label: "harbor bridge" },
  BE: { slot: "BE", cell: pt(3, 1), pair: ["B", "E"], label: "post tuck" },
  CD: { slot: "CD", cell: pt(2, 5), pair: ["C", "D"], label: "garden arch" },
  CE: { slot: "CE", cell: pt(2, 1), pair: ["C", "E"], label: "latch knot" },
  CF: { slot: "CF", cell: pt(4, 5), pair: ["C", "F"], label: "shore arch" }
});

const postcard = (title, caption, gradient, accent) => ({
  title,
  caption,
  gradient,
  accent
});

const postcardForSet = (setId, caption) => {
  const set = POSTCARD_SET_MAP[setId];
  return postcard(set.title, caption, set.gradient, set.accent);
};

const createLevel = ({
  id,
  number,
  packId,
  title,
  beat,
  mechanics,
  postcard: postcardData,
  bundles,
  pins = [],
  guides = [],
  crossings = []
}) => ({
  id,
  kind: "ftue",
  number,
  packId,
  title,
  beat,
  mechanics,
  board: BOARD,
  failLimit: STANDARD_FAIL_LIMIT,
  postcard: postcardData,
  bundles,
  pins,
  guides,
  crossings
});

export const pickBundles = (bundleIds) => bundleIds.map((id) => clone(BUNDLE_LIBRARY[id]));

export const pickGuides = (bundleIds) =>
  bundleIds.map((bundleId, index) => ({
    ...clone(GUIDE_LIBRARY[bundleId]),
    id: `guide-${bundleId.toLowerCase()}-${index + 1}`
  }));

export const makeCrossing = (slotId, over, under) => {
  const slot = CROSSING_LIBRARY[slotId];
  return {
    id: `cross-${slotId.toLowerCase()}-${over.toLowerCase()}-${under.toLowerCase()}`,
    slot: slot.slot,
    cell: clone(slot.cell),
    label: slot.label,
    over,
    under
  };
};

export const makePin = (slotId, config) => ({
  id: config.id,
  name: config.name,
  cell: clone(PIN_SLOTS[slotId]),
  blocks: [...config.blocks],
  requiresClear: [...config.requiresClear]
});

export const HANDCRAFTED_LEVELS = [
  createLevel({
    id: "ftue-01",
    number: 1,
    packId: "coastal-morning",
    title: "First Pull",
    beat: "Learn whole-bundle extraction with two loose exits and no blockers.",
    mechanics: ["Whole-bundle extraction"],
    postcard: postcardForSet(
      "coastal-morning",
      "Restore the first postcard by clearing two free threads from the outer ring."
    ),
    bundles: pickBundles(["E", "F"])
  }),
  createLevel({
    id: "ftue-02",
    number: 2,
    packId: "coastal-morning",
    title: "Over First",
    beat: "A top bundle must leave before the lower crossing can move.",
    mechanics: ["Two-layer crossing"],
    postcard: postcardForSet(
      "coastal-morning",
      "A single crossing teaches that the visible top strand resolves before the lower strand."
    ),
    bundles: pickBundles(["A", "B", "E"]),
    crossings: [makeCrossing("AB", "B", "A")]
  }),
  createLevel({
    id: "ftue-03",
    number: 3,
    packId: "coastal-morning",
    title: "Read the Edge",
    beat: "Mixed exit sides teach players to trace the assigned border, not the nearest edge.",
    mechanics: ["Assigned exit vectors"],
    postcard: postcardForSet(
      "coastal-morning",
      "Three bundles leave from different borders, so the clean read starts at the edge."
    ),
    bundles: pickBundles(["B", "D", "E"])
  }),
  createLevel({
    id: "ftue-04",
    number: 4,
    packId: "coastal-morning",
    title: "First Pin",
    beat: "An exposed pin must lift before the deeper bundle can leave.",
    mechanics: ["Lock pins"],
    postcard: postcardForSet(
      "coastal-morning",
      "Tap the exposed pin first, then finish the gentle pull sequence."
    ),
    bundles: pickBundles(["B", "C", "E"]),
    pins: [
      makePin("C", {
        id: "pin-c-first",
        name: "First clasp",
        blocks: ["C"],
        requiresClear: ["E"]
      })
    ]
  }),
  createLevel({
    id: "ftue-05",
    number: 5,
    packId: "coastal-morning",
    title: "Pin Then Pull Chain",
    beat: "A pin and crossing interleave into the first postcard-set finish.",
    mechanics: ["Pin and crossing chain"],
    postcard: postcardForSet(
      "coastal-morning",
      "Clear the top layer, lift the clasp it was hiding, and stitch the first postcard set closed."
    ),
    bundles: pickBundles(["A", "B", "C", "E"]),
    pins: [
      makePin("C", {
        id: "pin-c-chain",
        name: "Chain clasp",
        blocks: ["C"],
        requiresClear: ["A"]
      })
    ],
    crossings: [makeCrossing("AB", "B", "A")]
  }),
  createLevel({
    id: "ftue-06",
    number: 6,
    packId: "flower-shop-window",
    title: "Arrow Direction",
    beat: "Static guide arrows enter the slice as readable exit signage.",
    mechanics: ["Static one-way guides"],
    postcard: postcardForSet(
      "flower-shop-window",
      "The first guide board stays light: read the fixed arrow cue before committing a pull."
    ),
    bundles: pickBundles(["B", "C", "E", "F"]),
    guides: pickGuides(["B"])
  }),
  createLevel({
    id: "ftue-07",
    number: 7,
    packId: "flower-shop-window",
    title: "Crossing + Guide",
    beat: "A lower-layer path can still need guide read before it becomes actionable.",
    mechanics: ["Guide on a lower-layer path"],
    postcard: postcardForSet(
      "flower-shop-window",
      "A crossing and guide share the same read, keeping the blocker cluster local and legible."
    ),
    bundles: pickBundles(["A", "B", "C", "E"]),
    guides: pickGuides(["A"]),
    crossings: [makeCrossing("AB", "B", "A")]
  }),
  createLevel({
    id: "ftue-08",
    number: 8,
    packId: "flower-shop-window",
    title: "Covered Pin",
    beat: "Two pins stage a clean sequence without letting the board turn noisy.",
    mechanics: ["Two pins on layered routes"],
    postcard: postcardForSet(
      "flower-shop-window",
      "The visible path is simple, but the second clasp only matters after the first branch clears."
    ),
    bundles: pickBundles(["A", "B", "C", "D", "E"]),
    pins: [
      makePin("C", {
        id: "pin-c-covered",
        name: "Covered clasp",
        blocks: ["C"],
        requiresClear: ["A"]
      }),
      makePin("D", {
        id: "pin-d-covered",
        name: "Lower rail pin",
        blocks: ["D"],
        requiresClear: ["B"]
      })
    ]
  }),
  createLevel({
    id: "ftue-09",
    number: 9,
    packId: "flower-shop-window",
    title: "False Easy Exit",
    beat: "Several bundles look equally loose, but tracing the full path matters more than color.",
    mechanics: ["Mixed exit-side scan"],
    postcard: postcardForSet(
      "flower-shop-window",
      "This board mirrors multiple edge reads so the player must scan before tugging."
    ),
    bundles: pickBundles(["B", "C", "D", "E", "F"])
  }),
  createLevel({
    id: "ftue-10",
    number: 10,
    packId: "flower-shop-window",
    title: "Mid-arc Mix",
    beat: "Pins, guide signage, and a single crossing combine into the second postcard finish.",
    mechanics: ["Two pins plus one guide cluster"],
    postcard: postcardForSet(
      "flower-shop-window",
      "This is the mid-arc check: solve a local blocker cluster, then stamp the second postcard set."
    ),
    bundles: pickBundles(["A", "B", "C", "E", "F"]),
    pins: [
      makePin("A", {
        id: "pin-a-midarc",
        name: "Window pin",
        blocks: ["A"],
        requiresClear: ["E"]
      }),
      makePin("C", {
        id: "pin-c-midarc",
        name: "Stem clasp",
        blocks: ["C"],
        requiresClear: ["A"]
      })
    ],
    guides: pickGuides(["B"]),
    crossings: [makeCrossing("AB", "B", "A")]
  }),
  createLevel({
    id: "ftue-11",
    number: 11,
    packId: "tea-house-garden",
    title: "Double Crossing",
    beat: "Two separated crossings ask the player to scan the nearest unresolved layer first.",
    mechanics: ["Separated crossing reads"],
    postcard: postcardForSet(
      "tea-house-garden",
      "The first garden board splits depth into two quiet branches instead of one dense knot."
    ),
    bundles: pickBundles(["A", "B", "C", "D", "F"]),
    crossings: [makeCrossing("AB", "B", "A"), makeCrossing("CF", "C", "F")]
  }),
  createLevel({
    id: "ftue-12",
    number: 12,
    packId: "tea-house-garden",
    title: "Pressure Test",
    beat: "The first full 6-bundle board makes the 3-knot budget feel relevant without becoming unreadable.",
    mechanics: ["6-bundle pressure test"],
    postcard: postcardForSet(
      "tea-house-garden",
      "This board expands to the full slice footprint while keeping at least one clean edge opener."
    ),
    bundles: pickBundles(["A", "B", "C", "D", "E", "F"]),
    pins: [
      makePin("A", {
        id: "pin-a-pressure",
        name: "Pressure clasp",
        blocks: ["A"],
        requiresClear: ["E"]
      })
    ],
    crossings: [
      makeCrossing("AB", "B", "A"),
      makeCrossing("CD", "C", "D"),
      makeCrossing("CF", "C", "F")
    ]
  }),
  createLevel({
    id: "ftue-13",
    number: 13,
    packId: "tea-house-garden",
    title: "Soft Braid",
    beat: "Three crossings create density, but two opening routes stay visible at the edge.",
    mechanics: ["Multiple valid openings"],
    postcard: postcardForSet(
      "tea-house-garden",
      "A softer braid lets two different starts succeed, proving the slice is not single-path only."
    ),
    bundles: pickBundles(["A", "B", "C", "D", "E", "F"]),
    crossings: [makeCrossing("AB", "B", "A"), makeCrossing("BE", "B", "E"), makeCrossing("CF", "C", "F")]
  }),
  createLevel({
    id: "ftue-14",
    number: 14,
    packId: "tea-house-garden",
    title: "Color Trap",
    beat: "Close visual neighbors make the depth halos and exit arrows do the real readability work.",
    mechanics: ["Close-palette readability test"],
    postcard: postcardForSet(
      "tea-house-garden",
      "Readability gets stress-tested here: similar tones share the board but not the same blockers."
    ),
    bundles: pickBundles(["A", "B", "C", "D", "E", "F"]),
    pins: [
      makePin("A", {
        id: "pin-a-color",
        name: "Trap pin",
        blocks: ["A"],
        requiresClear: ["E"]
      }),
      makePin("F", {
        id: "pin-f-color",
        name: "Shade clasp",
        blocks: ["F"],
        requiresClear: ["D"]
      })
    ],
    guides: pickGuides(["B", "C"]),
    crossings: [
      makeCrossing("BE", "B", "E"),
      makeCrossing("AB", "B", "A"),
      makeCrossing("CD", "C", "D"),
      makeCrossing("CF", "C", "F")
    ]
  }),
  createLevel({
    id: "ftue-15",
    number: 15,
    packId: "tea-house-garden",
    title: "Slice Finale",
    beat: "The finale hits the slice cap with 6 bundles, 3 pins, 2 guide chains, and 4 crossings.",
    mechanics: ["Final FTUE exam"],
    postcard: postcardForSet(
      "tea-house-garden",
      "Every slice rule lands together here, closing the third postcard set and unlocking the daily foil stamp."
    ),
    bundles: pickBundles(["A", "B", "C", "D", "E", "F"]),
    pins: [
      makePin("A", {
        id: "pin-a-festival",
        name: "Festival pin",
        blocks: ["A"],
        requiresClear: ["E"]
      }),
      makePin("C", {
        id: "pin-c-festival",
        name: "Petal pin",
        blocks: ["C"],
        requiresClear: ["A"]
      }),
      makePin("D", {
        id: "pin-d-festival",
        name: "Lantern pin",
        blocks: ["D"],
        requiresClear: ["F"]
      })
    ],
    guides: pickGuides(["A", "B"]),
    crossings: [
      makeCrossing("BE", "B", "E"),
      makeCrossing("AB", "B", "A"),
      makeCrossing("AC", "A", "C"),
      makeCrossing("CD", "C", "D")
    ]
  })
];
