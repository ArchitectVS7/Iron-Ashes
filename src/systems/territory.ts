/**
 * Territory System — Stronghold Claiming (F-003)
 *
 * Provides pure functions for querying and mutating board territory ownership.
 * Extracts the claiming business logic that previously lived inline in the UI
 * game-controller so it can be tested, reused, and reasoned about independently.
 *
 * Claimable node types: 'standard' and 'forge'.
 * Non-claimable types:  'antagonist_base', 'neutral_center'.
 *
 * All mutations are applied directly to the mutable state objects passed in,
 * consistent with the rest of the systems layer (see combat.ts, resources.ts).
 */

import { GameState } from '../models/game-state.js';
import { Player } from '../models/player.js';
import { canAffordClaim, spendBannersForClaim } from './resources.js';
import { canPerformAction } from './broken-court.js';

// ─── Node Query Helpers ───────────────────────────────────────────────────────

/**
 * Returns true when a board node's type allows it to be claimed by a player.
 * The Dark Fortress and Hall of Neutrality are never claimable.
 */
export function isClaimableNodeType(state: GameState, nodeId: string): boolean {
  const nodeDef = state.boardDefinition.nodes[nodeId];
  if (!nodeDef) return false;
  return nodeDef.type === 'standard' || nodeDef.type === 'forge';
}

/**
 * Returns the court index that currently owns a node, or null if unclaimed.
 */
export function getNodeOwner(state: GameState, nodeId: string): number | null {
  return state.boardState[nodeId]?.claimedBy ?? null;
}

/**
 * Returns all node IDs currently claimed by the given player (court index).
 */
export function getClaimedNodes(state: GameState, playerIndex: number): string[] {
  return Object.keys(state.boardState).filter(
    nodeId => state.boardState[nodeId].claimedBy === playerIndex,
  );
}

// ─── Claim Validation ─────────────────────────────────────────────────────────

/**
 * Returns true when a player is permitted to claim the specified node right now.
 *
 * All of the following must hold:
 *   1. The node exists and is a claimable type (standard or forge).
 *   2. The node is currently unclaimed (claimedBy === null).
 *   3. The player is not Broken-Court-locked from the 'claim' action.
 *   4. The player has enough War Banners to pay the claim cost.
 */
export function canClaimNode(
  state: GameState,
  player: Player,
  nodeId: string,
): boolean {
  const nodeState = state.boardState[nodeId];
  if (!nodeState) return false;
  if (!isClaimableNodeType(state, nodeId)) return false;
  if (nodeState.claimedBy !== null) return false;
  if (!canPerformAction(player, 'claim')) return false;
  if (!canAffordClaim(player)) return false;
  return true;
}

// ─── Claim Application ────────────────────────────────────────────────────────

/**
 * Apply a stronghold claim: spend the Banner cost, mark ownership, and update
 * the player's cumulative stats.  Does NOT consume an action slot — callers are
 * responsible for decrementing `player.actionsRemaining`.
 *
 * Precondition: `canClaimNode(state, player, nodeId)` must be true.
 * Throws if the node is not claimable (guards against misuse).
 */
export function claimNode(
  state: GameState,
  player: Player,
  nodeId: string,
): void {
  if (!canClaimNode(state, player, nodeId)) {
    throw new Error(
      `claimNode: player ${player.index} cannot claim node "${nodeId}" — precondition failed.`,
    );
  }

  spendBannersForClaim(player);
  state.boardState[nodeId].claimedBy = player.index;
  player.stats.strongholdsClaimed += 1;
}
