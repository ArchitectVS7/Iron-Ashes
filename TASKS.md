# Iron Ashes V3.1 Presentation Sprint (M0–M4) — Master Task List

Build the V3.1 presentation sprint per **`docs/ROADMAP-V3.1-UI.md`** (milestones, exit metrics, §3
guardrails) with design rationale in `docs/Redesign-V3.1/Design Advice (Fable).md`. Scope is **M0–M4
only** — M5 (human playtest) and M6 (kit extraction) are deliberately out of scope (see the deferred
list at the bottom). The engine (`src/v2/`, `src/v3/`, `src/utils/`) is untouched throughout; all work
lands in `src/ui-v3/`, `scripts/`, `tests/`, and `docs/`.

## Orchestrator protocol

1. **Check out** the first task with `status: TODO` whose `after:` tasks are all DONE. Set it `IN-PROGRESS`.
2. **Plan** — hand the coder the task block plus `docs/ROADMAP-V3.1-UI.md`. Nothing else.
3. **Code** — implement per the plan and the Standing constraints.
4. **Review** — check the diff against the task's **Accept** criteria.
5. On pass: run the gate, commit as `<ID>: <title>`, set `status: DONE`, update this file in the same commit. On fail: one fix round, then escalate, then halt.

**Gate (every task):** `npm run verify` exits 0 (typecheck + whole-repo lint + FULL v2+v3 vitest
suite). Tasks touching `src/ui-v3/` or assets additionally: `npx vite build` exits 0; and from T-003
onward, `npm run shots:v3` exits 0.

**Standing constraints** (the reviewer enforces on every task):
- **Engine untouched:** no edits under `src/v2/`, `src/v3/`, `src/utils/` (read-only imports of types
  and `observableState` are fine). No tunable value changes anywhere — balance is LOCKED.
- **Fog (D2) extends to presentation:** nothing absent from `viewerSeat`'s `observableState`
  projection may appear in the DOM, the move stream, or any texture — at any animation frame.
- **Instant mode is mandatory:** every animation path must run in a synchronous instant mode; jsdom
  tests run instant; `prefers-reduced-motion` maps to it.
- **No `Math.random` anywhere in `src/`:** presentational jitter uses a dedicated `SeededRandom`
  instance that never touches `GameState`; no timing value feeds back into commands or state.
- **Dependencies:** runtime deps limited to `gsap` + `howler`, pinned. `playwright` is allowed as a
  devDependency only. Nothing else without a dated decision in `docs/ROADMAP-V3.1-UI.md` §3.
- **Assets:** CC0/CC-BY only, committed to the repo (no CDN/network fetches at runtime), with source
  + license recorded in `docs/CREDITS.md`.
- **CHECKPOINT tasks (T-207, T-306, T-407) must never be self-approved:** the runner sets them
  `BLOCKED(awaiting user visual review)` and **halts the run**. Only the user flips them to DONE.

Statuses: `TODO` | `IN-PROGRESS` | `DONE` | `BLOCKED(reason)`

---

## M0 — Foundations & the screenshot feedback loop

### T-001 · Wire V3.1 into the handoff machinery — `status: DONE` · `coder: sonnet` · `after: —`
Per `docs/ROADMAP-V3.1-UI.md` §2: in `docs/ROADMAP-V3.md` §4, expand the unchecked Stage V3-6 box
into sub-boxes `- [ ] **V3.1-M0 …**` through `- [ ] **V3.1-M5 …**` (each one line, pointing at
`docs/ROADMAP-V3.1-UI.md`; the human playtest stays inside V3.1-M5). Repoint
`docs/handoff/state.json` `currentStage` to `V3.1-M0` with a matching `currentStageTitle`/
`nextAction`. Record the dated determinism-invariant scoping decision (engine+sim scoped; presentation
layer may use rAF/GSAP timing, still no `Math.random`) in `state.json` `invariants` and flip
`docs/ROADMAP-V3.1-UI.md` status line from PROPOSED to ACTIVE.
**Accept:** `npm run handoff:check` exits 0; ROADMAP-V3 §4 shows the six V3.1 sub-boxes with V3.1-M0
first-unchecked; `state.json` `currentStage` is `V3.1-M0`; the invariants array contains the scoped
wording with a 2026 date.

**Delivered (2026-07-18):** Stage V3-6 in `docs/ROADMAP-V3.md` §4 was expanded into the six
`V3.1-M0`…`V3.1-M5` sub-boxes (each pointing at `docs/ROADMAP-V3.1-UI.md`, human playtest kept inside
V3.1-M5), `docs/handoff/state.json` was repointed to `currentStage: "V3.1-M0"` with a matching
`currentStageTitle`/`nextAction`, the 2026-07-18 dated determinism-invariant scoping decision
(engine+sim scoped; `src/ui-v3` may use rAF/GSAP timing but still no `Math.random`, and no timing
value may feed back into game state) was recorded in `state.json` `invariants`,
`docs/ROADMAP-V3.1-UI.md`'s status line was flipped PROPOSED → ACTIVE, and
`scripts/handoff-check.mjs`'s `firstUncheckedStage` regex was widened to parse the `V3.1-Mn` sub-box
form so `npm run handoff:check` passes against the new nesting. Scope boundary: this task only wires
the handoff/roadmap machinery — no engine, tunable, or UI code changed, and the screenshot loop,
`tabletop-ui` skill, and gsap/howler dependencies are deliberately left to T-002 onward.

### T-002 · Add gsap + howler (pinned) — `status: DONE` · `coder: sonnet` · `after: T-001`
Install `gsap` and `howler` as the repo's first runtime dependencies, pinned to exact versions, plus
`@types/howler` if needed. Add a one-line dated note of the chosen versions (and the GSAP license
check) under `docs/ROADMAP-V3.1-UI.md` §3. No usage yet beyond a type-level import smoke test.
**Accept:** `package.json` lists exact (non-range) versions; `npx vite build` and `npm run verify`
exit 0; the §3 note is present and dated.

**Delivered (2026-07-18):** Added the repo's first two runtime dependencies, pinned to exact
(non-range) versions — `gsap@3.15.0` and `howler@2.2.4` — plus dev-only `@types/howler@2.2.13` (gsap
ships its own types). Recorded a dated §3 note in `docs/ROADMAP-V3.1-UI.md` with the GSAP license
check (GSAP 3 core ships under GreenSock's "No Charge" standard license — MIT-style for this sprint's
usage; anime.js remains the MIT fallback if that posture ever changes) and a matching §8 entry.
Verified resolution with a new type-level import smoke test, `tests/v3/deps-smoke.test.ts`, asserting
the `gsap`/`howler` module shapes without constructing a `Howl` (jsdom has no `AudioContext`).
`docs/handoff/state.json` `lastVerified` was refreshed to the green re-verify run (88 files / 1144
tests passing). Scope boundary: dependencies are pinned and smoke-tested only — no `src/ui-v3`
integration, animation, or sound usage; that begins at T-101 onward.

### T-003 · Headless screenshot script (`npm run shots:v3`) — `status: TODO` · `coder: opus` · `after: T-002`
Create `scripts/shots-v3.mjs` using Playwright (devDependency): launch the Vite server, drive
`/index-v3.html` through a fixed-seed scripted game, and capture PNGs of at least seven distinct
screens — start/difficulty select, board mid-game, capture election, Ransom, Wraith, Bequest, and
victory/defeat — into a directory given by `--out` (default `shots/`, gitignored). Reaching deep
states (election, Ransom, endgame) may drive the existing UI session programmatically via keyboard/
click events, but only through the UI — no direct engine calls. The script exits non-zero if any
expected screen was not captured. Wire as npm script `shots:v3`.
**Accept:** `npm run shots:v3` exits 0 and produces ≥7 named PNGs; a second run produces the same
file set; the script contains no imports from `src/v3` internals other than what the UI itself uses;
`shots/` is gitignored.

### T-004 · Baseline "before" gallery + the M2 visual rubric — `status: TODO` · `coder: sonnet` · `after: T-003`
Run `npm run shots:v3` and commit the output as `docs/Redesign-V3.1/baseline/` with a short README
naming each screen. Author `docs/Redesign-V3.1/RUBRIC.md`: the 10-item board-game-read checklist from
ROADMAP-V3.1-UI M2 (table texture visible; cards read as cards at arm's length; no default-font text;
act/turn track visible; palette cohesive; board is the largest element; resources are icon tokens;
HUD reads diegetic; motion present in transitions; screens consistent), scored /10, to be used by the
human checkpoints.
**Accept:** ≥7 baseline PNGs + README committed under `docs/Redesign-V3.1/baseline/`;
`docs/Redesign-V3.1/RUBRIC.md` present with exactly 10 checkable items.

### T-005 · M0 close — DoD — `status: TODO` · `coder: sonnet` · `after: T-001, T-002, T-003, T-004`
Perform the AGENT-PROTOCOL Definition of Done for the milestone: `npm run verify` exits 0; tick the
M0 boxes in `docs/ROADMAP-V3.1-UI.md` §4 and the `V3.1-M0` sub-box in ROADMAP-V3 §4; repoint
`state.json` `currentStage` to `V3.1-M1`; add a dated M0 entry to ROADMAP-V3 §8; commit;
`npm run handoff:check` exits 0.
**Accept:** both commands exit 0; boxes ticked; §8 entry present; `currentStage` is `V3.1-M1`.

---

## M1 — The semantic move stream (architecture before art)

### T-101 · Move types + `diffObservable` — `status: TODO` · `coder: opus` · `after: T-005`
Create `src/ui-v3/moves.ts`: a typed `Move` union of semantic presentation events (piece moved A→B,
card/token hand→zone, resource delta, flip/reveal, capture, election, act/round advance, elimination,
victory/defeat, …) and a pure `diffObservable(prevObs, nextObs): Move[]` that derives moves **only**
from two `observableState` projections for the same `viewerSeat` — leak-safe by construction. Include
an exhaustive per-command expectation table (`Record<CommandType, …>`) so an unhandled v3 command
type is a compile error, plus focused unit tests for representative transitions (move, capture,
reveal, resource change, act advance, elimination, game end).
**Accept:** `tests/` has a new `moves` test file, green; deleting a command key from the record fails
`tsc` (spot-check in review, not committed); `diffObservable` imports nothing from `src/v3` except
types/`observableState`; full suite green.

### T-102 · Determinism + fog-leak + coverage tests over full games — `status: TODO` · `coder: opus` · `after: T-101`
Drive full simmed games through `diffObservable` by reusing the existing v3 AI/E2E harness patterns
(from `tests/v3/`): at 2 fixed seeds, (a) determinism — running twice yields byte-identical
serialized move streams; (b) fog — for every `viewerSeat`, the serialized stream never contains
redacted token content or the seed value; (c) coverage — every command type observed across the games
produced a non-crashing `Move[]`. These are vitest tests, not scripts.
**Accept:** the three properties are distinct green tests over ≥2 seeds of complete games; test names
identify seed and property; full suite green.

### T-103 · Animation queue + instant mode, wired into the render path — `status: TODO` · `coder: opus` · `after: T-101`
Create `src/ui-v3/queue.ts`: sequences a `Move[]` through GSAP timelines with per-move-type presets
(placeholder tweens for now), and an **instant mode** that collapses playback to synchronous DOM
settlement. Rewire `src/ui-v3/session.ts`/`view.ts` so every state change renders via
`diffObservable` → queue (no direct re-render path remains). jsdom tests run in instant mode;
`prefers-reduced-motion` selects instant mode at runtime.
**Accept:** grep shows the old direct render call sites route through the queue; existing jsdom E2E
tests pass unmodified in intent; a unit test proves instant mode settles synchronously; reduced-motion
media query is honored (test via matchMedia stub).

### T-104 · Replay test — "snap count 0" — `status: TODO` · `coder: sonnet` · `after: T-103`
Add a vitest: for a full fixed-seed game, instant-mode playback of the accumulated move stream ends
with DOM (serialized innerHTML of the game root, normalized) identical to a cold render of the final
state. This proves no state change can bypass the queue.
**Accept:** the replay test exists and is green for ≥1 full game at 2 seeds; full suite green.

### T-105 · SoundManager skeleton — `status: TODO` · `coder: sonnet` · `after: T-103`
Create `src/ui-v3/sound.ts`: a Howler-backed `SoundManager` with `play(moveType)`, master volume and
mute, silent no-op under test/jsdom, and no audio assets yet (empty registry tolerated). The queue
calls `SoundManager.play` per move.
**Accept:** unit test covers mute/volume/no-op-in-jsdom; the queue invokes it per move (asserted via
spy); no audio files added; full suite green.

### T-106 · M1 close — DoD — `status: TODO` · `coder: sonnet` · `after: T-102, T-104, T-105`
Milestone DoD as in T-005: verify green → tick M1 boxes here and in both roadmaps, `currentStage` →
`V3.1-M2`, dated §8 entry, commit, handoff:check green.
**Accept:** both commands exit 0; boxes ticked; §8 entry present; `currentStage` is `V3.1-M2`.

---

## M2 — Theme foundation ("stop looking like a spreadsheet")

### T-201 · Board-centric layout on a textured table — `status: TODO` · `coder: opus` · `after: T-106`
Restructure the v3 layout: board center-stage on a committed CC0 table-surface texture; dissolve the
right-hand status column into diegetic HUD regions at the edges (banners/plaques/ribbons). Keep all
existing verbs reachable. Add the texture asset + credit to `docs/CREDITS.md` (create it).
**Accept:** a Playwright assertion in `shots-v3.mjs` (or a sibling check) verifies the board element's
bounding box is the largest top-level region; the table texture is a repo asset referenced from CSS;
`docs/CREDITS.md` exists with the entry; jsdom E2E + `npm run shots:v3` green.

### T-202 · Typography + palette system — `status: TODO` · `coder: sonnet` · `after: T-201`
Self-host a thematic display font and a readable body font (OFL-licensed, committed with their license
files — no CDN); define the palette as CSS custom properties; apply across all v3 screens.
**Accept:** font files + licenses committed; a Playwright/jsdom audit asserts no rendered text node
computes to the browser default font stack; palette lives in `:root` custom properties; gallery
regenerates.

### T-203 · Token/chip components + DOM audit test — `status: TODO` · `coder: opus` · `after: T-201`
Every resource/stat becomes an icon+count `TokenChip` (game-icons.net SVGs, committed + credited) or a
gauge — never a bare number in a table. Add the enforcing vitest: over a full jsdom game, every
numeric stat node in the game root carries the chip/gauge class and contains an inline `<svg>`.
**Accept:** the DOM-audit test exists and is green over a full fixed-seed game; SVGs committed with
CREDITS entries; jsdom E2E green.

### T-204 · Card frames + data-driven card-face generator — `status: TODO` · `coder: opus` · `after: T-202`
Create `src/ui-v3/card-face.ts`: piece/token data → SVG card face (frame, name, icon, stats), so art
swaps never touch layout code. Frames from a CC0 pack (credited). Cards across the UI render via the
generator only.
**Accept:** a unit test registers a synthetic new piece type and gets a valid face with zero layout-
file changes; grep shows card DOM built only via the generator; gallery shows framed cards.

### T-205 · Turn/round/Act visual track — `status: TODO` · `coder: sonnet` · `after: T-203`
Replace the textual turn/round/act status with a visual track: a marker advancing along
Whisper→March→Reckoning with round pips, each act visually distinct. Marker movement animates through
the M1 queue (act/round-advance Move types already exist).
**Accept:** the track component renders on the board screen; an act-advance transition produces the
corresponding Move and animated preset (spy test in instant mode); jsdom E2E green.

### T-206 · M2 close — bundle budget + DoD — `status: TODO` · `coder: sonnet` · `after: T-204, T-205`
Add `scripts/check-budget.mjs` (npm script `budget`): `vite build` output + committed UI assets total
≤ 3 MB, exit non-zero over budget. Then milestone DoD: verify green → tick M2 boxes, `currentStage` →
`V3.1-M2-CHECKPOINT`, dated §8 entry, commit, handoff:check green.
**Accept:** `npm run budget` exits 0; DoD commands exit 0; boxes ticked; §8 entry present.

### T-207 · CHECKPOINT — user visual review of M2 — `status: TODO` · `coder: sonnet` · `after: T-206`
Regenerate the gallery into `docs/Redesign-V3.1/m2/` (committed), then **set this task
`BLOCKED(awaiting user visual review)` and halt the run** — do not proceed into M3. The user scores
`docs/Redesign-V3.1/RUBRIC.md` (target ≥8/10) and runs the blind read test ("web app or board game?" on
a fresh agent given only the screenshots); the user flips this task to DONE, or files fix tasks.
**Accept:** (checked by the user, not the runner) m2 gallery committed; rubric scored ≥8/10; blind
read test answered "board game" for every screen; user explicitly approved.

---

## M3 — Cards & hand live

### T-301 · Fanned hand — `status: TODO` · `coder: opus` · `after: T-207`
Render the human player's hand as a CSS-3D fanned card row (arc + rotation math), with hover-raise
and selected-lift states, using the T-204 card faces. Degrades to a flat row under instant mode/jsdom.
**Accept:** hand DOM is the fan component; hover/selected states are class-driven (unit-testable);
jsdom E2E + shots green.

### T-302 · Hand-delta animations (deal/draw/play/discard) — `status: TODO` · `coder: sonnet` · `after: T-301`
Give every hand-delta Move type a real GSAP preset through the M1 queue; extend the preset registry so
a hand Move type without a preset is a compile error.
**Accept:** the preset record covers all hand-delta Move types (compile-enforced); spy tests in
instant mode confirm each fires; jsdom E2E green.

### T-303 · 3D flip reveal + frame-level fog test — `status: TODO` · `coder: opus` · `after: T-301`
Implement the card/token flip (perspective + rotateY) for every reveal Move. Face content must enter
the DOM only at the flip midpoint — never before. Add the enforcing test: in instant mode, assertion
ordering (pre-flip DOM snapshot vs post-midpoint) proves the pre-flip DOM contains no face data for a
revealed hidden token.
**Accept:** the frame-level fog test is green; all reveal Move types route through the flip preset;
jsdom E2E green.

### T-304 · Affordances — legal glow, illegal shake — `status: TODO` · `coder: sonnet` · `after: T-302`
Legal actions/targets glow on hover/selection; illegal interactions get a shake tween (no alert/text
errors for illegality). Driven from the same legality data the UI already uses — no new engine calls.
**Accept:** glow/shake are class+preset driven with spy tests; no `window.alert` remains for
illegality paths; jsdom E2E green.

### T-305 · M3 close — DoD — `status: TODO` · `coder: sonnet` · `after: T-303, T-304`
Milestone DoD: verify green → tick M3 boxes, `currentStage` → `V3.1-M3-CHECKPOINT`, dated §8 entry,
commit, handoff:check green.
**Accept:** both commands exit 0; boxes ticked; §8 entry present.

### T-306 · CHECKPOINT — user visual review of M3 — `status: TODO` · `coder: sonnet` · `after: T-305`
Regenerate the gallery into `docs/Redesign-V3.1/m3/` (committed), then **set this task
`BLOCKED(awaiting user visual review)` and halt the run**. User reviews hand feel (fan, flips,
affordances) against the rubric and approves or files fix tasks.
**Accept:** (user-checked) m3 gallery committed; user explicitly approved.

---

## M4 — Board life & sound

### T-401 · Path-following piece movement — `status: TODO` · `coder: opus` · `after: T-306`
Piece-movement Moves animate along the board's actual node paths (GSAP motion along computed
waypoints), with an arrival effect — no teleporting. Instant mode settles positions synchronously.
**Accept:** movement preset consumes a waypoint list derived from board topology (unit-tested);
replay/"snap count 0" test still green; jsdom E2E green.

### T-402a · Scene moments — capture, election, Ransom, discovery — `status: TODO` · `coder: opus` · `after: T-401`
Give the capture→election sequence, Ransom, and discovery flips distinct staged presentations
(sequenced multi-move timelines): the roadmap's "capture-as-scene". Fog rules apply to discovery
(reuse T-303's flip).
**Accept:** each named moment has a dedicated sequenced preset (spy tests confirm ordering in instant
mode); jsdom E2E covering these verbs green.

### T-402b · Scene moments — Shadowking telegraphs, heart, endgame — `status: TODO` · `coder: opus` · `after: T-401`
Distinct visual telegraphs for WHISPER / MARCH / RECKONING (three visibly different treatments),
ASSAULT_HEART staging, elimination presentation, and victory/defeat end sequences.
**Accept:** three telegraph presets are distinct (distinct class/asset assertions); elimination and
both end sequences have presets with spy tests; jsdom E2E green.

### T-403 · Full SFX pass — `status: TODO` · `coder: sonnet` · `after: T-402a, T-402b`
Populate the SoundManager registry: every Move type gets a committed CC0/CC-BY sound (Kenney/
freesound, credited), with the compile-enforced `Record<MoveType, {preset, sound}>` fully populated.
Volume + mute already exist (T-105); add a small settings surface for them if none exists.
**Accept:** the record has no missing keys (compile-enforced); audio assets committed with CREDITS
entries; `npm run budget` still exits 0; suite green.

### T-404 · Mechanic visibility map — `status: TODO` · `coder: sonnet` · `after: T-402a, T-402b`
Append to `docs/ROADMAP-V3.1-UI.md` a table mapping **every** item of
`docs/human-playtest-checklist-v3.md` to its on-screen representation (component/animation/sound).
Any item without a real representation becomes a named gap task proposal in the same table — no
silent rows.
**Accept:** every checklist item appears exactly once in the table (reviewer cross-checks the two
files); zero empty representation cells.

### T-405 · Perf + reduced-motion verification run — `status: TODO` · `coder: opus` · `after: T-403`
Create `scripts/perf-v3.mjs` (npm script `perf:v3`): Playwright plays a full fixed-seed AI-vs-AI game
through the animated UI with animations ON, collecting a trace; exit non-zero on any main-thread
stall >100 ms or sustained <55 fps during animation bursts. Second pass runs the same game with
`prefers-reduced-motion` emulated and asserts instant-mode completion (fast wall-clock, sounds still
firing via spy/log).
**Accept:** `npm run perf:v3` exits 0 on both passes; thresholds are in the script, not hand-waved;
failures print the offending trace window.

### T-406 · M4 close — DoD — `status: TODO` · `coder: sonnet` · `after: T-404, T-405`
Milestone DoD: verify green → tick M4 boxes, `currentStage` → `V3.1-M4-CHECKPOINT`, dated §8 entry,
commit, handoff:check green.
**Accept:** both commands exit 0; boxes ticked; §8 entry present.

### T-407 · CHECKPOINT — final pre-playtest review — `status: TODO` · `coder: sonnet` · `after: T-406`
Regenerate the gallery into `docs/Redesign-V3.1/m4/` (committed), then **set this task
`BLOCKED(awaiting user visual review)` and halt the run**. This is the gate into M5: the user reviews
the full animated experience (rubric + blind read test + a played game), then either approves —
opening the M5 human playtest, which is run by the user, not the orchestrator — or files fix tasks.
**Accept:** (user-checked) m4 gallery committed; user explicitly approved the sprint as
playtest-ready.

---

## Deliberately deferred (do not re-scope in)

- **M5 — human playtest** (`docs/ROADMAP-V3.1-UI.md` M5): run by the user after T-407.
- **M6 — tabletop kit extraction**: cross-project work, post-vet.
- **`tabletop-ui` house-style skill** (`~/.claude/skills/`): a user-machine artifact, authored
  interactively — not repo work the runner can gate or commit.
- **T-004 BP-exposure fresh-seed edge** (`state.json` openRisks): user call, unrelated to this sprint.
