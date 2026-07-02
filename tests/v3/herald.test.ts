/**
 * Herald + political/martial stance tests (Stage H — FOCUS-GROUP-R3 §3).
 *
 * RECRUIT commits the political build (+hand cap, −combat power); PARLEY is a non-card
 * pushback vs the dark; the per-player handLimit drives the Dawn draw.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { executeRecruit, executeParley } from '../../src/v3/actions.js';
import { getPlayerPowerAtNode } from '../../src/v3/combat.js';
import { runDawnPhase } from '../../src/v3/sequencer.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import { withTunables, HAND_LIMIT, WARLORD_POWER } from '../../src/v3/tunables.js';
import { stripStartingRetainers, withHeraldEnabled } from './fixtures.js';

describe('Herald + stance (Stage H)', () => {
  describe('RECRUIT → the political build', () => {
    it('commits the stance: +hand cap, −combat power, spends banners', () => {
      const s = stripStartingRetainers(withHeraldEnabled(createGame(2, 'competitive', 7))); // bare Warlord (T2-1)
      const here = s.players[0].warlordNodeId;
      const before = getPlayerPowerAtNode(s, 0, here); // warlord alone = WARLORD_POWER
      expect(before).toBe(WARLORD_POWER);
      s.players[0].banners = 5;

      withTunables({ HERALD_RECRUIT_COST: 2, HERALD_HAND_BONUS: 2, HERALD_COMBAT_PENALTY: 1 },
        () => executeRecruit(s, 0));

      expect(s.players[0].stance).toBe('political');
      expect(s.players[0].handLimit).toBe(HAND_LIMIT + 2);
      expect(s.players[0].banners).toBe(5 - 2);
      expect(getPlayerPowerAtNode(s, 0, here)).toBe(WARLORD_POWER - 1); // weaker fighter
    });

    it('is one-time (cannot re-recruit) and needs banners', () => {
      const s = withHeraldEnabled(createGame(2, 'competitive', 7));
      s.players[0].banners = 5;
      executeRecruit(s, 0);
      expect(() => executeRecruit(s, 0)).toThrow('already');
      s.players[1].banners = 0;
      expect(() => executeRecruit(s, 1)).toThrow('banner');
    });

    it('raises that player\'s Dawn draw (per-player hand limit)', () => {
      const s = withHeraldEnabled(createGame(2, 'competitive', 7));
      s.players[0].banners = 5;
      withTunables({ HERALD_HAND_BONUS: 2 }, () => executeRecruit(s, 0));
      s.phase = 'DAWN';
      runDawnPhase(s, new SeededRandom(7));
      expect(s.players[0].hand.length).toBe(HAND_LIMIT + 2); // political: deeper hand
      expect(s.players[1].hand.length).toBe(HAND_LIMIT);      // martial: baseline
    });
  });

  describe('PARLEY → non-card pushback vs the dark', () => {
    it('a political player reduces blight on a nearby front', () => {
      const s = withHeraldEnabled(createGame(2, 'competitive', 7));
      s.players[0].banners = 5;
      executeRecruit(s, 0);
      const here = s.players[0].warlordNodeId;
      s.board.state.nodes[here].blightLevel = 2; // a front on the Warlord
      withTunables({ HERALD_PUSHBACK: 1 }, () => executeParley(s, 0));
      expect(s.board.state.nodes[here].blightLevel).toBe(1); // pushed back
    });

    it('a martial player cannot PARLEY; a political one needs a front in reach', () => {
      const s = withHeraldEnabled(createGame(2, 'competitive', 7));
      expect(() => executeParley(s, 0)).toThrow('political'); // martial by default
      s.players[0].banners = 5;
      executeRecruit(s, 0);
      expect(() => executeParley(s, 0)).toThrow('no blighted front'); // no front nearby
    });
  });
});
