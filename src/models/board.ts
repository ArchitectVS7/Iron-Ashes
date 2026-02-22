/**
 * Board Data Model — The Known Lands
 *
 * A point-to-point graph of Stronghold nodes with typed connections.
 * The board is fixed per game session (no procedural generation).
 */

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
