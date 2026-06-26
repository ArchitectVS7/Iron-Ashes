/**
 * The Closing Ring — the 17-node v2 board topology.
 *
 * Built from ALGORITHM §2 (panel R2 consensus).
 * Concentric, four-fold symmetric, with lateral mid-belt and inner-ring links.
 *
 * Layout (from spec):
 *
 *                  [Keep N]──[Hold NE]──[Keep E]
 *                    │   ╲              ╱   │
 *                 [Forge NW]        [Forge NE]
 *                    │      ╲      ╱      │
 *               [Approach NW]─[Approach NE]
 *                    │      KEYSTONE      │
 *               [Approach SW]─[Approach SE]
 *                    │      ╱      ╲      │
 *                 [Forge SW]        [Forge SE]
 *                    │   ╱              ╲   │
 *                  [Keep S]──[Hold SW]──[Keep W]
 *
 *   (Holdings also connect: Hold NW between Keep W and Keep N,
 *    Hold SE between Keep E and Keep S — completing the outer ring.)
 *
 * Tiers:
 *   center     : 1 Keystone
 *   inner ring : 4 Approaches (chokepoints; only routes to Keystone)
 *   mid-belt   : 4 Forges (high-value; lateral ring connects them)
 *   outer ring : 4 Keeps + 4 Holdings (homes / claimable land)
 *
 * Blight enters at 4 symmetric outer seams (between Keeps) and
 * converges inward along the spokes.
 */

import type {
  Quadrant,
  V2BoardDef,
  V2BoardState,
  V2NodeDef,
  V2NodeState,
} from './types.js';
import { BOARD_DATA } from './board.gen.js';

// ─── Node ID Constants ────────────────────────────────────────────

export const NODE_IDS = {
  KEYSTONE: 'keystone',

  APPROACH_N: 'approach-n',
  APPROACH_E: 'approach-e',
  APPROACH_S: 'approach-s',
  APPROACH_W: 'approach-w',

  FORGE_NE: 'forge-ne',
  FORGE_SE: 'forge-se',
  FORGE_SW: 'forge-sw',
  FORGE_NW: 'forge-nw',

  KEEP_N: 'keep-n',
  KEEP_E: 'keep-e',
  KEEP_S: 'keep-s',
  KEEP_W: 'keep-w',

  HOLDING_NE: 'holding-ne',
  HOLDING_SE: 'holding-se',
  HOLDING_SW: 'holding-sw',
  HOLDING_NW: 'holding-nw',
} as const;

// ─── Helper ───────────────────────────────────────────────────────

function nodeDef(
  id: string,
  tier: V2NodeDef['tier'],
  quadrant: Quadrant,
  connections: string[],
  income: number,
): V2NodeDef {
  return Object.freeze({ id, tier, quadrant, connections: Object.freeze(connections), income });
}

// ─── Build the Closing Ring ───────────────────────────────────────

/**
 * Build the fixed 17-node Closing Ring board definition.
 * The topology is hardcoded per the spec — no procedural generation.
 */
export function buildClosingRing(): V2BoardDef {
  // Topology is DATA: data/board.json -> board.gen.ts (run `npm run gen:data` after
  // editing). validateClosingRing() + the blight spoke-path tests + the 18-22% balance
  // lock guard every edge, so a wrong connection fails CI loudly.
  const nodes: Record<string, V2NodeDef> = {};
  for (const n of BOARD_DATA.nodes) {
    nodes[n.id] = nodeDef(n.id, n.tier, n.quadrant, [...n.connections], n.income);
  }

  return Object.freeze({
    nodes: Object.freeze(nodes),
    keystoneId: BOARD_DATA.keystoneId,
    approachIds: Object.freeze([...BOARD_DATA.approachIds]),
    forgeIds: Object.freeze([...BOARD_DATA.forgeIds]),
    keepIds: [...BOARD_DATA.keepIds] as [string, string, string, string],
    holdingIds: Object.freeze([...BOARD_DATA.holdingIds]),
    blightEntrySeams: Object.freeze([...BOARD_DATA.blightEntrySeams]),
  });
}

// ─── Board State Initialization ───────────────────────────────────

/**
 * Create the initial board state from a board definition.
 * All nodes start alive (not ashed, blightLevel 0), unclaimed.
 * Keeps are pre-claimed by their quadrant player in setup.ts.
 */
export function createInitialBoardState(definition: V2BoardDef): V2BoardState {
  const nodes: Record<string, V2NodeState> = {};

  for (const nodeId of Object.keys(definition.nodes)) {
    nodes[nodeId] = {
      owner: null,
      ashed: false,
      blightLevel: 0,
      pieces: [],
      shadowkingForces: [],
    };
  }

  return { nodes };
}

// ─── Board Validation ─────────────────────────────────────────────

export interface BoardValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate the Closing Ring board definition against the spec's constraints.
 *
 * Checks:
 *   1. Total node count is 17
 *   2. Tier counts: 1 keystone, 4 approach, 4 forge, 4 keep, 4 holding
 *   3. All connections are bidirectional
 *   4. All connection targets exist
 *   5. Fully connected graph
 *   6. Keystone reachable only via Approaches
 *   7. Lateral rings: Approach 4-cycle, Forge 4-cycle
 *   8. Each Keep is distance 2 from Keystone (Keep → Forge → Approach → Keystone)
 */
export function validateClosingRing(definition: V2BoardDef): BoardValidationResult {
  const errors: string[] = [];
  const allNodes = Object.values(definition.nodes);

  // 1. Total count
  if (allNodes.length !== 17) {
    errors.push(`Expected 17 nodes, found ${allNodes.length}`);
  }

  // 2. Tier counts
  const tierCounts: Record<string, number> = {};
  for (const n of allNodes) {
    tierCounts[n.tier] = (tierCounts[n.tier] ?? 0) + 1;
  }
  const expectedTiers: Record<string, number> = {
    keystone: 1, approach: 4, forge: 4, keep: 4, holding: 4,
  };
  for (const [tier, expected] of Object.entries(expectedTiers)) {
    const actual = tierCounts[tier] ?? 0;
    if (actual !== expected) {
      errors.push(`Expected ${expected} ${tier} nodes, found ${actual}`);
    }
  }

  // 3 & 4. Connection integrity
  for (const n of allNodes) {
    for (const connId of n.connections) {
      const target = definition.nodes[connId];
      if (!target) {
        errors.push(`Node ${n.id} connects to non-existent node ${connId}`);
        continue;
      }
      if (!target.connections.includes(n.id)) {
        errors.push(`Connection ${n.id} → ${connId} is not bidirectional`);
      }
    }
  }

  // 5. Full connectivity
  if (allNodes.length > 0) {
    const visited = new Set<string>();
    const queue = [allNodes[0].id];
    visited.add(allNodes[0].id);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const conn of definition.nodes[current].connections) {
        if (!visited.has(conn)) {
          visited.add(conn);
          queue.push(conn);
        }
      }
    }
    if (visited.size !== allNodes.length) {
      const unreachable = allNodes.filter(n => !visited.has(n.id)).map(n => n.id);
      errors.push(`Graph not fully connected. Unreachable: ${unreachable.join(', ')}`);
    }
  }

  // 6. Keystone reachable only via Approaches
  const keystoneNode = definition.nodes[definition.keystoneId];
  if (keystoneNode) {
    for (const connId of keystoneNode.connections) {
      const conn = definition.nodes[connId];
      if (conn && conn.tier !== 'approach') {
        errors.push(`Keystone connects to non-approach node ${connId} (tier: ${conn.tier})`);
      }
    }
  }

  // 7. Lateral rings
  // Each Approach should connect to exactly 2 other Approaches
  const approachNodes = allNodes.filter(n => n.tier === 'approach');
  for (const app of approachNodes) {
    const lateralCount = app.connections.filter(
      c => definition.nodes[c]?.tier === 'approach'
    ).length;
    if (lateralCount !== 2) {
      errors.push(`Approach ${app.id} has ${lateralCount} lateral approach connections (expected 2)`);
    }
  }

  // Each Forge should connect to exactly 2 other Forges
  const forgeNodes = allNodes.filter(n => n.tier === 'forge');
  for (const forge of forgeNodes) {
    const lateralCount = forge.connections.filter(
      c => definition.nodes[c]?.tier === 'forge'
    ).length;
    if (lateralCount !== 2) {
      errors.push(`Forge ${forge.id} has ${lateralCount} lateral forge connections (expected 2)`);
    }
  }

  // 8. Each Keep is distance 3 from Keystone (Keep → Forge → Approach → Keystone)
  for (const keepId of definition.keepIds) {
    const dist = bfsDistance(definition, keepId, definition.keystoneId);
    if (dist !== 3) {
      errors.push(`Keep ${keepId} is distance ${dist} from Keystone (expected 3)`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/** BFS shortest distance between two nodes. Returns -1 if unreachable. */
function bfsDistance(definition: V2BoardDef, source: string, target: string): number {
  if (source === target) return 0;
  const visited = new Set<string>([source]);
  const queue: Array<{ nodeId: string; distance: number }> = [{ nodeId: source, distance: 0 }];

  while (queue.length > 0) {
    const { nodeId, distance } = queue.shift()!;
    for (const conn of definition.nodes[nodeId].connections) {
      if (visited.has(conn)) continue;
      visited.add(conn);
      if (conn === target) return distance + 1;
      queue.push({ nodeId: conn, distance: distance + 1 });
    }
  }

  return -1;
}

// ─── Board Queries ────────────────────────────────────────────────

/** Get all node IDs of a given tier. */
export function getNodesByTier(definition: V2BoardDef, tier: V2NodeDef['tier']): string[] {
  return Object.values(definition.nodes)
    .filter(n => n.tier === tier)
    .map(n => n.id);
}

/** Get the quadrant a node belongs to. */
export function getNodeQuadrant(definition: V2BoardDef, nodeId: string): Quadrant {
  const node = definition.nodes[nodeId];
  if (!node) throw new Error(`Node ${nodeId} not found`);
  return node.quadrant;
}
