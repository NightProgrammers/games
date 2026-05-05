# Sticker Studio

Standalone first-playable vertical slice for the Sticker Studio scrapbook puzzle.

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

## Deployment

- Pull requests that change `sticker-studio/**` or `.github/workflows/sticker-studio-preview.yml` publish a preview build to `https://<owner>.github.io/<repo>/previews/sticker-studio/pr-<number>/`.
- Pushes to `main` that change the same paths publish the stable build to `https://<owner>.github.io/<repo>/sticker-studio/`.
- Both deploy jobs verify the slice first with `npm run verify`.

## Rollback And First Checks

- Preview cleanup is automatic when the pull request closes; the workflow removes `previews/sticker-studio/pr-<number>/` from `gh-pages`.
- Stable rollback is a normal git revert on `main`; the next stable deploy republishes the reverted `sticker-studio/` contents to `gh-pages`.
- First post-deploy QA should cover a narrow-phone viewport pass, daily unlock after level `6`, persistence across reloads, and the UTC date rollover for the daily page.

## What Is Included

- Data-driven ordered sticker-sheet gameplay with tray sheets, active partial sheets, binder clips, undo, hint, restart, fail, win, and daily-page entry
- `12` handcrafted campaign pages in `2` packs of `6`, plus `1` deterministic daily generator keyed by UTC `YYYY-MM-DD`
- Solver-backed authoring validation that checks clip counts, target references, repeat-family usage, early long-chain gating, and at least one completion path
- Portrait-first scrapbook layout with visible silhouettes from the start, clip rail, sheet tray, local reject feedback, and minimal album reward wrapper

## Implementation Notes

- The current validator uses state-space search across `place` and `park` actions. That is sufficient for this slice because clip assignment is deterministic and there are no drag paths, hidden layers, or alternate slot behaviors. If production later adds manual clip-slot selection, drag-only peeling, or visual layers that affect legality, the authoring tool will need a deeper solver and better diagnostics.
- The design spec has one internal tension: levels `8` and `9` ask for `5` sheets with `9` silhouettes, while the same spec also says authored sheet lengths should stay between `2` and `4`. This slice resolves that by allowing a small number of one-sticker opener sheets in late pages and some daily seeds. If the team wants a strict two-sticker minimum, those pages should move to `10` silhouettes or back down to `4` sheets.
- Readability risk rises on dense portrait pages once repeated families arrive. The slice keeps every empty silhouette outlined, adds variant labels for repeated families, and keeps filled stickers slightly flatter so open targets stay legible. QA should still focus on level `10` onward and smaller phone widths to catch any pages where decorative layering or filled stickers hide open spots.
