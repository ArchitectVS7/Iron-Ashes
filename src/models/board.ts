/**
 * Board Data Model — The Known Lands
 *
 * A point-to-point graph of 28 Stronghold nodes with typed connections.
 * The board is fixed per game session (no procedural generation).
 *
 * Layout (conceptual — four-fold symmetric):
 *
 *                       keep-0 (Court 0, NW)
 *                      /       \
 *                   s01         s02
 *                  /    \     /    \
 *            forge-nw   s16  s13   forge-ne
 *              /    \         /    \
 *            s08    s12    s09    s03
 *            |       \   /  |      |
 *          keep-3   s18-DF-s17   keep-1
 *            |       /   \  |      |
 *            s07    s11    s10    s04
 *              \    /         \    /
 *            forge-sw   s15  s14   forge-se
 *                  \    /     \    /
 *                   s06         s05
 *                      \       /
 *                       keep-2 (Court 2, SE)
 *
 *   hall connects to s17 and s18 (center bypass)
 *   DF = dark-fortress (connects to s09, s10, s11, s12)
 */

import { SeededRandom } from '../utils/seeded-random.js';

/** The types of nodes on the board. */
export type NodeType =
  | 'standard'        // Standard Stronghold — claimable, +1 resource/turn
  | 'forge'           // Forge Keep — claimable, +3 resource/turn
  | 'antagonist_base' // Dark Fortress — not claimable, antagonist home
  | 'neutral_center'; // Hall of Neutrality — artifact starting position

/** A single node on the board graph. */
export interface BoardNode {
  /** Unique identifier for this node. */
  readonly id: string;
  /** Node type determines behavior and production. */
  readonly type: NodeType;
  /** IDs of directly connected nodes (adjacency list). */
  readonly connections: readonly string[];
  /** Which court starting position this belongs to (0-3), or null. */
  readonly startingCourt: number | null;
}

/** Complete board definition — a fixed graph for one game session. */
export interface BoardDefinition {
  /** All nodes keyed by ID. */
  readonly nodes: Readonly<Record<string, BoardNode>>;
  /** The 4 starting keep node IDs, indexed by court (0-3). */
  readonly startingKeeps: readonly [string, string, string, string];
  /** The antagonist base node ID. */
  readonly antagonistBase: string;
  /** The neutral center node ID (artifact starts here). */
  readonly neutralCenter: string;
}

/**
 * Runtime board state — tracks ownership and occupation per node.
 * Separated from BoardDefinition so the definition is immutable.
 */
export interface NodeState {
  /** ID of the court that has claimed this node, or null if unclaimed. */
  claimedBy: number | null;
  /** Whether a face-down wanderer token is on this node. */
  hasWanderer: boolean;
  /** IDs of antagonist forces occupying this node. */
  antagonistForces: string[];
}

export type BoardState = Record<string, NodeState>;

// ─── Board Constants ───────────────────────────────────────────────

export const BOARD_TOTAL_NODES = 28;
export const BOARD_STANDARD_NODES = 22;
export const BOARD_FORGE_NODES = 4;
export const WANDERER_TOKEN_COUNT = 20;

// ─── Helper to define a node ───────────────────────────────────────

function node(
  id: string,
  type: NodeType,
  connections: string[],
  startingCourt: number | null = null,
): BoardNode {
  return { id, type, connections, startingCourt };
}

// ─── The Known Lands — 28-node board definition ───────────────────

/**
 * The canonical Known Lands board for Iron Throne of Ashes.
 *
 * 28 nodes: 22 Standard Strongholds (including 4 starting keeps),
 * 4 Forge Keeps, 1 Dark Fortress, 1 Hall of Neutrality.
 *
 * Constraints satisfied:
 *   - Each starting keep is exactly distance 2 from its 2 nearest Forge Keeps
 *   - Dark Fortress is not adjacent to any starting keep (distance 4)
 *   - Four-fold symmetry ensures balanced starting positions
 */
export const KNOWN_LANDS: BoardDefinition = (() => {
  const nodes: Record<string, BoardNode> = {
    // ── Starting Keeps (standard strongholds, pre-claimed) ──
    'keep-0': node('keep-0', 'standard', ['s01', 's02'], 0),
    'keep-1': node('keep-1', 'standard', ['s03', 's04'], 1),
    'keep-2': node('keep-2', 'standard', ['s05', 's06'], 2),
    'keep-3': node('keep-3', 'standard', ['s07', 's08'], 3),

    // ── Outer Pathway Nodes (connect keeps to forges) ──
    // Court 0 pathways
    's01': node('s01', 'standard', ['keep-0', 'forge-nw', 's16']),
    's02': node('s02', 'standard', ['keep-0', 'forge-ne', 's13']),
    // Court 1 pathways
    's03': node('s03', 'standard', ['keep-1', 'forge-ne', 's13']),
    's04': node('s04', 'standard', ['keep-1', 'forge-se', 's14']),
    // Court 2 pathways
    's05': node('s05', 'standard', ['keep-2', 'forge-se', 's14']),
    's06': node('s06', 'standard', ['keep-2', 'forge-sw', 's15']),
    // Court 3 pathways
    's07': node('s07', 'standard', ['keep-3', 'forge-sw', 's15']),
    's08': node('s08', 'standard', ['keep-3', 'forge-nw', 's16']),

    // ── Cross-Court Bridge Nodes (connect adjacent courts' outer paths) ──
    's13': node('s13', 'standard', ['s02', 's03']),
    's14': node('s14', 'standard', ['s04', 's05']),
    's15': node('s15', 'standard', ['s06', 's07']),
    's16': node('s16', 'standard', ['s08', 's01']),

    // ── Forge Keep Strongholds (high-value production nodes) ──
    'forge-ne': node('forge-ne', 'forge', ['s02', 's03', 's09']),
    'forge-se': node('forge-se', 'forge', ['s04', 's05', 's10']),
    'forge-sw': node('forge-sw', 'forge', ['s06', 's07', 's11']),
    'forge-nw': node('forge-nw', 'forge', ['s01', 's08', 's12']),

    // ── Inner Ring Nodes (connect forges to dark fortress) ──
    's09': node('s09', 'standard', ['forge-ne', 'dark-fortress', 's17']),
    's10': node('s10', 'standard', ['forge-se', 'dark-fortress', 's17']),
    's11': node('s11', 'standard', ['forge-sw', 'dark-fortress', 's18']),
    's12': node('s12', 'standard', ['forge-nw', 'dark-fortress', 's18']),

    // ── Center Bridge Nodes (east/west bypass around dark fortress) ──
    's17': node('s17', 'standard', ['s09', 's10', 'hall']),
    's18': node('s18', 'standard', ['s11', 's12', 'hall']),

    // ── Special Nodes ──
    'dark-fortress': node('dark-fortress', 'antagonist_base', ['s09', 's10', 's11', 's12']),
    'hall':          node('hall', 'neutral_center', ['s17', 's18']),
  };

  return {
    nodes,
    startingKeeps: ['keep-0', 'keep-1', 'keep-2', 'keep-3'],
    antagonistBase: 'dark-fortress',
    neutralCenter: 'hall',
  };
})();

// ─── Board State Initialization ───────────────────────────────────

/**
 * Create the initial board state from a board definition.
 * All nodes start unclaimed except starting keeps.
 */
export function createInitialBoardState(
  definition: BoardDefinition,
  wandererNodeIds: string[],
): BoardState {
  const state: BoardState = {};

  for (const nodeId of Object.keys(definition.nodes)) {
    state[nodeId] = {
      claimedBy: null,
      hasWanderer: false,
      antagonistForces: [],
    };
  }

  // Pre-claim starting keeps
  for (let court = 0; court < 4; court++) {
    const keepId = definition.startingKeeps[court];
    state[keepId].claimedBy = court;
  }

  // Place wanderer tokens
  for (const nodeId of wandererNodeIds) {
    state[nodeId].hasWanderer = true;
  }

  return state;
}

// ─── Board Queries ────────────────────────────────────────────────

/** Get all node IDs of a given type from a board definition. */
export function getNodesByType(
  definition: BoardDefinition,
  type: NodeType,
): string[] {
  return Object.values(definition.nodes)
    .filter(n => n.type === type)
    .map(n => n.id);
}

/** Get all standard stronghold node IDs (includes starting keeps). */
export function getStandardNodes(definition: BoardDefinition): string[] {
  return getNodesByType(definition, 'standard');
}

/** Get all forge keep node IDs. */
export function getForgeNodes(definition: BoardDefinition): string[] {
  return getNodesByType(definition, 'forge');
}

// ─── Wanderer Placement ───────────────────────────────────────────

/**
 * Select nodes for wanderer token placement at game start.
 *
 * Places WANDERER_TOKEN_COUNT (20) tokens on standard stronghold nodes.
 * Randomly selects from all 22 standard strongholds, so 2 will be empty.
 * Uses SeededRandom for deterministic placement.
 */
export function selectWandererNodes(
  definition: BoardDefinition,
  rng: SeededRandom,
): string[] {
  const standardIds = getStandardNodes(definition);
  const shuffled = rng.shuffle([...standardIds]);
  return shuffled.slice(0, WANDERER_TOKEN_COUNT);
}

// ─── Board Validation ─────────────────────────────────────────────

/** Result of board validation. */
export interface BoardValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate a board definition against the Known Lands constraints.
 *
 * Checks:
 *   1. Total node count is 28
 *   2. Node type counts match (22 standard, 4 forge, 1 antagonist_base, 1 neutral_center)
 *   3. All connections are bidirectional (if A→B then B→A)
 *   4. All connection targets exist as nodes
 *   5. Dark Fortress is not adjacent to any starting keep
 *   6. Each starting keep has equal path distance (±1) to nearest forge
 *   7. Graph is fully connected (all nodes reachable)
 */
export function validateBoard(definition: BoardDefinition): BoardValidationResult {
  const errors: string[] = [];
  const allNodes = Object.values(definition.nodes);

  // 1. Total node count
  if (allNodes.length !== BOARD_TOTAL_NODES) {
    errors.push(`Expected ${BOARD_TOTAL_NODES} nodes, found ${allNodes.length}`);
  }

  // 2. Node type counts
  const typeCounts: Record<string, number> = {};
  for (const n of allNodes) {
    typeCounts[n.type] = (typeCounts[n.type] ?? 0) + 1;
  }
  if (typeCounts['standard'] !== BOARD_STANDARD_NODES) {
    errors.push(`Expected ${BOARD_STANDARD_NODES} standard nodes, found ${typeCounts['standard'] ?? 0}`);
  }
  if (typeCounts['forge'] !== BOARD_FORGE_NODES) {
    errors.push(`Expected ${BOARD_FORGE_NODES} forge nodes, found ${typeCounts['forge'] ?? 0}`);
  }
  if (typeCounts['antagonist_base'] !== 1) {
    errors.push(`Expected 1 antagonist_base node, found ${typeCounts['antagonist_base'] ?? 0}`);
  }
  if (typeCounts['neutral_center'] !== 1) {
    errors.push(`Expected 1 neutral_center node, found ${typeCounts['neutral_center'] ?? 0}`);
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

  // 5. Dark Fortress not adjacent to any starting keep
  const dfNode = definition.nodes[definition.antagonistBase];
  if (dfNode) {
    for (const keepId of definition.startingKeeps) {
      if (dfNode.connections.includes(keepId)) {
        errors.push(`Dark Fortress is adjacent to starting keep ${keepId}`);
      }
    }
  }

  // 6. Equal path distance (±1) from each starting keep to nearest forge
  const forgeIds = new Set(getForgeNodes(definition));
  const keepDistances: number[] = [];
  for (const keepId of definition.startingKeeps) {
    const dist = bfsNearestDistance(definition, keepId, forgeIds);
    if (dist === -1) {
      errors.push(`Starting keep ${keepId} has no path to any forge keep`);
    } else {
      keepDistances.push(dist);
    }
  }
  if (keepDistances.length === 4) {
    const minDist = Math.min(...keepDistances);
    const maxDist = Math.max(...keepDistances);
    if (maxDist - minDist > 1) {
      errors.push(
        `Starting keep distances to nearest forge are not within ±1: [${keepDistances.join(', ')}]`
      );
    }
  }

  // 7. Graph connectivity
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
    errors.push(`Graph is not fully connected. Unreachable nodes: ${unreachable.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * BFS to find the shortest distance from a source node to any node in a target set.
 * Returns -1 if no target is reachable.
 */
function bfsNearestDistance(
  definition: BoardDefinition,
  source: string,
  targets: Set<string>,
): number {
  if (targets.has(source)) return 0;

  const visited = new Set<string>([source]);
  const queue: Array<{ nodeId: string; distance: number }> = [{ nodeId: source, distance: 0 }];

  while (queue.length > 0) {
    const { nodeId, distance } = queue.shift()!;
    for (const conn of definition.nodes[nodeId].connections) {
      if (visited.has(conn)) continue;
      visited.add(conn);
      if (targets.has(conn)) return distance + 1;
      queue.push({ nodeId: conn, distance: distance + 1 });
    }
  }

  return -1;
}
