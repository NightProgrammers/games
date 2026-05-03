# Loom Rescue

Standalone first-playable vertical slice for the Loom Rescue puzzle brief.

## Run

Open `index.html` in a browser, or serve the directory with any static file server.

## Test

```bash
npm test
```

## What Is Included

- Data-driven rules for bundles, lock pins, static one-way guides, and two-layer crossings on a `6x8` portrait board
- Full FTUE path with `15` handcrafted levels plus a seeded daily template
- In-level flows for start, play, hint, undo, restart, fail, win, and postcard reveal
- Light reward wrapper with postcard progress and milestone stamps at levels `5`, `10`, `15`, and the daily
- Deadlock fail handling when no legal pulls or exposed pins remain
- Undo that only rewinds the last successful state change and does not refund knot loss from invalid pulls

## Implementation Notes

- The current validator proves solvability because the slice uses monotonic unlocks only. If the design later adds moving guides, true reverse-pull guide failures, partial pulls, or dynamic crossings, the authoring pipeline will need a deeper search-based solver.
- Readability risk rises sharply once multiple undeclared route corridors sit close together. The current prototype offsets thread rendering to keep the dense boards legible, but a production version should add stronger art treatment for top/bottom crossings and pin silhouettes.
- QA should focus on invalid pull reasons, deadlock fail messaging, two-knot daily failure tuning, daily unlock gating after level 15, and whether bundle labels remain readable on smaller mobile screens.
