# Balance Sweep Report — s20260622-n40

**3240 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
27 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 15.3% | 18.0%–22.0% | ❌ FAIL |
| Mean game length (rounds) | 11.60 | 10–16 | ✅ PASS |
| Gambit fire rate (~1-in-6-to-8) | 49.0% | 10.0%–20.0% | ❌ FAIL |
| Rescues per game | 0.20 | 2–4 | ❌ FAIL |

## No-dominant-strategy check
Even per-seat win share ≈ **26.4%**. ❌ FAIL — **gambler** dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1560 | 96 | 6.2% |
| baseline | 2560 | 613 | 23.9% |
| cooperator | 1360 | 295 | 21.7% |
| gambler | 1280 | 643 | 50.2% |
| opportunist | 1440 | 497 | 34.5% |
| turtle | 1520 | 418 | 27.5% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **1.60** vs the field's **1.79**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| all_broken | 183 | 5.6% |
| doom_complete | 495 | 15.3% |
| gambit_victory | 956 | 29.5% |
| territory_victory | 1606 | 49.6% |

