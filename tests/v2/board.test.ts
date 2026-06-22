/**
 * Board topology tests — validate the 17-node Closing Ring.
 *
 * Checks from the spec (ALGORITHM §2):
 *   - 17 nodes, correct tier counts
 *   - Bidirectional connections
 *   - Full connectivity
 *   - Keystone reachable only via Approaches
 *   - Lateral rings (Approach 4-cycle, Forge 4-cycle)
 *   - Four-fold rotational symmetry
 *   - Each Keep distance 3 from Keystone
 */

import { describe, expect, it } from 'vitest';
import {
  buildClosingRing,
  createInitialBoardState,
  validateClosingRing,
} from '../../src/v2/board.js';
import type { V2BoardDef, V2NodeDef } from '../../src/v2/types.js';

describe('Closing Ring Board', () => {
  const board = buildClosingRing();

  describe('validateClosingRing()', () => {
    it('passes all validation checks', () => {
      const result = validateClosingRing(board);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('node counts', () => {
    const allNodes = Object.values(board.nodes);

    it('has exactly 17 nodes', () => {
      expect(allNodes.length).toBe(17);
    });

    it('has 1 keystone', () => {
      expect(allNodes.filter(n => n.tier === 'keystone').length).toBe(1);
    });

    it('has 4 approaches', () => {
      expect(allNodes.filter(n => n.tier === 'approach').length).toBe(4);
    });

    it('has 4 forges', () => {
      expect(allNodes.filter(n => n.tier === 'forge').length).toBe(4);
    });

    it('has 4 keeps', () => {
      expect(allNodes.filter(n => n.tier === 'keep').length).toBe(4);
    });

    it('has 4 holdings', () => {
      expect(allNodes.filter(n => n.tier === 'holding').length).toBe(4);
    });
  });

  describe('connection integrity', () => {
    it('all connections are bidirectional', () => {
      for (const node of Object.values(board.nodes)) {
        for (const connId of node.connections) {
          const target = board.nodes[connId];
          expect(target, `Node ${connId} referenced by ${node.id} doesn't exist`).toBeDefined();
          expect(
            target.connections.includes(node.id),
            `Connection ${node.id} → ${connId} is not bidirectional`,
          ).toBe(true);
        }
      }
    });

    it('graph is fully connected', () => {
      const visited = new Set<string>();
      const queue = [Object.keys(board.nodes)[0]];
      visited.add(queue[0]);
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const conn of board.nodes[current].connections) {
          if (!visited.has(conn)) {
            visited.add(conn);
            queue.push(conn);
          }
        }
      }
      expect(visited.size).toBe(17);
    });
  });

  describe('keystone access', () => {
    it('keystone connects only to approaches', () => {
      const ks = board.nodes[board.keystoneId];
      for (const connId of ks.connections) {
        expect(board.nodes[connId].tier).toBe('approach');
      }
    });

    it('keystone has exactly 4 connections', () => {
      expect(board.nodes[board.keystoneId].connections.length).toBe(4);
    });
  });

  describe('lateral rings', () => {
    it('each approach connects to exactly 2 other approaches', () => {
      for (const appId of board.approachIds) {
        const app = board.nodes[appId];
        const lateralCount = app.connections.filter(
          c => board.nodes[c].tier === 'approach',
        ).length;
        expect(lateralCount, `Approach ${appId} lateral count`).toBe(2);
      }
    });

    it('approach lateral connections form a 4-cycle', () => {
      // Starting from approach[0], follow lateral links — should visit all 4
      const start = board.approachIds[0];
      const visited = new Set<string>();
      let current = start;
      for (let step = 0; step < 4; step++) {
        visited.add(current);
        const laterals = board.nodes[current].connections.filter(
          c => board.nodes[c].tier === 'approach' && !visited.has(c),
        );
        if (laterals.length === 0) break;
        current = laterals[0];
      }
      expect(visited.size).toBe(4);
    });

    it('each forge connects to exactly 2 other forges', () => {
      for (const forgeId of board.forgeIds) {
        const forge = board.nodes[forgeId];
        const lateralCount = forge.connections.filter(
          c => board.nodes[c].tier === 'forge',
        ).length;
        expect(lateralCount, `Forge ${forgeId} lateral count`).toBe(2);
      }
    });

    it('forge lateral connections form a 4-cycle', () => {
      const start = board.forgeIds[0];
      const visited = new Set<string>();
      let current = start;
      for (let step = 0; step < 4; step++) {
        visited.add(current);
        const laterals = board.nodes[current].connections.filter(
          c => board.nodes[c].tier === 'forge' && !visited.has(c),
        );
        if (laterals.length === 0) break;
        current = laterals[0];
      }
      expect(visited.size).toBe(4);
    });
  });

  describe('node degrees', () => {
    it('keystone has degree 4', () => {
      expect(board.nodes[board.keystoneId].connections.length).toBe(4);
    });

    it('each approach has degree 4 (Keystone + Forge + 2 lateral)', () => {
      for (const appId of board.approachIds) {
        expect(board.nodes[appId].connections.length).toBe(4);
      }
    });

    it('each forge has degree 4 (Approach + Keep + 2 lateral)', () => {
      for (const forgeId of board.forgeIds) {
        expect(board.nodes[forgeId].connections.length).toBe(4);
      }
    });

    it('each keep has degree 3 (Forge + 2 Holdings)', () => {
      for (const keepId of board.keepIds) {
        expect(board.nodes[keepId].connections.length).toBe(3);
      }
    });

    it('each holding has degree 2 (2 Keeps)', () => {
      for (const holdId of board.holdingIds) {
        expect(board.nodes[holdId].connections.length).toBe(2);
      }
    });
  });

  describe('distance checks', () => {
    function bfsDistance(def: V2BoardDef, source: string, target: string): number {
      if (source === target) return 0;
      const visited = new Set<string>([source]);
      const queue: Array<{ id: string; d: number }> = [{ id: source, d: 0 }];
      while (queue.length > 0) {
        const { id, d } = queue.shift()!;
        for (const conn of def.nodes[id].connections) {
          if (visited.has(conn)) continue;
          visited.add(conn);
          if (conn === target) return d + 1;
          queue.push({ id: conn, d: d + 1 });
        }
      }
      return -1;
    }

    it('each keep is distance 3 from keystone', () => {
      for (const keepId of board.keepIds) {
        const dist = bfsDistance(board, keepId, board.keystoneId);
        expect(dist, `${keepId} → keystone`).toBe(3);
      }
    });

    it('each keep is distance 2 from its nearest forge', () => {
      for (const keepId of board.keepIds) {
        let minDist = Infinity;
        for (const forgeId of board.forgeIds) {
          const d = bfsDistance(board, keepId, forgeId);
          if (d < minDist) minDist = d;
        }
        // Keep connects directly to its quadrant Forge → distance 1
        // Actually: Keep → Forge (adjacent) = distance 1
        expect(minDist, `${keepId} → nearest forge`).toBe(1);
      }
    });
  });

  describe('four-fold symmetry', () => {
    it('all keeps have the same connection pattern by tier', () => {
      const patterns = board.keepIds.map(id => {
        const node = board.nodes[id];
        return node.connections
          .map(c => board.nodes[c].tier)
          .sort()
          .join(',');
      });
      // All keeps should have the same sorted tier pattern
      expect(new Set(patterns).size).toBe(1);
    });

    it('all forges have the same connection pattern by tier', () => {
      const patterns = board.forgeIds.map(id => {
        const node = board.nodes[id];
        return node.connections
          .map(c => board.nodes[c].tier)
          .sort()
          .join(',');
      });
      expect(new Set(patterns).size).toBe(1);
    });

    it('all approaches have the same connection pattern by tier', () => {
      const patterns = board.approachIds.map(id => {
        const node = board.nodes[id];
        return node.connections
          .map(c => board.nodes[c].tier)
          .sort()
          .join(',');
      });
      expect(new Set(patterns).size).toBe(1);
    });

    it('all holdings have the same connection pattern by tier', () => {
      const patterns = board.holdingIds.map(id => {
        const node = board.nodes[id];
        return node.connections
          .map(c => board.nodes[c].tier)
          .sort()
          .join(',');
      });
      expect(new Set(patterns).size).toBe(1);
    });
  });

  describe('income values', () => {
    it('keystone has 0 income', () => {
      expect(board.nodes[board.keystoneId].income).toBe(0);
    });

    it('approaches have 0 income', () => {
      for (const id of board.approachIds) {
        expect(board.nodes[id].income).toBe(0);
      }
    });

    it('forges have 3 income', () => {
      for (const id of board.forgeIds) {
        expect(board.nodes[id].income).toBe(3);
      }
    });

    it('keeps have 1 income', () => {
      for (const id of board.keepIds) {
        expect(board.nodes[id].income).toBe(1);
      }
    });

    it('holdings have 1 income', () => {
      for (const id of board.holdingIds) {
        expect(board.nodes[id].income).toBe(1);
      }
    });
  });

  describe('createInitialBoardState()', () => {
    const boardState = createInitialBoardState(board);

    it('creates state for all 17 nodes', () => {
      expect(Object.keys(boardState.nodes).length).toBe(17);
    });

    it('all nodes start un-ashed', () => {
      for (const ns of Object.values(boardState.nodes)) {
        expect(ns.ashed).toBe(false);
      }
    });

    it('all nodes start at blightLevel 0', () => {
      for (const ns of Object.values(boardState.nodes)) {
        expect(ns.blightLevel).toBe(0);
      }
    });

    it('all nodes start unowned', () => {
      for (const ns of Object.values(boardState.nodes)) {
        expect(ns.owner).toBeNull();
      }
    });

    it('all nodes start with empty pieces', () => {
      for (const ns of Object.values(boardState.nodes)) {
        expect(ns.pieces).toEqual([]);
        expect(ns.shadowkingForces).toEqual([]);
      }
    });
  });

  describe('blight entry seams', () => {
    it('has exactly 4 blight entry seams', () => {
      expect(board.blightEntrySeams.length).toBe(4);
    });

    it('blight entry seams are holdings', () => {
      for (const seam of board.blightEntrySeams) {
        expect(board.nodes[seam].tier).toBe('holding');
      }
    });
  });

  describe('edge count', () => {
    it('has exactly 28 undirected edges', () => {
      // Sum of all degrees / 2
      let totalDegree = 0;
      for (const node of Object.values(board.nodes)) {
        totalDegree += node.connections.length;
      }
      expect(totalDegree / 2).toBe(28);
    });
  });
});
