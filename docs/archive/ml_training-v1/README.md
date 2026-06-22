# ARCHIVE — v1 ML training system (INVALIDATED)

> **These artifacts describe the OLD v1 engine and a process that did not measure the
> shipping game. They are retained only as a historical record. Do NOT trust their
> numbers.** See `docs/ML-SYSTEM-ANALYSIS.md` for the full breakdown.

## Why it was scrapped (summary)
- The PPO/RL agent (`ugt_env.ts` + a Python venv) **won 0 of 500 games**, learned a
  degenerate "claim current node" policy, was seeded with `Math.random()` (non-reproducible),
  and modelled a 5-action game with **voting stubbed out** — i.e. the negotiation engine, the
  point of the game, was absent from the optimizer's world.
- The headline **"21.8% Shadowking win rate"** came from a *different* tool
  (`simulate_batch.ts`, a greedy heuristic self-play sim over a **parallel re-implementation**
  of the rules), not the RL agent it was credited to.
- The three `reports/run_2026-06-16_*.md` are boilerplate (all say 100% SK win + unedited
  "recommended next steps").

## What was deleted (not archived)
- `venv/` (≈750 MB Python env), `models/` (PPO `.zip` checkpoints), `ugt_env.ts`,
  `ugt.config.yaml`, `simulate_batch.ts`, `generate_report.ts`, `ui_test.py`, and the
  `results/*.png` UI screenshots — all dead, large, or v1-only with no salvage value.

## What replaced it
A deterministic Monte-Carlo balance/strategy harness on the REAL v2 reducer + REAL diverse
archetype AI: **`src/v2/sim/`** + **`npm run sim`** (Stage 4). It drives the actual game (no
parallel rules path), reports honest PASS/FAIL vs the §9 targets and win-rate-by-archetype, and
is reproducible from a seed. See `docs/handoff/plan-stage4.md` and `sim-results/sample/`.

## Retained here (historical only)
- `UGT_TESTING_PLAN.md` — the original (over-claimed) tier-1/2/3 plan.
- `reports/` — the three boilerplate run reports.
- `results/` — the two summary JSONs (the real `native_balance_summary.json` and the
  degenerate `balance_tuning_eval_summary.json`).
