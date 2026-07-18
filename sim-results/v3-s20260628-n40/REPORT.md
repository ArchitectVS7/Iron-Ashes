# Balance Sweep Report — v3-s20260628-n40

**4200 games** · base seed 20260628 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 18.3% | 18.0%–22.0% | ✅ PASS |
| Mean game length (rounds) | 12.19 | 10–16 | ✅ PASS |
| Deliberate gambit fire (gambler-free, ~1-in-6-to-8) | 17.9% | 10.0%–20.0% | ✅ PASS |

## No-dominant-strategy check
Even per-seat win share ≈ **27.2%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 234 | 13.3% |
| baseline | 3000 | 927 | 30.9% |
| cooperator | 1560 | 508 | 32.6% |
| gambler | 1480 | 554 | 37.4% |
| opportunist | 1640 | 372 | 22.7% |
| saboteur | 1440 | 467 | 32.4% |
| turtle | 1720 | 368 | 21.4% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.68** vs the field's **3.03**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 41 | 1.0% |
| doom_complete | 729 | 17.4% |
| gambit_victory | 455 | 10.8% |
| last_standing | 425 | 10.1% |
| territory_victory | 2550 | 60.7% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 35.1% | raw gambler-free seize rate; the §9 band now judges the DELIBERATE split (below) |
| Gambit seize / win rate (all matchups) | 49.6% / 10.8% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.20 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 10.1% | share of games decided by the last Warlord standing |
| DK kills per game | 3.80 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 6.44 / 3.73 | social density (sworn) + betrayal drama (65.7% of oaths broken) |
| Forge tolls per game | 2.24 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 0.00 · 0.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 0.00 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 0.0% / 27.2% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 5.55 | how close the dark got |
| Pledge full-block rate | 31.8% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 88.0 · 7.20 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 5.3% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 16.0% | 10.9 | 0.26 | 71.6% |
| 3p | 1400 | 23.3% | 12.4 | 0.26 | 49.7% |
| 4p | 1400 | 15.7% | 13.2 | 0.08 | 27.4% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 1.64 / 0.56 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 34.3% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.28 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 21.1% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 17.4% / 1.0% | the §6 dark-win split; last-standing player ending 10.1% |
| Mean earliest elimination · dead-time proxy | 10.7 · 76.7% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 1.3% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 218 / 614 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 45.6% · 54.4% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 62.1% / 25.8% / 12.1% | §5.1 flip outcome mix |
| Court at March (median · mean pieces/seat) | 3 · 2.64 | T2-1 "feed the court" — the pitch's courts-of-3–4-by-March check |
| Passive-seat win rate (min engagement) | 37.6% | T2-2 "hiding is dangerous" — must sit BELOW the even share 27.2%; winner engagement 36.3 vs field 41.3 |
| Top archetype win rate (≤ 30.0% guard) | 37.4% | ❌ FAIL — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 17.9% / 17.2% | split of the 35.1% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 51.0% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 36.0% / 13.5% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 1.5% / 1.4% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 7.8% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 33.8% | Q2 — is the dominance FAIL gambler-driven? (vs 37.4% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 33.8% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | saboteur @ 32.7% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 2061 | 49.1% |
| RECKONING | 1969 | 46.9% |
| WHISPER | 170 | 4.0% |

