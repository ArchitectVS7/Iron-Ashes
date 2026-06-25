# Iron Throne of Ashes — Development Guide

## Agent Handover (read this first)

Before doing anything:
1. Run **`npm run handoff:check`** and read **`docs/handoff/state.json`** — the machine-checked source of
   truth for status (current stage, next action, verified test state).
2. Read **`docs/ROADMAP.md`** (resume point) and follow **`docs/AGENT-PROTOCOL.md`** — the enforced
   Definition of Done (`npm run verify` exits 0 → update state.json + ROADMAP + memory → commit →
   `npm run handoff:check` exits 0).

## Architecture

- **Engine:** Alliance Engine v2, built in TypeScript (`src/v2/`)
- **UI:** Vanilla-TS frontend in `src/ui-v2/`, served via Vite (`index.html`)
- **Test framework:** Vitest (`tests/v2/`)
- **RNG:** `SeededRandom` in `src/utils/seeded-random.ts` — all game randomness goes through this

## Project Structure

```
src/
  v2/         # Game engine: reducer, combat, blight, blood-pact, sequencer, shadowking-policy,
              #   ai-player, actions, tunables, setup, board, events, commands, gambit, types
  v2/sim/     # Balance harness — deterministic Monte-Carlo over the real reducer (npm run sim)
  ui-v2/      # Frontend: main.ts (entry), session.ts, view.ts, board-view.ts, ui-v2.css
  utils/      # SeededRandom (shared with v2 and all scripts)
tests/
  v2/         # All tests — mirrors src/v2/ structure (jsdom environment)
  utils/      # seeded-random.test.ts
scripts/      # Balance tuning (.mjs), handoff check, verify, sim
docs/         # DESIGN-V2-ALGORITHM.md (authority for mechanics), ROADMAP.md, AGENT-PROTOCOL.md
```

**Authority:** `docs/DESIGN-V2-ALGORITHM.md` is the spec for v2 mechanics.

## Design Commitments (Non-Negotiable)

1. **Broken Court never prevents Voting Phase participation.** This must have automated test coverage.
2. **Behavior Card execution must be fully deterministic from a given seed.** Required for balance simulation.
3. **Voting Phase resolves before any player action phase.** Not configurable.
4. **All game randomness goes through `SeededRandom`.** Never use `Math.random()`.

## Engineering Principles — No Deferred Debt (Non-Negotiable)

**Fix issues first; do not accumulate technical debt while building more features.**

1. **Resolve or record — never carry vague deferrals.** Every open risk or known gap is either fixed
   now or written down as a *dated, owned decision* in `docs/ROADMAP.md`,
   `docs/handoff/state.json` `openRisks`, or a `docs/DESIGN-V2-*.md` doc.
2. **No hidden/unvalidated mechanics.** A shipped mechanic the sim can't exercise (a "human-only"
   feature) must be labeled UNTESTED in the spec and added to `docs/human-playtest-checklist.md`.
3. **No stale comments.** When behavior changes, fix the comments that describe it in the same change.
4. **Pre-commit/CI checks are sacred** (see the global rules): never `--no-verify`; a failure found
   in your session is yours to fix; "clean to commit" = zero failing tests.
5. **Fix-first ordering.** Front-load zero-risk debt paydown before balance-moving work.

## Commands

- `npm run dev` — Vite dev server (serves `src/ui-v2/` via `index.html`)
- `npm run build` — compile TypeScript (`tsc`)
- `npm run typecheck` — type check without emitting
- `npm run lint` — ESLint over `src/` and `tests/`
- `npm test` — run all tests (`vitest run`)
- `npm run test:watch` — run tests in watch mode
- `npm run sim` — run balance simulation (compiles then runs `scripts/sim.mjs`)
- `npm run verify` — handoff verification
- `npm run handoff:check` — machine-check `docs/handoff/state.json`

**Pre-push hook:** `core.hooksPath=.githooks`; `.githooks/pre-push` runs `npm run lint` and
`npm run test`. A push fails if either fails — keep both green (do not bypass with `--no-verify`).

## Coding Standards

- Strict TypeScript (`strict: true`) — no `any` types
- Prefer `readonly` for data that shouldn't mutate after creation
- Use interfaces for data shapes, classes only when behavior is needed
- Test files mirror source structure: `src/v2/combat.ts` → `tests/v2/combat.test.ts`

## Balance Parameters (from design spec)

- Behavior Deck: 6 SPAWN, 6 MOVE, 4 CLAIM, 3 ASSAULT, 1 ESCALATE
- Target Dark Lord win rate: 18–22%
- Doom Toll max: 13, Final Phase threshold: 10
- Actions per turn: 2 normal, 1 broken
