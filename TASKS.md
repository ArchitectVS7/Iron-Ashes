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

### T-003 · Headless screenshot script (`npm run shots:v3`) — `status: DONE` · `coder: opus` · `after: T-002`
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

**Delivered (2026-07-18):** Added `scripts/shots-v3.mjs`, wired as `npm run shots:v3`, and pinned
`playwright@1.61.1` as a devDependency. The script launches the Vite dev server, drives
`/index-v3.html` purely through UI events (keyboard/click on the rendered session — no `src/v3`
engine imports beyond what the UI itself uses), and captures the required ≥7 named PNGs (start/
difficulty select, mid-game board, capture election, Ransom, Wraith, Bequest, victory/defeat) into
`--out` (default `shots/`, now gitignored via `.gitignore`). Exits non-zero if any expected screen
isn't reached. Scope boundary: this task only produces the capture tool itself — no baseline gallery,
rubric, or visual-quality judgment is in scope here; that is T-004's job.

### T-004 · Baseline "before" gallery + the M2 visual rubric — `status: DONE` · `coder: sonnet` · `after: T-003`
Run `npm run shots:v3` and commit the output as `docs/Redesign-V3.1/baseline/` with a short README
naming each screen. Author `docs/Redesign-V3.1/RUBRIC.md`: the 10-item board-game-read checklist from
ROADMAP-V3.1-UI M2 (table texture visible; cards read as cards at arm's length; no default-font text;
act/turn track visible; palette cohesive; board is the largest element; resources are icon tokens;
HUD reads diegetic; motion present in transitions; screens consistent), scored /10, to be used by the
human checkpoints.
**Accept:** ≥7 baseline PNGs + README committed under `docs/Redesign-V3.1/baseline/`;
`docs/Redesign-V3.1/RUBRIC.md` present with exactly 10 checkable items.

**Delivered (2026-07-18):** Ran `npm run shots:v3` to capture the seven M1 "before" screens
(start/select, mid-game board, capture election, ransom, wraith afterlife, death bequest, endgame)
as self-generated, fog-safe DOM screenshots, committed under `docs/Redesign-V3.1/baseline/` with a
README naming each PNG and the regeneration command. Authored `docs/Redesign-V3.1/RUBRIC.md` — the
fixed 10-item board-game-read checklist (table texture, cards-as-cards, no default-font text,
act/turn track, palette cohesion, board dominance, icon-token resources, diegetic HUD, transition
motion, screen consistency) scored out of 10, with the M2 exit bar (≥8/10) and re-score cadence
(T-207, T-306, T-407, M2+ gates) documented. Added `tests/v3/baseline-gallery.test.ts` as a
machine-checked guard on both acceptance criteria (≥7 PNGs, non-empty README, exactly 10 rubric
checkboxes) so the deliverable stays enforced by `npm test` going forward. Scope boundary: this
task captures and scores the *current* baseline only — it does not touch UI code, does not fill in
the rubric's checkboxes (that's the job of the M2+ human checkpoints re-scoring against this
baseline), and does not regenerate the gallery for milestones beyond M1.

### T-005 · M0 close — DoD — `status: DONE` · `coder: sonnet` · `after: T-001, T-002, T-003, T-004`
Perform the AGENT-PROTOCOL Definition of Done for the milestone: `npm run verify` exits 0; tick the
M0 boxes in `docs/ROADMAP-V3.1-UI.md` §4 and the `V3.1-M0` sub-box in ROADMAP-V3 §4; repoint
`state.json` `currentStage` to `V3.1-M1`; add a dated M0 entry to ROADMAP-V3 §8; commit;
`npm run handoff:check` exits 0.
**Accept:** both commands exit 0; boxes ticked; §8 entry present; `currentStage` is `V3.1-M1`.

**Delivered (2026-07-18):** Ran the milestone Definition of Done for M0. `npm run verify` exits 0
(89 files / 1147 passed / 0 failed; typecheck + whole-repo lint green). Ticked all four M0 boxes in
`docs/ROADMAP-V3.1-UI.md` §4 and the `V3.1-M0` sub-box in `docs/ROADMAP-V3.md` §4; repointed
`docs/handoff/state.json` `currentStage` from `V3.1-M0` to `V3.1-M1` (with the M1 stage title,
`nextAction`, and status refreshed for the next stage); added the dated 2026-07-18 `V3.1-M0 CLOSED
(T-005)` entry to ROADMAP-V3 §8. On commit, `npm run handoff:check` exits 0 (working tree clean,
sourceHash unchanged — this DoD touched docs only, not `src/`/`tests/` — and `currentStage`
`V3.1-M1` matches the first unchecked ROADMAP §4 box). Scope boundary: documentation/state
bookkeeping only; no engine, UI, or test code was touched, so balance stays LOCKED.

---

## M1 — The semantic move stream (architecture before art)

### T-101 · Move types + `diffObservable` — `status: DONE` · `coder: opus` · `after: T-005`

**Delivered (2026-07-18):** Added `src/ui-v3/moves.ts` — a typed `Move` union covering piece
moves, hand/zone transfers, resource deltas, flip/reveal, capture, election, act/round advance,
elimination, and victory/defeat — plus a pure `diffObservable(prevObs, nextObs): Move[]` that
derives the move stream solely from two `ObservableState` projections for the same `viewerSeat`,
importing only types (`ObservableState`, `Command`, etc.) from `src/v3` so it is leak-safe by
construction. An exhaustive `MOVE_EXPECTATIONS: Record<CommandType, readonly MoveType[]>` table
makes an unhandled v3 command a compile error. `tests/v3/moves.test.ts` adds focused unit tests
for representative transitions (move, capture, reveal, resource change, act advance, elimination,
game end); full suite is green (90 files / 1162 tests). Scope boundary: full-game determinism/
fog-leak/coverage sweeps over simmed games are deliberately out of scope here and deferred to
T-102, per the task split in the roadmap.
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

### T-102 · Determinism + fog-leak + coverage tests over full games — `status: DONE` · `coder: opus` · `after: T-101`
Drive full simmed games through `diffObservable` by reusing the existing v3 AI/E2E harness patterns
(from `tests/v3/`): at 2 fixed seeds, (a) determinism — running twice yields byte-identical
serialized move streams; (b) fog — for every `viewerSeat`, the serialized stream never contains
redacted token content or the seed value; (c) coverage — every command type observed across the games
produced a non-crashing `Move[]`. These are vitest tests, not scripts.
**Accept:** the three properties are distinct green tests over ≥2 seeds of complete games; test names
identify seed and property; full suite green.

**Delivered (2026-07-18):** Added `tests/v3/move-stream.test.ts`, a full-game complement to T-101's
unit tests — it spies on the single `applyCommand` reducer entry point to capture every command
boundary of complete AI-vs-AI headless games (competitive and Blood-Pact modes) at two fixed seeds
(314159, 161803), then feeds each before/after `observableState` pair through `diffObservable` for
every `viewerSeat`. Three green vitest properties per seed: determinism (two runs serialize to
byte-identical move streams), fog (the serialized stream never contains the redaction sentinel or the
real seed, for any seat), and coverage (every AI-reachable command type is observed and yields only
moves within its `MOVE_EXPECTATIONS` superset, non-crashing). Scope boundary: the 3 interactive-only
commands (`LAST_STAND_COMMIT`, `SET_BEQUEST`, `SET_WRAITH_INPUT`) are never issued by the sim/AI and
are asserted absent rather than covered here — they remain the human-playtest checklist's
responsibility, not this automated suite's.

### T-103 · Animation queue + instant mode, wired into the render path — `status: DONE` · `coder: opus` · `after: T-101`
Create `src/ui-v3/queue.ts`: sequences a `Move[]` through GSAP timelines with per-move-type presets
(placeholder tweens for now), and an **instant mode** that collapses playback to synchronous DOM
settlement. Rewire `src/ui-v3/session.ts`/`view.ts` so every state change renders via
`diffObservable` → queue (no direct re-render path remains). jsdom tests run in instant mode;
`prefers-reduced-motion` selects instant mode at runtime.
**Accept:** grep shows the old direct render call sites route through the queue; existing jsdom E2E
tests pass unmodified in intent; a unit test proves instant mode settles synchronously; reduced-motion
media query is honored (test via matchMedia stub).

**Delivered (2026-07-18):** Added `src/ui-v3/queue.ts` — an `AnimationQueue` class that sequences a
`Move[]` through GSAP timelines using a per-`MoveType` preset-duration table (a `Record<MoveType,
number>` whose exhaustiveness is a compile-time `tsc` gate), then commits the DOM through a
view-owned `settle` callback; instant mode (jsdom, no `window.matchMedia`, or a matching
`prefers-reduced-motion: reduce`) settles synchronously with no timeline built, while animated mode
serializes overlapping batches through a FIFO. `src/ui-v3/view.ts` was rewired so `mountView`'s
`session.onChange` now diffs consecutive `observable()` snapshots via `diffObservable` and enqueues
the result — `renderApp` is invoked only inside `settle`, called only by the queue; there is no
direct re-render path left. `scripts/shots-v3.mjs` was updated to launch its Playwright context with
`reducedMotion: 'reduce'` so the headless screenshot driver resolves the same instant-mode path and
stays in lockstep with real game state. Added `tests/v3/queue.test.ts` covering synchronous instant
settlement, reduced-motion mode selection via a `matchMedia` stub, and FIFO ordering of queued
batches. Scope boundary: presets are placeholder fixed-duration holds on a dummy tween proxy, not
real per-element card/piece/token animations — that work is explicitly left to later M-tasks; T-104
(replay-test proof that no state change bypasses the queue) and T-105 (SoundManager) remain separate,
not-yet-started follow-ons.

### T-104 · Replay test — "snap count 0" — `status: DONE` · `coder: sonnet` · `after: T-103`
Add a vitest: for a full fixed-seed game, instant-mode playback of the accumulated move stream ends
with DOM (serialized innerHTML of the game root, normalized) identical to a cold render of the final
state. This proves no state change can bypass the queue.
**Accept:** the replay test exists and is green for ≥1 full game at 2 seeds; full suite green.

**Delivered (2026-07-18):** Added `tests/v3/replay-snap-count.test.ts`, a jsdom vitest that drives two
full fixed-seed competitive games (seeds 42 and 99) entirely by dispatching real clicks on rendered
`[data-action]`/`[data-node]` controls through `mountView`/`GameSession`, so every state change routes
`onChange → queue → settle()`. After each game reaches a genuine end state (`isOver` + non-null
`gameEndReason`), the incrementally-built playback `innerHTML` is asserted byte-identical (post
whitespace-normalization) to a cold, from-scratch `mountView` render of the same final state — proving
no mutation bypasses the animation queue. Scope boundary: only the `competitive` mode is exercised
(2 seeds, per the acceptance bar); `blood_pact` replay parity is not separately asserted here and
remains open for a future pass if desired. Full suite green (93 files / 1180 passed) per
`docs/handoff/state.json`.

### T-105 · SoundManager skeleton — `status: DONE` · `coder: sonnet` · `after: T-103`
Create `src/ui-v3/sound.ts`: a Howler-backed `SoundManager` with `play(moveType)`, master volume and
mute, silent no-op under test/jsdom, and no audio assets yet (empty registry tolerated). The queue
calls `SoundManager.play` per move.
**Accept:** unit test covers mute/volume/no-op-in-jsdom; the queue invokes it per move (asserted via
spy); no audio files added; full suite green.

**Delivered (2026-07-18):** Shipped `src/ui-v3/sound.ts` — a `SoundManager` class with `play(moveType)`,
`setVolume`/`getVolume`, `setMuted`/`isMuted`, and a Howler-backed per-`MoveType` clip registry that
ships empty (every lookup is a tolerated no-op). Silence is auto-derived from Web Audio capability
(`hasWebAudio()` probe: absent under jsdom, present in a real browser), with an `{ enabled }` override
for testability. Wired into `AnimationQueue` (`src/ui-v3/queue.ts`), which now takes an optional third
`sound` constructor param and fires `play(move.type)` once per move at enqueue time in both instant
and animated modes; `mountView` (`src/ui-v3/view.ts`) constructs a default `SoundManager` and passes
it through. `tests/v3/sound.test.ts` covers mute/volume/no-op-in-jsdom and the queue-invokes-it-per-move
contract via spy. Deliberate scope boundary: no audio assets or a registry-population path shipped in
this task — real clips and their `docs/CREDITS.md` entries are explicitly deferred to a later M-task,
and clips are not yet tween-synced to the animation timeline (fire-and-forget cue only). Full suite
green: 94 files / 1188 passed.

### T-106 · M1 close — DoD — `status: DONE` · `coder: sonnet` · `after: T-102, T-104, T-105`
Milestone DoD as in T-005: verify green → tick M1 boxes here and in both roadmaps, `currentStage` →
`V3.1-M2`, dated §8 entry, commit, handoff:check green.
**Accept:** both commands exit 0; boxes ticked; §8 entry present; `currentStage` is `V3.1-M2`.

**Delivered (2026-07-18):** M1 (the semantic move stream — transition layer) closed. `npm run verify` exits
0 (94 files / 1188 passed / 0 failed; typecheck + repo-wide lint + full v2+v3 vitest suite). The three M1
boxes in `docs/ROADMAP-V3.1-UI.md` §M1 are ticked with their delivering-task dates (T-101 `moves.ts`
`diffObservable`, T-103 GSAP animation queue + instant mode, T-105 Howler `SoundManager` skeleton), and the
`V3.1-M1` sub-box under `docs/ROADMAP-V3.md` §4 is ticked. `docs/handoff/state.json` repointed
`currentStage` **V3.1-M1 → V3.1-M2** (title/nextAction/specRefs re-aimed at the M2 theme-foundation stage
and its Gate 0.5 aesthetic decisions). A dated 2026-07-18 §8 changelog entry ("V3.1-M1 CLOSED (T-106)")
records the full M1 deliverable set (T-101…T-105) and the verify/handoff results. Docs/state only — no
`src/v2`, `src/v3`, `src/utils`, `package.json`, or asset changes, so engine-untouched / balance-LOCKED /
deps / assets / Math.random / fog-D2 standing constraints are trivially satisfied. Unrelated `graphify-out/`
working-tree drift (from a prior graphify run) settled so the milestone-close diff is docs-only and
`npm run handoff:check` exits 0 on the committed tree.
**Fix round (2026-07-18):** the review-flagged `handoff:check` exit 1 is process-ordering, not content —
its assertion 3 (`git status --porcelain` empty) can only pass AFTER the protocol step-5 commit, which
belongs to the runner, not the coder. Verified by committing this exact 4-file diff in a throwaway clone:
all six assertions pass there (exit 0). On the live tree pre-commit, 5/6 pass; only the clean-tree
assertion awaits the `T-106: M1 close — DoD` commit.

---

## M2 — Theme foundation ("stop looking like a spreadsheet")

### T-201 · Board-centric layout on a textured table — `status: DONE` · `coder: opus` · `after: T-106`
Restructure the v3 layout: board center-stage on a committed CC0 table-surface texture; dissolve the
right-hand status column into diegetic HUD regions at the edges (banners/plaques/ribbons). Keep all
existing verbs reachable. Add the texture asset + credit to `docs/CREDITS.md` (create it).
**Gate 0.5 (user, 2026-07-18): FULL dissolution** — no persistent status panel survives; exposure,
warlord standings, court, and turn prompt become edge plaques/banners/tokens, with **zero information
loss** (hover/expand plaques acceptable). Player identity uses the four muted **house heraldry**
colors + sigils (Emberfall ember-orange, Greyspear steel, Ravenholt viridian, Duskmere dusk-violet);
board nodes are **illustrated map locations** (castles/forges/hamlets/dark throne; claims = planted
house banners) per the roadmap's M2 Gate 0.5 block.
**Board layout (user decision 2026-07-18): render the existing 17-node graph as an 8-ray chaos-magic
star.** The topology already supports it — spokes run keystone→approach→forge on the DIAGONALS, then
quarter-twist into CARDINAL keeps, holdings on the outer diagonals — so all 17 nodes sit on 8 rays.
Node positions come from the real `connections` in `data/board.json`. The 8 full-length star rays are
**decorative table inlay only**; the true edges (4 keystone spokes, the ring links, the forge→keep
twist) are drawn distinctly on top — never render a playable-looking line where no edge exists.
**Accept:** a Playwright assertion in `shots-v3.mjs` (or a sibling check) verifies the board element's
bounding box is the largest top-level region; the table texture is a repo asset referenced from CSS;
`docs/CREDITS.md` exists with the entry; jsdom E2E + `npm run shots:v3` green.
**Delivered (2026-07-18):** the 17 real board nodes (from `data/board.json`) now render on an 8-ray
chaos-magic star (`src/ui-v3/board-view.ts`), diagonals carrying keystone→approach→forge→holding and
cardinals carrying the keeps, with the 8 full-length rays drawn as non-interactive decorative table
inlay and the true playable edges drawn distinctly on top from each node's real `connections` — no
decorative ray is ever mistaken for an edge. Player identity moved to four muted house-heraldry
colors + sigils (Emberfall/Greyspear/Ravenholt/Duskmere) replacing the old saturated web-primary
`PLAYER_COLORS`, and owned nodes render as illustrated map locations with a planted house banner. The
old `.layout` (board-pane + right-hand `.side-pane`) is gone from `view.ts`: the board is now
centre-stage on a self-authored, CC0-licensed procedural wood-grain table texture
(`src/ui-v3/assets/table-texture.svg`, credited in the new `docs/CREDITS.md`), with every datum the
old side-pane held redistributed into diegetic edge HUD regions — a top turn ribbon/header, a left
"Your Realm" HUD (court/hand/holdings/oaths/ledger/wraiths/suspicion/audits), four right-hand house
plaques (heraldry crest + territory/banners/hand/court chips + tags + exposure band, replacing the
old standings table and persistent exposure meter with zero information loss), and a bottom action
tray — with `scripts/shots-v3.mjs` now asserting via Playwright that the board region is the largest
top-level child of the table stage. **Scope boundary:** self-hosting the display/body fonts (still
CDN Cinzel/Inter, flagged in `docs/CREDITS.md`) and turning the new plaque/chip stats into full
`TokenChip`/gauge components are deliberately left to T-202/T-203 per the roadmap's task split — this
task closes the board-centric layout and diegetic-HUD dissolution only.

### T-202 · Typography + palette system — `status: DONE` · `coder: sonnet` · `after: T-201`
Self-host a thematic display font and a readable body font (OFL-licensed, committed with their license
files — no CDN); define the palette as CSS custom properties; apply across all v3 screens.
**Accept:** font files + licenses committed; a Playwright/jsdom audit asserts no rendered text node
computes to the browser default font stack; palette lives in `:root` custom properties; gallery
regenerates.
**Delivered (2026-07-18):** Cinzel (400/700) and Inter (400/500/600) are self-hosted as committed
latin-subset woff2 under `src/ui-v3/assets/fonts/`, declared via `@font-face` in `src/ui-v3/ui-v3.css`
with zero runtime CDN/network fetch (`index-v3.html` no longer references Google Fonts), each family's
SIL OFL notice committed alongside its woff2 and documented in `docs/CREDITS.md`. Typography and the
four house-heraldry colors (mirroring `board-view.ts` `PLAYER_COLORS`) now live as `:root` custom
properties (`--font-display`, `--font-body`, `--house-emberfall/greyspear/ravenholt/duskmere`); every
prior hardcoded `font-family: 'Cinzel'|'Inter'` call site routes through the properties instead, and
form controls (`input, select, textarea, optgroup`) explicitly inherit so they can't fall back to the
UA default stack. Enforced by a new `tests/v3/typography.test.ts` (CDN-free HTML, `@font-face`
self-hosting, `:root` custom properties, no bare family literals outside `@font-face`/`:root`, all five
woff2 + two license files committed and non-empty with valid `wOF2` magic bytes) plus the Playwright
computed-font audit added to `scripts/shots-v3.mjs`. **Scope boundary:** turning the plaque/chip stats
into full `TokenChip`/gauge components (icon+count treatment) is left to T-203; card-face rendering is
left to T-204 — this task closes font self-hosting + palette tokenization only, no new visual
components.

### T-203 · Token/chip components + DOM audit test — `status: DONE` · `coder: opus` · `after: T-201`
Every resource/stat becomes an icon+count `TokenChip` (game-icons.net SVGs, committed + credited) or a
gauge — never a bare number in a table. Add the enforcing vitest: over a full jsdom game, every
numeric stat node in the game root carries the chip/gauge class and contains an inline `<svg>`.
**Accept:** the DOM-audit test exists and is green over a full fixed-seed game; SVGs committed with
CREDITS entries; jsdom E2E green.
**Delivered (2026-07-18):** New `src/ui-v3/token-chip.ts` renders `tokenChip()`/`gauge()` components —
each an inline committed `<svg>` (game-icons.net, `?raw` import, no CDN) plus a `data-stat`-tagged
numeric count/fill, styled via new `.token-chip`/`.gauge`/`.gauge-track`/`.gauge-fill` rules in
`ui-v3.css`. `view.ts`'s header (heart HP, dark patience, strike pool), house plaques (land/banners/
hand/court, Ledger grudge), Ledger block, and action panel (actions/banners) all now route through
these components instead of bare emoji+number strings. Nine icon SVGs committed under
`src/ui-v3/assets/icons/` with full author/license entries in `docs/CREDITS.md` (CC-BY 3.0,
game-icons.net, background stripped + recolored to `currentColor`). The enforcing
`tests/v3/token-chip-audit.test.ts` drives a full fixed-seed game through the real DOM click-harness
and asserts, at every settled frame, that every `[data-stat]` node is a `.token-chip`/`.gauge`,
contains an inline `<svg>`, and carries a `.tc-count` — plus that none of the old bare resource glyphs
(⚑ 🏰 🂠 ☠) survive loose in a stat region. **Scope boundary (recorded in the test file):** player/
round/act/phase track text, card face values, oath countdowns, suspicion glyphs, and history dates are
deliberately NOT chip-ified (T-205/T-204 territory or non-resource text); the board SVG's own internal
heart-HP/blight-pip drawing is a diegetic illustration, not an HTML stat node, and stays out of this
audit.

### T-204 · Card frames + data-driven card-face generator — `status: DONE` · `coder: opus` · `after: T-202`
Create `src/ui-v3/card-face.ts`: piece/token data → SVG card face (frame, name, icon, stats), so art
swaps never touch layout code. Frames from a CC0 pack (credited). Cards across the UI render via the
generator only. **Gate 0.5 (user, 2026-07-18): faces are RICH TCG-style** — name + art area + rules
text (art areas generated-ornamental until bespoke art exists), with the value + suit icon
**corner-indexed** so a fanned card stays readable without raising it.
**Accept:** a unit test registers a synthetic new piece type and gets a valid face with zero layout-
file changes; grep shows card DOM built only via the generator; gallery shows framed cards.

**Delivered (2026-07-19):** Added the self-authored CC0 `src/ui-v3/assets/frames/card-frame.svg`
(iron rim + parchment face, gilt filigree, name banner / art window / rules plate, credited in
`docs/CREDITS.md`) and `src/ui-v3/card-face.ts`, a data-driven generator (`powerCardFace`) that turns
piece/token data into a corner-indexed, TCG-style SVG face — name, generated-ornamental art window, and
rules text, entirely from data with zero layout-file edits needed for new piece types (covered by
`tests/v3/card-face.test.ts`, a synthetic-piece registration test). `src/ui-v3/view.ts` now renders the
hand and Last Stand card picker exclusively through this generator (no bespoke card markup left in
either path), with `ui-v3.css` adding the fanned-hand layout (overlap, arc, hover-raise) and the
selected-state styling for the Last Stand toggle buttons. **Scope boundary:** the art window is
intentionally generated-ornamental filler, not bespoke per-card art — real art assets are out of scope
for this task and were not promised by Gate 0.5; the turn/round/Act visual track (T-205) and bundle
budget close (T-206) are separate, untouched tasks.

### T-205 · Turn/round/Act visual track — `status: DONE` · `coder: sonnet` · `after: T-203`
Replace the textual turn/round/act status with a visual track: a marker advancing along
Whisper→March→Reckoning with round pips, each act visually distinct. Marker movement animates through
the M1 queue (act/round-advance Move types already exist).
**Accept:** the track component renders on the board screen; an act-advance transition produces the
corresponding Move and animated preset (spy test in instant mode); jsdom E2E green.

**Delivered (2026-07-19):** Added `src/ui-v3/turn-track.ts` (`turnTrack`), a pure, deterministic
markup component reading only the public `round`/`act`/`phase` fields of `observableState` — no new
data or fog surface. It replaces the old textual `.clock` line in `renderHeader` (`view.ts`) with a
diegetic escalation rail: three act stations (Whisper 🕯 → March ⚔ → Reckoning 🔥, each visually
distinct via its own class + glyph) joined by a rail, with a marker nested in the current-act station
so a full re-render always repositions it correctly; a round-pip row (`R<round>/<cap>`) and a
phase-dot row (THREAT/PLEDGE/ACTION/DAWN) sit below. The whole track carries `data-round`/`data-act`/
`data-phase` as the machine-readable contract, updated in `scripts/shots-v3.mjs`'s `parseRound` and
`tests/v3/ui-parity.test.ts` (both previously scraped `.clock` text). `queue.ts` gained a small
read-only `presetSeconds(type)` accessor so `tests/v3/turn-track.test.ts` can assert an animated
preset exists for `act_advance` without reaching into the module-private table — the M1 queue itself
was not changed, since `act_advance`/`round_advance`/`phase_advance` Moves and their presets already
existed. Styling lives in `ui-v3.css` (per-act color coding, pip/dot states, marker). The heart-HP
gauge (previously inline on the `.clock` line) now rides beside the track as its own `.header-heart`
span, preserving the existing `.gauge`/`data-stat="heartHp"` markup so the token-chip audit still
passes. **Scope boundary:** the track is presentation-only re-rendered wholesale on `settle` (no
independent DOM-tween animation of the marker beyond the existing queue preset holds) — a bespoke
marker-glide animation distinct from the M1 queue's hold-based presets was not promised by the accept
criteria and is out of scope for this task.

### T-206 · M2 close — bundle budget + DoD — `status: DONE` · `coder: sonnet` · `after: T-204, T-205`
Add `scripts/check-budget.mjs` (npm script `budget`): `vite build` output + committed UI assets total
≤ 3 MB, exit non-zero over budget. Then milestone DoD: verify green → tick M2 boxes, `currentStage` →
`V3.1-M2-CHECKPOINT`, dated §8 entry, commit, handoff:check green.
**Accept:** `npm run budget` exits 0; DoD commands exit 0; boxes ticked; §8 entry present.

**Delivered (2026-07-19):** Added `scripts/check-budget.mjs` (`npm run budget`), which runs a clean
`vite build` itself (so `emptyOutDir` wipes any stale `tsc` output before measuring — `dist/` is shared
between the two and measuring after `npm run build` would falsely fail on ~3 MB of compiled-JS noise),
sums every file under the resulting `dist/` (vite bundle + copied fonts + inlined `?raw` SVG icons/
frames, including the v2 bundle since the shared vite config has two rollup inputs), and exits non-zero
over a 3 MiB budget; current shipped payload is ~444 KB (~2.6 MB of headroom). Closed the M2 milestone
DoD: all five M2 deliverable boxes (T-201…T-205) ticked in `docs/ROADMAP-V3.1-UI.md` §M2, a dated §8
entry added to `docs/ROADMAP-V3.md`, `docs/handoff/state.json` `currentStage` repointed
`V3.1-M2` → `V3.1-M2-CHECKPOINT`, and a new `V3.1-M2-CHECKPOINT` box inserted into ROADMAP-V3 §4 as the
next first-unchecked stage. `scripts/handoff-check.mjs`'s `firstUncheckedStage` regex was widened to
parse the optional `-CHECKPOINT` suffix so it correctly resolves to that box. `npm run budget`,
`npm run verify` (98 files / 1219 passed / 0 failed), and `npm run handoff:check` all exit 0.
**Scope boundary:** engine/tunables untouched (balance stays LOCKED); no new runtime deps (reuses the
existing `vite` devDep); T-207 (the user visual-review checkpoint) is a separate, still-open task — this
task only closes the M2 build/DoD gate, not the milestone's human sign-off.

### T-208 · Board to spec — illustrated locations, star inlay, planted banners — `status: DONE` · `coder: opus` · `after: T-206`
Gate 1 fix (user, 2026-07-19): the board fell short of the M2 Gate 0.5 block in three ways. (1) Nodes
are circles-containing-glyphs — replace with true illustrated SVG map locations sitting ON the table
(keeps as castles, forges with ember glow, holdings as hamlets, the Keystone as a dark throne;
tier-distinct silhouettes, **no enclosing circle**). (2) The decorative 8-ray chaos-star inlay is not
visible — carve it into the wood beneath the graph (darker/burned wood, clearly present in a
screenshot), with the TRUE edges still drawn distinctly on top (never a playable-looking ray where no
edge exists — the Keystone has exactly 4 edges). (3) Claims render as colored rings — replace with a
planted house banner (heraldry color + sigil) on the node.
**Accept:** nodes render as circle-free illustrated locations (DOM/SVG assertion); the star inlay is
asserted present in the shots run; claimed nodes show banner elements carrying the owner's sigil
class; jsdom E2E + `npm run shots:v3` + verify green.
**Done (2026-07-19, opus):** T-201 already shipped `locationSvg`/`claimBanner`/the inlay markup;
this fix removed the leftovers that dominated them. board-view.ts: deleted the enclosing `circle.node`
disc + `.owner-tint`/`.owner-ring` (the illustration IS the node body now, scaled to full `r`);
re-homed the disc's ashed/heart/keystone states onto the `.loc` group via classes (zero info loss);
added a burned `.star-carve` 8-point-star polygon emitted FIRST (under rays/edges/nodes); added a
`sigil-<name>` class to the banner sigil. ui-v3.css: retired `.node*`/`.owner-*` rules, raised
`.star-inlay` contrast, added `.star-carve` + `.loc.ashed`/`.loc.heart`/keystone-accent styles.
New `tests/v3/board-view.test.ts` (8 tests): circle-free assertion, all-5-tier silhouettes,
carve+inlay present, 28 edges vs 8 decorative rays, keystone=exactly-4-edges, banner-carries-sigil-
class + no ring, and a fog (D2) back-sigil-only guard. `scripts/shots-v3.mjs` gained `auditStarInlay`
run at round≥2 with a final hard assertion. verify green (1229 tests); `npm run shots:v3` captures 7/7
and passes the inlay assertion. T-207 stays BLOCKED(awaiting user visual review) — not self-approved.

**Delivered (2026-07-19):** Rebuilt the board's three Gate 1 misses on top of the T-201 substrate:
`board-view.ts` dropped the enclosing `circle.node` disc and `.owner-tint`/`.owner-ring` markup so the
illustrated `locationSvg` silhouette IS the node body (ashed/heart/keystone states re-homed onto the
`.loc` group, zero info loss), added a burned `.star-carve` 8-point-star polygon rendered first so it
sits under the rays/edges/nodes, and tagged each planted `claimBanner` sigil with a `sigil-<name>`
class; `ui-v3.css` retired the old `.node*`/`.owner-*` rules and added the carve/ashed/heart/keystone
styling and raised `.star-inlay` contrast. `scripts/shots-v3.mjs` gained a hard `auditStarInlay`
assertion at round≥2, and a new `tests/v3/board-view.test.ts` (8 tests) locks in the circle-free
nodes, all 5 tier silhouettes, carve+inlay presence, true-edge-count (28) vs decorative-ray-count (8),
the Keystone's exactly-4-edges invariant, banner-carries-sigil-with-no-ring, and a D2 fog guard that
only the back-side sigil is visible to non-owners. **Scope boundary:** T-207 (the user visual
sign-off) remains a separate, still-BLOCKED task — this task only fixes the three named board defects,
it does not self-approve the Gate 1 re-review.
Orchestration: graphify=v3 UI board rendering nodes edges SVG locations claims banners · attempts=1/4.

### T-209 · Rich card faces + hand overflow fix — `status: DONE` · `coder: opus` · `after: T-206`
Gate 1 fix (user, 2026-07-19): hand cards render as six identical cream blanks — no corner value/suit,
no name/art/rules — a readability REGRESSION from the baseline's bare numbers; and the 6-card hand
clips off the panel edge. Fix the T-204 generator to emit the full rich face per Gate 0.5:
corner-indexed value + suit icon (legible unraised), name, generated-ornamental art area, rules text —
distinct per card datum. Fix the overflow so 6 cards always render fully (scale/overlap, no clipping).
**Accept:** a DOM test asserts each hand card shows its distinct corner value + suit + name; a layout
test or shots assertion proves 6 cards fit inside the hand region; regenerated shots show distinct
faces; verify green.
**Delivered (2026-07-19):** the T-204 generator already emitted a distinct name/art/rules per card
datum; the actual Gate 1 regression was the corner value/suit rendering dark-ink-on-dark-frame
(illegible, read as blank), fixed by giving each corner a light parchment backing lozenge (`cf-corner-plate`
rect, sized so the single suit `<svg>` stays uniquely resolvable) and bumping the corner-value font
size for legibility unraised. The hand overflow was fixed by deepening the fan overlap
(`margin-left: -16px` → `-30px`), fitting a full 6-card hand (222px) inside the 264px realm column.
Added a real-browser `auditHandFit` assertion to `scripts/shots-v3.mjs` (Playwright rect containment,
since jsdom has no layout engine) and two DOM tests locking in the per-corner backing plate and
per-card value distinctness. **Scope boundary:** T-210…T-214 (HUD dissolution, start screen, and the
remaining Gate 1 items) are separate, still-open tasks — this task only fixes the named card-face
legibility and hand-clipping defects.
Orchestration: graphify=powerCardFace / card-face generator hand rendering (query "card-face generator hand rendering powerCardFace view.ts") · attempts=1/4.

### T-210 · Full HUD bottom dissolution + election overlap bug — `status: DONE` · `coder: opus` · `after: T-206`
Gate 1 fix (user, 2026-07-19): the bottom turn/action area is still a persistent full-width rectangle
with web-style buttons — failing the full-dissolution bar — and the capture-election screen (m2/03)
shows the turn-prompt text physically sliced by an overlapping raid block. Dissolve: the turn prompt
becomes a plaque anchored near the board; movement options attach to the board (M1 legality data
already drives them); oath/raid/ransom actions become themed contextual controls on the relevant
plaques/nodes; "End turn" becomes a diegetic object (wax seal / iron stud). Zero information loss
(hover/expand acceptable). Fix the overlap.
**Accept:** no persistent full-width bottom panel on any shots screen (DOM assertion; a single-line
chronicle/toast region is exempt); every previously reachable action still reachable (jsdom E2E full
game green); the election screen renders without clipped text; verify green.
**Delivered (2026-07-19):** retired the `.hud-tray` full-width grid row entirely — the phase panel now
renders inside a `.command-plaque`, a content-sized carved-wood overlay absolutely anchored to the
board's bottom-left corner (`max-width: min(400px, ...)`, never full-width, no 26vh overflow clip), and
`renderNarration` moved into a `.chronicle` strip anchored bottom-right and height-capped to one line
(the accept criterion's exempt toast region). The election overlap was a flex-mixing bug: raid election
blocks were being pushed into the same `.action-btns` flex row as verb buttons and the panel title;
`renderRaidElection`'s output is now collected separately into `.raid-elections`, a full-row stack
rendered below the verb row, so nothing overlaps the turn-prompt text. March per-node toll costs moved
behind a `<details>`/`<summary>` hover-expand (the `<ul class="adj-costs"><li>` nodes stay in the DOM
for the shots driver and march legibility, only the always-open framing was dropped) to keep the plaque
compact. Buttons were retextured from flat web panels to bevelled carved-iron studs with an inset
highlight and ember hover glow, and "End turn" became a diegetic wax-seal control (`.end-turn.wax-seal`,
round ember glyph) while keeping its `data-action="pass"` wiring unchanged. Added two hard shots:v3
assertions that run against the real Playwright-rendered DOM (jsdom has no layout engine so full-width
geometry can't be asserted there): `auditNoBottomBar` scans every captured screen for any panel-like
element that is simultaneously ~full-stage-width, bottom-anchored, and taller than one text line, and
`auditElectionUnclipped` verifies the command plaque never overflow-clips its content and that the
election's panel-title + every `.raid-block` lies fully within the plaque's rect and the viewport on the
capture-election screen. Both fail the shots:v3 run (exit 1) on violation. Added
`tests/v3/hud-dissolution.test.ts` (3 jsdom tests) locking in the command-plaque/chronicle DOM structure,
the wax-seal's preserved `data-action`, and the surviving `adj-costs` `<li>` nodes. **Scope boundary:**
this task only dissolves the bottom bar and fixes the named election-overlap clipping bug — the start
screen (T-211), event feed re-theme beyond the one-line chronicle move (T-212), bequest parchment
(T-213), and the full-serif body font (T-214) are separate, still-open tasks.
Orchestration: graphify=graphify query "v3 UI bottom turn action panel HUD movement oath raid ransom end turn controls" · attempts=1/4.

### T-211 · Start screen title treatment — `status: DONE` · `coder: sonnet` · `after: T-206`
Gate 1 fix (user, 2026-07-19): the start screen is unchanged from baseline (black void, default web
form controls). Rebuild as a title screen ON the wood table: Cinzel title treatment with ember accent,
setup form as a parchment plaque, all controls themed (styled selects/checkbox/button — no default UA
widgets visible).
**Accept:** start shot shows table texture + plaque form; the font/appearance audit extends to the
start screen and passes with no default-styled controls; verify green.

**Delivered (2026-07-19):** rebuilt the start screen (`src/ui-v3/main.ts`, `src/ui-v3/ui-v3.css`) as a
title screen ON the wood table instead of the black void — the `.start` container now carries the same
`table-texture.svg` material plus an ember radial glow, an ember-accented Cinzel `<h1>` with forge-glow
text-shadow, and the setup form re-skinned as a carved parchment/iron plaque (`.start-form`). Every
control lost its default UA chrome: selects get `appearance: none` plus a CSS-drawn `▾` caret
(`.select-wrap`), the number input's spinner buttons are removed, and the Herald checkbox is replaced
visually by a CSS-drawn carved box + ember tick (`.check`/`.check-box`) while the real
`#herald-enabled` input stays in the DOM (opacity 0, stretched over the box) so existing wiring and
tests keep working unchanged. Added `scripts/shots-v3.mjs::auditControls`, a live-Playwright computed-
style audit that fails the `shots:v3` run if any start-screen `select`/`input` still resolves to a
non-`none` appearance, and `tests/v3/start-screen.test.ts` (6 jsdom tests: DOM structure + control ids
survive, plus CSS-text guards for the wood-texture rule, the appearance-none rule, and the custom
caret/tick affordances) so the deliverable is enforced by `npm run verify` even without the browser
gate. 1239 tests passing (102 files, +5 net from the new suite). **Scope boundary:** only the start
screen is touched — T-212 (event feed chronicle), T-213 (bequest parchment), and T-214 (full-serif body
font) remain separate, still-open tasks; the primary `<button>` is intentionally exempted from the
`appearance: none` requirement since it already reads as themed via its own gradient/border.
Orchestration: graphify=start screen setup form difficulty select rendering in ui-v3 · attempts=1/4.

### T-212 · Event feed → diegetic chronicle — `status: DONE` · `coder: sonnet` · `after: T-206`
Gate 1 fix (user, 2026-07-19): game events stack as web-alert bars. Restyle as a chronicle: one
parchment/scroll ticker region (not stacked alerts), Shadowking voice-lines visually distinct (ember,
italic), entries burn in via the M1 queue, capped height with scrollback.
**Accept:** events render inside a single chronicle component (DOM assertion — no stacked alert divs);
SK lines carry a distinct class; instant-mode tests green; verify green.

**Delivered (2026-07-19):** Restyled `.chronicle` in `src/ui-v3/ui-v3.css` from a row of stacked
web-alert cards into one board-anchored, aged-parchment scroll region (iron-rimmed, scrollbar-thin,
height-capped with real scrollback) with a `Chronicle` title cap; consolidated the three duplicate
`.narration`/`.narr.*` rule blocks into a single source of truth so Shadowking voice-lines resolve to
ember + italic with a scorch glow instead of the old purple/red, and the newest entry burns in via a
`prefers-reduced-motion`-gated CSS keyframe (instant mode / jsdom get no animation). `view.ts` gained
the `Chronicle` title element and updated comments; added `tests/v3/chronicle.test.ts` (DOM assertion
that entries render inside the single chronicle component with no stacked alert divs, and that SK
lines carry the distinct villain class). 1242 tests passing (103 files, +3 net). **Scope boundary:**
only the event-feed region is touched — T-213 (bequest parchment) and T-214 (full-serif body font)
remain separate, still-open tasks; no tunable, reducer, or balance code was touched.
Orchestration: graphify=graphify query "how are game events rendered as alert bars in the v3 UI view" · attempts=1/4.

### T-213 · Bequest as testament parchment — `status: DONE` · `coder: sonnet` · `after: T-206`
Gate 1 fix (user, 2026-07-19): the death-will moment renders as a plain grey button list. Retheme as a
last-testament parchment frame: parchment panel, serif heading, curse options as inked entries
(themed buttons), somber treatment. Static frame only — M4 animates it. The ENDGAME frame is
deliberately NOT themed this round (user decision: waits for T-402b's victory/defeat sequences).
**Accept:** bequest options render inside the testament component with themed controls (DOM assertion
+ shots); endgame frame untouched; verify green.

**Delivered (2026-07-19):** Retheme the death-bequest panel (`renderBequestPanel` in
`src/ui-v3/view.ts`) from a plain grey `.action-btns` button list into a last-testament parchment
frame (`src/ui-v3/ui-v3.css`) — an aged-parchment `.testament-parchment` leaf (same warm ink-stained
material as the `.chronicle` scroll and `.start-form` plaque) with a Cinzel `.testament-heading`
("Last Testament" / "Your Will") over a ruled hairline and italic serif subhead, and every option
(bequeath cards/captive, death-curse, fall silently) rendered as an inked `.testament-entry` ledger
row instead of a stock button, with the death-curse entries carrying a restrained danger-ink variant
and "fall silently" a muted one; the blocking (you-fall-this-Dawn) state keeps its urgency via a
danger rim on the parchment leaf itself rather than a loud red box. Scope boundary: static frame
only, per the accept criteria — no animation (M4's job) — and the ENDGAME frame is deliberately left
untouched this round, per the user's explicit call to defer it to T-402b's victory/defeat sequences;
added a DOM test (`tests/v3/ui-e2e.test.ts`) asserting the themed testament markup renders and that
clicking a themed curse entry still routes `SET_BEQUEST` through the engine; verify green (1243
tests passed).
Orchestration: graphify=query "bequest death testament panel rendering v3 UI view" · attempts=1/4.

### T-214 · Full-serif body font — `status: DONE` · `coder: sonnet` · `after: T-206`
Gate 1 decision (user, 2026-07-19): body text goes FULL old-style serif per the house style — replace
Inter everywhere with Alegreya or EB Garamond (self-hosted OFL, license committed); Cinzel stays for
headers/labels. Update the shots font audit so a neutral sans (Inter) now FAILS; RUBRIC's
"No default-font text" definition already reflects this.
**Accept:** serif font files + license committed; the font audit rejects Inter and passes with every
text node resolving to Cinzel or the serif across all screens; verify green.

**Delivered (2026-07-19):** Swapped the readable body face from Inter (neutral web sans) to Alegreya,
an old-style OFL serif, per the Gate 1 full-serif decision — Cinzel stays the display face. Replaced
the three Inter `@font-face` blocks in `src/ui-v3/ui-v3.css` with Alegreya (weights 400/500/700; note
weight 600 → 700 since Alegreya's heavy body weight is 700) and repointed `--font-body` from
`'Inter', system-ui, …, sans-serif` to `'Alegreya', Georgia, 'Times New Roman', serif`, so every
control that inherits the body family now resolves to the serif; the two remaining `font-weight: 600`
chip/token literals were bumped to 700 to match the committed Alegreya weight set. Committed the
self-hosted latin-subset woff2 faces `Alegreya-{400,500,700}.woff2` under `src/ui-v3/assets/fonts/`
plus the SIL OFL 1.1 text `Alegreya-OFL.txt`, and deleted the now-unused `Inter-*.woff2` + `Inter-OFL.txt`
(no runtime CDN — see the `@font-face` header comment). As with Cinzel (since T-202), each face is a
single variable woff2 (`wght` axis 400–900) pinned per weight by its `@font-face` `font-weight` — verified
via fontTools (`fvar` present), so the shared bytes across weights are correct, not stub copies.
`docs/CREDITS.md` now credits Alegreya (Juan Pablo del Peral / Huerta Tipográfica, google/fonts
`ofl/alegreya`, OFL-1.1) in place of Inter, with a dated Gate-1 rationale note. Updated the shots
font audit (`scripts/shots-v3.mjs`) so `OURS` is `['cinzel','alegreya']` and it force-loads/checks
the Alegreya weights — a neutral sans now FAILS the audit; ran `npm run shots:v3` end-to-end and the
browser font audit passed across all 7 screens ("every text node resolves to Cinzel/Alegreya"). Updated
`tests/v3/typography.test.ts` (Inter→Alegreya throughout) and added a dedicated regression test that
rejects any word-bounded `Inter` reference in the v3 CSS (word-boundary so "Interactive" comments do not
false-positive). Standing constraints hold: no engine/tunable edits (`src/v2`,`src/v3`,`src/utils`
untouched), no `Math.random`, runtime deps unchanged (gsap+howler pinned, playwright dev-only). Verify
green (1244 tests passed, typecheck + lint clean); `npx vite build` bundles the Alegreya woff2.
Orchestration: graphify=font audit Inter Cinzel serif body text · attempts=2/4.

### T-215 · Regenerate m2 gallery post-fixes — `status: DONE` · `coder: sonnet` · `after: T-208, T-209, T-210, T-211, T-212, T-213, T-214`
Re-run `npm run shots:v3 -- --out docs/Redesign-V3.1/m2` after the fix round, refresh the README if
screens changed, commit the gallery — then HALT: T-207 stays `BLOCKED(awaiting user visual review)`
for the second Gate 1 review. Do not flip T-207 or advance into M3.
**Accept:** fresh gallery committed; the m2-gallery guard test green; the run halts with T-207 still
BLOCKED.

**Delivered (2026-07-19):** Regenerated all 7 M2 screens into `docs/Redesign-V3.1/m2/` via
`npm run shots:v3 -- --out docs/Redesign-V3.1/m2` (exit 0 — every machine gate passed on the post-fix
built UI: board-dominance, font audit Cinzel/Alegreya, start-control appearance:none, star-inlay,
6-card hand-fit, no persistent bottom bar, election unclipped). Captured through the fogged DOM under
`prefers-reduced-motion: reduce` (instant mode), so nothing outside `observableState` leaks. Re-ran to
confirm the same deterministic 7-file set. Screen set/order unchanged (T-208…T-214 were re-skins), so
the README's numbered list was left as-is. Guard `tests/v3/m2-gallery.test.ts` green; `npm run verify`
0 (1244 tests, typecheck + lint clean); `npm run handoff:check` 0. No engine/tunable edits, no
`Math.random`, no new deps; `scripts/shots-v3.mjs` audits run unchanged. **T-207 left BLOCKED(awaiting
user visual review) — HALT for the second Gate 1 review; M3 not started.**
Orchestration: graphify=shots-v3 screenshot script m2 gallery guard test · attempts=1/4.

### T-216 · Chaos star — keep bold, add material depth — `status: DONE` · `coder: opus` · `after: T-215`
Gate 1 second review (user, 2026-07-19): the giant solid star is KEPT as the board's defining visual —
but it currently reads as a flat dark sticker laid on the wood. Give it material depth: burned/charred
wood texture inside the shape (not flat fill), beveled or ember-glow edges, and a slightly lighter
interior so dark node icons separate from the ground. Do not shrink it or revert to a subtle inlay.
**Accept:** the star region shows non-flat texturing (distinct fill treatment asserted in DOM/SVG);
star silhouette unchanged; regenerated shots show icons legible against the interior; verify green.

**Delivered (2026-07-19):** Replaced the chaos-star's flat `STAR_CARVE_FILL` hex with a
deterministic three-layer material treatment in `src/ui-v3/board-view.ts` — a `starCarveGrad`
radial gradient (lighter warm-char centre → darker bevelled rim, for icon separation), a clipped
`starChar` `feTurbulence` charred-grain overlay (fixed seed, same technique as
`table-texture.svg`, `soft-light` blend so it modulates rather than washes the fill), and a
blurred `starEmber` rim tracing the silhouette; the base `carvePts` polygon geometry is
byte-identical so the star silhouette is unchanged. New DOM assertions in
`tests/v3/board-view.test.ts` pin the gradient fill, the clipped char layer, and the ember rim as
present and distinct from a flat fill. Scope boundary: this is SVG `<defs>`/CSS only — no new
asset file, no RNG, no engine or tunable change; `docs/CREDITS.md` records the inline material as
self-authored. `npm run verify` green (1250 tests); `docs/handoff/state.json` updated.
Orchestration: graphify=chaos star board background rendering v3 UI · attempts=1/4.

### T-217 · Node hierarchy, readable banners, and ALL true connectors — `status: DONE` · `coder: opus` · `after: T-215`
Gate 1 second review (user, 2026-07-19), three parts. (1) Mid-tier legibility: forges get ember-glow
treatment so they separate from the dark star; approaches become distinct watchtower/gate silhouettes
instead of small squares. (2) Claim banners grow into readable heraldry — visible house color + sigil
at gameplay size. (3) **USER-CAUGHT BUG: true edges are missing from the render** — notably the
Keystone→approach spokes (the only routes into the center!). Add an edge-parity guard: every edge in
`data/board.json` has exactly one rendered connector element and no extra connectors exist —
render == data, enforced by test.
**Accept:** the edge-parity test exists and is green (all `data/board.json` edges rendered, no
phantoms); approaches/forges have distinct silhouette classes; banner elements carry sigil + house
color at legible size in shots; jsdom E2E + verify green.

**Delivered (2026-07-19):** Real playable edges (including the four Keystone→approach spokes) now
render into a single `.edges` group with a deterministic raised-road glow filter, and `nodeScreenPos`
is exported so a new edge-parity test can map every rendered `line.edge` back to `data/board.json`
and assert render == data with no phantoms. Forges got a two-stage ember glow (halo + hot core) to
separate from the dark star; approaches became a fortified gatehouse silhouette (twin crenellated
towers + arched gate, DOM-assertable via `.approach-gate`) replacing the old signpost glyph; claim
banners grew into a wider swallowtail flag (`BANNER_FLAG_W`/`BANNER_SIGIL_SCALE` constants) carrying
house color + sigil at legible gameplay size; the crescent sigil path was also fixed so its inner arc
carves a visible bite instead of cancelling the disc. Scope boundary: this pass is render/asset work
only — no board.json data changes, no new node/edge types, and the M2 gallery regen is deliberately
left to T-219 rather than re-shot here.
Orchestration: graphify=query "v3 board rendering connectors edges nodes banners approaches forges" · attempts=2/4.

### T-218 · Theme the threat prompt — `status: DONE` · `coder: sonnet` · `after: T-215`
Gate 1 second review (user, 2026-07-19): the Reckoning's marquee prompt ('The dark gathers its will…'
+ FACE THE THREAT) is the last unthemed web element — a plain rectangle with a yellow web button.
Retheme as an ember-bordered plaque with a themed button consistent with the wax-seal End Turn
language. (The endgame 'Game over' frame stays untouched — deferred to T-402b by user decision.)
**Accept:** the threat prompt renders as the themed plaque with no default-styled button (DOM
assertion + shots); endgame frame untouched; verify green.

**Delivered (2026-07-19):** Retheme the Reckoning's marquee threat prompt (`renderThreatPanel` in
`src/ui-v3/view.ts`) from a bare `.panel.threat` div with a default-styled yellow `.primary` button
into an ember-bordered plaque (`.threat-plaque`, carved-wood gradient + ember rim glow) driving a
wax-seal advance button (`.threat-advance.wax-seal`, round ember stud + serif label) — the same
diegetic idiom as End Turn, applied to both the normal and WRAITH-window variants, with a new
`tests/v3/threat-prompt.test.ts` DOM-assertion suite covering the marker class, the absent
`class="primary"` on the advance control, the WRAITH variant, and a regression guard that
`.end-turn.wax-seal` and the endgame `Game over` frame stay byte-identical (deferred to T-402b by
user decision). Scope boundary: styling/markup only — no new board.json data, no data-model
changes, and the M2 gallery regen is deliberately left to T-219 rather than re-shot here.
Orchestration: graphify=query "threat prompt Reckoning banner FACE THE THREAT rendering in ui-v3 view" · attempts=1/4.

### T-219 · Regenerate m2 gallery for the third review — `status: DONE` · `coder: sonnet` · `after: T-216, T-217, T-218`
Re-run `npm run shots:v3 -- --out docs/Redesign-V3.1/m2`, refresh the README if screens changed,
commit the gallery — then HALT: T-207 stays `BLOCKED(awaiting user visual review)` for the third
Gate 1 review (user decision: in-person verification before the flip). Do not flip T-207 or advance
into M3.
**Accept:** fresh gallery committed; m2-gallery guard green; run halts with T-207 still BLOCKED.

**Delivered (2026-07-19):** Re-captured the 7-screen M2 gallery via `npm run shots:v3 -- --out
docs/Redesign-V3.1/m2` so it reflects the T-216 (chaos-star material depth), T-217 (node
hierarchy / readable banners / true Keystone→approach connectors), and T-218 (themed threat
plaque) render changes that had each deferred the regen here. Run exited 0 with all built-in audits
green (board-dominance, fonts, appearance, star-inlay, sigil-legibility, hand-fit, bottom-bar,
election-unclipped). Six PNGs changed (`02`…`07`); `01-start-select.png` is byte-identical since
those tasks did not touch the start screen. Screen keys/filenames unchanged, so
`docs/Redesign-V3.1/m2/README.md` needed no edit. The m2-gallery guard (`tests/v3/m2-gallery.test.ts`,
≥7 PNGs + non-empty README) is green and the full v3 suite passes (795 tests). No engine / tunable /
asset / UI-behavior / script change — image artifacts + this status note only. HALT: T-207 stays
`BLOCKED(awaiting user visual review)` for the user's third Gate 1 in-person review; state.json
`currentStage` unchanged (`V3.1-M2-CHECKPOINT`); did not flip T-207 or advance into M3.
Orchestration: graphify=shots-v3 screenshot gallery generation m2 · attempts=1/4.

### T-220 · Star boldness restored + connectors thinned/materialized — `status: DONE` · `coder: opus` · `after: T-219`
Gate 1 third review (user, 2026-07-20). Two corrections to T-216/T-217. (1) **The star lost its
boldness** — T-216 replaced the solid dark star with charred fill so close to the table's value that
the star reads as faint background line-work. The user's ruling was "keep bold, ADD depth", not
"trade boldness for texture": restore a star ground clearly darker than the table, keeping the charred
texture + ember edge treatment. The nodes now carry their own contrast (ember forges, pale towers), so
a dark ground no longer swallows them. (2) **Connectors over-corrected** — true edges render as thick
bright-gold bars (circuit-board feel). Thin them and materialize: worn stone road / etched gold vein,
not solid bars. The edge-parity guard from T-217 stays green throughout.
**Accept:** star fill is measurably darker than the table surface (asserted, e.g. token/computed
value) while retaining texture + ember edge; connector stroke weight reduced with a material
treatment; edge-parity test still green; verify green.
**Delivered (2026-07-20):** `board-view.ts` restored the `starCarveGrad` fill to a bold, dark burned
ground — `STAR_CARVE_STOPS` (`#140d07`/`#0d0804`/`#070402`), every stop asserted darker than the new
`TABLE_SURFACE_HEX` (`#1a120c`) constant with a CSS drift guard tying it back to `.table-stage`,
keeping the centre→rim falloff plus the T-216 charred-grain overlay and ember rim (nudged
0.5→0.6 opacity so it stays bold against the darker ground). Playable edges now render as two lines
per undirected pair — a `.edge-bed` worn-stone road bed (`EDGE_BED_W` 3.4) under a thinned `.edge`
etched-gold vein (`EDGE_STROKE_W` 1.6, down from the old flat 4) — with widths set inline in
board-view.ts (not CSS) so a stylesheet rule can't re-widen them, the `edgeGlow` blur softened
1.6→0.7, and the T-217 edge-parity guard (exactly one `line.edge` per undirected edge, `.edge-bed`
a distinct class invisible to those queries) still green. New T-220 test suite in
`tests/v3/board-view.test.ts` asserts both effects plus texture/ember retention; scope boundary is
visual-only — no topology, tunable, or engine change, deferred to M2.5 (T-221+). Full v3 suite green
(1267 tests), typecheck/lint clean.
Orchestration: graphify=query "chaos star fill charred texture ember edge and board edge connector rendering in ui-v3 board-view" · attempts=1/4.

---

## M2.5 — TRUE 8-SPOKE BOARD (engine topology change; user-authorized 2026-07-20)

**Why this milestone exists:** the user asked three times for a real 8-direction board. It was
mis-scoped as visual-only (a Fable error: the user's "I fully accept that new balance testing is
needed" at the 2026-07-18 exchange was acceptance of the MECHANICAL change, and every coder since
faithfully built decoration because the task spec said "visual only"). The user has now authorized
the engine change, shape **+4 cardinal mid-belt nodes (17 → 21)**, keeping the agreed rule that only
**4 approaches touch the Keystone**.

**Guardrail change required first (T-221).** V3.1 §3 currently forbids engine edits and locks
balance; M2.5 legitimately breaks both. No task here may proceed until the roadmap + `state.json`
record the dated, user-authorized exception. The balance LOCK is **voided, not silently ignored** —
the measured post-change numbers are recorded as a NEW baseline, and the §9 bands are re-established
by a later stage (V4-scale), not tuned during this milestone.

### T-221 · Authorize + record the topology exception — `status: DONE` · `coder: sonnet` · `after: T-220`
Amend `docs/ROADMAP-V3.1-UI.md` §3: the "engine untouched / balance LOCKED" guardrails gain a dated
user-authorized exception scoped to M2.5 (topology only — no tunable VALUE edits; the lock is voided
by the topology change itself and a fresh baseline replaces it). Record the same in `state.json`
`invariants` + `openRisks` (openRisk: "post-topology balance is UNMEASURED until T-227"), and add an
M2.5 sub-box to ROADMAP-V3 §4 + this sprint's §4 milestone list.
**Accept:** roadmap §3 exception present and dated; `state.json` invariants/openRisks updated;
`npm run handoff:check` exits 0.
**Delivered (2026-07-20):** Added a dated 2026-07-20 exception to `docs/ROADMAP-V3.1-UI.md` §3
scoping the "engine untouched / balance LOCKED" guardrail to permit the M2.5 board-topology change
only (`data/board.json` 17 → 21 nodes plus the 4-fold type/setup/blight/sim/AI generalization),
explicitly forbidding any tunable-VALUE edit and stating the balance §9 lock is voided by the
topology change itself and replaced by the T-227 fresh baseline, band misses recorded not tuned. Added
the §M2.5 milestone block (T-222…T-227 + exit metrics) to `ROADMAP-V3.1-UI.md` between M2 and M3, a
`V3.1-M2.5` sub-box to `ROADMAP-V3.md` §4 above the M2-CHECKPOINT box (making it the first-unchecked
stage), and repointed `docs/handoff/state.json` `currentStage` `V3.1-M2-CHECKPOINT` → `V3.1-M2.5` with
the LOCK-void scoping recorded in `invariants` and the "post-topology balance UNMEASURED until T-227"
`openRisk` added. `scripts/handoff-check.mjs`'s stage-parsing regex was widened to recognize the
`V3.1-M2.5` decimal-milestone box form (script only — no engine/tunable code touched). Scope boundary:
this task authorizes and records the exception only; no `src/` or `data/` file changed, and
`git diff --stat -- src/ data/` is empty. `npm run handoff:check` exits 0.
Orchestration: graphify=query "ROADMAP-V3.1-UI §3 guardrails engine untouched balance LOCKED topology exception M2.5" · attempts=1/4.

### T-222 · Board topology: +4 cardinal mid-belt nodes — `status: DONE` · `coder: opus` · `after: T-221`
Create the v3 board source **`data/board-v3.json`** (a fork of the 17-node v2 `data/board.json`) and
extend it from 17 to 21 nodes: add four CARDINAL mid-belt nodes (`mid-n`, `mid-e`, `mid-s`, `mid-w`)
alongside the four existing diagonal forges. Each new node connects **outward** to its cardinal keep and
**laterally** to its two neighbouring diagonal approaches, so all 8 compass directions become real routes
inward while the Keystone keeps exactly its 4 approach doors. Keeps therefore gain the new mid node as a
route (adjust their existing forge links per the spec you write). Regenerate `src/v3/board.gen.ts`
(`npm run gen:data`); update `NODE_IDS`, the tier union, and `validateClosingRing()` for the new
tier/count; keep the definition frozen/JSON-serializable.
**Source-split note (dated decision, 2026-07-20 — see `docs/ROADMAP-V3.1-UI.md` §3):** the original spec
said "`data/board.json` 17 → 21". That file is *also* codegen'd into the **frozen v2** `src/v2/board.gen.ts`
by `scripts/gen-data.mjs`, so an in-place edit would break the untouched-v2 guardrail. The 21-node board is
therefore a **new `data/board-v3.json`** feeding only `src/v3/board.gen.ts`; `data/board.json` +
`src/v2/board.gen.ts` are byte-for-byte untouched. Topology/node-count/invariants unchanged — this is a
source-path split only.
**Accept:** `data/board-v3.json` has 21 nodes with symmetric 8-fold ring structure; the Keystone still
has exactly 4 connections; graph is connected; every new node's links are bidirectional (validator
test); `src/v3/board.gen.ts` regenerated and byte-consistent with `gen:data:check`; `data/board.json` /
`src/v2/board.gen.ts` unchanged; board tests updated and green.
**Delivered (2026-07-20, fix round 1):** Forked `data/board-v3.json` from the 17-node v2 board and added
the 4 cardinal `mid` nodes (`mid-n/e/s/w`, tier `mid`), each linked outward to its cardinal keep and
laterally to its two neighbouring diagonal approaches → 21 nodes, all 8 rays real inward routes, Keystone
kept at exactly 4 approach doors. Wired `data/board-v3.json` → `src/v3/board.gen.ts` as a distinct
`scripts/gen-data.mjs` target (the v2 `data/board.json` → `src/v2/board.gen.ts` target is left untouched,
so the frozen v2 board is byte-identical), extended the board schema's tier enum with `mid`, generalized
`src/v3/board.ts` (`NODE_IDS` / tier union / `validateClosingRing`) and `src/v3/types.ts` for the new
tier/count, and updated `src/ui-v3/board-view.ts` + the v3 board tests. New `tests/v3/data-sync.test.ts`
guards the split (v3 gen output matches `data/board-v3.json`; v2 board untouched). `gen:data:check`
byte-consistent for all 4 targets; verify green. **Fix-round cause:** round-0 review CRITICAL was the
unrecorded `data/board.json` → `data/board-v3.json` substitution, not a code defect — the split is now
recorded as a dated decision in `docs/ROADMAP-V3.1-UI.md` §3, this task body + accept criteria,
`docs/ROADMAP-V3.md` §8, and `state.json` `nextAction`, all naming `data/board-v3.json` as the real target.
**Delivered (2026-07-20):** Shipped the 21-node v3 board as a new, dedicated `data/board-v3.json` source
(forked from the 17-node v2 `data/board.json`, which stays byte-for-byte untouched) carrying the 4 new
cardinal `mid-n/e/s/w` nodes, wired through a distinct `scripts/gen-data.mjs` target into a regenerated
`src/v3/board.gen.ts`, with `src/v3/board.ts` / `src/v3/types.ts` generalized for the new `mid` tier and
node count, `src/ui-v3/board-view.ts` updated to render the ring, and `tests/v3/board.test.ts` +
`tests/v3/board-view.test.ts` + `tests/v3/setup.test.ts` updated plus a new `tests/v3/data-sync.test.ts`
guarding the source split. Deliberate scope boundary: this task touches only the board topology/data layer
(`data/board-v3.json`, `src/v3/board.gen.ts`, `src/v3/board.ts`, `src/v3/types.ts`, `src/ui-v3/board-view.ts`,
`scripts/gen-data.mjs`) plus its direct tests and the doc/state trail recording the source-split decision;
no other v3 engine module, no v2 file, and no balance tunable was touched.
Orchestration: graphify=none — graph.json is present but the task is a tightly-scoped topology/data change; I grounded the plan directly in the real source files (board.json, board.ts, · attempts=2/4.

### T-223 · Untangle the 4-fold assumptions in types + setup — `status: DONE` · `coder: opus` · `after: T-222`
The engine hard-codes four-ness in places the new board breaks: `keepIds: readonly [string,string,
string,string]` (4-tuple), `Quadrant = 0|1|2|3`, seat/quadrant assignment in `setup.ts`, and the
blight entry seams. Generalize where the board defines it (keep ids from board data; quadrant mapping
derived, not assumed) WITHOUT changing game rules: 4 seats and 4 quadrants remain the game's shape —
only the node count per quadrant changes. Update `blight.ts`, `heart.ts`, `shadowking-policy.ts`,
`shadowking-effects.ts` call sites as needed.
**Accept:** no `[string,string,string,string]` board-tuple assumption remains for node collections;
typecheck clean; all existing v3 tests updated to the 21-node board and green; no tunable VALUE
changed (diff shows zero edits to tunables.ts / tunables.gen.ts).

**Delivered (2026-07-20):** Widened `V2BoardDef.keepIds` from a fixed `[string,string,string,string]`
tuple to `readonly string[]`, and added a `getNodeInQuadrant`/`getKeepForQuadrant`/
`getForgeForQuadrant`/`getApproachForQuadrant` family in `board.ts` that derives a quadrant's home
node by scanning for the node whose `tier`+`quadrant` fields match, rather than indexing
`keepIds[quadrant]` and assuming array position equals quadrant. Rewired every positional-indexing
call site onto the new helpers: `setup.ts` seat assignment, `blight.ts` `getSpokePath`,
`shadowking-policy.ts` `getSpokePathSimple`/`chooseTargetNode`/`chooseShadowkingIntent` steering, and
`heart.ts` Keystone-displacement fallback. `Quadrant` (`0|1|2|3|null`) was deliberately left as-is and
documented as a fixed game-shape constant, not a node-count-derived value — 4 seats and 4 quadrants
are the game's shape per the task's own framing; only per-quadrant node population varies. Scope
boundary: no tunable value touched, no `shadowking-effects.ts` call site needed a change (grep found
none referencing `keepIds` positionally), and blight entry-seam topology itself is out of scope here
(explicitly deferred to T-224, which owns the 8-ray seam/spoke redesign). All 8 touched files
typecheck clean and the full suite is green (1275 passed, up from 1272, reflecting the new board.ts
quadrant-helper coverage added to `tests/v3/board.test.ts`).
Orchestration: graphify=query "keepIds 4-tuple Quadrant seat quadrant assignment in setup blight heart" · attempts=2/4.

### T-224 · Blight seams + spoke paths for 8 rays — `status: DONE` · `coder: opus` · `after: T-223`
Blight enters at symmetric outer seams and converges inward along spokes; with 8 real rays the seam
set and convergence paths must be redefined coherently (per `DESIGN-V3-ALGORITHM.md` §2's intent, not
by ad-hoc patching). Write the rule down in the spec doc as a dated amendment, implement it, and
cover it with the spoke-path tests that previously guarded the 4-spoke version.
**Accept:** spec amendment written and dated; blight spoke-path tests rewritten for 8 rays and green;
blight still reaches the Keystone from every seam; verify green.
**Delivered (2026-07-20):** Restated the blight-seam & spoke rule as a dated, authoritative §13 amendment
in `DESIGN-V3-ALGORITHM.md`, splitting the 8 rays of the T-222 21-node board into 4 diagonal blight
spokes (`Holding → Forge → Approach → Keystone`, seam = the Holding) and 4 cardinal home rays
(`Keep → Mid → Approach`, never on a blight spoke). Added `getSpokeSeam`/`getSpokePath` to `board.ts` as
the single source of truth — seams derived from node adjacency (the Holding adjacent to both flanking
Keeps), not id-string hacks — and rewired `blight.ts` and `shadowking-policy.ts` onto it, deleting their
old ad-hoc 4-spoke path logic. Every spoke still terminates at the Keystone, so doom remains reachable
from all four seams. Rewrote the spoke-path tests in `tests/v3/blight.test.ts` and
`tests/v3/mechanics-3f.test.ts` for the 8-ray geometry; full suite green (1278 passed, up from 1275).
Scope boundary: the spoke now structurally excludes the Keep from the blight path (previously blight
could pile onto/ash a Keep en route) — this is flagged in the spec as a structural change for T-227 to
read, not tuned; zero `tunables.ts`/`tunables.gen.ts` value edits were made, and fresh balance
measurement stays out of scope here (owned by T-227). Rendering the new nodes (T-225) and sim/harness/AI
generalization (T-226) are separate, already-queued tasks and were not touched.
Orchestration: graphify=blight seam spoke path convergence ray keystone · attempts=1/4.

### T-225 · Render the 21-node board — `status: TODO` · `coder: opus` · `after: T-222, T-220`
Update `src/ui-v3` board rendering for the new topology: the four new cardinal mid-belt nodes get
their own illustrated location silhouette (distinct from forges — e.g. waystation/bridge), positioned
on the cardinal rays so the star's 8 arms each carry real nodes. Star + connector treatment from
T-220 carries over unchanged in style.
**Accept:** all 21 nodes render with tier-appropriate silhouettes; the T-217 edge-parity test passes
against the NEW board data (render == data, 8 real rays); shots regenerate clean; verify green.

### T-226 · Sim/harness + AI on the new board — `status: TODO` · `coder: opus` · `after: T-224`
Make the v3 sim, UGT harness, and AI/Shadowking policies run correctly on the 21-node board: any
hard-coded node ids, quadrant maps, or distance assumptions in `src/v3/sim/`, `src/v3/harness/`,
`ai-player.ts`, and `shadowking-policy.ts` get generalized. Games must still terminate at 2/3/4p in
both modes. **Do not tune anything** — this task is correctness only.
**Accept:** `npm run sim:v3` completes for both modes at 2/3/4p with no crash and sane termination;
harness runs; zero tunable value edits in the diff; verify green.

### T-227 · Fresh balance READING on the 21-node board — `status: TODO` · `coder: opus` · `after: T-226`
Run the standard 2-seed sim sweep on the new topology and **record** the results (dark win %, doom vs
attrition split, capture rate, rounds, Blood-Pact triple) into a new `sim-results/` run dir plus a
dated ROADMAP-V3 §8 entry and `state.json`. This is a MEASUREMENT, not a tuning stage: bands will
almost certainly miss (the old lock measured a different board) — record every miss, change nothing.
Flag explicitly whether the misses look tunable or structural (the 4-spoke-era failure modes to watch:
attrition-dominant dark wins, dead capture economy).
**Accept:** new sim run dir committed with a REPORT; §8 entry + `state.json` record the numbers and
name the deltas vs the old lock; zero tunable value edits; a written tunable-vs-structural assessment
is present.

### T-228 · M2.5 close — DoD — `status: TODO` · `coder: sonnet` · `after: T-225, T-227`
Milestone DoD: verify green → tick M2.5 boxes in both roadmaps → `currentStage` → `V3.1-M2-CHECKPOINT`
(the Gate 1 re-review) → dated §8 entry → commit → `handoff:check` exits 0.
**Accept:** both commands exit 0; boxes ticked; §8 entry present.

### T-229 · Regenerate gallery for the fourth review — `status: TODO` · `coder: sonnet` · `after: T-228`
Re-run `npm run shots:v3 -- --out docs/Redesign-V3.1/m2`; commit; then HALT with T-207 still
`BLOCKED(awaiting user visual review)`. The user reviews the star/connector corrections AND the true
8-spoke board together.
**Accept:** fresh gallery committed; guard test green; run halts with T-207 BLOCKED.

---

### T-207 · CHECKPOINT — user visual review of M2 — `status: BLOCKED(awaiting user visual review)` · `coder: sonnet` · `after: T-206, T-229`
Regenerate the gallery into `docs/Redesign-V3.1/m2/` (committed), then **set this task
`BLOCKED(awaiting user visual review)` and halt the run** — do not proceed into M3. The user scores
`docs/Redesign-V3.1/RUBRIC.md` (target ≥8/10) and runs the blind read test ("web app or board game?" on
a fresh agent given only the screenshots); the user flips this task to DONE, or files fix tasks.
**Accept:** (checked by the user, not the runner) m2 gallery committed; rubric scored ≥8/10; blind
read test answered "board game" for every screen; user explicitly approved.

**Delivered (2026-07-19):** Regenerated the 7-screen M2 gallery into `docs/Redesign-V3.1/m2/` via
`npm run shots:v3 -- --out docs/Redesign-V3.1/m2` (board-dominance + font-audit gates both passed),
alongside `docs/Redesign-V3.1/m2/README.md` and the `tests/v3/m2-gallery.test.ts` guard (≥7 PNGs +
non-empty README; both guard tests pass). All of these are **staged** (`git add`) so the runner's
T-207 commit — which per the orchestrator protocol happens only after review+gate pass, never by the
coder — lands them; the "m2 gallery committed" acceptance item is satisfied by that commit. (Fix
round 3 root cause: an earlier note falsely said "committed" while the files sat untracked; the note
now states the true staged-for-runner-commit state.) No engine/tunable/asset/UI-behavior change. This
is a CHECKPOINT: **not self-approved** — status stays `BLOCKED(awaiting user visual review)` and the
run halts here; the rubric score (≥8/10), the blind read test, and the DONE flip are the user's
alone and are intentionally still outstanding. Did not advance into M3 (T-301+).

**Gate 1 first review (user, 2026-07-19): scored 5/10 — below the ≥8 bar; fix round filed.** Passing:
table texture, act/turn track, palette cohesive, board largest, resources-as-chips. Failing: cards
(blank faces + clipping regression), HUD-diegetic (bottom rectangle + web buttons + election overlap
bug), screens-consistent (start screen untouched), board-vs-spec (glyph circles, no star inlay, no
banners), no-default-font per the tightened serif definition (Inter). Fix tasks T-208…T-215 filed
above; this checkpoint stays BLOCKED until the user re-scores the regenerated gallery.

**Gate 1 second review (user, 2026-07-19): 9/10 provisional — bar met, but user holds for a third
look.** All eight T-208…T-215 fixes verified landed; blind read test passed **7/7 "digital board
game"** (fresh agent, neutral filenames); motion scored provisionally (verified live at T-306). User
decisions: the giant chaos star is KEPT as the board's identity but gains material depth (T-216);
node hierarchy/banners fixed + **user-caught missing true connectors** — Keystone→approach spokes
absent from the render (T-217, with a render==data edge-parity guard); threat prompt themed (T-218).
T-207 remains BLOCKED pending the third review of T-219's regenerated gallery.

---

## M3 — Cards & hand live

### T-301 · Fanned hand — `status: TODO` · `coder: opus` · `after: T-207`
Render the human player's hand as a CSS-3D fanned card row (arc + rotation math), with hover-raise
and selected-lift states, using the T-204 card faces. Degrades to a flat row under instant mode/jsdom.
Because faces are rich (Gate 0.5), the fan relies on T-204's corner index for at-a-glance value/suit
reads; **hover-raise zooms the card enough to read its rules text**.
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
- ~~**Mechanical 8-spoke board: V4 candidate, NOT this sprint.**~~ **SUPERSEDED 2026-07-20 — now
  milestone M2.5 (T-221…T-229), user-authorized.** The original deferral misread the user's
  2026-07-18 acceptance ("I fully accept that new balance testing is needed") as agreement to defer;
  it was authorization. The balance LOCK is deliberately voided and replaced by a fresh measured
  baseline (T-227); re-establishing the §9 bands remains post-playtest V4 work.
