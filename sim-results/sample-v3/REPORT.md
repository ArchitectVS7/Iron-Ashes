# Balance Sweep Report — v3-s20260622-n40

**4200 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

> **The body of this file is the canonical base-seed (20260622) run under the T2-1 lock.**
> Below is the **T2-1 (backlog T2-1) "feed the court" re-lock** banner — the 2-seed validation of
> the Tier-2 wave's first balance-touching stage; the base-seed full tables follow.

## T2-1 — feed the court (supply + re-lock, 2026-07-02)

The pitch-matching change (engagement review #1): **every player now STARTS with one named Marshal**
(seeded name, fixed archetype — the A/B refuted a Marshal/Steward split: a starting Steward's economy
over-heated 3p +8pp and dealt unequal round-1 economies) and **a seed-picked pair of Forges carries a
pre-bound Discovery token** (`FORGE_TOKEN_COUNT` = 2 ⇒ 6 tokens/game; all 8 over-heated the dark at 3p).
All new content pre-bound `f(hash(seed, key))` (§7 D1/D9), fogged, sigiled. Knock-on re-lock:
`DISCOVERY_BLIGHT_DELTA` 1→0, `SPREAD_AMOUNT_BASE` 3→1, `DOOM_COST_MARCH` 9→11,
`DOOM_COST_RECKONING` 12→14.

### The stage objective — delivered
| Objective | Before (lock) | After (T2-1) |
|---|---|---|
| Median court by The March | ~2 (Warlord + ~1) | **3** (mean 2.87/2.89) — target 3–4 |
| Captures / game | 0.35 | **1.39 / 1.46** — target ~0.5–1.5, brakes untouched |
| Retainer supply | ~4 tokens, ~1.5 recruits/game | 6 tokens + 1 starting Marshal/seat |

### Competitive — CORE-BAND table (both seeds; the pre-T2-1 lock was 21.4 / 20.9)
| Band | Target | seed 20260622 | seed 20260628 | Verdict |
|---|---|---|---|---|
| Dark win — pooled | 18–22% | **19.4%** | **19.5%** | PASS · 2-seed STABLE |
| Dark win — 2p | (context) | 18.4% | 17.6% | in band both |
| Dark win — 3p | credible 16–24 | **22.3%** | **23.2%** | PASS — better than the old lock's 24.9/24.1 |
| Dark win — 4p | credible 16–24 | **17.6%** | **17.6%** | PASS |
| Doom share of games (co-primary) | ~12–18% | **17.9%** | **17.8%** | PASS |
| Attrition share of dark wins | <=40% cap | **8.0%** | **8.8%** | PASS (texture shift noted below) |
| Mean rounds | 10–16 | **12.20** | **12.19** | PASS |
| Free-rider guard | winners pledge their share | PASS | PASS | HOLD |
| Termination guard | 0 step-guard hits | 0 | 0 | HOLD |

### Blood Pact (both seeds; pre-T2-1 lock 19.4 / 57.2 / 70.5)
| Band | Target | 20260622 | 20260628 |
|---|---|---|---|
| Traitor win | 12–20% | **18.1%** | **18.9%** |
| Exposure | 40–70% | **56.1%** | **53.6%** |
| Accusation accuracy | >=45% | **70.6%** | **71.2%** |

### Recorded texture shifts + watch items (dated, owned)
- **Eliminations 0.52 → 0.30/game; attrition endings 5.8% → ~1.5% of games; last-standing 13.4% → ~7%.**
  The dark now wins almost purely by the Keystone doom clock. Within every stated band (attrition is a
  CAP, not a floor), but the elimination tempo is a real feel change — a playtest item.
- **Early-death flag 8.5% → 1.9%, dead-time proxy 64.5% → 73%** — deposals come later; spectator risk down.
- **WATCH — saboteur archetype gambler-free win rate 31.4% / 32.7%** (vs the 30% per-archetype guard
  line; the pooled dominance check and the free-rider verdict both PASS, and the lock already carried
  the gambler's pooled 41% as a known artifact). Under SPREAD=1 pledge-suppression is cheap; if the
  next wave confirms it >30% it needs a dedicated look (T2-2's hoard-tax is the natural home).
- **Difficulty tiers (knight/squire) magnitudes are stale** — calibrated pre-T2-1 (~17%/~13% flawless);
  direction/monotonicity re-verified by tests, magnitudes need a recalibration pass at the next
  difficulty-touching stage. `DIFFICULTY.md`/`NOISE_SWEEP.md` in this dir predate T2-1.
- Gambit fire (pooled 37.6%/37.0%) stays the known pre-existing FAIL judged on the deliberate split
  (18.5%/17.9% — in its 10–20 informal band), unchanged posture from the lock.

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Shadowking win rate | 19.4% | 18.0%–22.0% | ✅ PASS |
| Mean game length (rounds) | 12.20 | 10–16 | ✅ PASS |
| Gambit fire rate (gambler-free, ~1-in-6-to-8) | 37.6% | 10.0%–20.0% | ❌ FAIL |

## No-dominant-strategy check
Even per-seat win share ≈ **26.9%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 259 | 14.7% |
| baseline | 3000 | 841 | 28.0% |
| cooperator | 1560 | 469 | 30.1% |
| gambler | 1480 | 566 | 38.2% |
| opportunist | 1640 | 396 | 24.1% |
| saboteur | 1440 | 435 | 30.2% |
| turtle | 1720 | 419 | 24.4% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.72** vs the field's **2.96**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 65 | 1.5% |
| doom_complete | 750 | 17.9% |
| gambit_victory | 472 | 11.2% |
| last_standing | 302 | 7.2% |
| territory_victory | 2611 | 62.2% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 37.6% | the HONEST gambit number (judge the §9 band on this) |
| Gambit seize / win rate (all matchups) | 51.5% / 11.2% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.30 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 7.2% | share of games decided by the last Warlord standing |
| DK kills per game | 3.00 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 6.64 / 3.96 | social density (sworn) + betrayal drama (67.6% of oaths broken) |
| Forge tolls per game | 2.17 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 3.59 · 46.5% | build-identity uptake (§ Herald) |
| Herald captures/game | 2.19 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 26.9% / 26.8% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 4.77 | how close the dark got |
| Pledge full-block rate | 41.4% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 92.7 · 7.57 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 8.0% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 18.4% | 11.4 | 0.09 | 66.6% |
| 3p | 1400 | 22.3% | 12.1 | 0.17 | 47.4% |
| 4p | 1400 | 17.6% | 13.1 | 0.65 | 40.4% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 1.39 / 0.38 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 27.4% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.28 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 19.7% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 17.9% / 1.5% | the §6 dark-win split; last-standing player ending 7.2% |
| Mean earliest elimination · dead-time proxy | 10.6 · 75.5% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 1.9% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 208 / 1058 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 55.8% · 44.2% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 59.3% / 24.2% / 16.4% | §5.1 flip outcome mix |
| Court at March (median · mean pieces/seat) | 3 · 2.87 | T2-1 "feed the court" — the pitch's courts-of-3–4-by-March check |
| Top archetype win rate (≤ 30.0% guard) | 38.2% | ❌ FAIL — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 18.5% / 19.1% | split of the 37.6% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 49.1% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 36.0% / 15.5% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 3.5% / 3.1% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 17.1% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 31.4% | Q2 — is the dominance FAIL gambler-driven? (vs 38.2% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 29.9% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | saboteur @ 31.4% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 1344 | 32.0% |
| RECKONING | 2568 | 61.1% |
| WHISPER | 288 | 6.9% |

