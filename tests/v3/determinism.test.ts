/**
 * Determinism contract tests — ALGORITHM §7.
 *
 * The critical invariant:
 *   Same (playerCount, mode, seed, [scripted inputs]) ⇒ identical GameState.
 *
 * Checks:
 *   - Same seed → identical setup
 *   - Same seed + same commands → identical result
 *   - Different seeds → different states
 *   - No Math.random() anywhere in src/v3/
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { applyCommand } from '../../src/v3/reducer.js';
import type { Command } from '../../src/v3/commands.js';
import type { GameState } from '../../src/v3/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Deep equality check via JSON serialization. */
function statesEqual(a: GameState, b: GameState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Apply a sequence of commands to a state. */
function applySequence(state: GameState, commands: Command[]): GameState {
  for (const cmd of commands) {
    state = applyCommand(state, cmd).state;
  }
  return state;
}

describe('Determinism Contract (§7)', () => {
  describe('identical setup', () => {
    it('same seed → identical GameState for 4-player competitive', () => {
      const a = createGame(4, 'competitive', 42);
      const b = createGame(4, 'competitive', 42);
      expect(statesEqual(a, b)).toBe(true);
    });

    it('same seed → identical GameState for 2-player competitive', () => {
      const a = createGame(2, 'competitive', 999);
      const b = createGame(2, 'competitive', 999);
      expect(statesEqual(a, b)).toBe(true);
    });

    it('same seed → identical GameState for 3-player competitive', () => {
      const a = createGame(3, 'competitive', 12345);
      const b = createGame(3, 'competitive', 12345);
      expect(statesEqual(a, b)).toBe(true);
    });

    it('same seed → identical GameState for 4-player blood_pact', () => {
      const a = createGame(4, 'blood_pact', 42, 2);
      const b = createGame(4, 'blood_pact', 42, 2);
      expect(statesEqual(a, b)).toBe(true);
    });
  });

  describe('different seeds → different states', () => {
    it('different seeds produce different turn orders', () => {
      const a = createGame(4, 'competitive', 1);
      const b = createGame(4, 'competitive', 2);
      // Turn orders are shuffled from the seed — different seeds should
      // produce different orders (with very high probability).
      // We check multiple fields since a single one might collide.
      const aStr = JSON.stringify({
        turnOrder: a.turnOrder,
        hands: a.players.map(p => p.hand),
      });
      const bStr = JSON.stringify({
        turnOrder: b.turnOrder,
        hands: b.players.map(p => p.hand),
      });
      expect(aStr).not.toBe(bStr);
    });

    it('different seeds produce different player hands', () => {
      const a = createGame(4, 'competitive', 100);
      const b = createGame(4, 'competitive', 200);
      const aHands = a.players.map(p => p.hand);
      const bHands = b.players.map(p => p.hand);
      // Not all hands should be identical
      expect(JSON.stringify(aHands)).not.toBe(JSON.stringify(bHands));
    });
  });

  describe('same commands → identical result', () => {
    it('ADVANCE_PHASE produces identical results from identical states', () => {
      const a = createGame(4, 'competitive', 42);
      const b = createGame(4, 'competitive', 42);

      const resultA = applyCommand(a, { type: 'ADVANCE_PHASE' });
      const resultB = applyCommand(b, { type: 'ADVANCE_PHASE' });

      expect(statesEqual(resultA.state, resultB.state)).toBe(true);
    });

    it('a full round produces identical results from identical seeds', () => {
      const commands: Command[] = [
        { type: 'ADVANCE_PHASE' }, // THREAT → PLEDGE
      ];

      const a = createGame(4, 'competitive', 42);
      const b = createGame(4, 'competitive', 42);

      // Both should advance identically
      let stateA = applySequence(a, commands);
      let stateB = applySequence(b, commands);
      expect(statesEqual(stateA, stateB)).toBe(true);

      // Submit pledges identically
      for (let i = 0; i < 4; i++) {
        stateA = applyCommand(stateA, {
          type: 'SUBMIT_PLEDGE',
          playerIndex: i,
          amount: 0,
        }).state;
        stateB = applyCommand(stateB, {
          type: 'SUBMIT_PLEDGE',
          playerIndex: i,
          amount: 0,
        }).state;
      }
      expect(statesEqual(stateA, stateB)).toBe(true);

      // Advance to ACTION
      stateA = applyCommand(stateA, { type: 'ADVANCE_PHASE' }).state;
      stateB = applyCommand(stateB, { type: 'ADVANCE_PHASE' }).state;
      expect(statesEqual(stateA, stateB)).toBe(true);
    });

    it('pledge resolution is deterministic (seat-order processing)', () => {
      let a = createGame(4, 'competitive', 42);
      let b = createGame(4, 'competitive', 42);

      // Advance to PLEDGE
      a = applyCommand(a, { type: 'ADVANCE_PHASE' }).state;
      b = applyCommand(b, { type: 'ADVANCE_PHASE' }).state;

      // Submit pledges in DIFFERENT order but same amounts
      // Game A: player 0, 1, 2, 3
      for (let i = 0; i < 4; i++) {
        a = applyCommand(a, { type: 'SUBMIT_PLEDGE', playerIndex: i, amount: 1 }).state;
      }
      // Game B: player 3, 2, 1, 0 (reverse order)
      for (let i = 3; i >= 0; i--) {
        b = applyCommand(b, { type: 'SUBMIT_PLEDGE', playerIndex: i, amount: 1 }).state;
      }

      // Resolve. The RESOLVED mechanical state (board, hands, pledgeHistory, doom) must be
      // identical regardless of submission order, because resolution processes pledges in
      // seat order. The chronological actionLog legitimately differs (a different submission
      // order is a different event journal), so we compare state excluding the log.
      a = applyCommand(a, { type: 'ADVANCE_PHASE' }).state;
      b = applyCommand(b, { type: 'ADVANCE_PHASE' }).state;

      const stripLog = (s: GameState): GameState => ({ ...s, actionLog: [] });
      expect(statesEqual(stripLog(a), stripLog(b))).toBe(true);
    });
  });

  describe('no Math.random() in src/v3/', () => {
    it('no file in src/v3/ uses Math.random()', () => {
      const v3Dir = path.resolve(__dirname, '../../src/v3');
      const files = fs.readdirSync(v3Dir).filter(f => f.endsWith('.ts'));

      for (const file of files) {
        const raw = fs.readFileSync(path.join(v3Dir, file), 'utf-8');
        // Strip comments before scanning — we check CODE, not documentation.
        // (reducer.ts has a comment mentioning "Math.random()" that must not false-positive.)
        const code = raw
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '');
        expect(
          code.includes('Math.random'),
          `${file} contains Math.random() — violates determinism contract §7.1`,
        ).toBe(false);
      }
    });
  });

  describe('mode isolation', () => {
    it('same seed, different modes produce different Blood Pact states', () => {
      const comp = createGame(4, 'competitive', 42, 2);
      const bp = createGame(4, 'blood_pact', 42, 2);

      expect(comp.bloodPactHolder).toBeNull();
      expect(bp.bloodPactHolder).not.toBeNull();
    });
  });

  describe('state field completeness', () => {
    it('GameState has all required top-level fields from spec §2', () => {
      const state = createGame(4, 'competitive', 42);

      // Every field from the spec's GameState shape
      expect(state).toHaveProperty('seed');
      expect(state).toHaveProperty('round');
      expect(state).toHaveProperty('act');
      expect(state).toHaveProperty('phase');
      expect(state).toHaveProperty('players');
      expect(state).toHaveProperty('board');
      expect(state).toHaveProperty('shadowking');
      expect(state).toHaveProperty('crownHolder');
      expect(state).toHaveProperty('pledgeBuffer');
      expect(state).toHaveProperty('pledgeHistory');
      expect(state).toHaveProperty('activePlayerIndex');
      expect(state).toHaveProperty('turnOrder');
      expect(state).toHaveProperty('gameEndReason');
      expect(state).toHaveProperty('winner');
      expect(state).toHaveProperty('bloodPactHolder');
      expect(state).toHaveProperty('suspicionLog');
      expect(state).toHaveProperty('accusationState');
      expect(state).toHaveProperty('actionLog');
      expect(state).toHaveProperty('mode');
      expect(state).toHaveProperty('gambit');
    });

    it('ShadowkingState has all required fields', () => {
      const state = createGame(4, 'competitive', 42);
      expect(state.shadowking).toHaveProperty('forces');
      expect(state.shadowking).toHaveProperty('telegraph');
      expect(state.shadowking).toHaveProperty('grudge');
      expect(state.shadowking).toHaveProperty('patience');
    });

    it('PlayerState has all required fields', () => {
      const state = createGame(4, 'competitive', 42);
      for (const p of state.players) {
        expect(p).toHaveProperty('index');
        expect(p).toHaveProperty('type');
        expect(p).toHaveProperty('isBroken');
        expect(p).toHaveProperty('brokenSince');
        expect(p).toHaveProperty('brokenRoundsConsecutive');
        expect(p).toHaveProperty('hand');
        expect(p).toHaveProperty('banners');
        expect(p).toHaveProperty('crownHeld');
        expect(p).toHaveProperty('wounds');
        expect(p).toHaveProperty('actionsRemaining');
        expect(p).toHaveProperty('warlordNodeId');
        expect(p).toHaveProperty('hasBloodPact');
      }
    });
  });
});
