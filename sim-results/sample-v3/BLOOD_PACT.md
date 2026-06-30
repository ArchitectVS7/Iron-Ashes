# Blood Pact Sweep — v3 (post-5m, 5n 2-seed validation)

**360 traitor games per seed** · player counts 2/3/4 · an AI seat holds the Pact
(sim-only affordance). The body below is the canonical **base seed (20260622)** run;
the banner is the **Stage V3-5n 2-seed validation** (NO TUNING — same tunables as
the 5m re-tune, re-run across a second seed to confirm stability).

## V3-5n — blood-pact 2-seed validation (NO TUNING)

Re-ran the **post-5m** BP tunables (`BLOOD_PACT_SPREAD_BONUS = 0`, `SABOTEUR_COVER = 0.78`)
across the **base seed (20260622)** and a **second seed (20260628)**, blood_pact 2/3/4p
(360 games each). **No tunable was changed in this stage.** `npx tsc --noEmit`,
`npx eslint src/v3 tests/v3`, and `npx vitest run tests/v3` (532 tests) all green.
Competitive sweep `summary.json` verified **BYTE-IDENTICAL** vs the locked reference
(`sim-results/sample-v3/summary.json`) — the BP levers are mode-gated and do not leak.

### Blood-pact bands (both seeds)
| Metric | Band | seed 20260622 | seed 20260628 | Verdict |
|---|---|---|---|---|
| Traitor win rate (reaches doom unexposed) | 12–20% | **18.6%** ✅ | **16.1%** ✅ | HOLD · 2-seed STABLE |
| Traitor exposure rate (correctly accused) | 40–70% | **56.9%** ✅ | **58.6%** ✅ | HOLD · 2-seed STABLE |
| Accusation accuracy (correct / resolved) | ≥45% | **70.7%** ✅ | **72.3%** ✅ | HOLD · 2-seed STABLE |
| Accusations resolved per game | ≤2.5 | **0.81** ✅ | **0.81** ✅ | HOLD · 2-seed STABLE |

All four BP bands **HOLD** on both seeds and are **2-seed stable** after the 5m re-tune.

## Base-seed (20260622) detail

| Metric | Value |
|---|---|
| Traitor win rate (reaches doom unexposed) | 18.6% |
| Traitor exposure rate (correctly accused) | 56.9% |
| Accusations resolved per game | 0.81 |
| Accusation accuracy (correct / resolved) | 70.7% |

> Balance reading: the traitor wins sometimes but not freely (in band 12–20%), and
> accusations catch them well above chance (70.7% accuracy) — all four bands in target.
