# THE RE-LOCK — v3 balance re-established on the shipped board (T-239)

**This is a TUNING stage — the first authorized tunable-VALUE edit since the lock was voided.**
Date: 2026-07-21. **User authorization (explicit, this session):** *"a re-lock is a 'rebalance and
lock' so we can be closer to spec than before? If so, that is an explicit go from me."* Outside a
re-locking task the standing rule is unchanged and back in force: **band misses are RECORDED, never
tuned.**

Board: the shipped **48-edge lattice + T-236 serpentine 6-node spoke** (unchanged by this task — no
board, engine, or topology edit). Baseline: the **T-238 reading** (`../v3-serpentine-spoke-n40/`),
which measured dark at 26.6 / 29.2% against the 18–22% §9 band.

Protocol: search on n=16 cells (`scripts/tune-v3-relock.mjs`, 4 rounds, both canonical seeds from
round 3 on), every candidate CONFIRMED at the full canonical n=40 sweep before adoption. Blood-Pact
re-pair via `scripts/tune-v3-bp-repair.mjs`. Both scripts are committed and reproducible.

---

## THE LOCK — new `HERALD_OFF_REBALANCE` values

| Lever | Was | **Now** | Role |
|---|---|---|---|
| `SPREAD_AMOUNT_BASE` | 2.6 | **2.2** | blight per landed strike — the dark-strength level dial |
| `DOOM_COST_MARCH` | 14 | **11** | the March pledge threshold — the 3p/4p shape lever |
| `DOOM_COST_PLAYER_DIVISOR` | 4.5 | **5.0** | the per-count curve — tightens the 2p↔4p spread |
| `SABOTEUR_COVER` | 0.735 | **0.755** | the Blood-Pact bluff dial — the traitor re-pair |

Everything else in the overlay is **untouched**: `BLIGHT_TO_ASH` 3, `DOOM_COST_RECKONING` 17.5,
`DOOM_COST_PER_PLAYER` 6.6, `DK_PER_PLAYER` 0.5, `SURGE_SPREAD_MULT` 1.5,
`BLOOD_PACT_SPREAD_BONUS` 1.2. No base-const or `tunables.gen.ts` value changed; no engine change.

## Locked measurements (canonical 2-seed, n=40, 2/3/4p, 35 matchups — 9,120 games, `hitGuardCount = 0`)

### Competitive (Herald OFF — the shipped game)

| §9 check | s20260622 | s20260628 | Band | Verdict |
|---|---|---|---|---|
| **Shadowking win rate** | **20.24%** | **21.76%** | 18–22% | ✅ **PASS both** |
| Mean game length (rounds) | 12.45 | 12.48 | 10–16 | ✅ PASS both |
| Deliberate gambit fire (gambler-free) | 18.83% | 18.95% | 10–20% | ✅ PASS both |

| Guard | s622 | s628 | Verdict |
|---|---|---|---|
| No dominant strategy | pass | pass | ✅ |
| Top archetype vs guard (T-239 relative) | 35.9% = **1.35× even** | 35.4% = **1.36× even** | ✅ (≤1.8×) |
| Free-riding rewarded | no | no | ✅ |
| Non-terminating games | 0 | 0 | ✅ |

| Context | s622 | s628 |
|---|---|---|
| SK win 2p / 3p / 4p | 13.1 / 24.2 / 23.4 | 12.6 / 25.4 / 27.3 |
| doom / territory / last-standing ending share | 19.4 / 67.9 / 1.9% | 21.1 / 66.9 / 2.0% |
| Captures · ransoms per game | 1.67 · 0.60 | 1.72 · 0.62 |
| Kill-the-Dark fire rate | 29.7% | 29.4% |
| Attrition share of dark wins | 4.2% | 3.2% |
| Comeback rate | 53.0% | 51.2% |
| Mean nodes ashed | 5.96 | 5.93 |

### Blood Pact (Herald ON — advanced toggle)

| Metric | s622 | s628 | Target |
|---|---|---|---|
| **Traitor win rate** | **19.4%** | **19.7%** | ~20% ✅ |
| Traitor exposure rate | 61.9% | 65.6% | ~70% — **below (see frontier)** |
| Accusation accuracy | 76.6% | 79.5% | ~71%+ ✅ |
| Accusations resolved / game | 0.81 | 0.82 | — |

---

## What was rejected, and why (recorded so the next round doesn't re-walk it)

- **`BLIGHT_TO_ASH` 3→4** (pooled 8.5%) and **`DAWN_BLIGHT_ADVANCE` 1→0** (1.5%): far too coarse on
  this topology — both crash the doom path off the board. Neither is a re-lock lever here.
- **`DOOM_COST_MARCH` 14→12** (confirmed at n=40: 21.2 / **23.4% ❌**): *heats* the dark — 3p jumps to
  29–32%. The March threshold is **non-monotone** (a higher threshold means fewer landed strikes, but
  also fewer full blocks, and full blocks feed the dark's patience ratchet). 11 is the cool side.
- **`SPREAD_AMOUNT_BASE` 2.2→2.0 + `SURGE_SPREAD_MULT` 1.0** (confirmed at n=40: 16.5 / 18.0%):
  overcools, and 2p collapses to ~4.5% — the 2p game becomes effectively dark-proof. Bad shape.
- **`DOOM_COST_PIVOT` 3→3.5**: pushed deliberate gambit fire to 21.5% ❌ (band ceiling 20%).
- **`DOOM_COST_PER_PLAYER` 6.6→5.0**: sends 2p to 45.9%. The tilt is a 2p/4p-only lever (pivot 3).

## Known frontiers + thin margins (recorded, not hidden)

1. **The Blood-Pact win↔exposure frontier is real and steep.** `SABOTEUR_COVER` 0.750 → win 17.4% /
   exposure 68.0%; **0.755 → win 19.6% / exposure 63.8%** (adopted); 0.770 → win 23.2% / exposure
   57.7%. Traitor win and exposure cannot both sit on target on this board — the same joint tightness
   the v2-era 5e lock recorded. **Adopted the win-rate-first point** (traitor win is the headline BP
   band); if exposure matters more to a future playtest, `SABOTEUR_COVER: 0.750` is the documented
   alternative and needs no other change.
2. **`BLOOD_PACT_SPREAD_BONUS` is now a DEAD LEVER.** 1.2 / 1.35 / 1.5 / 1.7 produce **byte-identical**
   BP results — its historical step function has saturated on this board, so it no longer does
   anything. Left at 1.2 (changing it is a no-op) and recorded here rather than silently kept as a
   "tunable" that tunes nothing. A future BP re-tune should treat `SABOTEUR_COVER` as the only live
   dial until this is re-derived.
3. **Two margins are thin.** Deliberate gambit fire sits at 18.8 / 19.0% against a 20% ceiling (the
   cost of `DOOM_COST_MARCH` 11 — it is the lever that both cools the dark and lifts gambit fire), and
   s20260628's dark win at 21.76% is 0.24 pp inside the ceiling. Both PASS, and both are close enough
   that a future AI or topology change could push them out — check these two first after any change.
4. **The 2p cell runs cold** (13.1 / 12.6% vs a 20% pooled target). The per-count spread is ~11–15 pp.
   Only pooled is banded by §9, so this is in-spec, but 2p is the weakest-shaped count.

## Verdict

The §9 balance lock is **RE-ESTABLISHED** on the shipped 21-node serpentine board — the first time
all three competitive bands pass together on any 21-node topology, with every guard green and the
Blood-Pact traitor economy back on its ~20% target. The M2.5/M2.6 topology exception that voided the
lock is **CLOSED**: `src/v3/tunables.ts` is frozen again at these values, and from this commit on a
band miss is recorded, never tuned, unless the user opens another re-lock.
