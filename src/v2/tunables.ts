/**
 * Tunable Parameters — Stage 5 (ML) sets the final values.
 *
 * Every balance-sensitive constant from ALGORITHM §9 lives here.
 * All values are placeholder starting points; the ML harness sweeps them.
 *
 * Import `TUNABLES` for the full object or individual named exports.
 */

import type { Act } from './types.js';

// ─── Player Economy ───────────────────────────────────────────────

/** Cards dealt to each player at game start. */
export const STARTING_HAND = 4;

/** Maximum cards a player can hold (refilled toward this at Dawn). */
export const HAND_LIMIT = 6;

/** Actions per turn for an active (non-Broken) player. */
export const ACTIONS_NORMAL = 2;

/** Actions per turn for a Broken player. */
export const ACTIONS_BROKEN = 1;

// ─── Shadowking Forces ────────────────────────────────────────────

/** Number of Death Knights placed at game start. */
export const DK_START_COUNT = 2;

/** Combat power of a Death Knight. */
export const DK_POWER = 4;

/** Combat power of a Blight token (static, blocking). */
export const BLIGHT_POWER = 2;

/** Blight level at which a node becomes permanently ashed. */
export const BLIGHT_TO_ASH = 3;

/** Blight-level reduction when a Death Knight is killed or a Forge reclaimed. */
export const PUSHBACK = 1;

// ─── The Pledge ───────────────────────────────────────────────────

/**
 * Crown holder's pledged cards are multiplied by this discount.
 * < 1 means the leader's cards count for less.
 */
export const CROWN_PLEDGE_DISCOUNT = 0.5;

/** Ratio at or above which the Pledge fully blocks the strike. */
export const FULL_BLOCK_THRESHOLD = 1.0;

/** Patience gained by the Shadowking when the table fully blocks a strike. */
export const PATIENCE_ON_BLOCK = 1;

/** Maximum patience before escalation triggers. */
export const PATIENCE_CAP = 3;

// ─── Territory & Crown ────────────────────────────────────────────

/** Weight multiplier for Forges when computing territory lead (Crown). */
export const FORGE_WEIGHT = 3;

// ─── Broken Court ─────────────────────────────────────────────────

/** Accumulated wounds required to enter Broken state. */
export const BREAK_THRESHOLD = 6;

/** Extra banners per round while Broken (comeback subsidy, decays). */
export const BROKEN_INCOME_BONUS = 2;

/** Auto-recover to minimum strength after this many consecutive Broken rounds. */
export const BROKEN_MAX_ROUNDS = 3;

/** Card cost to Rescue an adjacent/co-located Broken ally. */
export const RESCUE_COST = 2;

// ─── Game Clock ───────────────────────────────────────────────────

/** Fixed round cap — territory victory checked at this round's Dawn. */
export const ROUND_CAP = 14;

/** Blight-progress thresholds for Act transitions. */
export const ACT_THRESHOLDS = {
  /** Total ashed nodes to trigger Whisper → March. */
  MARCH: 3,
  /** Total ashed nodes to trigger March → Reckoning. */
  RECKONING: 7,
} as const;

// ─── Crown's Gambit ───────────────────────────────────────────────

/**
 * Gambit holder's pledged cards are multiplied by this surcharge discount
 * (stacks with Crown discount if the Gambiteer also holds the Crown).
 */
export const GAMBIT_SURCHARGE = 0.25;

// ─── Banner Generation ────────────────────────────────────────────

/** Base banners generated per player each Dawn (before territory income). */
export const BASE_BANNER_INCOME = 2;

// ─── Blight / Ash-Map ────────────────────────────────────────────

/** Baseline Blight levels added to the steered spoke each Dawn (anti-turtle, §5.1 / P1-C3). */
export const DAWN_BLIGHT_ADVANCE = 1;

/** Base Blight spread from an un-averted strike (scaled by 1-ratio). */
export const SPREAD_AMOUNT_BASE = 2;

/** Extra banner cost to march through an ashed node (P0-3: traversable, not impassable). */
export const ASHED_TRAVERSE_EXTRA_COST = 1;

// ─── Grudge System ────────────────────────────────────────────────

/** Grudge decays by this amount per round (standard grudge). */
export const GRUDGE_DECAY_RATE = 1;

/** Heroic-grudge (DK kills, Forge reclaims) decays at this faster rate (P1). */
export const GRUDGE_HEROIC_DECAY_RATE = 2;

/** Maximum grudge a single player can accumulate. */
export const GRUDGE_CAP = 10;

/** Grudge added when a player kills a Death Knight. */
export const GRUDGE_PER_DK_KILL = 3;

/** Grudge added when a player reclaims a Forge from the Shadowking. */
export const GRUDGE_PER_FORGE_RECLAIM = 2;

/** Grudge added per point of combat damage dealt to Shadowking forces (§5.6). */
export const GRUDGE_PER_SK_WOUND = 1;

// ─── Layer B — Blood Pact (§10) ──────────────────────────────────

/** How many recent rounds of pledge tiers the Suspicion Log retains. */
export const SUSPICION_LOG_ROUNDS = 4;

/** Banner cost to Audit one opponent's last pledge. */
export const AUDIT_COST = 2;

/** Rounds new accusations are locked out after a wrong/fizzled one (anti-spam). */
export const ACCUSATION_COOLDOWN_ROUNDS = 2;

/** Cards each agreeing accuser discards when the accusation is wrong. */
export const ACCUSATION_WRONG_PENALTY = 1;

/** Banners the vindicated (wrongly-accused) player gains. */
export const ACCUSATION_VINDICATION_BONUS = 2;

/** Blight pushback applied to the worst frontier node when the traitor is exposed. */
export const ACCUSATION_PUSHBACK = 2;

/** Wounds dealt to the traitor when correctly exposed. */
export const TRAITOR_EXPOSED_WOUNDS = 3;

// ─── Doom Cost Function ──────────────────────────────────────────

/**
 * The card threshold the table must collectively meet in the Pledge
 * to fully avert the Shadowking's strike.
 *
 * Scales with Act and player count. [TUNABLE] — ML sets the curve.
 */
export function doomCost(act: Act, playerCount: number): number {
  const base: Record<Act, number> = {
    WHISPER: 3,
    MARCH: 5,
    RECKONING: 8,
  };
  // Scale linearly with player count (baseline = 4 players).
  const scale = playerCount / 4;
  return Math.ceil(base[act] * scale);
}

// ─── Frozen aggregate ─────────────────────────────────────────────

export const TUNABLES = Object.freeze({
  STARTING_HAND,
  HAND_LIMIT,
  ACTIONS_NORMAL,
  ACTIONS_BROKEN,
  DK_START_COUNT,
  DK_POWER,
  BLIGHT_POWER,
  BLIGHT_TO_ASH,
  PUSHBACK,
  CROWN_PLEDGE_DISCOUNT,
  FULL_BLOCK_THRESHOLD,
  PATIENCE_ON_BLOCK,
  PATIENCE_CAP,
  FORGE_WEIGHT,
  BREAK_THRESHOLD,
  BROKEN_INCOME_BONUS,
  BROKEN_MAX_ROUNDS,
  RESCUE_COST,
  ROUND_CAP,
  ACT_THRESHOLDS,
  GAMBIT_SURCHARGE,
  BASE_BANNER_INCOME,
  DAWN_BLIGHT_ADVANCE,
  SPREAD_AMOUNT_BASE,
  ASHED_TRAVERSE_EXTRA_COST,
  GRUDGE_DECAY_RATE,
  GRUDGE_HEROIC_DECAY_RATE,
  GRUDGE_CAP,
  GRUDGE_PER_DK_KILL,
  GRUDGE_PER_FORGE_RECLAIM,
  GRUDGE_PER_SK_WOUND,
  SUSPICION_LOG_ROUNDS,
  AUDIT_COST,
  ACCUSATION_COOLDOWN_ROUNDS,
  ACCUSATION_WRONG_PENALTY,
  ACCUSATION_VINDICATION_BONUS,
  ACCUSATION_PUSHBACK,
  TRAITOR_EXPOSED_WOUNDS,
  doomCost,
});
