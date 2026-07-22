# Balance Sweep Report — v3-s20260628-n40

**4200 games** · base seed 20260628 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 29.2% | 18.0%–22.0% | ❌ FAIL |
| Mean game length (rounds) | 12.25 | 10–16 | ✅ PASS |
| Deliberate gambit fire (gambler-free, ~1-in-6-to-8) | 15.3% | 10.0%–20.0% | ✅ PASS |

## No-dominant-strategy check
Even per-seat win share ≈ **23.6%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 190 | 10.8% |
| baseline | 3000 | 780 | 26.0% |
| cooperator | 1560 | 502 | 32.2% |
| gambler | 1480 | 428 | 28.9% |
| opportunist | 1640 | 376 | 22.9% |
| saboteur | 1440 | 410 | 28.5% |
| turtle | 1720 | 286 | 16.6% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.66** vs the field's **3.02**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 62 | 1.5% |
| doom_complete | 1166 | 27.8% |
| gambit_victory | 347 | 8.3% |
| last_standing | 222 | 5.3% |
| territory_victory | 2403 | 57.2% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 34.9% | raw gambler-free seize rate; the §9 band now judges the DELIBERATE split (below) |
| Gambit seize / win rate (all matchups) | 48.7% / 8.3% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.11 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 5.3% | share of games decided by the last Warlord standing |
| DK kills per game | 3.77 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 6.45 / 3.79 | social density (sworn) + betrayal drama (66.6% of oaths broken) |
| Forge tolls per game | 1.82 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 0.00 · 0.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 0.00 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 0.0% / 23.6% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 6.27 | how close the dark got |
| Pledge full-block rate | 31.7% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 87.8 · 7.16 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 5.0% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 19.7% | 11.5 | 0.20 | 72.4% |
| 3p | 1400 | 34.4% | 12.4 | 0.11 | 49.6% |
| 4p | 1400 | 33.6% | 12.9 | 0.03 | 24.1% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 1.67 / 0.55 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 33.2% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.31 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 23.6% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 27.8% / 1.5% | the §6 dark-win split; last-standing player ending 5.3% |
| Mean earliest elimination · dead-time proxy | 12.3 · 87.7% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 0.0% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 3 / 465 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 46.8% · 53.2% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 62.6% / 25.2% / 12.2% | §5.1 flip outcome mix |
| Court at March (median · mean pieces/seat) | 3 · 2.60 | T2-1 "feed the court" — the pitch's courts-of-3–4-by-March check |
| Passive-seat win rate (min engagement) | 37.6% | T2-2 "hiding is dangerous" — must sit BELOW the even share 23.6%; winner engagement 36.5 vs field 41.7 |
| Top archetype win rate (≤ 30.0% guard) | 32.2% | ❌ FAIL — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 15.3% / 19.6% | split of the 34.9% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 43.9% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 33.3% / 15.4% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 0.5% / 0.5% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 3.4% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 31.5% | Q2 — is the dominance FAIL gambler-driven? (vs 32.2% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 28.4% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | cooperator @ 31.5% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 1809 | 43.1% |
| RECKONING | 2273 | 54.1% |
| WHISPER | 118 | 2.8% |

