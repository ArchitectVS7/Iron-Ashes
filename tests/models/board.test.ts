import { describe, it, expect } from 'vitest';
import {
  BOARD_FORGE_NODES,
  BOARD_STANDARD_NODES,
  BOARD_TOTAL_NODES,
  KNOWN_LANDS,
  WANDERER_TOKEN_COUNT,
  BoardDefinition,
  createInitialBoardState,
  getForgeNodes,
  getNodesByType,
  getStandardNodes,
  selectWandererNodes,
  validateBoard,
} from '../../src/models/board.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import { getDistance } from '../../src/utils/pathfinding.js';

/** Minimal test board for unit tests (not the full 28-node Known Lands). */
function createTestBoard(): BoardDefinition {
  return {
    nodes: {
      'keep-0': { id: 'keep-0', type: 'standard', connections: ['s1', 's2'], startingCourt: 0 },
      'keep-1': { id: 'keep-1', type: 'standard', connections: ['s2', 's3'], startingCourt: 1 },
      'keep-2': { id: 'keep-2', type: 'standard', connections: ['s3', 's4'], startingCourt: 2 },
      'keep-3': { id: 'keep-3', type: 'standard', connections: ['s4', 's1'], startingCourt: 3 },
      s1: { id: 's1', type: 'standard', connections: ['keep-0', 'keep-3', 'forge-1'], startingCourt: null },
      s2: { id: 's2', type: 'standard', connections: ['keep-0', 'keep-1', 'forge-2'], startingCourt: null },
      s3: { id: 's3', type: 'standard', connections: ['keep-1', 'keep-2', 'dark'], startingCourt: null },
      s4: { id: 's4', type: 'standard', connections: ['keep-2', 'keep-3', 'dark'], startingCourt: null },
      'forge-1': { id: 'forge-1', type: 'forge', connections: ['s1', 'neutral'], startingCourt: null },
      'forge-2': { id: 'forge-2', type: 'forge', connections: ['s2', 'neutral'], startingCourt: null },
      dark: { id: 'dark', type: 'antagonist_base', connections: ['s3', 's4'], startingCourt: null },
      neutral: { id: 'neutral', type: 'neutral_center', connections: ['forge-1', 'forge-2'], startingCourt: null },
    },
    startingKeeps: ['keep-0', 'keep-1', 'keep-2', 'keep-3'],
    antagonistBase: 'dark',
    neutralCenter: 'neutral',
  };
}

describe('Board Model', () => {
  describe('createInitialBoardState()', () => {
    it('should create state for all nodes in the definition', () => {
      const board = createTestBoard();
      const state = createInitialBoardState(board, []);
      expect(Object.keys(state).length).toBe(Object.keys(board.nodes).length);
    });

    it('should pre-claim starting keeps for each court', () => {
      const board = createTestBoard();
      const state = createInitialBoardState(board, []);
      expect(state['keep-0'].claimedBy).toBe(0);
      expect(state['keep-1'].claimedBy).toBe(1);
      expect(state['keep-2'].claimedBy).toBe(2);
      expect(state['keep-3'].claimedBy).toBe(3);
    });

    it('should leave non-starting nodes unclaimed', () => {
      const board = createTestBoard();
      const state = createInitialBoardState(board, []);
      expect(state['s1'].claimedBy).toBeNull();
      expect(state['forge-1'].claimedBy).toBeNull();
      expect(state['dark'].claimedBy).toBeNull();
      expect(state['neutral'].claimedBy).toBeNull();
    });

    it('should place wanderer tokens on specified nodes', () => {
      const board = createTestBoard();
      const state = createInitialBoardState(board, ['s1', 's2', 's3']);
      expect(state['s1'].hasWanderer).toBe(true);
      expect(state['s2'].hasWanderer).toBe(true);
      expect(state['s3'].hasWanderer).toBe(true);
      expect(state['s4'].hasWanderer).toBe(false);
    });

    it('should initialize antagonist forces as empty for all nodes', () => {
      const board = createTestBoard();
      const state = createInitialBoardState(board, []);
      for (const nodeId of Object.keys(state)) {
        expect(state[nodeId].antagonistForces).toEqual([]);
      }
    });
  });
});

describe('Known Lands Board Definition', () => {
  describe('Node counts', () => {
    it('should have exactly 28 nodes total', () => {
      expect(Object.keys(KNOWN_LANDS.nodes).length).toBe(BOARD_TOTAL_NODES);
    });

    it('should have exactly 22 standard stronghold nodes', () => {
      const standardNodes = getStandardNodes(KNOWN_LANDS);
      expect(standardNodes.length).toBe(BOARD_STANDARD_NODES);
    });

    it('should have exactly 4 forge keep nodes', () => {
      const forgeNodes = getForgeNodes(KNOWN_LANDS);
      expect(forgeNodes.length).toBe(BOARD_FORGE_NODES);
    });

    it('should have exactly 1 antagonist base node', () => {
      const bases = getNodesByType(KNOWN_LANDS, 'antagonist_base');
      expect(bases.length).toBe(1);
      expect(bases[0]).toBe('dark-fortress');
    });

    it('should have exactly 1 neutral center node', () => {
      const centers = getNodesByType(KNOWN_LANDS, 'neutral_center');
      expect(centers.length).toBe(1);
      expect(centers[0]).toBe('hall');
    });
  });

  describe('Starting keeps', () => {
    it('should have 4 starting keeps', () => {
      expect(KNOWN_LANDS.startingKeeps.length).toBe(4);
    });

    it('should assign each starting keep to a different court (0-3)', () => {
      for (let court = 0; court < 4; court++) {
        const keepId = KNOWN_LANDS.startingKeeps[court];
        const node = KNOWN_LANDS.nodes[keepId];
        expect(node.startingCourt).toBe(court);
      }
    });

    it('should make all starting keeps standard strongholds', () => {
      for (const keepId of KNOWN_LANDS.startingKeeps) {
        expect(KNOWN_LANDS.nodes[keepId].type).toBe('standard');
      }
    });

    it('should have exactly 4 nodes with startingCourt set', () => {
      const startingNodes = Object.values(KNOWN_LANDS.nodes)
        .filter(n => n.startingCourt !== null);
      expect(startingNodes.length).toBe(4);
    });
  });

  describe('Connection integrity', () => {
    it('should have all connections be bidirectional', () => {
      for (const node of Object.values(KNOWN_LANDS.nodes)) {
        for (const connId of node.connections) {
          const target = KNOWN_LANDS.nodes[connId];
          expect(target).toBeDefined();
          expect(target.connections).toContain(node.id);
        }
      }
    });

    it('should have no self-connections', () => {
      for (const node of Object.values(KNOWN_LANDS.nodes)) {
        expect(node.connections).not.toContain(node.id);
      }
    });

    it('should have no duplicate connections', () => {
      for (const node of Object.values(KNOWN_LANDS.nodes)) {
        const unique = new Set(node.connections);
        expect(unique.size).toBe(node.connections.length);
      }
    });

    it('should only reference existing nodes in connections', () => {
      for (const node of Object.values(KNOWN_LANDS.nodes)) {
        for (const connId of node.connections) {
          expect(KNOWN_LANDS.nodes[connId]).toBeDefined();
        }
      }
    });
  });

  describe('Board constraints (F-001)', () => {
    it('should have Dark Fortress not adjacent to any starting keep', () => {
      const df = KNOWN_LANDS.nodes[KNOWN_LANDS.antagonistBase];
      for (const keepId of KNOWN_LANDS.startingKeeps) {
        expect(df.connections).not.toContain(keepId);
      }
    });

    it('should have equal path distance (±1) from each starting keep to nearest forge', () => {
      const forgeIds = getForgeNodes(KNOWN_LANDS);
      const distances: number[] = [];

      for (const keepId of KNOWN_LANDS.startingKeeps) {
        let minDist = Infinity;
        for (const forgeId of forgeIds) {
          const dist = getDistance(KNOWN_LANDS, keepId, forgeId);
          expect(dist).toBeGreaterThan(0);
          if (dist < minDist) minDist = dist;
        }
        distances.push(minDist);
      }

      const minDistance = Math.min(...distances);
      const maxDistance = Math.max(...distances);
      expect(maxDistance - minDistance).toBeLessThanOrEqual(1);
    });

    it('should have each starting keep at distance 2 from nearest forge', () => {
      const forgeIds = getForgeNodes(KNOWN_LANDS);

      for (const keepId of KNOWN_LANDS.startingKeeps) {
        let minDist = Infinity;
        for (const forgeId of forgeIds) {
          const dist = getDistance(KNOWN_LANDS, keepId, forgeId);
          if (dist < minDist) minDist = dist;
        }
        expect(minDist).toBe(2);
      }
    });

    it('should be a fully connected graph', () => {
      const allIds = Object.keys(KNOWN_LANDS.nodes);
      const visited = new Set<string>();
      const queue = [allIds[0]];
      visited.add(allIds[0]);

      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const conn of KNOWN_LANDS.nodes[current].connections) {
          if (!visited.has(conn)) {
            visited.add(conn);
            queue.push(conn);
          }
        }
      }

      expect(visited.size).toBe(allIds.length);
    });

    it('should have each court with exactly 2 nearest forge keeps', () => {
      const forgeIds = getForgeNodes(KNOWN_LANDS);

      for (const keepId of KNOWN_LANDS.startingKeeps) {
        const distances = forgeIds.map(fid => getDistance(KNOWN_LANDS, keepId, fid));
        const minDist = Math.min(...distances);
        const nearestCount = distances.filter(d => d === minDist).length;
        expect(nearestCount).toBe(2);
      }
    });
  });

  describe('Board symmetry', () => {
    it('should give each starting keep the same number of connections', () => {
      const connectionCounts = KNOWN_LANDS.startingKeeps.map(
        keepId => KNOWN_LANDS.nodes[keepId].connections.length
      );
      expect(new Set(connectionCounts).size).toBe(1);
    });

    it('should have equal distance from each keep to the dark fortress', () => {
      const distances = KNOWN_LANDS.startingKeeps.map(
        keepId => getDistance(KNOWN_LANDS, keepId, KNOWN_LANDS.antagonistBase)
      );
      expect(new Set(distances).size).toBe(1);
    });

    it('should have equal distance from each keep to the hall of neutrality', () => {
      const distances = KNOWN_LANDS.startingKeeps.map(
        keepId => getDistance(KNOWN_LANDS, keepId, KNOWN_LANDS.neutralCenter)
      );
      expect(new Set(distances).size).toBe(1);
    });
  });
});

describe('Board Validation', () => {
  it('should validate the Known Lands board successfully', () => {
    const result = validateBoard(KNOWN_LANDS);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should detect incorrect node count', () => {
    const bad: BoardDefinition = {
      nodes: {
        a: { id: 'a', type: 'standard', connections: [], startingCourt: 0 },
      },
      startingKeeps: ['a', 'a', 'a', 'a'],
      antagonistBase: 'a',
      neutralCenter: 'a',
    };
    const result = validateBoard(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Expected 28 nodes'))).toBe(true);
  });
});

describe('Node Query Functions', () => {
  it('getStandardNodes returns all standard stronghold IDs', () => {
    const nodes = getStandardNodes(KNOWN_LANDS);
    expect(nodes.length).toBe(22);
    for (const id of nodes) {
      expect(KNOWN_LANDS.nodes[id].type).toBe('standard');
    }
  });

  it('getForgeNodes returns all forge keep IDs', () => {
    const nodes = getForgeNodes(KNOWN_LANDS);
    expect(nodes.length).toBe(4);
    for (const id of nodes) {
      expect(KNOWN_LANDS.nodes[id].type).toBe('forge');
    }
  });

  it('getNodesByType returns correct nodes for each type', () => {
    expect(getNodesByType(KNOWN_LANDS, 'standard').length).toBe(22);
    expect(getNodesByType(KNOWN_LANDS, 'forge').length).toBe(4);
    expect(getNodesByType(KNOWN_LANDS, 'antagonist_base').length).toBe(1);
    expect(getNodesByType(KNOWN_LANDS, 'neutral_center').length).toBe(1);
  });
});

describe('Wanderer Placement', () => {
  it('should select exactly WANDERER_TOKEN_COUNT nodes', () => {
    const rng = new SeededRandom(42);
    const nodes = selectWandererNodes(KNOWN_LANDS, rng);
    expect(nodes.length).toBe(WANDERER_TOKEN_COUNT);
  });

  it('should only select standard stronghold nodes', () => {
    const rng = new SeededRandom(42);
    const nodes = selectWandererNodes(KNOWN_LANDS, rng);
    const standardIds = new Set(getStandardNodes(KNOWN_LANDS));
    for (const id of nodes) {
      expect(standardIds.has(id)).toBe(true);
    }
  });

  it('should not place wanderers on forge, antagonist, or neutral nodes', () => {
    const rng = new SeededRandom(42);
    const nodes = selectWandererNodes(KNOWN_LANDS, rng);
    const nonStandardIds = new Set([
      ...getForgeNodes(KNOWN_LANDS),
      KNOWN_LANDS.antagonistBase,
      KNOWN_LANDS.neutralCenter,
    ]);
    for (const id of nodes) {
      expect(nonStandardIds.has(id)).toBe(false);
    }
  });

  it('should produce unique node selections (no duplicates)', () => {
    const rng = new SeededRandom(42);
    const nodes = selectWandererNodes(KNOWN_LANDS, rng);
    expect(new Set(nodes).size).toBe(nodes.length);
  });

  it('should be deterministic from the same seed', () => {
    const rng1 = new SeededRandom(123);
    const rng2 = new SeededRandom(123);
    const nodes1 = selectWandererNodes(KNOWN_LANDS, rng1);
    const nodes2 = selectWandererNodes(KNOWN_LANDS, rng2);
    expect(nodes1).toEqual(nodes2);
  });

  it('should produce different selections with different seeds', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(99);
    const nodes1 = selectWandererNodes(KNOWN_LANDS, rng1);
    const nodes2 = selectWandererNodes(KNOWN_LANDS, rng2);
    expect(nodes1).not.toEqual(nodes2);
  });

  it('should leave exactly 2 standard nodes without wanderers', () => {
    const rng = new SeededRandom(42);
    const selected = new Set(selectWandererNodes(KNOWN_LANDS, rng));
    const allStandard = getStandardNodes(KNOWN_LANDS);
    const unselected = allStandard.filter(id => !selected.has(id));
    expect(unselected.length).toBe(BOARD_STANDARD_NODES - WANDERER_TOKEN_COUNT);
  });

  it('should integrate with createInitialBoardState', () => {
    const rng = new SeededRandom(42);
    const wandererNodes = selectWandererNodes(KNOWN_LANDS, rng);
    const state = createInitialBoardState(KNOWN_LANDS, wandererNodes);

    let wandererCount = 0;
    for (const nodeId of Object.keys(state)) {
      if (state[nodeId].hasWanderer) wandererCount++;
    }
    expect(wandererCount).toBe(WANDERER_TOKEN_COUNT);
  });
});

describe('Known Lands Board Initialization', () => {
  it('should pre-claim all 4 starting keeps', () => {
    const rng = new SeededRandom(42);
    const wandererNodes = selectWandererNodes(KNOWN_LANDS, rng);
    const state = createInitialBoardState(KNOWN_LANDS, wandererNodes);

    for (let court = 0; court < 4; court++) {
      const keepId = KNOWN_LANDS.startingKeeps[court];
      expect(state[keepId].claimedBy).toBe(court);
    }
  });

  it('should leave non-keep nodes unclaimed', () => {
    const state = createInitialBoardState(KNOWN_LANDS, []);
    const keepSet = new Set(KNOWN_LANDS.startingKeeps);

    for (const nodeId of Object.keys(state)) {
      if (!keepSet.has(nodeId)) {
        expect(state[nodeId].claimedBy).toBeNull();
      }
    }
  });

  it('should have no antagonist forces at game start', () => {
    const state = createInitialBoardState(KNOWN_LANDS, []);
    for (const nodeId of Object.keys(state)) {
      expect(state[nodeId].antagonistForces).toEqual([]);
    }
  });

  it('should create state for all 28 nodes', () => {
    const state = createInitialBoardState(KNOWN_LANDS, []);
    expect(Object.keys(state).length).toBe(BOARD_TOTAL_NODES);
  });
});
