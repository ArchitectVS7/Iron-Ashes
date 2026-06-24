/**
 * Stage B — the sealed-pledge bail-out / volunteer's dilemma.
 *
 * The seal was a SIM NO-OP (the AI never read rivals' pledges). This gives the sim a
 * behavioural channel: a rival may pledge EXTRA to bail out a named Gambit claimant.
 * The seal changes HOW it fires — OPEN coordinates (one designated coverer), SEALED is
 * an independent bluff. These tests prove the channel is live AND that DEFAULT_AI_POLICY
 * (no bailoutTrust) is byte-identical (a gambit never perturbs its pledge).
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v2/setup.js';
import { applyCommand } from '../../src/v2/reducer.js';
import { choosePledge, DEFAULT_AI_POLICY } from '../../src/v2/ai-player.js';
import { withTunables } from '../../src/v2/tunables.js';
import type { GameState, GambitState } from '../../src/v2/types.js';

/** PLEDGE phase with a comfortable hand for player 0 and the dark aimed at player 1. */
function setup(): GameState {
  const state = applyCommand(createGame(4, 'competitive', 7, 0), { type: 'ADVANCE_PHASE' }).state;
  state.players[0].hand = [3, 3, 3, 3, 3, 3];
  const tg = state.shadowking.telegraph!;
  state.shadowking.telegraph = { ...tg, struckPlayerIndex: 1 }; // player 0 is NOT in danger
  return state;
}

/** Name a Gambit with `claimant` as the seizer. */
function withGambit(state: GameState, claimant: number): GameState {
  const gambit: GambitState = { claimant, declaredRound: state.round, named: true };
  return { ...state, gambit };
}

describe('Stage B — sealed-pledge bail-out (volunteer\'s dilemma)', () => {
  it('a high-trust rival bails out a SEALED claimant (pledges extra)', () => {
    const state = withGambit(setup(), 1); // claimant = player 1, sealed by default
    withTunables({ BAILOUT_BASE_PCT: 1 }, () => {
      const bailing = choosePledge(state, 0, 7, { ...DEFAULT_AI_POLICY, bailoutTrust: 1 });
      const notBailing = choosePledge(state, 0, 7, { ...DEFAULT_AI_POLICY, bailoutTrust: 0 });
      expect(bailing).toBeGreaterThan(notBailing);
    });
  });

  it('DEFAULT_AI_POLICY never bails — a named Gambit does not perturb its pledge (byte-identical)', () => {
    const base = setup();
    const withG = withGambit(base, 1);
    expect(choosePledge(withG, 0, 7, DEFAULT_AI_POLICY)).toBe(choosePledge(base, 0, 7, DEFAULT_AI_POLICY));
  });

  it('OPEN play coordinates: only the designated (most-cards) rival covers', () => {
    const state = withGambit(setup(), 1);
    // Player 0 holds the most cards → it is the single designated coverer; player 2 is not.
    state.players[2].hand = [3, 3];
    withTunables({ SEALED_CORE_PLEDGE: 'off' }, () => {
      const p0 = choosePledge(state, 0, 7, { ...DEFAULT_AI_POLICY, bailoutTrust: 1 });
      const p0NoTrust = choosePledge(state, 0, 7, { ...DEFAULT_AI_POLICY, bailoutTrust: 0 });
      const p2 = choosePledge(state, 2, 7, { ...DEFAULT_AI_POLICY, bailoutTrust: 1 });
      const p2NoTrust = choosePledge(state, 2, 7, { ...DEFAULT_AI_POLICY, bailoutTrust: 0 });
      expect(p0).toBeGreaterThan(p0NoTrust);   // designated coverer bails
      expect(p2).toBe(p2NoTrust);              // a non-designated rival does not (no waste)
    });
  });
});
