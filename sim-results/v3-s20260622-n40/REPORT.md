# Balance Sweep Report — v3-s20260622-n40

**4200 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 18.9% | 18.0%–22.0% | ✅ PASS |
| Mean game length (rounds) | 12.20 | 10–16 | ✅ PASS |
| Deliberate gambit fire (gambler-free, ~1-in-6-to-8) | 17.5% | 10.0%–20.0% | ✅ PASS |

## No-dominant-strategy check
Even per-seat win share ≈ **27.0%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 220 | 12.5% |
| baseline | 3000 | 972 | 32.4% |
| cooperator | 1560 | 484 | 31.0% |
| gambler | 1480 | 522 | 35.3% |
| opportunist | 1640 | 416 | 25.4% |
| saboteur | 1440 | 414 | 28.7% |
| turtle | 1720 | 377 | 21.9% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.70** vs the field's **3.03**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 48 | 1.1% |
| doom_complete | 747 | 17.8% |
| gambit_victory | 455 | 10.8% |
| last_standing | 411 | 9.8% |
| territory_victory | 2539 | 60.5% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 35.7% | raw gambler-free seize rate; the §9 band now judges the DELIBERATE split (below) |
| Gambit seize / win rate (all matchups) | 49.9% / 10.8% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.20 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 9.8% | share of games decided by the last Warlord standing |
| DK kills per game | 3.86 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 6.48 / 3.77 | social density (sworn) + betrayal drama (66.0% of oaths broken) |
| Forge tolls per game | 2.28 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 0.00 · 0.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 0.00 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 0.0% / 27.0% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 5.56 | how close the dark got |
| Pledge full-block rate | 31.9% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 87.7 · 7.18 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 6.0% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 17.1% | 11.0 | 0.25 | 70.7% |
| 3p | 1400 | 23.3% | 12.5 | 0.24 | 51.3% |
| 4p | 1400 | 16.4% | 13.1 | 0.09 | 27.6% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 1.57 / 0.51 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 32.8% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.27 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 20.2% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 17.8% / 1.1% | the §6 dark-win split; last-standing player ending 9.8% |
| Mean earliest elimination · dead-time proxy | 10.8 · 76.9% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 1.4% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 204 / 618 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 46.6% · 53.4% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 59.7% / 24.1% / 16.1% | §5.1 flip outcome mix |
| Court at March (median · mean pieces/seat) | 3 · 2.62 | T2-1 "feed the court" — the pitch's courts-of-3–4-by-March check |
| Passive-seat win rate (min engagement) | 35.9% | T2-2 "hiding is dangerous" — must sit BELOW the even share 27.0%; winner engagement 36.4 vs field 41.2 |
| Top archetype win rate (≤ 30.0% guard) | 35.3% | ❌ FAIL — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 17.5% / 18.3% | split of the 35.7% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 48.9% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 35.5% / 14.3% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 1.5% / 1.4% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 7.8% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 35.5% | Q2 — is the dominance FAIL gambler-driven? (vs 35.3% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 35.5% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | cooperator @ 30.4% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 2073 | 49.4% |
| RECKONING | 1954 | 46.5% |
| WHISPER | 173 | 4.1% |

