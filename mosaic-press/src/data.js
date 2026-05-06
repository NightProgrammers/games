export const STORAGE_KEY = "mosaic-press-progress-v1";
export const DAILY_UNLOCK_LEVEL = 6;

export const PACKS = Object.freeze([
  {
    id: "garden-tiles",
    title: "Garden Tiles",
    accent: "#bf6d4d",
    gradient: ["#f4eadb", "#e8d4bd", "#c89c73"],
    rewardTitle: "Pressed cedar frame"
  },
  {
    id: "harbor-keepsakes",
    title: "Harbor Keepsakes",
    accent: "#567c94",
    gradient: ["#edf2ef", "#dce7e8", "#9fb8c4"],
    rewardTitle: "Salt-glazed frame"
  }
]);

export const DAILY_THEME = Object.freeze({
  id: "daily-commission",
  title: "Daily Commission",
  accent: "#8d5a4d",
  gradient: ["#f2e6db", "#e5d2c7", "#c8a792"],
  rewardTitle: "Dated wax ledger stamp"
});

export const DAILY_TEMPLATE_RULES = Object.freeze({
  allowedPalettes: ["terracotta", "leaf", "cream", "sky"],
  allowedEntries: ["left"],
  rowCountRange: [3, 4],
  stackCountRange: [4, 5],
  cellCountRange: [10, 12],
  fastenerCountRange: [6, 8],
  seedFormat: "UTC YYYY-MM-DD"
});

export const PALETTES = Object.freeze({
  terracotta: {
    id: "terracotta",
    name: "Terracotta",
    shard: "#d58a67",
    trim: "#884d39",
    grout: "#6a463a",
    card: "#f2ddd0",
    glaze: "#f9efe8"
  },
  leaf: {
    id: "leaf",
    name: "Leaf Green",
    shard: "#8eb17d",
    trim: "#4f6a43",
    grout: "#465540",
    card: "#e3ecdc",
    glaze: "#f0f5eb"
  },
  cream: {
    id: "cream",
    name: "Cream",
    shard: "#e8d8b8",
    trim: "#8e7650",
    grout: "#6d5b44",
    card: "#f5efdf",
    glaze: "#fbf8ef"
  },
  sky: {
    id: "sky",
    name: "Sky Blue",
    shard: "#8fb6cf",
    trim: "#4d6a87",
    grout: "#44586f",
    card: "#dfeaf1",
    glaze: "#eef5f9"
  },
  indigo: {
    id: "indigo",
    name: "Indigo",
    shard: "#6b739e",
    trim: "#39415f",
    grout: "#343d52",
    card: "#dfe2ef",
    glaze: "#f0f2fb"
  },
  coral: {
    id: "coral",
    name: "Coral",
    shard: "#d9937f",
    trim: "#8f4f43",
    grout: "#6b453f",
    card: "#f3e1d8",
    glaze: "#fbf0eb"
  },
  sand: {
    id: "sand",
    name: "Sand",
    shard: "#d9bf8f",
    trim: "#8a6d46",
    grout: "#6d573f",
    card: "#f2e8d4",
    glaze: "#faf4ea"
  },
  seafoam: {
    id: "seafoam",
    name: "Seafoam",
    shard: "#8fc7b8",
    trim: "#46766f",
    grout: "#3d5e59",
    card: "#dff0ea",
    glaze: "#eff8f5"
  }
});

const PACK_BY_ID = Object.fromEntries(PACKS.map((pack) => [pack.id, pack]));
const clone = (value) => JSON.parse(JSON.stringify(value));

const ROW_Y = {
  1: [50],
  2: [27, 69],
  3: [20, 48, 76],
  4: [16, 37, 58, 79]
};

const CELL_SIZE = {
  2: 21,
  3: 17,
  4: 14
};

const CELL_STEP = {
  2: 24,
  3: 18,
  4: 15
};

function shortCode(label) {
  const cleaned = label.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return cleaned.slice(0, 4) || "TILE";
}

function shardLabel(stripName, label, family, variant) {
  return {
    title: `${stripName} ${label}`,
    short: shortCode(label),
    family,
    variant
  };
}

function strip(config) {
  return {
    id: config.id,
    name: config.name,
    paletteId: config.paletteId,
    family: config.family ?? config.name.toLowerCase().replace(/\s+/g, "-"),
    stackId: config.stackId,
    labels: [...config.labels],
    fasteners: config.fasteners.map((fastener) => ({ ...fastener }))
  };
}

function clamp(id, slot = "left", config = {}) {
  return {
    id,
    type: "clamp",
    slot,
    blockedBy: [...(config.blockedBy ?? [])],
    blockedReason: config.blockedReason ?? null
  };
}

function wax(id, slot = "top", config = {}) {
  return {
    id,
    type: "wax",
    slot,
    blockedBy: [...(config.blockedBy ?? [])],
    blockedReason: config.blockedReason ?? null
  };
}

function spacer(id, slot = "mouth", config = {}) {
  return {
    id,
    type: "spacer",
    slot,
    blockedBy: [...(config.blockedBy ?? [])],
    blockedReason: config.blockedReason ?? null
  };
}

function reward(title, detail) {
  return { title, detail };
}

function callout(trigger, text, focus = null) {
  return { trigger, text, focus };
}

function buildRowCells(rowCount, rowIndex, rowLength) {
  const y = ROW_Y[rowCount][rowIndex];
  const size = CELL_SIZE[rowLength];
  const step = CELL_STEP[rowLength];
  const cells = [];

  for (let index = 0; index < rowLength; index += 1) {
    const centerX = 50 + (index - (rowLength - 1) / 2) * step;
    cells.push({
      x: Number((centerX - size / 2).toFixed(2)),
      y: Number((y - size / 2).toFixed(2)),
      w: size,
      h: size
    });
  }

  return cells;
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
  mechanics,
  callouts,
  reward: rewardData,
  rows,
  stacks,
  strips
}) {
  const pack = kind === "daily" ? DAILY_THEME : PACK_BY_ID[packId];
  if (!pack) {
    throw new Error(`Unknown pack ${packId}.`);
  }

  const stackMap = new Map(stacks.map((stack) => [stack.id, stack]));
  const stripMap = new Map(strips.map((entry) => [entry.id, entry]));
  const rowCount = rows.length;
  const segmentCells = new Map();

  const builtRows = rows.map((row, rowIndex) => {
    const builtSegments = row.segments.map((segmentId) => {
      const rowStrip = stripMap.get(segmentId);
      if (!rowStrip) {
        throw new Error(`Row ${row.id} references unknown strip ${segmentId}.`);
      }
      return rowStrip;
    });

    const length = builtSegments.reduce((total, rowStrip) => total + rowStrip.labels.length, 0);
    const rowCells = buildRowCells(rowCount, rowIndex, length).map((rect, cellIndex) => ({
      id: `${row.id}-c${cellIndex + 1}`,
      rowId: row.id,
      columnIndex: cellIndex,
      entry: row.entry,
      ...rect
    }));

    let pointer = row.entry === "left" ? rowCells.length : 0;
    for (const rowStrip of builtSegments) {
      const segmentLength = rowStrip.labels.length;
      let targetCellIds;

      if (row.entry === "left") {
        targetCellIds = rowCells
          .slice(pointer - segmentLength, pointer)
          .map((cell) => cell.id);
        pointer -= segmentLength;
      } else {
        targetCellIds = rowCells
          .slice(pointer, pointer + segmentLength)
          .map((cell) => cell.id);
        pointer += segmentLength;
      }

      segmentCells.set(rowStrip.id, targetCellIds);
    }

    return {
      id: row.id,
      title: row.title,
      entry: row.entry,
      mouthHint: row.entry === "left" ? "Enter from the left lane." : "Enter from the right lane.",
      cellIds: rowCells.map((cell) => cell.id),
      mouthX:
        row.entry === "left"
          ? Number((rowCells[0].x - 4).toFixed(2))
          : Number((rowCells[rowCells.length - 1].x + rowCells[rowCells.length - 1].w + 4).toFixed(2)),
      mouthY: Number((rowCells[0].y + rowCells[0].h / 2).toFixed(2))
    };
  });

  const builtCells = [];
  const builtStrips = strips.map((entry) => {
    if (!stackMap.has(entry.stackId)) {
      throw new Error(`Strip ${entry.id} references unknown stack ${entry.stackId}.`);
    }

    const targetCellIds = segmentCells.get(entry.id);
    if (!targetCellIds) {
      throw new Error(`Strip ${entry.id} is not assigned to any tray row.`);
    }

    const stackOrder = stackMap.get(entry.stackId).stripIds;
    const rowId = builtRows.find((row) => row.cellIds.some((cellId) => targetCellIds.includes(cellId)))?.id;

    const shardItems = entry.labels.map((label, index) => {
      const shard = shardLabel(entry.name, label, entry.family, String.fromCharCode(97 + index));
      const palette = PALETTES[entry.paletteId];
      const cellId = targetCellIds[index];
      const targetCell = builtRows
        .flatMap((row) => row.cellIds)
        .find((candidateId) => candidateId === cellId);

      builtCells.push({
        id: cellId,
        rowId,
        paletteId: entry.paletteId,
        title: shard.title,
        short: shard.short,
        family: shard.family,
        variant: shard.variant,
        tone: palette.card,
        trim: palette.trim,
        glaze: palette.glaze,
        targetStripId: entry.id
      });

      return {
        id: `${entry.id}-shard-${index + 1}`,
        cellId: targetCell,
        paletteId: entry.paletteId,
        title: shard.title,
        short: shard.short,
        family: shard.family,
        variant: shard.variant,
        tone: palette.shard,
        trim: palette.trim,
        glaze: palette.glaze
      };
    });

    return {
      id: entry.id,
      name: entry.name,
      rowId,
      stackId: entry.stackId,
      orderInStack: stackOrder.indexOf(entry.id),
      paletteId: entry.paletteId,
      family: entry.family,
      entrySide: builtRows.find((row) => row.id === rowId)?.entry ?? "left",
      targetCellIds,
      shardCount: shardItems.length,
      shards: shardItems,
      blockerIds: entry.fasteners.map((fastener) => fastener.id)
    };
  });

  const cellRectsById = new Map(
    rows.flatMap((row, rowIndex) =>
      buildRowCells(rows.length, rowIndex, row.segments.reduce((total, segmentId) => total + stripMap.get(segmentId).labels.length, 0)).map(
        (rect, index) => [`${row.id}-c${index + 1}`, rect]
      )
    )
  );

  const builtFasteners = builtStrips.flatMap((rowStrip) => {
    const source = stripMap.get(rowStrip.id);
    return source.fasteners.map((entry) => ({
      id: entry.id,
      stripId: rowStrip.id,
      rowId: rowStrip.rowId,
      stackId: rowStrip.stackId,
      type: entry.type,
      slot: entry.slot,
      blockedBy: [...entry.blockedBy],
      blockedReason: entry.blockedReason,
      hitbox:
        entry.type === "spacer"
          ? { w: 64, h: 48 }
          : entry.type === "wax"
            ? { w: 56, h: 56 }
            : { w: 60, h: 60 }
    }));
  });

  const builtStacks = stacks.map((stack, index) => ({
    id: stack.id,
    title: stack.title,
    laneIndex: index,
    stripIds: [...stack.stripIds]
  }));

  return {
    id,
    kind,
    seed,
    number,
    packId,
    title,
    beat,
    mechanics: [...mechanics],
    callouts: clone(callouts),
    reward: clone(rewardData),
    card: {
      title,
      caption,
      accent: pack.accent,
      gradient: [...pack.gradient]
    },
    tray: {
      rows: builtRows.map((row) => ({
        ...row,
        cells: row.cellIds.map((cellId) => ({
          id: cellId,
          ...cellRectsById.get(cellId)
        }))
      })),
      cells: builtCells
    },
    stacks: builtStacks,
    strips: builtStrips,
    fasteners: builtFasteners
  };
}

const gardenPlans = [
  {
    id: "ftue-01",
    title: "First Clamp",
    caption: "Two simple rows teach that a clamp tap releases one strip and auto-sets it into the card.",
    beat: "Tap the exposed clamps. Each strip glides into its row on its own.",
    mechanics: ["Clamp release", "Auto-settle strips", "Frontmost stack read"],
    callouts: [
      callout("start", "Only the front strip in each stack can move.", { type: "stack", id: "bench-a" }),
      callout("start", "Clamp first. The strip settles by itself after a legal release.", {
        type: "fastener",
        id: "a-clamp"
      })
    ],
    reward: reward("Tulip start card", "Adds the first garden card to the wall rail."),
    rows: [
      { id: "r1", title: "Tulip row", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Teacup row", entry: "left", segments: ["C", "D"] }
    ],
    stacks: [
      { id: "bench-a", title: "North bench", stripIds: ["A", "B"] },
      { id: "bench-b", title: "South bench", stripIds: ["C", "D"] }
    ],
    strips: [
      strip({
        id: "A",
        name: "Tulip bloom",
        paletteId: "terracotta",
        stackId: "bench-a",
        labels: ["Bloom"],
        fasteners: [clamp("a-clamp", "left")]
      }),
      strip({
        id: "B",
        name: "Tulip leaf",
        paletteId: "leaf",
        stackId: "bench-a",
        labels: ["Leaf"],
        fasteners: [clamp("b-clamp", "right")]
      }),
      strip({
        id: "C",
        name: "Cup rim",
        paletteId: "cream",
        stackId: "bench-b",
        labels: ["Rim"],
        fasteners: [clamp("c-clamp", "left")]
      }),
      strip({
        id: "D",
        name: "Sky glaze",
        paletteId: "sky",
        stackId: "bench-b",
        labels: ["Sky"],
        fasteners: [clamp("d-clamp", "right")]
      })
    ]
  },
  {
    id: "ftue-02",
    title: "First Wax",
    caption: "A wax seal peels like a second kind of fastener, but the strip still settles automatically.",
    beat: "Wax seals work like clamps once the pull ring is visible.",
    mechanics: ["Wax tab release", "Mixed fastener types"],
    callouts: [
      callout("start", "Wax tabs only peel when the ring sits on top of the front strip.", {
        type: "fastener",
        id: "b-wax"
      })
    ],
    reward: reward("Lemon branch card", "Pins a citrus tile beside the tulip card."),
    rows: [
      { id: "r1", title: "Lemon row", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Saucer row", entry: "left", segments: ["C", "D"] }
    ],
    stacks: [
      { id: "bench-a", title: "Left press", stripIds: ["A", "B"] },
      { id: "bench-b", title: "Right press", stripIds: ["C", "D"] }
    ],
    strips: [
      strip({
        id: "A",
        name: "Lemon arc",
        paletteId: "cream",
        stackId: "bench-a",
        labels: ["Arc", "Pith"],
        fasteners: [clamp("a-clamp", "left")]
      }),
      strip({
        id: "B",
        name: "Leaf tip",
        paletteId: "leaf",
        stackId: "bench-a",
        labels: ["Tip"],
        fasteners: [wax("b-wax", "top")]
      }),
      strip({
        id: "C",
        name: "Saucer ring",
        paletteId: "sky",
        stackId: "bench-b",
        labels: ["Ring"],
        fasteners: [clamp("c-clamp", "left")]
      }),
      strip({
        id: "D",
        name: "Cup stem",
        paletteId: "terracotta",
        stackId: "bench-b",
        labels: ["Stem"],
        fasteners: [clamp("d-clamp", "right")]
      })
    ]
  },
  {
    id: "ftue-03",
    title: "First Spacer",
    caption: "Paper spacers can block a row mouth even after the strip itself is almost ready.",
    beat: "A row mouth spacer can still stop a strip after its own clamp is gone.",
    mechanics: ["Paper spacer", "Two-step strip release"],
    callouts: [
      callout("start", "Paper tails sit at the row mouth. Pull them last when they are exposed.", {
        type: "fastener",
        id: "e-spacer"
      })
    ],
    reward: reward("Sparrow perch card", "Adds the first bird tile to Garden Tiles."),
    rows: [
      { id: "r1", title: "Petal row", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Vine row", entry: "left", segments: ["C", "D"] },
      { id: "r3", title: "Bird row", entry: "left", segments: ["E"] }
    ],
    stacks: [
      { id: "bench-a", title: "West rack", stripIds: ["A", "B"] },
      { id: "bench-b", title: "Center rack", stripIds: ["C", "D"] },
      { id: "bench-c", title: "East rack", stripIds: ["E"] }
    ],
    strips: [
      strip({
        id: "A",
        name: "Petal fan",
        paletteId: "terracotta",
        stackId: "bench-a",
        labels: ["Fan"],
        fasteners: [clamp("a-clamp", "left")]
      }),
      strip({
        id: "B",
        name: "Petal edge",
        paletteId: "coral",
        stackId: "bench-a",
        labels: ["Edge"],
        fasteners: [clamp("b-clamp", "right")]
      }),
      strip({
        id: "C",
        name: "Vine curl",
        paletteId: "leaf",
        stackId: "bench-b",
        labels: ["Curl"],
        fasteners: [wax("c-wax", "top")]
      }),
      strip({
        id: "D",
        name: "Vine knot",
        paletteId: "leaf",
        stackId: "bench-b",
        labels: ["Knot"],
        fasteners: [clamp("d-clamp", "right")]
      }),
      strip({
        id: "E",
        name: "Sparrow wing",
        paletteId: "sky",
        stackId: "bench-c",
        labels: ["Wing", "Feather"],
        fasteners: [
          clamp("e-clamp", "left"),
          spacer("e-spacer", "mouth", {
            blockedBy: ["e-clamp"],
            blockedReason: "The spacer tail is still pinned behind the clamp."
          })
        ]
      })
    ]
  },
  {
    id: "ftue-04",
    title: "Read The Row",
    caption: "Longer rows now ask players to read the deeper cells before they touch the near cap.",
    beat: "Follow the depth ticks. Deeper cells in a row must clear before the near cap can lock in.",
    mechanics: ["Depth read", "Three-row tray"],
    callouts: [
      callout("start", "Depth ticks mark how far a strip must travel from the row mouth.", { type: "row", id: "r1" })
    ],
    reward: reward("Window vine card", "Unlocks a brighter paper backing for Garden Tiles."),
    rows: [
      { id: "r1", title: "Window row", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Teacup row", entry: "left", segments: ["C", "D"] },
      { id: "r3", title: "Vine row", entry: "left", segments: ["E", "F"] }
    ],
    stacks: [
      { id: "bench-a", title: "Upper press", stripIds: ["A", "B"] },
      { id: "bench-b", title: "Middle press", stripIds: ["C", "D"] },
      { id: "bench-c", title: "Lower press", stripIds: ["E", "F"] }
    ],
    strips: [
      strip({
        id: "A",
        name: "Window crest",
        paletteId: "sky",
        stackId: "bench-a",
        labels: ["Crest", "Pane"],
        fasteners: [clamp("a-clamp", "left")]
      }),
      strip({
        id: "B",
        name: "Window sill",
        paletteId: "cream",
        stackId: "bench-a",
        labels: ["Sill"],
        fasteners: [clamp("b-clamp", "right")]
      }),
      strip({
        id: "C",
        name: "Cup bowl",
        paletteId: "terracotta",
        stackId: "bench-b",
        labels: ["Bowl"],
        fasteners: [wax("c-wax", "top")]
      }),
      strip({
        id: "D",
        name: "Cup saucer",
        paletteId: "cream",
        stackId: "bench-b",
        labels: ["Saucer"],
        fasteners: [clamp("d-clamp", "right")]
      }),
      strip({
        id: "E",
        name: "Vine sweep",
        paletteId: "leaf",
        stackId: "bench-c",
        labels: ["Sweep"],
        fasteners: [spacer("e-spacer", "mouth")]
      }),
      strip({
        id: "F",
        name: "Leaf tail",
        paletteId: "leaf",
        stackId: "bench-c",
        labels: ["Tail"],
        fasteners: [clamp("f-clamp", "right")]
      })
    ]
  },
  {
    id: "ftue-05",
    title: "First Overflow",
    caption: "A near cap can slide in first, but it may seal the deeper cells and jam the row later.",
    beat: "A wrong release can seal a row. Undo is here when gutter pressure wins.",
    mechanics: ["Gutter overflow", "Undo surfacing"],
    callouts: [
      callout("start", "The short cream cap looks tempting, but the deeper blue cells still need room first.", {
        type: "row",
        id: "r1"
      }),
      callout("fail:overflow", "That near cap sealed the row mouth for the deeper strip. Undo rewinds the last release.")
    ],
    reward: reward("Lattice warning card", "Adds a teaching plaque to the studio wall."),
    rows: [
      { id: "r1", title: "Sky row", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Leaf row", entry: "left", segments: ["C", "D"] },
      { id: "r3", title: "Tulip row", entry: "left", segments: ["E"] }
    ],
    stacks: [
      { id: "bench-a", title: "Left press", stripIds: ["A", "C"] },
      { id: "bench-b", title: "Right press", stripIds: ["B", "D"] },
      { id: "bench-c", title: "Rear press", stripIds: ["E"] }
    ],
    strips: [
      strip({
        id: "A",
        name: "Sky ribbon",
        paletteId: "sky",
        stackId: "bench-a",
        labels: ["Ribbon", "Cloud"],
        fasteners: [clamp("a-clamp", "left")]
      }),
      strip({
        id: "B",
        name: "Cream cap",
        paletteId: "cream",
        stackId: "bench-b",
        labels: ["Cap"],
        fasteners: [clamp("b-clamp", "right")]
      }),
      strip({
        id: "C",
        name: "Leaf fold",
        paletteId: "leaf",
        stackId: "bench-a",
        labels: ["Fold"],
        fasteners: [wax("c-wax", "top")]
      }),
      strip({
        id: "D",
        name: "Stem dot",
        paletteId: "terracotta",
        stackId: "bench-b",
        labels: ["Dot"],
        fasteners: [clamp("d-clamp", "right")]
      }),
      strip({
        id: "E",
        name: "Tulip sweep",
        paletteId: "coral",
        stackId: "bench-c",
        labels: ["Sweep", "Petal", "Glow"],
        fasteners: [
          clamp("e-clamp", "left"),
          wax("e-wax", "top", {
            blockedBy: ["e-clamp"],
            blockedReason: "The wax ring stays tucked until the clamp lifts."
          })
        ]
      })
    ]
  },
  {
    id: "ftue-06",
    title: "Studio Finish",
    caption: "The first pack finale mixes clamps, wax tabs, and spacers across a full 3x3 tray.",
    beat: "All three fastener types now share the same bench. Release order matters more than fast tapping.",
    mechanics: ["Clamp, wax, spacer mix", "Pack clear", "Daily unlock"],
    callouts: [
      callout("start", "Finish this studio card to unlock the daily commission bench."),
      callout("win", "Daily commission unlocked. It refreshes by UTC date for stable QA.")
    ],
    reward: reward("Pressed cedar frame", "Unlocks the first gallery frame and the daily commission card."),
    rows: [
      { id: "r1", title: "Bloom row", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Window row", entry: "left", segments: ["C", "D"] },
      { id: "r3", title: "Studio row", entry: "left", segments: ["E", "F"] }
    ],
    stacks: [
      { id: "bench-a", title: "North bench", stripIds: ["A", "B"] },
      { id: "bench-b", title: "East bench", stripIds: ["C", "D"] },
      { id: "bench-c", title: "South bench", stripIds: ["E"] },
      { id: "bench-d", title: "Side tray", stripIds: ["F"] }
    ],
    strips: [
      strip({
        id: "A",
        name: "Bloom arc",
        paletteId: "coral",
        stackId: "bench-a",
        labels: ["Arc", "Light"],
        fasteners: [clamp("a-clamp", "left")]
      }),
      strip({
        id: "B",
        name: "Bloom cap",
        paletteId: "cream",
        stackId: "bench-a",
        labels: ["Cap"],
        fasteners: [wax("b-wax", "top")]
      }),
      strip({
        id: "C",
        name: "Window bay",
        paletteId: "sky",
        stackId: "bench-b",
        labels: ["Bay"],
        fasteners: [clamp("c-clamp", "left")]
      }),
      strip({
        id: "D",
        name: "Window trim",
        paletteId: "cream",
        stackId: "bench-b",
        labels: ["Trim", "Seal"],
        fasteners: [spacer("d-spacer", "mouth")]
      }),
      strip({
        id: "E",
        name: "Studio note",
        paletteId: "terracotta",
        stackId: "bench-c",
        labels: ["Note"],
        fasteners: [clamp("e-clamp", "left")]
      }),
      strip({
        id: "F",
        name: "Leaf bracket",
        paletteId: "leaf",
        stackId: "bench-d",
        labels: ["Bracket", "Vine"],
        fasteners: [wax("f-wax", "top")]
      })
    ]
  }
];

const harborPlans = [
  {
    id: "ftue-07",
    title: "Repeated Motif",
    caption: "Two sky-blue rows now share the same palette family, so the shard art matters more than hue alone.",
    beat: "Repeated colors ask you to read crack lines and labels, not hue alone.",
    mechanics: ["Repeated palette family", "Three full rows"],
    callouts: [
      callout("start", "Two rows share the same sky glaze. Use the artwork fragments, not color alone.")
    ],
    reward: reward("Shell study card", "Starts the Harbor Keepsakes gallery with repeated blue motifs."),
    rows: [
      { id: "r1", title: "Harbor sky", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Harbor water", entry: "left", segments: ["C", "D"] },
      { id: "r3", title: "Shell edge", entry: "left", segments: ["E", "F"] }
    ],
    stacks: [
      { id: "bench-a", title: "Top rail", stripIds: ["A"] },
      { id: "bench-b", title: "Mid rail", stripIds: ["B", "D"] },
      { id: "bench-c", title: "Lower rail", stripIds: ["C"] },
      { id: "bench-d", title: "Side rail", stripIds: ["E", "F"] }
    ],
    strips: [
      strip({
        id: "A",
        name: "Harbor sky",
        paletteId: "sky",
        family: "harbor-blue",
        stackId: "bench-a",
        labels: ["Sky", "Wing"],
        fasteners: [clamp("a-clamp", "left")]
      }),
      strip({
        id: "B",
        name: "Cloud cap",
        paletteId: "sky",
        family: "harbor-blue",
        stackId: "bench-b",
        labels: ["Cap"],
        fasteners: [clamp("b-clamp", "right")]
      }),
      strip({
        id: "C",
        name: "Sea braid",
        paletteId: "sky",
        family: "water-blue",
        stackId: "bench-c",
        labels: ["Braid", "Wake"],
        fasteners: [wax("c-wax", "top")]
      }),
      strip({
        id: "D",
        name: "Foam lip",
        paletteId: "seafoam",
        family: "water-blue",
        stackId: "bench-b",
        labels: ["Foam"],
        fasteners: [clamp("d-clamp", "right")]
      }),
      strip({
        id: "E",
        name: "Shell rib",
        paletteId: "sand",
        stackId: "bench-d",
        labels: ["Rib"],
        fasteners: [spacer("e-spacer", "mouth")]
      }),
      strip({
        id: "F",
        name: "Coral spark",
        paletteId: "coral",
        stackId: "bench-d",
        labels: ["Spark", "Shell"],
        fasteners: [clamp("f-clamp", "right")]
      })
    ]
  },
  {
    id: "ftue-08",
    title: "Hidden Wax",
    caption: "A wax tab can look obvious, but a clamp ear may still cover the pull ring until the clamp lifts.",
    beat: "Not every visible wax seal is ready. Coverage still matters.",
    mechanics: ["Wax hidden under clamp", "Late pack density"],
    callouts: [
      callout("start", "That wax ring is still tucked under the clamp ear. Lift the clamp first.", {
        type: "fastener",
        id: "f-wax"
      })
    ],
    reward: reward("Sail study card", "Adds the first late-pack readability stress board."),
    rows: [
      { id: "r1", title: "Sail row", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Harbor row", entry: "left", segments: ["C", "D"] },
      { id: "r3", title: "Beacon row", entry: "left", segments: ["E", "F"] }
    ],
    stacks: [
      { id: "bench-a", title: "Far left", stripIds: ["A", "B"] },
      { id: "bench-b", title: "Left center", stripIds: ["C"] },
      { id: "bench-c", title: "Right center", stripIds: ["D", "E"] },
      { id: "bench-d", title: "Far right", stripIds: ["F"] }
    ],
    strips: [
      strip({
        id: "A",
        name: "Sail body",
        paletteId: "cream",
        family: "sail-repeat",
        stackId: "bench-a",
        labels: ["Body", "Cut"],
        fasteners: [clamp("a-clamp", "left")]
      }),
      strip({
        id: "B",
        name: "Sail trim",
        paletteId: "indigo",
        family: "sail-repeat",
        stackId: "bench-a",
        labels: ["Trim"],
        fasteners: [clamp("b-clamp", "right")]
      }),
      strip({
        id: "C",
        name: "Harbor line",
        paletteId: "sky",
        stackId: "bench-b",
        labels: ["Line", "Wake"],
        fasteners: [wax("c-wax", "top")]
      }),
      strip({
        id: "D",
        name: "Beacon glow",
        paletteId: "coral",
        stackId: "bench-c",
        labels: ["Glow"],
        fasteners: [spacer("d-spacer", "mouth")]
      }),
      strip({
        id: "E",
        name: "Beacon cap",
        paletteId: "sand",
        stackId: "bench-c",
        labels: ["Cap"],
        fasteners: [clamp("e-clamp", "right")]
      }),
      strip({
        id: "F",
        name: "Shell shadow",
        paletteId: "seafoam",
        stackId: "bench-d",
        labels: ["Shell", "Shadow", "Edge"],
        fasteners: [
          clamp("f-clamp", "left"),
          wax("f-wax", "top", {
            blockedBy: ["f-clamp"],
            blockedReason: "The wax ring is still tucked beneath the clamp ear."
          })
        ]
      })
    ]
  },
  {
    id: "ftue-09",
    title: "First Right Entry",
    caption: "Some rows now enter from the right gutter, so their deeper cells live on the left side instead.",
    beat: "Right-entry rows reverse the depth read. Start from the row mouth, not from the left edge.",
    mechanics: ["Right-entry rows", "Mixed row directions"],
    callouts: [
      callout("start", "These indigo ticks face right-to-left. Deeper cells sit farther from the right mouth.", {
        type: "row",
        id: "r1"
      })
    ],
    reward: reward("Fish tile card", "Unlocks right-entry commissions for the validator."),
    rows: [
      { id: "r1", title: "Fish row", entry: "right", segments: ["A", "B"] },
      { id: "r2", title: "Wave row", entry: "left", segments: ["C", "D"] },
      { id: "r3", title: "Stamp row", entry: "right", segments: ["E"] },
      { id: "r4", title: "Seal row", entry: "left", segments: ["F"] }
    ],
    stacks: [
      { id: "bench-a", title: "Top press", stripIds: ["A"] },
      { id: "bench-b", title: "Upper side", stripIds: ["B", "D"] },
      { id: "bench-c", title: "Lower side", stripIds: ["C", "E"] },
      { id: "bench-d", title: "Bottom press", stripIds: ["F"] }
    ],
    strips: [
      strip({
        id: "A",
        name: "Fish body",
        paletteId: "indigo",
        stackId: "bench-a",
        labels: ["Body", "Fin"],
        fasteners: [clamp("a-clamp", "left")]
      }),
      strip({
        id: "B",
        name: "Fish eye",
        paletteId: "cream",
        stackId: "bench-b",
        labels: ["Eye"],
        fasteners: [clamp("b-clamp", "right")]
      }),
      strip({
        id: "C",
        name: "Wave crest",
        paletteId: "sky",
        stackId: "bench-c",
        labels: ["Crest", "Wake"],
        fasteners: [wax("c-wax", "top")]
      }),
      strip({
        id: "D",
        name: "Foam nib",
        paletteId: "seafoam",
        stackId: "bench-b",
        labels: ["Nib"],
        fasteners: [clamp("d-clamp", "right")]
      }),
      strip({
        id: "E",
        name: "Stamp curl",
        paletteId: "coral",
        stackId: "bench-c",
        labels: ["Curl", "Seal"],
        fasteners: [spacer("e-spacer", "mouth")]
      }),
      strip({
        id: "F",
        name: "Sand mark",
        paletteId: "sand",
        stackId: "bench-d",
        labels: ["Mark", "Grain"],
        fasteners: [clamp("f-clamp", "left")]
      })
    ]
  },
  {
    id: "ftue-10",
    title: "Deep Row Pair",
    caption: "Two different rows now hold deep strips that can both be sealed by the wrong short cap.",
    beat: "Watch both deep rows. A fast near cap can ruin either lane.",
    mechanics: ["Adjacent deep rows", "Five-stack bench"],
    callouts: [
      callout("start", "Two rows want their deeper bands first. The short caps can wait.", { type: "row", id: "r1" })
    ],
    reward: reward("Lighthouse panel", "Adds the tallest harbor card to the gallery wall."),
    rows: [
      { id: "r1", title: "Lighthouse row", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Wave row", entry: "right", segments: ["C", "D"] },
      { id: "r3", title: "Postcard row", entry: "left", segments: ["E"] },
      { id: "r4", title: "Ledger row", entry: "left", segments: ["F", "G"] }
    ],
    stacks: [
      { id: "bench-a", title: "Far left", stripIds: ["A"] },
      { id: "bench-b", title: "Left", stripIds: ["B", "F"] },
      { id: "bench-c", title: "Center", stripIds: ["C"] },
      { id: "bench-d", title: "Right", stripIds: ["D", "G"] },
      { id: "bench-e", title: "Far right", stripIds: ["E"] }
    ],
    strips: [
      strip({
        id: "A",
        name: "Lighthouse shaft",
        paletteId: "cream",
        stackId: "bench-a",
        labels: ["Shaft", "Lamp"],
        fasteners: [clamp("a-clamp", "left")]
      }),
      strip({
        id: "B",
        name: "Brick cap",
        paletteId: "coral",
        stackId: "bench-b",
        labels: ["Cap"],
        fasteners: [clamp("b-clamp", "right")]
      }),
      strip({
        id: "C",
        name: "Wave body",
        paletteId: "sky",
        stackId: "bench-c",
        labels: ["Body", "Flow"],
        fasteners: [wax("c-wax", "top")]
      }),
      strip({
        id: "D",
        name: "Foam cap",
        paletteId: "seafoam",
        stackId: "bench-d",
        labels: ["Cap"],
        fasteners: [clamp("d-clamp", "right")]
      }),
      strip({
        id: "E",
        name: "Post stamp",
        paletteId: "sand",
        stackId: "bench-e",
        labels: ["Post", "Date"],
        fasteners: [spacer("e-spacer", "mouth")]
      }),
      strip({
        id: "F",
        name: "Ledger edge",
        paletteId: "indigo",
        stackId: "bench-b",
        labels: ["Edge"],
        fasteners: [clamp("f-clamp", "left")]
      }),
      strip({
        id: "G",
        name: "Ledger wax",
        paletteId: "coral",
        stackId: "bench-d",
        labels: ["Wax", "Seal"],
        fasteners: [clamp("g-clamp", "left")]
      })
    ]
  },
  {
    id: "ftue-11",
    title: "Crowded Bench",
    caption: "Five stacks crowd the bench without overlapping the live hit targets beyond the readability cap.",
    beat: "Dense boards are still about clean taps. The bench is crowded, but only exposed fasteners count.",
    mechanics: ["Crowded hit targets", "Late pack density"],
    callouts: [
      callout("start", "If two fasteners sit close together, look for the light outline on the exposed one.")
    ],
    reward: reward("Postmark cluster", "Adds a crowded bench plaque for QA focus passes."),
    rows: [
      { id: "r1", title: "Sun row", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Harbor row", entry: "right", segments: ["C", "D"] },
      { id: "r3", title: "Shell row", entry: "left", segments: ["E"] },
      { id: "r4", title: "Stamp row", entry: "left", segments: ["F", "G"] }
    ],
    stacks: [
      { id: "bench-a", title: "A rail", stripIds: ["A"] },
      { id: "bench-b", title: "B rail", stripIds: ["B", "E"] },
      { id: "bench-c", title: "C rail", stripIds: ["C"] },
      { id: "bench-d", title: "D rail", stripIds: ["D", "F"] },
      { id: "bench-e", title: "E rail", stripIds: ["G"] }
    ],
    strips: [
      strip({
        id: "A",
        name: "Sun core",
        paletteId: "sand",
        stackId: "bench-a",
        labels: ["Core", "Ray"],
        fasteners: [clamp("a-clamp", "left")]
      }),
      strip({
        id: "B",
        name: "Sun cap",
        paletteId: "coral",
        stackId: "bench-b",
        labels: ["Cap"],
        fasteners: [clamp("b-clamp", "right")]
      }),
      strip({
        id: "C",
        name: "Harbor body",
        paletteId: "sky",
        stackId: "bench-c",
        labels: ["Body", "Dock"],
        fasteners: [wax("c-wax", "top")]
      }),
      strip({
        id: "D",
        name: "Harbor lip",
        paletteId: "indigo",
        stackId: "bench-d",
        labels: ["Lip"],
        fasteners: [clamp("d-clamp", "right")]
      }),
      strip({
        id: "E",
        name: "Shell fan",
        paletteId: "cream",
        stackId: "bench-b",
        labels: ["Fan", "Glint"],
        fasteners: [spacer("e-spacer", "mouth")]
      }),
      strip({
        id: "F",
        name: "Postmark edge",
        paletteId: "coral",
        stackId: "bench-d",
        labels: ["Edge"],
        fasteners: [clamp("f-clamp", "left")]
      }),
      strip({
        id: "G",
        name: "Ledger stamp",
        paletteId: "seafoam",
        stackId: "bench-e",
        labels: ["Stamp", "Date", "Seal"],
        fasteners: [clamp("g-clamp", "left")]
      })
    ]
  },
  {
    id: "ftue-12",
    title: "Commission Capstone",
    caption: "The capstone mixes repeated colors, both row entries, delayed spacer reveals, and one hidden wax ring.",
    beat: "This last card uses the whole slice grammar. Read the entries, the repeats, and the covered fasteners.",
    mechanics: ["Capstone mix", "Delayed spacer reveal", "8-step finish"],
    callouts: [
      callout("start", "This commission mixes both entry sides and a delayed spacer reveal."),
      callout("fail:no_move", "No productive releases remain. Undo or restart to reopen the commission.")
    ],
    reward: reward("Salt-glazed frame", "Unlocks the second gallery frame for the completed harbor set."),
    rows: [
      { id: "r1", title: "Sun row", entry: "left", segments: ["A", "B"] },
      { id: "r2", title: "Harbor row", entry: "right", segments: ["C", "D"] },
      { id: "r3", title: "Beacon row", entry: "left", segments: ["E"] },
      { id: "r4", title: "Ledger row", entry: "right", segments: ["G"] }
    ],
    stacks: [
      { id: "bench-a", title: "North left", stripIds: ["A"] },
      { id: "bench-b", title: "North right", stripIds: ["B", "E"] },
      { id: "bench-c", title: "Center", stripIds: ["C"] },
      { id: "bench-d", title: "South left", stripIds: ["D"] },
      { id: "bench-e", title: "South right", stripIds: ["G"] }
    ],
    strips: [
      strip({
        id: "A",
        name: "Sun body",
        paletteId: "sand",
        family: "sun-repeat",
        stackId: "bench-a",
        labels: ["Body", "Ray"],
        fasteners: [clamp("a-clamp", "left")]
      }),
      strip({
        id: "B",
        name: "Sun cap",
        paletteId: "sand",
        family: "sun-repeat",
        stackId: "bench-b",
        labels: ["Cap"],
        fasteners: [clamp("b-clamp", "right")]
      }),
      strip({
        id: "C",
        name: "Harbor body",
        paletteId: "sky",
        family: "harbor-repeat",
        stackId: "bench-c",
        labels: ["Body", "Wake"],
        fasteners: [wax("c-wax", "top")]
      }),
      strip({
        id: "D",
        name: "Harbor lip",
        paletteId: "sky",
        family: "harbor-repeat",
        stackId: "bench-d",
        labels: ["Lip"],
        fasteners: [clamp("d-clamp", "right")]
      }),
      strip({
        id: "E",
        name: "Beacon stripe",
        paletteId: "coral",
        stackId: "bench-b",
        labels: ["Stripe", "Lamp", "Glow"],
        fasteners: [
          clamp("e-clamp", "left"),
          spacer("e-spacer", "mouth", {
            blockedBy: ["e-clamp"],
            blockedReason: "The spacer tail is still tucked behind the lifted clamp."
          })
        ]
      }),
      strip({
        id: "G",
        name: "Wax ledger",
        paletteId: "seafoam",
        stackId: "bench-e",
        labels: ["Wax", "Date", "Seal"],
        fasteners: [
          clamp("g-clamp", "left"),
          wax("g-wax", "top", {
            blockedBy: ["g-clamp"],
            blockedReason: "The wax ring is still tucked under the clamp ear."
          })
        ]
      })
    ]
  }
];

export const HANDCRAFTED_LEVELS = [...gardenPlans, ...harborPlans].map((plan, index) =>
  buildLevelFromPlan({
    id: plan.id,
    number: index + 1,
    packId: index < 6 ? "garden-tiles" : "harbor-keepsakes",
    title: plan.title,
    caption: plan.caption,
    beat: plan.beat,
    mechanics: plan.mechanics,
    callouts: plan.callouts,
    reward: plan.reward,
    rows: plan.rows,
    stacks: plan.stacks,
    strips: plan.strips
  })
);
