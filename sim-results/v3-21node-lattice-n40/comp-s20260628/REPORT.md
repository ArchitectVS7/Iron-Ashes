# Balance Sweep Report — v3-s20260628-n40

**4200 games** · base seed 20260628 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 54.4% | 18.0%–22.0% | ❌ FAIL |
| Mean game length (rounds) | 10.47 | 10–16 | ✅ PASS |
| Deliberate gambit fire (gambler-free, ~1-in-6-to-8) | 21.9% | 10.0%–20.0% | ❌ FAIL |

## No-dominant-strategy check
Even per-seat win share ≈ **15.2%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 115 | 6.5% |
| baseline | 3000 | 408 | 13.6% |
| cooperator | 1560 | 413 | 26.5% |
| gambler | 1480 | 362 | 24.5% |
| opportunist | 1640 | 251 | 15.3% |
| saboteur | 1440 | 191 | 13.3% |
| turtle | 1720 | 176 | 10.2% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.52** vs the field's **2.97**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 9 | 0.2% |
| doom_complete | 2275 | 54.2% |
| gambit_victory | 441 | 10.5% |
| last_standing | 42 | 1.0% |
| territory_victory | 1433 | 34.1% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 40.8% | raw gambler-free seize rate; the §9 band now judges the DELIBERATE split (below) |
| Gambit seize / win rate (all matchups) | 54.0% / 10.5% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.02 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 1.0% | share of games decided by the last Warlord standing |
| DK kills per game | 3.38 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 5.58 / 3.20 | social density (sworn) + betrayal drama (66.6% of oaths broken) |
| Forge tolls per game | 1.49 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 0.00 · 0.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 0.00 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 0.0% / 15.2% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 4.64 | how close the dark got |
| Pledge full-block rate | 35.1% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 76.6 · 7.35 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 0.4% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 43.1% | 9.9 | 0.03 | 67.7% |
| 3p | 1400 | 58.4% | 10.6 | 0.04 | 52.4% |
| 4p | 1400 | 61.6% | 10.9 | 0.00 | 41.8% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 1.36 / 0.46 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 34.2% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.25 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 18.7% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 54.2% / 0.2% | the §6 dark-win split; last-standing player ending 1.0% |
| Mean earliest elimination · dead-time proxy | 11.9 · 85.0% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 0.0% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 3 / 96 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 46.3% · 53.7% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 62.7% / 25.0% / 12.3% | §5.1 flip outcome mix |
| Court at March (median · mean pieces/seat) | 3 · 2.60 | T2-1 "feed the court" — the pitch's courts-of-3–4-by-March check |
| Passive-seat win rate (min engagement) | 43.0% | T2-2 "hiding is dangerous" — must sit BELOW the even share 15.2%; winner engagement 32.1 vs field 38.1 |
| Top archetype win rate (≤ 30.0% guard) | 26.5% | ✅ PASS — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 21.9% / 18.9% | split of the 40.8% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 53.7% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 39.3% / 14.7% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 2.8% / 2.3% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 10.3% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 25.9% | Q2 — is the dominance FAIL gambler-driven? (vs 26.5% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 15.2% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | cooperator @ 25.9% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 2409 | 57.4% |
| RECKONING | 1624 | 38.7% |
| WHISPER | 167 | 4.0% |

