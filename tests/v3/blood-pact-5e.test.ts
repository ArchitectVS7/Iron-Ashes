/**
 * Stage 5e — Blood Pact: the cover-vs-sabotage bluff + the sharpened suspicion signal +
 * the mode-gated dark bonus (competitive must stay byte-identical).
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { applyCommand } from '../../src/v3/reducer.js';
import { choosePledge } from '../../src/v3/ai-player.js';
import { policyOf } from '../../src/v3/sim/archetypes.js';
import { suspicionScore } from '../../src/v3/blood-pact.js';
import { resolveStrike } from '../../src/v3/blight.js';
import { withTunables } from '../../src/v3/tunables.js';
import type { GameState } from '../../src/v3/types.js';

/** A blood_pact PLEDGE state with player 0 as the traitor, dark aimed elsewhere, a full hand. */
function traitorAtPledge(): GameState {
  const state = applyCommand(createGame(4, 'blood_pact', 7, 0), { type: 'ADVANCE_PHASE' }).state;
  state.players.forEach(p => { p.hasBloodPact = p.index === 0; });
  state.bloodPactHolder = 0;
  state.players[0].hand = [3, 3, 3, 3, 3, 3];
  const tg = state.shadowking.telegraph!;
  state.shadowking.telegraph = { ...tg, struckPlayerIndex: 1 };
  return state;
}

describe('Stage 5e — the cover-vs-sabotage bluff', () => {
  it('high SABOTEUR_COVER makes the traitor pledge MORE (blend) than low cover (sabotage)', () => {
    const state = traitorAtPledge();
    const pol = policyOf('saboteur');
    const blend = withTunables({ SABOTEUR_COVER: 1 }, () => choosePledge(state, 0, 7, pol));
    const sabotage = withTunables({ SABOTEUR_COVER: 0 }, () => choosePledge(state, 0, 7, pol));
    expect(blend).toBeGreaterThan(sabotage);
  });

  it('the cover pledge lands in the medium tier (invisible to the Suspicion Log)', () => {
    const state = traitorAtPledge();
    const pol = policyOf('saboteur');
    const blend = withTunables({ SABOTEUR_COVER: 1 }, () => choosePledge(state, 0, 7, pol));
    // hand of 6 → medium tier is ratio >= 0.3 → >= 2 cards.
    expect(blend / state.players[0].hand.length).toBeGreaterThanOrEqual(0.3);
  });
});

describe('Stage 5e — the sharpened suspicion signal', () => {
  it("only 'none' pledges accrue suspicion; 'low' (honest thrift) does not", () => {
    const state = createGame(4, 'blood_pact', 7, 0);
    state.suspicionLog = [
      [{ playerIndex: 1, amount: 0, tier: 'none' }],
      [{ playerIndex: 2, amount: 1, tier: 'low' }],
      [{ playerIndex: 1, amount: 0, tier: 'none' }],
    ];
    expect(suspicionScore(state, 1)).toBe(4); // two 'none' → +2 each
    expect(suspicionScore(state, 2)).toBe(0); // a 'low' is invisible
  });
});

describe('Stage 5e — the dark bonus is Blood-Pact only (competitive byte-identical)', () => {
  it('BLOOD_PACT_SPREAD_BONUS does not affect a COMPETITIVE strike', () => {
    const totalBlight = (s: GameState): number =>
      Object.values(s.board.state.nodes).reduce((n, ns) => n + ns.blightLevel, 0);
    const run = (bonus: number): number => {
      const s = createGame(4, 'competitive', 7);
      const before = totalBlight(s);
      const { state: after } = withTunables({ BLOOD_PACT_SPREAD_BONUS: bonus },
        () => resolveStrike(s, 0, 0));
      return totalBlight(after) - before;
    };
    expect(run(9)).toBe(run(0)); // competitive ignores the BP bonus
  });
});
