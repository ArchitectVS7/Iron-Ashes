# Balance Sweep Report — v3-s20260622-n40

**4200 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 52.2% | 18.0%–22.0% | ❌ FAIL |
| Mean game length (rounds) | 10.50 | 10–16 | ✅ PASS |
| Deliberate gambit fire (gambler-free, ~1-in-6-to-8) | 20.6% | 10.0%–20.0% | ❌ FAIL |

## No-dominant-strategy check
Even per-seat win share ≈ **15.9%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 96 | 5.5% |
| baseline | 3000 | 443 | 14.8% |
| cooperator | 1560 | 423 | 27.1% |
| gambler | 1480 | 398 | 26.9% |
| opportunist | 1640 | 261 | 15.9% |
| saboteur | 1440 | 207 | 14.4% |
| turtle | 1720 | 180 | 10.5% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.59** vs the field's **3.01**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 6 | 0.1% |
| doom_complete | 2186 | 52.0% |
| gambit_victory | 475 | 11.3% |
| last_standing | 40 | 1.0% |
| territory_victory | 1493 | 35.5% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 40.9% | raw gambler-free seize rate; the §9 band now judges the DELIBERATE split (below) |
| Gambit seize / win rate (all matchups) | 53.9% / 11.3% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.02 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 1.0% | share of games decided by the last Warlord standing |
| DK kills per game | 3.45 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 5.63 / 3.21 | social density (sworn) + betrayal drama (66.0% of oaths broken) |
| Forge tolls per game | 1.54 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 0.00 · 0.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 0.00 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 0.0% / 15.9% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 4.68 | how close the dark got |
| Pledge full-block rate | 34.7% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 76.7 · 7.31 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 0.3% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 44.2% | 9.7 | 0.03 | 67.0% |
| 3p | 1400 | 54.9% | 10.7 | 0.04 | 52.3% |
| 4p | 1400 | 57.4% | 11.2 | 0.01 | 42.4% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 1.32 / 0.44 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 33.1% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.24 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 18.5% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 52.0% / 0.1% | the §6 dark-win split; last-standing player ending 1.0% |
| Mean earliest elimination · dead-time proxy | 12.2 · 87.0% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 0.0% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 5 / 93 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 44.9% · 55.1% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 58.2% / 25.1% / 16.7% | §5.1 flip outcome mix |
| Court at March (median · mean pieces/seat) | 2 · 2.57 | T2-1 "feed the court" — the pitch's courts-of-3–4-by-March check |
| Passive-seat win rate (min engagement) | 41.5% | T2-2 "hiding is dangerous" — must sit BELOW the even share 15.9%; winner engagement 33.0 vs field 38.8 |
| Top archetype win rate (≤ 30.0% guard) | 27.1% | ✅ PASS — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 20.6% / 20.3% | split of the 40.9% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 50.3% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 38.0% / 15.9% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 2.9% / 2.6% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 12.8% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 26.8% | Q2 — is the dominance FAIL gambler-driven? (vs 27.1% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 16.4% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | cooperator @ 26.8% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 2367 | 56.4% |
| RECKONING | 1651 | 39.3% |
| WHISPER | 182 | 4.3% |

