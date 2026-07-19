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

### T-203 · Token/chip components + DOM audit test — `status: TODO` · `coder: opus` · `after: T-201`
Every resource/stat becomes an icon+count `TokenChip` (game-icons.net SVGs, committed + credited) or a
gauge — never a bare number in a table. Add the enforcing vitest: over a full jsdom game, every
numeric stat node in the game root carries the chip/gauge class and contains an inline `<svg>`.
**Accept:** the DOM-audit test exists and is green over a full fixed-seed game; SVGs committed with
CREDITS entries; jsdom E2E green.

### T-204 · Card frames + data-driven card-face generator — `status: TODO` · `coder: opus` · `after: T-202`
Create `src/ui-v3/card-face.ts`: piece/token data → SVG card face (frame, name, icon, stats), so art
swaps never touch layout code. Frames from a CC0 pack (credited). Cards across the UI render via the
generator only. **Gate 0.5 (user, 2026-07-18): faces are RICH TCG-style** — name + art area + rules
text (art areas generated-ornamental until bespoke art exists), with the value + suit icon
**corner-indexed** so a fanned card stays readable without raising it.
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
- **Mechanical 8-spoke board (true diagonal approaches, user idea 2026-07-18): V4 candidate, NOT this
  sprint.** New nodes/edges void the balance LOCK (18–22% band, 2-seed + 40-seed sweeps, byte-identical
  sim baselines) and break 4-fold-symmetry types (`keepIds` 4-tuple, `Quadrant`, blight seams). Park it
  for the post-playtest V4 charter; V3.1 ships the 8-ray *visual* on the locked 17-node topology (T-201).
