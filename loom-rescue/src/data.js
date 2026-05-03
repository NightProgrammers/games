export const BOARD = Object.freeze({ cols: 6, rows: 8 });
export const STANDARD_FAIL_LIMIT = 3;
export const MILESTONE_LEVELS = new Set([5, 10, 15]);

const pt = (x, y) => ({ x, y });
const clone = (value) => JSON.parse(JSON.stringify(value));

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

const createLevel = ({
  id,
  number,
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
    title: "Morning Pull",
    beat: "A loose bundle leaves the board in one clean pull.",
    mechanics: ["Whole-bundle extraction"],
    postcard: postcard(
      "Window Light",
      "Restore the first postcard by sliding the only loose thread free.",
      ["#f3dbc0", "#df8d67", "#9f533f"],
      "#cf6f4c"
    ),
    bundles: pickBundles(["E"])
  }),
  createLevel({
    id: "ftue-02",
    number: 2,
    title: "Two Loose Ends",
    beat: "Independent exits can be cleared in any order.",
    mechanics: ["Two independent pulls"],
    postcard: postcard(
      "Tea Tray",
      "There is no trick yet. Read the exits and clear both threads.",
      ["#f7e7c9", "#c7ab71", "#7b9d7a"],
      "#a57941"
    ),
    bundles: pickBundles(["E", "F"])
  }),
  createLevel({
    id: "ftue-03",
    number: 3,
    title: "First Overlap",
    beat: "The thread on top must leave before the one underneath.",
    mechanics: ["Two-layer crossing"],
    postcard: postcard(
      "Bridge Post",
      "The crossing badge shows which bundle rides above the other.",
      ["#f0e3cf", "#7597b6", "#35536e"],
      "#567994"
    ),
    bundles: pickBundles(["A", "B"]),
    crossings: [makeCrossing("AB", "B", "A")]
  }),
  createLevel({
    id: "ftue-04",
    number: 4,
    title: "Layer Ladder",
    beat: "Crossing order can chain from one bundle into the next.",
    mechanics: ["Crossing chains"],
    postcard: postcard(
      "Lantern Steps",
      "Read the top layer first, then follow the newly loosened strand.",
      ["#f4ddc9", "#b56f5b", "#54427b"],
      "#8c5a64"
    ),
    bundles: pickBundles(["A", "B", "D"]),
    crossings: [makeCrossing("AB", "B", "A"), makeCrossing("AD", "A", "D")]
  }),
  createLevel({
    id: "ftue-05",
    number: 5,
    title: "Pinned Bloom",
    beat: "Some bundles stay locked until you lift the pin after a clear.",
    mechanics: ["Lock pins"],
    postcard: postcard(
      "Pressed Flowers",
      "Clear the loose cord, lift the pin, then pull the pinned thread.",
      ["#f7e7d0", "#d97c82", "#6b9a64"],
      "#bc6a73"
    ),
    bundles: pickBundles(["B", "C"]),
    pins: [
      makePin("C", {
        id: "pin-c-bloom",
        name: "Bloom pin",
        blocks: ["C"],
        requiresClear: ["B"]
      })
    ]
  }),
  createLevel({
    id: "ftue-06",
    number: 6,
    title: "Cross Then Pin",
    beat: "A bundle can be hidden by a crossing and still hold a pin behind it.",
    mechanics: ["Crossing into pin"],
    postcard: postcard(
      "Harbor Lamp",
      "First untuck the top layer, then lift the pin guarding the garden weave.",
      ["#f6e8d4", "#e19c52", "#497b7f"],
      "#d98e3c"
    ),
    bundles: pickBundles(["A", "B", "C"]),
    pins: [
      makePin("C", {
        id: "pin-c-harbor",
        name: "Harbor pin",
        blocks: ["C"],
        requiresClear: ["A"]
      })
    ],
    crossings: [makeCrossing("AB", "B", "A")]
  }),
  createLevel({
    id: "ftue-07",
    number: 7,
    title: "Guide Intro",
    beat: "Guides are static. They only show the legal pull direction.",
    mechanics: ["Static one-way guides"],
    postcard: postcard(
      "Courier Hall",
      "Guide plates do not rotate in this slice, so read them as fixed signage.",
      ["#efe6d5", "#6c8da9", "#6e9270"],
      "#547994"
    ),
    bundles: pickBundles(["B", "C", "E"]),
    guides: pickGuides(["B", "E"]),
    crossings: [makeCrossing("BE", "B", "E")]
  }),
  createLevel({
    id: "ftue-08",
    number: 8,
    title: "Forked Thread",
    beat: "One top bundle can unlock two different lanes.",
    mechanics: ["Multi-branch crossing read"],
    postcard: postcard(
      "Garden Fork",
      "After the harbor cord leaves, two different threads loosen at once.",
      ["#f3e6d0", "#7f9a68", "#c29253"],
      "#889f61"
    ),
    bundles: pickBundles(["A", "B", "C", "D"]),
    crossings: [
      makeCrossing("AB", "B", "A"),
      makeCrossing("AC", "A", "C"),
      makeCrossing("BD", "B", "D")
    ]
  }),
  createLevel({
    id: "ftue-09",
    number: 9,
    title: "Twin Pins",
    beat: "Pins can stage a strict sequence even when crossings stay simple.",
    mechanics: ["Multiple pin releases"],
    postcard: postcard(
      "Ribbon Shelf",
      "Lift one pin to free the next bundle, then release the second lock.",
      ["#f4e4d1", "#c16776", "#73947c"],
      "#9d5662"
    ),
    bundles: pickBundles(["B", "C", "E"]),
    pins: [
      makePin("C", {
        id: "pin-c-ribbon",
        name: "Ribbon pin",
        blocks: ["C"],
        requiresClear: ["E"]
      }),
      makePin("B", {
        id: "pin-b-ribbon",
        name: "Shelf pin",
        blocks: ["B"],
        requiresClear: ["C"]
      })
    ]
  }),
  createLevel({
    id: "ftue-10",
    number: 10,
    title: "Stamp Weave",
    beat: "Pins and crossings can interleave without custom level logic.",
    mechanics: ["Pin plus crossing mesh"],
    postcard: postcard(
      "Ink Garden",
      "Use the postmark loop to expose the pin before the deeper ribbon can leave.",
      ["#efe0cf", "#8a6cb6", "#5b8f77"],
      "#7057a2"
    ),
    bundles: pickBundles(["A", "C", "D", "E"]),
    pins: [
      makePin("A", {
        id: "pin-a-ink",
        name: "Ink pin",
        blocks: ["A"],
        requiresClear: ["E"]
      })
    ],
    crossings: [makeCrossing("AE", "E", "A"), makeCrossing("CD", "C", "D")]
  }),
  createLevel({
    id: "ftue-11",
    number: 11,
    title: "Quiet Knot",
    beat: "Read two independent branches and decide which one to resolve first.",
    mechanics: ["Parallel branches", "Crossing into pin"],
    postcard: postcard(
      "Quiet Alley",
      "Either branch can start the postcard, but both must end in the right order.",
      ["#f5e6d6", "#6687aa", "#cb8350"],
      "#8e6a8a"
    ),
    bundles: pickBundles(["A", "B", "C", "D", "E"]),
    pins: [
      makePin("C", {
        id: "pin-c-alley",
        name: "Alley pin",
        blocks: ["C"],
        requiresClear: ["A"]
      })
    ],
    crossings: [
      makeCrossing("BE", "B", "E"),
      makeCrossing("AB", "B", "A"),
      makeCrossing("CD", "C", "D")
    ]
  }),
  createLevel({
    id: "ftue-12",
    number: 12,
    title: "Guide Garden",
    beat: "Guides help scan the correct exit before the weave gets dense.",
    mechanics: ["Three guides", "Pin after branch resolve"],
    postcard: postcard(
      "Guide Garden",
      "This board uses the full guide cluster cap, but the rules stay static.",
      ["#f7ead7", "#7ca06b", "#b46d7c"],
      "#6f9659"
    ),
    bundles: pickBundles(["A", "C", "D", "E", "F"]),
    pins: [
      makePin("F", {
        id: "pin-f-garden",
        name: "Garden clasp",
        blocks: ["F"],
        requiresClear: ["D"]
      })
    ],
    guides: pickGuides(["A", "C", "F"]),
    crossings: [
      makeCrossing("AE", "E", "A"),
      makeCrossing("AF", "A", "F"),
      makeCrossing("CD", "C", "D")
    ]
  }),
  createLevel({
    id: "ftue-13",
    number: 13,
    title: "Tension Mesh",
    beat: "Every release should clearly open space for the next one.",
    mechanics: ["Dense crossing graph", "Late pin release"],
    postcard: postcard(
      "Tension Mesh",
      "A late pin keeps the last ribbon from leaving too early.",
      ["#f4e5d4", "#d79647", "#5567bb"],
      "#c27f34"
    ),
    bundles: pickBundles(["A", "B", "C", "D", "F"]),
    pins: [
      makePin("F", {
        id: "pin-f-mesh",
        name: "Mesh clasp",
        blocks: ["F"],
        requiresClear: ["D"]
      })
    ],
    crossings: [
      makeCrossing("AB", "B", "A"),
      makeCrossing("AC", "A", "C"),
      makeCrossing("BD", "B", "D"),
      makeCrossing("CF", "C", "F")
    ]
  }),
  createLevel({
    id: "ftue-14",
    number: 14,
    title: "Pinwheel Lattice",
    beat: "The board reaches slice density while staying readable from data alone.",
    mechanics: ["6 bundles", "2 pins", "3 guides", "4 crossings"],
    postcard: postcard(
      "Pinwheel Lattice",
      "Resolve two branches, then cash both pins at the right moment.",
      ["#efe1d0", "#7293a6", "#cc705c"],
      "#5f879d"
    ),
    bundles: pickBundles(["A", "B", "C", "D", "E", "F"]),
    pins: [
      makePin("A", {
        id: "pin-a-lattice",
        name: "Lattice pin",
        blocks: ["A"],
        requiresClear: ["E"]
      }),
      makePin("F", {
        id: "pin-f-lattice",
        name: "Pinwheel clasp",
        blocks: ["F"],
        requiresClear: ["D"]
      })
    ],
    guides: pickGuides(["B", "C", "E"]),
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
    title: "Festival Postcard",
    beat: "The finale uses the full slice cap: 6 bundles, 3 pins, 3 guides, 4 crossings.",
    mechanics: ["Final FTUE exam"],
    postcard: postcard(
      "Festival Lanterns",
      "The final postcard asks you to read crossings, pins, and guides together.",
      ["#f5e6d3", "#d57959", "#556fc7"],
      "#c8644a"
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
    guides: pickGuides(["A", "B", "C"]),
    crossings: [
      makeCrossing("BE", "B", "E"),
      makeCrossing("AB", "B", "A"),
      makeCrossing("AC", "A", "C"),
      makeCrossing("CD", "C", "D")
    ]
  })
];
