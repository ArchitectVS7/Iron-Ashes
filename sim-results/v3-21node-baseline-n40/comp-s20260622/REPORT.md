# Balance Sweep Report — v3-s20260622-n40

**4200 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 53.4% | 18.0%–22.0% | ❌ FAIL |
| Mean game length (rounds) | 10.62 | 10–16 | ✅ PASS |
| Deliberate gambit fire (gambler-free, ~1-in-6-to-8) | 14.6% | 10.0%–20.0% | ✅ PASS |

## No-dominant-strategy check
Even per-seat win share ≈ **15.5%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 109 | 6.2% |
| baseline | 3000 | 472 | 15.7% |
| cooperator | 1560 | 372 | 23.8% |
| gambler | 1480 | 392 | 26.5% |
| opportunist | 1640 | 243 | 14.8% |
| saboteur | 1440 | 214 | 14.9% |
| turtle | 1720 | 156 | 9.1% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.54** vs the field's **3.05**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 11 | 0.3% |
| doom_complete | 2231 | 53.1% |
| gambit_victory | 451 | 10.7% |
| last_standing | 86 | 2.0% |
| territory_victory | 1421 | 33.8% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 29.0% | raw gambler-free seize rate; the §9 band now judges the DELIBERATE split (below) |
| Gambit seize / win rate (all matchups) | 44.5% / 10.7% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.04 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 2.0% | share of games decided by the last Warlord standing |
| DK kills per game | 3.63 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 5.65 / 3.22 | social density (sworn) + betrayal drama (65.8% of oaths broken) |
| Forge tolls per game | 1.69 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 0.00 · 0.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 0.00 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 0.0% / 15.5% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 4.83 | how close the dark got |
| Pledge full-block rate | 35.3% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 76.4 · 7.22 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 0.5% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 44.8% | 9.8 | 0.06 | 62.3% |
| 3p | 1400 | 58.6% | 10.7 | 0.07 | 45.6% |
| 4p | 1400 | 56.7% | 11.3 | 0.00 | 25.4% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 1.32 / 0.44 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 33.1% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.22 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 17.0% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 53.1% / 0.3% | the §6 dark-win split; last-standing player ending 2.0% |
| Mean earliest elimination · dead-time proxy | 11.8 · 84.2% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 0.0% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 5 / 176 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 45.0% · 55.0% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 58.6% / 24.8% / 16.6% | §5.1 flip outcome mix |
| Court at March (median · mean pieces/seat) | 3 · 2.63 | T2-1 "feed the court" — the pitch's courts-of-3–4-by-March check |
| Passive-seat win rate (min engagement) | 43.1% | T2-2 "hiding is dangerous" — must sit BELOW the even share 15.5%; winner engagement 32.8 vs field 39.9 |
| Top archetype win rate (≤ 30.0% guard) | 26.5% | ✅ PASS — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 14.6% / 14.4% | split of the 29.0% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 50.4% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 33.3% / 11.1% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 1.6% / 1.5% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 10.4% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 22.6% | Q2 — is the dominance FAIL gambler-driven? (vs 26.5% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 17.5% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | cooperator @ 22.6% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 2383 | 56.7% |
| RECKONING | 1643 | 39.1% |
| WHISPER | 174 | 4.1% |

