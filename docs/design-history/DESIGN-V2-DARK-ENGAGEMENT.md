# Design v2 — Dark Engagement Patch (the dead-grudge fix)

> Status: Stage-5 mechanic patch — implemented ahead of the per-count fork (5f), per the
> reconvened focus group (`DESIGN-V2-FOCUS-GROUP-R2.md`) and the lead-designer call.
> Date: 2026-06-22
> Authority for mechanics: `DESIGN-V2-ALGORITHM.md` §5.3/§5.6/§4.3. This file specifies
> only the delta. Companion evidence: `docs/handoff/stage5-tuning-log.md`.

---

## 1. The problem (one line)

DK-kills measured **0.00/game**: engaging the dark is a *pure cost* — killing a Death Knight grants
grudge (→ you become the villain's next named target) with **no territory/win payoff**, and the AI has
no verb to march toward a DK. The signature pillar ("wound the Shadowking and it hunts you next") is
dormant and the incentive sign is inverted. Diagnosis: `DESIGN-V2-FOCUS-GROUP-R2.md` §1.

## 2. The fix — five coupled changes

All five are needed together; each alone is inert (a payoff with no forcing function is redundant with
claiming; a forcing function with no verb crashes the AI; etc.).

### 2.1 The Hunt verb (AI can reach + fight the dark) — `ai-player.ts`, `archetypes.ts`
- New `AIPolicy` knob **`darkHuntBias` (0..1, neutral 0)**. `DEFAULT_AI_POLICY`/`baseline` keep it
  unset → the baseline economic player still ignores the dark (the neutral anchor).
- New helper **`canStrikeWin(state, pi, nodeId)`** — true iff a *cards-aware* winning commit exists
  (`base + chooseCombatCommit(...) > skPower`). Fixes the old gate that compared **base power only**
  (Warlord 3 < DK 4 ⇒ a lone Warlord never struck, even holding a winning card).
- New pathing **`bestStepTowardHuntableDK`** — BFS to the nearest *claimable* node (unclaimed,
  non-ashed Holding/Forge) that a DK currently holds; returns the first step.
- `archetypeAction` gains: **STRIKE** a co-located beatable DK when the node is claimable-after-clear
  **or** `rng < darkHuntBias`; and a **HUNT-march** step toward the nearest huntable DK (gated by
  `darkHuntBias`). A sabotaging traitor never hunts.
- `claimValue` becomes **SK-aware** (returns 0 while a DK holds the node) so no policy ever proposes
  the now-illegal CLAIM (§2.3) — this also stops the baseline from claiming around a DK.

### 2.2 Pay the kill in win-currency + asymmetric grudge — `combat.ts`
On a STRIKE win (`applyCombatOutcome`), after removing the force + `PUSHBACK`:
- **Spoils of the breach:** if the cleared node is an unclaimed, non-ashed Holding/Forge, the attacker
  **claims it free** (`owner = attacker`, emits a `CLAIM` `PLAYER_ACTED` with `viaDkKill: true`).
  Heroism now pays in the game's win currency (territory), not just flavor.
- **Asymmetric grudge Mark (the judge's lever):** the DK-kill grudge (and forge-reclaim grudge) is
  applied **only if the attacker's territory rank `< GRUDGE_MARK_TOP_N`** (0 = leader). So the leading
  seats pay the "now the dark hunts you" tax, while **trailing seats hunt for free** — making
  dark-engagement a **catch-up lever** and preserving "leading is dangerous." New pure helper
  `territoryRank(state, pi)` (mirrors `computeCrownHolder`'s production formula; ties → lower seat
  ranks higher; Broken ranked last).

### 2.3 DKs hold ground — `actions.ts`
`executeClaim` throws while a DK occupies the node (gated by **`DK_BLOCKS_CLAIM`**). This is the
forcing function: a DK on a Holding *denies* it until cleared, so killing it is the *only* way to take
that ground (and §2.2 makes the kill itself the claim). Without this, a player would just claim around
the DK and never fight.

### 2.4 The dark scales with the table — `tunables.ts`, `shadowking-effects.ts` (PROBED, then REVERTED)
- `respawnDeathKnights` replenishes to **`deathKnightCount(playerCount)`** (was flat `DK_START_COUNT`)
  so any scaling holds after Act escalations. Kept (correct, general).
- **`DK_PER_PLAYER` was probed `0 → 1`** to add 4p pressure — but the retune **REFUTED** it: once
  killing a DK pays, a bigger army *feeds the players* (more free claims + pushback), so 4p SK-win went
  *up* with *fewer* DKs. **Reverted to 0** (flat 2). Engagement comes from §2.1–2.3, not army size.
  See tuning-log §5-dark "DK-army scaling BACKFIRES once kills pay."

### 2.5 New tunables (wired into the injectable seam)
| Lever | Default | Meaning |
|---|---|---|
| `DK_BLOCKS_CLAIM` | `true` | a DK on a node blocks CLAIM there (forcing function) |
| `DK_KILL_CLAIMS_NODE` | `true` | killing a DK on an unclaimed claimable node auto-claims it |
| `GRUDGE_MARK_TOP_N` | `2` | DK-kill grudge applies only to seats ranked above this (catch-up lever) |
| `DK_PER_PLAYER` | `0` (unchanged) | DK-army scaling — probed at 1, reverted (backfires post-engagement) |
| `SPREAD_AMOUNT_BASE` | `4` (was 5) | retune: trimmed to land pooled SK-win back in band after the patch |

## 3. Determinism & invariants (unchanged)
- All new logic is pure `f(state, seed)`: `territoryRank`, `canStrikeWin`, `bestStepTowardHuntableDK`
  read live state in fixed order; the Hunt gates use the existing `decisionRng` sub-stream. No
  `Math.random`/`Date.now`. (ALGORITHM §7.)
- All mutation still flows through `applyCommand` → action executors → `applyCombatOutcome`.
- The villain stays **telegraphed and fair**: DKs are visible, the grudge rule is public, the auto-claim
  is a transparent consequence of the kill.

## 4. Deferred (documented, not built here)
- **"Paint the Crown" steerable grudge** (spend a kill to add grudge to a *rival*) — the asymmetric-Mark
  loop already delivers most of "manipulate the dark at each other" (trailing players clear the dark and
  grab land while it keeps hunting the leader). Revisit if the sim shows engagement still leader-punishing.
- **Autonomous inward DK march + corridor blight** (40K's bigger vision) — high balance blast radius;
  hold until §2 is measured. The forcing function here is "DKs hold the Holdings they spawn on."

## 5. Result (predicted → measured, LOCKED)
Predicted DK-kills > 0, the gambit over-fire drifting down, and the 4p gap narrowing. Measured (4200
games, vs the 5c lock):
- **DK-kills/game 0.00 → 2.05** ✅ — the dead pillar is alive.
- per-count SK-win **34.6/17.9/7.9 → 30.9/21.8/8.9** — gradient 26.7pp → **22.0pp** (2p down, 3p/4p up).
- endings shifted off the territory race; no-dominant guard holds.
- the patch over-strengthened the dark (SK-win 23.9%); the **retune** (`SPREAD_AMOUNT_BASE 5→4`,
  `DK_PER_PLAYER 1→0`) landed it back at **20.5% PASS**, 2-seed stable. Tests 379/379 green.

The per-count fork (A lock + name tiers / B surgical pledge-decay) is now decidable on this new data,
per `DESIGN-V2-FOCUS-GROUP-R2.md` §3. Stage 5d (rescues, still 0.07) applies the same win-currency
template. Gambit honest fire (25.2%) is a separate 5d/5e item, not a 5-dark regression.
