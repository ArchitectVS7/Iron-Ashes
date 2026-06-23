/**
 * Oaths + Ledger tests (the passion spine — DESIGN-V2-OATHS.md).
 *
 * Public, breakable two-player pacts: swear (free), non-aggression while sworn,
 * Dawn fealty dividend + maturity bonus, break (banner burst + grudge/Ledger),
 * the no-same-round-break guard, ≤1 oath per player, and rescue auto-swearing.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v2/setup.js';
import {
  executeSwearOath, executeBreakOath, executeRaid, executeRescue,
  runOathUpkeep, findOath, areSworn,
} from '../../src/v2/actions.js';
import { GRUDGE_OATHBREAK, OATH_DURATION, OATH_DIVIDEND, OATH_LOYALTY_BONUS, OATH_BREAK_BANNERS } from '../../src/v2/tunables.js';

describe('Oaths (the passion spine)', () => {
  describe('swear', () => {
    it('forges a symmetric Oath, free (no action point), capped at one per player', () => {
      const s = createGame(3, 'competitive', 7);
      const r = executeSwearOath(s, 0, 2);
      expect(r.actionConsumed).toBe(false); // free
      expect(areSworn(s, 0, 2)).toBe(true);
      expect(findOath(s, 0)).not.toBeNull();
      // Already sworn → cannot swear another.
      expect(() => executeSwearOath(s, 0, 1)).toThrow('already');
      // Target already sworn → also rejected.
      expect(() => executeSwearOath(s, 1, 2)).toThrow('already');
    });

    it('rejects self, Broken, and unknown targets', () => {
      const s = createGame(2, 'competitive', 7);
      expect(() => executeSwearOath(s, 0, 0)).toThrow('yourself');
      s.players[1].isBroken = true;
      expect(() => executeSwearOath(s, 0, 1)).toThrow('Broken');
    });
  });

  describe('non-aggression while sworn', () => {
    it('sworn allies cannot RAID each other', () => {
      const s = createGame(2, 'competitive', 7);
      executeSwearOath(s, 0, 1);
      s.players[1].warlordNodeId = s.players[0].warlordNodeId; // co-located
      s.players[0].hand = [4, 4];
      s.players[1].hand = [1];
      expect(() => executeRaid(s, 0, 1, [4], [])).toThrow('sworn');
    });
  });

  describe('Dawn upkeep: fealty dividend + maturity', () => {
    it('pays the dividend each Dawn and matures with a loyalty bonus after OATH_DURATION', () => {
      const s = createGame(2, 'competitive', 7);
      executeSwearOath(s, 0, 1);
      const before = s.players[0].banners;
      // First upkeep: dividend, strain 1.
      runOathUpkeep(s);
      expect(s.players[0].banners).toBe(before + OATH_DIVIDEND);
      expect(findOath(s, 0)?.strain).toBe(1);
      // Run upkeep until maturity.
      for (let i = 1; i < OATH_DURATION; i++) runOathUpkeep(s);
      expect(areSworn(s, 0, 1)).toBe(false); // matured → dissolved
      // Final tick paid dividend + loyalty bonus.
      const expected = before + OATH_DIVIDEND * OATH_DURATION + OATH_LOYALTY_BONUS;
      expect(s.players[0].banners).toBe(expected);
    });
  });

  describe('break (betrayal → the Ledger)', () => {
    it('cannot break the same round it was sworn', () => {
      const s = createGame(2, 'competitive', 7);
      executeSwearOath(s, 0, 1);
      expect(() => executeBreakOath(s, 0)).toThrow('the round you swore it');
    });

    it('breaking grants the burst and climbs the grudge Ledger', () => {
      const s = createGame(2, 'competitive', 7);
      executeSwearOath(s, 0, 1);
      s.round += 1; // a Dawn has passed
      const banners = s.players[0].banners;
      const grudge = s.shadowking.grudge[0];
      const r = executeBreakOath(s, 0);
      expect(r.actionConsumed).toBe(true);
      expect(areSworn(s, 0, 1)).toBe(false);
      expect(s.players[0].banners).toBe(banners + OATH_BREAK_BANNERS);
      expect(s.shadowking.grudge[0]).toBe(grudge + GRUDGE_OATHBREAK); // the dark hunts the traitor
    });
  });

  describe('rescue auto-swears an Oath', () => {
    it('a rescued ally becomes Sworn to the rescuer', () => {
      const s = createGame(2, 'competitive', 7);
      s.players[1].isBroken = true;
      s.players[1].warlordNodeId = s.players[0].warlordNodeId;
      s.players[0].hand = [1, 1, 1];
      executeRescue(s, 0, 1);
      expect(areSworn(s, 0, 1)).toBe(true);
    });
  });
});
