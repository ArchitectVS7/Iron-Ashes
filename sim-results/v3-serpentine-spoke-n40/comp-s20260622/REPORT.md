# Balance Sweep Report — v3-s20260622-n40

**4200 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 26.6% | 18.0%–22.0% | ❌ FAIL |
| Mean game length (rounds) | 12.28 | 10–16 | ✅ PASS |
| Deliberate gambit fire (gambler-free, ~1-in-6-to-8) | 15.0% | 10.0%–20.0% | ✅ PASS |

## No-dominant-strategy check
Even per-seat win share ≈ **24.5%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 200 | 11.4% |
| baseline | 3000 | 841 | 28.0% |
| cooperator | 1560 | 547 | 35.1% |
| gambler | 1480 | 417 | 28.2% |
| opportunist | 1640 | 360 | 22.0% |
| saboteur | 1440 | 392 | 27.2% |
| turtle | 1720 | 324 | 18.8% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.70** vs the field's **3.03**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 80 | 1.9% |
| doom_complete | 1039 | 24.7% |
| gambit_victory | 343 | 8.2% |
| last_standing | 212 | 5.0% |
| territory_victory | 2526 | 60.1% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 35.5% | raw gambler-free seize rate; the §9 band now judges the DELIBERATE split (below) |
| Gambit seize / win rate (all matchups) | 49.2% / 8.2% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.12 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 5.0% | share of games decided by the last Warlord standing |
| DK kills per game | 3.83 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 6.49 / 3.81 | social density (sworn) + betrayal drama (66.3% of oaths broken) |
| Forge tolls per game | 1.89 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 0.00 · 0.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 0.00 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 0.0% / 24.5% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 6.32 | how close the dark got |
| Pledge full-block rate | 31.4% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 87.7 · 7.12 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 7.1% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 18.9% | 11.5 | 0.19 | 73.2% |
| 3p | 1400 | 32.2% | 12.3 | 0.13 | 49.7% |
| 4p | 1400 | 28.8% | 13.0 | 0.05 | 24.6% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 1.59 / 0.54 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 33.8% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.30 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 23.6% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 24.7% / 1.9% | the §6 dark-win split; last-standing player ending 5.0% |
| Mean earliest elimination · dead-time proxy | 12.3 · 88.1% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 0.1% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 7 / 505 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 45.2% · 54.8% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 58.4% / 25.2% / 16.4% | §5.1 flip outcome mix |
| Court at March (median · mean pieces/seat) | 2 · 2.58 | T2-1 "feed the court" — the pitch's courts-of-3–4-by-March check |
| Passive-seat win rate (min engagement) | 34.9% | T2-2 "hiding is dangerous" — must sit BELOW the even share 24.5%; winner engagement 37.0 vs field 41.8 |
| Top archetype win rate (≤ 30.0% guard) | 35.1% | ❌ FAIL — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 15.0% / 20.6% | split of the 35.5% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 42.1% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 33.0% / 16.1% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 0.7% / 0.7% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 4.5% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 34.3% | Q2 — is the dominance FAIL gambler-driven? (vs 35.1% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 29.8% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | cooperator @ 34.3% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 1732 | 41.2% |
| RECKONING | 2331 | 55.5% |
| WHISPER | 137 | 3.3% |

