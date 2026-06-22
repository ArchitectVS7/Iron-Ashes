/**
 * Blight System — the ash-map mechanic (§5.1).
 *
 * The Shadowking's primary weapon. Blight enters at 4 outer-ring seams
 * (Holdings), converges inward along spokes toward the Keystone. The
 * steered front accelerates down the Crown holder's quadrant each round.
 *
 * When a node's blightLevel reaches BLIGHT_TO_ASH, it permanently ashes:
 * owner cleared, produces nothing, remains traversable at extra cost (P0-3).
 *
 * Net-front arithmetic ordering (P1/C3):
 *   1. PLEDGE: strike spread (proportional block)
 *   2. ACTION: pushback (DK kills, Forge reclaims)
 *   3. DAWN: escalation advance (anti-turtle baseline)
 *
 * Act transitions at ashed-count thresholds (§5.5, at most one per Dawn).
 */

import type { GameEvent, BlightSource } from './events.js';
import type { Act, GameState, V2BoardDef } from './types.js';
import {
  ACT_THRESHOLDS,
  BLIGHT_TO_ASH,
  DAWN_BLIGHT_ADVANCE,
  SPREAD_AMOUNT_BASE,
} from './tunables.js';

// ─── Core Blight Operations ──────────────────────────────────────

export interface BlightResult {
  state: GameState;
  events: GameEvent[];
}

/**
 * Advance Blight on a single node. If it reaches BLIGHT_TO_ASH, ash it.
 *
 * @param state — mutable game state
 * @param nodeId — node to advance
 * @param amount — blight levels to add
 * @param source — what caused the advance (for event logging)
 * @returns events produced
 */
export function advanceBlightOnNode(
  state: GameState,
  nodeId: string,
  amount: number,
  source: BlightSource,
): GameEvent[] {
  const events: GameEvent[] = [];
  const nodeState = state.board.state.nodes[nodeId];
  if (!nodeState || nodeState.ashed) return events;

  const previousLevel = nodeState.blightLevel;
  nodeState.blightLevel = Math.min(nodeState.blightLevel + amount, BLIGHT_TO_ASH);

  if (nodeState.blightLevel !== previousLevel) {
    events.push({
      type: 'BLIGHT_ADVANCED',
      nodeId,
      previousLevel,
      newLevel: nodeState.blightLevel,
      source,
    });
  }

  // Check if the node should ash
  if (nodeState.blightLevel >= BLIGHT_TO_ASH && !nodeState.ashed) {
    events.push(...ashNode(state, nodeId));
  }

  return events;
}

/**
 * Permanently ash a node: owner cleared, produces nothing.
 * Remains traversable at extra cost (P0-3 fix).
 */
export function ashNode(state: GameState, nodeId: string): GameEvent[] {
  const events: GameEvent[] = [];
  const nodeState = state.board.state.nodes[nodeId];
  if (!nodeState || nodeState.ashed) return events;

  const previousOwner = nodeState.owner;
  nodeState.ashed = true;
  nodeState.blightLevel = BLIGHT_TO_ASH;
  nodeState.owner = null;

  events.push({
    type: 'NODE_ASHED',
    nodeId,
    previousOwner,
  });

  return events;
}

/**
 * Advance Blight along a steered spoke (a quadrant's path from outer to inner).
 *
 * The Blight advances on the frontier nodes of the given quadrant — the
 * outermost non-ashed nodes along the spoke. Each frontier node gets
 * `amount` blight levels added.
 *
 * Spoke path per quadrant (outer → inner):
 *   Holding → Keep → Forge → Approach → Keystone
 *
 * @param amount — total blight levels to distribute across frontier
 */
export function advanceBlightOnSpoke(
  state: GameState,
  quadrant: number,
  amount: number,
  source: BlightSource,
): GameEvent[] {
  const events: GameEvent[] = [];
  const frontier = getSpokeFrontier(state, quadrant);

  if (frontier.length === 0) return events;

  // Distribute blight to the frontier nodes (advance the front)
  for (const nodeId of frontier) {
    events.push(...advanceBlightOnNode(state, nodeId, amount, source));
  }

  return events;
}

/**
 * Apply pushback to a node — reduce blight level.
 * Cannot reduce below 0. Cannot un-ash a node.
 * Floors at the outer seam (cannot retreat off-board).
 */
export function applyPushback(
  state: GameState,
  nodeId: string,
  amount: number,
): GameEvent[] {
  const events: GameEvent[] = [];
  const nodeState = state.board.state.nodes[nodeId];
  if (!nodeState || nodeState.ashed) return events;

  const previousLevel = nodeState.blightLevel;
  nodeState.blightLevel = Math.max(nodeState.blightLevel - amount, 0);

  if (nodeState.blightLevel !== previousLevel) {
    events.push({
      type: 'BLIGHT_ADVANCED',
      nodeId,
      previousLevel,
      newLevel: nodeState.blightLevel,
      source: 'strike', // pushback source
    });
  }

  return events;
}

// ─── Frontier Queries ─────────────────────────────────────────────

/**
 * Get the spoke path for a quadrant (outer → inner → keystone).
 *
 * For quadrant Q, the spoke is:
 *   [holdingA, holdingB] → keepQ → forgeQ → approachQ → keystone
 *
 * Where holdingA and holdingB are the two holdings adjacent to keepQ.
 */
export function getSpokePath(definition: V2BoardDef, quadrant: number): string[] {
  const keepId = definition.keepIds[quadrant];
  const keepNode = definition.nodes[keepId];

  // Find the two holdings adjacent to this keep
  const adjacentHoldings = keepNode.connections.filter(
    connId => definition.nodes[connId]?.tier === 'holding'
  );

  // Find the forge in this quadrant
  const forgeId = definition.forgeIds[quadrant];

  // Find the approach in this quadrant
  const approachId = definition.approachIds[quadrant];

  // Build path from outer to inner
  return [
    ...adjacentHoldings,
    keepId,
    forgeId,
    approachId,
    definition.keystoneId,
  ];
}

/**
 * Get the frontier nodes for a quadrant — the outermost non-ashed nodes
 * along the spoke that are adjacent to blighted/ashed territory or are
 * the first nodes on the spoke.
 *
 * The "frontier" is where the Blight is actively advancing.
 * In practice: the first non-ashed node on the spoke path from outer to inner.
 */
export function getSpokeFrontier(state: GameState, quadrant: number): string[] {
  const spokePath = getSpokePath(state.board.definition, quadrant);
  const frontier: string[] = [];

  for (const nodeId of spokePath) {
    const nodeState = state.board.state.nodes[nodeId];
    if (!nodeState) continue;
    if (nodeState.ashed) continue;

    // This is a non-ashed node on the spoke — it's the frontier
    frontier.push(nodeId);
    break; // Only advance the first non-ashed node (the front)
  }

  return frontier;
}

/**
 * Get ALL nodes across the entire board that are on the blight frontier.
 * (All non-ashed nodes adjacent to at least one ashed or blighted node.)
 */
export function getBlightFrontier(state: GameState): string[] {
  const frontier: string[] = [];

  for (const [nodeId, nodeState] of Object.entries(state.board.state.nodes)) {
    if (nodeState.ashed) continue;

    // Check if any neighbor is ashed or blighted
    const nodeDef = state.board.definition.nodes[nodeId];
    if (!nodeDef) continue;

    const hasBlightedNeighbor = nodeDef.connections.some(connId => {
      const connState = state.board.state.nodes[connId];
      return connState && (connState.ashed || connState.blightLevel > 0);
    });

    if (hasBlightedNeighbor || nodeState.blightLevel > 0) {
      frontier.push(nodeId);
    }
  }

  return frontier;
}

// ─── Ash Counting & Act Checks ────────────────────────────────────

/** Count total ashed nodes on the board. */
export function countAshedNodes(state: GameState): number {
  let count = 0;
  for (const nodeState of Object.values(state.board.state.nodes)) {
    if (nodeState.ashed) count++;
  }
  return count;
}

/**
 * Check if the game should advance to a new Act based on ashed node count.
 *
 * At most ONE Act advance per call (§7.11).
 * Whisper → March at MARCH threshold, March → Reckoning at RECKONING threshold.
 *
 * @returns the new Act if escalation should happen, or null if no change
 */
export function checkActAdvance(state: GameState): Act | null {
  const ashed = countAshedNodes(state);
  const current = state.act;

  if (current === 'WHISPER' && ashed >= ACT_THRESHOLDS.MARCH) {
    return 'MARCH';
  }
  if (current === 'MARCH' && ashed >= ACT_THRESHOLDS.RECKONING) {
    return 'RECKONING';
  }

  return null;
}

// ─── Strike Resolution ────────────────────────────────────────────

/**
 * Apply the un-averted portion of a strike to the board.
 *
 * The strike spread is: ceil((1 - ratio) * SPREAD_AMOUNT_BASE)
 * Distributed to the steered quadrant's spoke frontier.
 *
 * @param ratio — how much of the strike was blocked (0 = none, 1 = full)
 * @param steerQuadrant — quadrant the strike is aimed at
 */
export function resolveStrike(
  state: GameState,
  ratio: number,
  steerQuadrant: number,
): BlightResult {
  const events: GameEvent[] = [];

  if (ratio >= 1) {
    // Full block — no Blight spread
    return { state, events };
  }

  // Proportional spread: ceil ensures even tiny unblocked fractions do damage
  const spreadAmount = Math.ceil((1 - ratio) * SPREAD_AMOUNT_BASE);

  // Spread on the steered spoke
  events.push(...advanceBlightOnSpoke(state, steerQuadrant, spreadAmount, 'strike'));

  return { state, events };
}

/**
 * Apply the per-Dawn baseline Blight advance (anti-turtle mechanic, P1/C3).
 *
 * The steered spoke always advances by DAWN_BLIGHT_ADVANCE each Dawn
 * regardless of Pledge outcome. This ensures the front can never reach
 * a stable zero — even if players push back, the dark creeps forward.
 *
 * @param steerQuadrant — quadrant of the current Crown holder (steering)
 */
export function applyDawnBlightAdvance(
  state: GameState,
  steerQuadrant: number,
): BlightResult {
  const events: GameEvent[] = [];
  events.push(...advanceBlightOnSpoke(state, steerQuadrant, DAWN_BLIGHT_ADVANCE, 'dawn'));
  return { state, events };
}

/**
 * Check if the Keystone is ashed (doom_complete loss condition).
 */
export function isKeystoneAshed(state: GameState): boolean {
  const ksState = state.board.state.nodes[state.board.definition.keystoneId];
  return ksState ? ksState.ashed : false;
}
