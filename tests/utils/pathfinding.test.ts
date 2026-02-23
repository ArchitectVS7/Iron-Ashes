import { describe, it, expect } from 'vitest';
import {
  findShortestPath,
  getDistance,
  getAllDistances,
  findNearest,
  getNodesWithinDistance,
} from '../../src/utils/pathfinding.js';
import {
  KNOWN_LANDS,
  BoardDefinition,
  getForgeNodes,
} from '../../src/models/board.js';

/** Minimal test board for isolated pathfinding tests. */
function createLinearBoard(): BoardDefinition {
  // A → B → C → D (linear chain)
  return {
    nodes: {
      a: { id: 'a', type: 'standard', connections: ['b'], startingCourt: 0 },
      b: { id: 'b', type: 'standard', connections: ['a', 'c'], startingCourt: null },
      c: { id: 'c', type: 'forge', connections: ['b', 'd'], startingCourt: null },
      d: { id: 'd', type: 'standard', connections: ['c'], startingCourt: 1 },
    },
    startingKeeps: ['a', 'd', 'a', 'd'],
    antagonistBase: 'a',
    neutralCenter: 'd',
  };
}

/** Diamond-shaped board for branching path tests. */
function createDiamondBoard(): BoardDefinition {
  //     A
  //    / \
  //   B   C
  //    \ /
  //     D
  return {
    nodes: {
      a: { id: 'a', type: 'standard', connections: ['b', 'c'], startingCourt: 0 },
      b: { id: 'b', type: 'standard', connections: ['a', 'd'], startingCourt: null },
      c: { id: 'c', type: 'standard', connections: ['a', 'd'], startingCourt: null },
      d: { id: 'd', type: 'standard', connections: ['b', 'c'], startingCourt: 1 },
    },
    startingKeeps: ['a', 'd', 'a', 'd'],
    antagonistBase: 'a',
    neutralCenter: 'd',
  };
}

describe('findShortestPath()', () => {
  it('should return single-element path for same source and target', () => {
    const board = createLinearBoard();
    const path = findShortestPath(board, 'a', 'a');
    expect(path).toEqual(['a']);
  });

  it('should find direct neighbor path', () => {
    const board = createLinearBoard();
    const path = findShortestPath(board, 'a', 'b');
    expect(path).toEqual(['a', 'b']);
  });

  it('should find multi-hop path', () => {
    const board = createLinearBoard();
    const path = findShortestPath(board, 'a', 'd');
    expect(path).toEqual(['a', 'b', 'c', 'd']);
  });

  it('should find shortest path in diamond graph', () => {
    const board = createDiamondBoard();
    const path = findShortestPath(board, 'a', 'd');
    expect(path).not.toBeNull();
    expect(path!.length).toBe(3); // a → b → d or a → c → d
    expect(path![0]).toBe('a');
    expect(path![path!.length - 1]).toBe('d');
  });

  it('should return null for non-existent source', () => {
    const board = createLinearBoard();
    const path = findShortestPath(board, 'x', 'a');
    expect(path).toBeNull();
  });

  it('should return null for non-existent target', () => {
    const board = createLinearBoard();
    const path = findShortestPath(board, 'a', 'x');
    expect(path).toBeNull();
  });

  it('should work on the Known Lands board', () => {
    const path = findShortestPath(KNOWN_LANDS, 'keep-0', 'dark-fortress');
    expect(path).not.toBeNull();
    expect(path![0]).toBe('keep-0');
    expect(path![path!.length - 1]).toBe('dark-fortress');
  });
});

describe('getDistance()', () => {
  it('should return 0 for same node', () => {
    const board = createLinearBoard();
    expect(getDistance(board, 'a', 'a')).toBe(0);
  });

  it('should return 1 for adjacent nodes', () => {
    const board = createLinearBoard();
    expect(getDistance(board, 'a', 'b')).toBe(1);
  });

  it('should return correct distance for multi-hop paths', () => {
    const board = createLinearBoard();
    expect(getDistance(board, 'a', 'c')).toBe(2);
    expect(getDistance(board, 'a', 'd')).toBe(3);
  });

  it('should return -1 for unreachable nodes', () => {
    const board = createLinearBoard();
    expect(getDistance(board, 'a', 'nonexistent')).toBe(-1);
  });

  it('should be symmetric (distance A→B equals B→A)', () => {
    const board = createLinearBoard();
    expect(getDistance(board, 'a', 'd')).toBe(getDistance(board, 'd', 'a'));
  });

  describe('Known Lands distances', () => {
    it('should have each keep at distance 2 from nearest forge', () => {
      const forgeIds = getForgeNodes(KNOWN_LANDS);
      for (const keepId of KNOWN_LANDS.startingKeeps) {
        const distances = forgeIds.map(f => getDistance(KNOWN_LANDS, keepId, f));
        expect(Math.min(...distances)).toBe(2);
      }
    });

    it('should have each keep at distance 4 from dark fortress', () => {
      for (const keepId of KNOWN_LANDS.startingKeeps) {
        expect(getDistance(KNOWN_LANDS, keepId, 'dark-fortress')).toBe(4);
      }
    });

    it('should have each keep at distance 5 from hall of neutrality', () => {
      for (const keepId of KNOWN_LANDS.startingKeeps) {
        expect(getDistance(KNOWN_LANDS, keepId, 'hall')).toBe(5);
      }
    });

    it('should have adjacent keeps at distance 4', () => {
      // Court 0 (NW) to Court 1 (NE) — adjacent courts
      expect(getDistance(KNOWN_LANDS, 'keep-0', 'keep-1')).toBe(4);
      expect(getDistance(KNOWN_LANDS, 'keep-1', 'keep-2')).toBe(4);
      expect(getDistance(KNOWN_LANDS, 'keep-2', 'keep-3')).toBe(4);
      expect(getDistance(KNOWN_LANDS, 'keep-3', 'keep-0')).toBe(4);
    });
  });
});

describe('getAllDistances()', () => {
  it('should return distances to all reachable nodes', () => {
    const board = createLinearBoard();
    const distances = getAllDistances(board, 'a');
    expect(distances.get('a')).toBe(0);
    expect(distances.get('b')).toBe(1);
    expect(distances.get('c')).toBe(2);
    expect(distances.get('d')).toBe(3);
    expect(distances.size).toBe(4);
  });

  it('should include all 28 nodes for the Known Lands', () => {
    const distances = getAllDistances(KNOWN_LANDS, 'keep-0');
    expect(distances.size).toBe(28);
  });

  it('should have 0 distance to self', () => {
    const distances = getAllDistances(KNOWN_LANDS, 'keep-0');
    expect(distances.get('keep-0')).toBe(0);
  });
});

describe('findNearest()', () => {
  it('should return the source if it is in the target set', () => {
    const board = createLinearBoard();
    const result = findNearest(board, 'a', ['a', 'b']);
    expect(result).toEqual({ nodeId: 'a', distance: 0 });
  });

  it('should find nearest target node', () => {
    const board = createLinearBoard();
    const result = findNearest(board, 'a', ['c', 'd']);
    expect(result).toEqual({ nodeId: 'c', distance: 2 });
  });

  it('should return null when no targets are reachable', () => {
    const board = createLinearBoard();
    const result = findNearest(board, 'a', ['nonexistent']);
    expect(result).toBeNull();
  });

  it('should return null for empty target set', () => {
    const board = createLinearBoard();
    const result = findNearest(board, 'a', []);
    expect(result).toBeNull();
  });

  it('should find nearest forge from each keep on Known Lands', () => {
    const forgeIds = getForgeNodes(KNOWN_LANDS);
    for (const keepId of KNOWN_LANDS.startingKeeps) {
      const result = findNearest(KNOWN_LANDS, keepId, forgeIds);
      expect(result).not.toBeNull();
      expect(result!.distance).toBe(2);
      expect(forgeIds).toContain(result!.nodeId);
    }
  });
});

describe('getNodesWithinDistance()', () => {
  it('should return only source at distance 0', () => {
    const board = createLinearBoard();
    const nodes = getNodesWithinDistance(board, 'a', 0);
    expect(nodes).toEqual(['a']);
  });

  it('should return source and neighbors at distance 1', () => {
    const board = createLinearBoard();
    const nodes = getNodesWithinDistance(board, 'b', 1);
    expect(nodes).toContain('b');
    expect(nodes).toContain('a');
    expect(nodes).toContain('c');
    expect(nodes.length).toBe(3);
  });

  it('should return all nodes within the given distance', () => {
    const board = createLinearBoard();
    const nodes = getNodesWithinDistance(board, 'a', 2);
    expect(nodes).toContain('a');
    expect(nodes).toContain('b');
    expect(nodes).toContain('c');
    expect(nodes).not.toContain('d');
    expect(nodes.length).toBe(3);
  });

  it('should return all nodes when distance covers entire graph', () => {
    const board = createLinearBoard();
    const nodes = getNodesWithinDistance(board, 'a', 10);
    expect(nodes.length).toBe(4);
  });

  it('should return nodes reachable from a keep with 2 War Banners on Known Lands', () => {
    const nodes = getNodesWithinDistance(KNOWN_LANDS, 'keep-0', 2);
    // Distance 0: keep-0
    // Distance 1: s01, s02
    // Distance 2: forge-nw, s16, forge-ne, s13
    expect(nodes).toContain('keep-0');
    expect(nodes).toContain('s01');
    expect(nodes).toContain('s02');
    expect(nodes).toContain('forge-nw');
    expect(nodes).toContain('forge-ne');
    expect(nodes).toContain('s13');
    expect(nodes).toContain('s16');
    expect(nodes.length).toBe(7);
  });
});
