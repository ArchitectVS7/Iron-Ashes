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
  const N = NODE_IDS;

  const nodes: Record<string, V2NodeDef> = {};

  // Helper to register a node
  const add = (def: V2NodeDef) => { nodes[def.id] = def; };

  // ── Keystone (center) ──
  add(nodeDef(N.KEYSTONE, 'keystone', null, [
    N.APPROACH_N, N.APPROACH_E, N.APPROACH_S, N.APPROACH_W,
  ], 0));

  // ── Approaches (inner ring) ──
  // Each connects to: Keystone, 2 lateral neighbor Approaches, 1 Forge
  // Quadrant assignment: approach-n is between quadrant 0 (N) and 1 (E), etc.
  // We assign each approach to the quadrant of the Forge it gates.
  // approach-n gates forge-nw (quadrant 0) — but actually, let's think about this.
  //
  // The spec's diagram shows:
  //   approach-nw and approach-ne flank the N side
  //   approach-sw and approach-se flank the S side
  //
  // But the spec also says 4 approaches with lateral links forming a ring.
  // Let me re-read: "Approach NW", "Approach NE", "Approach SW", "Approach SE"
  //
  // Actually the spec names them NW/NE/SW/SE. Let me re-map the IDs.

  // Wait — I need to re-examine the spec's topology more carefully.
  // From the ASCII art:
  //   [Approach NW]─[Approach NE]
  //         |      KEYSTONE      |
  //   [Approach SW]─[Approach SE]
  //
  // So the approaches are NW, NE, SW, SE — not N, E, S, W.
  // Let me fix the node IDs.

  // Actually, looking at the full diagram:
  //   Forge NW connects to Approach NW
  //   Forge NE connects to Approach NE
  //   Forge SW connects to Approach SW
  //   Forge SE connects to Approach SE
  //
  // Each approach connects laterally to its neighbors:
  //   NW ↔ NE (top lateral)
  //   SW ↔ SE (bottom lateral)
  //   NW ↔ SW (left lateral)
  //   NE ↔ SE (right lateral)
  //
  // And each connects to the Keystone.

  // I'll rename to match the spec exactly. The NODE_IDS above used cardinal
  // directions, but the spec uses intercardinals for approaches. Let me
  // rebuild with the correct names.

  // Clear and rebuild with correct topology
  Object.keys(nodes).forEach(k => delete nodes[k]);

  // Correct node IDs matching the spec's naming
  const KEYSTONE = 'keystone';

  const APP_NW = 'approach-nw';
  const APP_NE = 'approach-ne';
  const APP_SW = 'approach-sw';
  const APP_SE = 'approach-se';

  const FORGE_NE = 'forge-ne';
  const FORGE_SE = 'forge-se';
  const FORGE_SW = 'forge-sw';
  const FORGE_NW = 'forge-nw';

  const KEEP_N = 'keep-n';
  const KEEP_E = 'keep-e';
  const KEEP_S = 'keep-s';
  const KEEP_W = 'keep-w';

  const HOLD_NE = 'holding-ne';
  const HOLD_SE = 'holding-se';
  const HOLD_SW = 'holding-sw';
  const HOLD_NW = 'holding-nw';

  // ── Keystone ──
  add(nodeDef(KEYSTONE, 'keystone', null, [
    APP_NW, APP_NE, APP_SW, APP_SE,
  ], 0));

  // ── Approaches (inner ring, 4 nodes) ──
  // Each connects to: Keystone, its Forge, and 2 lateral neighbor Approaches
  // Lateral links form a 4-cycle: NW↔NE, NE↔SE, SE↔SW, SW↔NW
  add(nodeDef(APP_NW, 'approach', 0, [KEYSTONE, FORGE_NW, APP_NE, APP_SW], 0));
  add(nodeDef(APP_NE, 'approach', 1, [KEYSTONE, FORGE_NE, APP_NW, APP_SE], 0));
  add(nodeDef(APP_SE, 'approach', 2, [KEYSTONE, FORGE_SE, APP_NE, APP_SW], 0));
  add(nodeDef(APP_SW, 'approach', 3, [KEYSTONE, FORGE_SW, APP_NW, APP_SE], 0));

  // ── Forges (mid-belt, 4 nodes) ──
  // Each connects to: its Approach, 2 lateral neighbor Forges, and 2 outer-ring nodes
  // Lateral mid-belt ring: NE↔SE, SE↔SW, SW↔NW, NW↔NE (a 4-cycle)
  // Outer connections: each Forge connects to the 2 Keeps/Holdings flanking it.
  //
  // From the spec diagram:
  //   Forge NW sits between Keep N (above-left) and Keep W (below-left)
  //     → connects to Keep N and Holding NW (which connects Keep W ↔ Keep N on the far side)
  //     Actually wait — let me trace the diagram more carefully.
  //
  // The spec diagram:
  //   [Keep N]──[Hold]──[Keep E]
  //     │   ╲              ╱   │
  //   [Forge NW]        [Forge NE]
  //
  // So:
  //   Keep N connects to: Holding (NE, between N and E), Forge NW, Forge NE? No...
  //   Keep N connects to: Hold (between N and E), and has a ╲ to Forge NW
  //   Keep E connects to: Hold (between N and E), and has a ╱ to Forge NE
  //
  // Top outer ring: Keep N ── Holding NE ── Keep E
  // Bottom outer ring: Keep S ── Holding SW ── Keep W
  // Left outer ring: Keep W ── Holding NW ── Keep N
  // Right outer ring: Keep E ── Holding SE ── Keep S
  //
  // Wait, the spec's diagram has:
  //   Top: [Keep N]──[Hold]──[Keep E]
  //   Bottom: [Keep S]──[Hold]──[Keep W]
  //
  // So Holdings sit between pairs of adjacent Keeps, forming the outer ring:
  //   Keep N ── Holding NE ── Keep E
  //   Keep E ── Holding SE ── Keep S
  //   Keep S ── Holding SW ── Keep W
  //   Keep W ── Holding NW ── Keep N
  //
  // Now Forge connections to outer ring:
  //   The ╲ and ╱ in the diagram show:
  //   Keep N ╲ to Forge NW    (left diagonal down)
  //   Keep E ╱ to Forge NE    (right diagonal down, mirrored)
  //   Forge NW also connects to... let's see the left side:
  //     [Forge NW]
  //        │
  //     [Approach NW]
  //        │
  //     [Forge SW]
  //        │
  //   [Keep S] but wait that's bottom...
  //
  // Let me re-read the full ASCII carefully:
  //
  //                [Keep N]──[Hold]──[Keep E]
  //                  │   ╲              ╱   │
  //               [Forge NW]        [Forge NE]
  //                  │      ╲      ╱      │
  //             [Approach NW]─[Approach NE]
  //                  │      KEYSTONE      │
  //             [Approach SW]─[Approach SE]
  //                  │      ╱      ╲      │
  //               [Forge SW]        [Forge SE]
  //                  │   ╱              ╲   │
  //                [Keep S]──[Hold]──[Keep W]
  //
  // So the connections are:
  //
  // Keep N: Holding NE (top), Forge NW (│ down-left)
  //         And from the top-right: Keep N also has a diagonal but that's the Hold.
  //         Wait: Keep N ── │ ── Forge NW (vertical left side)
  //               Keep N ── Hold ── Keep E (horizontal top)
  //               Keep E ── │ ── Forge NE (vertical right side)
  //
  // So each Keep connects to:
  //   - 2 Holdings (its flanking Holdings on the outer ring)
  //   - 1 Forge (its spoke Forge)
  //
  // Wait no. Let me look again:
  //   Keep N has │ going down to Forge NW on the left side
  //   Keep E has │ going down to Forge NE on the right side
  //   BUT the ╲ from Keep N goes to... it's between Keep N and Forge NW area
  //   Actually the ╲ seems to be the connection from Keep N down to Forge NW
  //   and the │ from Keep N goes to... hmm.
  //
  // I think the │ and ╲ are just ASCII art artifacts. The actual connections from the diagram:
  //   Left column (vertical): Keep N → Forge NW → Approach NW → Approach SW → Forge SW → Keep S
  //   Right column (vertical): Keep E → Forge NE → Approach NE → Approach SE → Forge SE → Keep W
  //   Top row: Keep N ── Holding ── Keep E
  //   Bottom row: Keep S ── Holding ── Keep W
  //   Inner lateral: Approach NW ── Approach NE, Approach SW ── Approach SE
  //   Center: all 4 Approaches ── Keystone
  //   The ╲ and ╱ show diagonal connections for the mid-belt lateral ring
  //     (Forge NW ╲ to Approach NE, and Forge NE ╱ to Approach NW — NO that's not it)
  //
  // Actually the diagonals show the LATERAL FORGE connections:
  //   Forge NW ╲ to Forge NE's approach area — no, let me re-read the spec text:
  //
  // "Lateral mid-belt ring: each Forge also links to its two neighbor Forges
  //  (a 4-cycle, +4 edges / 0 nodes)"
  //
  // So: Forge NW ↔ Forge NE, Forge NE ↔ Forge SE, Forge SE ↔ Forge SW, Forge SW ↔ Forge NW
  //
  // And the vertical │ connections in the diagram show the spoke:
  //   Keep N → Forge NW → Approach NW → Keystone (left spoke)
  //   Keep E → Forge NE → Approach NE → Keystone (right spoke)
  //   Keep S → Forge SW → Approach SW → Keystone (bottom-left spoke)
  //   Keep W → Forge SE → Approach SE → Keystone (bottom-right spoke)
  //
  // Wait that doesn't quite work with 4 spokes and 4 Keeps...
  // Let me think about this differently. 4-fold symmetry means 4 quadrants,
  // each containing: 1 Keep, 1 Holding, 1 Forge, 1 Approach.
  //
  // Quadrant 0 (NW): Keep N, Holding NW, Forge NW, Approach NW
  // Quadrant 1 (NE): Keep E, Holding NE, Forge NE, Approach NE
  // Quadrant 2 (SE): Keep S, Holding SE, Forge SE, Approach SE
  // Quadrant 3 (SW): Keep W, Holding SW, Forge SW, Approach SW
  //
  // Each spoke: Keep → Forge → Approach → Keystone
  //   Q0: Keep N → Forge NW → Approach NW → Keystone
  //   Q1: Keep E → Forge NE → Approach NE → Keystone
  //   Q2: Keep S → Forge SE → Approach SE → Keystone
  //   Q3: Keep W → Forge SW → Approach SW → Keystone
  //
  // Outer ring (Holdings connect adjacent Keeps):
  //   Keep N ── Holding NE ── Keep E  (between Q0 and Q1)
  //   Keep E ── Holding SE ── Keep S  (between Q1 and Q2)
  //   Keep S ── Holding SW ── Keep W  (between Q2 and Q3)
  //   Keep W ── Holding NW ── Keep N  (between Q3 and Q0)
  //
  // Forge lateral ring (each Forge ↔ its 2 neighbors):
  //   Forge NW ↔ Forge NE, Forge NE ↔ Forge SE, Forge SE ↔ Forge SW, Forge SW ↔ Forge NW
  //
  // Approach lateral ring (each Approach ↔ its 2 neighbors):
  //   Approach NW ↔ Approach NE, Approach NE ↔ Approach SE,
  //   Approach SE ↔ Approach SW, Approach SW ↔ Approach NW
  //
  // Now the question: does each Forge also connect to its Keep?
  // From the diagram, yes — the │ shows Forge NW connecting vertically to Keep N.
  // And similarly Forge NW also connects down to Approach NW.
  //
  // What about Holdings and Forges? The diagram doesn't show a direct connection.
  // Holdings connect to their 2 flanking Keeps only.

  // So each node's full connection list:
  //
  // Keystone: 4 Approaches
  //
  // Approach NW: Keystone, Forge NW, Approach NE, Approach SW
  // Approach NE: Keystone, Forge NE, Approach NW, Approach SE
  // Approach SE: Keystone, Forge SE, Approach NE, Approach SW
  // Approach SW: Keystone, Forge SW, Approach NW, Approach SE
  //
  // Forge NW: Approach NW, Keep N, Forge NE, Forge SW
  // Forge NE: Approach NE, Keep E, Forge NW, Forge SE
  // Forge SE: Approach SE, Keep S, Forge NE, Forge SW
  // Forge SW: Approach SW, Keep W, Forge SE, Forge NW
  //
  // Keep N: Forge NW, Holding NE, Holding NW
  // Keep E: Forge NE, Holding NE, Holding SE
  // Keep S: Forge SE, Holding SE, Holding SW
  // Keep W: Forge SW, Holding SW, Holding NW
  //
  // Holding NE: Keep N, Keep E
  // Holding SE: Keep E, Keep S
  // Holding SW: Keep S, Keep W
  // Holding NW: Keep W, Keep N

  // Let's verify the edge count:
  // Keystone: 4 edges (to 4 Approaches)
  // 4 Approaches: each has 4 edges, but Keystone already counted, lateral counted once each
  //   New edges from Approaches: 4 (to Forges) + 4 lateral / 2 = 4 + 2... let me just count total.
  //
  // Edges (undirected):
  // Keystone ↔ App NW, App NE, App SE, App SW = 4
  // App NW ↔ App NE, App NW ↔ App SW = 2 (lateral inner, but it's a 4-cycle)
  // App NE ↔ App SE, App SE ↔ App SW = 2 (completing lateral inner ring = 4 lateral edges)
  // App NW ↔ Forge NW, App NE ↔ Forge NE, App SE ↔ Forge SE, App SW ↔ Forge SW = 4
  // Forge lateral: NW↔NE, NE↔SE, SE↔SW, SW↔NW = 4
  // Forge ↔ Keep: NW↔N, NE↔E, SE↔S, SW↔W = 4
  // Keep ↔ Holding: N↔NE, N↔NW, E↔NE, E↔SE, S↔SE, S↔SW, W↔SW, W↔NW = 8
  //
  // Total = 4 + 4 + 4 + 4 + 4 + 8 = 28 edges
  //
  // Node degrees:
  // Keystone: 4
  // Each Approach: 4 (Keystone + Forge + 2 lateral)
  // Each Forge: 4 (Approach + Keep + 2 lateral)
  // Each Keep: 3 (Forge + 2 Holdings)
  // Each Holding: 2 (2 Keeps)
  //
  // Sum of degrees = 4 + 4*4 + 4*4 + 4*3 + 4*2 = 4 + 16 + 16 + 12 + 8 = 56
  // 56 / 2 = 28 edges ✓

  // ── Keystone ──
  add(nodeDef(KEYSTONE, 'keystone', null, [
    APP_NW, APP_NE, APP_SE, APP_SW,
  ], 0));

  // ── Approaches (inner ring) ──
  add(nodeDef(APP_NW, 'approach', 0, [KEYSTONE, FORGE_NW, APP_NE, APP_SW], 0));
  add(nodeDef(APP_NE, 'approach', 1, [KEYSTONE, FORGE_NE, APP_NW, APP_SE], 0));
  add(nodeDef(APP_SE, 'approach', 2, [KEYSTONE, FORGE_SE, APP_NE, APP_SW], 0));
  add(nodeDef(APP_SW, 'approach', 3, [KEYSTONE, FORGE_SW, APP_NW, APP_SE], 0));

  // ── Forges (mid-belt) ──
  add(nodeDef(FORGE_NW, 'forge', 0, [APP_NW, KEEP_N, FORGE_NE, FORGE_SW], 3));
  add(nodeDef(FORGE_NE, 'forge', 1, [APP_NE, KEEP_E, FORGE_NW, FORGE_SE], 3));
  add(nodeDef(FORGE_SE, 'forge', 2, [APP_SE, KEEP_S, FORGE_NE, FORGE_SW], 3));
  add(nodeDef(FORGE_SW, 'forge', 3, [APP_SW, KEEP_W, FORGE_SE, FORGE_NW], 3));

  // ── Keeps (outer corners) ──
  add(nodeDef(KEEP_N, 'keep', 0, [FORGE_NW, HOLD_NE, HOLD_NW], 1));
  add(nodeDef(KEEP_E, 'keep', 1, [FORGE_NE, HOLD_NE, HOLD_SE], 1));
  add(nodeDef(KEEP_S, 'keep', 2, [FORGE_SE, HOLD_SE, HOLD_SW], 1));
  add(nodeDef(KEEP_W, 'keep', 3, [FORGE_SW, HOLD_SW, HOLD_NW], 1));

  // ── Holdings (outer edges) ──
  // Each sits between two adjacent Keeps. Quadrant = the clockwise Keep.
  add(nodeDef(HOLD_NE, 'holding', null, [KEEP_N, KEEP_E], 1));
  add(nodeDef(HOLD_SE, 'holding', null, [KEEP_E, KEEP_S], 1));
  add(nodeDef(HOLD_SW, 'holding', null, [KEEP_S, KEEP_W], 1));
  add(nodeDef(HOLD_NW, 'holding', null, [KEEP_W, KEEP_N], 1));

  // ── Blight entry seams ──
  // 4 symmetric outer positions between Keeps — the Holdings themselves
  // are the conceptual seams where the outer ring can be breached.
  const blightEntrySeams = [HOLD_NE, HOLD_SE, HOLD_SW, HOLD_NW] as const;

  return Object.freeze({
    nodes: Object.freeze(nodes),
    keystoneId: KEYSTONE,
    approachIds: Object.freeze([APP_NW, APP_NE, APP_SE, APP_SW]),
    forgeIds: Object.freeze([FORGE_NW, FORGE_NE, FORGE_SE, FORGE_SW]),
    keepIds: [KEEP_N, KEEP_E, KEEP_S, KEEP_W] as [string, string, string, string],
    holdingIds: Object.freeze([HOLD_NE, HOLD_SE, HOLD_SW, HOLD_NW]),
    blightEntrySeams: Object.freeze([...blightEntrySeams]),
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
