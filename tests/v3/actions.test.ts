/**
 * Actions system tests — validate §4.3 action implementations.
 *
 * Checks:
 *   - MARCH: adjacency validation, banner cost, ashed traversal, ZoC
 *   - CLAIM: holding/forge only, unclaimed, banner cost
 *   - STRIKE: SK forces required, card commitment, DK kill
 *   - RAID: rival present, card commits, last-stronghold depose flag (§6)
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import {
  executeMarch,
  executeClaim,
  executeRaid,
  areAdjacent,
} from '../../src/v3/actions.js';
import type { GameState } from '../../src/v3/types.js';

describe('Actions System', () => {
  let state: GameState;

  beforeEach(() => {
    state = createGame(4, 'competitive', 42);
  });

  describe('areAdjacent()', () => {
    it('returns true for connected nodes', () => {
      // keep-n connects to forge-nw
      expect(areAdjacent(state, 'keep-n', 'forge-nw')).toBe(true);
    });

    it('returns false for non-connected nodes', () => {
      expect(areAdjacent(state, 'keep-n', 'keystone')).toBe(false);
    });
  });

  describe('executeMarch()', () => {
    it('moves Warlord to an adjacent node', () => {
      const player = state.players[0];
      const keepId = state.board.definition.keepIds[0]; // keep-n
      expect(player.warlordNodeId).toBe(keepId);

      // March to forge-nw (adjacent to keep-n)
      const result = executeMarch(state, 0, 'forge-nw');

      expect(result.state.players[0].warlordNodeId).toBe('forge-nw');
      expect(result.actionConsumed).toBe(true);
    });

    it('costs 1 banner', () => {
      const initialBanners = state.players[0].banners;
      executeMarch(state, 0, 'forge-nw');
      expect(state.players[0].banners).toBe(initialBanners - 1);
    });

    it('costs extra to traverse ashed node', () => {
      // Ash forge-nw
      state.board.state.nodes['forge-nw'].ashed = true;
      const initialBanners = state.players[0].banners;

      executeMarch(state, 0, 'forge-nw');
      expect(state.players[0].banners).toBe(initialBanners - 2); // 1 + ASHED_TRAVERSE_EXTRA_COST
    });

    it('throws if target not adjacent', () => {
      expect(() => {
        executeMarch(state, 0, 'keystone');
      }).toThrow('not adjacent');
    });

    it('throws if insufficient banners', () => {
      state.players[0].banners = 0;
      expect(() => {
        executeMarch(state, 0, 'forge-nw');
      }).toThrow('banner');
    });

    it('throws if rival holds Approach (ZoC)', () => {
      // Move player 0 to forge-nw first
      state.players[0].warlordNodeId = 'forge-nw';

      // Put player 1 at approach-nw
      state.players[1].warlordNodeId = 'approach-nw';

      expect(() => {
        executeMarch(state, 0, 'approach-nw');
      }).toThrow('rival');
    });

    it('emits PLAYER_ACTED event', () => {
      const result = executeMarch(state, 0, 'forge-nw');
      const acted = result.events.find(e => e.type === 'PLAYER_ACTED');
      expect(acted).toBeDefined();
    });
  });

  describe('executeClaim()', () => {
    it('claims an unclaimed holding', () => {
      // Move player to a holding first
      state.players[0].warlordNodeId = 'holding-ne';
      state.board.state.nodes['holding-ne'].owner = null;
      // Holdings are the dark's spawn seams (5-dark); clear the DK so this exercises
      // the CLAIM mechanic, not the DK-blocks-claim forcing function.
      state.board.state.nodes['holding-ne'].shadowkingForces = [];

      const result = executeClaim(state, 0);
      expect(state.board.state.nodes['holding-ne'].owner).toBe(0);
      expect(result.actionConsumed).toBe(true);
    });

    it('costs 1 banner', () => {
      state.players[0].warlordNodeId = 'holding-ne';
      state.board.state.nodes['holding-ne'].owner = null;
      state.board.state.nodes['holding-ne'].shadowkingForces = [];
      const initialBanners = state.players[0].banners;

      executeClaim(state, 0);
      expect(state.players[0].banners).toBe(initialBanners - 1);
    });

    it('throws if node is already owned', () => {
      state.players[0].warlordNodeId = 'holding-ne';
      state.board.state.nodes['holding-ne'].owner = 1;

      expect(() => {
        executeClaim(state, 0);
      }).toThrow('already owned');
    });

    it('throws if node is ashed', () => {
      state.players[0].warlordNodeId = 'holding-ne';
      state.board.state.nodes['holding-ne'].owner = null;
      state.board.state.nodes['holding-ne'].ashed = true;

      expect(() => {
        executeClaim(state, 0);
      }).toThrow('ashed');
    });

    it('throws if node is not Holding or Forge', () => {
      state.players[0].warlordNodeId = 'keystone';

      expect(() => {
        executeClaim(state, 0);
      }).toThrow('not a Holding or Forge');
    });

    it('throws if insufficient banners', () => {
      state.players[0].warlordNodeId = 'holding-ne';
      state.board.state.nodes['holding-ne'].owner = null;
      state.board.state.nodes['holding-ne'].shadowkingForces = [];
      state.players[0].banners = 0;

      expect(() => {
        executeClaim(state, 0);
      }).toThrow('banner');
    });

    it('throws if a Death Knight holds the node (5-dark forcing function)', () => {
      // Holdings are the dark's spawn seams, so holding-ne already has a DK on it.
      state.players[0].warlordNodeId = 'holding-ne';
      state.board.state.nodes['holding-ne'].owner = null;
      state.players[0].banners = 3;
      expect(state.board.state.nodes['holding-ne'].shadowkingForces.length).toBeGreaterThan(0);
      expect(() => executeClaim(state, 0)).toThrow('Shadowking forces hold');
    });
  });

  describe('RAID last-stronghold depose flag (§6, §12 #13)', () => {
    /** Set up: attacker (0) and defender (1) co-located at a node the defender owns as
     *  their ONLY stronghold; the attacker can beat the defender on cards. */
    function siege(state: GameState): string {
      const keepId = state.board.definition.keepIds[0];
      // Defender owns only this one node (their last stronghold).
      for (const ns of Object.values(state.board.state.nodes)) {
        if (ns.owner === 1) ns.owner = null;
      }
      state.board.state.nodes[keepId].owner = 1;
      state.players[1].warlordNodeId = keepId;
      state.players[0].warlordNodeId = keepId;
      state.players[0].hand = [4, 4, 4];
      state.players[1].hand = [];
      return keepId;
    }

    it('taking a rival\'s last stronghold in March flags them deposed (resolved at Dawn)', () => {
      state.act = 'MARCH';
      const keepId = siege(state);
      const result = executeRaid(state, 0, 1, [4, 4], []);
      expect(state.board.state.nodes[keepId].owner).toBe(0); // node transferred
      expect(state.players[1].deposed).toBe(true);           // flagged...
      expect(state.players[1].isEliminated).toBe(false);     // ...but NOT yet eliminated
      expect(result.actionConsumed).toBe(true);
    });

    it('does NOT flag deposed in Whisper (opening protection, §12 #13)', () => {
      expect(state.act).toBe('WHISPER');
      siege(state);
      executeRaid(state, 0, 1, [4, 4], []);
      expect(state.players[1].deposed).toBe(false);
    });
  });
});
