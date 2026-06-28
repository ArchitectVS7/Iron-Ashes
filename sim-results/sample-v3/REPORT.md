# Balance Sweep Report — v3-s20260622-n40

**4200 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 25.2% | 18.0%–22.0% | ❌ FAIL |
| Mean game length (rounds) | 10.40 | 10–16 | ✅ PASS |
| Gambit fire rate (gambler-free, ~1-in-6-to-8) | 33.4% | 10.0%–20.0% | ❌ FAIL |

## No-dominant-strategy check
Even per-seat win share ≈ **24.9%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 403 | 22.9% |
| baseline | 3000 | 554 | 18.5% |
| cooperator | 1560 | 515 | 33.0% |
| gambler | 1480 | 626 | 42.3% |
| opportunist | 1640 | 450 | 27.4% |
| saboteur | 1440 | 270 | 18.8% |
| turtle | 1720 | 324 | 18.8% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.44** vs the field's **2.86**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 801 | 19.1% |
| doom_complete | 257 | 6.1% |
| gambit_victory | 816 | 19.4% |
| last_standing | 1206 | 28.7% |
| territory_victory | 1120 | 26.7% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 33.4% | the HONEST gambit number (judge the §9 band on this) |
| Gambit seize / win rate (all matchups) | 48.3% / 19.4% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 1.10 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 28.7% | share of games decided by the last Warlord standing |
| DK kills per game | 2.40 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 5.58 / 3.19 | social density (sworn) + betrayal drama (66.0% of oaths broken) |
| Forge tolls per game | 0.79 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 2.90 · 45.1% | build-identity uptake (§ Herald) |
| Herald captures/game | 1.55 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 25.4% / 24.5% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 7.02 | how close the dark got |
| Pledge full-block rate | 43.5% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 74.1 · 7.11 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 75.7% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 17.2% | 9.1 | 0.81 | 49.9% |
| 3p | 1400 | 31.5% | 10.4 | 1.22 | 48.1% |
| 4p | 1400 | 26.9% | 11.7 | 1.27 | 46.9% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 0.01 / 0.00 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 30.9% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.17 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 10.6% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 6.1% / 19.1% | the §6 dark-win split; last-standing player ending 28.7% |
| Mean earliest elimination · dead-time proxy | 9.7 · 69.3% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 7.8% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 392 / 4236 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 34.9% · 65.1% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 62.7% / 20.9% / 16.5% | §5.1 flip outcome mix |
| Top archetype win rate (≤ 30.0% guard) | 42.3% | ❌ FAIL — no single strategy should dominate |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 1108 | 26.4% |
| RECKONING | 2994 | 71.3% |
| WHISPER | 98 | 2.3% |

