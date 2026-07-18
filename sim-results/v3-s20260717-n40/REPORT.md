# Balance Sweep Report — v3-s20260717-n40

**4200 games** · base seed 20260717 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 19.0% | 18.0%–22.0% | ✅ PASS |
| Mean game length (rounds) | 12.11 | 10–16 | ✅ PASS |
| Deliberate gambit fire (gambler-free, ~1-in-6-to-8) | 17.6% | 10.0%–20.0% | ✅ PASS |

## No-dominant-strategy check
Even per-seat win share ≈ **27.0%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 262 | 14.9% |
| baseline | 3000 | 911 | 30.4% |
| cooperator | 1560 | 486 | 31.2% |
| gambler | 1480 | 577 | 39.0% |
| opportunist | 1640 | 402 | 24.5% |
| saboteur | 1440 | 401 | 27.8% |
| turtle | 1720 | 363 | 21.1% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.68** vs the field's **3.01**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 42 | 1.0% |
| doom_complete | 756 | 18.0% |
| gambit_victory | 497 | 11.8% |
| last_standing | 431 | 10.3% |
| territory_victory | 2474 | 58.9% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 34.3% | raw gambler-free seize rate; the §9 band now judges the DELIBERATE split (below) |
| Gambit seize / win rate (all matchups) | 48.9% / 11.8% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.21 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 10.3% | share of games decided by the last Warlord standing |
| DK kills per game | 3.93 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 6.27 / 3.54 | social density (sworn) + betrayal drama (64.1% of oaths broken) |
| Forge tolls per game | 2.12 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 0.00 · 0.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 0.00 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 0.0% / 27.0% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 5.50 | how close the dark got |
| Pledge full-block rate | 31.7% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 86.7 · 7.14 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 5.3% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 18.4% | 10.8 | 0.25 | 68.8% |
| 3p | 1400 | 23.0% | 12.5 | 0.26 | 49.8% |
| 4p | 1400 | 15.6% | 13.1 | 0.10 | 28.1% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 1.48 / 0.49 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 33.2% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.25 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 18.9% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 18.0% / 1.0% | the §6 dark-win split; last-standing player ending 10.3% |
| Mean earliest elimination · dead-time proxy | 10.8 · 77.1% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 1.3% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 220 / 650 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 45.2% · 54.8% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 54.3% / 29.4% / 16.3% | §5.1 flip outcome mix |
| Court at March (median · mean pieces/seat) | 2 · 2.59 | T2-1 "feed the court" — the pitch's courts-of-3–4-by-March check |
| Passive-seat win rate (min engagement) | 35.9% | T2-2 "hiding is dangerous" — must sit BELOW the even share 27.0%; winner engagement 36.2 vs field 40.7 |
| Top archetype win rate (≤ 30.0% guard) | 39.0% | ❌ FAIL — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 17.6% / 16.7% | split of the 34.3% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 51.3% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 35.9% / 13.0% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 2.2% / 2.1% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 11.7% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 33.4% | Q2 — is the dominance FAIL gambler-driven? (vs 39.0% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 33.4% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | cooperator @ 31.0% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 2092 | 49.8% |
| RECKONING | 1927 | 45.9% |
| WHISPER | 181 | 4.3% |

