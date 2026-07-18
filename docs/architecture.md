# Iron Throne of Ashes — Architecture

> **Status:** Active development — v3 current (balance-locked), v2 shipped-and-frozen
> **Version:** 2.0
> **Last Updated:** 2026-07-17
> **Author:** VS7

---

## System Overview

Iron Throne of Ashes is a browser-based digital board game: a turn-based political/combat
experience for 2–4 seats with a shared Doom loss condition enforced by an autonomous,
telegraphed antagonist (the Shadowking). There is no backend, no accounts, and no real-time
networking. All state lives in-process in the browser; the build target is a static bundle.

The repository carries **two parallel engines**, each with its own UI and its own balance
simulator:

- **`src/v2/`** — the shipped, frozen engine. Balance and mechanics are locked; it stays green
  and playable as the reference baseline. **Do not edit v2** except for test-timeout annotations.
- **`src/v3/`** — the current engine (redesign). Same deterministic substrate as v2, with a
  rebuilt defeat/roster/court model, an explicit fog-of-war projection, and a headless harness
  for automated trials. Balance is currently **LOCKED** (see §8 of `docs/ROADMAP-V3.md`).

Both engines are pure, reducer-driven, and deterministic from a seed. The v3→promotion plan
(retire v2 once v3 reaches parity) mirrors the earlier v1→v2 transition; see
[`docs/ROADMAP-V3.md`](./ROADMAP-V3.md) §5.

**Authorities:**
[`docs/DESIGN-V3-ALGORITHM.md`](./DESIGN-V3-ALGORITHM.md) is the spec for v3 mechanics
(§7 = the determinism contract, §9 = the balance bands).
[`docs/DESIGN-V2-ALGORITHM.md`](./DESIGN-V2-ALGORITHM.md) is the frozen-v2 spec.
The retired-surface story (v1 post-mortems, v2 focus-group rounds, v3 concept work) lives under
[`docs/design-history/`](./design-history/) — see the **History** section below.

---

## Repository Map

Every node below is a real path in the repo.

```
Iron-Ashes/
├── index.html            entry for the v2 UI  → /src/ui-v2/main.ts
├── index-v3.html         entry for the v3 UI  → /src/ui-v3/main.ts
├── vite.config.ts        Vite config (both UIs bundle)
├── vitest.config.ts      Vitest config (jsdom environment)
├── package.json          scripts (see Commands below)
│
├── src/
│   ├── v2/               shipped-and-frozen engine
│   ├── v3/               current engine (reducer core + fog projection + harness core)
│   ├── ui-v2/            vanilla-TS frontend for v2
│   ├── ui-v3/            vanilla-TS frontend for v3
│   └── utils/            SeededRandom + barrel (shared by both engines and all scripts)
│
├── data/                 hand-edited codegen inputs (tunables/board/archetypes JSON)
├── scripts/              codegen, sims, verify/handoff, tuning drivers (.mjs)
├── tests/                Vitest suites — mirrors src/ (utils, v2, v3)
├── harness/              UGT headless stdio shell (ugt-harness.mjs + README.md)
├── sim-results/          committed balance-sim outputs (one dir per run)
└── docs/                 specs, roadmaps, handoff, design-history
```

---

## The Two Engines

Both `src/v2/` and `src/v3/` share the same shape: a pure reducer (`applyCommand`) over a
plain, JSON-serializable `GameState`, fed a `Command` union, driven turn-by-turn by an AI or a
UI session. State is never mutated in place by callers — commands go through the reducer.

### Core files (both engines)

`reducer.ts` · `commands.ts` · `combat.ts` · `blight.ts` · `blood-pact.ts` · `sequencer.ts` ·
`shadowking-policy.ts` · `shadowking-effects.ts` · `ai-player.ts` · `actions.ts` · `gambit.ts` ·
`events.ts` · `setup.ts` · `board.ts` · `types.ts` · `index.ts` (barrel), plus the generated
`board.gen.ts` and `tunables.gen.ts`.

**v3 adds** its rebuilt-model files: `observable.ts` (fog projection), `capture.ts` (capture /
ransom economy), `court.ts` (archetype court), `difficulty.ts` (dark-strength tiers),
`discovery.ts` (hidden Discovery tokens), `elimination.ts` (defeat / wraith machinery),
`heart.ts` (Kill-the-Dark ending), and the harness core under `src/v3/harness/`.

### The reducer contract

- `applyCommand(state, command): CommandResult` is the single entry point
  (`src/v3/reducer.ts`, `src/v2/reducer.ts`). Invalid commands throw `InvalidCommandError`.
- The `Command` union and the `PlayerAction` shape live in `commands.ts`.
- The public API of each engine is its barrel `index.ts` — import from `src/v3` (or `src/v2`),
  never reach into submodules. v3's barrel re-exports `createGame` (from `setup.ts`),
  `applyCommand` / `InvalidCommandError` / `CommandResult`, `runAIPledge` / `runAITurn` (from
  `ai-player.ts`), and `observableState` / `SEED_REDACTED` (from `observable.ts`).

### Fog-of-war projection (v3)

`observableState(state, viewerSeat)` in [`src/v3/observable.ts`](../src/v3/observable.ts) is
**the only view any decider may read** (AI, wraith, or human). It returns a deep, decoupled
projection of `GameState` with the fog applied (per DESIGN-V3-ALGORITHM §7 D2, amended §13
P0-12):

- Unflipped Discovery tokens are reduced to their `sigil` only — the hidden `kind`, recruit
  archetype/name, and pre-bound bonus are stripped.
- `seed` is redacted to the non-numeric sentinel `SEED_REDACTED` (`'REDACTED'`), so a decider
  cannot re-derive hidden token content via `deriveToken(seed, nodeId)`.

The engine itself resolves flips from the full `GameState`; deciders read only the projection —
preserving fairness and the pure-policy contract.

---

## Determinism Contract (DESIGN-V3-ALGORITHM §7)

Determinism is a non-negotiable design commitment (see `CLAUDE.md`) because the balance
simulator replays the real reducer thousands of times and must be reproducible.

- **All randomness routes through `SeededRandom`** in
  [`src/utils/seeded-random.ts`](../src/utils/seeded-random.ts) (re-exported from
  `src/utils/index.ts`). No `Math.random()`, no `Date.now()`, no wall-clock reads anywhere under
  `src/`.
- **`GameState` is plain and JSON-serializable** — no class instances, closures, or `Map`/`Set`
  in the serialized shape; a game is fully reproducible from its `seed`.
- **No seed or unflipped-token leakage** to deciders — enforced by the `observableState`
  redaction above.

The full D1–D9 clauses live in [`docs/DESIGN-V3-ALGORITHM.md`](./DESIGN-V3-ALGORITHM.md) §7.

---

## The Two UIs

Both frontends are vanilla-TS (no framework), served by Vite, and render purely from engine
state through the reducer + `observableState` seams. Each is a mirror of the other's file set:

| UI | Directory | Entry HTML | Files |
|---|---|---|---|
| v2 | [`src/ui-v2/`](../src/ui-v2/) | [`index.html`](../index.html) → `/src/ui-v2/main.ts` | `main.ts`, `session.ts`, `view.ts`, `board-view.ts`, `ui-v2.css`, `vite-env.d.ts` |
| v3 | [`src/ui-v3/`](../src/ui-v3/) | [`index-v3.html`](../index-v3.html) → `/src/ui-v3/main.ts` | `main.ts`, `session.ts`, `view.ts`, `board-view.ts`, `ui-v3.css`, `vite-env.d.ts` |

`npm run dev` starts the Vite dev server; both entry HTMLs bundle from the same config
([`vite.config.ts`](../vite.config.ts)).

---

## Balance Simulation

Each engine ships a deterministic Monte-Carlo harness that drives the **real reducer** (not a
model of it) across matchups and seeds, then reports win rates against the balance bands.

| Engine | Sim source | Runner | Command |
|---|---|---|---|
| v2 | [`src/v2/sim/`](../src/v2/sim/) | [`scripts/sim.mjs`](../scripts/sim.mjs) | `npm run sim` |
| v3 | [`src/v3/sim/`](../src/v3/sim/) | [`scripts/sim-v3.mjs`](../scripts/sim-v3.mjs) | `npm run sim:v3` |

Each sim directory has the same layout: `driver.ts`, `archetypes.ts`, `matchups.ts`,
`metrics.ts`, `report.ts`, `search.ts`, `sweep.ts`, plus generated `archetypes.gen.ts`.

**Output convention** — each run writes to `sim-results/<runId>/` containing `rows.json`,
`summary.json`, and `REPORT.md`. v3 run IDs are `v3-`prefixed (e.g.
[`sim-results/v3-s20260717-n40`](../sim-results/v3-s20260717-n40/), plus the
[`sim-results/sample-v3/`](../sim-results/sample-v3/) reference set); v2 runs are unprefixed
(e.g. [`sim-results/sample/`](../sim-results/sample/)).

The balance bands are DESIGN-V3-ALGORITHM §9 (Shadowking / Dark-Lord target win rate 18–22%,
pooled across player counts). **Balance is LOCKED** — band misses are recorded in the ROADMAP,
never tuned away; `src/v3/tunables.ts` and the `*.gen.ts` values are not to be edited.

---

## Data & Codegen

Balance-sensitive tables are hand-edited as JSON under [`data/`](../data/) and compiled to
committed, checked-in TypeScript so the engine imports plain constants (no runtime JSON parse).

| Input | Command | Generated output |
|---|---|---|
| `data/tunables.json` | `npm run gen:data` ([`scripts/gen-data.mjs`](../scripts/gen-data.mjs)) | `src/v2/tunables.gen.ts` |
| `data/archetypes.json` | ″ | `src/v2/sim/archetypes.gen.ts` |
| `data/board.json` | ″ | `src/v2/board.gen.ts` |

Each `.gen.ts` header reads `GENERATED — DO NOT EDIT`. `npm run gen:data:check` verifies the
committed outputs match the JSON inputs and gates `npm run sim`.

**Recorded v3 data-split debt** (per [`docs/ROADMAP-V3.md`](./ROADMAP-V3.md) §0): the codegen
currently emits **v2 targets only**. v3's `src/v3/tunables.gen.ts`, `src/v3/board.gen.ts`, and
`src/v3/sim/archetypes.gen.ts` exist but were hand-forked rather than generated; `data/*.json`
still lists removed Broken/Rescue levers (inert — the engine reads the cleaned `.gen.ts`), and
four court tunables (`MARSHAL_POWER` / `STEWARD_POWER` / `HERALD_PIECE_POWER` / `STEWARD_INCOME`)
are plain literals in `src/v3/tunables.ts`. A `gen:data` resync is owed once v3 gets its own
`data/` directory. This is a dated, owned decision in the ROADMAP, not a silent gap.

---

## Tests

[`tests/`](../tests/) mirrors `src/`: each source file has a paired `*.test.ts`
(`src/v3/combat.ts` → `tests/v3/combat.test.ts`). Vitest runs in a **jsdom** environment
([`vitest.config.ts`](../vitest.config.ts)).

- [`tests/utils/`](../tests/utils/) — `seeded-random.test.ts`.
- [`tests/v2/`](../tests/v2/) — 36 test files.
- [`tests/v3/`](../tests/v3/) — 50 test files, plus a shared `fixtures.ts`.

Commands: `npm test` (all), `npm run test:v2`, `npm run test:v3`, `npm run test:watch`.

---

## Handoff & Verification

Agent handovers are machine-checked, not narrative. The Definition of Done is in
[`docs/AGENT-PROTOCOL.md`](./AGENT-PROTOCOL.md).

- [`scripts/verify.mjs`](../scripts/verify.mjs) → `npm run verify` (writes/refreshes state) and
  `npm run verify:check`.
- [`scripts/handoff-check.mjs`](../scripts/handoff-check.mjs) → `npm run handoff:check` —
  validates [`docs/handoff/state.json`](./handoff/state.json) against
  [`docs/handoff/state.schema.json`](./handoff/state.schema.json).

**Known state** (ROADMAP-V3 §0): `state.json` / `handoff:check` were repointed to v3 in T-008
(wired to `docs/ROADMAP-V3.md`); the v2-era roadmap now lives at `docs/archive-V2/ROADMAP.md`.

---

## UGT Harness

The [`harness/`](../harness/) directory is a headless, deterministic JSON-lines interface to the
real v3 engine, for the UGT ladder / trial (built in T-005 / T-006).

- [`harness/ugt-harness.mjs`](../harness/ugt-harness.mjs) is a thin Node **stdio shell** — a
  zero-logic JSON-lines transport. Every op routes to an engine seam the UI session already
  uses: `createGame`, `applyCommand`, `runAIPledge` / `runAITurn`, `observableState`. It adds no
  game rules and no validation the engine does not already perform.
- The pure request→response core is [`src/v3/harness/harness-core.ts`](../src/v3/harness/harness-core.ts)
  (with `sha256.ts`), typechecked and vitest-covered by `tests/v3/harness-core.test.ts` and
  `tests/v3/harness-stdio.test.ts`.

Run with `npm run harness` (`tsc && node harness/ugt-harness.mjs`). Because it drives the same
seams as the UI, harness runs are reproducible from a seed exactly like sim and UI sessions.
See [`harness/README.md`](../harness/README.md).

---

## Commands Reference

Mirrors [`package.json`](../package.json) `scripts`:

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server (both UIs) |
| `npm run build` | `tsc` compile |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `src/` and `tests/` |
| `npm test` / `npm run test:watch` | Vitest (all) / watch mode |
| `npm run test:v2` / `npm run test:v3` | Per-engine test runs |
| `npm run gen:data` / `npm run gen:data:check` | Data codegen / verify committed outputs |
| `npm run sim` / `npm run sim:v3` | Balance Monte-Carlo (v2 / v3) |
| `npm run verify` / `npm run verify:check` | Handoff verification |
| `npm run handoff:check` | Machine-check `state.json` |
| `npm run harness` | UGT headless stdio harness |

---

## Design Commitments (Non-Negotiable)

From `CLAUDE.md`, these hold across both engines and have automated coverage:

1. **A Broken/deposed seat never loses Voting/Pledging participation.** Must have test coverage.
2. **Command execution is fully deterministic from a seed** — required for balance simulation.
3. **The Voting/Pledge phase resolves before any player action phase** — not configurable.
4. **All game randomness goes through `SeededRandom`** — never `Math.random()`.

---

## History

The retired-surface narrative is **not** described here — it lives in
[`docs/design-history/`](./design-history/), which indexes the v1 post-mortems
(`REDESIGN-ANALYSIS.md`, `ML-SYSTEM-ANALYSIS.md` — why the earlier build and its ML "balance"
harness were scrapped), the v2 focus-group rounds and stress tests, and the v3 concept work
(`DESIGN-V3-CONCEPT.md`, `DESIGN-V3-FOCUS-GROUP.md`, `DESIGN-V3-STRESS-TEST.md`). Those documents
are provenance, not authority. For current mechanics read the ALGORITHM specs above.

---

## Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 2.0 | 2026-07-17 | VS7 | Full rewrite to match the real repo — two engines (`src/v2` frozen / `src/v3` current), two UIs, two sims, the §7 determinism contract, data codegen + recorded v3 split debt, handoff machinery, and the UGT harness. Retired the fictional v1 architecture description (its provenance now lives in `docs/design-history/`). |
| 1.0 | 2026-03-06 | VS7 | Initial draft — derived from codebase survey (described the retired v1 architecture). |
</content>
</invoke>
