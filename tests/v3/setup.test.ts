/**
 * Setup algorithm tests — validate createGame() per ALGORITHM §3.
 *
 * Checks:
 *   - 2, 3, 4 player games create correctly
 *   - Players start at assigned Keeps
 *   - Starting hands drawn
 *   - Initial Shadowking forces placed
 *   - Crown holder computed
 *   - blood_pact mode assigns exactly one human holder
 *   - Turn order is a valid permutation
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { STARTING_HAND, deathKnightCount } from '../../src/v3/tunables.js';

describe('createGame()', () => {
  describe('player count validation', () => {
    it('throws for 1 player', () => {
      expect(() => createGame(1, 'competitive', 42)).toThrow();
    });

    it('throws for 5 players', () => {
      expect(() => createGame(5, 'competitive', 42)).toThrow();
    });

    it('creates a 2-player game', () => {
      const state = createGame(2, 'competitive', 42);
      expect(state.players.length).toBe(2);
    });

    it('creates a 3-player game', () => {
      const state = createGame(3, 'competitive', 42);
      expect(state.players.length).toBe(3);
    });

    it('creates a 4-player game', () => {
      const state = createGame(4, 'competitive', 42);
      expect(state.players.length).toBe(4);
    });
  });

  describe('initial state', () => {
    const state = createGame(4, 'competitive', 42);

    it('starts at round 1', () => {
      expect(state.round).toBe(1);
    });

    it('starts in THREAT phase', () => {
      expect(state.phase).toBe('THREAT');
    });

    it('starts in WHISPER act', () => {
      expect(state.act).toBe('WHISPER');
    });

    it('stores the seed', () => {
      expect(state.seed).toBe(42);
    });

    it('stores the mode', () => {
      expect(state.mode).toBe('competitive');
    });

    it('has no game end', () => {
      expect(state.gameEndReason).toBeNull();
      expect(state.winner).toBeNull();
    });

    it('has empty action log', () => {
      expect(state.actionLog).toEqual([]);
    });

    it('has empty pledge buffer and history', () => {
      expect(state.pledgeBuffer).toEqual([]);
      expect(state.pledgeHistory).toEqual([]);
    });
  });

  describe('player initialization', () => {
    const state = createGame(4, 'competitive', 42);

    it('each player starts with the correct hand size', () => {
      for (const p of state.players) {
        expect(p.hand.length).toBe(STARTING_HAND);
      }
    });

    it('each player starts at their assigned Keep', () => {
      for (const p of state.players) {
        expect(p.warlordNodeId).toBe(state.board.definition.keepIds[p.index]);
      }
    });

    it('each Keep is pre-claimed by its player', () => {
      for (const p of state.players) {
        const keepId = state.board.definition.keepIds[p.index];
        expect(state.board.state.nodes[keepId].owner).toBe(p.index);
      }
    });

    it('each player has a Warlord piece on their Keep', () => {
      for (const p of state.players) {
        const keepId = state.board.definition.keepIds[p.index];
        const pieces = state.board.state.nodes[keepId].pieces;
        const warlord = pieces.find(
          piece => piece.type === 'warlord' && piece.owner === p.index,
        );
        expect(warlord, `Player ${p.index} warlord on ${keepId}`).toBeDefined();
      }
    });

    it('no player starts Broken', () => {
      for (const p of state.players) {
        expect(p.isBroken).toBe(false);
        expect(p.brokenSince).toBeNull();
        expect(p.brokenRoundsConsecutive).toBe(0);
      }
    });

    it('players have starting banners', () => {
      for (const p of state.players) {
        expect(p.banners).toBeGreaterThan(0);
      }
    });

    it('card values are in [1, 4]', () => {
      for (const p of state.players) {
        for (const card of p.hand) {
          expect(card).toBeGreaterThanOrEqual(1);
          expect(card).toBeLessThanOrEqual(4);
        }
      }
    });
  });

  describe('Shadowking forces', () => {
    const state = createGame(4, 'competitive', 42);

    it('places the correct number of Death Knights (player-count scaled, 5-dark)', () => {
      const dks = state.shadowking.forces.filter(f => f.type === 'death_knight');
      expect(dks.length).toBe(deathKnightCount(4));
    });

    it('forces are placed on the board', () => {
      for (const force of state.shadowking.forces) {
        const nodeState = state.board.state.nodes[force.nodeId];
        expect(nodeState, `Force at ${force.nodeId}`).toBeDefined();
        const found = nodeState.shadowkingForces.find(f => f.id === force.id);
        expect(found, `Force ${force.id} on board at ${force.nodeId}`).toBeDefined();
      }
    });

    it('grudge array matches player count', () => {
      expect(state.shadowking.grudge.length).toBe(4);
      expect(state.shadowking.grudge.every(g => g === 0)).toBe(true);
    });

    it('patience starts at 0', () => {
      expect(state.shadowking.patience).toBe(0);
    });

    it('no telegraph set yet', () => {
      expect(state.shadowking.telegraph).toBeNull();
    });
  });

  describe('turn order', () => {
    const state = createGame(4, 'competitive', 42);

    it('is a valid permutation of player indices', () => {
      const sorted = [...state.turnOrder].sort();
      expect(sorted).toEqual([0, 1, 2, 3]);
    });

    it('has correct length', () => {
      expect(state.turnOrder.length).toBe(4);
    });
  });

  describe('Crown holder', () => {
    it('is computed at setup', () => {
      const state = createGame(4, 'competitive', 42);
      // All players own 1 keep (income 1), so the tiebreaker applies
      // Crown should be one of the player indices
      expect(state.crownHolder).not.toBeNull();
      expect(state.crownHolder).toBeGreaterThanOrEqual(0);
      expect(state.crownHolder).toBeLessThan(4);
    });

    it('exactly one player holds the Crown', () => {
      const state = createGame(4, 'competitive', 42);
      const crownCount = state.players.filter(p => p.crownHeld).length;
      expect(crownCount).toBe(1);
    });

    it('the crownHeld flag matches crownHolder', () => {
      const state = createGame(4, 'competitive', 42);
      for (const p of state.players) {
        expect(p.crownHeld).toBe(p.index === state.crownHolder);
      }
    });
  });

  describe('Blood Pact mode', () => {
    it('assigns exactly one human Blood Pact holder', () => {
      const state = createGame(4, 'blood_pact', 42, 2);
      expect(state.bloodPactHolder).not.toBeNull();
      // Holder must be a human player
      const holder = state.players[state.bloodPactHolder!];
      expect(holder.type).toBe('human');
      expect(holder.hasBloodPact).toBe(true);
    });

    it('only one player has the Blood Pact', () => {
      const state = createGame(4, 'blood_pact', 42, 2);
      const holders = state.players.filter(p => p.hasBloodPact);
      expect(holders.length).toBe(1);
    });

    it('competitive mode has no Blood Pact', () => {
      const state = createGame(4, 'competitive', 42);
      expect(state.bloodPactHolder).toBeNull();
      expect(state.players.every(p => !p.hasBloodPact)).toBe(true);
    });
  });

  describe('player types', () => {
    it('assigns human/AI types based on humanCount', () => {
      const state = createGame(4, 'competitive', 42, 2);
      const humans = state.players.filter(p => p.type === 'human');
      const ais = state.players.filter(p => p.type === 'ai');
      expect(humans.length).toBe(2);
      expect(ais.length).toBe(2);
    });

    it('defaults to 1 human', () => {
      const state = createGame(4, 'competitive', 42);
      const humans = state.players.filter(p => p.type === 'human');
      expect(humans.length).toBe(1);
    });
  });

  describe('board state', () => {
    const state = createGame(4, 'competitive', 42);

    it('has the Closing Ring definition', () => {
      expect(Object.keys(state.board.definition.nodes).length).toBe(17);
    });

    it('non-keep nodes are unclaimed', () => {
      for (const [nodeId, ns] of Object.entries(state.board.state.nodes)) {
        const def = state.board.definition.nodes[nodeId];
        if (def.tier !== 'keep') {
          // Only DK placement nodes might have forces, but shouldn't have owners
          if (!state.shadowking.forces.some(f => f.nodeId === nodeId)) {
            expect(ns.owner, `Node ${nodeId} should be unclaimed`).toBeNull();
          }
        }
      }
    });
  });
});
