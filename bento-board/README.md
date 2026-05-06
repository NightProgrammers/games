# Bento Board

Standalone first-playable vertical slice for the Bento Board puzzle brief.

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

- Pull requests that change `bento-board/**` or `.github/workflows/bento-board-preview.yml` publish a preview build to `https://<owner>.github.io/<repo>/previews/bento-board/pr-<number>/`.
- Pushes to `main` that change the same paths publish the stable build to `https://<owner>.github.io/<repo>/bento-board/`.
- Both deploy jobs verify the slice first with `npm run verify`.

## Rollback And First Checks

- Preview cleanup is automatic when the pull request closes; the workflow removes `previews/bento-board/pr-<number>/` from `gh-pages`.
- Stable rollback is a normal git revert on `main`; the next stable deploy republishes the reverted `bento-board/` contents to `gh-pages`.
- First post-deploy QA should cover a narrow-phone viewport pass, daily unlock after level `6`, UTC date rollover for the daily special, and jam / overflow recovery through `Undo`, `Restart`, and `Hint`.

## Included

- Data-driven menu packs, handcrafted levels, tutorial callouts, rewards, and daily special generation
- Fastener-first input only: picks, bands, and dividers trigger auto-slide resolution
- Undo, hint, restart, fail, win, and a simple journal wrapper
- Portrait mobile-first UI that keeps the lunchbox, recipe ribbon, and stack field readable on a phone viewport

## Implementation Notes

- Readability gets fragile once multiple fasteners crowd the same lane, so the authoring validator keeps the silhouette count and early exposed moves conservative.
- Fastener hit targets are separated by type and offset in the UI, but any future denser layouts should keep the 56px / 60px / 64px target sizes intact.
- The solver is intentionally lightweight and monotonic; if later content adds branching destinations, moving blockers, or non-monotonic stack rules, the validator will need a deeper search model.
- Overflow is supported by the engine, but the handcrafted campaign stays mostly exact-count so the slice remains readable and solvable without hidden routing.
