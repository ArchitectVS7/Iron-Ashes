/**
 * Character System — Fellowship Composition (F-003)
 *
 * Handles wanderer pool generation, the recruit action, diplomatic
 * protection checks, and fellowship utility queries.
 *
 * All randomness goes through SeededRandom. No hardcoded nouns.
 */

import {
  Character,
  CharacterRole,
  Fellowship,
  MAX_FELLOWSHIP_SIZE,
  createCharacter,
} from '../models/characters.js';
import { Player } from '../models/player.js';
import { BoardDefinition, BoardState } from '../models/board.js';
import { SeededRandom } from '../utils/seeded-random.js';

// ─── Wanderer Pool ────────────────────────────────────────────────

/**
 * The role composition of the 20 wanderer tokens placed on the board.
 *
 * Distribution:
 *   - 40% warriors (8) — combat-oriented recruits
 *   - 30% diplomats (6) — enabling the recruit action and protection
 *   - 30% producers (6) — resource generation
 */
export const WANDERER_COMPOSITION: Readonly<Record<'warrior' | 'diplomat' | 'producer', number>> = {
  warrior: 8,
  diplomat: 6,
  producer: 6,
};

/**
 * Generate a shuffled pool of 20 wanderer roles.
 *
 * The pool contains exactly the roles defined in WANDERER_COMPOSITION.
 * Shuffled with SeededRandom so generation is deterministic from a seed.
 *
 * Returns an array of 20 CharacterRole values mapped 1:1 to wanderer
 * node positions (as returned by selectWandererNodes).
 */
export function generateWandererPool(rng: SeededRandom): CharacterRole[] {
  const pool: CharacterRole[] = [];

  for (const [role, count] of Object.entries(WANDERER_COMPOSITION) as Array<
    ['warrior' | 'diplomat' | 'producer', number]
  >) {
    for (let i = 0; i < count; i++) {
      pool.push(role);
    }
  }

  return rng.shuffle(pool);
}

// ─── Recruit Action ──────────────────────────────────────────────

/**
 * Check whether a player may take the Recruit action.
 *
 * Pre-conditions (all must be true):
 *   1. Player is not in Broken Court state.
 *   2. Player has at least one action remaining.
 *   3. Player has at least one diplomat in their Fellowship.
 *   4. At least one node adjacent to the Fellowship's current node
 *      has a face-down wanderer token.
 */
export function canRecruit(
  player: Player,
  boardState: BoardState,
  boardDefinition: BoardDefinition,
): boolean {
  if (player.isBroken) return false;
  if (player.actionsRemaining <= 0) return false;
  if (!hasRole(player.fellowship, 'diplomat')) return false;

  const currentNodeDef = boardDefinition.nodes[player.fellowship.currentNode];
  if (!currentNodeDef) return false;

  return currentNodeDef.connections.some(adjacentId => {
    const adjacentState = boardState[adjacentId];
    return adjacentState?.hasWanderer === true;
  });
}

/**
 * Execute the Recruit action.
 *
 * Reveals the wanderer token at targetNodeId (removes it from the board),
 * then adds a new character of the given role to the Fellowship — unless
 * the Fellowship is already at MAX_FELLOWSHIP_SIZE.
 *
 * Side effects on success:
 *   - boardState[targetNodeId].hasWanderer = false
 *   - A new Character is appended to player.fellowship.characters
 *   - player.actionsRemaining decremented by 1
 *   - player.stats.fellowsRecruited incremented by 1
 *
 * Returns true if the recruit succeeded, false if it was rejected.
 *
 * Rejection conditions:
 *   - Target node has no wanderer token.
 *   - Fellowship is already at MAX_FELLOWSHIP_SIZE (token is still revealed
 *     and removed from the board but no character is added — returns false).
 *   - Target node does not exist in boardState.
 */
export function performRecruit(
  player: Player,
  targetNodeId: string,
  wandererRole: CharacterRole,
  boardState: BoardState,
): boolean {
  const targetState = boardState[targetNodeId];
  if (!targetState || !targetState.hasWanderer) return false;

  // Reveal (remove) the wanderer token regardless of fellowship capacity.
  targetState.hasWanderer = false;

  // Reject if fellowship is full.
  if (!canAddToFellowship(player.fellowship)) return false;

  // Generate a unique id for the new character.
  const existingCount = player.fellowship.characters.length;
  const newChar: Character = createCharacter(
    `court-${player.fellowship.courtIndex}-recruit-${existingCount}`,
    wandererRole,
  );

  player.fellowship.characters.push(newChar);
  player.actionsRemaining -= 1;
  player.stats.fellowsRecruited += 1;

  return true;
}

// ─── Diplomatic Protection ────────────────────────────────────────

/**
 * Check if a player's Fellowship has Diplomatic Protection.
 *
 * Diplomatic Protection is active when:
 *   1. The Fellowship contains at least one diplomat.
 *   2. No other player's Fellowship occupies the same node.
 *
 * Note: Blight Wraiths (antagonist forces) ignore this protection;
 * that interaction is enforced in the combat system, not here.
 */
export function hasDiplomaticProtection(
  player: Player,
  allPlayers: Player[],
): boolean {
  if (!hasRole(player.fellowship, 'diplomat')) return false;

  const myNode = player.fellowship.currentNode;

  for (const other of allPlayers) {
    if (other.index === player.index) continue;
    if (other.fellowship.currentNode === myNode) return false;
  }

  return true;
}

// ─── Fellowship Queries ───────────────────────────────────────────

/**
 * Calculate the total power of all characters in a Fellowship.
 * Sums the powerLevel of every character currently in the group.
 */
export function getFellowshipPower(fellowship: Fellowship): number {
  return fellowship.characters.reduce((sum, c) => sum + c.powerLevel, 0);
}

/**
 * Check whether the Fellowship contains at least one character of the given role.
 */
export function hasRole(fellowship: Fellowship, role: CharacterRole): boolean {
  return fellowship.characters.some(c => c.role === role);
}

/**
 * Count how many characters in the Fellowship have the given role.
 */
export function countRole(fellowship: Fellowship, role: CharacterRole): number {
  return fellowship.characters.filter(c => c.role === role).length;
}

/**
 * Check whether another character can be added to the Fellowship.
 * Returns true if the current size is strictly less than MAX_FELLOWSHIP_SIZE.
 */
export function canAddToFellowship(fellowship: Fellowship): boolean {
  return fellowship.characters.length < MAX_FELLOWSHIP_SIZE;
}
