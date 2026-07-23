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

- [9] Table texture visible
- [6] Cards read as cards at arm's length **Cards in hand need to be larger, hards when previewed also need to be larger**
- [9] No default-font text
- [6] Act/turn track visible **Not obvious. The "R1/14" is a little small, and not obvious this is the turn tracker**
- [9] Palette cohesive
- [9] Board is the largest element
- [8] Resources are icon tokens **Slightly larger on the resource icons**
- [9] HUD reads diegetic
- [7] Motion present in transitions **Motion present but choppy**
- [9] Screens consistent

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
- **2026-07-20 (Gate 1, fifth review — rework applied, awaiting user re-score)** — walking the gate
  with the user, item **#8 (HUD reads diegetic) was called a FAIL**: the left Court/Hold-rail column
  and right Warlords column were still persistent rectangular status panels, short of Gate 0.5's FULL
  dissolution. Reworked (fifth-review fix): **(a) edge legibility** — the secondary lattice weave read
  as dark-brown mud, so `SECONDARY_EDGE_OPACITY` 0.5→0.8 and `.edge-secondary` `#b0863a`→`#d4a94e`
  (primary spokes still strictly brighter); the whole lattice now reads in the lighter central-"X"
  gold. **(b) FULL dissolution (user: "Full overlay, both rails" + "Mix by importance")** — both 264px
  side columns retired; the board fills the stage; house plaques float in the right gutter, the realm
  plaques in the left gutter, the hand in a bottom-centre dock — all board-EDGE overlays on bare wood.
  Load-bearing blocks stay open (Hold Rail — §13 P0-11); reference blocks (Court, Oaths, Ledger,
  Wraiths, Suspicion, Audits) collapse to a hover/focus-expand tab (zero info loss). **(c) card faces
  (item #2)** — accepted as-is for M2; a Shadowlord-lineage `card-art-spec.md` records the deferred
  parameterized image-gen plan rather than forcing rich faces through UI assets. Gallery regenerated;
  all `shots:v3` machine audits pass (board-dominance now 1.02M vs 85k px²; font; hand-fit-in-dock;
  no-bottom-bar; election-unclipped). **T-207 stays BLOCKED** — the user does the in-person re-score
  and the flip; this entry is the rework record, not a self-awarded pass.
- **2026-07-22 (Gate 2 / T-306, M3 first review — user in-person)** — the user handled the live M3
  build and scored the ten items per-item /10 (inline in the checklist above): 9 / **6** / 9 / **6** /
  9 / 9 / 8 / 9 / **7** / 9 = **81/100**. Four items flagged with fixes: **#2 cards (6)** — hand cards
  and preview cards both need to be larger; **#4 act/turn track (6)** — not obvious; "R1/14" is small
  and doesn't read as the turn tracker; **#7 resource tokens (8)** — resource icons slightly larger;
  **#9 motion (7)** — present but **choppy**. Plus a **NEW usability gap outside the fixed ten** (the
  10-item set is not modified): from the board it is **not clear (a) what the turn order is, (b) how to
  move, or (c) which player I am**. Verdict: fix round filed — **T-307…T-311** (TASKS.md, M3). **T-306
  stays BLOCKED** for a re-review after the fixes; this entry is the review record, not a pass.
