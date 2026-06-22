# Stage 4 — Balance & Strategy Validation Harness (approved plan)

In-repo mirror of the approved Stage-4 plan so the handover is self-contained.
Status of each sub-step is tracked in `docs/ROADMAP.md` §4 (4a–4f) and `docs/handoff/state.json`.

## Context
The v2 engine is at full spec parity (3a–3f). Stage 4 proves the game is **balanced across the
strategy space** before Stage 5 tunes numbers. The v1 "ML" failed instructively
(`docs/ML-SYSTEM-ANALYSIS.md`): a PPO/RL agent won 0/500 (degenerate, `Math.random()`-seeded, wrong
5-action space, voting stubbed); the "21.8%" came from a separate greedy heuristic sim over a
**parallel rules path** with one strategy. It measured a game that doesn't ship.

The fix: a **deterministic Monte-Carlo harness** driving the **real `applyCommand` reducer + real
pure-`f(state,seed)` AI** across many seeds and **diverse named archetypes** (aggressive→defensive),
reporting PASS/FAIL vs the §9 targets with real per-seed evidence.

### Assumed decisions (recommended defaults; user did not select — override if wrong)
- Archetype Monte-Carlo, **no neural RL** (optional RL exploit-search is a possible later add-on).
- Stage 4 **measures frozen shipped defaults**; tunable-sweeping is Stage 5 (build the seam now).
- **Competitive first**; full Blood-Pact saboteur/traitor balance is `4f`.
- v1 `ml_training/` cruft deleted/archived as its own commit, **confirmed before deleting**.

## Targets (ALGORITHM §9)
Shadowking win 18–22% · 10–16 rounds · Gambit ~1-in-6-to-8 · 2–4 rescues/game · **no dominant
strategy / pledge line** (free-rider question, §4.2 step 5).

## Layout constraint
`tsconfig` typechecks only `src/`; `verify.mjs` lints `src/v2 tests/v2` + tests `tests/v2`. So the
harness library lives under **`src/v2/sim/`** → auto-covered by the DoD gate. Expensive sweep *runs*
are a **script** (`scripts/sim.mjs`), not a test (would blow the 120s suite timeout).

## Files
- `src/v2/sim/driver.ts` — `playHeadlessGame(cfg)` (the one game loop; **done, 4a**).
- `src/v2/sim/archetypes.ts` — `ARCHETYPES` roster; baseline === `DEFAULT_AI_POLICY` (4b).
- `src/v2/sim/matchups.ts` — seat→archetype assignment designs (4c).
- `src/v2/sim/metrics.ts` — `computeMetrics(finalState)` pure, from state + actionLog (4d).
- `src/v2/sim/sweep.ts` — `runSweep(cfg)` over seeds × count × mode × matchup (4c).
- `src/v2/sim/report.ts` — aggregate → PASS/FAIL + win-rate-by-archetype + free-rider (4d).
- `scripts/sim.mjs` + `npm run sim` → `sim-results/<runId>/` (gitignored) (4e).

## Archetype knobs (extend `AIPolicy`, additive, neutral = today's behavior)
`pledgeGenerosity`(1.0) · `aggression`(0)+`raidLeaderBias`(0) · `defensiveness`(0) ·
`claimVsRaidPref`(1.0) · `gambitAmbition`(0) · BP: `auditPropensity`/`accusePropensity`/
`saboteurPledgeSuppression`(0). **Default-preservation:** `chooseAction` delegates to the untouched
legacy body when `policy === DEFAULT_AI_POLICY` (referential identity) — one-line guarantee that the
existing tests + §7.12 stay green.

## Phasing (each: verify 0 → state.json + ROADMAP §4 box + memory → commit → handoff:check)
4a extract driver ✓ · 4b archetypes · 4c matchups+sweep · 4d metrics+report · 4e CLI+run ·
4f Blood Pact + v1 `ml_training/` cleanup. Stage-5 seam: thread an optional unused `tunables?` later.

## Verification
Harness library + `tests/v2/sim-*.test.ts` auto-gated by `npm run verify`. Determinism asserted
(byte-identical re-run). Metrics unit-tested on hand-built terminal states (not a re-implementation).
End-to-end: `npm run sim` writes a real `REPORT.md` with the §9 PASS/FAIL + dominance + free-rider verdicts.
