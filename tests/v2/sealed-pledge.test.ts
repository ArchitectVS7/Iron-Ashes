/**
 * Sealed Pledge + risk-aware Gambit gate tests (Stage S — FOCUS-GROUP-R3 §3).
 *
 * SEALED_CORE_PLEDGE concealed-reveal in competitive (a HUMAN-facing info change —
 * the deterministic AI never reads rivals' pledges). The functional lever is the
 * risk-aware Gambit gate: under a sealed claimant pledge, the gambler only seizes
 * the Keystone if it can self-defend (GAMBIT_SELF_COVER_CARDS).
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v2/setup.js';
import { applyCommand } from '../../src/v2/reducer.js';
import { chooseAction } from '../../src/v2/ai-player.js';
import { policyOf } from '../../src/v2/sim/archetypes.js';
import { withTunables } from '../../src/v2/tunables.js';
import type { GameState } from '../../src/v2/types.js';

/** Drive a SUBMIT_PLEDGE through the reducer and return the emitted pledge event type. */
function pledgeEventType(state: GameState, playerIndex: number, amount: number): string {
  const r = applyCommand(state, { type: 'SUBMIT_PLEDGE', playerIndex, amount });
  const e = r.events.find(ev => ev.type === 'PLEDGE_COMMITTED' || ev.type === 'PLEDGE_SUBMITTED');
  return e?.type ?? 'NONE';
}

function inPledge(seed = 7): GameState {
  const s = createGame(3, 'competitive', seed);
  s.phase = 'PLEDGE';
  s.shadowking.telegraph = {
    effect: 'SPREAD', targetNodeId: 'approach-n', doomCost: 6,
    struckPlayerIndex: 0, steerQuadrant: 0, firstPersonLine: '',
  };
  return s;
}

describe('Sealed Pledge (Stage S)', () => {
  describe('conceal mode (SEALED_CORE_PLEDGE)', () => {
    it("'off' (default) reveals every competitive pledge openly", () => {
      const s = inPledge();
      expect(pledgeEventType(s, 0, 1)).toBe('PLEDGE_SUBMITTED');
    });

    it("'all' seals every competitive pledge", () => {
      const s = inPledge();
      withTunables({ SEALED_CORE_PLEDGE: 'all' }, () => {
        expect(pledgeEventType(s, 0, 1)).toBe('PLEDGE_COMMITTED');
      });
    });

    it("'gambit_claimant' seals only the named claimant; others stay open", () => {
      const s = inPledge();
      s.gambit = { claimant: 1, declaredRound: s.round, named: true };
      withTunables({ SEALED_CORE_PLEDGE: 'gambit_claimant' }, () => {
        expect(pledgeEventType(s, 1, 1)).toBe('PLEDGE_COMMITTED'); // the named claimant
        expect(pledgeEventType(s, 0, 1)).toBe('PLEDGE_SUBMITTED'); // a non-claimant
      });
    });
  });

  describe('risk-aware Gambit gate (GAMBIT_SELF_COVER_CARDS)', () => {
    const setup = (hand: number[]): GameState => {
      const s = createGame(3, 'competitive', 7);
      s.phase = 'ACTION';
      s.activePlayerIndex = 0;
      s.players[0].warlordNodeId = 'keep-n'; // keep-n → forge-nw → … → keystone
      s.players[0].banners = 5;
      s.players[0].hand = hand;
      return s;
    };
    // Count keystone-ward (gambit) marches over seeds; forge-nw is the spoke step.
    const centreMarches = (hand: number[], tun: Record<string, unknown>): number => {
      let n = 0;
      for (let seed = 0; seed < 30; seed++) {
        const a = withTunables(tun, () => chooseAction(setup(hand), 0, seed, policyOf('gambler')));
        if (a.type === 'MARCH' && a.targetNodeId === 'forge-nw') n++;
      }
      return n;
    };

    it('sealing + self-cover gates the thin-handed gambler off the Keystone', () => {
      const ungated = centreMarches([1, 1], { SEALED_CORE_PLEDGE: 'off' });                // gate off
      const gated = centreMarches([1, 1], { SEALED_CORE_PLEDGE: 'gambit_claimant', GAMBIT_SELF_COVER_CARDS: 4 });
      // The gate strictly reduces speculative Gambits (the gambit step is suppressed;
      // any residual claim-marches are identical in both arms).
      expect(gated).toBeLessThan(ungated);
    });

    it('a full-handed gambler is NOT gated (it can self-defend)', () => {
      const full = [4, 4, 3, 3, 2, 2];
      const ungated = centreMarches(full, { SEALED_CORE_PLEDGE: 'off' });
      const gated = centreMarches(full, { SEALED_CORE_PLEDGE: 'gambit_claimant', GAMBIT_SELF_COVER_CARDS: 4 });
      expect(gated).toBe(ungated); // hand ≥ self-cover ⇒ gate never trips
    });
  });
});
