/**
 * The Closing Ring — the 21-node v3 board topology (T-231 ring-rewire lattice).
 *
 * Built from ALGORITHM §2 (panel R2 consensus), extended in T-222 with 4 cardinal `mid`
 * transit nodes and rewired in T-231 (M2.6 topology exception) into an interlocking lattice.
 * The 21-node set is unchanged — only the edges changed:
 *   - the old Forge↔Forge ring (a 4-cycle) is REMOVED — no Forge touches another Forge;
 *   - each Keep now bridges BOTH flanking Forges (its own diagonal Forge + the adjacent one);
 *   - two octagons are added: Keep↔Forge (outer-cardinal ↔ diagonal-mid) and Holding↔Mid
 *     (outer-diagonal ↔ cardinal-mid);
 *   - the 4 cardinal Mids form a square (Mid N↔E↔S↔W).
 * Concentric, four-fold symmetric. Blight still enters only at the 4 Holding seams; since the
 * sixth-review lattice made the Mids the mandatory cut, the spoke is the edge-real SERPENTINE
 * `seam → Mid → Forge → Mid → Approach → Keystone` (§13 [T-236] — every hop a real edge).
 *
 * Tiers:
 *   center     : 1 Keystone
 *   inner ring : 4 Approaches (chokepoints; only routes to Keystone)
 *   mid-belt   : 4 Forges (high-value; each links its 2 flanking Keeps + its 2 flanking Mids)
 *              + 4 Mids (cardinal transit; non-claimable, income 0)
 *   outer ring : 4 Keeps + 4 Holdings (homes / claimable land)
 *
 * Degrees: Forge 4, Keep 4, Holding 4, Mid 6, Approach 5, Keystone 4 → 48 undirected edges.
 * (T-231 lattice was 52; a later pass removed the 4 mid↔keep spokes → 48; the sixth-review pass
 * removed the 4 approach↔forge spokes and swapped the 4 mid↔mid square for 8 mid↔forge edges → 48.)
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
 *   7. Lateral rings: Approach 4-cycle; NO Forge↔Forge edge (T-231 removed the forge ring)
 *   8. Each Keep is distance 4 from Keystone (Keep → Forge → Mid → Approach → Keystone — the
 *      sixth-review pass removed the approach↔forge spokes, lengthening the path from 3 to 4)
 *   9. Each Mid connects to 2 Approaches + 2 Holdings + 2 Forges (degree 6 — the sixth-review pass
 *      swapped the mid↔mid square for mid↔forge edges; a Mid no longer touches another Mid or its Keep)
 *  10. Each quadrant's blight spoke is EDGE-REAL (§13 [T-236]): every consecutive hop in
 *      getSpokePath is a real board edge, the spoke starts at a declared blight-entry seam,
 *      ends at the Keystone, and never contains a Keep
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

  // No Forge↔Forge edge (T-231 removed the forge ring — a Forge reaches 2 Keeps + 2 Mids)
  const forgeNodes = allNodes.filter(n => n.tier === 'forge');
  for (const forge of forgeNodes) {
    const lateralCount = forge.connections.filter(
      c => definition.nodes[c]?.tier === 'forge'
    ).length;
    if (lateralCount !== 0) {
      errors.push(`Forge ${forge.id} has ${lateralCount} forge-to-forge connections (expected 0)`);
    }
  }

  // 8. Each Keep is distance 4 from Keystone (Keep → Forge → Mid → Approach → Keystone — the
  //    sixth-review pass removed the approach↔forge spokes, lengthening the path from 3 to 4).
  for (const keepId of definition.keepIds) {
    const dist = bfsDistance(definition, keepId, definition.keystoneId);
    if (dist !== 4) {
      errors.push(`Keep ${keepId} is distance ${dist} from Keystone (expected 4)`);
    }
  }

  // 9. Mid-belt (sixth-review pass): each Mid bridges its cardinal ray — 2 Approaches (flanking
  //    diagonals) + 2 Holdings (the Holding↔Mid octagon) + 2 Forges (its two flanking forges),
  //    degree 6, income 0. It no longer touches another Mid or its Keep.
  const midNodes = allNodes.filter(n => n.tier === 'mid');
  for (const mid of midNodes) {
    const approachLinks = mid.connections.filter(c => definition.nodes[c]?.tier === 'approach').length;
    const keepLinks = mid.connections.filter(c => definition.nodes[c]?.tier === 'keep').length;
    const holdingLinks = mid.connections.filter(c => definition.nodes[c]?.tier === 'holding').length;
    const midLinks = mid.connections.filter(c => definition.nodes[c]?.tier === 'mid').length;
    const forgeLinks = mid.connections.filter(c => definition.nodes[c]?.tier === 'forge').length;
    if (approachLinks !== 2) {
      errors.push(`Mid ${mid.id} connects to ${approachLinks} approaches (expected 2)`);
    }
    if (keepLinks !== 0) {
      errors.push(`Mid ${mid.id} connects to ${keepLinks} keeps (expected 0)`);
    }
    if (holdingLinks !== 2) {
      errors.push(`Mid ${mid.id} connects to ${holdingLinks} holdings (expected 2)`);
    }
    if (midLinks !== 0) {
      errors.push(`Mid ${mid.id} connects to ${midLinks} mids (expected 0)`);
    }
    if (forgeLinks !== 2) {
      errors.push(`Mid ${mid.id} connects to ${forgeLinks} forges (expected 2)`);
    }
    if (mid.connections.length !== 6) {
      errors.push(`Mid ${mid.id} has degree ${mid.connections.length} (expected 6)`);
    }
  }

  // 10. Edge-real blight spokes (§13 [T-236]): the front must march along drawn edges only.
  for (let q = 0; q < 4; q++) {
    const spoke = getSpokePath(definition, q);
    if (spoke.length !== 6) {
      errors.push(`Spoke ${q} has ${spoke.length} nodes (expected 6: seam, mid, forge, mid, approach, keystone)`);
    }
    for (let i = 0; i + 1 < spoke.length; i++) {
      if (!definition.nodes[spoke[i]]?.connections.includes(spoke[i + 1])) {
        errors.push(`Spoke ${q} hop ${spoke[i]} → ${spoke[i + 1]} is not a real board edge`);
      }
    }
    if (spoke.length > 0) {
      if (!definition.blightEntrySeams.includes(spoke[0])) {
        errors.push(`Spoke ${q} starts at ${spoke[0]}, which is not a declared blight-entry seam`);
      }
      if (spoke[spoke.length - 1] !== definition.keystoneId) {
        errors.push(`Spoke ${q} ends at ${spoke[spoke.length - 1]}, not the Keystone`);
      }
    }
    for (const id of spoke) {
      if (definition.nodes[id]?.tier === 'keep') {
        errors.push(`Spoke ${q} contains Keep ${id} — Keeps are never on a blight spoke`);
      }
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

/** The cardinal mid in the given quadrant (derived from node data, not array position). */
export function getMidForQuadrant(definition: V2BoardDef, quadrant: number): string | undefined {
  return getNodeInQuadrant(definition, 'mid', quadrant);
}

// ─── Blight Spokes (8-ray board) ──────────────────────────────────

/**
 * The outer blight seam (Holding) for a quadrant's spoke.
 *
 * 8-ray rule (DESIGN-V3-ALGORITHM.md §13 `[T-224 2026-07-20]`, path shape amended by `[T-236]`):
 * on the 21-node board the 8 compass rays split into 4 DIAGONAL blight rays (NW/NE/SE/SW — seam
 * Holdings, Forges, Approaches) and 4 CARDINAL home rays (N/E/S/W — the protected Keeps behind
 * their flanking Forges; a Keep is never a blight path). Quadrant `q`
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
 * The steered blight spoke for a quadrant, outer → inner — the edge-real SERPENTINE:
 * `[seam, mid((q+3)%4), forge(q), mid(q), approach(q), keystone]`.
 *
 * Edge-real rule (DESIGN-V3-ALGORITHM.md §13 `[T-236 2026-07-21]`, superseding the `[T-224]` path
 * shape): **every consecutive spoke hop is a real board edge** (validateClosingRing check 10), so
 * the front never jumps between unconnected nodes on screen. On the sixth-review 48-edge lattice
 * the 4 cardinal Mids are the mandatory cut between the outer board and the Approach ring, so the
 * Mid JOINS the spoke: the front enters at the seam Holding, crosses the counter-clockwise flank
 * Mid, burns the quadrant's Forge, crosses the quadrant's own Mid, and closes through the Approach
 * onto the Keystone. **The Keep (protected home) is still never on a blight spoke.** Each Mid
 * serves exactly two spokes (exit of q, entry of q+1) — adjacent fronts converge on shared passes.
 * Every spoke terminates at the Keystone, so doom is reachable from any seam. Any tier with no
 * member in the quadrant is dropped so the builder stays total.
 */
export function getSpokePath(definition: V2BoardDef, quadrant: number): string[] {
  return [
    getSpokeSeam(definition, quadrant),
    getMidForQuadrant(definition, (quadrant + 3) % 4),
    getForgeForQuadrant(definition, quadrant),
    getMidForQuadrant(definition, quadrant),
    getApproachForQuadrant(definition, quadrant),
    definition.keystoneId,
  ].filter((id): id is string => id !== undefined);
}
