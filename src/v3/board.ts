/**
 * The Closing Ring — the 21-node v3 board topology (T-222 true 8-spoke ring).
 *
 * Built from ALGORITHM §2 (panel R2 consensus), extended in T-222 with 4 cardinal `mid`
 * transit nodes so every one of the 8 compass directions is a real route inward: the 4
 * diagonal rays run through the Forges, the 4 cardinal rays now run through the Mids.
 * Concentric, four-fold symmetric, with lateral mid-belt and inner-ring links.
 *
 * Layout (from spec):
 *
 *                  [Keep N]──[Hold NE]──[Keep E]
 *                    │  ╲      [Mid N]     ╱  │
 *                 [Forge NW]      │     [Forge NE]
 *                    │    ╲       │       ╱    │
 *               [Approach NW]───[Approach NE]
 *          [Mid W]──   │       KEYSTONE     │   ──[Mid E]
 *               [Approach SW]───[Approach SE]
 *                    │    ╱       │       ╲    │
 *                 [Forge SW]      │     [Forge SE]
 *                    │  ╱      [Mid S]     ╲  │
 *                  [Keep S]──[Hold SW]──[Keep W]
 *
 *   (Holdings also connect: Hold NW between Keep W and Keep N,
 *    Hold SE between Keep E and Keep S — completing the outer ring.
 *    Each Mid connects OUTWARD to its cardinal Keep and LATERALLY to the
 *    two diagonal Approaches flanking its cardinal ray.)
 *
 * Tiers:
 *   center     : 1 Keystone
 *   inner ring : 4 Approaches (chokepoints; only routes to Keystone)
 *   mid-belt   : 4 Forges (high-value; lateral ring connects them)
 *              + 4 Mids (cardinal transit; non-claimable, income 0 — T-222)
 *   outer ring : 4 Keeps + 4 Holdings (homes / claimable land)
 *
 * Blight enters at 4 symmetric outer seams (between Keeps) and
 * converges inward along the (diagonal) spokes.
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

  // Cardinal mid-belt transit nodes (T-222 — the 8-spoke ring).
  MID_N: 'mid-n',
  MID_E: 'mid-e',
  MID_S: 'mid-s',
  MID_W: 'mid-w',
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
 * Build the fixed 21-node Closing Ring board definition (T-222 8-spoke ring).
 * The topology is hardcoded per the spec — no procedural generation.
 */
export function buildClosingRing(): V2BoardDef {
  // Topology is DATA: data/board-v3.json -> src/v3/board.gen.ts (run `npm run gen:data` after
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
    keepIds: Object.freeze([...BOARD_DATA.keepIds]),
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
      hiddenToken: null,
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
 *   1. Total node count is 21
 *   2. Tier counts: 1 keystone, 4 approach, 4 forge, 4 keep, 4 holding, 4 mid
 *   3. All connections are bidirectional
 *   4. All connection targets exist
 *   5. Fully connected graph
 *   6. Keystone reachable only via Approaches
 *   7. Lateral rings: Approach 4-cycle, Forge 4-cycle
 *   8. Each Keep is distance 3 from Keystone (Keep → Forge → Approach → Keystone)
 *   9. Each Mid connects to exactly 2 Approaches + 1 Keep (T-222 8-spoke ring)
 */
export function validateClosingRing(definition: V2BoardDef): BoardValidationResult {
  const errors: string[] = [];
  const allNodes = Object.values(definition.nodes);

  // 1. Total count
  if (allNodes.length !== 21) {
    errors.push(`Expected 21 nodes, found ${allNodes.length}`);
  }

  // 2. Tier counts
  const tierCounts: Record<string, number> = {};
  for (const n of allNodes) {
    tierCounts[n.tier] = (tierCounts[n.tier] ?? 0) + 1;
  }
  const expectedTiers: Record<string, number> = {
    keystone: 1, approach: 4, forge: 4, keep: 4, holding: 4, mid: 4,
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

  // 9. Mid-belt (T-222 8-spoke ring): each Mid bridges its cardinal ray — exactly 2 Approaches
  //    (the flanking diagonals) + 1 Keep (its cardinal home), degree 3, income 0.
  const midNodes = allNodes.filter(n => n.tier === 'mid');
  for (const mid of midNodes) {
    const approachLinks = mid.connections.filter(c => definition.nodes[c]?.tier === 'approach').length;
    const keepLinks = mid.connections.filter(c => definition.nodes[c]?.tier === 'keep').length;
    if (approachLinks !== 2) {
      errors.push(`Mid ${mid.id} connects to ${approachLinks} approaches (expected 2)`);
    }
    if (keepLinks !== 1) {
      errors.push(`Mid ${mid.id} connects to ${keepLinks} keeps (expected 1)`);
    }
    if (mid.connections.length !== 3) {
      errors.push(`Mid ${mid.id} has degree ${mid.connections.length} (expected 3)`);
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

/**
 * Derive the id of the (single) node of a given tier in a given quadrant — the inverse of
 * `getNodeQuadrant`. This is the "quadrant mapping derived, not assumed" primitive: instead of
 * indexing `def.keepIds[q]` (which only works while the board data happens to be ordered so that
 * array-index == quadrant), we scan for the node whose `tier` and `quadrant` fields match. There is
 * exactly one keep / forge / approach per quadrant, so the lookup is unambiguous; returns
 * `undefined` when no node matches (e.g. tiers with `quadrant: null` such as `holding`/`keystone`).
 */
export function getNodeInQuadrant(
  definition: V2BoardDef,
  tier: V2NodeDef['tier'],
  quadrant: number,
): string | undefined {
  for (const n of Object.values(definition.nodes)) {
    if (n.tier === tier && n.quadrant === quadrant) return n.id;
  }
  return undefined;
}

/** The keep that homes the given quadrant (derived from node data, not array position). */
export function getKeepForQuadrant(definition: V2BoardDef, quadrant: number): string | undefined {
  return getNodeInQuadrant(definition, 'keep', quadrant);
}

/** The forge in the given quadrant (derived from node data, not array position). */
export function getForgeForQuadrant(definition: V2BoardDef, quadrant: number): string | undefined {
  return getNodeInQuadrant(definition, 'forge', quadrant);
}

/** The approach in the given quadrant (derived from node data, not array position). */
export function getApproachForQuadrant(
  definition: V2BoardDef,
  quadrant: number,
): string | undefined {
  return getNodeInQuadrant(definition, 'approach', quadrant);
}

// ─── Blight Spokes (8-ray board) ──────────────────────────────────

/**
 * The outer blight seam (Holding) for a quadrant's spoke.
 *
 * 8-ray rule (DESIGN-V3-ALGORITHM.md §13 `[T-224 2026-07-20]`): on the 21-node board the 8 compass
 * rays split into 4 DIAGONAL blight rays (NW/NE/SE/SW — each `Holding → Forge → Approach → Keystone`)
 * and 4 CARDINAL home rays (N/E/S/W — `Keep → Mid → Approach`, never a blight path). Quadrant `q`
 * owns the diagonal forge(q)/approach(q); its seam is the single **Holding colinear with them** — the
 * one Holding adjacent to BOTH keep(q) and keep((q+3) mod 4) (the two Keeps flanking that diagonal
 * corner). Derived from node data (adjacency), never from an id string. Returns `undefined` when no
 * such Holding exists (keeps the builder total).
 */
export function getSpokeSeam(definition: V2BoardDef, quadrant: number): string | undefined {
  const keepA = getKeepForQuadrant(definition, quadrant);
  const keepB = getKeepForQuadrant(definition, (quadrant + 3) % 4);
  if (!keepA || !keepB) return undefined;

  for (const n of Object.values(definition.nodes)) {
    if (n.tier !== 'holding') continue;
    if (n.connections.includes(keepA) && n.connections.includes(keepB)) return n.id;
  }
  return undefined;
}

/**
 * The steered blight spoke for a quadrant, outer → inner: `[seam, forge, approach, keystone]`.
 *
 * 8-ray rule (DESIGN-V3-ALGORITHM.md §13 `[T-224 2026-07-20]`): the spoke is the quadrant's DIAGONAL
 * ray. It runs the seam Holding, then the Forge, then the Approach, then the Keystone — **the Keep
 * (protected home) and the cardinal Mid (transit) are never on a blight spoke**. Every spoke
 * terminates at the Keystone, so doom is reachable from any seam. Any tier with no member in the
 * quadrant is dropped so the builder stays total. Supersedes the v2 §2 4-spoke (keep-bearing)
 * phrasing on the 21-node board.
 */
export function getSpokePath(definition: V2BoardDef, quadrant: number): string[] {
  return [
    getSpokeSeam(definition, quadrant),
    getForgeForQuadrant(definition, quadrant),
    getApproachForQuadrant(definition, quadrant),
    definition.keystoneId,
  ].filter((id): id is string => id !== undefined);
}
