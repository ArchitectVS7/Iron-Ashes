# Balance Sweep Report — v3-s20260628-n40

**4200 games** · base seed 20260628 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 52.3% | 18.0%–22.0% | ❌ FAIL |
| Mean game length (rounds) | 10.68 | 10–16 | ✅ PASS |
| Deliberate gambit fire (gambler-free, ~1-in-6-to-8) | 15.5% | 10.0%–20.0% | ✅ PASS |

## No-dominant-strategy check
Even per-seat win share ≈ **15.9%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 110 | 6.3% |
| baseline | 3000 | 463 | 15.4% |
| cooperator | 1560 | 387 | 24.8% |
| gambler | 1480 | 405 | 27.4% |
| opportunist | 1640 | 243 | 14.8% |
| saboteur | 1440 | 224 | 15.6% |
| turtle | 1720 | 172 | 10.0% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.49** vs the field's **3.03**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 10 | 0.2% |
| doom_complete | 2186 | 52.0% |
| gambit_victory | 442 | 10.5% |
| last_standing | 100 | 2.4% |
| territory_victory | 1462 | 34.8% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 29.8% | raw gambler-free seize rate; the §9 band now judges the DELIBERATE split (below) |
| Gambit seize / win rate (all matchups) | 45.5% / 10.5% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.04 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 2.4% | share of games decided by the last Warlord standing |
| DK kills per game | 3.61 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 5.67 / 3.25 | social density (sworn) + betrayal drama (66.3% of oaths broken) |
| Forge tolls per game | 1.75 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 0.00 · 0.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 0.00 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 0.0% / 15.9% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 4.86 | how close the dark got |
| Pledge full-block rate | 35.5% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 77.3 · 7.27 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 0.5% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 41.9% | 10.0 | 0.07 | 64.1% |
| 3p | 1400 | 58.6% | 10.7 | 0.06 | 46.4% |
| 4p | 1400 | 56.3% | 11.3 | 0.00 | 26.1% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 1.42 / 0.51 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 35.6% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.23 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 17.6% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 52.0% / 0.2% | the §6 dark-win split; last-standing player ending 2.4% |
| Mean earliest elimination · dead-time proxy | 11.7 · 83.3% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 0.0% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 1 / 185 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 42.2% · 57.8% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 62.1% / 25.7% / 12.1% | §5.1 flip outcome mix |
| Court at March (median · mean pieces/seat) | 3 · 2.66 | T2-1 "feed the court" — the pitch's courts-of-3–4-by-March check |
| Passive-seat win rate (min engagement) | 44.8% | T2-2 "hiding is dangerous" — must sit BELOW the even share 15.9%; winner engagement 32.4 vs field 39.6 |
| Top archetype win rate (≤ 30.0% guard) | 27.4% | ✅ PASS — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 15.5% / 14.4% | split of the 29.8% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 51.8% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 34.2% / 11.4% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 1.2% / 1.2% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 7.6% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 24.0% | Q2 — is the dominance FAIL gambler-driven? (vs 27.4% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 17.2% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | cooperator @ 24.0% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 2343 | 55.8% |
| RECKONING | 1688 | 40.2% |
| WHISPER | 169 | 4.0% |

