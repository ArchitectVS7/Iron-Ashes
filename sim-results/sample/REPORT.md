# Balance Sweep Report — s20260622-n40

**4200 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 14.3% | 18.0%–22.0% | ❌ FAIL |
| Mean game length (rounds) | 11.91 | 10–16 | ✅ PASS |
| Gambit fire rate (~1-in-6-to-8) | 43.9% | 10.0%–20.0% | ❌ FAIL |
| Rescues per game | 0.10 | 2–4 | ❌ FAIL |

## No-dominant-strategy check
Even per-seat win share ≈ **27.8%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 179 | 10.2% |
| baseline | 3000 | 749 | 25.0% |
| cooperator | 1560 | 382 | 24.5% |
| gambler | 1480 | 664 | 44.9% |
| opportunist | 1640 | 616 | 37.6% |
| saboteur | 1440 | 387 | 26.9% |
| turtle | 1720 | 531 | 30.9% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **1.59** vs the field's **1.69**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| all_broken | 93 | 2.2% |
| doom_complete | 599 | 14.3% |
| gambit_victory | 1181 | 28.1% |
| territory_victory | 2327 | 55.4% |

