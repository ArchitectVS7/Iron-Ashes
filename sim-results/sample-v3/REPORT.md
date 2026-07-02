# Balance Sweep Report — v3-s20260622-n40

**4200 games** · base seed 20260622 (40 seeds) ·
player counts 2/3/4 · modes competitive ·
35 matchups. Driven through the REAL reducer + REAL AI (deterministic).

> **The body of this file is the canonical base-seed (20260622) run under the T2-2 re-arm.**
> Two Tier-2 banners follow — **T2-2 "hiding is dangerous" (newest)**, then the T2-1 "feed the court"
> re-lock it builds on — and then the generated base-seed tables.

## T2-2 — re-arm "hiding is dangerous" (+ the passivity metric, 2026-07-02)

The anti-turtle lever (backlog T2-2, drift D2's design half) is **LIVE again, in the BLIGHT currency**:
a public per-seat **engagement tally** (`PlayerState.engagement` — +1 per card pledged / STRIKE-committed /
heart-committed, +1 per PARLEY) drives **`applyReckoningBlightPressure`**
(`RECKONING_AUTOPRESSURE_BLIGHT` = 1): each Reckoning Dawn with no LIVE heart assault, the dark advances
1 blight on the **least-engaged** living seat's most-imperiled **non-Keep** stronghold (lowest tally →
most production → lowest seat). It telegraphs — the node sits blighted one Dawn before it ashes
(BLIGHT_TO_ASH = 2) — and engaging moves the gaze off you. Doom/attrition-safe by two validated shapes:
**Keeps are never targeted**, and the gaze **spares the broken** (only seats holding 2+ productive
non-Keep nodes qualify — the pressure can never ash a seat's last production, so it cannot economically
execute anyone). Rejected on the 2-seed sweeps: the keep-inclusive deposal-currency re-arm (best metric
but last_standing 7→21% of games + 3p over the 24% credible cap), two dose gates (full-block / 3+-living —
both neutered the 2p regime), the doom-cost compensator family (inverted via the patience ratchet), and a
magnitude-2 probe (no metric gain, telegraph lost). `RECKONING_AUTOPRESSURE_NODES` stays 0.

### The stage objective — the passivity metric (NEW: `passiveSeatWinRate`)
Win share of the game's min-engagement seat (games with a player winner; the bottom-quartile-engagement
seat at 4p). **Before (T2-1 lock): hiding was the BEST line** — the quietest seat won MORE than the
~26.9% even share.

| Passivity read | T2-1 lock (baseline) | T2-2 shipped | Movement |
|---|---|---|---|
| Passive-seat win — pooled | **35.9% / 36.3%** (above even share) | **34.7% / 34.0%** | down, 2-seed consistent |
| Passive-seat win — 2p (where hiding is most rewarded) | **66.1% / 66.6%** | **61.5% / 59.8%** | the real bite: −5–7pp |
| Passive-seat win — 3p · 4p | 26.2/26.9 · 15.0/14.7 | 27.5/27.8 · 15.3/14.5 | flat — sim bots do not turtle at 3p/4p (the backlog's own prediction); the 3p/4p bite is a HUMAN playtest item, armed + taught (teach-script beat C9) |
| Winner vs field mean engagement | 38.1 vs 41.9 | 38.1 vs 41.7 | context row (reported per run) |

### Competitive — CORE-BAND table (both seeds; the T2-1 lock was 19.4 / 19.5)
| Band | Target | seed 20260622 | seed 20260628 | Verdict |
|---|---|---|---|---|
| Dark win — pooled | 18–22% | **19.2%** | **19.3%** | PASS · 2-seed STABLE |
| Dark win — 2p | (context) | 18.6% | 18.3% | in band both |
| Dark win — 3p | credible 16–24 | **21.9%** | **23.1%** | PASS |
| Dark win — 4p | credible 16–24 | **17.1%** | **16.5%** | PASS |
| Doom share of games (co-primary) | ~12–18% | **17.3%** | **17.6%** | PASS |
| Attrition share of dark wins | <=40% cap | **9.8%** | **8.8%** | PASS |
| Mean rounds | 10–16 | **12.16** | **12.13** | PASS |
| Eliminations / game (texture) | (watch) | 0.363 | 0.355 | T2-1 texture holds (was 0.30; last_standing 9.3/9.3%) |
| Free-rider guard | winners pledge their share | PASS | PASS | HOLD |
| Termination guard | 0 step-guard hits | 0 | 0 | HOLD |
| Captures/game · court median (T2-1 objective) | ~1 · 3–4 | 1.38 · 3 | 1.45 · 3 | T2-1 HOLDS |

### Blood Pact (both seeds; the T2-1 lock was 18.1/18.9 · 56.1/53.6 · 70.6/71.2)
| Band | Target | 20260622 | 20260628 |
|---|---|---|---|
| Traitor win | 12–20% | **17.8%** | **19.2%** |
| Exposure | 40–70% | **55.6%** | **53.3%** |
| Accusation accuracy | >=45% | **69.4%** | **70.9%** |

### Carried watch items (unchanged posture)
- Gambit fire (pooled ~35%) stays the known pre-existing FAIL judged on the deliberate split (in its
  10–20 informal band) — unchanged from the T2-1 lock.
- Saboteur gambler-free ~30–31% vs the 30% archetype guard line (T2-1 watch item) — unmoved by T2-2;
  still tracked (the hoard-tax idea remains a candidate home if it confirms >30%).
- Difficulty-tier (knight/squire) magnitudes stale (pre-T2-1) — recalibrate at the next
  difficulty-touching stage.

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
| Shadowking win rate | 19.2% | 18.0%–22.0% | ✅ PASS |
| Mean game length (rounds) | 12.16 | 10–16 | ✅ PASS |
| Gambit fire rate (gambler-free, ~1-in-6-to-8) | 35.2% | 10.0%–20.0% | ❌ FAIL |

## No-dominant-strategy check
Even per-seat win share ≈ **26.9%**. ✅ PASS — no archetype dominates.

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
| aggressor | 1760 | 270 | 15.3% |
| baseline | 3000 | 807 | 26.9% |
| cooperator | 1560 | 475 | 30.4% |
| gambler | 1480 | 560 | 37.8% |
| opportunist | 1640 | 421 | 25.7% |
| saboteur | 1440 | 433 | 30.1% |
| turtle | 1720 | 427 | 24.8% |

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **2.72** vs the field's **2.97**.
✅ Free-riding is not rewarded (winners pledge at least their share).

## Game endings
| Reason | Count | Share |
|---|---|---|
| attrition | 79 | 1.9% |
| doom_complete | 728 | 17.3% |
| gambit_victory | 470 | 11.2% |
| last_standing | 392 | 9.3% |
| territory_victory | 2531 | 60.3% |

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | 35.2% | the HONEST gambit number (judge the §9 band on this) |
| Gambit seize / win rate (all matchups) | 49.7% / 11.2% | aggregate, inflated by the gambler archetype |
| Eliminations per game | 0.36 | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | 9.3% | share of games decided by the last Warlord standing |
| DK kills per game | 2.99 | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | 6.62 / 3.96 | social density (sworn) + betrayal drama (67.7% of oaths broken) |
| Forge tolls per game | 2.10 | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | 3.57 · 46.4% | build-identity uptake (§ Herald) |
| Herald captures/game | 2.18 | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | 27.6% / 26.4% | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | 5.50 | how close the dark got |
| Pledge full-block rate | 41.3% | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | 92.6 · 7.58 | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | 9.8% | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
| 2p | 1400 | 18.6% | 11.4 | 0.13 | 62.9% |
| 3p | 1400 | 21.9% | 12.1 | 0.20 | 46.5% |
| 4p | 1400 | 17.1% | 13.0 | 0.76 | 39.6% |

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | 1.38 / 0.38 | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | 27.5% | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | 0.25 | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | 17.8% | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | 17.3% / 1.9% | the §6 dark-win split; last-standing player ending 9.3% |
| Mean earliest elimination · dead-time proxy | 10.8 · 77.1% | spectator dead-time = earliest deposal / ROUND_CAP(14) |
| Early-death flag rate (< 7 rounds) | 1.9% | games where a seat died before ROUND_CAP × 0.5 (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | 0 / 208 / 1318 | elimination-timing distribution |
| Mid-game leader win rate · comeback | 50.2% · 49.8% | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | 59.2% / 24.3% / 16.5% | §5.1 flip outcome mix |
| Court at March (median · mean pieces/seat) | 3 · 2.87 | T2-1 "feed the court" — the pitch's courts-of-3–4-by-March check |
| Passive-seat win rate (min engagement) | 34.7% | T2-2 "hiding is dangerous" — must sit BELOW the even share 26.9%; winner engagement 38.1 vs field 41.7 |
| Top archetype win rate (≤ 30.0% guard) | 37.8% | ❌ FAIL — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | 17.6% / 17.6% | split of the 35.2% honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | 50.0% | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | 35.3% / 14.4% | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | 3.5% / 3.1% | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | 17.8% | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | 31.3% | Q2 — is the dominance FAIL gambler-driven? (vs 37.8% with gambler) |
| 5i: baseline (default/field-filler) win rate — gambler-free | 28.4% | the gambler-free breach is the NEUTRAL DEFAULT, structurally over-weighted as the oneVsField filler — not a chosen strategy |
| 5i: top CHOSEN strategy — gambler-free | saboteur @ 31.3% | best deliberately-picked strategy (excl. baseline+gambler); under the 30.0% guard ⇒ cooperator dominance is a pairwise artifact |

## End Act
| Act | Count | Share |
|---|---|---|
| MARCH | 1344 | 32.0% |
| RECKONING | 2568 | 61.1% |
| WHISPER | 288 | 6.9% |

