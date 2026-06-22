/**
 * Reducer tests — validate the applyCommand entry point.
 *
 * Checks:
 *   - Commands validated against current phase
 *   - State immutability (original state not mutated)
 *   - Correct dispatch to phase handlers
 *   - Events emitted for each command
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v2/setup.js';
import { applyCommand, InvalidCommandError } from '../../src/v2/reducer.js';
import type { GameState } from '../../src/v2/types.js';

describe('applyCommand()', () => {
  describe('state immutability', () => {
    it('does not mutate the input state', () => {
      const state = createGame(4, 'competitive', 42);
      const originalPhase = state.phase;
      const originalRound = state.round;
      const originalTelegraph = state.shadowking.telegraph;

      // Apply a command
      const result = applyCommand(state, { type: 'ADVANCE_PHASE' });

      // Original state must be untouched
      expect(state.phase).toBe(originalPhase);
      expect(state.round).toBe(originalRound);
      expect(state.shadowking.telegraph).toBe(originalTelegraph);

      // Result state may be different
      expect(result.state).not.toBe(state);
    });

    it('returned state is a deep copy', () => {
      const state = createGame(4, 'competitive', 42);
      const result = applyCommand(state, { type: 'ADVANCE_PHASE' });

      // Mutating the result should not affect the original
      result.state.round = 999;
      expect(state.round).toBe(1);
    });
  });

  describe('command validation', () => {
    it('rejects commands after game over', () => {
      const state = createGame(4, 'competitive', 42);
      state.gameEndReason = 'territory_victory';
      state.winner = 0;

      expect(() => applyCommand(state, { type: 'ADVANCE_PHASE' }))
        .toThrow(InvalidCommandError);
    });

    it('rejects SUBMIT_PLEDGE outside PLEDGE phase', () => {
      const state = createGame(4, 'competitive', 42);
      // In THREAT phase
      expect(() =>
        applyCommand(state, { type: 'SUBMIT_PLEDGE', playerIndex: 0, amount: 0 }),
      ).toThrow(InvalidCommandError);
    });

    it('rejects PLAYER_ACTION outside ACTION phase', () => {
      const state = createGame(4, 'competitive', 42);
      expect(() =>
        applyCommand(state, {
          type: 'PLAYER_ACTION',
          playerIndex: 0,
          action: { type: 'PASS' },
        }),
      ).toThrow(InvalidCommandError);
    });

    it('LAST_STAND_COMMIT validates card count (placeholder pending UI wiring)', () => {
      const state = createGame(4, 'competitive', 42);
      // Over-committing more cards than are in hand is rejected.
      expect(() =>
        applyCommand(state, {
          type: 'LAST_STAND_COMMIT',
          playerIndex: 0,
          cardCount: 999,
        }),
      ).toThrow(InvalidCommandError);
      // A valid commit is accepted — Last Stand is resolved inline during combat;
      // this command is the placeholder for the future interactive sealed-commit flow.
      const result = applyCommand(state, {
        type: 'LAST_STAND_COMMIT',
        playerIndex: 0,
        cardCount: 1,
      });
      expect(result.events.some(e => e.type === 'PLAYER_ACTED')).toBe(true);
    });

    it('rejects invalid player index for pledge', () => {
      let state = createGame(4, 'competitive', 42);
      const result = applyCommand(state, { type: 'ADVANCE_PHASE' });
      state = result.state;

      expect(() =>
        applyCommand(state, { type: 'SUBMIT_PLEDGE', playerIndex: 99, amount: 0 }),
      ).toThrow(InvalidCommandError);
    });
  });

  describe('event emission', () => {
    it('ADVANCE_PHASE returns events', () => {
      const state = createGame(4, 'competitive', 42);
      const result = applyCommand(state, { type: 'ADVANCE_PHASE' });
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('SUBMIT_PLEDGE returns a PLEDGE_SUBMITTED event', () => {
      let state = createGame(4, 'competitive', 42);
      state = applyCommand(state, { type: 'ADVANCE_PHASE' }).state;

      const result = applyCommand(state, {
        type: 'SUBMIT_PLEDGE',
        playerIndex: 0,
        amount: 1,
      });

      expect(result.events.some(e => e.type === 'PLEDGE_SUBMITTED')).toBe(true);
    });

    it('PLAYER_ACTION PASS returns a PLAYER_ACTED event', () => {
      let state = createGame(4, 'competitive', 42);
      state = applyCommand(state, { type: 'ADVANCE_PHASE' }).state; // → PLEDGE
      for (const p of state.players) {
        state = applyCommand(state, {
          type: 'SUBMIT_PLEDGE',
          playerIndex: p.index,
          amount: 0,
        }).state;
      }
      state = applyCommand(state, { type: 'ADVANCE_PHASE' }).state; // → ACTION

      const activePlayer = state.activePlayerIndex;
      const result = applyCommand(state, {
        type: 'PLAYER_ACTION',
        playerIndex: activePlayer,
        action: { type: 'PASS' },
      });

      expect(result.events.some(e => e.type === 'PLAYER_ACTED')).toBe(true);
    });
  });

  describe('actionLog accumulation', () => {
    it('events accumulate in actionLog across commands', () => {
      let state = createGame(4, 'competitive', 42);

      // THREAT → PLEDGE
      state = applyCommand(state, { type: 'ADVANCE_PHASE' }).state;
      const afterThreat = state.actionLog.length;
      expect(afterThreat).toBeGreaterThan(0);

      // Submit a pledge
      state = applyCommand(state, {
        type: 'SUBMIT_PLEDGE',
        playerIndex: 0,
        amount: 0,
      }).state;
      expect(state.actionLog.length).toBeGreaterThan(afterThreat);
    });
  });

  describe('InvalidCommandError', () => {
    it('includes the command that failed', () => {
      const state = createGame(4, 'competitive', 42);
      state.gameEndReason = 'territory_victory';
      state.winner = 0;

      try {
        applyCommand(state, { type: 'ADVANCE_PHASE' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidCommandError);
        expect((e as InvalidCommandError).command.type).toBe('ADVANCE_PHASE');
      }
    });
  });
});
