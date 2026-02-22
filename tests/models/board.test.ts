import { describe, it, expect } from 'vitest';
import {
  BoardDefinition,
  createInitialBoardState,
} from '../../src/models/board.js';

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
