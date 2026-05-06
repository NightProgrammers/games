# Mosaic Press

Standalone first-playable vertical slice for the Mosaic Press release-order mosaic puzzle.

## Run

Open `index.html` in a browser, or serve the directory with any static file server.

## Test

```bash
npm test
```

## Verify

```bash
npm run verify
```

## What Is Included

- Data-driven Mosaic Press rules for press stacks, clamps, wax tabs, paper spacers, row entry lanes, gutter overflow, no-move fail, undo, hint, restart, win, and daily commission entry
- `12` handcrafted campaign cards in `2` packs of `6`, plus `1` deterministic daily generator keyed by UTC `YYYY-MM-DD`
- Portrait-first static HTML, CSS, and JS slice with gallery wrapper, card preview ribbon, press bench, tray rows, fail modal, and reward flow
- Validator-backed authoring that checks level shape limits, right-entry gating, repeated-mechanic claims, opening productive fasteners, and at least one completion path

## Implementation Notes

- Readability limits: the slice keeps rows to `2` to `4` cells, stacks to `2` to `5`, and active hit targets to the front strip only. Dense late levels still need phone QA, especially level `11`, where visual crowding is deliberate.
- Hit-target handling: clamps, wax tabs, and spacers render as oversized buttons anchored to authored slot positions on the front strip only. Covered fasteners still render when the design expects the player to notice them, but they reject taps with local copy instead of spending a penalty.
- Solver and validator needs: the current validator uses BFS over fastener removals because strip motion and destinations are deterministic. If production later adds manual row choice, dragging, irregular shard clusters, or buffered gutter parking, the authoring pipeline will need a deeper state-space solver and better diagnostics.

## QA Focus

- Verify `Gutter Overflow` reads as fair on level `5`, level `10`, and the daily templates.
- Verify `No Move` only triggers when no exposed fastener can lead to an immediate successful placement.
- Check narrow-phone readability for fastener overlap, row entry direction, and target-card preview cells.
- Confirm daily commission unlocks after level `6` and uses UTC date rollover rather than local device midnight.

## Preview Deployment

- GitHub Actions workflow: `.github/workflows/mosaic-press-preview.yml`
- Pull requests deploy previews to `https://<owner>.github.io/<repo>/previews/pr-<number>/`
- `main` deploys the stable build to `https://<owner>.github.io/<repo>/mosaic-press/`
- The first deployment still requires enabling GitHub Pages for the `gh-pages` branch in repository settings
