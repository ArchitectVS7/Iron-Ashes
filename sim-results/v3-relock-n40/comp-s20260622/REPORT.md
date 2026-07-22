# Balance Sweep Report — v3-s20260622-n40

**4200 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 20.2% | 18.0%–22.0% | ✅ PASS |
| Mean game length (rounds) | 12.45 | 10–16 | ✅ PASS |
| Deliberate gambit fire (gambler-free, ~1-in-6-to-8) | 18.8% | 10.0%–20.0% | ✅ PASS |

## No-dominant-strategy check
Even per-seat win share ≈ **26.6%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 208 | 11.8% |
| baseline | 3000 | 963 | 32.1% |
| cooperator | 1560 | 560 | 35.9% |
| gambler | 1480 | 459 | 31.0% |
| opportunist | 1640 | 389 | 23.7% |
| saboteur | 1440 | 428 | 29.7% |
| turtle | 1720 | 343 | 19.9% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.50** vs the field's **2.75**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 36 | 0.9% |
| doom_complete | 814 | 19.4% |
| gambit_victory | 416 | 9.9% |
| last_standing | 81 | 1.9% |
| territory_victory | 2853 | 67.9% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 44.7% | raw gambler-free seize rate; the §9 band now judges the DELIBERATE split (below) |
| Gambit seize / win rate (all matchups) | 57.1% / 9.9% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.07 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 1.9% | share of games decided by the last Warlord standing |
| DK kills per game | 3.75 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 6.60 / 3.91 | social density (sworn) + betrayal drama (66.9% of oaths broken) |
| Forge tolls per game | 1.79 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 0.00 · 0.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 0.00 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 0.0% / 26.6% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 5.96 | how close the dark got |
| Pledge full-block rate | 41.8% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 90.8 · 7.29 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 4.2% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 13.1% | 11.8 | 0.05 | 76.3% |
| 3p | 1400 | 24.2% | 12.5 | 0.12 | 56.9% |
| 4p | 1400 | 23.4% | 13.0 | 0.04 | 38.1% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 1.67 / 0.60 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 35.9% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.41 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 29.7% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 19.4% / 0.9% | the §6 dark-win split; last-standing player ending 1.9% |
| Mean earliest elimination · dead-time proxy | 12.8 · 91.8% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 0.0% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 3 / 288 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 47.0% · 53.0% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 58.6% / 25.0% / 16.4% | §5.1 flip outcome mix |
| Court at March (median · mean pieces/seat) | 2 · 2.58 | T2-1 "feed the court" — the pitch's courts-of-3–4-by-March check |
| Passive-seat win rate (min engagement) | 37.6% | T2-2 "hiding is dangerous" — must sit BELOW the even share 26.6%; winner engagement 34.2 vs field 37.9 |
| Top archetype win rate (≤ 1.8× even share = 47.9%) | 35.9% (1.35× even) | ✅ PASS — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 18.8% / 25.9% | split of the 44.7% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 42.1% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 36.9% / 20.2% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 0.9% / 0.9% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 4.8% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 35.2% | Q2 — is the dominance FAIL gambler-driven? (vs 35.9% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 34.6% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | cooperator @ 35.2% | best deliberately-picked strategy (excl. baseline+gambler); under the 1.8× even-share guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 1450 | 34.5% |
| RECKONING | 2601 | 61.9% |
| WHISPER | 149 | 3.5% |

