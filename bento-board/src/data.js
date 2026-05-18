const clone = (value) => JSON.parse(JSON.stringify(value));

const slots = (ingredientTypeId, count) =>
  Array.from({ length: count }, () => ingredientTypeId);

const layer = (id, ingredientTypeId, targetCompartmentId, blockerIds = [], artVariant = "strip") => ({
  kind: "layer",
  id,
  ingredientTypeId,
  targetCompartmentId,
  blockerIds,
  artVariant
});

const dividerItem = (id) => ({
  kind: "divider",
  id
});

const stack = (id, laneIndex, title, accent, items, exitPosition = "down") => ({
  id,
  laneIndex,
  title,
  accent,
  exitPosition,
  items
});

const pick = (id, stackId, layerId, label, overlappingFastenerIds = []) => ({
  id,
  type: "pick",
  stackId,
  label,
  anchorLayerId: layerId,
  controlledLayerIds: [layerId],
  dependencyIds: [],
  overlappingFastenerIds,
  visibilityRule: "front-layer-head",
  hitTarget: { width: 56, height: 56 }
});

const band = (id, stackId, controlledLayerIds, label, dependencyIds = []) => ({
  id,
  type: "band",
  stackId,
  label,
  controlledLayerIds,
  dependencyIds,
  overlappingFastenerIds: [],
  visibilityRule: "front-segment-tabs",
  hitTarget: { width: 60, height: 60 }
});

const divider = (id, stackId, label) => ({
  id,
  type: "divider",
  stackId,
  label,
  controlledLayerIds: [],
  dependencyIds: [],
  overlappingFastenerIds: [],
  visibilityRule: "mouth-tab",
  hitTarget: { width: 64, height: 48 }
});

const compartment = (id, label, ingredientTypeId, count, artSkin) => ({
  id,
  label,
  acceptedSlots: slots(ingredientTypeId, count),
  artSkin
});

const tutorialStep = (id, trigger, highlightedIds, copy) => ({
  id,
  trigger,
  highlightedIds,
  copy
});

function createLevel({
  id,
  number,
  packId,
  title,
  beat,
  mechanics,
  rewardId,
  journalTitle,
  journalCaption,
  compartments,
  stacks,
  fasteners,
  tutorialSteps = []
}) {
  const layers = [];
  const normalizedStacks = stacks.map((stackDefinition) => ({
    ...stackDefinition,
    items: stackDefinition.items.map((item) => {
      if (item.kind === "layer") {
        layers.push({
          ...item,
          stackId: stackDefinition.id
        });
        return { kind: "layer", id: item.id };
      }
      return item;
    })
  }));

  return {
    id,
    kind: "campaign",
    number,
    packId,
    title,
    beat,
    mechanics,
    rewardId,
    journalTitle,
    journalCaption,
    compartments,
    stacks: normalizedStacks,
    layers,
    fasteners,
    tutorialSteps
  };
}

function createDailyTemplate({
  id,
  title,
  subtitle,
  tokenOrder,
  compartments,
  stacks,
  fasteners,
  solveTarget
}) {
  const layers = [];
  const normalizedStacks = stacks.map((stackDefinition) => ({
    ...stackDefinition,
    items: stackDefinition.items.map((item) => {
      if (item.kind === "layer") {
        layers.push({
          ...item,
          stackId: stackDefinition.id
        });
        return { kind: "layer", id: item.id };
      }
      return item;
    })
  }));

  return {
    id,
    title,
    subtitle,
    tokenOrder,
    compartments,
    stacks: normalizedStacks,
    layers,
    fasteners,
    solveTarget
  };
}

export const MENU_PACKS = Object.freeze([
  {
    id: "picnic-basics",
    title: "Picnic Basics",
    accent: "#cc714b",
    clothTitle: "Dawn Gingham",
    ingredientPool: ["rice", "tamago", "tomato", "broccoli"],
    levelNumbers: [1, 2, 3, 4, 5, 6]
  },
  {
    id: "market-lunch",
    title: "Market Lunch",
    accent: "#58755f",
    clothTitle: "Moss Check",
    ingredientPool: ["rice", "tamago", "tomato", "broccoli", "salmon", "cucumber", "shrimp", "tofu"],
    levelNumbers: [7, 8, 9, 10, 11, 12]
  }
]);

export const INGREDIENT_TYPES = Object.freeze({
  rice: {
    id: "rice",
    family: "Rice Strip",
    shortLabel: "RI",
    tint: "#f4ead9",
    accent: "#bb8d5c",
    outline: "grain"
  },
  tamago: {
    id: "tamago",
    family: "Tamago",
    shortLabel: "EG",
    tint: "#f5cc67",
    accent: "#ae7a1f",
    outline: "sun"
  },
  tomato: {
    id: "tomato",
    family: "Tomato",
    shortLabel: "TO",
    tint: "#e66e57",
    accent: "#9c4232",
    outline: "seed"
  },
  broccoli: {
    id: "broccoli",
    family: "Broccoli",
    shortLabel: "BR",
    tint: "#77a55f",
    accent: "#46693a",
    outline: "floret"
  },
  salmon: {
    id: "salmon",
    family: "Salmon",
    shortLabel: "SA",
    tint: "#f18a6d",
    accent: "#9b4d3f",
    outline: "wave"
  },
  cucumber: {
    id: "cucumber",
    family: "Cucumber",
    shortLabel: "CU",
    tint: "#92c08f",
    accent: "#507850",
    outline: "slice"
  },
  shrimp: {
    id: "shrimp",
    family: "Shrimp",
    shortLabel: "SH",
    tint: "#f0b49a",
    accent: "#9d6652",
    outline: "curl"
  },
  tofu: {
    id: "tofu",
    family: "Tofu",
    shortLabel: "TF",
    tint: "#efe4ca",
    accent: "#9d835e",
    outline: "press"
  }
});

export const REWARD_DEFINITIONS = Object.freeze([
  {
    id: "reward-01",
    title: "Clover Stamp",
    copy: "A soft green stamp lands in the lunch journal."
  },
  {
    id: "reward-02",
    title: "Band Note",
    copy: "The recipe card keeps a note about clearing loops before the slide."
  },
  {
    id: "reward-03",
    title: "Paper Seal",
    copy: "A divider sticker marks the first paper-gate lunch."
  },
  {
    id: "reward-04",
    title: "Slot Study",
    copy: "The journal records the first exact-count lunch order."
  },
  {
    id: "reward-05",
    title: "Overflow Note",
    copy: "The team notes that capacity readability matters before any denser authoring."
  },
  {
    id: "reward-06",
    title: "Dawn Gingham Cloth",
    copy: "Level 6 unlocks the first cloth pattern for the order strip."
  },
  {
    id: "reward-07",
    title: "Market Stamp",
    copy: "A new market-page stamp tracks repeated family planning."
  },
  {
    id: "reward-08",
    title: "Loop Ledger",
    copy: "Dense band dependencies get their own margin note in the journal."
  },
  {
    id: "reward-09",
    title: "Hidden Gate Note",
    copy: "A folded page marks the first delayed divider reveal."
  },
  {
    id: "reward-10",
    title: "Chain Ribbon",
    copy: "The journal highlights a multi-slide lunch chain."
  },
  {
    id: "reward-11",
    title: "Counter Sketch",
    copy: "A packed countertop sketch tracks the readability stress test."
  },
  {
    id: "reward-12",
    title: "Moss Check Cloth",
    copy: "The capstone unlocks the second cloth pattern."
  },
  {
    id: "reward-daily",
    title: "Foil Chopstick Seal",
    copy: "The daily special awards one dated foil seal on first clear."
  }
]);

export const HANDCRAFTED_LEVELS = [
  createLevel({
    id: "picnic-01",
    number: 1,
    packId: "picnic-basics",
    title: "First Pick",
    beat: "Tap the exposed bead picks. The touched stack resolves automatically when the blocker comes off.",
    mechanics: ["Pick introduction"],
    rewardId: "reward-01",
    journalTitle: "Egg & Rice Pair",
    journalCaption: "Two simple lanes teach that players only remove fasteners, never drag ingredients.",
    compartments: [
      compartment("rice-box", "Rice Bay", "rice", 2, "amber"),
      compartment("egg-box", "Tamago Cup", "tamago", 2, "coral")
    ],
    stacks: [
      stack("l1-stack-a", 0, "Sunrise Stack", "#d78559", [
        layer("l1-a1", "tamago", "egg-box", ["l1-pick-a1"]),
        layer("l1-a2", "rice", "rice-box", ["l1-pick-a2"])
      ]),
      stack("l1-stack-b", 1, "Picnic Stack", "#a85e3f", [
        layer("l1-b1", "rice", "rice-box", ["l1-pick-b1"]),
        layer("l1-b2", "tamago", "egg-box", ["l1-pick-b2"])
      ])
    ],
    fasteners: [
      pick("l1-pick-a1", "l1-stack-a", "l1-a1", "Sunrise pick"),
      pick("l1-pick-a2", "l1-stack-a", "l1-a2", "Rice pick"),
      pick("l1-pick-b1", "l1-stack-b", "l1-b1", "Bay pick"),
      pick("l1-pick-b2", "l1-stack-b", "l1-b2", "Egg pick")
    ],
    tutorialSteps: [
      tutorialStep(
        "l1-start",
        "start",
        ["l1-pick-a1", "l1-pick-b1"],
        "Tap a bead pick. Only the touched stack resolves, and the freed ingredient slides on its own."
      )
    ]
  }),
  createLevel({
    id: "picnic-02",
    number: 2,
    packId: "picnic-basics",
    title: "First Band",
    beat: "Bands wait until every pick inside their loop has been cleared.",
    mechanics: ["Band introduction"],
    rewardId: "reward-02",
    journalTitle: "Looped Sandwich",
    journalCaption: "The first elastic band teaches that visible tabs can still be mechanically blocked.",
    compartments: [
      compartment("rice-box", "Rice Bay", "rice", 3, "amber"),
      compartment("egg-box", "Tamago Cup", "tamago", 2, "coral")
    ],
    stacks: [
      stack("l2-stack-a", 0, "Band Stack", "#d9894e", [
        layer("l2-a1", "tamago", "egg-box", ["l2-pick-a1", "l2-band-a"]),
        layer("l2-a2", "rice", "rice-box", ["l2-band-a"]),
        layer("l2-a3", "rice", "rice-box", ["l2-pick-a3"])
      ]),
      stack("l2-stack-b", 1, "Lunch Strip", "#b36542", [
        layer("l2-b1", "tamago", "egg-box", ["l2-pick-b1"]),
        layer("l2-b2", "rice", "rice-box", ["l2-pick-b2"])
      ])
    ],
    fasteners: [
      pick("l2-pick-a1", "l2-stack-a", "l2-a1", "Loop pick"),
      band("l2-band-a", "l2-stack-a", ["l2-a1", "l2-a2"], "Dawn band", ["l2-pick-a1"]),
      pick("l2-pick-a3", "l2-stack-a", "l2-a3", "Back rice pick"),
      pick("l2-pick-b1", "l2-stack-b", "l2-b1", "Tamago pick"),
      pick("l2-pick-b2", "l2-stack-b", "l2-b2", "Rice pick")
    ],
    tutorialSteps: [
      tutorialStep(
        "l2-start",
        "start",
        ["l2-pick-a1", "l2-band-a"],
        "Bands can be visible before they are removable. Clear the picks inside the loop first."
      ),
      tutorialStep(
        "l2-after-pick",
        "after:l2-pick-a1",
        ["l2-band-a"],
        "Now the band tabs are legal. Removing the band can release a short slide chain."
      )
    ]
  }),
  createLevel({
    id: "picnic-03",
    number: 3,
    packId: "picnic-basics",
    title: "First Divider",
    beat: "Paper dividers are stack-mouth gates. Freed layers still wait if the gate is closed.",
    mechanics: ["Divider introduction"],
    rewardId: "reward-03",
    journalTitle: "Folded Bento",
    journalCaption: "A paper tab at the stack mouth blocks everything behind it until it is exposed and removed.",
    compartments: [
      compartment("rice-box", "Rice Bay", "rice", 2, "amber"),
      compartment("egg-box", "Tamago Cup", "tamago", 2, "coral"),
      compartment("tomato-box", "Tomato Pocket", "tomato", 2, "berry")
    ],
    stacks: [
      stack("l3-stack-a", 0, "Paper Gate", "#cf8251", [
        layer("l3-a1", "tamago", "egg-box", ["l3-pick-a1"]),
        dividerItem("l3-divider-a"),
        layer("l3-a2", "rice", "rice-box")
      ]),
      stack("l3-stack-b", 1, "Field Stack", "#b76a43", [
        layer("l3-b1", "tomato", "tomato-box", ["l3-pick-b1"]),
        layer("l3-b2", "rice", "rice-box", ["l3-pick-b2"])
      ]),
      stack("l3-stack-c", 2, "Garden Stack", "#9e5a3b", [
        layer("l3-c1", "tamago", "egg-box", ["l3-pick-c1"]),
        layer("l3-c2", "tomato", "tomato-box", ["l3-pick-c2"])
      ])
    ],
    fasteners: [
      pick("l3-pick-a1", "l3-stack-a", "l3-a1", "Gate pick"),
      divider("l3-divider-a", "l3-stack-a", "Washi divider"),
      pick("l3-pick-b1", "l3-stack-b", "l3-b1", "Tomato pick"),
      pick("l3-pick-b2", "l3-stack-b", "l3-b2", "Rice pick"),
      pick("l3-pick-c1", "l3-stack-c", "l3-c1", "Egg pick"),
      pick("l3-pick-c2", "l3-stack-c", "l3-c2", "Tomato bead")
    ],
    tutorialSteps: [
      tutorialStep(
        "l3-start",
        "start",
        ["l3-divider-a"],
        "Divider tabs matter only when they reach the front of the stack mouth."
      ),
      tutorialStep(
        "l3-after-pick",
        "after:l3-pick-a1",
        ["l3-divider-a"],
        "The tamago slides first. The paper tab becomes the new front item, so it can lift next."
      )
    ]
  }),
  createLevel({
    id: "picnic-04",
    number: 4,
    packId: "picnic-basics",
    title: "Read the Slots",
    beat: "Compartment pips are exact counts. The lunchbox and recipe card mirror the same remaining needs.",
    mechanics: ["Exact slot counts"],
    rewardId: "reward-04",
    journalTitle: "Slot Counting",
    journalCaption: "The first repeated-count lunch shows why each compartment uses explicit pips, not hidden volume.",
    compartments: [
      compartment("rice-box", "Rice Bay", "rice", 3, "amber"),
      compartment("tomato-box", "Tomato Pocket", "tomato", 2, "berry"),
      compartment("broccoli-box", "Broccoli Nook", "broccoli", 2, "moss")
    ],
    stacks: [
      stack("l4-stack-a", 0, "Market Red", "#d57c52", [
        layer("l4-a1", "tomato", "tomato-box", ["l4-pick-a1"]),
        layer("l4-a2", "rice", "rice-box", ["l4-pick-a2"])
      ]),
      stack("l4-stack-b", 1, "Garden Green", "#8ba765", [
        layer("l4-b1", "broccoli", "broccoli-box", ["l4-pick-b1"]),
        layer("l4-b2", "rice", "rice-box", ["l4-pick-b2"])
      ]),
      stack("l4-stack-c", 2, "Counter Mix", "#bf6940", [
        layer("l4-c1", "rice", "rice-box", ["l4-pick-c1"]),
        layer("l4-c2", "broccoli", "broccoli-box", ["l4-pick-c2"]),
        layer("l4-c3", "tomato", "tomato-box", ["l4-pick-c3"])
      ])
    ],
    fasteners: [
      pick("l4-pick-a1", "l4-stack-a", "l4-a1", "Tomato bead"),
      pick("l4-pick-a2", "l4-stack-a", "l4-a2", "Rice bead"),
      pick("l4-pick-b1", "l4-stack-b", "l4-b1", "Broccoli pick"),
      pick("l4-pick-b2", "l4-stack-b", "l4-b2", "Rice pick"),
      pick("l4-pick-c1", "l4-stack-c", "l4-c1", "Front rice pick"),
      pick("l4-pick-c2", "l4-stack-c", "l4-c2", "Green pick"),
      pick("l4-pick-c3", "l4-stack-c", "l4-c3", "Back tomato pick")
    ],
    tutorialSteps: [
      tutorialStep(
        "l4-start",
        "start",
        ["rice-box"],
        "The dashed slot pips are exact needs. If three rice pips remain, the lunch still needs three rice strips."
      )
    ]
  }),
  createLevel({
    id: "picnic-05",
    number: 5,
    packId: "picnic-basics",
    title: "Busy Sidecar",
    beat: "Bands, picks, and a divider now share the countertop. Read the mouth of each stack before you commit.",
    mechanics: ["Two bands", "First dense read"],
    rewardId: "reward-05",
    journalTitle: "Sidecar Warning",
    journalCaption: "Readability gets stricter once multiple fastener types share the same small stack field.",
    compartments: [
      compartment("rice-box", "Rice Bay", "rice", 2, "amber"),
      compartment("egg-box", "Tamago Cup", "tamago", 2, "coral"),
      compartment("tomato-box", "Tomato Pocket", "tomato", 2, "berry"),
      compartment("broccoli-box", "Broccoli Nook", "broccoli", 1, "moss")
    ],
    stacks: [
      stack("l5-stack-a", 0, "Loop Left", "#d07c4f", [
        layer("l5-a1", "tamago", "egg-box", ["l5-pick-a1", "l5-band-a"]),
        layer("l5-a2", "rice", "rice-box", ["l5-band-a"])
      ]),
      stack("l5-stack-b", 1, "Paper Middle", "#b0613f", [
        layer("l5-b1", "tomato", "tomato-box", ["l5-pick-b1"]),
        dividerItem("l5-divider-b"),
        layer("l5-b2", "broccoli", "broccoli-box")
      ]),
      stack("l5-stack-c", 2, "Loop Right", "#a45a3d", [
        layer("l5-c1", "rice", "rice-box", ["l5-pick-c1", "l5-band-c"]),
        layer("l5-c2", "tamago", "egg-box", ["l5-band-c"]),
        layer("l5-c3", "tomato", "tomato-box", ["l5-pick-c3"])
      ])
    ],
    fasteners: [
      pick("l5-pick-a1", "l5-stack-a", "l5-a1", "Left loop pick"),
      band("l5-band-a", "l5-stack-a", ["l5-a1", "l5-a2"], "Left cloth band", ["l5-pick-a1"]),
      pick("l5-pick-b1", "l5-stack-b", "l5-b1", "Tomato bead"),
      divider("l5-divider-b", "l5-stack-b", "Lunch paper"),
      pick("l5-pick-c1", "l5-stack-c", "l5-c1", "Right loop pick"),
      band("l5-band-c", "l5-stack-c", ["l5-c1", "l5-c2"], "Right cloth band", ["l5-pick-c1"]),
      pick("l5-pick-c3", "l5-stack-c", "l5-c3", "Back tomato pick")
    ],
    tutorialSteps: [
      tutorialStep(
        "l5-start",
        "start",
        ["l5-band-a", "l5-divider-b", "l5-band-c"],
        "This is the first crowded read. Focus on the front-most legal fastener in each lane, not every peeking part at once."
      )
    ]
  }),
  createLevel({
    id: "picnic-06",
    number: 6,
    packId: "picnic-basics",
    title: "Lunch Set Finale",
    beat: "The full picnic ruleset comes together here. Clear the right fasteners and the lunchbox starts to fill itself.",
    mechanics: ["Pack finale", "Daily unlock"],
    rewardId: "reward-06",
    journalTitle: "Picnic Cloth",
    journalCaption: "Clearing the first menu pack unlocks the Dawn Gingham cloth and opens the daily special card.",
    compartments: [
      compartment("rice-box", "Rice Bay", "rice", 3, "amber"),
      compartment("egg-box", "Tamago Cup", "tamago", 2, "coral"),
      compartment("tomato-box", "Tomato Pocket", "tomato", 2, "berry"),
      compartment("broccoli-box", "Broccoli Nook", "broccoli", 1, "moss")
    ],
    stacks: [
      stack("l6-stack-a", 0, "Loop Front", "#cf7c4d", [
        layer("l6-a1", "rice", "rice-box", ["l6-pick-a1", "l6-band-a"]),
        layer("l6-a2", "tamago", "egg-box", ["l6-band-a"])
      ]),
      stack("l6-stack-b", 1, "Paper Lane", "#b96c44", [
        layer("l6-b1", "tomato", "tomato-box", ["l6-pick-b1"]),
        dividerItem("l6-divider-b"),
        layer("l6-b2", "rice", "rice-box")
      ]),
      stack("l6-stack-c", 2, "Green Lane", "#91a866", [
        layer("l6-c1", "broccoli", "broccoli-box", ["l6-pick-c1"]),
        layer("l6-c2", "tomato", "tomato-box", ["l6-pick-c2"])
      ]),
      stack("l6-stack-d", 3, "Egg Tail", "#9b5b3f", [
        layer("l6-d1", "tamago", "egg-box", ["l6-pick-d1"]),
        layer("l6-d2", "rice", "rice-box", ["l6-pick-d2"])
      ])
    ],
    fasteners: [
      pick("l6-pick-a1", "l6-stack-a", "l6-a1", "Front rice pick"),
      band("l6-band-a", "l6-stack-a", ["l6-a1", "l6-a2"], "Picnic band", ["l6-pick-a1"]),
      pick("l6-pick-b1", "l6-stack-b", "l6-b1", "Tomato pick"),
      divider("l6-divider-b", "l6-stack-b", "Washi gate"),
      pick("l6-pick-c1", "l6-stack-c", "l6-c1", "Broccoli pick"),
      pick("l6-pick-c2", "l6-stack-c", "l6-c2", "Tomato bead"),
      pick("l6-pick-d1", "l6-stack-d", "l6-d1", "Egg pick"),
      pick("l6-pick-d2", "l6-stack-d", "l6-d2", "Rice tail pick")
    ],
    tutorialSteps: [
      tutorialStep(
        "l6-start",
        "start",
        ["l6-band-a", "l6-divider-b"],
        "The daily special unlocks after this order. Use the recipe ribbon and lunchbox together to scan the whole layout."
      )
    ]
  }),
  createLevel({
    id: "market-07",
    number: 7,
    packId: "market-lunch",
    title: "Repeated Family",
    beat: "The same ingredient family can now appear in multiple stacks, so plan counts before you clear a lane.",
    mechanics: ["Repeated family"],
    rewardId: "reward-07",
    journalTitle: "Market Repeat",
    journalCaption: "The first market lunch repeats cucumber across different stacks without adding new rules.",
    compartments: [
      compartment("salmon-box", "Salmon Bar", "salmon", 2, "ember"),
      compartment("cucumber-box", "Cucumber Cup", "cucumber", 3, "jade"),
      compartment("tofu-box", "Tofu Bed", "tofu", 3, "linen")
    ],
    stacks: [
      stack("l7-stack-a", 0, "Cool Left", "#6e8f70", [
        layer("l7-a1", "cucumber", "cucumber-box", ["l7-pick-a1"]),
        layer("l7-a2", "tofu", "tofu-box", ["l7-pick-a2"])
      ]),
      stack("l7-stack-b", 1, "Fish Lane", "#cb7b5d", [
        layer("l7-b1", "salmon", "salmon-box", ["l7-pick-b1"]),
        layer("l7-b2", "cucumber", "cucumber-box", ["l7-pick-b2"])
      ]),
      stack("l7-stack-c", 2, "Paper Cut", "#a68156", [
        layer("l7-c1", "tofu", "tofu-box", ["l7-pick-c1"]),
        dividerItem("l7-divider-c"),
        layer("l7-c2", "cucumber", "cucumber-box")
      ]),
      stack("l7-stack-d", 3, "Soft Tail", "#8f6b56", [
        layer("l7-d1", "salmon", "salmon-box", ["l7-pick-d1"]),
        layer("l7-d2", "tofu", "tofu-box", ["l7-pick-d2"])
      ])
    ],
    fasteners: [
      pick("l7-pick-a1", "l7-stack-a", "l7-a1", "Cucumber pick"),
      pick("l7-pick-a2", "l7-stack-a", "l7-a2", "Tofu bead"),
      pick("l7-pick-b1", "l7-stack-b", "l7-b1", "Salmon pin"),
      pick("l7-pick-b2", "l7-stack-b", "l7-b2", "Cucumber pin"),
      pick("l7-pick-c1", "l7-stack-c", "l7-c1", "Tofu front pick"),
      divider("l7-divider-c", "l7-stack-c", "Market divider"),
      pick("l7-pick-d1", "l7-stack-d", "l7-d1", "Salmon bead"),
      pick("l7-pick-d2", "l7-stack-d", "l7-d2", "Tofu tail")
    ],
    tutorialSteps: [
      tutorialStep(
        "l7-start",
        "start",
        ["cucumber-box"],
        "Repeated cucumber strips now arrive from different stacks. The recipe ribbon still shows the exact remaining count."
      )
    ]
  }),
  createLevel({
    id: "market-08",
    number: 8,
    packId: "market-lunch",
    title: "Band Under Pick",
    beat: "Visible band tabs can still wait behind one front-layer pick.",
    mechanics: ["Band dependency"],
    rewardId: "reward-08",
    journalTitle: "Loop Ledger",
    journalCaption: "A single band now depends on two picks before the stack can release its chain.",
    compartments: [
      compartment("rice-box", "Rice Bay", "rice", 3, "amber"),
      compartment("salmon-box", "Salmon Bar", "salmon", 3, "ember"),
      compartment("cucumber-box", "Cucumber Cup", "cucumber", 3, "jade")
    ],
    stacks: [
      stack("l8-stack-a", 0, "Layered Loop", "#ca795d", [
        layer("l8-a1", "salmon", "salmon-box", ["l8-pick-a1", "l8-band-a"]),
        layer("l8-a2", "rice", "rice-box", ["l8-band-a"]),
        layer("l8-a3", "cucumber", "cucumber-box")
      ]),
      stack("l8-stack-b", 1, "Cool Pair", "#6d8e70", [
        layer("l8-b1", "cucumber", "cucumber-box", ["l8-pick-b1"]),
        layer("l8-b2", "rice", "rice-box", ["l8-pick-b2"])
      ]),
      stack("l8-stack-c", 2, "Paper Fish", "#a9845a", [
        layer("l8-c1", "salmon", "salmon-box", ["l8-pick-c1"]),
        dividerItem("l8-divider-c"),
        layer("l8-c2", "cucumber", "cucumber-box")
      ]),
      stack("l8-stack-d", 3, "Rice Tail", "#8f6d56", [
        layer("l8-d1", "rice", "rice-box", ["l8-pick-d1"]),
        layer("l8-d2", "salmon", "salmon-box", ["l8-pick-d2"])
      ])
    ],
    fasteners: [
      pick("l8-pick-a1", "l8-stack-a", "l8-a1", "Top salmon pick"),
      band("l8-band-a", "l8-stack-a", ["l8-a1", "l8-a2"], "Market band", ["l8-pick-a1"]),
      pick("l8-pick-b1", "l8-stack-b", "l8-b1", "Cucumber pick"),
      pick("l8-pick-b2", "l8-stack-b", "l8-b2", "Rice pick"),
      pick("l8-pick-c1", "l8-stack-c", "l8-c1", "Salmon paper pick"),
      divider("l8-divider-c", "l8-stack-c", "Paper gate"),
      pick("l8-pick-d1", "l8-stack-d", "l8-d1", "Rice pin"),
      pick("l8-pick-d2", "l8-stack-d", "l8-d2", "Salmon tail")
    ],
    tutorialSteps: [
      tutorialStep(
        "l8-start",
        "start",
        ["l8-band-a"],
        "This band is visible from the start, but it still waits behind the front pick that pierces the looped layers."
      )
    ]
  }),
  createLevel({
    id: "market-09",
    number: 9,
    packId: "market-lunch",
    title: "Back Divider",
    beat: "A hidden divider can sit behind an early slide chain. Watch what a successful removal exposes next.",
    mechanics: ["Delayed divider reveal"],
    rewardId: "reward-09",
    journalTitle: "Hidden Gate",
    journalCaption: "One front removal now exposes a divider only after two ingredients have already settled.",
    compartments: [
      compartment("salmon-box", "Salmon Bar", "salmon", 2, "ember"),
      compartment("cucumber-box", "Cucumber Cup", "cucumber", 2, "jade"),
      compartment("shrimp-box", "Shrimp Tray", "shrimp", 2, "peach"),
      compartment("tofu-box", "Tofu Bed", "tofu", 3, "linen")
    ],
    stacks: [
      stack("l9-stack-a", 0, "Hidden Gate", "#b5794b", [
        layer("l9-a1", "shrimp", "shrimp-box", ["l9-pick-a1"]),
        layer("l9-a2", "tofu", "tofu-box"),
        dividerItem("l9-divider-a"),
        layer("l9-a3", "cucumber", "cucumber-box")
      ]),
      stack("l9-stack-b", 1, "Fish Pair", "#cd7c60", [
        layer("l9-b1", "salmon", "salmon-box", ["l9-pick-b1"]),
        layer("l9-b2", "shrimp", "shrimp-box", ["l9-pick-b2"])
      ]),
      stack("l9-stack-c", 2, "Quiet Green", "#6e8f70", [
        layer("l9-c1", "tofu", "tofu-box", ["l9-pick-c1"]),
        layer("l9-c2", "cucumber", "cucumber-box", ["l9-pick-c2"])
      ]),
      stack("l9-stack-d", 3, "Soft Tail", "#9b775f", [
        layer("l9-d1", "salmon", "salmon-box", ["l9-pick-d1"]),
        layer("l9-d2", "tofu", "tofu-box", ["l9-pick-d2"])
      ])
    ],
    fasteners: [
      pick("l9-pick-a1", "l9-stack-a", "l9-a1", "Shrimp front pick"),
      divider("l9-divider-a", "l9-stack-a", "Back washi gate"),
      pick("l9-pick-b1", "l9-stack-b", "l9-b1", "Salmon bead"),
      pick("l9-pick-b2", "l9-stack-b", "l9-b2", "Shrimp bead"),
      pick("l9-pick-c1", "l9-stack-c", "l9-c1", "Tofu pin"),
      pick("l9-pick-c2", "l9-stack-c", "l9-c2", "Cucumber pin"),
      pick("l9-pick-d1", "l9-stack-d", "l9-d1", "Salmon tail"),
      pick("l9-pick-d2", "l9-stack-d", "l9-d2", "Tofu tail")
    ],
    tutorialSteps: [
      tutorialStep(
        "l9-after-front",
        "after:l9-pick-a1",
        ["l9-divider-a"],
        "That first shrimp pick released a short chain. The divider only matters once the chain exposes its paper tab."
      )
    ]
  }),
  createLevel({
    id: "market-10",
    number: 10,
    packId: "market-lunch",
    title: "Double Chain",
    beat: "One clean removal can settle several ingredients in sequence before the next blocker appears.",
    mechanics: ["Longer chain"],
    rewardId: "reward-10",
    journalTitle: "Chain Ribbon",
    journalCaption: "The recipe journal marks the first intentional multi-slide chain as a difficulty milestone.",
    compartments: [
      compartment("salmon-box", "Salmon Bar", "salmon", 3, "ember"),
      compartment("cucumber-box", "Cucumber Cup", "cucumber", 3, "jade"),
      compartment("shrimp-box", "Shrimp Tray", "shrimp", 2, "peach"),
      compartment("tofu-box", "Tofu Bed", "tofu", 2, "linen")
    ],
    stacks: [
      stack("l10-stack-a", 0, "Chain Loop", "#ca7c5a", [
        layer("l10-a1", "salmon", "salmon-box", ["l10-pick-a1", "l10-band-a"]),
        layer("l10-a2", "cucumber", "cucumber-box", ["l10-band-a"]),
        layer("l10-a3", "tofu", "tofu-box")
      ]),
      stack("l10-stack-b", 1, "Sea Pair", "#d08a63", [
        layer("l10-b1", "shrimp", "shrimp-box", ["l10-pick-b1"]),
        layer("l10-b2", "cucumber", "cucumber-box", ["l10-pick-b2"])
      ]),
      stack("l10-stack-c", 2, "Paper Fish", "#ae8558", [
        layer("l10-c1", "tofu", "tofu-box", ["l10-pick-c1"]),
        dividerItem("l10-divider-c"),
        layer("l10-c2", "salmon", "salmon-box")
      ]),
      stack("l10-stack-d", 3, "Green Pair", "#6b8d70", [
        layer("l10-d1", "cucumber", "cucumber-box", ["l10-pick-d1"]),
        layer("l10-d2", "shrimp", "shrimp-box", ["l10-pick-d2"])
      ]),
      stack("l10-stack-e", 4, "Last Fish", "#9e775f", [
        layer("l10-e1", "salmon", "salmon-box", ["l10-pick-e1"])
      ])
    ],
    fasteners: [
      pick("l10-pick-a1", "l10-stack-a", "l10-a1", "Chain pick"),
      band("l10-band-a", "l10-stack-a", ["l10-a1", "l10-a2"], "Sea band", ["l10-pick-a1"]),
      pick("l10-pick-b1", "l10-stack-b", "l10-b1", "Shrimp bead"),
      pick("l10-pick-b2", "l10-stack-b", "l10-b2", "Cucumber bead"),
      pick("l10-pick-c1", "l10-stack-c", "l10-c1", "Tofu paper pick"),
      divider("l10-divider-c", "l10-stack-c", "Paper divider"),
      pick("l10-pick-d1", "l10-stack-d", "l10-d1", "Green pin"),
      pick("l10-pick-d2", "l10-stack-d", "l10-d2", "Shrimp pin"),
      pick("l10-pick-e1", "l10-stack-e", "l10-e1", "Final salmon pick")
    ],
    tutorialSteps: [
      tutorialStep(
        "l10-after-band",
        "after:l10-band-a",
        ["l10-a1", "l10-a2", "l10-a3"],
        "A band release can chain through several free layers in the same stack until the next blocker or empty stack end."
      )
    ]
  }),
  createLevel({
    id: "market-11",
    number: 11,
    packId: "market-lunch",
    title: "Crowded Counter",
    beat: "The board gets denser here, but hit targets still stay distinct and the rule set stays unchanged.",
    mechanics: ["Dense field"],
    rewardId: "reward-11",
    journalTitle: "Counter Sketch",
    journalCaption: "This layout is tuned as a readability stress test, not a new rule layer.",
    compartments: [
      compartment("salmon-box", "Salmon Bar", "salmon", 3, "ember"),
      compartment("tofu-box", "Tofu Bed", "tofu", 3, "linen"),
      compartment("shrimp-box", "Shrimp Tray", "shrimp", 2, "peach"),
      compartment("rice-box", "Rice Bay", "rice", 2, "amber")
    ],
    stacks: [
      stack("l11-stack-a", 0, "Looped Fish", "#c97858", [
        layer("l11-a1", "salmon", "salmon-box", ["l11-pick-a1", "l11-band-a"]),
        layer("l11-a2", "tofu", "tofu-box", ["l11-band-a"])
      ]),
      stack("l11-stack-b", 1, "Short Pair", "#cf8b64", [
        layer("l11-b1", "shrimp", "shrimp-box", ["l11-pick-b1"]),
        layer("l11-b2", "rice", "rice-box", ["l11-pick-b2"])
      ]),
      stack("l11-stack-c", 2, "Paper Fish", "#ab8156", [
        layer("l11-c1", "tofu", "tofu-box", ["l11-pick-c1"]),
        dividerItem("l11-divider-c"),
        layer("l11-c2", "salmon", "salmon-box")
      ]),
      stack("l11-stack-d", 3, "Rice Pair", "#9d6f58", [
        layer("l11-d1", "rice", "rice-box", ["l11-pick-d1"]),
        layer("l11-d2", "shrimp", "shrimp-box", ["l11-pick-d2"])
      ]),
      stack("l11-stack-e", 4, "Tail Pair", "#7b946d", [
        layer("l11-e1", "tofu", "tofu-box", ["l11-pick-e1"]),
        layer("l11-e2", "salmon", "salmon-box", ["l11-pick-e2"])
      ])
    ],
    fasteners: [
      pick("l11-pick-a1", "l11-stack-a", "l11-a1", "Loop fish pick"),
      band("l11-band-a", "l11-stack-a", ["l11-a1", "l11-a2"], "Crowd band", ["l11-pick-a1"]),
      pick("l11-pick-b1", "l11-stack-b", "l11-b1", "Shrimp pick"),
      pick("l11-pick-b2", "l11-stack-b", "l11-b2", "Rice pick"),
      pick("l11-pick-c1", "l11-stack-c", "l11-c1", "Tofu paper pick"),
      divider("l11-divider-c", "l11-stack-c", "Counter divider"),
      pick("l11-pick-d1", "l11-stack-d", "l11-d1", "Rice bead"),
      pick("l11-pick-d2", "l11-stack-d", "l11-d2", "Shrimp bead"),
      pick("l11-pick-e1", "l11-stack-e", "l11-e1", "Tofu tail"),
      pick("l11-pick-e2", "l11-stack-e", "l11-e2", "Salmon tail")
    ],
    tutorialSteps: [
      tutorialStep(
        "l11-start",
        "start",
        ["l11-pick-a1", "l11-band-a", "l11-divider-c"],
        "Even in the densest field, fasteners keep distinct silhouettes and separate tap targets."
      )
    ]
  }),
  createLevel({
    id: "market-12",
    number: 12,
    packId: "market-lunch",
    title: "Chef Special",
    beat: "The capstone combines duplicate families, delayed dividers, and multi-step chains without adding new mechanics.",
    mechanics: ["Capstone"],
    rewardId: "reward-12",
    journalTitle: "Chef Cloth",
    journalCaption: "The market capstone unlocks the Moss Check cloth and completes the first playable lunch journal set.",
    compartments: [
      compartment("salmon-box", "Salmon Bar", "salmon", 3, "ember"),
      compartment("tofu-box", "Tofu Bed", "tofu", 3, "linen"),
      compartment("rice-box", "Rice Bay", "rice", 3, "amber"),
      compartment("shrimp-box", "Shrimp Tray", "shrimp", 2, "peach")
    ],
    stacks: [
      stack("l12-stack-a", 0, "Chef Loop", "#c67b5c", [
        layer("l12-a1", "salmon", "salmon-box", ["l12-pick-a1", "l12-band-a"]),
        layer("l12-a2", "tofu", "tofu-box", ["l12-band-a"]),
        layer("l12-a3", "rice", "rice-box")
      ]),
      stack("l12-stack-b", 1, "Paper Fish", "#d18b63", [
        layer("l12-b1", "shrimp", "shrimp-box", ["l12-pick-b1"]),
        dividerItem("l12-divider-b"),
        layer("l12-b2", "salmon", "salmon-box")
      ]),
      stack("l12-stack-c", 2, "Center Pair", "#aa8357", [
        layer("l12-c1", "rice", "rice-box", ["l12-pick-c1"]),
        layer("l12-c2", "tofu", "tofu-box", ["l12-pick-c2"])
      ]),
      stack("l12-stack-d", 3, "Second Gate", "#8e705a", [
        layer("l12-d1", "salmon", "salmon-box", ["l12-pick-d1"]),
        dividerItem("l12-divider-d"),
        layer("l12-d2", "tofu", "tofu-box")
      ]),
      stack("l12-stack-e", 4, "Rice Tail", "#78916a", [
        layer("l12-e1", "rice", "rice-box", ["l12-pick-e1"]),
        layer("l12-e2", "shrimp", "shrimp-box", ["l12-pick-e2"])
      ])
    ],
    fasteners: [
      pick("l12-pick-a1", "l12-stack-a", "l12-a1", "Chef salmon pick"),
      band("l12-band-a", "l12-stack-a", ["l12-a1", "l12-a2"], "Chef band", ["l12-pick-a1"]),
      pick("l12-pick-b1", "l12-stack-b", "l12-b1", "Shrimp paper pick"),
      divider("l12-divider-b", "l12-stack-b", "North divider"),
      pick("l12-pick-c1", "l12-stack-c", "l12-c1", "Rice pin"),
      pick("l12-pick-c2", "l12-stack-c", "l12-c2", "Tofu pin"),
      pick("l12-pick-d1", "l12-stack-d", "l12-d1", "Salmon gate pick"),
      divider("l12-divider-d", "l12-stack-d", "South divider"),
      pick("l12-pick-e1", "l12-stack-e", "l12-e1", "Rice tail pick"),
      pick("l12-pick-e2", "l12-stack-e", "l12-e2", "Shrimp tail pick")
    ],
    tutorialSteps: [
      tutorialStep(
        "l12-start",
        "start",
        ["l12-band-a", "l12-divider-b", "l12-divider-d"],
        "The capstone does not add new rules. It asks you to chain the familiar ones cleanly across a fuller board."
      )
    ]
  })
];

export const DAILY_TEMPLATE_DEFINITIONS = Object.freeze([
  createDailyTemplate({
    id: "daily-template-01",
    title: "Daily Special",
    subtitle: "Balanced lunch with one divider and one loop chain.",
    tokenOrder: ["A", "B", "C", "D"],
    compartments: [
      { id: "daily-a", label: "Top Left", acceptedSlots: ["A", "A", "A"], artSkin: "daily-a" },
      { id: "daily-b", label: "Top Right", acceptedSlots: ["B", "B"], artSkin: "daily-b" },
      { id: "daily-c", label: "Bottom Left", acceptedSlots: ["C", "C"], artSkin: "daily-c" },
      { id: "daily-d", label: "Bottom Right", acceptedSlots: ["D", "D"], artSkin: "daily-d" }
    ],
    stacks: [
      stack("dt1-stack-a", 0, "Daily Loop", "#c87a5b", [
        layer("dt1-a1", "A", "daily-a", ["dt1-pick-a1", "dt1-band-a"]),
        layer("dt1-a2", "B", "daily-b", ["dt1-band-a"])
      ]),
      stack("dt1-stack-b", 1, "Daily Paper", "#a88258", [
        layer("dt1-b1", "C", "daily-c", ["dt1-pick-b1"]),
        dividerItem("dt1-divider-b"),
        layer("dt1-b2", "A", "daily-a")
      ]),
      stack("dt1-stack-c", 2, "Daily Pair", "#789069", [
        layer("dt1-c1", "D", "daily-d", ["dt1-pick-c1"]),
        layer("dt1-c2", "B", "daily-b", ["dt1-pick-c2"])
      ]),
      stack("dt1-stack-d", 3, "Daily Tail", "#90705a", [
        layer("dt1-d1", "A", "daily-a", ["dt1-pick-d1"]),
        layer("dt1-d2", "D", "daily-d", ["dt1-pick-d2"]),
        layer("dt1-d3", "C", "daily-c", ["dt1-pick-d3"])
      ])
    ],
    fasteners: [
      pick("dt1-pick-a1", "dt1-stack-a", "dt1-a1", "Daily top pick"),
      band("dt1-band-a", "dt1-stack-a", ["dt1-a1", "dt1-a2"], "Daily loop", ["dt1-pick-a1"]),
      pick("dt1-pick-b1", "dt1-stack-b", "dt1-b1", "Daily paper pick"),
      divider("dt1-divider-b", "dt1-stack-b", "Daily paper tab"),
      pick("dt1-pick-c1", "dt1-stack-c", "dt1-c1", "Daily pair pick"),
      pick("dt1-pick-c2", "dt1-stack-c", "dt1-c2", "Daily pair bead"),
      pick("dt1-pick-d1", "dt1-stack-d", "dt1-d1", "Daily tail pick"),
      pick("dt1-pick-d2", "dt1-stack-d", "dt1-d2", "Daily tail bead"),
      pick("dt1-pick-d3", "dt1-stack-d", "dt1-d3", "Daily back bead")
    ],
    solveTarget: { min: 7, max: 8 }
  }),
  createDailyTemplate({
    id: "daily-template-02",
    title: "Daily Special",
    subtitle: "Five stacks with one long chain and two paper reveals.",
    tokenOrder: ["A", "B", "C", "D"],
    compartments: [
      { id: "daily-a", label: "North", acceptedSlots: ["A", "A", "A"], artSkin: "daily-a" },
      { id: "daily-b", label: "West", acceptedSlots: ["B", "B", "B"], artSkin: "daily-b" },
      { id: "daily-c", label: "East", acceptedSlots: ["C", "C"], artSkin: "daily-c" },
      { id: "daily-d", label: "South", acceptedSlots: ["D", "D"], artSkin: "daily-d" }
    ],
    stacks: [
      stack("dt2-stack-a", 0, "Loop Stack", "#c77b5d", [
        layer("dt2-a1", "A", "daily-a", ["dt2-pick-a1", "dt2-band-a"]),
        layer("dt2-a2", "B", "daily-b", ["dt2-pick-a2", "dt2-band-a"]),
        layer("dt2-a3", "C", "daily-c")
      ]),
      stack("dt2-stack-b", 1, "Paper North", "#a98158", [
        layer("dt2-b1", "D", "daily-d", ["dt2-pick-b1"]),
        dividerItem("dt2-divider-b"),
        layer("dt2-b2", "A", "daily-a")
      ]),
      stack("dt2-stack-c", 2, "Short Pair", "#6f8c70", [
        layer("dt2-c1", "B", "daily-b", ["dt2-pick-c1"]),
        layer("dt2-c2", "C", "daily-c", ["dt2-pick-c2"])
      ]),
      stack("dt2-stack-d", 3, "Paper South", "#936f59", [
        layer("dt2-d1", "A", "daily-a", ["dt2-pick-d1"]),
        dividerItem("dt2-divider-d"),
        layer("dt2-d2", "B", "daily-b")
      ]),
      stack("dt2-stack-e", 4, "Tail Pair", "#c18a60", [
        layer("dt2-e1", "D", "daily-d", ["dt2-pick-e1"]),
        layer("dt2-e2", "B", "daily-b", ["dt2-pick-e2"])
      ])
    ],
    fasteners: [
      pick("dt2-pick-a1", "dt2-stack-a", "dt2-a1", "Daily chain pick"),
      pick("dt2-pick-a2", "dt2-stack-a", "dt2-a2", "Daily chain bead"),
      band("dt2-band-a", "dt2-stack-a", ["dt2-a1", "dt2-a2"], "Daily chain band", ["dt2-pick-a1", "dt2-pick-a2"]),
      pick("dt2-pick-b1", "dt2-stack-b", "dt2-b1", "North paper pick"),
      divider("dt2-divider-b", "dt2-stack-b", "North paper tab"),
      pick("dt2-pick-c1", "dt2-stack-c", "dt2-c1", "Short pair pick"),
      pick("dt2-pick-c2", "dt2-stack-c", "dt2-c2", "Short pair bead"),
      pick("dt2-pick-d1", "dt2-stack-d", "dt2-d1", "South paper pick"),
      divider("dt2-divider-d", "dt2-stack-d", "South paper tab"),
      pick("dt2-pick-e1", "dt2-stack-e", "dt2-e1", "Tail daily pick"),
      pick("dt2-pick-e2", "dt2-stack-e", "dt2-e2", "Tail daily bead")
    ],
    solveTarget: { min: 8, max: 9 }
  })
]);

export function getPackById(packId) {
  return MENU_PACKS.find((pack) => pack.id === packId) ?? null;
}

export function getRewardById(rewardId) {
  return REWARD_DEFINITIONS.find((reward) => reward.id === rewardId) ?? null;
}

export function getLevelById(levelId) {
  return HANDCRAFTED_LEVELS.find((level) => level.id === levelId) ?? null;
}

export function cloneDailyTemplate(templateId) {
  const template = DAILY_TEMPLATE_DEFINITIONS.find((entry) => entry.id === templateId);
  return template ? clone(template) : null;
}
