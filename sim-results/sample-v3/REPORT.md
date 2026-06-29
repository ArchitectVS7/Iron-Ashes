# Balance Sweep Report — v3-s20260622-n40

**4200 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

> **The body of this file is the canonical base-seed (20260622) run.** Below is the
> Stage V3-5g wave-2 **2-seed validation** banner; the per-seed full tables follow.

## V3-5g — wave-2 2-seed validation (NO TUNING)

Re-ran the post-5e/5f tunables across the **base seed (20260622)** and a **second seed
(20260628)**, competitive 2/3/4p (4200 games each) + a blood_pact sweep (360 games each).
No tunable was changed in this stage; this is a stability/honesty check of wave-2 after the
5e capture-rule loosening and the 5f gambit metric split.

### Competitive — band table (both seeds)
| Band | Target | seed 20260622 | seed 20260628 | Verdict |
|---|---|---|---|---|
| Dark win — pooled | 18–22% | **21.3%** ✅ | **20.5%** ✅ | HOLD · 2-seed STABLE |
| Dark win — 2p | (per-count strictness) | 22.4% | 21.1% | within/at band both |
| Dark win — 3p | (per-count strictness) | 24.4% | 23.7% | slightly hot both |
| Dark win — 4p | (per-count strictness) | 17.1% | 16.9% | slightly cool both |
| Attrition share of dark wins | ≤ ~40% (cap) | **26.4%** ✅ | **29.8%** ✅ | HOLD · 2-seed STABLE |
| Doom share of games | co-primary (raised vs 6.1% baseline) | **15.7%** ✅ | **14.4%** ✅ | HOLD · 2-seed STABLE |
| Captures / game | 5e loosened rule (was 0.16/0.18 wave-1) | 0.34 | 0.36 | ~2× wave-1 · stable; still < 0.5–2 dramatic band → wave-2 |
| Gambit fire (gambler-free) | 10–20% | 38.9% ❌ | 38.8% ❌ | OPEN (5f investigated, NO fix) → wave-2 |
| Top-archetype win share | ≤ 30% (no dominance) | 45.1% (gambler) ❌ | 43.0% (gambler) ❌ | OPEN · gambler-driven → wave-2 |
| Rounds (length) | 10–16 | 10.90 ✅ | 10.91 ✅ | HOLD · 2-seed STABLE |
| Dead-time proxy | (soft) | 64.2% | 64.0% | stable |
| Even per-seat win share | ~even (no dominance) | 26.2% ✅ | 26.5% ✅ | HOLD |
| Free-rider (winners' pledge ≥ field) | winners ≥ field | 2.63 vs 2.90 ✅ | 2.64 vs 2.86 ✅ | HOLD |

### Gambit deliberate-vs-incidental split (Stage 5f metric — both seeds)
| Diagnostic | seed 20260622 | seed 20260628 | Reading |
|---|---|---|---|
| Gambler-free fire — DELIBERATE / INCIDENTAL | 16.5% / 22.3% | 16.1% / 22.7% | most of the honest fire is INCIDENTAL (a piece sat the Keystone for another reason) |
| Deliberate share of gambler-free fire | 42.5% | 41.4% | < half of the honest fire is a real Gambit-path claim |
| Deliberate conversion (win / deliberate-fire) | 26.0% | 27.8% | deliberate claims convert ~1-in-4 |
| Top-archetype win share — gambler-free | 34.2% | 34.1% | the ≤30% dominance miss is gambler-driven (vs 45.1/43.0% with gambler) |

### Blood-pact — band table (both seeds, 360 games each)
| Metric | seed 20260622 | seed 20260628 | Reading |
|---|---|---|---|
| Traitor win rate | 34.2% | 36.9% | hot (baseline was 17.8%) → wave-2 |
| Traitor exposure rate | 51.9% | 46.7% | low (baseline was 61.9%) → wave-2 |
| Accusation accuracy | 86.2% | 85.7% | strong (well better than random) |
| Accusations resolved / game | 0.60 | 0.54 | stable |

**Verdict.** All five WAVE-1 CORE BANDS HOLD and are 2-seed STABLE after the 5e/5f changes:
dark win (21.3% / 20.5%, both in 18–22%), attrition share of dark-wins capped (26.4% / 29.8%,
both ≤ ~40%), doom share co-primary (15.7% / 14.4%), rounds (10.90 / 10.91), and per-count
(2p ~22 / 3p ~24 / 4p ~17). Dark win drifted ~0.6–1.1pp up from the wave-1 lock (20.7/19.4%)
as a side-effect of 5e — still comfortably in band. **5e capture loosening landed:** captures
roughly doubled to 0.34 / 0.36 per game (from 0.16 / 0.18) and is stable, though still below
the aspirational 0.5–2 dramatic band. **Open wave-2 items (unchanged, no fix this stage):**
gambit gambler-free fire is too high at ~38.9% (deliberate ~16% / incidental ~22%; deliberate
share ~42%; deliberate conversion ~26–28%); the gambler archetype breaks the ≤30% dominance
guard at ~43–45% (gambler-free top archetype is ~34%); and the blood-pact traitor is too strong /
under-exposed (win ~34–37%, exposure ~47–52%). These remain the wave-2 backlog.

---

*Below: the canonical base-seed (20260622) full report.*

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 21.3% | 18.0%–22.0% | ✅ PASS |
| Mean game length (rounds) | 10.90 | 10–16 | ✅ PASS |
| Gambit fire rate (gambler-free, ~1-in-6-to-8) | 38.9% | 10.0%–20.0% | ❌ FAIL |

## No-dominant-strategy check
Even per-seat win share ≈ **26.2%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 284 | 16.1% |
| baseline | 3000 | 743 | 24.8% |
| cooperator | 1560 | 517 | 33.1% |
| gambler | 1480 | 667 | 45.1% |
| opportunist | 1640 | 447 | 27.3% |
| saboteur | 1440 | 298 | 20.7% |
| turtle | 1720 | 350 | 20.3% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.63** vs the field's **2.90**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 236 | 5.6% |
| doom_complete | 658 | 15.7% |
| gambit_victory | 982 | 23.4% |
| last_standing | 577 | 13.7% |
| territory_victory | 1747 | 41.6% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 38.9% | the HONEST gambit number (judge the §9 band on this) |
| Gambit seize / win rate (all matchups) | 52.7% / 23.4% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.53 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 13.7% | share of games decided by the last Warlord standing |
| DK kills per game | 2.37 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 5.86 / 3.35 | social density (sworn) + betrayal drama (65.8% of oaths broken) |
| Forge tolls per game | 0.94 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 3.02 · 46.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 1.64 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 25.6% / 26.8% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 5.60 | how close the dark got |
| Pledge full-block rate | 44.0% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 77.2 · 7.08 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 26.4% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 22.4% | 9.7 | 0.28 | 60.4% |
| 3p | 1400 | 24.4% | 10.8 | 0.65 | 49.7% |
| 4p | 1400 | 17.1% | 12.2 | 0.65 | 48.0% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 0.34 / 0.14 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 41.3% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.23 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 15.8% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 15.7% / 5.6% | the §6 dark-win split; last-standing player ending 13.7% |
| Mean earliest elimination · dead-time proxy | 9.0 · 64.2% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 8.7% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 439 / 1766 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 43.6% · 56.4% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 61.9% / 21.6% / 16.5% | §5.1 flip outcome mix |
| Top archetype win rate (≤ 30.0% guard) | 45.1% | ❌ FAIL — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 16.5% / 22.3% | split of the 38.9% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 42.5% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 35.0% / 17.7% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 15.5% / 4.3% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 26.0% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 34.2% | Q2 — is the dominance FAIL gambler-driven? (vs 45.1% with gambler) |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 1193 | 28.4% |
| RECKONING | 2880 | 68.6% |
| WHISPER | 127 | 3.0% |

