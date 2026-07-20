Gate 0 — Aesthetic direction (now, before M2 starts — the most valuable one, and the only one not 
  enforced by a halt).
  The orchestrator only forces a stop after M2 is already built (T-207). But M1 is pure architecture —
  no aesthetics — which means there's a natural window right now through the end of M1 to set direction
  before any pixels are committed. If you skip this, M2 ships my taste and your first feedback round
  becomes rework. What I need from you (answer in prose whenever, no formal step required):

  1. Art direction — for Iron Ashes: literal dark-fantasy (ash/iron/ember, parchment, gothic
  blackletter accents)? Or stylized/graphic (flat shapes, bold silhouettes, à la Root or Inscryption's
  menus)? A reference or two from digital board games you admire is worth a thousand words.
  2. Materiality — skeuomorphic (wood table, embossed tokens, paper cards with shadows) vs.
  clean-stylized (still game-like, but graphic rather than photographic).
  3. Motion feel — snappy and board-gamey (150–300ms, things clack into place) vs. cinematic (slower,
  dramatic scene moments). This drives every GSAP preset in M3–M4.
  4. Sound mood — dry tabletop foley (card slides, wooden clacks) vs. atmospheric (low drones, embers,
  metal) — or both layered.

  Once you answer, I'll author the ~/.claude/skills/tabletop-ui/SKILL.md house-style skill from it
  (that's the deferred interactive task — it's outside the repo, so it can't collide with the
  orchestrator session), and your answers become binding direction for M2–M4 across all your projects,
  not just this one.

  Gate 0.5 — End of M0: sanity-check your instruments (soft gate, 5 minutes).
  When M0 closes, glance at two artifacts before M1 churns: the baseline gallery
  (docs/Redesign-V3.1/baseline/ — the "before" pictures) and RUBRIC.md — that rubric is your scoring
  sheet at every checkpoint, so if any of its 10 items doesn't match your taste, amend it now while
  it's cheap.

  Gate 1 — T-207, end of M2 (first forced halt): "does the table read as a game?"
  The runner regenerates the gallery into docs/Redesign-V3.1/m2/, sets itself BLOCKED(awaiting user 
  visual review), and stops. You: compare m2 against baseline, score the rubric (target ≥8/10), run the
  blind read test (show a fresh agent only the screenshots, ask "web app or board game?"). Judge here:
  table texture, palette, fonts, token chips, board-centric layout, card frames. This is the 
  highest-leverage veto point — everything in M3–M4 renders on top of these choices.

  Gate 2 — T-306, end of M3: "does the hand feel right?"
  Screenshots undersell this one — run npm run dev and handle the cards: fan shape, hover-raise, flip
  weight, the legal-glow/illegal-shake affordances. Your feedback here is mostly motion-taste (speeds,
  easings, exaggeration).

  Gate 3 — T-407, end of M4: "is this playtest-ready?"
  The gate into M5. Don't just review the gallery — play a full game with sound on: scene moments
  (capture-as-election, Ransom, heart assault), the three Shadowking telegraphs being distinct, the
  sound mix, and whether the perf run's numbers match your felt experience. Approving this opens the
  human playtest.

  Gate 4 — M5, the playtest itself (yours entirely). Walk human-playtest-checklist-v3.md, set the
  shipped difficulty default (item 11), give the Wraith re-tune signal, and render the verdict: ship /
  V3.2 polish / V4 mechanics charter. (Separately still parked on your plate from before this sprint:
  the T-004 BP-exposure +1.4pp call.)
---

## Gate 0.5 — COMPLETED 2026-07-18

Baseline gallery reviewed and scored **0/10** (anchor; nearest miss: "board is the largest element",
true only on the mid-game screen). Rubric validated and calibrated via Q&A — four user decisions
recorded as scoring definitions (RUBRIC.md) and as the binding "Gate 0.5 aesthetic decisions" block
in ROADMAP-V3.1-UI §4 M2, echoed into TASKS.md T-201/T-204/T-301 and the tabletop-ui skill §8:

1. Player identity: muted HOUSE HERALDRY + sigils (Emberfall ember-orange, Greyspear steel,
   Ravenholt viridian, Duskmere dusk-violet).
2. Board nodes: ILLUSTRATED MAP locations (castles/forges/hamlets/dark throne) on the 8-ray star
   inlay; claims = planted house banners.
3. HUD: FULL dissolution (no persistent panel; zero information loss; hover/expand plaques OK).
4. Card faces: RICH TCG-style (name + art + rules text), corner-indexed value/suit for the fan;
   hover-raise zoom to read text.

Next stop: Gate 1 (T-207) after M2 builds against these definitions.

---

## Gate 1 (T-207) — FIRST REVIEW 2026-07-19: 5/10, fix round filed

m2 gallery reviewed screen-by-screen via Q&A. PASS: table texture, act/turn track, palette cohesive,
board largest, resources-as-chips. FAIL: cards (uniform blank faces + 6-card clipping — a readability
regression), HUD-diegetic (persistent bottom rectangle + web buttons; election-screen overlap bug),
screens-consistent (start screen untouched from baseline), board-vs-spec (glyph circles instead of
illustrated locations; no star inlay; no planted banners), no-default-font (Inter, per the serif
definition tightened this gate). Motion unscored from stills.

User decisions: board fixed to full spec · rich faces kept (not simplified) · full HUD dissolution
held · start screen fixed this round · event feed → diegetic chronicle · bequest themed now, endgame
frame waits for T-402b · hostage hold-rail plaque validated · body font FULL serif (Inter out).

Fix tasks T-208…T-215 filed; T-207 stays BLOCKED. Second Gate 1 review follows T-215's regenerated
gallery.

---

## Gate 1 (T-207) — SECOND REVIEW 2026-07-19: 9/10 provisional, third look requested

All eight fix tasks (T-208…T-215) verified landed: start screen transformed, rich card faces with
corner values restored (matching the original hand), full-width bottom bar dissolved into a floating
turn plaque + wax-seal End Turn, chronicle themed, testament parchment, full serif, election overlap
fixed, board rebuilt as a giant 8-point chaos star with circle-free illustrated locations.

Blind read test: 7/7 "digital board game" (fresh agent, neutral filenames) — first full pass.
Motion: scored provisionally, verified live at the T-306 gate.

User rulings: the giant star is KEPT as the board's defining visual → gains material depth (T-216);
forges/approaches/banners get legibility fixes AND the user caught missing true connectors — the
Keystone→approach spokes were absent from the render → edge-parity guard render==data (T-217);
threat prompt themed (T-218); T-219 regenerates the gallery. T-207 stays BLOCKED — the user chose an
in-person third review over conditional approval before any flip.
