/**
 * Rescue System — Breaking Free from the Broken Court (F-005)
 *
 * The Rescue mechanic is the emotional peak of Iron-Ashes: a player in Broken
 * Court status has reduced actions (1/turn) and cannot claim Strongholds.
 * Any non-Broken ally can spend War Banners to reduce the target's Penalty Card
 * load; if it drops below their Banner count the target leaves Broken status.
 *
 * Design rules (derived from PRD v1.2, §Rescue):
 *   - Rescuer must NOT be Broken and must have at least one action remaining.
 *   - Rescuer spends War Banners equal to the rescue cost.
 *   - Cost = ceil(target.penaltyCards / 2) — you remove half the burden.
 *   - After paying, target.penaltyCards is reduced by the cost.
 *   - Broken flag cleared if penaltyCards < warBanners after reduction.
 *   - Both players' stats are updated (rescuesGiven / rescuesReceived).
 *   - Cooperative mode allows self-rescue with a Fate Card (see canSelfRescue).
 */

import { GameState } from '../models/game-state.js';
import { Player } from '../models/player.js';

// ─── Types ────────────────────────────────────────────────────────

/** Result of a successful rescue action. */
export interface RescueResult {
  /** Index of the player who performed the rescue. */
  readonly rescuerIndex: number;
  /** Index of the player who was rescued. */
  readonly targetIndex: number;
  /** War Banners spent by the rescuer. */
  readonly cost: number;
  /** Penalty Cards removed from the target. */
  readonly penaltyCardsRemoved: number;
  /** Whether the target left Broken Court status as a result. */
  readonly targetRecovered: boolean;
  /** Target's remaining Penalty Cards after rescue. */
  readonly remainingPenaltyCards: number;
}

/** Reasons a rescue attempt is illegal. */
export type RescueError =
  | 'rescuer_is_broken'         // Rescuer cannot act while Broken
  | 'rescuer_is_target'         // Cannot rescue yourself (use Fate Card in Cooperative)
  | 'target_not_broken'         // Target is not in Broken Court — nothing to rescue
  | 'target_already_recovering' // Target has zero penalty cards (edge case)
  | 'insufficient_banners'      // Rescuer lacks enough War Banners
  | 'no_actions_remaining';     // Rescuer has used all actions this turn

// ─── Cost Calculation ─────────────────────────────────────────────

/**
 * The War Banner cost to rescue `target`.
 *
 * Cost = ceil(target.penaltyCards / 2).
 * Always at least 1 Banner.
 */
export function calculateRescueCost(target: Player): number {
  return Math.max(1, Math.ceil(target.penaltyCards / 2));
}

// ─── Validation ──────────────────────────────────────────────────

/**
 * Enumerate all reasons the rescuer cannot rescue the target in the current
 * state.  Returns an empty array if the action is fully legal.
 */
export function getRescueErrors(
  rescuerIndex: number,
  targetIndex: number,
  state: GameState,
): RescueError[] {
  const errors: RescueError[] = [];
  const rescuer = state.players[rescuerIndex];
  const target  = state.players[targetIndex];

  if (rescuerIndex === targetIndex) {
    errors.push('rescuer_is_target');
  }
  if (rescuer.isBroken) {
    errors.push('rescuer_is_broken');
  }
  if (!target.isBroken) {
    errors.push('target_not_broken');
  }
  if (target.penaltyCards === 0) {
    errors.push('target_already_recovering');
  }
  if (rescuer.actionsRemaining < 1) {
    errors.push('no_actions_remaining');
  }
  const cost = calculateRescueCost(target);
  if (rescuer.warBanners < cost) {
    errors.push('insufficient_banners');
  }

  return errors;
}

/**
 * Return `true` if the rescuer can legally rescue the target.
 */
export function canRescue(
  rescuerIndex: number,
  targetIndex: number,
  state: GameState,
): boolean {
  return getRescueErrors(rescuerIndex, targetIndex, state).length === 0;
}

/**
 * In Cooperative mode only, a player may spend a Fate Card to self-rescue:
 * discard any Fate Card to remove 1 Penalty Card.
 *
 * Returns true if the player is Broken, has a Fate Card, and the mode is
 * cooperative.  Self-rescue is resolved via `selfRescue()`.
 */
export function canSelfRescue(playerIndex: number, state: GameState): boolean {
  if (state.mode !== 'cooperative') return false;
  const player = state.players[playerIndex];
  return player.isBroken && player.fateCards.length > 0;
}

// ─── Action Execution ─────────────────────────────────────────────

/**
 * Execute a rescue action.
 *
 * Mutates `state` in place (same contract as other system functions).
 * Throws if the action is illegal — call `canRescue` first.
 */
export function rescue(
  rescuerIndex: number,
  targetIndex: number,
  state: GameState,
): RescueResult {
  const errors = getRescueErrors(rescuerIndex, targetIndex, state);
  if (errors.length > 0) {
    throw new Error(`Rescue illegal: ${errors.join(', ')}`);
  }

  const rescuer = state.players[rescuerIndex];
  const target  = state.players[targetIndex];
  const cost    = calculateRescueCost(target);

  // Spend cost
  rescuer.warBanners    -= cost;
  rescuer.actionsRemaining -= 1;

  // Remove penalty cards
  const removed = Math.min(cost, target.penaltyCards);
  target.penaltyCards  -= removed;

  // Re-evaluate Broken status
  const recovered = target.isBroken && target.penaltyCards < target.warBanners;
  if (recovered) {
    target.isBroken = false;
    target.actionsRemaining = 2; // Restore full actions
  }

  // Update stats
  rescuer.stats.rescuesGiven    += 1;
  target.stats.rescuesReceived  += 1;

  return {
    rescuerIndex,
    targetIndex,
    cost,
    penaltyCardsRemoved: removed,
    targetRecovered: recovered,
    remainingPenaltyCards: target.penaltyCards,
  };
}

/**
 * Execute a self-rescue using a Fate Card (Cooperative mode only).
 *
 * Discards the first Fate Card in hand and removes 1 Penalty Card.
 * Throws if `canSelfRescue` returns false.
 */
export function selfRescue(playerIndex: number, state: GameState): RescueResult {
  if (!canSelfRescue(playerIndex, state)) {
    throw new Error('Self-rescue not available: must be Cooperative mode with a Fate Card while Broken');
  }

  const player = state.players[playerIndex];

  // Discard the first available Fate Card
  player.fateCards.shift();

  // Remove 1 penalty card
  player.penaltyCards = Math.max(0, player.penaltyCards - 1);

  const recovered = player.penaltyCards < player.warBanners;
  if (recovered) {
    player.isBroken = false;
    player.actionsRemaining = 2;
  }

  // Self-rescue counts as a rescueReceived (no rescueGiven — it's self-help)
  player.stats.rescuesReceived += 1;

  return {
    rescuerIndex: playerIndex,
    targetIndex:  playerIndex,
    cost:  0,          // Fate Card, not War Banners
    penaltyCardsRemoved: 1,
    targetRecovered: recovered,
    remainingPenaltyCards: player.penaltyCards,
  };
}

// ─── Query Helpers ────────────────────────────────────────────────

/**
 * Return indices of all players who can be rescued by `rescuerIndex`
 * in the current state.
 */
export function getRescuableTargets(rescuerIndex: number, state: GameState): number[] {
  return state.players
    .map((_, i) => i)
    .filter(i => i !== rescuerIndex && canRescue(rescuerIndex, i, state));
}

/**
 * Return the rescue cost for every Broken player as a lookup map.
 * Useful for UI rendering without recomputing costs repeatedly.
 *
 * { playerIndex → cost }
 */
export function getRescueCostMap(state: GameState): Map<number, number> {
  const map = new Map<number, number>();
  for (const player of state.players) {
    if (player.isBroken) {
      map.set(player.index, calculateRescueCost(player));
    }
  }
  return map;
}
