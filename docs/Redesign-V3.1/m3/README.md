# M3 cards-&-hand gallery (Gate 2 / T-306)

These eight PNGs are the **M3 "Cards & hand live" gallery** of the v3 UI, captured deterministically by
`npm run shots:v3` (`scripts/shots-v3.mjs`). They are self-generated game screenshots (CC0), driven
purely through the fogged DOM under `prefers-reduced-motion: reduce` (instant mode), so nothing outside
a viewer's `observableState` leaks into them.

This is the Gate 2 / T-306 checkpoint gallery: the user scores hand feel against
[`../RUBRIC.md`](../RUBRIC.md) and the Gate 2 rubric in [`../Gates.md`](../Gates.md) (Gate 2 — T-306,
end of M3: "does the hand feel right?"). The `shots:v3` run that produced these images also enforces the
board-dominance assertion (board is the largest top-level region), the font audit (every text node
resolves to Cinzel/Alegreya, self-hosted faces loaded), and the hand-fit audit (a 6-card hand renders
fully inside the hand dock) — machine-verified evidence for several rubric items.

**The M3 review focus is `02-board-midgame.png`.** Because hand LAYOUT is chosen by `resolveHandLayout()`
wherever a real layout engine + `matchMedia` exist (real Chromium here) while only MOTION is gated behind
`prefers-reduced-motion: no-preference`, this screen shows the **static fanned hand** even in the
reduced-motion shots run: the fan arc, the corner-index reads on each card, and the class-driven
selected-lift ring. That fan geometry and the card-face styling are exactly the hand-feel artifact this
gate reviews.

**Screenshots undersell hand feel.** The fan shape and affordance styling are visible here, but motion
is not. For the Gate 2 review you must **`npm run dev`** and handle the real cards — fan shape,
hover-raise, flip weight, and the legal-glow / illegal-shake affordances — to score motion-taste (speeds,
easings, exaggeration). Your feedback at this gate is mostly motion-taste.

To regenerate: `npm run shots:v3 -- --out docs/Redesign-V3.1/m3`

## Screens

1. `01-start-select.png` — Start / setup screen: player count, mode, difficulty, seed, Herald toggle.
2. `02-board-midgame.png` — Mid-game board (round ≥ 2) during the action phase, **showing the fanned
   hand** (fan arc, corner-index reads, class-driven selected-lift) — the M3 hand-feel review focus.
3. `03-capture-election.png` — Capture election / raid-block co-location beat.
4. `04-ransom.png` — Ransom scene offered after a capture.
5. `05-wraith.png` — Wraith afterlife-input / Wraiths sidebar for an eliminated player.
6. `06-bequest.png` — Death Bequest panel.
7. `07-endgame.png` — Victory / defeat game-over frame.
8. `board-clean.png` — **Board-only export**: the board SVG with NO turn marker (header) and NO HUD
   overlays, for easiest study of the node/edge lattice. Captured off the early mid-game board so every
   node is pristine (an endgame capture scorches nodes to ash, which vanish into the dark star).
