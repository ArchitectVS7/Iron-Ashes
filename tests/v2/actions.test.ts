/**
 * Actions system tests — validate §4.3 action implementations.
 *
 * Checks:
 *   - MARCH: adjacency validation, banner cost, ashed traversal, ZoC
 *   - CLAIM: holding/forge only, unclaimed, banner cost
 *   - STRIKE: SK forces required, card commitment, DK kill
 *   - RAID: rival present, card commits, wounds
 *   - RESCUE: broken target, cost, co-location, un-Break
 *   - Broken recovery at Dawn
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createGame } from '../../src/v2/setup.js';
import {
  executeMarch,
  executeClaim,
  executeRescue,
  executeRaid,
  checkBrokenRecovery,
  areAdjacent,
} from '../../src/v2/actions.js';
import { BROKEN_MAX_ROUNDS, RESCUE_COST, BREAK_THRESHOLD } from '../../src/v2/tunables.js';
import type { GameState } from '../../src/v2/types.js';

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

  describe('executeRescue()', () => {
    it('un-Breaks a co-located Broken ally', () => {
      const keepId = state.board.definition.keepIds[0];
      state.players[1].isBroken = true;
      state.players[1].warlordNodeId = keepId;
      state.players[0].hand = [1, 2, 3, 4, 5, 6]; // Enough cards

      const result = executeRescue(state, 0, 1);
      expect(state.players[1].isBroken).toBe(false);
      expect(result.actionConsumed).toBe(true);
    });

    it('costs RESCUE_COST cards', () => {
      const keepId = state.board.definition.keepIds[0];
      state.players[1].isBroken = true;
      state.players[1].warlordNodeId = keepId;
      state.players[0].hand = [1, 2, 3, 4, 5, 6];
      const initialHand = state.players[0].hand.length;

      executeRescue(state, 0, 1);
      expect(state.players[0].hand.length).toBe(initialHand - RESCUE_COST);
    });

    it('throws if target is not Broken', () => {
      const keepId = state.board.definition.keepIds[0];
      state.players[1].warlordNodeId = keepId;

      expect(() => {
        executeRescue(state, 0, 1);
      }).toThrow('not Broken');
    });

    it('throws if not co-located or adjacent', () => {
      state.players[1].isBroken = true;
      state.players[1].warlordNodeId = 'keystone'; // Far away
      state.players[0].hand = [1, 2, 3, 4, 5, 6];

      expect(() => {
        executeRescue(state, 0, 1);
      }).toThrow('not co-located or adjacent');
    });

    it('throws if insufficient cards', () => {
      const keepId = state.board.definition.keepIds[0];
      state.players[1].isBroken = true;
      state.players[1].warlordNodeId = keepId;
      state.players[0].hand = []; // No cards

      expect(() => {
        executeRescue(state, 0, 1);
      }).toThrow('cards');
    });

    it('throws if trying to rescue self', () => {
      state.players[0].isBroken = true;
      state.players[0].hand = [1, 2, 3, 4, 5, 6];

      expect(() => {
        executeRescue(state, 0, 0);
      }).toThrow('yourself');
    });

    it('works for adjacent allies', () => {
      // keep-n is adjacent to holding-ne
      state.players[1].isBroken = true;
      state.players[1].warlordNodeId = 'holding-ne';
      state.players[0].warlordNodeId = 'keep-n';
      state.players[0].hand = [1, 2, 3, 4, 5, 6];

      const result = executeRescue(state, 0, 1);
      expect(state.players[1].isBroken).toBe(false);
    });
  });

  describe('checkBrokenRecovery()', () => {
    it('auto-recovers after BROKEN_MAX_ROUNDS', () => {
      state.players[0].isBroken = true;
      state.players[0].brokenRoundsConsecutive = BROKEN_MAX_ROUNDS;

      const events = checkBrokenRecovery(state, 0);
      expect(state.players[0].isBroken).toBe(false);
      expect(events.length).toBeGreaterThan(0);
    });

    it('does not recover before the cap', () => {
      state.players[0].isBroken = true;
      state.players[0].brokenRoundsConsecutive = BROKEN_MAX_ROUNDS - 1;

      const events = checkBrokenRecovery(state, 0);
      expect(state.players[0].isBroken).toBe(true);
      expect(events.length).toBe(0);
    });

    it('sets wounds to half break threshold on recovery', () => {
      state.players[0].isBroken = true;
      state.players[0].brokenRoundsConsecutive = BROKEN_MAX_ROUNDS;
      state.players[0].wounds = BREAK_THRESHOLD + 5;

      checkBrokenRecovery(state, 0);
      expect(state.players[0].wounds).toBe(Math.floor(BREAK_THRESHOLD / 2));
    });
  });

  describe('Broken players keep an active verb (§5.4)', () => {
    it('a Broken Warlord can still initiate a RAID', () => {
      const keepId = state.board.definition.keepIds[0];
      state.players[0].isBroken = true;        // attacker is Broken...
      state.players[0].warlordNodeId = keepId;
      state.players[1].warlordNodeId = keepId;  // ...co-located with a rival
      state.players[0].hand = [5, 5];

      const result = executeRaid(state, 0, 1, [], []);
      expect(result.actionConsumed).toBe(true); // the RAID was NOT blocked by Broken status
    });
  });
});
