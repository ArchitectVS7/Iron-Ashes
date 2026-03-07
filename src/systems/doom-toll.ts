/**
 * Doom Toll System — The Doom Toll (F-005)
 *
 * Provides higher-level trigger wrappers around the low-level advanceDoomToll /
 * recedeDoomToll helpers that live in combat.ts, plus all Final Phase query
 * functions, the Blight Wraith auto-spread mechanic, and Forge-capture
 * detection.
 *
 * All randomness goes through SeededRandom. No Math.random().
 */

import {
  GameState,
  DOOM_TOLL_FINAL_PHASE_THRESHOLD,
  DOOM_TOLL_MAX,
  FINAL_PHASE_MIN_DOOM_ADVANCE,
  MINION_MAX_COUNT,
  MINION_POWER,
  VOTE_COST_STANDARD,
  VOTE_COST_FINAL_PHASE,
} from '../models/game-state.js';
import { getForgeNodes } from '../models/board.js';
import { SeededRandom } from '../utils/seeded-random.js';
import { advanceDoomToll, recedeDoomToll } from './combat.js';

// ─── Internal helpers ─────────────────────────────────────────────

/** Append an entry to the action log (system-level, no player attribution). */
function log(state: GameState, action: string, details: string): void {
  state.actionLog.push({
    round: state.round,
    phase: state.phase,
    playerIndex: null,
    action,
    details,
  });
}

// ─── Doom Toll Advance Triggers ───────────────────────────────────

/**
 * Trigger: the Voting Phase resolves without a unanimous COUNTER vote.
 * Advances Doom Toll by 1.
 */
export function onNonUnanimousVote(state: GameState): void {
  advanceDoomToll(state, 1);
  log(state, 'doom-advance', 'Non-unanimous vote — Doom Toll advanced by 1.');
}

/**
 * Trigger: the Fate Deck was reshuffled (handled inside combat.drawFateCards).
 * This wrapper exists to document the trigger and can be called explicitly
 * when a reshuffle is detected outside of drawFateCards.
 * Advances Doom Toll by 1.
 */
export function onFateDeckReshuffle(state: GameState): void {
  advanceDoomToll(state, 1);
  log(state, 'doom_advance_deck_reshuffle', 'Fate Deck reshuffled — Doom Toll advanced by 1.');
}

/**
 * Trigger: a Blight Wraith (minion) has claimed a Forge Keep.
 * Advances Doom Toll by 1.
 */
export function onBlightWraithClaimsForge(state: GameState): void {
  advanceDoomToll(state, 1);
  log(state, 'doom-advance', 'Blight Wraith claimed a Forge Keep — Doom Toll advanced by 1.');
}

/**
 * Trigger: an Arch-Regent enters Broken Court status (handled inside
 * combat.resolvePlayerCombat / resolveShadowkingCombat).
 * This wrapper exists to document the trigger and can be called explicitly
 * for other sources of Broken Court entry.
 * Advances Doom Toll by 1.
 */
export function onArchRegentEntersBrokenCourt(state: GameState): void {
  advanceDoomToll(state, 1);
  log(state, 'doom-advance', 'Arch-Regent entered Broken Court — Doom Toll advanced by 1.');
}

// ─── Doom Toll Recede Triggers ────────────────────────────────────

/**
 * Trigger: a Death Knight (lieutenant) was defeated (handled inside
 * combat.resolveShadowkingCombat).
 * This wrapper exists to document the trigger and can be called explicitly
 * for other lieutenant-removal paths.
 * Recedes Doom Toll by 1.
 */
export function onDeathKnightDefeated(state: GameState): void {
  recedeDoomToll(state, 1);
  log(state, 'doom-recede', 'Death Knight defeated — Doom Toll receded by 1.');
}

/**
 * Trigger: a Forge Keep previously held by a Blight Wraith has been
 * reclaimed by an Arch-Regent.
 * Recedes Doom Toll by 1.
 */
export function onForgeReclaimedFromBlight(state: GameState): void {
  recedeDoomToll(state, 1);
  log(state, 'doom-recede', 'Forge Keep reclaimed from Blight Wraith — Doom Toll receded by 1.');
}

/**
 * Trigger: all active Arch-Regents (3+) voted COUNTER unanimously AND
 * each spent a Fate Card to do so.
 * Recedes Doom Toll by 1.
 */
export function onUnanimousVoteWithCards(state: GameState): void {
  recedeDoomToll(state, 1);
  log(
    state,
    'doom-recede',
    'Unanimous COUNTER vote with Fate Card spend — Doom Toll receded by 1.',
  );
}

// ─── Final Phase Queries ──────────────────────────────────────────

/**
 * Returns true when the Doom Toll is at or above the Final Phase threshold (10).
 * Equivalent to state.isFinalPhase but callable without accessing state directly.
 */
export function isInFinalPhase(state: GameState): boolean {
  return state.doomToll >= DOOM_TOLL_FINAL_PHASE_THRESHOLD;
}

/**
 * Returns the number of Behavior Cards drawn by the Shadowking each round.
 *   - Normal play: 1
 *   - Final Phase (toll >= 10): 2
 */
export function getBehaviorCardDrawCount(state: GameState): number {
  return isInFinalPhase(state) ? 2 : 1;
}

/**
 * Returns the Fate Card cost for casting a COUNTER vote.
 *   - Normal play: VOTE_COST_STANDARD (1)
 *   - Final Phase (toll >= 10): VOTE_COST_FINAL_PHASE (2)
 */
export function getVoteCost(state: GameState): number {
  return isInFinalPhase(state) ? VOTE_COST_FINAL_PHASE : VOTE_COST_STANDARD;
}

// ─── Estimated Rounds Remaining (Final Phase HUD) ────────────────

/**
 * Return the estimated number of rounds remaining before the Doom Toll
 * reaches DOOM_TOLL_MAX (13), assuming the minimum possible advance per
 * Final Phase round (FINAL_PHASE_MIN_DOOM_ADVANCE = 2).
 *
 * Formula: ceil((DOOM_TOLL_MAX − doomToll) / FINAL_PHASE_MIN_DOOM_ADVANCE)
 *
 * This is a non-binding UI estimate shown in the HUD during Final Phase.
 * No effect on game state or mechanics.
 *
 * Returns 0 when the Doom Toll has already reached or exceeded DOOM_TOLL_MAX.
 *
 * Examples (with DOOM_TOLL_MAX = 13, FINAL_PHASE_MIN_DOOM_ADVANCE = 2):
 *   doomToll = 10 → ceil(3/2) = 2 rounds  ("~2 rounds remaining")
 *   doomToll = 11 → ceil(2/2) = 1 round
 *   doomToll = 12 → ceil(1/2) = 1 round
 *   doomToll = 13 → 0 rounds (doom complete)
 */
export function getEstimatedRoundsRemaining(state: GameState): number {
  const remaining = DOOM_TOLL_MAX - state.doomToll;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / FINAL_PHASE_MIN_DOOM_ADVANCE);
}

// ─── Game-Over Check ─────────────────────────────────────────────

/**
 * Returns true when the Doom Toll has reached its maximum (13), triggering
 * the doom_complete game-over condition.
 */
export function isDoomComplete(state: GameState): boolean {
  return state.doomToll >= DOOM_TOLL_MAX;
}

// ─── Stronghold Count Queries ─────────────────────────────────────

/**
 * Count the number of board nodes currently claimed by the given player.
 */
export function getPlayerStrongholdCount(state: GameState, playerIndex: number): number {
  let count = 0;
  for (const nodeState of Object.values(state.boardState)) {
    if (nodeState.claimedBy === playerIndex) {
      count++;
    }
  }
  return count;
}

/**
 * Return the index of the player who holds the most strongholds.
 * Tiebreak: player with the most War Banners.
 * If all players are tied on both, the lowest-index player wins the tiebreak.
 */
export function getLeadingPlayer(state: GameState): number {
  let leadingIndex = 0;
  let leadingCount = -1;
  let leadingBanners = -1;

  for (const player of state.players) {
    const count = getPlayerStrongholdCount(state, player.index);
    const banners = player.warBanners;

    const isAhead =
      count > leadingCount ||
      (count === leadingCount && banners > leadingBanners);

    if (isAhead) {
      leadingIndex = player.index;
      leadingCount = count;
      leadingBanners = banners;
    }
  }

  return leadingIndex;
}

// ─── Forge Capture Check ──────────────────────────────────────────

/**
 * Check whether any Blight Wraith (minion antagonist force) currently occupies
 * a Forge Keep node that was previously claimed by a player (claimedBy !== null).
 *
 * Returns an array of forge node IDs that have been captured this way.
 * The caller is responsible for triggering onBlightWraithClaimsForge() per entry.
 *
 * Does NOT mutate state — it is a pure detection query.
 */
export function checkBlightForgeCapture(state: GameState): string[] {
  const forgeNodeIds = getForgeNodes(state.boardDefinition);
  const capturedForges: string[] = [];

  // Build a set of node IDs that have at least one minion force on them.
  const nodesWithMinion = new Set<string>();
  for (const force of state.antagonistForces) {
    if (force.type === 'minion') {
      nodesWithMinion.add(force.currentNode);
    }
  }

  for (const forgeId of forgeNodeIds) {
    const nodeState = state.boardState[forgeId];
    if (!nodeState) continue;

    // A forge has been "captured" if it has a minion on it and was player-claimed.
    if (nodesWithMinion.has(forgeId) && nodeState.claimedBy !== null) {
      capturedForges.push(forgeId);
    }
  }

  return capturedForges;
}

// ─── Blight Wraith Auto-Spread (Final Phase) ──────────────────────

/**
 * During the Final Phase, each Blight Wraith (minion) that occupies a node
 * adjacent to an unoccupied Standard Stronghold may spread to that node.
 *
 * Algorithm:
 *   1. If total minion count is already at MINION_MAX_COUNT, return null.
 *   2. Find the leading player's keep node.
 *   3. For each minion, collect adjacent standard nodes that are unoccupied
 *      (no antagonist forces AND no player fellowship on them — approximated
 *      here by checking antagonistForces occupancy and node claimedBy state;
 *      fellowship co-location is not tracked in NodeState so we use the
 *      absence of antagonist forces as the occupancy proxy for the *target*).
 *   4. Among all candidate (minion, target) pairs, pick the minion closest to
 *      the leading player's keep, then among its targets pick the one closest
 *      to any player's fellowship node.
 *   5. Spawn a new minion at the selected target node.
 *   6. Returns the target node ID, or null if no valid spread was possible.
 *
 * Mutates state.antagonistForces and appends to state.actionLog.
 */
export function performBlightAutoSpread(state: GameState, rng: SeededRandom): string | null {
  // Suppress unused-parameter lint — rng is accepted for API consistency and
  // future use (e.g. random tiebreak between equidistant targets).
  void rng;

  const minionForces = state.antagonistForces.filter(f => f.type === 'minion');

  if (minionForces.length >= MINION_MAX_COUNT) {
    return null;
  }

  const definition = state.boardDefinition;
  const leadingPlayerIndex = getLeadingPlayer(state);
  const leadingKeep = definition.startingKeeps[leadingPlayerIndex];

  // Build a set of node IDs currently occupied by any antagonist force.
  const occupiedByForce = new Set<string>();
  for (const force of state.antagonistForces) {
    occupiedByForce.add(force.currentNode);
  }

  // Gather all player fellowship node positions.
  const fellowshipNodes = state.players.map(p => p.fellowship.currentNode);

  /**
   * BFS distance from a source node to a target node.
   * Returns Infinity if unreachable.
   */
  function bfsDistance(source: string, target: string): number {
    if (source === target) return 0;
    const visited = new Set<string>([source]);
    const queue: Array<{ id: string; dist: number }> = [{ id: source, dist: 0 }];
    while (queue.length > 0) {
      const { id, dist } = queue.shift()!;
      for (const neighbor of definition.nodes[id].connections) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        if (neighbor === target) return dist + 1;
        queue.push({ id: neighbor, dist: dist + 1 });
      }
    }
    return Infinity;
  }

  /** Shortest distance from source to any node in targetSet. */
  function bfsDistanceToAny(source: string, targetSet: readonly string[]): number {
    let best = Infinity;
    for (const t of targetSet) {
      const d = bfsDistance(source, t);
      if (d < best) best = d;
    }
    return best;
  }

  // Build candidate list: (minion, targetNode) pairs.
  interface Candidate {
    minionId: string;
    minionNode: string;
    targetNode: string;
    distFromMinionToKeep: number;
    distFromTargetToAnyFellowship: number;
  }

  const candidates: Candidate[] = [];

  for (const minion of minionForces) {
    const minionNode = definition.nodes[minion.currentNode];
    if (!minionNode) continue;

    for (const neighborId of minionNode.connections) {
      const neighborDef = definition.nodes[neighborId];
      if (!neighborDef) continue;

      // Only spread to standard stronghold nodes.
      if (neighborDef.type !== 'standard') continue;

      // Target node must be unoccupied by antagonist forces.
      if (occupiedByForce.has(neighborId)) continue;

      candidates.push({
        minionId: minion.id,
        minionNode: minion.currentNode,
        targetNode: neighborId,
        distFromMinionToKeep: bfsDistance(minion.currentNode, leadingKeep),
        distFromTargetToAnyFellowship: bfsDistanceToAny(neighborId, fellowshipNodes),
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Pick the candidate whose minion is closest to the leading player's keep.
  // Tiebreak: target node closest to any player fellowship.
  candidates.sort((a, b) => {
    if (a.distFromMinionToKeep !== b.distFromMinionToKeep) {
      return a.distFromMinionToKeep - b.distFromMinionToKeep;
    }
    return a.distFromTargetToAnyFellowship - b.distFromTargetToAnyFellowship;
  });

  const chosen = candidates[0];

  // Assign a unique ID to the new minion force.
  const existingMinionIds = minionForces.map(f => f.id);
  let newMinionIndex = minionForces.length + 1;
  while (existingMinionIds.includes(`minion-${newMinionIndex}`)) {
    newMinionIndex++;
  }

  const newForce = {
    id: `minion-${newMinionIndex}`,
    type: 'minion' as const,
    powerLevel: MINION_POWER,
    currentNode: chosen.targetNode,
  };

  state.antagonistForces.push(newForce);
  // Also register the new force in the board's node state.
  if (state.boardState[chosen.targetNode]) {
    state.boardState[chosen.targetNode].antagonistForces.push(newForce.id);
  }

  log(
    state,
    'blight-auto-spread',
    `Blight Wraith at ${chosen.minionNode} spread to ${chosen.targetNode} (Final Phase auto-spread).`,
  );

  return chosen.targetNode;
}
