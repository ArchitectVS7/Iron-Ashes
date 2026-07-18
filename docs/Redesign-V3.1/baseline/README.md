# Baseline "before" gallery (M1)

These seven PNGs are the **"before" (M1) baseline** of the v3 UI, captured deterministically by
`npm run shots:v3` (the M0 screenshot loop, `scripts/shots-v3.mjs`). They are self-generated game
screenshots (CC0), driven purely through the fogged DOM, so nothing outside a viewer's
`observableState` leaks into them.

Re-score this gallery against [`../RUBRIC.md`](../RUBRIC.md) at each M2+ checkpoint (per
`Gates.md` Gate 0.5 / Gate 1) to track the presentation sprint's progress against the 10-item
board-game-read checklist.

To regenerate: `npm run shots:v3 -- --out docs/Redesign-V3.1/baseline`

## Screens

1. `01-start-select.png` — Start / setup screen: player count, mode, difficulty, seed, Herald toggle.
2. `02-board-midgame.png` — Mid-game board (round ≥ 2) during the action phase.
3. `03-capture-election.png` — Capture election / raid-block co-location beat.
4. `04-ransom.png` — Ransom scene offered after a capture.
5. `05-wraith.png` — Wraith afterlife-input / Wraiths sidebar for an eliminated player.
6. `06-bequest.png` — Death Bequest panel.
7. `07-endgame.png` — Victory / defeat game-over frame.
