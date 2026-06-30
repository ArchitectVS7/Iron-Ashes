# v3 Bounded-Rationality Noise Sweep — Stage 5l (diagnostic, NO tuning)

base seed 20260622 (40 seeds) · player counts 2/3/4 · competitive ·
35 matchups · 4200 games per noise level · 370.0s total · table-wide errorRate
(every seat equally fallible) drawn via SeededRandom (§7 determinism preserved).

**What errorRate is:** an AI-REALISM axis (the "d20 vs a skill check" knob from 5k) — with probability
`errorRate` each decision FAILS its skill check and the agent takes a worse LEGAL action. This pass does
NOT tune balance; the locked §9 tunables are untouched. errorRate=0 is byte-identical to the locked build.

## Band table (robustness of the §9 picture as noise rises)

| Metric \ errorRate | 0.0% | 5.0% | 10.0% | 15.0% | 20.0% |
|---|---|---|---|---|---|
| Dark win — pooled (§9 18-22) | 21.4% | 24.5% ✗ | 26.9% ✗ | 29.0% ✗ | 31.6% ✗ |
| Dark win — 2p | 22.6% | 23.5% | 22.6% | 24.1% | 26.1% |
| Dark win — 3p | 24.5% | 28.9% | 32.4% | 34.7% | 35.6% |
| Dark win — 4p | 17.1% | 21.1% | 25.6% | 28.4% | 33.1% |
| Attrition share of SK wins (<=40) | 26.5% | 31.9% | 32.9% | 31.6% | 32.5% |
| Dark-win path: doom / attrition | 15.7% / 5.7% | 16.7% / 7.8% | 18.0% / 8.9% | 19.9% / 9.2% | 21.3% / 10.3% |
| Mean rounds (§9 10-16) | 11.3 | 11.3 | 11.1 | 11.1 | 11.0 |
| Captures / game | 0.35 | 0.35 | 0.34 | 0.32 | 0.31 |
| Gambit deliberate fire (gf, 10-20) | 18.2% | 17.3% | 19.1% | 18.1% | 16.9% |
| Gambit fire all (gf) | 38.9% | 40.4% | 42.0% | 43.4% | 45.5% |
| Gambit deliberate WIN (gf) | 2.2% | 2.2% | 2.5% | 2.1% | 1.6% |
| Gambit deliberate conversion | 11.8% | 12.8% | 12.9% | 11.8% | 9.5% |
| Kill-the-Dark rate | 22.0% | 22.4% | 21.2% | 20.3% | 19.0% |
| Eliminations / game | 0.53 | 0.64 | 0.70 | 0.78 | 0.83 |
| Early-death flag (dead-time) | 8.7% | 8.4% | 8.5% | 9.9% | 10.8% |

## Dominance lens (does the win-share flatten or does a strategy grow under noise?)

| Metric \ errorRate | 0.0% | 5.0% | 10.0% | 15.0% | 20.0% |
|---|---|---|---|---|---|
| TOP archetype WR (<=30 guard) | 40.9% ✗ | 36.4% ✗ | 34.7% ✗ | 33.7% ✗ | 32.8% ✗ |
| TOP chosen strategy (gf) | cooperator @ 27.5% | cooperator @ 25.1% | cooperator @ 26.0% | cooperator @ 24.8% | cooperator @ 23.5% |
| COOPERATOR WR (per-seat) | 28.0% | 26.3% | 26.7% | 25.6% | 24.9% |
| GAMBLER WR (per-seat) | 40.9% | 36.4% | 34.7% | 33.7% | 32.8% |
| BASELINE WR (gf, field-filler) | 33.4% | 29.2% | 26.7% | 25.2% | 21.6% |

*WR = per-seat win rate. "gf" = gambler-free subset. BASELINE is the engine DEFAULT_AI_POLICY that also
fills every oneVsField filler seat, so it is structurally over-represented as "the field".*

## Read

### (a) Robustness — do the §9 bands HOLD as everyone errs?
**Mixed: two bands hold rock-solid, but the DARK-WIN band does NOT.**

- **Dark win — BREAKS.** 21.4% (clean) → 24.5 / 26.9 / 29.0 / 31.6% as errorRate climbs 5→20%. It leaves
  the 18-22 band immediately at errorRate=5% and rises ~monotonically (~+0.5pp dark-win per +1% error).
  This is a real, directional finding, not noise: *fallible play helps the Dark Lord.* The mechanism is the
  pledge defense — blocking the strike is a coordination problem, and a missed skill check means a seat
  under-pledges or wastes an action, so the table fails to muster the block more often. By player count it
  is the 3p/4p tables that inflate most (3p 24.5→35.6%, 4p 17.1→33.1%); 2p is far stiffer (22.6→26.1%),
  because a 2-hand defense degrades less than a 3-4-way coordination. **Verdict: the locked competitive
  balance is calibrated to FLAWLESS play and is fragile to human error in the Dark's favor. A realistic
  5-10% human-error rate already pushes the Dark to ~24-27%.** This is an honest fragility to record, NOT
  a thing to tune away in this diagnostic pass (errorRate is an AI-realism axis, not a §9 lever).
- **Attrition share — HOLDS.** 26.5% → 32.5%; stays well under the 40% guard at every level, so doom stays
  the co-primary (and in fact the PRIMARY) Dark path. The extra Dark wins under noise come mostly through
  doom_complete (15.7→21.3%), not table-collapse attrition (5.7→10.3%) — the Dark wins MORE but still wins
  the *right way* (the Keystone assault), so the path mix doesn't rot.
- **Rounds — HOLDS.** 11.3 → 11.0, dead-flat inside 10-16. Noise does not blow up or collapse game length;
  eliminations tick up (0.53→0.83/game) and early-death dead-time creeps (8.7→10.8%) but stay modest.

### (b) Dominance under noise — flatten toward even, or does a strategy grow?
**Everything FLATTENS toward even (~25%). No strategy grows. This strongly supports Option A.**

- **Top archetype (the gambler):** 40.9% → 32.8% — shrinks ~8pp toward even as the field errs. The gambler
  is a top-of-table number by *identity* (it gambles every game); its edge erodes once opponents also err.
- **Top CHOSEN strategy (cooperator):** already 27.5% under the 30% guard at clean, and it DROPS further
  (27.5→23.5% gf; 28.0→24.9% per-seat) toward even as noise rises. It does not grow — its clean edge came
  from *outlasting* a self-destructing aggressor, and when everyone (including the cooperator) errs, that
  edge decays rather than compounds.
- **Baseline (field-filler default):** 33.4% → 21.6% — the steepest fall of all. The clean-build "breach"
  was almost entirely this structurally-over-weighted neutral default (the oneVsField filler), and it is
  the first thing noise washes out.

**Read:** nothing GROWS under table-wide error; the win-share converges toward even from above. That is the
signature of a measurement/bot-tuning ARTIFACT, not a real strategic edge — a genuinely dominant strategy
would hold or widen its lead as opponents got sloppier, not regress to the mean. **Option A ("judge the
no-dominance guard on the top CHOSEN strategy") looks safe: the cooperator is under the guard at clean and
moves further under it with noise.**

### (c) Rare-but-dramatic — captures + deliberate gambit under fallible play
**Both SURVIVE — they neither vanish nor explode.**

- **Captures/game:** 0.35 → 0.31 — essentially flat (a gentle decline; the verb keeps firing).
- **Deliberate gambit fire (gf):** 18.2% → 16.9% — stays inside the 10-20 §9 band at EVERY noise level; the
  go-for-the-throne play remains a real ~1-in-6 event under fallible play.
- **Deliberate gambit conversion:** 11.8% → 9.5% — slightly harder to convert under noise (sloppy play
  punishes the throne-runner a touch), but the deliberate WIN rate stays ~2% — the drama still pays off
  rarely-but-really. Nothing degenerates into a coin-flip or disappears.

---
*Headline: the dominance and rare-event pictures are ROBUST to human error (Option A is safe; drama
survives), but the Dark-win band is NOT — it is tuned to flawless play and drifts up ~+0.5pp/1%-error in
the Dark's favor, worst on 3-4p tables via degraded pledge coordination. Recorded as a known fragility.*
