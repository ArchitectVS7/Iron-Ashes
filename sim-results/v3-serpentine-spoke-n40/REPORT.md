# 48-edge lattice + SERPENTINE SPOKE balance READING — v3 (T-238)

**This is a MEASUREMENT of the shipped board. Nothing is tuned. Zero tunable-value edits.**
Date: 2026-07-21. Board: the **sixth-review 48-edge lattice** (`data/board-v3.json`, still 21 nodes =
Keystone + 4 approaches + 4 forges + 4 keeps + 8 holdings + 4 cardinal mid-belt) with the **T-236
serpentine blight spoke**. Two changes separate this run from the T-233 reading, and the deltas below
are their **combined** effect (they landed together and were never measured apart):

1. **The user's sixth-review edge rework** — 52 → **48 undirected edges**: the 4 approach↔forge and 4
   keep↔mid spokes removed, the mid↔mid square swapped for 8 mid↔forge edges.
2. **T-236's serpentine spoke** — the doom path per quadrant went from the 4-node
   `seam → Forge → Approach → Keystone` to the 6-node, edge-real
   `seam Holding → Mid((q+3) mod 4) → Forge(q) → Mid(q) → Approach(q) → Keystone`.

The §9 balance lock **stays VOIDED** under the M2.5/M2.6 topology exception. This is a **MEASUREMENT,
not a tuning stage** — every band verdict below is **recorded, nothing is tuned.**

Protocol: the canonical 2-seed sweep — base seeds **20260622** and **20260628**, each **n=40**, player
counts 2/3/4, both modes (competitive + `--bloodpact`). Identical seeds/AI to the T-227 ring and T-233
lattice baselines, so the deltas are attributable purely to the board change. Sub-run REPORTs live under
`comp-s20260622/`, `bp-s20260622/`, `comp-s20260628/`, `bp-s20260628/`. All four sub-runs exited **0**
with **hitGuardCount = 0** (no termination-guard hit).

**The delta baseline here is the T-233 52-edge lattice** (`sim-results/v3-21node-lattice-n40/`). The
17-node §9 lock evidence is preserved untouched at `sim-results/v3-s20260622-n40{,-bp}` and
`sim-results/v3-s20260628-n40{,-bp}` — this run overwrote those dirs during simulation, then restored
them via `git checkout` (the exact T-227/T-233 handling), so they still hold the 17-node numbers as the
historical regression gate.

---

## Headline — competitive (Herald OFF, the shipped game)

| Metric | serp s622 | serp s628 | lattice s622 (T-233) | lattice s628 (T-233) | Δ (pooled, serp−lattice) |
|---|---|---|---|---|---|
| **Shadowking (dark) win — pooled** | **26.6%** ❌ | **29.2%** ❌ | 52.2% ❌ | 54.4% ❌ | **−25.4 pp** (miss shrank 31 pp → 5.9 pp) |
| SK win 2p / 3p / 4p | 18.9 / 32.2 / 28.8 | 19.7 / 34.4 / 33.6 | 44.2 / 54.9 / 57.4 | 43.1 / 58.4 / 61.6 | 2p **−24.4**, 3p −23.4, 4p **−28.4** |
| Mean rounds | 12.28 ✅ | 12.25 ✅ | 10.50 ✅ | 10.47 ✅ | **+1.78 rounds** |
| **Dark win by path — doom / attrition** | 24.7 / 1.9 | 27.8 / 1.5 | 52.0 / 0.14 | 54.2 / 0.21 | doom **−26.8 pp**; attrition **+1.5 pp** |
| Attrition share of SK wins | 7.15% | 5.05% | 0.27% | 0.39% | **+5.8 pp** |
| doom_complete ending share | 24.7% | 27.8% | 52.0% | 54.2% | −26.8 pp |
| territory_victory ending share | 60.1% | 57.2% | 35.5% | 34.1% | **+23.9 pp** |
| last_standing ending share | 5.05% | 5.29% | 0.95% | 1.00% | **+4.2 pp** |
| Mean nodes ashed (doom progress) | 6.32 | 6.27 | 4.68 | 4.65 | **+1.63** |
| **Captures per game** | 1.59 | 1.67 | 1.32 | 1.36 | **+0.29** |
| **Capture→ransom-back rate** | 33.8% | 33.2% | 33.1% | 34.2% | −0.2 pp |
| Ransoms per game | 0.54 | 0.55 | 0.44 | 0.46 | +0.10 |
| Kill-the-Dark fire rate | 23.6% | 23.6% | 18.5% | 18.7% | **+5.0 pp** |
| Heart assaults per game | 0.30 | 0.31 | 0.24 | 0.25 | +0.06 |
| **Deliberate gambit fire (gambler-free)** | **15.0%** ✅ | **15.3%** ✅ | 20.6% ❌ | 21.9% ❌ | **−6.1 pp — MISS RESOLVED** |
| Eliminations per game | 0.122 | 0.111 | 0.023 | 0.024 | **+0.093** |
| Top-archetype win guard (≤30%) | **34.3%** ❌ | **31.5%** ❌ | 26.8% ✅ | 25.9% ✅ | **+6.6 pp — NEW MISS (see below)** |
| Even per-seat win share (context) | 24.5% | 23.6% | 15.9% | 15.2% | +8.5 pp |
| No-dominant-strategy check | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | unchanged |
| Comeback rate | 54.8% | 53.2% | 55.1% | 53.7% | ≈0 |

### Reading

**The doom clock was the whole story.** Lengthening the spoke 4 → 6 nodes cut the dark's pooled win rate
by **25 pp** — from 52–54% down to **26.6 / 29.2%**, against the 18–22% §9 band. The overshoot that
three prior readings recorded as a hard structural miss (+31 pp) is now **+5.9 pp**. Everything moves in
the same direction and for the same reason: games run ~1.8 rounds longer, doom completes half as often
(52% → 25%), and territory victories absorb the difference (35% → 60%).

**Two of the three prior misses cleared themselves.** Deliberate gambit fire — the NEW miss T-233 filed
against the lattice (20.6 / 21.9%) — is back inside the band at **15.0 / 15.3% ✅**, without a single
tunable touched: the longer game dilutes the Keystone-occupancy spike the denser lattice created.
Mean-rounds stays green.

**The capture economy woke up.** Captures/game 1.32 → **1.59–1.67**, ransoms 0.44 → **0.55**,
Kill-the-Dark fire 18.5% → **23.6%**, heart assaults +25%, eliminations/game 0.023 → **0.12** (5×).
A longer game gives the marquee mechanics — the ones V3-5 flagged as nearly dead in sim — room to fire.
This is the healthiest capture/heart reading v3 has produced.

**The one new miss is a measurement artifact, not a dominance problem.** The top-archetype guard is an
ABSOLUTE ≤30% threshold that was set when the dark took roughly half of all games. With the dark down to
~28%, the human field now wins ~72% of games instead of ~47%, so the even per-seat share rose 15.9% →
24.5%. Cooperator at 34.3% is **1.40× even share**; on the lattice it was 26.8% = **1.69× even share**.
Relative dominance therefore *improved* while the absolute number crossed the guard, and the sim's own
no-dominant-strategy check still **passes** on both seeds. Recorded as a **guard-calibration** item for
the eventual re-lock (the threshold should be expressed relative to even share), **not tuned here**.

## Headline — Blood Pact (Herald ON, advanced toggle)

| Metric | serp s622 | serp s628 | lattice s622 (T-233) | lattice s628 (T-233) | Δ (pooled) |
|---|---|---|---|---|---|
| **Traitor win rate** | **18.3%** | **20.8%** | 33.1% | 35.3% | **−14.7 pp** |
| Traitor exposure rate | 73.3% | 68.3% | 62.8% | 59.4% | **+9.7 pp** |
| Accusation accuracy | 79.8% | 80.4% | 78.7% | 81.4% | ≈0 |
| Accusations resolved / game | 0.92 | 0.85 | 0.80 | 0.73 | +0.12 |

The **Blood-Pact triple** (traitor win / exposure / accuracy) is **s622 = 18.3 / 73.3 / 79.8;
s628 = 20.8 / 68.3 / 80.4** — landing on the historical v2-era design target of *~20% traitor win,
~70% exposure* almost exactly, from 33–35% win / 59–63% exposure on the lattice. The traitor's doom path
is the same path the dark walks, so the slower clock costs the traitor the same tempo it costs the
Shadowking, and the extra rounds give the table more accusation cycles (0.73 → 0.92 resolved per game).

## Verdict

- **Dark win rate: still a MISS (26.6 / 29.2% vs 18–22%), but no longer structural-looking.** The
  residual is **+5.9 pp pooled**, and it is concentrated at 3p/4p (2p is **18.9 / 19.7% — inside the
  band on both seeds**). A single-knob doom-pacing recalibration (`DOOM_COST_*` / `DAWN_BLIGHT_ADVANCE` /
  `SPREAD_AMOUNT_BASE` are the sanctioned levers per §13 `[T-236]`) is now a plausible re-lock path,
  where before the rewire it was not. **Not attempted here — this is a reading.**
- **Gambit-fire miss: RESOLVED** by the topology, zero edits.
- **Top-archetype guard: NEW miss, assessed as guard-calibration** (absolute threshold vs a field that
  now wins 72% of games); relative dominance improved and the dominance check passes.
- **Blood Pact: effectively on target** for the first time on a 21-node board.
- Zero engine, tunable, data, or board edits were made by this task. `hitGuardCount = 0` across 9,120
  games; both lock-dir regression baselines restored intact.
