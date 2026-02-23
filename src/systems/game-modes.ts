/**
 * Game Modes System (F-011)
 *
 * Three modes that share the same board, rules, and Behavior Card system:
 *   - Competitive: standard territory control victory
 *   - Blood Pact (Traitor): one player secretly wants doom
 *   - Cooperative: all players win together or all lose
 *
 * Mode selection changes only win/loss conditions and hidden information.
 */

import {
  GameState,
  GameMode,
  BehaviorCardType,
  COOPERATIVE_BEHAVIOR_DECK_COMPOSITION,
} from '../models/game-state.js';
import { SeededRandom } from '../utils/seeded-random.js';

// ─── Blood Pact Assignment ──────────────────────────────────────

/**
 * Assign the Blood Pact card to a random human player.
 * AI players never receive the Blood Pact (PRD constraint).
 *
 * Only applicable in 'blood_pact' mode.
 * Mutates state by setting one player's hasBloodPact = true.
 * Returns the index of the Blood Pact holder, or -1 if no valid target.
 */
export function assignBloodPact(state: GameState, rng: SeededRandom): number {
  if (state.mode !== 'blood_pact') return -1;

  const humanPlayers = state.players.filter(p => p.type === 'human');
  if (humanPlayers.length === 0) return -1;

  const chosen = rng.pick(humanPlayers);
  chosen.hasBloodPact = true;
  return chosen.index;
}

// ─── Blood Pact Accusation ──────────────────────────────────────

/** Cost per accusing player to make a Blood Pact accusation. */
export const ACCUSATION_COST = 2;

/**
 * Check if a Blood Pact accusation can be made.
 *
 * Requirements:
 *   - Game is in blood_pact mode
 *   - All non-target active Arch-Regents must participate (unanimous)
 *   - Each accuser must have >= ACCUSATION_COST fate cards
 *
 * Returns the list of accuser indices if valid, or null if not.
 */
export function canAccuse(
  state: GameState,
  targetIndex: number,
): number[] | null {
  if (state.mode !== 'blood_pact') return null;

  const target = state.players[targetIndex];
  if (!target) return null;

  const accusers = state.players.filter(p => p.index !== targetIndex);
  // All accusers must be able to afford
  const allCanAfford = accusers.every(p => p.fateCards.length >= ACCUSATION_COST);
  if (!allCanAfford) return null;

  return accusers.map(p => p.index);
}

/**
 * Perform a Blood Pact accusation.
 *
 * All accusers spend ACCUSATION_COST fate cards each.
 * If the target has the Blood Pact, it is revealed.
 * If the target does NOT have the Blood Pact, the accusation fails
 * (cards are still spent — failed accusations are costly).
 *
 * Returns true if the target was the Blood Pact holder.
 */
export function performAccusation(
  state: GameState,
  targetIndex: number,
): boolean {
  const accuserIndices = canAccuse(state, targetIndex);
  if (!accuserIndices) return false;

  // Spend fate cards from each accuser
  for (const idx of accuserIndices) {
    const accuser = state.players[idx];
    accuser.fateCards.splice(0, ACCUSATION_COST);
  }

  const target = state.players[targetIndex];
  const isTraitor = target.hasBloodPact;

  if (isTraitor) {
    target.bloodPactRevealed = true;
  }

  state.actionLog.push({
    round: state.round,
    phase: state.phase,
    playerIndex: null,
    action: 'blood-pact-accusation',
    details: isTraitor
      ? `Player ${targetIndex} accused and revealed as the Blood Pact holder!`
      : `Player ${targetIndex} accused but is NOT the Blood Pact holder. Cards spent.`,
  });

  return isTraitor;
}

// ─── Cooperative Mode Checks ────────────────────────────────────

/**
 * In cooperative mode, PvP War Field combat is disabled.
 * Returns true if two players may initiate combat against each other.
 */
export function isPvPCombatAllowed(state: GameState): boolean {
  return state.mode !== 'cooperative';
}

/**
 * Check if the game mode uses the Blood Pact card.
 */
export function hasBloodPactCard(mode: GameMode): boolean {
  return mode === 'blood_pact';
}

/**
 * Get the display name for a game mode.
 */
export function getModeName(mode: GameMode): string {
  switch (mode) {
    case 'competitive': return 'Competitive';
    case 'blood_pact': return 'Blood Pact';
    case 'cooperative': return 'Cooperative';
  }
}

/**
 * Get the cooperative mode's harder Behavior Deck composition.
 *
 * Compared to the default deck:
 *   - More ESCALATE (3 vs 1) and ASSAULT (4 vs 3)
 *   - Fewer SPAWN (5 vs 6) and CLAIM (2 vs 4)
 *   - Same MOVE count (6)
 *
 * This is used automatically by createGameState when mode === 'cooperative'.
 */
export function getCooperativeDeckComposition(): Record<BehaviorCardType, number> {
  return { ...COOPERATIVE_BEHAVIOR_DECK_COMPOSITION };
}
