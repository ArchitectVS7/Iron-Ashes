/**
 * Shadowking Behavior System — The Shadowking (F-008)
 *
 * Resolves the current Behavior Card drawn by the Shadowking each round.
 * Each card type has its own resolution function that mutates state and
 * returns a ShadowkingAction describing what happened.
 *
 * All randomness goes through SeededRandom. No Math.random().
 */

import {
  GameState,
  BehaviorCardType,
  AntagonistForce,
  MINION_MAX_COUNT,
  MINION_POWER,
} from '../models/game-state.js';
import { SeededRandom } from '../utils/seeded-random.js';
import {
  findShortestPath,
  getDistance,
} from '../utils/pathfinding.js';
import { getLeadingPlayer } from './doom-toll.js';
import { hasDiplomaticProtection } from './characters.js';
import { advanceDoomToll } from './combat.js';

// ─── Result Type ─────────────────────────────────────────────────

/** The outcome of resolving a Behavior Card this round. */
export interface ShadowkingAction {
  readonly cardType: BehaviorCardType;
  readonly description: string;
  /** true if the vote blocked this action (fully or partially). */
  readonly blocked: boolean;
}

// ─── Internal Helpers ─────────────────────────────────────────────

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

/**
 * Get all lieutenant (Death Knight) forces in the game state.
 */
function getLieutenants(state: GameState): AntagonistForce[] {
  return state.antagonistForces.filter(f => f.type === 'lieutenant');
}

/**
 * Get all minion (Blight Wraith) forces in the game state.
 */
function getMinions(state: GameState): AntagonistForce[] {
  return state.antagonistForces.filter(f => f.type === 'minion');
}

/**
 * Generate a unique minion ID not already in use.
 */
function nextMinionId(state: GameState): string {
  const existingIds = new Set(state.antagonistForces.map(f => f.id));
  let index = 1;
  while (existingIds.has(`minion-${index}`)) {
    index++;
  }
  return `minion-${index}`;
}

// ─── Force Placement Helper ───────────────────────────────────────

/**
 * Create a new minion force at the given node if the minion cap has not been reached.
 *
 * Adds the force to state.antagonistForces and registers it in
 * state.boardState[nodeId].antagonistForces.
 *
 * Returns the new force, or null if MINION_MAX_COUNT would be exceeded.
 */
export function placeMinion(state: GameState, nodeId: string): AntagonistForce | null {
  const currentMinions = getMinions(state);
  if (currentMinions.length >= MINION_MAX_COUNT) {
    return null;
  }

  const newForce: AntagonistForce = {
    id: nextMinionId(state),
    type: 'minion',
    powerLevel: MINION_POWER,
    currentNode: nodeId,
  };

  state.antagonistForces.push(newForce);

  if (state.boardState[nodeId]) {
    state.boardState[nodeId].antagonistForces.push(newForce.id);
  }

  return newForce;
}

// ─── Force Movement Helper ────────────────────────────────────────

/**
 * Move a force along the shortest path toward targetNode, up to maxSteps.
 *
 * Respects diplomatic protection for MOVE card: if a node along the path
 * has a solo Herald (hasDiplomaticProtection), stop short before entering it.
 *
 * Updates force.currentNode and boardState tracking.
 * Returns the node ID where the force ends up.
 */
export function moveForceToward(
  state: GameState,
  forceId: string,
  targetNode: string,
  maxSteps: number,
  respectDiplomaticProtection: boolean = true,
): string {
  const forceIndex = state.antagonistForces.findIndex(f => f.id === forceId);
  if (forceIndex === -1) {
    throw new Error(`Force '${forceId}' not found in state.`);
  }

  const force = state.antagonistForces[forceIndex];
  const startNode = force.currentNode;

  if (startNode === targetNode || maxSteps <= 0) {
    return startNode;
  }

  const path = findShortestPath(state.boardDefinition, startNode, targetNode);
  if (path === null || path.length <= 1) {
    return startNode;
  }

  // path[0] = startNode, path[1..] = nodes to traverse
  let currentNode = startNode;
  let stepsRemaining = maxSteps;

  for (let i = 1; i < path.length && stepsRemaining > 0; i++) {
    const nextNode = path[i];

    // Check diplomatic protection: if a solo Herald is at nextNode, stop short.
    if (respectDiplomaticProtection) {
      const playerAtNext = state.players.find(
        p => p.fellowship.currentNode === nextNode,
      );
      if (playerAtNext && hasDiplomaticProtection(playerAtNext, state.players)) {
        break;
      }
    }

    currentNode = nextNode;
    stepsRemaining--;
  }

  // Update boardState tracking
  if (currentNode !== startNode) {
    // Remove from old node
    const oldNodeState = state.boardState[startNode];
    if (oldNodeState) {
      oldNodeState.antagonistForces = oldNodeState.antagonistForces.filter(
        id => id !== forceId,
      );
    }

    // Add to new node
    const newNodeState = state.boardState[currentNode];
    if (newNodeState && !newNodeState.antagonistForces.includes(forceId)) {
      newNodeState.antagonistForces.push(forceId);
    }

    // Update the force's currentNode
    force.currentNode = currentNode;
  }

  return currentNode;
}

// ─── Weakest Player ───────────────────────────────────────────────

/**
 * Return the index of the player with the fewest War Banners.
 *
 * Tiebreak: fewest strongholds, then highest player index.
 */
export function getWeakestPlayer(state: GameState): number {
  let weakestIndex = state.players[0].index;
  let weakestBanners = state.players[0].warBanners;
  let weakestStrongholds = countStrongholds(state, state.players[0].index);

  for (let i = 1; i < state.players.length; i++) {
    const player = state.players[i];
    const banners = player.warBanners;
    const strongholds = countStrongholds(state, player.index);

    const isWeaker =
      banners < weakestBanners ||
      (banners === weakestBanners && strongholds < weakestStrongholds) ||
      (banners === weakestBanners && strongholds === weakestStrongholds && player.index > weakestIndex);

    if (isWeaker) {
      weakestIndex = player.index;
      weakestBanners = banners;
      weakestStrongholds = strongholds;
    }
  }

  return weakestIndex;
}

/** Count the number of nodes claimed by a given player. */
function countStrongholds(state: GameState, playerIndex: number): number {
  let count = 0;
  for (const nodeState of Object.values(state.boardState)) {
    if (nodeState.claimedBy === playerIndex) count++;
  }
  return count;
}

// ─── SPAWN Resolution ─────────────────────────────────────────────

/**
 * Resolve a SPAWN card.
 *
 * Places up to 2 Blight Wraiths adjacent to the Dark Fortress.
 * If all adjacent nodes are occupied, falls back to the farthest reachable
 * node from the leading player's keep.
 *
 * If blocked, wraiths are still placed but the action is flagged.
 */
export function resolveSpawn(
  state: GameState,
  _rng: SeededRandom,
  blocked: boolean,
): ShadowkingAction {
  const baseId = state.boardDefinition.antagonistBase;
  const baseNode = state.boardDefinition.nodes[baseId];
  const adjacentNodes = baseNode.connections;

  // Nodes occupied by at least one antagonist force
  const occupiedByForce = new Set<string>(
    state.antagonistForces.map(f => f.currentNode),
  );

  const availableAdjacent = adjacentNodes.filter(id => !occupiedByForce.has(id));

  const placed: string[] = [];
  const maxToPlace = 2;

  for (let i = 0; i < maxToPlace; i++) {
    if (getMinions(state).length >= MINION_MAX_COUNT) break;

    if (availableAdjacent.length > 0) {
      // Place at first available adjacent node (deterministic)
      const nodeId = availableAdjacent.shift()!;
      const force = placeMinion(state, nodeId);
      if (force) {
        placed.push(nodeId);
        // Remove from occupiedByForce tracking no longer needed here;
        // we already shifted from availableAdjacent
      }
    } else {
      // Overflow: place at farthest reachable node from leading player's keep
      const leadingPlayer = getLeadingPlayer(state);
      const leadingKeep = state.boardDefinition.startingKeeps[leadingPlayer];

      let farthestNode: string | null = null;
      let farthestDist = -1;

      for (const nodeId of Object.keys(state.boardDefinition.nodes)) {
        // Skip antagonist base and nodes already occupied by forces
        if (nodeId === baseId) continue;
        if (occupiedByForce.has(nodeId)) continue;
        // Re-check placed this round too
        if (placed.includes(nodeId)) continue;

        const dist = getDistance(state.boardDefinition, leadingKeep, nodeId);
        if (dist > farthestDist) {
          farthestDist = dist;
          farthestNode = nodeId;
        }
      }

      if (farthestNode !== null) {
        const force = placeMinion(state, farthestNode);
        if (force) {
          placed.push(farthestNode);
          occupiedByForce.add(farthestNode);
        }
      }
    }
  }

  const description = placed.length > 0
    ? `SPAWN: Placed ${placed.length} Blight Wraith(s) at [${placed.join(', ')}]${blocked ? ' (BLOCKED — immobile this round)' : ''}.`
    : `SPAWN: No Blight Wraith(s) placed (cap reached or no valid node).`;

  log(state, 'shadowking-spawn', description);

  return { cardType: 'spawn', description, blocked };
}

// ─── MOVE Resolution ──────────────────────────────────────────────

/**
 * Resolve a MOVE card.
 *
 * If blocked: no movement occurs.
 * Otherwise: find the Death Knight (lieutenant) closest to the leading
 * Arch-Regent, move it 2 nodes toward that leader.
 *
 * Respects diplomatic protection — stops short of a solo Herald's node.
 */
export function resolveMove(
  state: GameState,
  _rng: SeededRandom,
  blocked: boolean,
): ShadowkingAction {
  if (blocked) {
    const description = 'MOVE: Blocked — Death Knight stays.';
    log(state, 'shadowking-move', description);
    return { cardType: 'move', description, blocked };
  }

  const lieutenants = getLieutenants(state);
  if (lieutenants.length === 0) {
    const description = 'MOVE: No Death Knights on the board.';
    log(state, 'shadowking-move', description);
    return { cardType: 'move', description, blocked };
  }

  const leadingPlayerIndex = getLeadingPlayer(state);
  const leadingPlayer = state.players[leadingPlayerIndex];
  const targetNode = leadingPlayer.fellowship.currentNode;

  // Find the lieutenant closest to the leading player's fellowship
  let closestLieutenant: AntagonistForce = lieutenants[0];
  let closestDist = getDistance(
    state.boardDefinition,
    lieutenants[0].currentNode,
    targetNode,
  );

  for (let i = 1; i < lieutenants.length; i++) {
    const lt = lieutenants[i];
    const dist = getDistance(state.boardDefinition, lt.currentNode, targetNode);
    if (dist < closestDist) {
      closestDist = dist;
      closestLieutenant = lt;
    }
  }

  const fromNode = closestLieutenant.currentNode;
  const newNode = moveForceToward(
    state,
    closestLieutenant.id,
    targetNode,
    2,
    true, // respect diplomatic protection
  );

  const description = newNode !== fromNode
    ? `MOVE: Death Knight (${closestLieutenant.id}) moved from ${fromNode} to ${newNode} toward Arch-Regent ${leadingPlayerIndex}.`
    : `MOVE: Death Knight (${closestLieutenant.id}) could not advance from ${fromNode} (blocked by Diplomatic Protection or already at target).`;

  log(state, 'shadowking-move', description);
  return { cardType: 'move', description, blocked };
}

// ─── CLAIM Resolution ─────────────────────────────────────────────

/**
 * Resolve a CLAIM card.
 *
 * If blocked: claim is cancelled.
 * Otherwise: find the Death Knight farthest from any player fellowship.
 * That knight claims the nearest unoccupied Standard Stronghold.
 * Claims are marked with claimedBy = -1 (shadowking marker).
 *
 * Never targets the Dark Fortress or Hall of Neutrality.
 */
export function resolveClaim(
  state: GameState,
  _rng: SeededRandom,
  blocked: boolean,
): ShadowkingAction {
  if (blocked) {
    const description = 'CLAIM: Blocked — no stronghold claimed.';
    log(state, 'shadowking-claim', description);
    return { cardType: 'claim', description, blocked };
  }

  const lieutenants = getLieutenants(state);
  if (lieutenants.length === 0) {
    const description = 'CLAIM: No Death Knights on the board.';
    log(state, 'shadowking-claim', description);
    return { cardType: 'claim', description, blocked };
  }

  const fellowshipNodes = state.players.map(p => p.fellowship.currentNode);

  // Find the Death Knight farthest from any player fellowship
  let farthestLieutenant: AntagonistForce = lieutenants[0];
  let farthestMinDist = minDistToAny(
    state,
    lieutenants[0].currentNode,
    fellowshipNodes,
  );

  for (let i = 1; i < lieutenants.length; i++) {
    const lt = lieutenants[i];
    const minDist = minDistToAny(state, lt.currentNode, fellowshipNodes);
    if (minDist > farthestMinDist) {
      farthestMinDist = minDist;
      farthestLieutenant = lt;
    }
  }

  // Find the nearest unoccupied standard stronghold to the chosen Death Knight
  const definition = state.boardDefinition;
  const antagonistBase = definition.antagonistBase;
  const neutralCenter = definition.neutralCenter;

  const candidateNodes = Object.entries(definition.nodes)
    .filter(([nodeId, node]) => {
      if (nodeId === antagonistBase) return false;
      if (nodeId === neutralCenter) return false;
      if (node.type !== 'standard') return false;
      // Must be unclaimed (null) or not already shadowking-claimed
      const nodeState = state.boardState[nodeId];
      if (!nodeState) return false;
      // "Unoccupied" means not already claimed by shadowking (-1) or any player
      if (nodeState.claimedBy !== null) return false;
      return true;
    })
    .map(([nodeId]) => nodeId);

  if (candidateNodes.length === 0) {
    const description = `CLAIM: Death Knight (${farthestLieutenant.id}) found no valid unoccupied Standard Stronghold to claim.`;
    log(state, 'shadowking-claim', description);
    return { cardType: 'claim', description, blocked };
  }

  // Find nearest to the Death Knight
  let nearestNode = candidateNodes[0];
  let nearestDist = getDistance(
    state.boardDefinition,
    farthestLieutenant.currentNode,
    candidateNodes[0],
  );

  for (let i = 1; i < candidateNodes.length; i++) {
    const dist = getDistance(
      state.boardDefinition,
      farthestLieutenant.currentNode,
      candidateNodes[i],
    );
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestNode = candidateNodes[i];
    }
  }

  // Claim the node: -1 is the shadowking claim marker
  state.boardState[nearestNode].claimedBy = -1 as unknown as number;

  const description = `CLAIM: Death Knight (${farthestLieutenant.id}) claimed ${nearestNode} for the Shadowking.`;
  log(state, 'shadowking-claim', description);
  return { cardType: 'claim', description, blocked };
}

/** Minimum BFS distance from source to any node in the target list. */
function minDistToAny(
  state: GameState,
  source: string,
  targets: string[],
): number {
  let min = Infinity;
  for (const t of targets) {
    const d = getDistance(state.boardDefinition, source, t);
    if (d >= 0 && d < min) min = d;
  }
  return min === Infinity ? -1 : min;
}

// ─── ASSAULT Resolution ───────────────────────────────────────────

/**
 * The result of an ASSAULT card resolution, including combat setup info.
 * Returned within ShadowkingAction when the card type is 'assault' and
 * not blocked — the caller should trigger resolveShadowkingCombat with
 * the indicated force and player.
 */
export interface AssaultTarget {
  readonly forceId: string;
  readonly playerIndex: number;
}

/** Extended action type for ASSAULT that includes combat setup. */
export interface AssaultAction extends ShadowkingAction {
  readonly assault: AssaultTarget | null;
}

/**
 * Resolve an ASSAULT card.
 *
 * If blocked: assault is cancelled.
 * Otherwise: find the Death Knight adjacent to the weakest Arch-Regent
 * (lowest warBanners, tiebreak by fewest strongholds, then highest index).
 * Death Knights ignore Diplomatic Protection for ASSAULT.
 *
 * Returns which force and which player would fight (the caller resolves combat).
 */
export function resolveAssault(
  state: GameState,
  _rng: SeededRandom,
  blocked: boolean,
): AssaultAction {
  if (blocked) {
    const description = 'ASSAULT: Blocked — no combat initiated.';
    log(state, 'shadowking-assault', description);
    return { cardType: 'assault', description, blocked, assault: null };
  }

  const lieutenants = getLieutenants(state);
  if (lieutenants.length === 0) {
    const description = 'ASSAULT: No Death Knights on the board.';
    log(state, 'shadowking-assault', description);
    return { cardType: 'assault', description, blocked, assault: null };
  }

  const weakestPlayerIndex = getWeakestPlayer(state);
  const weakestPlayer = state.players[weakestPlayerIndex];
  const playerNode = weakestPlayer.fellowship.currentNode;

  // Find a Death Knight adjacent to (or on the same node as) the weakest player
  // ASSAULT ignores diplomatic protection
  const adjacentLieutenant = lieutenants.find(lt => {
    const ltNode = state.boardDefinition.nodes[lt.currentNode];
    if (!ltNode) return false;
    // Adjacent means one step away (in connections) or same node
    return lt.currentNode === playerNode || ltNode.connections.includes(playerNode);
  });

  if (!adjacentLieutenant) {
    const description = `ASSAULT: No Death Knight adjacent to weakest Arch-Regent (player ${weakestPlayerIndex} at ${playerNode}).`;
    log(state, 'shadowking-assault', description);
    return { cardType: 'assault', description, blocked, assault: null };
  }

  const description = `ASSAULT: Death Knight (${adjacentLieutenant.id}) assaults Arch-Regent ${weakestPlayerIndex} at ${playerNode}.`;
  log(state, 'shadowking-assault', description);

  return {
    cardType: 'assault',
    description,
    blocked,
    assault: {
      forceId: adjacentLieutenant.id,
      playerIndex: weakestPlayerIndex,
    },
  };
}

// ─── ESCALATE Resolution ──────────────────────────────────────────

/**
 * Resolve an ESCALATE card.
 *
 * ESCALATE cannot be fully blocked:
 *   - Unblocked: advance Doom Toll by 2.
 *   - Blocked: advance Doom Toll by 1.
 */
export function resolveEscalate(
  state: GameState,
  blocked: boolean,
): ShadowkingAction {
  const amount = blocked ? 1 : 2;
  advanceDoomToll(state, amount);

  const description = blocked
    ? `ESCALATE: Partially blocked — Doom Toll advanced by 1 (now ${state.doomToll}).`
    : `ESCALATE: Doom Toll advanced by 2 (now ${state.doomToll}).`;

  log(state, 'shadowking-escalate', description);
  return { cardType: 'escalate', description, blocked };
}

// ─── Main Entry Point ─────────────────────────────────────────────

/**
 * Resolve the current Behavior Card in state.currentBehaviorCard.
 *
 * Dispatches to the appropriate resolve function and logs the action.
 * Returns a ShadowkingAction describing what happened.
 *
 * Throws if there is no current behavior card.
 */
export function resolveBehaviorCard(
  state: GameState,
  rng: SeededRandom,
  blocked: boolean,
): ShadowkingAction {
  if (state.currentBehaviorCard === null) {
    throw new Error('No current behavior card to resolve.');
  }

  const card = state.currentBehaviorCard;

  switch (card.type) {
    case 'spawn':
      return resolveSpawn(state, rng, blocked);
    case 'move':
      return resolveMove(state, rng, blocked);
    case 'claim':
      return resolveClaim(state, rng, blocked);
    case 'assault':
      return resolveAssault(state, rng, blocked);
    case 'escalate':
      return resolveEscalate(state, blocked);
    default: {
      // Exhaustiveness check — TypeScript should catch this at compile time.
      const _exhaustive: never = card.type;
      throw new Error(`Unknown behavior card type: ${String(_exhaustive)}`);
    }
  }
}
