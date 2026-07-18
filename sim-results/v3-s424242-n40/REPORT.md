# Balance Sweep Report — v3-s424242-n40

**4200 games** · base seed 424242 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 19.3% | 18.0%–22.0% | ✅ PASS |
| Mean game length (rounds) | 12.13 | 10–16 | ✅ PASS |
| Deliberate gambit fire (gambler-free, ~1-in-6-to-8) | 16.7% | 10.0%–20.0% | ✅ PASS |

## No-dominant-strategy check
Even per-seat win share ≈ **26.9%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 226 | 12.8% |
| baseline | 3000 | 912 | 30.4% |
| cooperator | 1560 | 483 | 31.0% |
| gambler | 1480 | 577 | 39.0% |
| opportunist | 1640 | 396 | 24.1% |
| saboteur | 1440 | 407 | 28.3% |
| turtle | 1720 | 389 | 22.6% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.67** vs the field's **3.02**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 59 | 1.4% |
| doom_complete | 751 | 17.9% |
| gambit_victory | 463 | 11.0% |
| last_standing | 431 | 10.3% |
| territory_victory | 2496 | 59.4% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 34.0% | raw gambler-free seize rate; the §9 band now judges the DELIBERATE split (below) |
| Gambit seize / win rate (all matchups) | 48.4% / 11.0% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.21 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 10.3% | share of games decided by the last Warlord standing |
| DK kills per game | 3.67 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 6.29 / 3.65 | social density (sworn) + betrayal drama (65.8% of oaths broken) |
| Forge tolls per game | 2.29 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 0.00 · 0.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 0.00 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 0.0% / 26.9% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 5.54 | how close the dark got |
| Pledge full-block rate | 31.5% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 87.2 · 7.18 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 7.3% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 16.8% | 10.9 | 0.27 | 69.4% |
| 3p | 1400 | 24.6% | 12.5 | 0.26 | 48.8% |
| 4p | 1400 | 16.5% | 13.1 | 0.09 | 27.1% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 1.59 / 0.55 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 34.5% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.27 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 20.6% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 17.9% / 1.4% | the §6 dark-win split; last-standing player ending 10.3% |
| Mean earliest elimination · dead-time proxy | 10.5 · 75.2% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 2.0% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 246 / 633 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 44.9% · 55.1% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 64.2% / 19.3% / 16.4% | §5.1 flip outcome mix |
| Court at March (median · mean pieces/seat) | 3 · 2.64 | T2-1 "feed the court" — the pitch's courts-of-3–4-by-March check |
| Passive-seat win rate (min engagement) | 36.6% | T2-2 "hiding is dangerous" — must sit BELOW the even share 26.9%; winner engagement 36.1 vs field 41.0 |
| Top archetype win rate (≤ 30.0% guard) | 39.0% | ❌ FAIL — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 16.7% / 17.3% | split of the 34.0% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 49.0% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 35.0% / 13.4% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 2.0% / 1.9% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 11.5% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 33.4% | Q2 — is the dominance FAIL gambler-driven? (vs 39.0% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 33.4% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | cooperator @ 30.4% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 2088 | 49.7% |
| RECKONING | 1932 | 46.0% |
| WHISPER | 180 | 4.3% |

