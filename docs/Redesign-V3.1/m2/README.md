# M2 theme-foundation gallery (Gate 1 / T-207)

These seven PNGs are the **M2 theme-foundation gallery** of the v3 UI, captured deterministically by
`npm run shots:v3` (`scripts/shots-v3.mjs`). They are self-generated game screenshots (CC0), driven
purely through the fogged DOM under `prefers-reduced-motion: reduce` (instant mode), so nothing outside
a viewer's `observableState` leaks into them.

This is the Gate 1 / T-207 checkpoint gallery: the user scores it against [`../RUBRIC.md`](../RUBRIC.md)
(target ≥8/10) and runs the blind read test ("web app or board game?" on a fresh agent given only these
screenshots). The `shots:v3` run that produced these images also enforces the board-dominance assertion
(board is the largest top-level region) and the font audit (every text node resolves to Cinzel/Inter,
self-hosted faces loaded) — machine-verified evidence for two of the rubric's ten items.

To regenerate: `npm run shots:v3 -- --out docs/Redesign-V3.1/m2`

## Screens

1. `01-start-select.png` — Start / setup screen: player count, mode, difficulty, seed, Herald toggle.
2. `02-board-midgame.png` — Mid-game board (round ≥ 2) during the action phase.
3. `03-capture-election.png` — Capture election / raid-block co-location beat.
4. `04-ransom.png` — Ransom scene offered after a capture.
5. `05-wraith.png` — Wraith afterlife-input / Wraiths sidebar for an eliminated player.
6. `06-bequest.png` — Death Bequest panel.
7. `07-endgame.png` — Victory / defeat game-over frame.
