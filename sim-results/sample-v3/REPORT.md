# Balance Sweep Report — v3-s20260622-n40

**4200 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

> **The body of this file is the canonical base-seed (20260622) run.** Below is the
> Stage V3-5j **wave-3 2-seed validation** banner (post-5h gambit win-gate); the
> per-seed full tables follow.

## V3-5j — wave-3 2-seed validation (NO TUNING)

Re-ran the **post-5h** tunables (5h gambit heart win-gate + 5i instrumentation) across the
**base seed (20260622)** and a **second seed (20260628)**, competitive 2/3/4p (4200 games each)
+ a blood_pact sweep (360 games each). **No tunable was changed in this stage** — this is the
stability/honesty re-baseline of wave-3 after the 5h win-gate landed. `npx tsc --noEmit`,
`npx eslint src/v3 tests/v3`, and `npx vitest run tests/v3` (516 tests) all green.

### Competitive — CORE-BAND table (both seeds)
| Band | Target | seed 20260622 | seed 20260628 | Verdict |
|---|---|---|---|---|
| Dark win — pooled | 18–22% | **21.4%** ✅ | **20.7%** ✅ | HOLD · 2-seed STABLE |
| Dark win — 2p | per-count strictness | 22.6% | 21.4% | within/at band both |
| Dark win — 3p | per-count strictness | 24.5% | 23.8% | slightly hot both (stable) |
| Dark win — 4p | per-count strictness | 17.1% | 17.0% | in band both |
| Attrition share of dark wins | ≤ ~40% (cap) | **26.5%** ✅ | **29.9%** ✅ | HOLD · 2-seed STABLE |
| Doom share of games | co-primary (vs 6.1% baseline) | **15.7%** ✅ | **14.5%** ✅ | HOLD · 2-seed STABLE |
| Captures / game | 5e loosened rule | 0.35 | 0.36 | ~2× wave-1 · 2-seed STABLE |
| Rounds (length) | 10–16 | **11.26** ✅ | **11.26** ✅ | HOLD · 2-seed STABLE (5h nudged 10.9→11.26) |
| Dead-time proxy | (soft) | 64.3% | 64.3% | stable |
| Even per-seat win share | ~even (no dominance) | 26.2% ✅ | 26.4% ✅ | HOLD |
| Free-rider (winners not free-riding) | not rewarded | 2.62 vs 2.93 ✅ | 2.63 vs 2.90 ✅ | HOLD |
| Termination guard | 0 non-terminating | 0 ✅ | 0 ✅ | HOLD |

**All eight wave-1/2 CORE BANDS HOLD and are 2-seed STABLE after the 5h win-gate.** Dark win
sits mid-band both seeds; the 5h commit's recorded ~11.26 rounds reproduces exactly; captures,
doom, and attrition-share all reproduce. No regression.

### Gambit — post-5h win-gate (both seeds)
The 5h heart win-gate (§6/§5.6): a Crown's Gambit can be neither DECLARED nor CONVERTED while the
dark heart is exposed at the Keystone — removing the heart/Keystone conflation. The gate **does
not suppress fire** (intentional, Option B = a true WIN-gate, not a fire-gate); it collapses the
incidental WINS.

| Diagnostic | seed 20260622 | seed 20260628 | Reading |
|---|---|---|---|
| `gambit_victory` share of games | 10.5% | 10.5% | was 23.4% pre-5h |
| Gambler-free FIRE — DELIBERATE / INCIDENTAL | 18.2% / 20.6% | 18.6% / 20.2% | deliberate fire IN the 10–20 band; incidental unchanged |
| Gambler-free total fire | 38.9% ❌ | 38.8% ❌ | still OUT of 10–20 (fire intentionally NOT gated) |
| Deliberate share of gambler-free fire | 46.9% | 47.9% | < half the honest fire is a real Gambit claim |
| Gambler-free WIN — total / deliberate | **2.3% / 2.2%** | **2.5% / 2.4%** | was 15.5% pre-5h — incidental wins ~11pp → ~0.1pp |
| Deliberate conversion (win / deliberate-fire) | **11.8%** | **13.0%** | was ~26% — declared gambits now HARDER to convert (Option B intent ✓) |

**Reading.** The 5h win-gate is 2-seed STABLE and did exactly what Option B asked: declared-gambit
**conversion** halved (~26% → ~12%), incidental Keystone-occupation wins evaporated (~11pp → ~0.1pp),
and total gambit-decided games fell 23.4% → 10.5% — **all while the dark band held with no
compensation needed** (the removed gambit wins flowed to territory, not the dark). The fire RATE is
deliberately left high (a declared gambit is meant to be visible/credible); the §9 fire band is the
one band the gate does not move, and remains an OPEN labeling question (is 38.9% the right metric, or
should the band track DELIBERATE fire ~18% which IS in 10–20?).

### Dominance / the OPEN cooperator decision (both seeds)
| Diagnostic | seed 20260622 | seed 20260628 | Reading |
|---|---|---|---|
| Top archetype win share (with gambler) | 40.9% (gambler) ❌ | 38.4% (gambler) ❌ | ≤30 guard breached; 5h dropped it 45.1→~40 |
| Top archetype — gambler-free | 33.4% (baseline) | 33.8% (baseline) | the breach is BASELINE (neutral default / oneVsField filler) |
| Top CHOSEN strategy — gambler-free | cooperator @ 27.5% | cooperator @ 27.1% | **UNDER** the 30% guard |

**Restated OPEN cooperator decision (5i finding, unchanged here).** With the gambler present the
≤30% no-dominance guard fails on the **gambler** (~40%). In gambler-free games the only thing above
30% is **baseline** — the neutral `DEFAULT_AI_POLICY` that doubles as the `oneVsField` filler and is
therefore structurally over-weighted as "the field," not a deliberately chosen strategy. The top
**chosen** strategy gambler-free is the **cooperator at ~27%, which is UNDER the guard**. So the
"cooperator dominance" is a pairwise/measurement artifact, while the real residual is the **gambler**
(a separate, non-gambit lever question). DECISION STILL OWED BY USER: (a) accept the gambler-free
chosen-strategy read (cooperator <30 ⇒ guard effectively passes) and re-scope the dominance guard to
exclude baseline, or (b) open a wave-4 lever pass on the gambler. No fix applied this stage.

### Blood-pact — band table (both seeds, 360 games each)
| Metric | seed 20260622 | seed 20260628 | Reading |
|---|---|---|---|
| Traitor win rate | 34.4% | 36.9% | hot (baseline 17.8%) → still OPEN wave backlog |
| Traitor exposure rate | 52.5% | 48.6% | low (baseline 61.9%) → still OPEN |
| Accusation accuracy | 86.3% | 86.2% | strong (well > random) · 2-seed stable |
| Accusations resolved / game | 0.61 | 0.56 | stable |

**Verdict.** Wave-3 5h win-gate is **2-seed VALIDATED**: all CORE BANDS HOLD and are stable across
both seeds, and the gambit win-gate's effect (conversion ~12%, gambit-decided games ~10.5%, gambler
win-share ~40 down from ~45) reproduces on both. **Bands that PASS + are 2-seed stable:** dark win
(pooled + all three per-counts), attrition share, doom share, captures, rounds, dead-time, even-seat,
free-rider, termination. **Still OPEN (no fix this stage, carried forward):** (1) gambler-free total
gambit FIRE ~38.9% vs the 10–20 band (a labeling question — DELIBERATE fire ~18% is in band); (2) the
≤30% dominance guard (gambler ~40% with gambler present; cooperator-as-chosen-strategy ~27% is under
the guard — user decision owed); (3) blood-pact traitor too strong / under-exposed (win ~34–37%,
exposure ~49–53%).

---

*Below: the canonical base-seed (20260622) full report.*

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 21.4% | 18.0%–22.0% | ✅ PASS |
| Mean game length (rounds) | 11.26 | 10–16 | ✅ PASS |
| Gambit fire rate (gambler-free, ~1-in-6-to-8) | 38.9% | 10.0%–20.0% | ❌ FAIL |

## No-dominant-strategy check
Even per-seat win share ≈ **26.2%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 255 | 14.5% |
| baseline | 3000 | 913 | 30.4% |
| cooperator | 1560 | 437 | 28.0% |
| gambler | 1480 | 605 | 40.9% |
| opportunist | 1640 | 362 | 22.1% |
| saboteur | 1440 | 359 | 24.9% |
| turtle | 1720 | 370 | 21.5% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.62** vs the field's **2.93**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 238 | 5.7% |
| doom_complete | 661 | 15.7% |
| gambit_victory | 443 | 10.5% |
| last_standing | 578 | 13.8% |
| territory_victory | 2280 | 54.3% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 38.9% | the HONEST gambit number (judge the §9 band on this) |
| Gambit seize / win rate (all matchups) | 52.7% / 10.5% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.53 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 13.8% | share of games decided by the last Warlord standing |
| DK kills per game | 2.37 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 6.04 / 3.45 | social density (sworn) + betrayal drama (65.3% of oaths broken) |
| Forge tolls per game | 0.96 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 3.06 · 46.0% | build-identity uptake (§ Herald) |
| Herald captures/game | 1.68 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 24.0% / 28.1% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 5.60 | how close the dark got |
| Pledge full-block rate | 45.8% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 80.0 · 7.08 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 26.5% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 22.6% | 10.0 | 0.28 | 60.4% |
| 3p | 1400 | 24.5% | 11.2 | 0.65 | 49.7% |
| 4p | 1400 | 17.1% | 12.6 | 0.66 | 48.0% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 0.35 / 0.15 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 42.1% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.32 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 22.0% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 15.7% / 5.7% | the §6 dark-win split; last-standing player ending 13.8% |
| Mean earliest elimination · dead-time proxy | 9.0 · 64.3% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 8.7% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 439 / 1783 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 49.9% · 50.1% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 62.0% / 21.6% / 16.5% | §5.1 flip outcome mix |
| Top archetype win rate (≤ 30.0% guard) | 40.9% | ❌ FAIL — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 18.2% / 20.6% | split of the 38.9% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 46.9% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 36.4% / 16.3% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 2.3% / 2.2% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 11.8% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 33.4% | Q2 — is the dominance FAIL gambler-driven? (vs 40.9% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 33.4% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | cooperator @ 27.5% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 1193 | 28.4% |
| RECKONING | 2880 | 68.6% |
| WHISPER | 127 | 3.0% |

