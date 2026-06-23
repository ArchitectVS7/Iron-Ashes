/**
 * Dark Engagement tests (Stage 5-dark) — the dead-grudge fix.
 *
 * Validates the five coupled changes in DESIGN-V2-DARK-ENGAGEMENT.md:
 *   - DKs block CLAIM (forcing function) — see actions.test.ts.
 *   - Killing a DK on an unclaimed Holding/Forge CLAIMS it (win-currency payoff).
 *   - The grudge Mark is asymmetric by territory standing (catch-up lever).
 *   - territoryRank ordering.
 *   - An archetype with darkHuntBias actually STRIKEs a beatable DK on its ground.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v2/setup.js';
import { executeStrike } from '../../src/v2/actions.js';
import { territoryRank } from '../../src/v2/combat.js';
import { chooseAction } from '../../src/v2/ai-player.js';
import { policyOf } from '../../src/v2/sim/archetypes.js';
import {
  WARLORD_POWER,
  GRUDGE_PER_DK_KILL,
  withTunables,
} from '../../src/v2/tunables.js';
import type { GameState } from '../../src/v2/types.js';

/** Stand player `p`'s Warlord on `node` as a real piece (so it has combat power there). */
function placeWarlordOn(state: GameState, p: number, node: string): void {
  const ns = state.board.state.nodes[node];
  ns.pieces.push({ id: `warlord-${p}`, type: 'warlord', owner: p, power: WARLORD_POWER, nodeId: node });
  state.players[p].warlordNodeId = node;
}

describe('Dark Engagement (Stage 5-dark)', () => {
  describe('win-currency payoff', () => {
    it('killing a DK on an unclaimed Holding claims it for the attacker', () => {
      const state = createGame(4, 'competitive', 42);
      const node = 'holding-ne'; // a dark spawn seam — has a DK
      expect(state.board.state.nodes[node].shadowkingForces.length).toBeGreaterThan(0);
      state.board.state.nodes[node].owner = null;
      placeWarlordOn(state, 0, node);
      state.players[0].hand = [4, 4]; // base 3 + 4 = 7 > DK power 4 ⇒ a clean win

      executeStrike(state, 0, [4]);

      expect(state.board.state.nodes[node].shadowkingForces.length).toBe(0); // DK gone
      expect(state.board.state.nodes[node].owner).toBe(0); // spoils of the breach
    });

    it('does not auto-claim when DK_KILL_CLAIMS_NODE is off', () => {
      const state = createGame(4, 'competitive', 42);
      const node = 'holding-ne';
      state.board.state.nodes[node].owner = null;
      placeWarlordOn(state, 0, node);
      state.players[0].hand = [4, 4];

      withTunables({ DK_KILL_CLAIMS_NODE: false }, () => executeStrike(state, 0, [4]));

      expect(state.board.state.nodes[node].owner).toBeNull();
    });
  });

  describe('asymmetric grudge Mark', () => {
    it('a leading attacker (rank < TOP_N) is marked; a trailing one is not', () => {
      const mk = () => {
        const state = createGame(4, 'competitive', 42);
        const node = 'holding-ne';
        state.board.state.nodes[node].owner = null;
        placeWarlordOn(state, 0, node);
        state.players[0].hand = [4, 4];
        return state;
      };

      // TOP_N = 99 ⇒ everyone is "leading" ⇒ the kill marks the attacker.
      const marked = mk();
      const before = marked.shadowking.grudge[0];
      withTunables({ GRUDGE_MARK_TOP_N: 99 }, () => executeStrike(marked, 0, [4]));
      expect(marked.shadowking.grudge[0]).toBe(before + GRUDGE_PER_DK_KILL);

      // TOP_N = 0 ⇒ nobody is "leading enough" ⇒ trailing hunter pays no grudge.
      const free = mk();
      const before2 = free.shadowking.grudge[0];
      withTunables({ GRUDGE_MARK_TOP_N: 0 }, () => executeStrike(free, 0, [4]));
      expect(free.shadowking.grudge[0]).toBe(before2);
    });
  });

  describe('territoryRank', () => {
    it('orders by production, ties by seat, Broken last', () => {
      const state = createGame(4, 'competitive', 42);
      // Clear all ownership, then hand-build standings.
      for (const ns of Object.values(state.board.state.nodes)) ns.owner = null;
      state.board.state.nodes['forge-nw'].owner = 2;   // player 2: production 3 (leader)
      state.board.state.nodes['holding-ne'].owner = 0; // player 0: production 1
      state.board.state.nodes['holding-se'].owner = 1; // player 1: production 1 (tie w/ 0 → lower seat ranks higher)
      state.players[3].isBroken = true;                // player 3: ranked last

      expect(territoryRank(state, 2)).toBe(0);
      expect(territoryRank(state, 0)).toBe(1);
      expect(territoryRank(state, 1)).toBe(2);
      expect(territoryRank(state, 3)).toBe(3);
    });
  });

  describe('the Hunt verb', () => {
    it('an aggressor on a DK-held Holding STRIKEs it (cards-aware gate)', () => {
      const state = createGame(4, 'competitive', 42);
      const node = 'holding-ne';
      state.phase = 'ACTION';
      state.board.state.nodes[node].owner = null;
      placeWarlordOn(state, 0, node);
      state.activePlayerIndex = 0;
      state.players[0].hand = [4, 3]; // base 3 + 4 = 7 > 4 ⇒ canStrikeWin
      state.players[0].banners = 3;

      const action = chooseAction(state, 0, 1, policyOf('aggressor'));
      expect(action.type).toBe('STRIKE');
    });
  });
});
