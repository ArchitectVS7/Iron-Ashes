/**
 * Herald Diplomatic Action System — (F-009)
 *
 * Governs the Herald's one-time diplomatic action at the Dark Fortress:
 * the Herald (diplomat character) may, while at the antagonist base and
 * with no enemy forces present, spend their once-per-game diplomatic
 * action to recede the Doom Toll by 2.
 *
 * Design commitments:
 *   - The action is once-per-diplomat, per game (diplomaticActionUsed flag).
 *   - No antagonist forces (Death Knight or Blight Wraith) may occupy the
 *     Dark Fortress at the time the action is performed.
 *   - All state mutation is explicit; no hidden side-effects.
 */

import { GameState, HERALD_DIPLOMATIC_DOOM_REDUCTION } from '../models/game-state.js';
import { Player } from '../models/player.js';
import { Character } from '../models/characters.js';
import { recedeDoomToll } from './combat.js';

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

// ─── Dark Fortress Occupancy ──────────────────────────────────────

/**
 * Check whether the Dark Fortress (antagonist base) is clear of all
 * antagonist forces.
 *
 * Returns true if no antagonist force has currentNode equal to
 * boardDefinition.antagonistBase.
 */
export function isDarkFortressClear(state: GameState): boolean {
  const fortressId = state.boardDefinition.antagonistBase;
  return !state.antagonistForces.some(f => f.currentNode === fortressId);
}

// ─── Eligible Diplomats ───────────────────────────────────────────

/**
 * Return the subset of the player's fellowship characters that are
 * diplomats AND have not yet used their diplomatic action this game.
 */
export function getEligibleDiplomats(player: Player): Character[] {
  return player.fellowship.characters.filter(
    c => c.role === 'diplomat' && !c.diplomaticActionUsed,
  );
}

// ─── Precondition Check ───────────────────────────────────────────

/**
 * Determine whether a player may currently perform the Herald diplomatic
 * action.
 *
 * ALL of the following must be true:
 *   1. Player has actionsRemaining > 0.
 *   2. Player is NOT in Broken Court state.
 *   3. The fellowship is located at the antagonist base (Dark Fortress).
 *   4. The fellowship contains at least one eligible diplomat (role ===
 *      'diplomat' and diplomaticActionUsed === false).
 *   5. No antagonist force occupies the Dark Fortress at this moment.
 */
export function canPerformDiplomaticAction(
  player: Player,
  state: GameState,
): boolean {
  // 1. Actions available
  if (player.actionsRemaining <= 0) return false;

  // 2. Not broken
  if (player.isBroken) return false;

  // 3. Fellowship must be at the Dark Fortress
  if (player.fellowship.currentNode !== state.boardDefinition.antagonistBase) {
    return false;
  }

  // 4. Must have at least one unused diplomat
  if (getEligibleDiplomats(player).length === 0) return false;

  // 5. Dark Fortress must be clear of antagonist forces
  if (!isDarkFortressClear(state)) return false;

  return true;
}

// ─── Perform Diplomatic Action ────────────────────────────────────

/**
 * Execute the Herald diplomatic action for the specified player and
 * diplomat character.
 *
 * Steps (all or nothing — returns false immediately on any validation
 * failure):
 *   1. Validate canPerformDiplomaticAction.
 *   2. Locate the specified diplomat in the player's fellowship.
 *   3. Verify the diplomat has not yet used their action
 *      (diplomaticActionUsed === false).
 *   4. Mark diplomat.diplomaticActionUsed = true.
 *   5. Recede the Doom Toll by HERALD_DIPLOMATIC_DOOM_REDUCTION (2) (via recedeDoomToll).
 *   6. Decrement player.actionsRemaining by 1.
 *   7. Append an entry to state.actionLog.
 *   8. Return true.
 *
 * Returns false on any failure without mutating state.
 *
 * @param state       - Current game state (mutated on success).
 * @param playerIndex - Index of the acting player in state.players.
 * @param diplomatId  - The id of the diplomat character performing the action.
 */
export function performDiplomaticAction(
  state: GameState,
  playerIndex: number,
  diplomatId: string,
): boolean {
  const player = state.players[playerIndex];
  if (!player) return false;

  // 1. Precondition check
  if (!canPerformDiplomaticAction(player, state)) return false;

  // 2. Locate the diplomat by ID
  const diplomat = player.fellowship.characters.find(c => c.id === diplomatId);
  if (!diplomat) return false;

  // 3. Confirm character is a diplomat with an unused action
  if (diplomat.role !== 'diplomat') return false;
  if (diplomat.diplomaticActionUsed) return false;

  // 4. Mark the diplomat's action as spent (once per game per Herald)
  diplomat.diplomaticActionUsed = true;

  // 5. Recede Doom Toll by HERALD_DIPLOMATIC_DOOM_REDUCTION (2)
  recedeDoomToll(state, HERALD_DIPLOMATIC_DOOM_REDUCTION);

  // 6. Spend one action
  player.actionsRemaining -= 1;

  // 7. Log
  log(
    state,
    playerIndex,
    'herald-diplomatic-action',
    'Herald diplomatic action — Doom Toll reduced',
  );

  return true;
}
