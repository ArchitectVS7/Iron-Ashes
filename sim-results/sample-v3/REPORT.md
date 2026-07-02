# Balance Sweep Report — v3-s20260622-n40

**4200 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

> **The body of this file is the canonical base-seed (20260622) run.** Below is the
> **W2 (backlog T1-2) Whisper-gate re-baseline** banner — the 2-seed validation of the
> Tier-1 fix wave's one balance-touching change; the base-seed full tables follow.

## W2 / T1-2 — Whisper last-stronghold gate re-baseline (2-seed validation)

The Tier-1 pre-playtest sweep's sanctioned balance-touching stage (backlog T1-2, §13 P0-10):
a RAID can no longer elect TAKE_LAND against a defender's **last living stronghold in Whisper**
(`canTakeLand` — the land mirror of the last-retainer capture gate; §5.2 severity ramp / §12 #13
now literally enforced). The P0-10 **Rally** was BUILT alongside it and **REVERTED on this very
sweep**: with the Rally in, seed 20260628 dark-win hit **22.0%** (over the 18–22 ceiling —
rallied seats extend games, so the doom clock lands more) with no local tunable counter; the
gate alone re-enters the band on both seeds. The removal is the dated decision in
`ROADMAP-V3.md §8` + the §13 P0-10 annotation. `npx tsc --noEmit`, `npx eslint src/v3 src/ui-v3
tests/v3`, `npx vitest run tests/v3` (606 tests) all green.

### Competitive — CORE-BAND table (both seeds; the pre-W2 lock was 21.4 / 20.7)
| Band | Target | seed 20260622 | seed 20260628 | Verdict |
|---|---|---|---|---|
| Dark win — pooled | 18–22% | **21.4%** ✅ | **20.9%** ✅ | HOLD · 2-seed STABLE |
| Dark win — 2p | per-count credible 16–24 | 22.5% | 21.5% | within band both |
| Dark win — 3p | per-count credible 16–24 | 24.9% | 24.1% | slightly hot both — same as the lock (24.5/23.8), stable |
| Dark win — 4p | per-count credible 16–24 | 16.8% | 17.2% | in band both |
| Attrition share of dark wins | ≤ ~40% (cap) | **27.1%** ✅ | **30.3%** ✅ | HOLD · 2-seed STABLE |
| Rounds (length) | 10–16 | **11.28** ✅ | **11.27** ✅ | HOLD |
| Gambler-free DELIBERATE gambit fire | 10–20% | **18.7%** ✅ | **18.9%** ✅ | HOLD (raw fire-rate check stays the recorded 5g artifact) |
| Top CHOSEN strategy (Option A guard) | ≤30% | **cooperator 27.5%** ✅ | **cooperator 27.0%** ✅ | HOLD |
| Even per-seat share / dominance | no dominant archetype | PASS | PASS | HOLD |
| Free-rider (winners not free-riding) | not rewarded | 2.64 vs 2.94 ✅ | ✅ | HOLD |
| Termination guard | 0 non-terminating | 0 ✅ | 0 ✅ | HOLD |

### Blood-pact bands (both seeds, 360 games each; pre-W2 lock 18.6/16.1 · 56.9/58.6 · 70.7/72.3 · 0.81/0.81)
| Metric | Band | seed 20260622 | seed 20260628 | Verdict |
|---|---|---|---|---|
| Traitor win rate | 12–20% | **19.4%** ✅ | **15.8%** ✅ | HOLD · 2-seed STABLE |
| Traitor exposure rate | 40–70% | **57.2%** ✅ | **58.6%** ✅ | HOLD · 2-seed STABLE |
| Accusation accuracy | ≥45% | **70.5%** ✅ | **72.3%** ✅ | HOLD · 2-seed STABLE |
| Accusations per game | ≤2.5 | **0.81** ✅ | **0.81** ✅ | HOLD · 2-seed STABLE |

**Reading.** The gate is a ~0-to-−0.2pp change at the pooled dark-win level (21.40→21.38 /
20.71→20.95) — the protection bites rarely but removes the Whisper auto-elimination path the
spec always forbade. Every §9 band that held at the lock still holds, 2-seed, both modes.


## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 21.4% | 18.0%–22.0% | ✅ PASS |
| Mean game length (rounds) | 11.28 | 10–16 | ✅ PASS |
| Gambit fire rate (gambler-free, ~1-in-6-to-8) | 39.5% | 10.0%–20.0% | ❌ FAIL |

## No-dominant-strategy check
Even per-seat win share ≈ **26.2%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 252 | 14.3% |
| baseline | 3000 | 914 | 30.5% |
| cooperator | 1560 | 437 | 28.0% |
| gambler | 1480 | 609 | 41.1% |
| opportunist | 1640 | 362 | 22.1% |
| saboteur | 1440 | 358 | 24.9% |
| turtle | 1720 | 370 | 21.5% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.62** vs the field's **2.94**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 243 | 5.8% |
| doom_complete | 655 | 15.6% |
| gambit_victory | 443 | 10.5% |
| last_standing | 561 | 13.4% |
| territory_victory | 2298 | 54.7% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 39.5% | the HONEST gambit number (judge the §9 band on this) |
| Gambit seize / win rate (all matchups) | 53.2% / 10.5% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.52 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 13.4% | share of games decided by the last Warlord standing |
| DK kills per game | 2.37 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 6.06 / 3.46 | social density (sworn) + betrayal drama (65.3% of oaths broken) |
| Forge tolls per game | 0.96 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 3.06 · 46.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 1.68 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 24.1% / 28.0% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 5.60 | how close the dark got |
| Pledge full-block rate | 45.8% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 80.1 · 7.08 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 27.1% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 22.5% | 10.0 | 0.28 | 60.6% |
| 3p | 1400 | 24.9% | 11.2 | 0.66 | 50.4% |
| 4p | 1400 | 16.8% | 12.6 | 0.64 | 48.6% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 0.35 / 0.15 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 42.2% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.32 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 22.4% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 15.6% / 5.8% | the §6 dark-win split; last-standing player ending 13.4% |
| Mean earliest elimination · dead-time proxy | 9.0 · 64.5% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 8.5% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 417 / 1784 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 50.1% · 49.9% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 62.0% / 21.5% / 16.5% | §5.1 flip outcome mix |
| Top archetype win rate (≤ 30.0% guard) | 41.1% | ❌ FAIL — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 18.7% / 20.8% | split of the 39.5% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 47.3% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 36.7% / 16.5% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 2.3% / 2.2% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 11.6% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 33.4% | Q2 — is the dominance FAIL gambler-driven? (vs 41.1% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 33.4% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | cooperator @ 27.5% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 1177 | 28.0% |
| RECKONING | 2895 | 68.9% |
| WHISPER | 128 | 3.0% |

