/**
 * Tests for Game Modes System (F-011)
 */

import { describe, it, expect } from 'vitest';
import { createGameState } from '../../src/engine/game-loop.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import {
  assignBloodPact,
  canAccuse,
  performAccusation,
  isPvPCombatAllowed,
  hasBloodPactCard,
  getModeName,
  ACCUSATION_COST,
} from '../../src/systems/game-modes.js';

describe('assignBloodPact', () => {
  it('should assign blood pact to a human player in blood_pact mode', () => {
    const state = createGameState(4, 'blood_pact', 42);
    const rng = new SeededRandom(99);
    const holder = assignBloodPact(state, rng);
    expect(holder).toBeGreaterThanOrEqual(0);
    expect(holder).toBeLessThan(4);
    expect(state.players[holder].hasBloodPact).toBe(true);
  });

  it('should return -1 in competitive mode', () => {
    const state = createGameState(4, 'competitive', 42);
    const rng = new SeededRandom(99);
    expect(assignBloodPact(state, rng)).toBe(-1);
  });

  it('should return -1 in cooperative mode', () => {
    const state = createGameState(4, 'cooperative', 42);
    const rng = new SeededRandom(99);
    expect(assignBloodPact(state, rng)).toBe(-1);
  });

  it('should only assign to one player', () => {
    const state = createGameState(4, 'blood_pact', 42);
    const rng = new SeededRandom(99);
    assignBloodPact(state, rng);
    const holders = state.players.filter(p => p.hasBloodPact);
    expect(holders.length).toBe(1);
  });

  it('should be deterministic from seed', () => {
    const state1 = createGameState(4, 'blood_pact', 42);
    const state2 = createGameState(4, 'blood_pact', 42);
    const holder1 = assignBloodPact(state1, new SeededRandom(99));
    const holder2 = assignBloodPact(state2, new SeededRandom(99));
    expect(holder1).toBe(holder2);
  });
});

describe('ACCUSATION_COST', () => {
  it('should be 2 fate cards per accuser', () => {
    expect(ACCUSATION_COST).toBe(2);
  });
});

describe('canAccuse', () => {
  it('should return accuser indices when all can afford', () => {
    const state = createGameState(4, 'blood_pact', 42);
    for (const p of state.players) {
      p.fateCards = [1, 2, 3];
    }
    const accusers = canAccuse(state, 2);
    expect(accusers).not.toBeNull();
    expect(accusers!.sort()).toEqual([0, 1, 3]);
  });

  it('should return null if any accuser lacks cards', () => {
    const state = createGameState(4, 'blood_pact', 42);
    for (const p of state.players) {
      p.fateCards = [1, 2, 3];
    }
    state.players[0].fateCards = [1]; // Only 1, needs 2
    expect(canAccuse(state, 2)).toBeNull();
  });

  it('should return null in competitive mode', () => {
    const state = createGameState(4, 'competitive', 42);
    for (const p of state.players) p.fateCards = [1, 2, 3];
    expect(canAccuse(state, 0)).toBeNull();
  });

  it('should return null for invalid target index', () => {
    const state = createGameState(4, 'blood_pact', 42);
    expect(canAccuse(state, 99)).toBeNull();
  });
});

describe('performAccusation', () => {
  it('should reveal blood pact holder and return true', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    const result = performAccusation(state, 2);
    expect(result).toBe(true);
    expect(state.players[2].bloodPactRevealed).toBe(true);
  });

  it('should spend cards from all accusers on correct accusation', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    performAccusation(state, 2);
    // Accusers (0, 1, 3) each spent 2 cards
    expect(state.players[0].fateCards.length).toBe(1);
    expect(state.players[1].fateCards.length).toBe(1);
    expect(state.players[3].fateCards.length).toBe(1);
    // Target not charged
    expect(state.players[2].fateCards.length).toBe(3);
  });

  it('should return false for wrong target but still spend cards', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    const result = performAccusation(state, 1); // Wrong target
    expect(result).toBe(false);
    expect(state.players[1].bloodPactRevealed).toBe(false);
    // Cards still spent by accusers (0, 2, 3)
    expect(state.players[0].fateCards.length).toBe(1);
  });

  it('should log the accusation', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    const logBefore = state.actionLog.length;
    performAccusation(state, 2);
    expect(state.actionLog.length).toBe(logBefore + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('blood-pact-accusation');
  });

  it('should return false when canAccuse fails', () => {
    const state = createGameState(4, 'competitive', 42);
    expect(performAccusation(state, 0)).toBe(false);
  });
});

describe('isPvPCombatAllowed', () => {
  it('should be true in competitive mode', () => {
    const state = createGameState(2, 'competitive', 42);
    expect(isPvPCombatAllowed(state)).toBe(true);
  });

  it('should be true in blood_pact mode', () => {
    const state = createGameState(2, 'blood_pact', 42);
    expect(isPvPCombatAllowed(state)).toBe(true);
  });

  it('should be false in cooperative mode', () => {
    const state = createGameState(2, 'cooperative', 42);
    expect(isPvPCombatAllowed(state)).toBe(false);
  });
});

describe('hasBloodPactCard', () => {
  it('should return true only for blood_pact mode', () => {
    expect(hasBloodPactCard('blood_pact')).toBe(true);
    expect(hasBloodPactCard('competitive')).toBe(false);
    expect(hasBloodPactCard('cooperative')).toBe(false);
  });
});

describe('getModeName', () => {
  it('should return display names', () => {
    expect(getModeName('competitive')).toBe('Competitive');
    expect(getModeName('blood_pact')).toBe('Blood Pact');
    expect(getModeName('cooperative')).toBe('Cooperative');
  });
});
