/**
 * Rescue/break economy tests (Stage 5d).
 *
 * Validates the four coupled changes in design-history/DESIGN-V2-RESCUE-ECONOMY.md:
 *   - LANDED_STRIKE_WOUNDS: the dark wounds (and can break) its named target.
 *   - RESCUE_TRIBUTE_BANNERS: rescue pays the rescuer in win-currency.
 *   - BREAK_THRESHOLD / RESCUE_COST are now in the injectable seam.
 *   - bestStepTowardBrokenAlly: the AI marches to reach a Broken ally.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { executeRescue } from '../../src/v3/actions.js';
import { resolvePledgePhase } from '../../src/v3/sequencer.js';
import { chooseAction } from '../../src/v3/ai-player.js';
import { policyOf } from '../../src/v3/sim/archetypes.js';
import { withTunables } from '../../src/v3/tunables.js';
import type { GameState } from '../../src/v3/types.js';

describe('Rescue/break economy (Stage 5d)', () => {
  describe('the dark as a break-vector (LANDED_STRIKE_WOUNDS)', () => {
    it('a landed strike wounds the named target; a full block does not', () => {
      const mk = (): GameState => {
        const s = createGame(2, 'competitive', 42);
        s.phase = 'PLEDGE';
        s.shadowking.telegraph = {
          effect: 'SPREAD', targetNodeId: 'approach-n', doomCost: 6,
          struckPlayerIndex: 0, steerQuadrant: 0, firstPersonLine: '',
        };
        s.pledgeBuffer = s.players.map(p => ({ playerIndex: p.index, amount: 0 }));
        return s;
      };

      // Un-averted strike (0 pledge): the target takes LANDED_STRIKE_WOUNDS.
      const landed = mk();
      const w0 = landed.players[0].wounds;
      withTunables({ LANDED_STRIKE_WOUNDS: 2 }, () => resolvePledgePhase(landed));
      expect(landed.players[0].wounds).toBe(w0 + 2);

      // A FULL BLOCK (averted strike) never wounds the warlord, even with the lever on.
      const blocked = mk();
      blocked.pledgeBuffer = blocked.players.map(p => ({ playerIndex: p.index, amount: 6 })); // ≥ doomCost ⇒ averted
      const w1 = blocked.players[0].wounds;
      withTunables({ LANDED_STRIKE_WOUNDS: 2 }, () => resolvePledgePhase(blocked));
      expect(blocked.players[0].wounds).toBe(w1);
    });

    it('enough landed-strike wounds break the target', () => {
      const s = createGame(2, 'competitive', 42);
      s.phase = 'PLEDGE';
      s.players[0].wounds = 4; // one 2-wound strike away from BREAK_THRESHOLD 6
      s.shadowking.telegraph = {
        effect: 'SPREAD', targetNodeId: 'approach-n', doomCost: 6,
        struckPlayerIndex: 0, steerQuadrant: 0, firstPersonLine: '',
      };
      s.pledgeBuffer = s.players.map(p => ({ playerIndex: p.index, amount: 0 }));
      withTunables({ LANDED_STRIKE_WOUNDS: 2 }, () => resolvePledgePhase(s));
      expect(s.players[0].isBroken).toBe(true);
    });
  });

  describe('win-currency payoff (RESCUE_TRIBUTE_BANNERS)', () => {
    it('the rescued ally pays the rescuer a banner tribute', () => {
      const s = createGame(2, 'competitive', 42);
      s.players[1].isBroken = true;
      s.players[1].warlordNodeId = s.players[0].warlordNodeId; // co-located
      s.players[0].hand = [1, 1, 1];
      s.players[1].banners = 5;
      const rescuerBefore = s.players[0].banners;

      withTunables({ RESCUE_TRIBUTE_BANNERS: 3 }, () => executeRescue(s, 0, 1));

      expect(s.players[1].isBroken).toBe(false);
      expect(s.players[0].banners).toBe(rescuerBefore + 3); // rescuer gains
      expect(s.players[1].banners).toBe(5 - 3);             // rescued pays
    });

    it('tribute is capped at the rescued ally\'s banners', () => {
      const s = createGame(2, 'competitive', 42);
      s.players[1].isBroken = true;
      s.players[1].warlordNodeId = s.players[0].warlordNodeId;
      s.players[0].hand = [1, 1, 1];
      s.players[1].banners = 1;
      const rescuerBefore = s.players[0].banners;

      withTunables({ RESCUE_TRIBUTE_BANNERS: 3 }, () => executeRescue(s, 0, 1));

      expect(s.players[0].banners).toBe(rescuerBefore + 1); // only what they had
      expect(s.players[1].banners).toBe(0);
    });
  });

  describe('the seam (BREAK_THRESHOLD / RESCUE_COST)', () => {
    it('RESCUE_COST override changes the cards spent + the affordability gate', () => {
      const s = createGame(2, 'competitive', 42);
      s.players[1].isBroken = true;
      s.players[1].warlordNodeId = s.players[0].warlordNodeId;
      s.players[0].hand = [2, 3]; // exactly 2 cards
      // Default cost 2 spends both; override to 1 spends one.
      withTunables({ RESCUE_COST: 1 }, () => executeRescue(s, 0, 1));
      expect(s.players[0].hand.length).toBe(1);
    });
  });

  describe('the rescue-seek verb (bestStepTowardBrokenAlly)', () => {
    it('a willing rescuer marches toward a non-adjacent Broken ally', () => {
      // Keeps are never adjacent (they connect via Forges/Holdings), so the Broken
      // ally at its Keep is reachable only by marching. A cooperator (rescueWillingness
      // 0.9) should choose the rescue-seek MARCH on most seeds.
      let marchedTowardAlly = 0;
      for (let seed = 0; seed < 20; seed++) {
        const s = createGame(4, 'competitive', seed);
        s.phase = 'ACTION';
        s.activePlayerIndex = 0;
        s.players[0].banners = 3;
        s.players[2].isBroken = true;
        // Pre-bind player 0 in an Oath (skip the free SWEAR step) and pre-set the
        // political stance (skip the RECRUIT step; no blight ⇒ PARLEY is a no-op) so this
        // isolates the rescue-seek verb (cooperator is oath/herald-willing by default).
        s.oaths.push({ a: 0, b: 1, swornRound: s.round, strain: 0 });
        s.players[0].stance = 'political';
        const action = chooseAction(s, 0, seed, policyOf('cooperator'));
        if (action.type === 'MARCH') marchedTowardAlly++;
      }
      // The verb fires on the clear majority of seeds (rng < 0.9).
      expect(marchedTowardAlly).toBeGreaterThan(10);
    });
  });
});
