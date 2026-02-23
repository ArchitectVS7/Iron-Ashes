/**
 * Broken Court State System — (F-007)
 *
 * Manages the Broken Court state for players: entering broken court,
 * action restrictions, rescue mechanics, and the all-broken draw condition.
 *
 * DESIGN COMMITMENT: Broken Court state NEVER prevents Voting Phase
 * participation. Voting rights are fully preserved regardless of isBroken.
 *
 * All game randomness goes through SeededRandom. No Math.random().
 */

import { GameState, ACTIONS_PER_TURN_BROKEN } from '../models/game-state.js';
import { Player } from '../models/player.js';
import { advanceDoomToll } from './combat.js';

// ─── Internal helpers ─────────────────────────────────────────────

/** Append a player-attributed entry to the action log. */
function log(
  state: GameState,
  playerIndex: number | null,
  action: string,
  details: string,
): void {
  state.actionLog.push({
    round: state.round,
    phase: state.phase,
    playerIndex,
    action,
    details,
  });
}

// ─── Broken Court State Checks ────────────────────────────────────

/**
 * Check whether a player should be in Broken Court state.
 *
 * A player is broken when their total Penalty Cards are greater than or
 * equal to their War Banner count AND they have at least one Penalty Card.
 * At game start (0 penalty cards, 0 war banners), players are NOT broken.
 *
 * Rule: penaltyCards > 0 AND penaltyCards >= warBanners
 */
export function checkBrokenStatus(player: Player): boolean {
  return player.penaltyCards > 0 && player.penaltyCards >= player.warBanners;
}

/**
 * Transition a player into Broken Court state.
 *
 * Effects:
 *   - Sets isBroken = true
 *   - Caps actionsRemaining at ACTIONS_PER_TURN_BROKEN (1)
 *   - Increments stats.timesBroken
 *   - Advances Doom Toll by 1
 *   - Logs the transition
 *
 * Mutates state and the referenced player in place.
 */
export function enterBrokenCourt(state: GameState, playerIndex: number): void {
  const player = state.players[playerIndex];
  if (!player) return;

  player.isBroken = true;
  player.actionsRemaining = Math.min(
    player.actionsRemaining,
    ACTIONS_PER_TURN_BROKEN,
  );
  player.stats.timesBroken += 1;
  advanceDoomToll(state, 1);

  log(
    state,
    playerIndex,
    'enter-broken-court',
    `Player ${playerIndex} entered Broken Court state (penalty: ${player.penaltyCards}, banners: ${player.warBanners}).`,
  );
}

/**
 * Check whether ALL players are currently in Broken Court state.
 *
 * This is the draw condition: if every player is simultaneously broken,
 * the game ends with gameEndReason 'all_broken'.
 */
export function isAllBroken(state: GameState): boolean {
  return state.players.length > 0 && state.players.every(p => p.isBroken);
}

// ─── Broken Court Action Restrictions ────────────────────────────

/**
 * The set of actions a player may attempt.
 *
 * - move:    Move fellowship to an adjacent node.
 * - claim:   Claim a stronghold or resource node.
 * - recruit: Recruit a wanderer into the fellowship.
 * - combat:  Initiate combat against another player or Shadowking force.
 * - rescue:  Attempt to rescue another broken player.
 */
export type PlayerAction = 'move' | 'claim' | 'recruit' | 'combat' | 'rescue';

/**
 * Check whether a player may perform a given action.
 *
 * Non-broken players: all actions are permitted.
 * Broken players:
 *   - move:    ALLOWED  (broken players may still move)
 *   - claim:   NOT ALLOWED
 *   - recruit: NOT ALLOWED
 *   - combat:  NOT ALLOWED (broken players cannot initiate; defense is passive)
 *   - rescue:  NOT ALLOWED (broken players cannot rescue others)
 *
 * This function does not check actionsRemaining — callers are responsible
 * for verifying the player has actions left before spending them.
 */
export function canPerformAction(player: Player, action: PlayerAction): boolean {
  if (!player.isBroken) {
    // Non-broken players may attempt any action (subject to other preconditions).
    return true;
  }

  // Broken Court restrictions:
  switch (action) {
    case 'move':
      return true;
    case 'claim':
    case 'recruit':
    case 'combat':
    case 'rescue':
      return false;
  }
}

// ─── Round Rescue Tracking ────────────────────────────────────────

/**
 * Check whether a player has already been rescued this round.
 *
 * Scans the actionLog for a 'rescue' entry targeting the given player in
 * the current round. Used to enforce the rule that only the first successful
 * rescue per round takes effect.
 */
export function hasBeenRescuedThisRound(
  state: GameState,
  playerIndex: number,
): boolean {
  return state.actionLog.some(
    entry =>
      entry.round === state.round &&
      entry.action === 'rescue' &&
      entry.playerIndex === playerIndex,
  );
}

// ─── Rescue Mechanic ──────────────────────────────────────────────

/**
 * Check whether a rescuer can rescue a target this round.
 *
 * Requirements:
 *   1. rescuer.index !== target.index (no self-rescue)
 *   2. rescuer is NOT broken
 *   3. rescuer has at least 1 action remaining
 *   4. target IS broken
 *   5. target has not already been rescued this round
 */
export function canRescue(
  rescuer: Player,
  target: Player,
  state: GameState,
): boolean {
  if (rescuer.index === target.index) return false;
  if (rescuer.isBroken) return false;
  if (rescuer.actionsRemaining <= 0) return false;
  if (!target.isBroken) return false;
  if (hasBeenRescuedThisRound(state, target.index)) return false;
  return true;
}

/**
 * Perform a rescue: the rescuer donates Fate Cards to restore a broken target.
 *
 * Validation:
 *   - canRescue(rescuer, target, state) must pass
 *   - fateCardDonation must be in range 2–5 (inclusive)
 *   - rescuer must have >= fateCardDonation Fate Cards
 *
 * On success:
 *   - Remove fateCardDonation cards from the front of rescuer.fateCards
 *   - Set target.warBanners = fateCardDonation
 *   - Set target.penaltyCards = 0
 *   - Set target.isBroken = false
 *   - Decrement rescuer.actionsRemaining by 1
 *   - Increment rescuer.stats.rescuesGiven and target.stats.rescuesReceived
 *   - Log the rescue (tagged with target.index so hasBeenRescuedThisRound works)
 *
 * @returns true on success, false if any validation fails
 */
export function performRescue(
  state: GameState,
  rescuerIndex: number,
  targetIndex: number,
  fateCardDonation: number,
): boolean {
  const rescuer = state.players[rescuerIndex];
  const target = state.players[targetIndex];

  if (!rescuer || !target) return false;

  // Validate rescue eligibility
  if (!canRescue(rescuer, target, state)) return false;

  // Validate donation amount
  if (fateCardDonation < 2 || fateCardDonation > 5) return false;

  // Validate rescuer has enough cards
  if (rescuer.fateCards.length < fateCardDonation) return false;

  // Transfer Fate Cards from rescuer to the pot (remove from front)
  rescuer.fateCards.splice(0, fateCardDonation);

  // Restore target from Broken Court
  target.warBanners = fateCardDonation;
  target.penaltyCards = 0;
  target.isBroken = false;

  // Spend one action from the rescuer
  rescuer.actionsRemaining -= 1;

  // Update stats
  rescuer.stats.rescuesGiven += 1;
  target.stats.rescuesReceived += 1;

  // Log the rescue action (playerIndex is the TARGET so hasBeenRescuedThisRound
  // can identify the rescued player by scanning for their index).
  log(
    state,
    targetIndex,
    'rescue',
    `Player ${rescuerIndex} rescued Player ${targetIndex} with ${fateCardDonation} Fate Card(s).`,
  );

  return true;
}
