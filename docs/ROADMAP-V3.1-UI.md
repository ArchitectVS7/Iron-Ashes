# Iron Throne of Ashes **V3.1** — Presentation Sprint Roadmap

**Goal:** turn the placeholder web-app UI (`src/ui-v3`) into a reactive, engaging *digital board game* —
cards that read as cards, animated moves with sound, tokens/board/turn-track as game artifacts — so the
**V3-6 human playtest can actually vet v3's felt experience**. Source design rationale:
`docs/Redesign-V3.1/Design Advice (Fable).md` (the merged Fable+Sonnet advice).

**Status: ACTIVE — wired into the handoff machinery at Stage V3.1-M0 (2026-07-18, T-001).** `docs/handoff/state.json`
`currentStage` is `V3.1-M0`; Stage V3-6 in `ROADMAP-V3.md` §4 is expanded into the V3.1-M0…M5 sub-track
(see §2). The sprint is open.

---

## 1. Why V3.1 and not V4 (numbering decision)

**Recommendation: V3.1.** Rationale:

1. **Version majors in this repo mean mechanics redesigns.** v1→v2→v3 each ran concept → focus group →
   algorithm spec → adversarial stress-test. This sprint touches **zero engine code**: balance is LOCKED,
   all mutation stays in `applyCommand`, the UI remains a projection of `observableState`. Calling a
   presentation layer "V4" would misstate its provenance and scope.
2. **v3 was never vetted — and this sprint is the prerequisite for vetting it.** The first unchecked
   box in `ROADMAP-V3.md` §4 is Stage V3-6 "UI polish + human playtest". The checklist items it must
   answer (elimination feel, capture-as-scene, Wraith engagement, the two-act ending) are
   *felt-experience* questions that a sidebar-of-numbers UI cannot surface. V3.1 is Stage V3-6's "UI
   polish" half, expanded into a real milestone track; the playtest is its exit gate.
3. **V4 is reserved for the playtest verdict.** If the M5 playtest reveals mechanical failures, *that*
   becomes the V4 charter (with the usual concept→spec→stress-test provenance). Until then there is no
   V4-shaped work.


## 2. Wiring into the handoff machinery (first task of M0)

When this sprint opens:
- Expand Stage V3-6 in `ROADMAP-V3.md` §4 into sub-boxes `- [ ] **V3.1-M0 …**` … `- [ ] **V3.1-M5 …**`
  (the checker already parses sub-boxes), each pointing at this file; the human playtest stays the final
  sub-box. M6 (kit extraction) lives outside the §4 gate — it is cross-project work, not a v3 blocker.
- Repoint `state.json` `currentStage` to `V3.1-M0` and run `npm run handoff:check`.
- The AGENT-PROTOCOL Definition of Done applies **per milestone**: `npm run verify` exits 0 → update
  state.json + this file (+ ROADMAP-V3 §8 changelog) → commit → `handoff:check` exits 0.

## 3. Guardrails (non-negotiable, inherited)

- **Engine untouched.** No edits under `src/v2/`, `src/v3/` (except *read-only* imports of types /
  `observableState`). Balance stays LOCKED — no tunable edits, ever, in this sprint.
  - **2026-07-20 (T-221) — USER-AUTHORIZED TOPOLOGY EXCEPTION, scoped to M2.5 only.** The user has
    authorized the **true 8-spoke board** engine change (see §M2.5 + `TASKS.md` M2.5, T-221…T-229). For
    that milestone *only*, the "engine untouched" guardrail is lifted for the **board-topology change**:
    the v3 board grows 17 → 21 nodes (+4 cardinal mid-belt nodes) — see the 2026-07-20 (T-222) split
    decision below for why this lands in a **new `data/board-v3.json`**, not in-place on `data/board.json`
    — and the four-fold type/setup/blight/sim/AI assumptions may be generalized under `src/v2/` / `src/v3/`.
    The Keystone still keeps **exactly 4 approach doors**; 4 seats / 4 quadrants remain the game's shape.
    - **Topology-only — no tunable VALUE edits.** `src/v3/tunables.ts` and `tunables.gen.ts` stay
      untouched; the exception permits *structural* changes, never a tunable-value change. Any diff
      touching a tunable value is out of scope and forbidden.
    - **The balance LOCK is VOIDED by the topology change itself, not silently ignored.** The old lock
      measured a 17-node board; a 21-node board is a different game, so the §9 numbers no longer apply.
      A fresh 2-seed baseline reading (T-227) is recorded as the NEW baseline that *replaces* the old
      lock; every band miss is **recorded, not tuned**. Re-establishing the §9 bands on the new board is
      deferred to post-playtest / V4-scale work — it is explicitly out of scope for M2.5.
    - **2026-07-20 (T-222) — the 21-node board is a NEW `data/board-v3.json`, NOT an in-place edit of
      `data/board.json`.** The original spec text (this §3, §M2.5 T-222, exit metric, `state.json`) said
      "`data/board.json` 17 → 21 nodes". Implementation surfaced a hard blocker: `data/board.json` is *also*
      the source `scripts/gen-data.mjs` codegens into `src/v2/board.gen.ts` — the **frozen v2 engine** reads
      it. Growing `data/board.json` in place would flow the 4 new nodes into the v2 board and break the
      untouched-v2 guardrail (a strictly worse violation than the file-name deviation). Resolution: v3 forks
      its own board source **`data/board-v3.json`** (the 17-node v2 board + the 4 cardinal `mid` nodes),
      added as a distinct `gen-data.mjs` target feeding `src/v3/board.gen.ts`; `data/board.json` and
      `src/v2/board.gen.ts` stay byte-for-byte untouched. Every acceptance reference that read
      "`data/board.json`" for the M2.5 build now reads **`data/board-v3.json`**. This is a file-path/source
      split only — the topology, node count (21), Keystone-4-doors invariant, and "no tunable-VALUE edits"
      constraint are all unchanged.
    - **2026-07-20 (T-230) — the topology exception is CONTINUED into M2.6** (the **ring rewire** / star
      lattice; fourth Gate-1 review). Under identical terms — topology-only, no tunable-VALUE edits, the
      §9 lock stays voided, the fresh lattice reading (T-233) recorded not tuned — the user authorized a
      further edge change to `data/board-v3.json`: REMOVE the 4 forge-ring edges, ADD 16 lattice edges
      (−4 / +16). The 21-node set, the Keystone-4-doors invariant, and `data/board.json` (frozen v2) are
      all unchanged. See §M2.6.
- **Fog (D2) extends to presentation.** Animations must not leak: nothing hidden from `viewerSeat`'s
  `observableState` projection may ever reach the DOM, a texture, or the move stream — including
  *mid-animation* (a flip may not show face content before the reveal frame). Enforced by leak tests (M1).
- **Determinism invariant, scoped (dated decision to record in state.json at M0):** the "no
  Math.random/Date.now under src/" invariant is **engine+sim scoped** (`src/v2`, `src/v3`, `src/utils`).
  The presentation layer (`src/ui-v3`) may use `requestAnimationFrame`/GSAP internal timing, but (a)
  still **no `Math.random`** — presentational jitter uses a dedicated `SeededRandom` instance that never
  touches `GameState`, and (b) no timing value ever feeds back into game state or commands.
- **Instant mode is load-bearing:** every animation path must run in a synchronous "instant" mode —
  it is both the `prefers-reduced-motion` accessibility path and how jsdom tests stay fast and green.
- **First runtime dependencies** (repo currently has zero): `gsap` + `howler`, pinned. Note GSAP's
  license terms for commercial games (anime.js is the MIT fallback). No other runtime deps without a
  dated decision here.
  - **2026-07-18 (T-002)** — Pinned (exact, non-range): `gsap@3.15.0`, `howler@2.2.4` (runtime deps),
    `@types/howler@2.2.13` (dev; gsap ships its own types, so no `@types/gsap`). GSAP 3 core (the
    tween/timeline API this sprint uses) is distributed under GreenSock's "No Charge" standard license
    (MIT-style for standard use); the paid Club GreenSock tier only gates special bonus plugins, none
    of which are used here. anime.js (MIT) remains the fallback if the license posture ever changes.
    No usage yet beyond a type-level import smoke test (`tests/v3/deps-smoke.test.ts`).
  - **2026-07-18 (T-003)** — Added `playwright@1.61.1` (exact pin) as a **devDependency** only (the
    §2 standing constraint pre-sanctions "playwright dev-only"); it never ships in the runtime bundle.
    It powers `scripts/shots-v3.mjs` (`npm run shots:v3`), the headless screenshot loop that boots the
    Vite dev server in-process and drives `/index-v3.html` purely through DOM clicks (no `src/v3`
    imports; fog-respecting). Chromium is fetched once via `npx playwright install chromium` (dev-tool
    binary, not a committed game asset). No other new deps.
- **Verify stays green at every milestone boundary** — the FULL v2+v3 suite, lint, typecheck.

## 4. Milestones

### M0 — Foundations & the screenshot feedback loop
*Nothing visual yet; make the sprint safe and the agent sighted.*
- [x] Wire handoff machinery per §2; record the invariant-scoping decision in `state.json`. (2026-07-18, T-001)
- [x] Screenshot loop working: headless browser (Playwright MCP or a `scripts/` Playwright script) boots
      `npm run dev`, drives `/index-v3.html`, captures every screen (start/difficulty, board mid-game,
      capture election, Ransom, Wraith, Bequest, victory/defeat). (2026-07-18, T-003)
- [x] **Baseline "before" gallery** committed under `docs/Redesign-V3.1/baseline/`. (2026-07-18, T-004)
- [x] `tabletop-ui` house-style skill scaffolded (`~/.claude/skills/tabletop-ui/SKILL.md`) — global, not
      in-repo; records the aesthetic rules + this stack so every project session inherits them. (2026-07-18, T-004)
- [x] Add `gsap` + `howler` (pinned); `vite build` + verify green. (2026-07-18, T-002)

**Exit metrics:** `npm run verify` 0; `handoff:check` 0; ≥7 distinct screens captured headlessly by one
command; baseline gallery in-repo.

### M1 — The semantic move stream (transition layer; architecture before art)
*The §3b fix for "snaps instead of animates": diff old→new `observableState`, emit typed semantic
`Move`s ("card hand→discard", "token A→B", "score 4→7"), play them through an animation queue.*
- [x] `src/ui-v3/moves.ts`: `diffObservable(prevObs, nextObs) → Move[]` — pure, typed, derived **only**
      from the two fog projections (leak-safe by construction). (2026-07-18, T-101)
- [x] Animation queue: sequences `Move[]` through GSAP timelines; **instant mode** collapses to
      synchronous DOM settlement. (2026-07-18, T-103)
- [x] `SoundManager` skeleton (Howler): `play(moveType)`; silent in tests. (2026-07-18, T-105)

**Exit metrics (all vitest-enforced):**
- Every v3 command type, driven over full simmed games (reuse the sim/E2E harnesses), produces a typed
  `Move[]` — an exhaustive `Record<CommandType, …>` makes misses a **compile error**.
- Determinism: same seed + same command script → byte-identical move stream (2 seeds).
- Fog leak test: serialize the move stream for each `viewerSeat` over full games; assert it never
  contains redacted token content or the seed.
- Replay test: instant-mode playback of the move stream settles to DOM identical to a cold render of
  the final state (**"snap count 0"** — no state change can bypass the queue).
- Full suite green (currently 1,142 tests — count may only go up).

### M2 — Theme foundation ("stop looking like a spreadsheet")

**Gate 0.5 aesthetic decisions (user, 2026-07-18) — binding for M2/M3 implementation:**
1. **Player identity = house heraldry:** Emberfall ember-orange, Greyspear iron/steel, Ravenholt deep
   viridian, Duskmere dusk-violet — muted to the candlelit palette, each with a sigil (colorblind
   shape+icon rule). No saturated web primaries.
2. **Board nodes = illustrated map locations:** tiny SVG illustrations — keeps as castles, forges with
   ember glow, holdings as hamlets, the Keystone as a dark throne — on the 8-ray star inlay; a claimed
   node shows the owner's **banner planted on it**.
3. **HUD = FULL dissolution:** no status panel at all — exposure, warlord standings, court, and turn
   prompt become plaques/banners/tokens around the board edges. Constraint: **zero information loss** —
   everything the old column showed must remain discoverable (hover/expand plaques are acceptable).
4. **Card faces = rich (TCG-style):** name + art area + rules text via the generator (art areas may be
   generated-ornamental until bespoke art exists). Constraint: **value + suit icon must be corner-
   indexed** and legible in the fan; full text is read via hover-raise zoom (M3).
5. **Gate 1 additions (user, 2026-07-19):** body font is **FULL old-style serif** (Alegreya/EB
   Garamond; no Inter/sans anywhere — the font audit enforces it); the event feed becomes a
   **diegetic chronicle** scroll (not stacked alerts); the **bequest** is themed as a testament
   parchment NOW, while the **endgame frame deliberately waits** for T-402b's sequences; the hostage
   **hold-rail plaque is validated** as the capture-in-hand treatment. First review scored 5/10 →
   fix tasks T-208…T-215; T-207 re-review pending. **T-208 DONE (2026-07-19):** board to spec —
   circle-free illustrated locations (the silhouette IS the node body; no enclosing disc/ring),
   a burned chaos-star carved into the wood (`.star-carve`) beneath the distinct playable edges,
   and planted heraldry banners as the sole claim signal; new `tests/v3/board-view.test.ts` +
   an `auditStarInlay` gate in `npm run shots:v3`.

- [x] Board-centric layout: board center-stage on a **textured table surface**; the right-hand status
      column dissolves into diegetic HUD elements (banners, plaques, ribbons at the edges). (2026-07-19, T-201)
- [x] Typography: thematic display font + readable body font (e.g. Cinzel + a serif/sans body). (2026-07-19, T-202)
- [x] **Every resource/stat becomes a token or gauge**: game-icons.net SVGs + Kenney frames; icon+count
      chips, never bare numbers in a table. (2026-07-19, T-203)
- [x] Card frames + a **data-driven card-face generator** (piece/token data → SVG face) — art swaps
      never touch layout code. (2026-07-19, T-204)
- [x] Turn/round/Act (Whisper→March→Reckoning) as a visual track with a marker, not a text line. (2026-07-19, T-205)

**Exit metrics:**
- Grep-able: zero resource values rendered outside the token/chip component (enforced by a DOM audit
  test over a full game: every numeric stat node carries the token class + an icon).
- Screenshot rubric scored ≥8/10 against a 10-item checklist committed with the gallery (table texture
  visible; cards read as cards at arm's length; no default-font text; act/turn track visible; palette
  cohesive; board is the largest element; etc.).
- **Blind read test:** a fresh agent instance shown only the new screenshots, asked "web app or digital
  board game?", answers *board game* for every screen.
- `vite build` bundle + assets ≤ 3 MB (keeps the prototype snappy; assets licensed CC0/CC-BY, credited
  in `docs/CREDITS.md`).

### M2.5 — True 8-spoke board (engine topology change; user-authorized 2026-07-20)
*The one milestone in this sprint that legitimately touches the engine — the user asked three times for
a real 8-direction board; it was mis-scoped as visual-only. Under the §3 dated exception (T-221), the
board grows to a true 8-spoke topology. **Topology only — zero tunable-value edits; the balance LOCK is
voided by the change and replaced with a fresh baseline (T-227), not re-tuned.***
- [x] **T-222** — `data/board-v3.json` (new v3 board source; see the 2026-07-20 §3 split decision — kept
      off the frozen-v2 `data/board.json`) 17 → 21 nodes: +4 cardinal mid-belt nodes so all 8 compass rays
      are real routes inward; Keystone keeps exactly 4 approaches; regenerate `src/v3/board.gen.ts`.
- [x] **T-223** — Untangle the 4-fold assumptions in types + setup (keep-id tuples, quadrant maps,
      blight seams) — generalize node collections without changing game rules (still 4 seats / 4 quadrants).
- [x] **T-224** — Blight seams + spoke paths redefined coherently for 8 rays (dated spec amendment +
      rewritten spoke-path tests; blight still reaches the Keystone from every seam).
- [x] **T-225** — Render the 21-node board in `src/ui-v3`: the 4 new cardinal nodes get their own
      illustrated silhouettes; T-220 star/connector treatment carries over; edge-parity test passes.
- [x] **T-226** — Sim / UGT harness / AI + Shadowking policy run correctly on the 21-node board
      (generalize hard-coded node ids / quadrant maps / distances); correctness only, no tuning.
- [x] **T-227** — Fresh balance READING (2-seed sweep) on the new topology, recorded as the NEW baseline
      (dark win %, doom-vs-attrition, capture rate, rounds, BP triple) with a tunable-vs-structural
      assessment; band misses recorded, nothing tuned.

**Exit metrics:**
- `data/board-v3.json` (the new v3 board source; `data/board.json` stays the frozen 17-node v2 board) is a
  symmetric 21-node 8-fold board; the Keystone still has **exactly 4** approach doors; graph connected; all
  new links bidirectional (validator test); `src/v3/board.gen.ts` byte-consistent.
- Board renders all 21 nodes with tier-appropriate silhouettes; the T-217 edge-parity test passes
  against the NEW data (render == data, 8 real rays).
- `npm run verify` 0 (full v2+v3 suite green on the 21-node board); `npm run sim:v3` completes both
  modes at 2/3/4p with sane termination.
- A fresh 2-seed sim baseline is committed (new `sim-results/` run dir + REPORT) and recorded in
  ROADMAP-V3 §8 + `state.json`, with an explicit tunable-vs-structural read on every band miss.
- **Zero tunable-VALUE edits** — the diff shows no change to `src/v3/tunables.ts` / `tunables.gen.ts`.

### M2.6 — Ring rewire (the star lattice; engine topology change; user-authorized 2026-07-20)
*Fourth Gate-1 review (2026-07-20): the true 8-ray 21-node board was delivered and verified, but the
user marked up `07-endgame.png` — erase the middle (forge) ring and draw the yellow lattice edges
weaving the mid + outer rings into a **star lattice** (−4 forge-ring edges / +16 lattice edges).
Reopened under the **same M2.5 §3 topology exception** — topology-only, zero tunable-VALUE edits, the
§9 balance LOCK stays voided, and a fresh reading is recorded, not tuned. The sim / UGT harness / AI /
Shadowking policy are already board-derived (the T-226 audit: BFS navigation, board-derived quadrant
maps, no node-id literals), so no engine untangle is needed — only `data/board-v3.json` edges, render
parity, and a fresh reading. `data/board.json` (the frozen 17-node v2 board) stays untouched.*
- [ ] **T-231** — Ring rewire: edit **only** `data/board-v3.json` (then `npm run gen:data` to regen
      `src/v3/board.gen.ts`) — REMOVE the 4 forge-ring edges (forge-nw↔ne↔se↔sw↔nw); ADD 16 lattice
      edges: set (1) outer-cardinal↔diagonal-mid (keep-n↔forge-ne, keep-e↔forge-se, keep-s↔forge-sw,
      keep-w↔forge-nw), set (2) the outer-diagonal↔cardinal-mid octagon (8: holding↔mid weave), set (3)
      the cardinal-mid square (mid-n↔mid-e↔mid-s↔mid-w). Symmetric on both endpoints; keystone still
      exactly `[approach-nw,ne,se,sw]`; no forge–forge edge remains; `data/board.json` untouched.
- [ ] **T-232** — Re-render + edge-parity assert on the rewired lattice (forge ring gone; the two
      octagons + cardinal-mid square render as materialized ley-lines, T-220 style, primary rays brighter
      than the secondary lattice per the fourth-review density note); no hard-coded edges. Also fix the
      **stale start-screen copy** — the "~21% locked balance (flawless play)" claim is voided (the
      21-node board reads ~53%, T-227; the lattice will differ again) → replace with copy stating the
      balance is being re-established for the new topology (no fabricated number).
- [ ] **T-233** — Fresh balance READING (canonical 2-seed sweep, seeds 20260622+20260628, n=40, 2/3/4p,
      both modes) into `sim-results/v3-21node-lattice-n40/` with a combined REPORT (delta vs the T-227
      pre-lattice baseline + a tunable-vs-structural assessment); re-audit board-derivation greps; band
      misses recorded, **nothing tuned**; dated ROADMAP-V3 §8 entry.

**Exit metrics:**
- Every edge symmetric (`∀ a∈conn(b) ⇔ b∈conn(a)`, validator test); Keystone still has **exactly 4**
  approach doors; **no forge–forge edge remains**; graph connected; `src/v3/board.gen.ts` byte-consistent
  with `data/board-v3.json` after `npm run gen:data`; `data/board.json` untouched.
- The T-217 edge-parity test passes over the +16/−4 delta (render == data): the forge ring no longer
  renders; the two octagons + the cardinal-mid square render as ley-lines; the exact new edge count is
  asserted; no stale "~21% locked" start-screen copy remains.
- `npm run verify` 0 (full v2+v3 suite green on the rewired board); `npm run sim:v3` completes both
  modes at 2/3/4p with sane termination (no guard hit).
- A fresh 2-seed lattice reading is committed (new `sim-results/v3-21node-lattice-n40/` run dir + REPORT)
  and recorded in ROADMAP-V3 §8 + `state.json`, with an explicit tunable-vs-structural read on every
  band miss.
- **Zero tunable-VALUE edits** — the diff shows no change to `src/v3/tunables.ts` / `tunables.gen.ts`.

### M3 — Cards & hand live
- [ ] Hand rendered as a **fanned card row** (CSS 3D; hover-raise, selected-lift).
- [ ] Deal / draw / play / discard animated via the M1 queue; **3D flip** on any reveal.
- [ ] Legal actions glow on hover/selection; illegal interactions shake (juice, not alerts).

**Exit metrics:**
- Coverage: every hand-delta `Move` type has an animation preset + sound (the M1 compile-time record
  extends to presets — a new move type without a preset is a type error).
- Fog at frame level: face content is only swapped at the flip midpoint — instant-mode assertion
  ordering proves pre-flip DOM never contains face data.
- The existing jsdom E2E full-game-via-UI tests still pass in instant mode, unmodified in intent.

### M4 — Board life & sound
- [ ] Piece movement animated **along board paths** (not teleporting), with arrival effects.
- [ ] Scene moments: capture → election, Ransom, discovery flips, ASSAULT_HEART, Shadowking telegraph
      (WHISPER/MARCH/RECKONING each visually distinct), elimination, victory/defeat sequences.
- [ ] Full SFX pass: every `Move` type has a sound (Kenney/freesound, credited); master volume + mute.

**Exit metrics:**
- Exhaustiveness: `Record<MoveType, {preset, sound}>` fully populated — compile-enforced.
- Mechanic visibility map: a table in this doc mapping **every item of
  `human-playtest-checklist-v3.md` to its on-screen representation** — no unmapped rows.
- Performance: a full AI-vs-AI game played through the animated UI (Playwright, animations ON) with no
  main-thread stall >100 ms and steady ≥55 fps during animation bursts (Playwright trace).
- `prefers-reduced-motion` honored end-to-end (whole game in instant mode, sound intact).

### M5 — Playtest readiness → **run the V3-6 human playtest** (exit gate for v3)
- [ ] Polish pass driven by screenshot review; align UI affordances with `docs/v3-teach-script.md`
      (the UI should surface what the teach script must otherwise explain).
- [ ] Accessibility: reduced motion (done), colorblind-safe token palette (shape+icon, never
      color-only), minimum text sizes; settings panel (sound, **animation intensity: Cinematic
      (default) / Snappy / Instant** — a user decision (2026-07-18, from MTG-Arena experience: repeat
      players turn animations off in favor of gameplay); the tiers ride the M1 instant-mode rail as
      one global speed knob, not three implementations; herald toggle).
- [ ] **Scripted full-UI playtest** (per the global rule: through the UI, no API shortcuts) as the
      pre-human smoke run.
- [ ] **The human playtest**: walk `human-playtest-checklist-v3.md`; set the shipped difficulty default
      (item 11); collect the T2-4 Wraith signal; record verdict + felt-experience notes in
      ROADMAP-V3 §8.

**Exit metrics:**
- A complete game (start → victory/defeat) playable via UI only, all verbs reachable, zero console
  errors — verified by the scripted run.
- Playtest survey: each checklist felt-experience item scored (target: no item below "acceptable");
  session length lands in the designed 30–45 min; "looked/felt like a board game" affirmed.
- Difficulty default recorded; open playtest-gated risks (T2-4 Wraith, difficulty-tier magnitudes)
  resolved-or-recorded with dates.
- **This closes Stage V3-6 — v3 is vetted.** The verdict decides: ship-and-stop, V3.2 polish, or a V4
  mechanics charter.

### M6 — Extract the tabletop kit (post-vet; cross-project payoff, outside the §4 gate)
- [ ] Lift into a standalone package (own repo): `GameCard`, `TokenChip`, `HandFan`, `BoardStage`,
      turn-track ribbon, `SoundManager`, animation presets, instant-mode contract, base theme, card-face
      generator.
- [ ] Iron Ashes consumes the kit; optional: DesignSync the kit to a claude.ai Design System project;
      fold learnings back into the `tabletop-ui` skill.

**Exit metrics:** kit builds + tests standalone; Iron Ashes imports it with the full suite green and
pixel-comparable screenshots; a second prototype stands up a demo scene from the kit in under a day.

## 5. Sequencing rationale

M1 before M2 is deliberate: the move-stream architecture is the piece that makes everything after it
cheap and testable, and it is pure logic — highest risk-reduction per hour, zero aesthetic judgment
required. M2–M4 are then largely *content* flowing through proven rails, iterated with the M0
screenshot loop. M5's playtest is the whole point; M6 amortizes the sprint across the other prototypes.

## 6. Changelog

- **2026-07-18** — Roadmap authored (proposed). Numbering decision recommended: **V3.1** (presentation
  sprint on the locked v3 engine); V4 reserved for a post-playtest mechanics charter. Not yet wired
  into §4/state.json (M0 task).
- **2026-07-18 (T-001)** — Status flipped PROPOSED → ACTIVE. Wired into the handoff machinery: Stage V3-6
  expanded into V3.1-M0…M5 in `ROADMAP-V3.md` §4, `state.json` `currentStage` → `V3.1-M0`, the dated
  determinism-invariant scoping decision recorded in `state.json` `invariants`, and `handoff-check.mjs`'s
  stage regex widened to parse the `V3.1-Mn` sub-box form. Engine/tunables untouched; balance LOCKED.
- **2026-07-18 (T-002)** — Added the repo's first runtime dependencies, pinned exact: `gsap@3.15.0` +
  `howler@2.2.4` (plus dev `@types/howler@2.2.13`), with the GSAP license check recorded in §3. No usage
  yet beyond a type-level import smoke test (`tests/v3/deps-smoke.test.ts`). Engine/tunables untouched.
- **2026-07-20 (T-221)** — **M2.5 authorized.** Recorded the user's dated topology exception in §3: the
  "engine untouched / balance LOCKED" guardrails gain a M2.5-scoped, user-authorized exception permitting
  the true 8-spoke board engine change (`data/board.json` 17 → 21 nodes; generalize the 4-fold
  type/setup/blight/sim/AI assumptions) — **topology only, no tunable-VALUE edits**; the balance LOCK is
  voided by the topology change itself and replaced by a fresh baseline (T-227), band misses recorded not
  tuned. Added the §M2.5 milestone block (deliverables T-222…T-227 + exit metrics) between M2 and M3, a
  `V3.1-M2.5` sub-box in `ROADMAP-V3.md` §4 (above the M2-CHECKPOINT box → it is now the first-unchecked
  stage), and repointed `state.json` `currentStage` **V3.1-M2-CHECKPOINT → V3.1-M2.5** with the LOCK-void
  scoping in `invariants` + the "post-topology balance UNMEASURED until T-227" `openRisk`. `handoff-check.mjs`'s
  stage regex widened to parse the `V3.1-M2.5` decimal-milestone form (scripts/, not engine). No engine or
  tunable code changed by this task — T-221 only authorizes and records.
- **2026-07-19 (T-215)** — Regenerated the M2 gallery after the T-208…T-214 fix round:
  `npm run shots:v3 -- --out docs/Redesign-V3.1/m2` rewrote all 7 screens (exit 0 — every machine gate
  passed on the post-fix UI: board-dominance, Cinzel/Alegreya font audit, start-control appearance:none,
  star-inlay, 6-card hand-fit, no persistent bottom bar, election unclipped), captured through the fogged
  DOM under `prefers-reduced-motion: reduce`. Screen set/order unchanged (re-skins only), README left as-is.
  Guard `tests/v3/m2-gallery.test.ts` green; verify 0 (1244 tests); handoff:check 0. **V3.1-M2-CHECKPOINT
  (T-207) stays BLOCKED(awaiting user visual review)** for the second Gate 1 review — never self-approved;
  M3 not started. Engine/tunables untouched, no `Math.random`, no new deps; shots audits unchanged.
