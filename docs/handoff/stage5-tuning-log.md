# Stage 5 — Balance Tuning Log

Real evidence trail for every tuning step (no boilerplate — the v1 ML-system failure was
undocumented balance mutation). One block per coordinate-descent step.

**Targets** (`src/v2/sim/report.ts` `TARGETS`): SK win 18–22% · rounds 10–16 · gambit 10–20%
(judge on the **gambler-free** diagnostic) · rescues 2–4. **Guardrails:** no dominant strategy;
free-riding not rewarded. **Stability:** each of 2/3/4p SK-win within ~±5pp of pooled; lock only
after a 2-seed re-run. **Blood Pact:** traitor win 12–20%, accusation accuracy ≥45%, ≤2.5
accusations/game, exposure 40–70%.

**How to run a step:** edit `src/v2/tunables.ts` (or, for the search, pass overrides to
`runTunableCandidates` / `npm run sim`), `npm run sim` + `npm run sim -- --bloodpact`, read the
REPORT diagnostics, record the block, KEEP or REVERT.

### Block format
```
## <stepId> — <one-line hypothesis>
Lever(s): <const> <old>→<new>, ...
Sweep: <runId> (<games> games), commit <sha>
Before → After (4 bands + 2 guards + per-count):
  SK win   <a>% → <b>%   [PASS/FAIL]   (2p .. / 3p .. / 4p ..)
  rounds   <a>  → <b>     [..]
  rescues  <a>  → <b>     [..]
  gambit(gambler-free) <a>% → <b>%  [..]
  dominance <..> / free-rider <..>   [held / FLIPPED]
Side effects: <key diagnostics that moved>
Decision: KEEP / REVERT — <why>. Next: <lever>.
```

---

## 5a-baseline — the "before" (no tunable changed; diagnostics added)
Sweep: s20260622-n40 (4200 games competitive + 360 BP), post-4g hardening.
- SK win **14.3%** [FAIL] — per-count **2p 29.2% / 3p 11.6% / 4p 1.9%** (the real problem: doomCost
  player-count SCALING — the dark is unwinnable at 4p).
- rounds 11.9 [PASS]
- rescues **0.10/game** [FAIL] — breaks 0.73/game, conditional-rescue 13.4%, **DK-kills 0.00/game**
  (players never engage the dark's forces → pushback/grudge dormant).
- gambit(gambler-free) **27.2%** [FAIL, mildly above 10–20].
- dominance PASS (gambler 44.9%) · free-rider NOT rewarded PASS.
- BP: traitor win 8.9%, exposure 71.7%, accusation accuracy **20.5%** (≈ random), 3.5 accusations/game.
- Pledge full-block 40%, mean ashed 6.09.

**Decision: the data is the baseline.** 5c targets the doomCost player-count scaling first
(`DOOM_COST_*` + `DOOM_COST_PLAYER_DIVISOR` are now injectable via the 5b seam).

<!-- 5c+ blocks appended below -->

## 5c — tune the dark (doomCost player-count scaling + landed-strike damage)
Lever(s): `DOOM_COST_WHISPER` 3→6, `DOOM_COST_MARCH` 5→9, `DOOM_COST_RECKONING` 8→12,
`DOOM_COST_PER_PLAYER` 0→6, `SPREAD_AMOUNT_BASE` 2→5.
Sweep: s20260622-n40 (4200 games) — LOCKED defaults, plus a 2nd-seed confirm s13371337-n24.
Search: 5 candidate grids (~120k games) via `scripts/tune-5c.mjs` (runSweep + tuningLoss).

Before (5a) → After (locked):
  SK win   14.3% → **20.2%**  [PASS]   per-count 2p 29.2→34.6 / 3p 11.6→17.9 / 4p 1.9→**7.9**
  rounds   11.9  → 11.52      [PASS]
  rescues  0.10  → 0.06       [FAIL — 5d's target, not 5c's]
  gambit(gambler-free) 27.2% → 26.7%  [unchanged — NOT a 5c regression; gambit is a separate concern]
  dominance PASS (even share 25.8%) / free-rider NOT-rewarded PASS   [both guards HELD]
2nd-seed (s13371337): SK win 20.3%, per-count 33.1/18.9/8.8, rounds 11.5, guards PASS — STABLE.

### Why these levers (mechanism)
`C = telegraph.doomCost` IS the strike threshold; `ratio = effective_pledge / C`; a strike lands
when ratio < 1. At high player counts 3-4 hands of pledge easily meet a low `C`, so strikes are
fully blocked and the dark cannot win. Raising the base AND adding a steep per-player tilt makes `C`
high enough at 4p (WHISPER 12 / MARCH 15 / RECKONING 18) that the table sometimes fails to block;
`SPREAD_AMOUNT_BASE=5` then makes those rare landed strikes actually hurt. At 2p the tilt floors `C`
to 1 (the dark is already dominant there — spread carries its damage).

### Dead lever finding
`DK_PER_PLAYER` / `DK_START_COUNT` scaling is a **dead lever for SK win rate** — scaling the Death
Knight army (even 2→4 at 4p) is byte-equivalent in outcome to baseline, because players never engage
the dark's forces (5a: dkKills = 0.00/game; the DKs sit on outer seams). Left at defaults. The DK
scaling seam stays wired (it's correct and tested) but is not used by the 5c tune.

### STRUCTURAL CAVEAT — per-count ±5pp is NOT achievable by number-tuning (ESCALATE)
The plan's strictness goal "each of 2p/3p/4p within ~±5pp of pooled" is **structurally unreachable**
with the current pledge/strike mechanic. Proven across 5 grids: an EXTREME doom probe (tilt6, 4p
doomCost up to 18) lifts 4p only to ~10% and actually *weakens* it past that, while nothing lifts 4p
to band without exploding 2p past 40% (which also flips the dominance guard). Root cause: pledge
supply scales with player count, so more allies ⇒ strikes blocked ⇒ co-op is structurally easier with
more players (a monotonic 2p→4p difficulty gradient, arguably desirable). **Closing the 4p gap fully
needs a MECHANIC change** (e.g. per-player-decaying pledge effectiveness, or a strike threshold that
scales super-linearly with pledge supply) — a design decision deferred to the user, NOT a number.

Decision: **KEEP** — 5c's primary targets (SK-win 18-22%, rounds 10-16) and both guardrails PASS and
are 2-seed-stable; 4p lifted from 1.9%→7.9% (as far as numbers allow). Per-count flatness reframed as
a documented structural limitation. Next: 5d (rescue/break economy — breaks 0.95/game,
conditional-rescue 6.6%; both must rise for 2-4 rescues/game).

## 5-dark — Dark Engagement mechanic patch (the dead-grudge fix)

**Trigger:** the reconvened 5-expert focus group (`DESIGN-V2-FOCUS-GROUP-R2.md`) ruled the dormant
DK-engagement pillar (dkKills 0.00) a *structural inverted incentive*, not a number — and the user
authorized a MECHANIC change before settling the per-count fork. Spec: `DESIGN-V2-DARK-ENGAGEMENT.md`.

**Changes (five coupled):** (1) AI `darkHuntBias` knob + cards-aware `canStrikeWin` + `bestStepTowardHuntableDK`
(the Hunt verb — the old gate compared base power only, so a power-3 Warlord never struck a power-4 DK);
(2) killing a DK on an unclaimed Holding/Forge CLAIMS it free (win-currency payoff); (3) asymmetric
grudge Mark — `GRUDGE_MARK_TOP_N=2`, only leading seats pay the "now it hunts you" tax (catch-up lever);
(4) DKs block CLAIM (`DK_BLOCKS_CLAIM`, the forcing function); (5) `DK_PER_PLAYER` 0→1 + respawn scales
with player count (revives the dead lever now that DKs are engaged).

**Sim result (4200 games, s20260622-n40, vs 5c LOCKED):**
| Metric | 5c | 5-dark | Note |
|---|---|---|---|
| **DK kills / game** | **0.00** | **1.88** | the pillar is alive |
| SK win pooled | 20.2% | **23.9%** | now ABOVE band — needs a small retune down |
| per-count SK win | 34.6 / 17.9 / 7.9 | **35.2 / 24.7 / 11.8** | gap 26.7pp→23.4pp; 3p +6.8, 4p +3.9 (2p ~flat) |
| Gambit honest fire | 26.7% | 25.1% | drifting toward band, still high |
| Endings (terr/doom/gambit) | 49.6 / 20.2 / 27.8 | 47.6 / 23.9 / 26.0 | less solitaire, more dark |
| no-dominant (even seat) | 25.8% | 24.6% | PASS; archetype spread 4.6x→3.0x (narrower) |
| Rescues / game | 0.06 | 0.06 | unchanged — that's 5d (same win-currency template applies) |

Reading: the patch achieved its design goal — engaging the dark went from impossible to ~2/game, the
per-count gradient compressed, and wins shifted off the quiet territory race. **Cost:** SK-win overshot
to 23.9% (engagement + DK scaling added pressure) — a tuning residual, not a regression (suite green).

### 5-dark retune (coordinate-descent via `scripts/tune-5dark.mjs`, LOCKED)
Searched SPREAD_AMOUNT_BASE / DOOM_COST_PER_PLAYER / DK_PER_PLAYER to pull pooled SK-win back into band
while preserving DK-kills + the narrowed gradient + guards. Two finalists, both in-band and 2-seed-stable:

| candidate | pooled (s1/s2) | 2p/3p/4p | spread | dkKills | note |
|---|---|---|---|---|---|
| `spread4` (keep dkpp1) | 20.4 / 20.5 | 30.9/21.8/8.6 | 22.2 | 1.98 | one-lever |
| **`spread4 + dkpp0`** ✅ | **20.4 / 19.6** | 30.9/21.8/8.9 | 22.1 | **2.05** | flatter, more engagement, lower loss on BOTH seeds |

**LOCKED: `SPREAD_AMOUNT_BASE 5→4`, `DK_PER_PLAYER 1→0`.** Confirmation sweep (4200 games, s20260622-n40):
SK-win **20.5% PASS**, rounds 11.93 PASS, **DK-kills 2.05**, per-count 30.9/21.8/8.9 (gradient 22.0pp vs
5c's 26.7pp — flatter), guards PASS (even seat 25.6%, free-riding not rewarded), 2-seed stable (s13371337
19.6%). Endings terr 50.7 / doom 20.5 / gambit 26.2.

**KEY FINDING — DK-army scaling BACKFIRES once kills pay.** The 40K panelist's hypothesis (scale DKs with
player count to pressure 4p) was REFUTED by the search: with DK_PER_PLAYER=1, 4p SK-win was *lower* than
with =0, because more rewarding DKs = more free claims + pushback the players harvest. So the dead lever
stays dead — engagement comes from the other four 5-dark levers (Hunt verb, win-currency claim, asymmetric
grudge, DK-blocks-claim), not army size. The DK_PER_PLAYER seam stays wired (correct, tested) but at 0.

Side notes (carry into 5d/5e, NOT 5-dark regressions): Gambit honest fire 25.2% (still > 10-20 band —
the focus group said fix AFTER the dead pillars; drifted 26.7→25.2). Rescues 0.07 (still dormant — that's
5d, same win-currency template applies). Turtle archetype 27.1→15.8% (passivity is riskier with a
contesting dark; the no-dominant guard still holds, spread narrowed 4.6x→2.6x).

Decision: **LOCK 5-dark.** The dead-grudge pillar is revived (DK-kills 0.00→2.05), SK-win is back in band
and 2-seed-stable, the per-count gradient is flatter, and all guards hold. The per-count A/B fork
(FOCUS-GROUP-R2 §3) is now decidable on this new data; rescues (5d) are next.

### Per-count A/B fork — RESOLVED (2026-06-22): decision A (lock + name the tiers)
With the dark-engagement fix landed (per-count 2p 30.9 / 3p 21.8 / 4p 8.9, gradient 22.0pp, dark credible
at every count), the lead designer chose **A — accept the monotonic gradient and ship it as a named
identity ladder**: 2p **The Duel** / 3p **The Triumvirate** / 4p **The Carve-up** (canonized in
`DESIGN-V2-ALGORITHM.md` §9.1; the 5c escalation is now closed). Option B (marginal-pledge-effectiveness
decay) is recorded but NOT built — it carries the proven 2p-explosion / dominance-flip risk and the
gradient is no longer extreme. The pooled 18–22% SK-win target stands as the per-count contract.

## 5d — Rescue/break economy (spec: DESIGN-V2-RESCUE-ECONOMY.md)

**Problem:** rescues 0.07/game (target 2–4). Two coupled gates: (1) breaks ~1/game — wounds came ONLY
from PvP raids (rare, negative-sum) + lost strikes; the dark ashed nodes but never wounded a warlord;
(2) rescue paid a soft favor (the same inverted-currency disease as the grudge), and the AI could only
rescue an *already-adjacent* broken ally.

**Changes:** (a) `LANDED_STRIKE_WOUNDS` — the dark wounds its named target on a landed strike (the §5.4
break-vector; "leading is dangerous" bites); (b) `RESCUE_TRIBUTE_BANNERS` — the rescued pays the rescuer
a banner tribute (win-currency payoff); (c) AI `bestStepTowardBrokenAlly` rescue-seek verb + raised
archetype `rescueWillingness`; (d) seam-wired `BREAK_THRESHOLD`, `RESCUE_COST`, `BROKEN_MAX_ROUNDS`.

**Search (`scripts/tune-5d.mjs`, 3 grids + 2-seed confirm).** Coordinate descent over LANDED_STRIKE_WOUNDS
× BREAK_THRESHOLD × BROKEN_MAX_ROUNDS × SPREAD × rescue(cost/tribute). **LOCKED: `LANDED_STRIKE_WOUNDS`
0→2, `BROKEN_MAX_ROUNDS` 3→2, `RESCUE_COST` 2→1, `RESCUE_TRIBUTE_BANNERS` 0→2** (BREAK_THRESHOLD kept 6,
SPREAD kept 4). Confirmation sweep (s20260622-n40):

| Metric | pre-5d | 5d LOCKED |
|---|---|---|
| Rescues / game | 0.07 | **0.98** (per-count 2p 0.21 / 3p 0.88 / **4p 1.85**) |
| Conditional rescue (rescues/break) | 7% | **51.5%** |
| Breaks / game | 0.99 | 1.90 |
| SK-win | 20.5% | **19.1% ✅** (2-seed stable 18.5%) |
| all_broken | 2.6% | **2.9% ✅** (<5%) |
| guards / DK-kills | PASS / 2.05 | PASS (even seat 26.0%) / 2.03 |

**STRUCTURAL FINDING — pooled 2–4 rescues is capped by the all_broken<5% guardrail.** Two mechanisms:
(1) breaking the leader makes the dark *thrash its steered front* (it abandons a half-ashed spoke when
the Crown moves) → MORE breaks WEAKEN the dark below the 18% floor; (2) frequent breaks pile into
mutual-loss (all_broken) draws faster than rescues can offset (baseline seats — 24% — never rescue, and
not every break is reachable). The frontier: at rescues ~1.5, all_broken ~8% (FAIL); at rescues ~1.0,
all_broken ~3% + SK in band (the lock). Proven across 3 grids. **Like the 5c per-count cap, the literal
target is structurally unreachable inside the higher-priority guardrails.** BUT the per-count view shows
the economy IS alive where it makes sense — 4p 1.85, 3p 0.88 (2p 0.21 is naturally low: rescuing your
sole rival is rare). The pillar went from DEAD (0.07, cond-rescue 7%) to a live recurring beat (14×,
cond-rescue 51%). Closing to pooled 2–4 needs a DESIGN change (don't end the game on all-broken / defer
the broken-lands ash so rescue *protects the table*) — ESCALATED to the user.

Side note (5e): gambit honest fire drifted 25.2→28.0% (still > 10–20 band) — the separate gambit item,
not a rescue regression; fold a small GAMBIT_SURCHARGE nerf into 5e.

## Oaths + Ledger — the passion spine (spec: DESIGN-V2-OATHS.md)

**Trigger:** the reconvened panel's 3rd session (`DESIGN-V2-FOCUS-GROUP-R3.md`) diagnosed the game as
"sound but emotionally thin — no relationship between two players ever persists or can be betrayed." The
convergent 3/5 headline: a public, breakable **Oath** between players, enforced by a villain that
**remembers** (the **Ledger** = the existing grudge array; oathbreaking climbs it, so the dark hunts
traitors). Absorbs Rescue (a rescue auto-forges an Oath). Kept OFF the card economy (banners + grudge).

**Build:** new `state.oaths[]`, `SWEAR_OATH` (free) / `BREAK_OATH` (consumes an action; +banner burst,
+grudge, no same-round farming) actions, Dawn upkeep (fealty dividend + strain + maturity bonus),
non-aggression between sworn allies, rescue auto-swear; AI `oathWillingness`/`oathLoyalty` knobs +
`bestStepTowardBrokenAlly`-style swear/break loop; oath metrics in the sim. 5 oath tunables wired.

**First sim (defaults):** oaths sworn **6.58/game**, broken **4.24** — the social density landed
(exceeds v1's ~5 vassal events/game). BUT the banner dividends + non-aggression weakened the dark to
**15.4%** (below floor) and the 72% break share was too cynical.

**Retune (`scripts/tune-oaths.mjs`, 3 grids + 2-seed confirm):** raised archetype loyalty (opportunist
0.3→0.5, saboteur 0.2→0.45, aggressor 0.3→0.45) for a healthier ~50–64% break share; searched the
dark-strength + oath-economy levers. **LOCKED: `SPREAD_AMOUNT_BASE` 4→5 + `LANDED_STRIKE_WOUNDS` 2→3**
(Oath non-aggression cut PvP Breaks, so a harder dark-wound restores breaks/rescues). The div0 and gob1
variants failed a guard on a 2nd seed; `spr5 w3` was the only finalist in-band AND guards-PASS on BOTH.

**Confirmation sweep (s20260622-n40):**
| Metric | pre-Oaths | Oaths LOCKED |
|---|---|---|
| Oaths sworn / broken per game | 0 / 0 | **5.82 / 3.27** (63.9% break) |
| SK-win | 20.5% (5d) | **18.7% ✅** (2-seed stable 19.3%) |
| Rescues / game | 0.98 (5d) | 0.81 (Oaths cut PvP breaks; rescue auto-forges Oaths) |
| Breaks / game | 1.90 | 1.65 |
| all_broken / DK-kills | 2.9% / 2.03 | **2.3% ✅** / 2.05 (5-dark intact) |
| guards (even seat / free-rider) | PASS | PASS (26.3% / not rewarded) |

Reading: the passion goal is **met** — the table now forms ~6 alliances and ~3 betrayals per game, the
villain hunts oathbreakers (the Ledger), and Rescue is absorbed as the dramatic earned Oath. SK-win is
back in band and 2-seed-stable; all guards hold. Side note (5e): gambit honest fire 28.4% (still > band)
— the long-standing separate item, fold a small GAMBIT_SURCHARGE nerf into 5e.

Decision: **LOCK Oaths.** The convergent passion spine ships; the per-count ladder + 18–22% band + the
no-dominant/free-rider guards all hold. Next: 5e (Blood Pact accusation + the gambit nerf), then 5f.

## Stage T — Forge-as-Gate tolls (FOCUS-GROUP-R3 §4, the R3 build wave)

**What:** marching INTO a rival-owned, living Forge pays the owner a banner toll, in the open — the
chokepoint tax (every Keep→Keystone path crosses exactly one Forge), taxing the front-runner heading for
the center. Sworn allies pass free. Engine in `executeMarch` (toll-aware affordability + zero-sum
transfer, mirrors the rescue-tribute); AI `forgeValuation` knob (≥0.5 charges through, <0.5 routes
around — toll-aware `marchCostFor` keeps every march proposal affordable so the reducer never rejects
one); `tollsPaid` metric.

**Search (`scripts/tune-tolls.mjs`, 2-seed):** tolls barely move SK-win (banner transfers are zero-sum;
the friction is mild). LOCKED **`FORGE_TOLL_COST` 0 → 1** (SPREAD kept 5 — no compensator needed).
Confirmation (s20260622-n40): SK-win **18.6% ✅** (2-seed 19.4%), tolls **0.74/game** (chokepoint
leverage live), oaths intact (5.79/3.25), per-count ladder monotonic (2p 22.8 > 3p 21.5 > 4p 11.6),
guards PASS, all_broken 2.3%, DK-kills 2.05. 396 tests. The `spr6` variant landed SK more central (20.4%)
but broke ladder monotonicity (3p>2p), so the one-lever `toll1` won. Tolls fire only ~0.74/game (the AI
mostly claims its own quadrant's Forge early, so few cross a rival's) — a modest positional layer, not a
dominant mechanic; honest and in the sanity range. Gambit honest fire 28.5% unchanged (Stage S's job).

## Stage S — Sealed Pledge + the Gambit fix (FOCUS-GROUP-R3 §3, R3 build wave 2/3)

**What:** the over-firing Crown's Gambit (gambler-free honest fire 26.7%, > 10-20 band — open since 5a)
finally fixed. Two parts: (1) **Sealed Pledge** (`SEALED_CORE_PLEDGE` 'off'→'gambit_claimant') — the
named Gambit claimant's pledge is now concealed (reuses the blood_pact PLEDGE_COMMITTED machinery via a
new `isPledgeSealed` helper). This is a HUMAN-facing drama feature and a sim no-op on its own (the
deterministic AI never reads rivals' pledges). (2) the functional lever — a **risk-aware Gambit gate**
(`GAMBIT_SELF_COVER_CARDS` 0→4): when a claimant's pledge will be sealed it can't count on rivals
bailing it out, so the AI only seizes the Keystone if it holds ≥4 cards to self-defend → speculative
thin-hand Gambits are suppressed. (Matches the MTG-judge's volunteer's-dilemma intent.)

**Search (`scripts/tune-sealed-pledge.mjs`, 3 grids + 2-seed).** Tightening the gate fixes the gambit
but RAISES SK-win (Gambits are a player win-path; suppressing them strengthens the dark), so the winner
pairs the gate with a fine doom compensator. **LOCKED: `SEALED_CORE_PLEDGE`='gambit_claimant',
`GAMBIT_SELF_COVER_CARDS`=4, `DOOM_COST_PER_PLAYER` 6→5.** Confirmation (s20260622-n40):

| Metric | pre-S | Stage S LOCKED |
|---|---|---|
| Gambit fire (gambler-free, honest) | 26.7% | **14.3% ✅** (in 10-20 band) |
| Gambit-victory share | ~29% | **19.0%** |
| SK-win | 18.6% | **21.3% ✅** (2-seed 20.6%) |
| guards / oaths / tolls / DK-kills | PASS / 5.79 / 0.74 / 2.05 | PASS / 6.08 / 0.89 / 2.35 |

**This RESOLVES the long-standing gambit-nerf TODO** — sealing + the gate did it; `GAMBIT_SURCHARGE`
stays 0.25 (no double-nerf). 401 tests. The all-matchups gambit fire (33.5%) still reads FAIL but is the
gambler-archetype-inflated number; the honest gambler-free 14.3% is the real (in-band) result.
SIDE-EFFECT: the `DOOM_COST_PER_PLAYER` 6→5 compensator shifted the per-count curve — now 2p 23.6 / 3p
25.7 / 4p 14.6 (mildly non-monotonic; 3p edges 2p by ~2pp). Pooled in band + guards hold; the named
ladder is "2p & 3p both hard, 4p the Carve-up" — accept, or restore strict monotonicity in a future tune.

## Stage H — Herald + political/martial stance (FOCUS-GROUP-R3 §3, R3 build wave 3/3, the big re-tune)

**What:** the build-identity axis. RECRUIT a Herald = commit to the POLITICAL stance (sticky):
`+HERALD_HAND_BONUS` hand cap (deep hand) and `−HERALD_COMBAT_PENALTY` combat power (the "fighter off
the board" tradeoff) — vs the default MARTIAL build (fat board). Plus PARLEY, a non-card pushback vs the
dark (the Herald verb). Engine: per-player `handLimit` (sequencer Dawn `HAND_LIMIT`→`p.handLimit`),
`combatPenalty` subtracted in `getPlayerPowerAtNode`, `executeRecruit`/`executeParley`, a 'PARLEY' action;
AI `heraldAffinity`/`parleyBias` knobs (turtle/cooperator high → political; gambler/aggressor → martial).
MVP abstracts the literal lone-runner Herald *piece* (deferred) — the stance + Parley capture the axis +
the non-card verb without the piece-selector march refactor.

**First sim (Herald defaults):** political build heavily adopted (59% of seats, 1.78 Heralds/game — the
axis is ALIVE) but it destabilized the dark as the panel warned: SK-win fell to **14.8%** (Parley
pushback + deep-hand political pledging, full-block 49.6%). Build win rate political 23.9% / martial 33.5%.

**Search (`scripts/tune-herald.mjs`, 2 grids + 2-seed).** SK-win recovery needed a real dark buff. LOCKED
**`SPREAD_AMOUNT_BASE` 5→7 + `HERALD_HAND_BONUS` 2→1** (kept `HERALD_COMBAT_PENALTY`=1 — the tradeoff —
and `HERALD_PUSHBACK`=1 — the verb). Confirmation (s20260622-n40): SK-win **20.0% ✅** (2-seed 19.6%),
gambler-free gambit **17.0% ✅** (the Stage-S fix survived), guards PASS, oaths 6.13/3.46, tolls 0.89,
DK-kills 2.13, all_broken 2.0%, 406 tests. Heralds 1.78/game, political share 59%.

**FINDING — the political/martial "parity" metric is CONFOUNDED.** Political seats win ~22.5% vs martial
~31% (≈1.4×), but this reflects WHICH archetypes go political (the cautious turtle/cooperator) not a
stance imbalance — the no-dominant-archetype guard passes and political is viable (not a trap). So the
lock criterion is SK-band + gambit + guards, NOT strict win-rate parity (which can't be hit while
archetype identities drive stance choice). SPREAD=7 also means a half-blocked strike now reaches the ash
cap (BLIGHT_TO_ASH) — a harder-hitting dark, offsetting the Herald pushback (a blight test was updated to
reflect the cap). Per-count ladder stays non-monotonic (2p 19.6 / 3p 24.4 / 4p 16.1) — all counts credible.

## Stage R — final both-modes re-baseline (R3 wave close-out)

Confirmed the three R3 mechanics co-exist across BOTH modes at the locked tunables.
- **Competitive** (s20260622-n40, 2-seed): SK-win 20.0% ✅, gambit-noG 17.0% ✅, rounds 12.2 ✅,
  guards PASS; the layers all live — oaths 6.13/3.46, tolls 0.89, DK-kills 2.13, heralds 1.78/game
  (59% political). (Carried items: rescues ~0.7 [capped, escalated], per-count ladder non-monotonic.)
- **Blood Pact** (s20260622-n24-bp): runs clean (no R3 breakage). Traitor win 8.8%, exposure 87.0%,
  accusations 1.60/game, accusation accuracy **54.3%** (already ≥45%). Traitor-win (want 12-20) +
  exposure (want 40-70) are the PRE-EXISTING 5e tuning targets — unchanged in character by R3.

The R3 build wave is COMPLETE. Remaining Phase 5: **5e** (Blood Pact `chooseAccusation` heuristic +
ACCUSATION knobs → lift traitor win into 12-20, pull exposure into 40-70, keep accuracy ≥45) and **5f**
(final 2-seed lock + the §9 doc: amend ROADMAP §2 "open in core" — sealed gambit-claimant ships — and
document the three new mechanics + the named per-count ladder).

---

## §C2 — Measurement instruments + the placeholder-tunable confirmation (close-loose-ends wave)

Two instruments + one real seam-bug finding. No balance change (all defaults byte-identical;
baseline SK still 20.1% @16 seeds).

**Session-length proxy.** Added `playerActions` to `GameMetrics` (total ACTION decisions/game,
incl. PASS) → `meanPlayerActions` + `meanActionsPerRound` diagnostics in `report.ts`. The 30–45 min
scope target is now *measured*, not assumed. (Read it off the next full re-baseline; flag if density
drifts high after the verb-count doubling.)

**Placeholder confirmation sweep (`scripts/tune-confirm-placeholders.mjs`).** Probed the 6 levers
that never got a dedicated search: PLEDGE_SHIELD_AMOUNT, PLEDGE_FAVOR_GRUDGE_REDUCTION,
DK_MARCH_DISTANCE, SURGE_SPREAD_MULT, GAMBIT_ADJACENT_STRIKE_MULT, RESCUE_DEBT_MIN_PLEDGE.

*Finding 1 — a real seam bug (FIXED).* All six were read as **static module imports**, never via
`getTunables()`, and were absent from the `Tunables` interface + `DEFAULT_TUNABLES` — so they were
**un-injectable** (a sweep override silently did nothing; first run showed exactly 0.0pp / no metric
moved on every probe). Fixed: added them to the `Tunables` interface + `DEFAULT_TUNABLES` and routed
all six consumers (`blight.ts`, `sequencer.ts`, `actions.ts`, `shadowking-effects.ts`) through
`getTunables().X`. Defaults unchanged → byte-identical baseline.

*Finding 2 — PLEDGE_SHIELD_AMOUNT is LOAD-BEARING, not low-impact.* Now that it's reachable, ±1
swings pooled SK-win ±~5.5pp: `=0 → 25.9%` (OUT, dark too strong), `=2 → 14.8%` (OUT, too weak),
`=1 (locked) → 20.1%` (in band). The anti-free-rider shield directly subtracts from the strike's
blight damage on pledgers, so it is effectively a primary dark-strength compensator that had been
frozen at a (fortunately correct) default. **Kept at 1** (validated in-band); now documented as a
first-class lever for future tuning, NOT a "reasonable default".

*The other five* are now wired + low-impact at ±1 (PLEDGE_FAVOR_GRUDGE_REDUCTION ±≤1.8pp,
DK_MARCH_DISTANCE ±≤0.4pp, SURGE_SPREAD_MULT ≤0.5pp, RESCUE_DEBT_MIN_PLEDGE ≤0.9pp,
GAMBIT_ADJACENT_STRIKE_MULT 0.0pp on SK but moves gambit-game blight) — defaults confirmed safe.
RESCUE_DEBT_MIN_PLEDGE is slated for retirement in Stage M (rescue→Oath merge).

---

## §A — All-broken → Shadowking victory (close-loose-ends wave)

**Mechanic.** A whole-table Break is now a **Shadowking win by attrition**, not a draw
(`winner=null` → dark wins; Blood-Pact traitor takes it unless exposed — mirrors doom_complete).
Both terminal sites updated (`sequencer.ts` runDawnPhase + `reducer.ts` post-action). `shadowkingWin`
metric now counts doom_complete OR all_broken; `allBrokenWin` is a sub-type flag (+ new
`allBrokenWinShare` soft guard: the dark should win mostly by the Keystone assault, not attrition).

**Balance.** Reclassifying draws→SK-wins added ~+2.3pp, putting pooled SK-win at the 22.0% ceiling
(at-edge → fragile for a 2-seed lock). The bump concentrates at **2p** (a 2-player table is the
easiest to fully break). Recenter search (`scripts/tune-allbroken.mjs`, 24 seeds):
- global trims (SPREAD 7→6) drop pooled to 19.4 but crater 4p to 13.6 (below the 16 floor);
- `LANDED_STRIKE_WOUNDS` 3→2 hits 21.7 but guts rescues (breaks gate rescues);
- the per-count lever `DOOM_COST_PER_PLAYER` props the 4p floor.

**LOCKED: SPREAD_AMOUNT_BASE 7→6 + DOOM_COST_PER_PLAYER 5→6** (the latter reverts the Stage-S
nerf — the gambit fix is the seize gate, not this lever, so the gambit band is unaffected). 2-seed ×40:
SK-win **20.3% / 19.6%** (comfortable headroom), gambit-free 18.5/18.8%, rounds 12.2, rescues
0.82/0.79 (slightly UP), guards PASS, all-broken share ~10% (assault still wins ~90% of dark games).

**Ladder note.** all_broken makes **2p the hardest count again** (2p≈25 / 3p≈19 / 4p≈15 — monotonic
decreasing), restoring the ORIGINAL "The Duel = survival-horror, hardest" intent that the Stage-S
doom-tilt had inverted to 3p-hardest. §9.1 reframed accordingly. RESCUE CAP UNCHANGED: this fixes the
ENDING quality, it does not lift the structural ~1-rescue cap (the user chose the SK-win ending over
the claw-back that would have).

---

## §M — Merge rescue-debt into a single Oath (close-loose-ends wave)

**Why.** A rescue created TWO overlapping bonds — a `rescueDebt` (forced-min-Pledge + withheld-attack
on the creditor) AND an auto-forged Oath. Four rules for one hug; R3's intent was Oaths as the ONE
social spine.

**Change.** Rescue now forges only an **Oath**; `rescueDebt` is fully retired (type, state field, init,
the reducer forced-min-Pledge gate, the AI choosePledge floor + raidDebtBlocked helper, the Dawn debt
clear, the `RESCUE_DEBT_MIN_PLEDGE` tunable). The Oath's non-aggression replaces the withheld-attack
(a sworn pair can't RAID — covers "don't stab your rescuer"); the banner tribute stays as the
always-present string when an Oath can't form (one slot each). `actions.test`/`mechanics-3f` updated:
the old 4 debt-enforcement tests → 1 "rescue forges an Oath" test.

**Balance.** Neutral — dropping the rarely-fired forced-min-Pledge moved nothing material. 2-seed ×40:
SK-win **20.5% / 20.1%**, gambit-free 18.1/18.2%, rounds 12.2, rescues **0.84 / 0.83** (unchanged),
guards PASS. No re-tune required.

---

## §B — Sealed-pledge bail-out validation (close-loose-ends wave)

**The ask (user):** "we opted for the sealed pledge for a reason — find a creative way to test this.
Perhaps assign percentage points for a bluffing system." The seal was a sim NO-OP (the AI never read
rivals' pledges), so its value was an untested human claim.

**The channel.** Gave the AI a bail-out / volunteer's-dilemma model: a rival may pledge EXTRA to cover
a named Gambit claimant (`AIPolicy.bailoutTrust` per archetype: cooperator 0.85 / turtle 0.7 /
opportunist 0.4 / aggressor 0.2 / gambler,saboteur 0). The SEAL changes HOW it fires:
- OPEN (`'off'`) → the table coordinates: one designated rival (most spare cards) covers. Efficient.
- SEALED (`'gambit_claimant'`/`'all'`) → each rival volunteers INDEPENDENTLY with prob
  `BAILOUT_BASE_PCT(0.5)·bailoutTrust` — a real bluff (under-provision / waste). DEFAULT_AI_POLICY has
  no bailoutTrust ⇒ byte-identical.

**Validation (`scripts/tune-bluff.mjs`, 40 seeds — all arms run the SAME bail-out AI, so a delta IS
the seal's effect):**
| arm | SK-win | gambit fire (noG) | gambit seize | claimant Gambit-WIN |
|---|---|---|---|---|
| open ('off') | 17.0% | 26.4% | 43.2% | 26.4% |
| sealed claimant (LOCKED) | 20.3% | 18.1% | 36.3% | 19.4% |

**Finding — the seal is a REAL volunteer's dilemma in-sim (not a no-op):** sealing cuts the claimant's
Gambit-win by **−7pp**, gambit seize by −6.9pp, and lifts SK-win by **+3.3pp**. It both (a) makes the
gambit a genuine bet (rivals can't reliably bail you) and (b) REINFORCES the Stage-S gambit-fire fix —
open over-fires at 26.4%, sealed lands in-band at 18.1%. KEPT at `'gambit_claimant'`. The *felt* drama
remains a human-only claim → `docs/human-playtest-checklist.md` §1.

**Balance.** The bail-out AI is now part of the locked sim; bands hold 2-seed ×40: SK-win 20.3% / 19.8%,
gambit-free 18.1/18.2%, rounds 12.2, rescues 0.83/0.82, guards PASS. New tunable `BAILOUT_BASE_PCT=0.5`.

---

## §HL — The literal Herald lone-runner piece (close-loose-ends wave)

**Why (user):** "Build the literal lone-runner now." The abstract Herald (a stance flag + Parley
from the Warlord) delivered the build-identity axis but not the panel's table-drama — a single
vulnerable runner crossing the blight while the table watches "will he make it?".

**Build.** New `'herald'` PieceType + `PlayerState.heraldNodeId`. RECRUIT spawns the Herald at the
Warlord's node; it MARCHes independently (`pieceId:'herald'` — 1 banner, no toll/ZoC/Gambit); PARLEY
now fires from the RUNNER's node (`parleyTarget` reads heraldNodeId), so a political player must
ESCORT the Herald to the front. A rival Warlord or a Death Knight co-located with it at Dawn CAPTURES
it (`resolveHeraldCaptures`) → piece removed, stance reverts to martial (loses the hand bonus). The AI
routes the runner to a SAFE node adjacent to the blight (parley from cover) and never steps onto a
hostile node — so captures happen only when the dark/rival ACTIVELY moves onto it (drama, not suicide).

**Balance.** The literal piece RAISED political uptake (re-recruitable after capture → more deep-hand
pledging) → dark too weak (SK-win 15.3% @ Stage-A defaults). First fix: safe AI routing dropped
captures 3.11→1.68/game (the runner now sometimes survives). Recenter (`scripts/tune-herald-piece.mjs`,
24 seeds): pumping SPREAD alone hit 18.7 (close to the floor); the cleaner lever was
**HERALD_RECRUIT_COST 2→4** (tames the re-recruit churn AND compensates the dark) paired with
**SPREAD_AMOUNT_BASE 6→7** (reverting Stage A's trim). LOCKED: **SPREAD_AMOUNT_BASE=7,
HERALD_RECRUIT_COST=4.**

**2-seed ×40:** SK-win 20.3% / 19.x%, gambit-free ~14–15%, rounds 12.2, rescues ~0.7, heralds ~2.8/game,
captures ~1.4/game (interception drama live), guards PASS. Ladder shifted back to **3p-hardest** (all
counts credible 16–24) — the per-count shape moves with each mechanic; §9.1 updated.

---

## §R2 — Final both-modes re-baseline (close-loose-ends wave COMPLETE)

Proves the five wave stages (A all-broken / M oath-merge / B bail-out / HL Herald-piece, on the
C1/C2 base) COEXIST — the per-stage locks each held in isolation; this confirms them together.

**Competitive (s20260622-n40), all §9 bands PASS + guards:**
- SK-win **20.2%**, rounds 12.20, gambit-free **13.5%**, rescues 0.72. Even-seat share 26.6% (no
  dominant), free-riding NOT rewarded (winners 2.62 vs field 3.00).
- Per-count all credible: 2p 19.9 / 3p 23.6 / 4p 17.0. All-broken share of SK wins 13.1% (assault
  dominates). Endings: territory 61.2 / gambit 18.7 / doom 17.5 / all_broken 2.6%.
- Every mechanic live: oaths 6.42/3.20, tolls 0.80, DK-kills 2.05, heralds 2.80 (political 46.3%),
  Herald captures 1.41/game, build win political 24.5 / martial 28.4 (parity, archetype-confounded).
- Session proxy (C2): 85.9 decisions/game · 7.16/round (informational; for a human 30–45 min check).
- 2-seed stability confirmed at the HL lock (SK 20.2 / 20.0).

**Blood Pact (s20260622-n40-bp, 360 games):** runs CLEAN (terminates, saboteur + deduction surface
exercised, no crash). Traitor win 7.8% / exposure 86.9% / accuracy 53.7% / 1.62 accusations per game —
UNCHANGED in character (the wave didn't touch BP accusation balance). These are the **Stage 5e** targets
(traitor win → 12–20, exposure → 40–70) — the next stage, not a wave regression.

**Verdict: the close-loose-ends wave is COMPLETE and locked.** Resume Phase 5 at 5e.

---

## §5e — Blood Pact accusation: a real bluff + a real gamble (Phase 5)

**Start:** traitor win 7.8% (UNDER 12-20), exposure 86.9% (OVER 40-70), accuracy 53.7%. The crude
saboteur (`saboteurPledgeSuppression: 0.8`) suppressed pledges hard → the Suspicion Log (which counts
low/none pledges) lit it up like a beacon → convicted 87%.

**The human design (the payoff).** Traitor: a **cover-vs-sabotage dilemma** — pledge into the
'medium' tier to pass as loyal (cover, which genuinely helps the table block — the price of hiding)
vs suppress to feed the dark (the detectable tell). Loyalists: real **deduction** (who's starving the
Pledge?) + a real **gamble** (a wrong accusation costs cards + vindicates the innocent).

**Three findings drove the build:**
1. `ACCUSATION_WRONG_PENALTY` is a SIM NO-OP — the AI doesn't weigh the penalty when deciding to
   accuse (a human-facing deterrent, like the sealed pledge). Raised 1→2 for the HUMAN gamble; flagged
   on the human-playtest-checklist. NOT a sim lever.
2. The Audit is redundant in-sim (the AI reads the public Suspicion Log directly) — its value is the
   HUMAN's "pay banners for evidence before the gamble." Documented as human-facing; not force-wired.
3. The traitor cannot win on suppression alone — `doom_complete` is rare (~17%) and N-1 loyalists block
   it. **The real win lever is the dark itself:** `BLOOD_PACT_SPREAD_BONUS` adds +1 to the Dawn march
   toward the Keystone in Blood Pact (the pact feeds the dark) — thematic, and it gives the hidden
   traitor a genuine doom path. Mode-gated → competitive byte-identical (verified: SK-win 20.2% unchanged).

**Levers + signal.** New tunables `SABOTEUR_COVER` (the bluff), `ACCUSE_MIN_SCORE` (the evidence bar),
`BLOOD_PACT_SPREAD_BONUS` (the doom path). `suspicionScore` SHARPENED: only 'none' counts (+2) —
counting 'low' (honest thrift everyone does) pushed accuracy BELOW the random floor (innocents looked
guiltier than a blending traitor). With 'none'-only, accuracy holds ~70% (well above ~30 random).

**LOCKED: SABOTEUR_COVER=0.745, ACCUSE_MIN_SCORE=4, BLOOD_PACT_SPREAD_BONUS=1, ACCUSATION_WRONG_PENALTY=2.**
2-seed ×40 (--bloodpact): traitor win **20.0% / 20.3%**, exposure **69.7% / 71.1%**, accuracy
**71.5% / 70.1%**, accusations **0.97 / 1.01**/game. Competitive unaffected (20.2%). 417 tests.

**Residual (the achievable frontier — escalated):** win and exposure are JOINTLY tight — the cover
lever crosses both band edges (~20 win / ~70 expose) together, so they hug their ceilings: seed 1 lands
all four bands; seed 2 is +0.3pp (win) / +1.1pp (expose) over. Accuracy + frequency pass with wide
margin on both. The dynamic (with the buffed dark self-dooming, the traitor wins by SURVIVING, so win
and low-exposure move together) makes a cleaner mid-band lock need a fractional dark bonus or a
win/exposure-decoupling mechanic — a deeper change escalated for 5f/the user, not blindly ground here.
Net: traitor win 7.8%→20% (a REAL threat), exposure 87%→70%, accuracy 54%→71%. A vastly better game.
