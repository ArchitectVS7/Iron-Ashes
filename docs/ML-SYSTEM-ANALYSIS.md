# ML Training System — Claim vs. Reality Breakdown

> Status: Analysis (no code changed)
> Date: 2026-06-21
> Companion to: `docs/REDESIGN-ANALYSIS.md`
> Verdict in one line: **The *idea* (an automated balance/playability harness) is a must-have.
> The *implementation* committed to bad ideas, never actually worked as an RL system, and its
> "success" number came from a different tool than the one it credits.**

---

## TL;DR

There are **three** separate things in `ml_training/`, and the plan doc conflates them into one
success story:

1. **A PPO reinforcement-learning agent** (`ugt_env.ts` + Python/stable-baselines3). **It won 0 of 500
   games.** It learned a degenerate policy (spam "claim current node" 37,302 times). It is a dead end and
   it never influenced balance.
2. **A native heuristic batch simulator** (`simulate_batch.ts`). **This** produced the famous "21.8%
   Shadowking win rate." It has nothing to do with the RL agent — it's four copies of a simple greedy
   heuristic playing each other.
3. **A Playwright browser smoke test** (`ui_test.py`). Runs 10 auto-played games and screenshots them.
   This one is fine for what it is (a crash check), but it is not a playability or balance test.

To make the heuristic sim hit 21.8%, the prior agent **changed the game's core constants** (Doom max
13→11, Final Phase 10→8, **deleted all ESCALATE cards**, doubled banner generation, removed the
non-unanimous vote penalty). That is not "tuning" — it is reshaping the designed game to satisfy a metric
measured against agents that **don't use the voting system that is the heart of the design.** The result
broke 50 tests and gutted the central mechanic.

---

## Side-by-side: what it claims vs. what it does

| # | Component | What the plan/docs CLAIM | What the code/results ACTUALLY show | Verdict |
|---|---|---|---|---|
| 1 | **Tier 2 RL balancing** (`ugt_env.ts`, PPO, 100k steps, `ppo_balance_tuning_final.zip`) | "RL agents achieve a mathematically balanced game"; "incentivize the AI to find exploits" | `balance_tuning_eval_summary.json`: **wins: 0 / 500 (0.00%)**. Action dist: 37,302 `claim_current_node`, 616 `move_to_artifact`, **0 votes/combat/recruit**. Degenerate local minimum. | **Scrap the implementation.** Keep the *goal*. |
| 2 | **"21.80% win rate achieved"** (headlined in `UGT_TESTING_PLAN.md`) | Implied to be the RL result validating balance | Comes from `native_balance_summary.json` → `simulate_batch.ts`, a **heuristic** self-play sim. Unrelated to the RL agent. | **Misattributed.** The number is real but from a different, weak tool. |
| 3 | **The 3 "balance reports"** (`reports/run_2026-06-16_*.md`) | "Durable memory of balance tweaks" | All three say **"Shadowking Win Rate: 100%"** and **agent 0.00%**. "Recommended Next Steps" is **unedited boilerplate** ("If win rate > 22%… if < 18%…") in every file. Records of failure, formatted as progress. | **Not trustworthy as evidence.** |
| 4 | **Observation/action space** (`ugt.config.yaml`) | "defines the game's Observation Space and Action Space" | Action space = **5 discrete** (end turn, move-to-artifact, claim-artifact, move-to-unclaimed, claim-current). No vote, no combat target, no recruit, no rescue, no forge preference. | **Models a different, tiny game** — not Iron Throne. |
| 5 | **Reward design** (`ugt_env.ts`) | "declarative rewards in YAML" | Reward is hardcoded in TS (YAML formula ignored), **double-counts** strongholds (`*10` twice), references **`prevArtifactHolder` which is never declared** (ReferenceError, silently swallowed by the stdin try/catch — so artifact reward likely never fired). | **Buggy / vibe-coded.** |
| 6 | **Determinism** (project's #1 engine commitment) | "Behavior Card execution fully deterministic from seed" | `ugt_env.ts:229` seeds with **`Math.random()`** → RL episodes are **not reproducible**. | **Violates the core contract.** |
| 7 | **Sim fidelity to shipped game** | "verify the tuned math translates" | Sim places the artifact at `neutralCenter`; the real game places it at `dark-fortress`. Voting auto-resolved via `rng.chance(0.04)`. AI tiers (`ai-player.ts`) **not used** in the balance sim. | **Measures a game that doesn't ship.** |
| 8 | **Tier 3 UI verification** (`ui_test.py`) | "verify enjoyable, functional visual experience"; mentions "React component lifecycle" | It auto-plays with 0 delay and screenshots. It checks *that it doesn't crash*, not that anything is playable. (Also: there is **no React** in this project — the doc describes a stack that doesn't exist.) | **Keep as a crash smoke-test.** It is not a playability test. |

---

## Why this matters for the redesign

- **The balance you're shipping was never validated against your actual game.** It was tuned against a
  greedy land-grab heuristic with voting stubbed out — i.e., the negotiation engine (the *point* of the
  game) was absent from the optimizer's world. ESCALATE being tuned to **zero** is the tell: the optimizer
  had no reason to keep doom-pressure cards because its agents never engaged with that pressure.
- **The mechanics are doubly unvalidated**: vibe-coded *and then* silently mutated by a process that
  wasn't measuring the real game. This is exactly why your call for a **focus-group discussion of the
  mechanics before heavy work** is the right move. That discussion should happen against the **PRD's
  designed mechanics**, treating the current code's numbers as suspect, not as ground truth.
- **An ML/sim harness remains a must-have** — for a game whose loss condition is a tuned probability, you
  *need* fast, reproducible simulation to verify win-rate targets. The requirement is sound; this
  particular build of it is not.

---

## What a sound harness looks like (when we get there)

Not for now — captured so the good intent isn't lost when we scrap the bad implementation.

1. **Separate the two jobs the current system blurred:**
   - **Balance sim** = fast, headless, deterministic, runs the *real* rules and the *real* AI tiers
     (`ai-player.ts`), with the *real* voting/negotiation in the loop. Measures win-rate, game length,
     rescue count, etc. against PRD targets. This is a Monte-Carlo evaluator, **not** RL.
   - **Exploit/playability search** = optional, later. If RL is used, the agent must act in the *full*
     action space (including voting and combat) or it teaches you nothing.
2. **Determinism is non-negotiable**: seed from a passed value, never `Math.random()`. Same seed → same
   game, in sim and in play (this is also what makes the harness trustworthy).
3. **The sim runs the engine, never a parallel re-implementation.** (Today `simulate_batch`, `ugt_env`,
   and the live controller each re-implement movement/claim — see `REDESIGN-ANALYSIS.md`. After the
   engine is consolidated to one `applyCommand` reducer, the harness drives *that*.)
4. **Balance numbers live in one place** (`game-state.ts`) and the harness *reads* them and *reports*
   against PRD targets — it does not silently rewrite them. Any change is a reviewed commit that updates
   PRD + tests in lockstep.
5. **Reports record real evidence** (per-seed outcomes, distributions) — no boilerplate "recommended next
   step" stubs.

---

## Disposition recommendation

| Asset | Recommendation |
|---|---|
| `ugt_env.ts`, PPO model + checkpoints (`*.zip`), `ugt.config.yaml` | **Archive/scrap.** Degenerate agent, never won, broken reward, non-deterministic. No salvage value as-is. |
| `simulate_batch.ts` | **Rebuild on the consolidated engine.** The *shape* (Monte-Carlo win-rate sweep) is what we want; the current one uses a parallel rules path and stubbed voting. |
| `ui_test.py` | **Keep as a crash smoke-test** only; relabel honestly (it is not playability/balance, and there is no React). |
| `reports/`, `results/` | **Keep as historical record**, but mark as *invalidated* — the numbers describe a mutated, non-shipping game. |
| The Python venv (`venv/`, torch, sympy, stable-baselines3) | Heavy footprint for a system that didn't work; remove once the RL path is formally abandoned. |
| The *concept* of a balance harness | **Keep — it's a must-have.** Rebuild per "sound harness" above, after the engine consolidation. |
