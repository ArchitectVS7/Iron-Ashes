# M2 Visual Rubric — the board-game-read checklist

Scored **out of 10**. This is the screenshot rubric referenced by ROADMAP-V3.1-UI **M2** exit
metrics: a fresh screenshot gallery is scored against the ten items below, and the **M2 exit gate
needs ≥8/10**. It is re-scored at each human checkpoint (T-207, T-306, T-407 and the M2+ gates) to
track whether the v3 UI reads as a physical board game rather than a web app.

## How to use it

1. Regenerate the gallery: `npm run shots:v3 -- --out docs/Redesign-V3.1/baseline` (or a milestone
   subfolder).
2. For each of the ten items, check the box if the current screenshots satisfy it across every screen.
3. The score is the count of checked boxes, out of 10. Record the score and date in the relevant
   Gate note. M2 passes at ≥8/10.

The ten items are a fixed set — do not add, remove, or reorder them, so the score stays comparable
across checkpoints.

## Checklist (score /10)

- [ ] Table texture visible
- [ ] Cards read as cards at arm's length
- [ ] No default-font text
- [ ] Act/turn track visible
- [ ] Palette cohesive
- [ ] Board is the largest element
- [ ] Resources are icon tokens
- [ ] HUD reads diegetic
- [ ] Motion present in transitions
- [ ] Screens consistent

## Scoring definitions (Gate 0.5, user-calibrated 2026-07-18)

The ten items above are fixed; these definitions pin what "checked" means, per the user's Gate 0.5
decisions (see ROADMAP-V3.1-UI §4 M2 "Gate 0.5 aesthetic decisions"):

- **Cards read as cards** — rich TCG-style faces (name + art area + rules text); in a fan, the
  corner-indexed value + suit icon must be legible without raising the card.
- **Palette cohesive** — the candlelit ash/iron/ember register INCLUDING the four muted house
  heraldry colors (ember-orange / steel / viridian / dusk-violet); any saturated web primary fails
  this item.
- **Board is the largest element** — and its 17 nodes are illustrated map locations (castles /
  forges / hamlets / dark throne) on the 8-ray star inlay, with claims shown as planted banners —
  flat colored circles fail.
- **HUD reads diegetic** — FULL dissolution: any persistent rectangular status panel fails this
  item; all former sidebar info must remain discoverable from plaques/banners/tokens (information
  loss also fails it).
- **Resources are icon tokens** — icon + count chips or gauges everywhere, house sigils on ownership
  markers; a bare numeral outside a chip fails.
- **No default-font text** *(tightened at Gate 1, 2026-07-19)* — every text node resolves to Cinzel
  (display/headers) or the old-style serif body (Alegreya / EB Garamond). A neutral web sans (e.g.
  Inter) now FAILS this item — user decision: full serif, no sans substitution even for dense UI.

## Score log

- **2026-07-18 (Gate 0.5)** — baseline gallery: **0/10** (anchor; nearest miss "board is the largest
  element", true only on the mid-game screen). Rubric definitions calibrated with the user above.
- **2026-07-19 (Gate 1, first review)** — m2 gallery: **5/10**. Pass: table texture, act/turn track,
  palette cohesive, board largest, resources-as-chips. Fail: cards (blank faces + hand clipping —
  regression), HUD-diegetic (persistent bottom rectangle + web buttons + election overlap bug),
  screens-consistent (start screen untouched), board-vs-spec (glyph circles / no star inlay / no
  banners), no-default-font (Inter, per the tightened serif definition). Motion not scored from
  stills. Verdict: fix round T-208…T-215; T-207 stays BLOCKED for a second review.
- **2026-07-19 (Gate 1, second review)** — regenerated m2 gallery: **9/10 provisional** (motion
  provisional pending the T-306 live gate; all other items pass). Blind read test: **7/7 "digital
  board game"** (fresh agent, neutral filenames). Bar met, but the user opted for a third in-person
  review before flipping T-207. Micro-fixes filed: T-216 star material depth (bold star KEPT as the
  board's identity), T-217 node hierarchy + readable banners + user-caught missing true connectors
  (Keystone→approach spokes; render==data edge-parity guard added), T-218 threat-prompt theming.
- **2026-07-20 (Gate 1, third review)** — the 8-ray board was still only a *visual* star (spec error,
  owned). Opened M2.5 for the true 8-spoke 21-node topology; T-207 stayed BLOCKED. Not re-scored (the
  board being reviewed was about to change).
- **2026-07-20 (Gate 1, fourth review)** — regenerated m2 gallery after M2.5: **9/10** (motion still
  provisional). True 8-ray 21-node topology **verified in data** (keystone exactly 4 doors; 4 diagonal
  + 4 cardinal rays); connectors thinned/materialized; start screen themed. Star ground accepted as
  subtle-dark (pixel-checked: interior lum ~28 vs table ~51). Bar met, but the user redesigned the ring
  routing on `07-endgame.png` (erase forge ring, weave a +16/−4 star lattice) → filed as milestone
  **M2.6** (T-230…T-235). Two bugs folded in: stale start-screen "~21% locked" copy (now ~53%) and
  connector-density hierarchy. T-207 stays BLOCKED for a **fifth** review.
