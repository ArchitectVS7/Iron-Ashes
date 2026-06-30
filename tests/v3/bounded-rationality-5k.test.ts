/**
 * Stage 5k — bounded-rationality ("d20") AI noise knob.
 *
 * Contract (the prompt's HARD RULES):
 *   1. errorRate DEFAULT 0; at 0 the game is BYTE-IDENTICAL to the locked build — and crucially
 *      NO rng draw is consumed (so even a policy that carries `errorRate: 0` matches one without
 *      the field). Proven below by full-game JSON equality across the default brain AND archetypes.
 *   2. DETERMINISM (§7): same (playerCount, mode, seed, errorRate>0) ⇒ identical full game across
 *      two independent runs — for BOTH the table-wide and the per-seat application.
 *   3. The fallback is always LEGAL: a full game at errorRate=1 (EVERY decision fails its skill
 *      check) runs to a terminal state through the ONE reducer without a single rejected command,
 *      and choosePledge / chooseAction return only valid/legal moves.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { applyCommand } from '../../src/v3/reducer.js';
import { playHeadlessGame, type GameRunConfig } from '../../src/v3/sim/driver.js';
import {
  choosePledge, chooseAction, DEFAULT_AI_POLICY, type AIPolicy,
} from '../../src/v3/ai-player.js';
import { policyOf } from '../../src/v3/sim/archetypes.js';
import type { GameState } from '../../src/v3/types.js';

const json = (s: GameState): string => JSON.stringify(s);
const finalOf = (cfg: GameRunConfig): GameState => playHeadlessGame(cfg).finalState;

/** A varied 4-seat archetype table (exercises archetypeAction + choosePledge knobs). */
const ARCHETYPE_SEATS: AIPolicy[] = [
  policyOf('aggressor'), policyOf('cooperator'), policyOf('turtle'), policyOf('gambler'),
];

describe('Stage 5k — bounded-rationality knob', () => {
  describe('errorRate 0 ⇒ byte-identical to the locked build (no rng draw consumed)', () => {
    it('all-default game: omitting errorRate == errorRate:0 (table-wide)', () => {
      for (const seed of [1, 7, 42, 1000]) {
        const base = finalOf({ seed, playerCount: 4, mode: 'competitive' });
        const zero = finalOf({ seed, playerCount: 4, mode: 'competitive', errorRate: 0 });
        expect(json(zero)).toBe(json(base));
      }
    });

    it('archetype table: omitting errorRate == errorRate:0 (table-wide)', () => {
      for (const seed of [3, 99, 555]) {
        const base = finalOf({ seed, playerCount: 4, mode: 'competitive', seatPolicies: ARCHETYPE_SEATS });
        const zero = finalOf({ seed, playerCount: 4, mode: 'competitive', seatPolicies: ARCHETYPE_SEATS, errorRate: 0 });
        expect(json(zero)).toBe(json(base));
      }
    });

    it('per-seat errorRate:0 on the DEFAULT brain stays byte-identical (and on the baseline brain)', () => {
      // A default seat carrying `errorRate: 0` must NOT consume an rng draw and must NOT switch to
      // the archetype brain — full game equals the untouched all-default run.
      const seats: AIPolicy[] = [
        { ...DEFAULT_AI_POLICY, errorRate: 0 }, DEFAULT_AI_POLICY,
        { ...DEFAULT_AI_POLICY, errorRate: 0 }, DEFAULT_AI_POLICY,
      ];
      for (const seed of [2, 88, 321]) {
        const base = finalOf({ seed, playerCount: 4, mode: 'competitive' });
        const withZero = finalOf({ seed, playerCount: 4, mode: 'competitive', seatPolicies: seats });
        expect(json(withZero)).toBe(json(base));
      }
    });

    it('per-seat errorRate:0 on an archetype stays byte-identical', () => {
      const plain = ARCHETYPE_SEATS;
      const withZero: AIPolicy[] = ARCHETYPE_SEATS.map(p => ({ ...p, errorRate: 0 }));
      for (const seed of [5, 64, 700]) {
        const a = finalOf({ seed, playerCount: 4, mode: 'competitive', seatPolicies: plain });
        const b = finalOf({ seed, playerCount: 4, mode: 'competitive', seatPolicies: withZero });
        expect(json(b)).toBe(json(a));
      }
    });

    it('blood_pact mode is byte-identical at errorRate 0', () => {
      const base = finalOf({ seed: 42, playerCount: 4, mode: 'blood_pact', bloodPactSeat: 2 });
      const zero = finalOf({ seed: 42, playerCount: 4, mode: 'blood_pact', bloodPactSeat: 2, errorRate: 0 });
      expect(json(zero)).toBe(json(base));
    });
  });

  describe('determinism at errorRate > 0 (§7)', () => {
    it('table-wide errorRate>0: same (seed, errorRate) ⇒ identical full game across two runs', () => {
      for (const errorRate of [0.15, 0.4, 0.85]) {
        for (const seed of [11, 47, 909]) {
          const a = finalOf({ seed, playerCount: 4, mode: 'competitive', errorRate });
          const b = finalOf({ seed, playerCount: 4, mode: 'competitive', errorRate });
          expect(json(a)).toBe(json(b));
        }
      }
    });

    it('per-seat errorRate>0: identical across two runs (archetype table)', () => {
      const seats: AIPolicy[] = ARCHETYPE_SEATS.map((p, i) => ({ ...p, errorRate: 0.1 * (i + 1) }));
      for (const seed of [13, 256, 4096]) {
        const a = finalOf({ seed, playerCount: 4, mode: 'competitive', seatPolicies: seats });
        const b = finalOf({ seed, playerCount: 4, mode: 'competitive', seatPolicies: seats });
        expect(json(a)).toBe(json(b));
      }
    });

    it('errorRate>0 actually changes the game vs errorRate 0 (the noise is live)', () => {
      let anyDifferent = false;
      for (const seed of [1, 2, 3, 4, 5]) {
        const clean = finalOf({ seed, playerCount: 4, mode: 'competitive' });
        const noisy = finalOf({ seed, playerCount: 4, mode: 'competitive', errorRate: 0.5 });
        if (json(noisy) !== json(clean)) anyDifferent = true;
      }
      expect(anyDifferent).toBe(true);
    });

    it('the SAME errorRate with DIFFERENT seeds diverges (seeded, not constant)', () => {
      const a = finalOf({ seed: 1, playerCount: 4, mode: 'competitive', errorRate: 0.5 });
      const b = finalOf({ seed: 2, playerCount: 4, mode: 'competitive', errorRate: 0.5 });
      expect(json(a)).not.toBe(json(b));
    });
  });

  describe('the fallback is always LEGAL (no rejected command, no hang)', () => {
    it('errorRate=1 (every decision fails) still terminates through the reducer', () => {
      for (const playerCount of [2, 3, 4]) {
        for (const seed of [1, 50, 314]) {
          const run = playHeadlessGame({ seed, playerCount, mode: 'competitive', errorRate: 1 });
          expect(run.hitGuard).toBe(false); // reached a terminal gameEndReason
          expect(run.finalState.gameEndReason).not.toBeNull();
        }
      }
    });

    it('errorRate=1 on a full archetype + blood_pact table also terminates', () => {
      const run = playHeadlessGame({
        seed: 77, playerCount: 4, mode: 'blood_pact', bloodPactSeat: 2,
        seatPolicies: ARCHETYPE_SEATS, errorRate: 1,
      });
      expect(run.hitGuard).toBe(false);
      expect(run.finalState.gameEndReason).not.toBeNull();
    });
  });

  describe('choosePledge perturbation', () => {
    it('a failed pledge check returns a VALID amount in [0, handSize]', () => {
      // Advance a fresh game to the PLEDGE phase (telegraph present) and probe the chooser.
      let state = createGame(4, 'competitive', 42);
      state = applyCommand(state, { type: 'ADVANCE_PHASE' }).state; // THREAT → PLEDGE
      expect(state.phase).toBe('PLEDGE');
      const noisy: AIPolicy = { ...DEFAULT_AI_POLICY, errorRate: 1 };
      for (const p of state.players) {
        const amt = choosePledge(state, p.index, state.seed, noisy);
        expect(amt).toBeGreaterThanOrEqual(0);
        expect(amt).toBeLessThanOrEqual(p.hand.length);
        // The reducer accepts it (legal) — submit without throwing.
        expect(() => applyCommand(state, { type: 'SUBMIT_PLEDGE', playerIndex: p.index, amount: amt })).not.toThrow();
      }
    });

    it('errorRate 0 vs undefined: choosePledge identical (no draw)', () => {
      let state = createGame(3, 'competitive', 7);
      state = applyCommand(state, { type: 'ADVANCE_PHASE' }).state;
      for (const p of state.players) {
        const a = choosePledge(state, p.index, state.seed, DEFAULT_AI_POLICY);
        const b = choosePledge(state, p.index, state.seed, { ...DEFAULT_AI_POLICY, errorRate: 0 });
        expect(b).toBe(a);
      }
    });
  });

  describe('chooseAction legal fallback (direct)', () => {
    it('errorRate=1 returns a reducer-accepted action for every active turn of a round', () => {
      // Drive to the ACTION phase, then have each active player take its (failed-check) actions
      // through applyCommand — any illegal/no-op fallback would throw here.
      let state = createGame(4, 'competitive', 123);
      state = applyCommand(state, { type: 'ADVANCE_PHASE' }).state; // → PLEDGE
      for (const p of state.players) {
        state = applyCommand(state, { type: 'SUBMIT_PLEDGE', playerIndex: p.index, amount: 0 }).state;
      }
      state = applyCommand(state, { type: 'ADVANCE_PHASE' }).state; // → ACTION
      expect(state.phase).toBe('ACTION');
      const noisy: AIPolicy = { ...DEFAULT_AI_POLICY, errorRate: 1 };

      let guard = 0;
      while (state.phase === 'ACTION' && state.gameEndReason === null && guard < 100) {
        guard++;
        const active = state.activePlayerIndex;
        if (state.players[active].actionsRemaining <= 0) break;
        const action = chooseAction(state, active, state.seed, noisy);
        expect(() => {
          state = applyCommand(state, { type: 'PLAYER_ACTION', playerIndex: active, action }).state;
        }).not.toThrow();
      }
      expect(guard).toBeGreaterThan(0);
    });
  });
});
