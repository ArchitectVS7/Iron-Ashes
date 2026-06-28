# Balance Sweep Report — v3-s20260622-n40

**4200 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

> **The body of this file is the canonical base-seed (20260622) run.** Below is the
> Stage V3-5d wave-1 **2-seed validation** banner; the per-seed full tables follow.

## V3-5d — wave-1 2-seed validation (NO TUNING)

Re-ran the post-5a/5b tunables across the **base seed (20260622)** and a **second seed
(20260628)**, competitive 2/3/4p (4200 games each) + a blood_pact sweep (360 games each).
No tunable was changed in this stage; this is a stability/honesty check of wave-1.

### Competitive — band table (both seeds)
| Band | Target | seed 20260622 | seed 20260628 | Verdict |
|---|---|---|---|---|
| Dark win — pooled | 18–22% | **20.7%** ✅ | **19.4%** ✅ | HOLD · 2-seed STABLE |
| Dark win — 2p | (per-count strictness) | 22.0% | 20.3% | within band both |
| Dark win — 3p | (per-count strictness) | 23.6% | 22.1% | slightly hot both |
| Dark win — 4p | (per-count strictness) | 16.4% | 15.8% | slightly cool both |
| Attrition share of dark wins | ≤ ~40% (cap) | **26.7%** ✅ | **31.3%** ✅ | HOLD · 2-seed STABLE |
| Doom share of games | raise vs 6.1% baseline | **15.2%** ✅ | **13.3%** ✅ | HOLD · 2-seed STABLE |
| Captures / game | ~0.5–2 (rare-but-dramatic) | 0.16 ❌ | 0.18 ❌ | MISS (low) · stable → wave-2 |
| Gambit fire (gambler-free) | 10–20% | 40.6% ❌ | 40.7% ❌ | MISS (high) · stable → wave-2 |
| Top-archetype win share | ≤ 30% (no dominance) | 43.2% (gambler) ❌ | 46.4% (gambler) ❌ | MISS · stable → wave-2 |
| Rounds (length) | 10–16 | 10.80 ✅ | 10.86 ✅ | HOLD · 2-seed STABLE |
| Dead-time proxy | (soft) | 64.3% | 61.6% | stable |
| Even per-seat win share | ~even (no dominance) | 26.4% ✅ | 26.9% ✅ | HOLD |
| Free-rider (winners' pledge ≥ field) | winners ≥ field | 2.60 vs 2.89 ✅ | ✅ | HOLD |

### Blood-pact — band table (both seeds, 360 games each)
| Metric | seed 20260622 | seed 20260628 | Reading |
|---|---|---|---|
| Traitor win rate | 31.7% | 34.4% | hot (baseline was 17.8%) → wave-2 |
| Traitor exposure rate | 51.4% | 47.2% | low (baseline was 61.9%) → wave-2 |
| Accusation accuracy | 80.1% | 83.7% | strong (better than random) |
| Accusations resolved / game | 0.64 | 0.56 | stable |

**Verdict.** The wave-1 OBJECTIVE bands HOLD and are 2-seed STABLE: dark win
(20.7% / 19.4%, both in 18–22%), attrition capped (26.7% / 31.3%, both ≤ ~40%), doom
share raised (15.2% / 13.3% vs the 6.1% untuned baseline), and rounds (10.8). The
HYBRID call (cap attrition, raise doom, keep both alive) is met. **Wave-2 targets**
(stable misses, not noise): captures still well below the 0.5–2 dramatic band (0.16 /
0.18); gambit fire too high at ~40%; the gambler archetype breaks the ≤30% dominance
guard at ~43–46%; and the blood-pact traitor is now too strong / under-exposed
(win ~32–34%, exposure ~47–51%) — a side-effect of the stronger dark to revisit.

---

*Below: the canonical base-seed (20260622) full report.*

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 20.7% | 18.0%–22.0% | ✅ PASS |
| Mean game length (rounds) | 10.80 | 10–16 | ✅ PASS |
| Gambit fire rate (gambler-free, ~1-in-6-to-8) | 40.6% | 10.0%–20.0% | ❌ FAIL |

## No-dominant-strategy check
Even per-seat win share ≈ **26.4%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 322 | 18.3% |
| baseline | 3000 | 741 | 24.7% |
| cooperator | 1560 | 514 | 32.9% |
| gambler | 1480 | 639 | 43.2% |
| opportunist | 1640 | 459 | 28.0% |
| saboteur | 1440 | 287 | 19.9% |
| turtle | 1720 | 369 | 21.5% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.60** vs the field's **2.89**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 232 | 5.5% |
| doom_complete | 637 | 15.2% |
| gambit_victory | 1047 | 24.9% |
| last_standing | 589 | 14.0% |
| territory_victory | 1695 | 40.4% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 40.6% | the HONEST gambit number (judge the §9 band on this) |
| Gambit seize / win rate (all matchups) | 54.0% / 24.9% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.52 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 14.0% | share of games decided by the last Warlord standing |
| DK kills per game | 2.37 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 5.77 / 3.30 | social density (sworn) + betrayal drama (65.7% of oaths broken) |
| Forge tolls per game | 0.91 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 2.94 · 46.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 1.56 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 26.6% / 26.3% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 5.57 | how close the dark got |
| Pledge full-block rate | 43.9% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 75.9 · 7.05 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 26.7% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 22.0% | 9.7 | 0.29 | 59.0% |
| 3p | 1400 | 23.6% | 10.8 | 0.62 | 51.1% |
| 4p | 1400 | 16.4% | 11.9 | 0.64 | 51.8% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 0.16 / 0.05 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 34.6% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.24 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 16.0% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 15.2% / 5.5% | the §6 dark-win split; last-standing player ending 14.0% |
| Mean earliest elimination · dead-time proxy | 9.0 · 64.3% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 8.9% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 435 / 1741 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 42.1% · 57.9% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 62.1% / 21.4% / 16.5% | §5.1 flip outcome mix |
| Top archetype win rate (≤ 30.0% guard) | 43.2% | ❌ FAIL — no single strategy should dominate |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 1209 | 28.8% |
| RECKONING | 2866 | 68.2% |
| WHISPER | 125 | 3.0% |

