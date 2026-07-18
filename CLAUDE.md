# Iron Throne of Ashes — Development Guide

## Agent Handover (read this first)

The current sprint is **v3** (see the resume point below). v2 is the earlier, shipped engine — kept
untouched. Before doing anything:
1. Run **`npm run handoff:check`** and read **`docs/handoff/state.json`** — the machine-checked source of
   truth for status (current stage, next action, verified test state). `handoff:check` asserts
   `state.currentStage` matches the first unchecked box in **`docs/ROADMAP-V3.md` §4**.
2. Read **`docs/ROADMAP-V3.md`** (resume point — §0 where-we-are, §8 running record) and follow
   **`docs/AGENT-PROTOCOL.md`** — the enforced Definition of Done (`npm run verify` exits 0 → update
   state.json + ROADMAP + memory → commit → `npm run handoff:check` exits 0). `npm run verify` runs the
   FULL v2+v3 suite (typecheck + lint over the whole repo + `vitest run tests`), each gate under a hard
   timeout.

## Architecture

- **Engines:** Alliance Engine v2 (`src/v2/`) and the v3 roster engine (`src/v3/` — court/capture/
  discovery/heart on the reused v2 substrate). Both in TypeScript. **v3 is the current sprint.**
- **UI:** Vanilla-TS frontends served via Vite — v2 in `src/ui-v2/` (`index.html`), v3 in `src/ui-v3/`
  (`index-v3.html`). `npm run dev` serves both; open `/index-v3.html` for v3.
- **Test framework:** Vitest (`tests/v2/`, `tests/v3/`)
- **RNG:** `SeededRandom` in `src/utils/seeded-random.ts` — all game randomness goes through this

## Project Structure

```
src/
  v2/         # v2 engine: reducer, combat, blight, blood-pact, sequencer, shadowking-policy,
              #   ai-player, actions, tunables, setup, board, events, commands, gambit, types
  v2/sim/     # v2 balance harness — deterministic Monte-Carlo over the real reducer (npm run sim)
  v3/         # v3 roster engine: reducer (applyCommand), court/capture/discovery/heart, tunables
  v3/sim/     # v3 balance harness (npm run sim:v3)
  v3/harness/ # v3 harness-core support for the UGT harness
  ui-v2/      # v2 frontend: main.ts (entry), session.ts, view.ts, board-view.ts, ui-v2.css
  ui-v3/      # v3 frontend (served at /index-v3.html)
  utils/      # SeededRandom (shared with v2, v3, and all scripts)
tests/
  v2/         # v2 tests — mirrors src/v2/ (jsdom environment)
  v3/         # v3 tests — mirrors src/v3/
  utils/      # seeded-random.test.ts
harness/      # UGT harness — ugt-harness.mjs (npm run harness), README.md
scripts/      # Balance tuning (.mjs), handoff check, verify, sim, sim-v3
docs/         # DESIGN-V2-ALGORITHM.md (v2 spec), DESIGN-V3-ALGORITHM.md (v3 spec),
              #   ROADMAP-V3.md (current), AGENT-PROTOCOL.md, archive-V2/ (completed v2-era docs)
index.html    # v2 UI entry;  index-v3.html # v3 UI entry
```

**Authority:** `docs/DESIGN-V2-ALGORITHM.md` is the spec for v2 mechanics;
`docs/DESIGN-V3-ALGORITHM.md` is the spec for v3 mechanics — its **§13 (stress-test hardening) is
AUTHORITATIVE and overrides earlier prose**, and §12 is the edge-case table.

## Design Commitments (Non-Negotiable)

_Shared (both engines):_

1. **Behavior/Card execution must be fully deterministic from a given seed.** Required for balance simulation.
2. **All game randomness goes through `SeededRandom`.** Never use `Math.random()` / `Date.now()`.

_v2 only:_

3. **Broken Court never prevents Voting Phase participation.** Must have automated test coverage.
   _(v3 retired Broken Court for full elimination — capture election + depose — so this does not apply to v3.)_
4. **Voting Phase resolves before any player action phase.** Not configurable.
   _(v3 equivalent: frozen-then-ordered PLEDGE resolves before ACTION — §7.)_

_v3 only (non-negotiable):_

5. **Determinism contract §7 D1–D9 holds.** In particular D2 — every decider (AI and human) reads the
   `observableState(state, viewerSeat)` fog projection, which redacts unflipped-token contents, `seed`, and
   any input sufficient to recompute hidden content; the engine resolves from full state and **the AI must
   not see under the fog**. No seed/unflipped-token leakage; `GameState` stays JSON-serializable.
6. **All v3 state mutation goes through `applyCommand`** (`src/v3/reducer.ts`) — no direct mutation elsewhere.
7. **Balance is LOCKED** — dark **18–22% pooled** at the Herald default-OFF point (§9). No edits to
   `src/v3/tunables.ts` / `tunables.gen.ts` / any tunable value; band misses are recorded, never tuned.
8. **Herald default-OFF.** The shipped v3 game is 3-archetype (Warlord / Marshal / Steward); Herald + PARLEY
   are an advanced toggle (UI start-screen + sim `--herald`).

## Engineering Principles — No Deferred Debt (Non-Negotiable)

**Fix issues first; do not accumulate technical debt while building more features.**

1. **Resolve or record — never carry vague deferrals.** Every open risk or known gap is either fixed
   now or written down as a *dated, owned decision* in `docs/ROADMAP-V3.md` (or `docs/archive-V2/ROADMAP.md`
   for the frozen v2 engine), `docs/handoff/state.json` `openRisks`, or a `docs/DESIGN-V{2,3}-*.md` doc.
2. **No hidden/unvalidated mechanics.** A shipped mechanic the sim can't exercise (a "human-only"
   feature) must be labeled UNTESTED in the spec and added to `docs/human-playtest-checklist-v3.md`.
3. **No stale comments.** When behavior changes, fix the comments that describe it in the same change.
4. **Pre-commit/CI checks are sacred** (see the global rules): never `--no-verify`; a failure found
   in your session is yours to fix; "clean to commit" = zero failing tests.
5. **Fix-first ordering.** Front-load zero-risk debt paydown before balance-moving work.

## Commands

- `npm run dev` — Vite dev server (serves both UIs; open `/index.html` for v2, `/index-v3.html` for v3)
- `npm run build` — compile TypeScript (`tsc`)
- `npm run typecheck` — type check without emitting
- `npm run lint` — ESLint over `src/` and `tests/`
- `npm test` — run all tests (`vitest run` — utils + v2 + v3)
- `npm run test:v2` — v2 tests only (`vitest run tests/v2`)
- `npm run test:v3` — v3 tests only (`vitest run tests/v3`)
- `npm run test:watch` — run tests in watch mode
- `npm run sim` — v2 balance simulation (compiles then runs `scripts/sim.mjs`)
- `npm run sim:v3` — v3 balance simulation (`tsc` then `scripts/sim-v3.mjs`)
- `npm run harness` — UGT harness (`tsc` then `harness/ugt-harness.mjs`)
- `npm run verify` — handoff verification (FULL v2+v3 suite + lint + typecheck)
- `npm run handoff:check` — machine-check `docs/handoff/state.json` against `docs/ROADMAP-V3.md` §4

**Pre-push hook:** `core.hooksPath=.githooks`; `.githooks/pre-push` runs `npm run lint` and
`npm run test`. A push fails if either fails — keep both green (do not bypass with `--no-verify`).

## Coding Standards

- Strict TypeScript (`strict: true`) — no `any` types
- Prefer `readonly` for data that shouldn't mutate after creation
- Use interfaces for data shapes, classes only when behavior is needed
- Test files mirror source structure: `src/v2/combat.ts` → `tests/v2/combat.test.ts`

## Balance Parameters (from design spec)

- Shadowking effects (a telegraphed CHARACTER, not a deck): WHISPER → SPREAD, MARCH → MARCH_DK,
  RECKONING → REAP / SURGE — mechanic shared v2 + v3 (v2 policy in `src/v2/shadowking-policy.ts`)
- Target Dark (Dark Lord) win rate: **18–22% pooled** — both engines' target; **v3 is LOCKED** at this
  band at the Herald default-OFF point (§9). See `docs/handoff/state.json` for the latest measured numbers.
- Acts: Whisper → March → Reckoning, advanced by Blight thresholds + patience cap (`PATIENCE_CAP = 3`) —
  shared concept (v2 + v3)
- Actions per turn: 2 normal (`ACTIONS_NORMAL`, both engines). `ACTIONS_BROKEN` (1) is **v2 only** — v3
  retired the Broken state for full elimination.
