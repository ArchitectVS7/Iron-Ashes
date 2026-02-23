/**
 * Tests for Balance Testing & Simulation (Phase 19)
 */

import { describe, it, expect } from 'vitest';
import {
  runSimulation,
  runBatchSimulation,
  simulateRound,
  simulatePlayerAction,
} from '../../src/engine/simulation.js';
import { createGameState } from '../../src/engine/game-loop.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';

describe('runSimulation', () => {
  it('should complete without error', () => {
    const result = runSimulation(1);
    expect(result).toBeDefined();
    expect(result.seed).toBe(1);
  });

  it('should be deterministic (same seed = same result)', () => {
    const result1 = runSimulation(42);
    const result2 = runSimulation(42);
    expect(result1.rounds).toBe(result2.rounds);
    expect(result1.winner).toBe(result2.winner);
    expect(result1.gameEndReason).toBe(result2.gameEndReason);
    expect(result1.doomTollFinal).toBe(result2.doomTollFinal);
    expect(result1.doomTollPeak).toBe(result2.doomTollPeak);
  });

  it('should produce different results with different seeds', () => {
    const results = [];
    for (let seed = 1; seed <= 10; seed++) {
      results.push(runSimulation(seed));
    }
    // Not all rounds should be identical
    const rounds = new Set(results.map(r => r.rounds));
    expect(rounds.size).toBeGreaterThan(1);
  });

  it('should end within 50 rounds', () => {
    const result = runSimulation(1);
    expect(result.rounds).toBeLessThanOrEqual(50);
    expect(result.rounds).toBeGreaterThan(0);
  });

  it('should always set a gameEndReason', () => {
    const result = runSimulation(1);
    expect(result.gameEndReason).not.toBeNull();
  });

  it('should track doom toll peak', () => {
    const result = runSimulation(42);
    expect(result.doomTollPeak).toBeGreaterThanOrEqual(0);
    expect(result.doomTollPeak).toBeLessThanOrEqual(13);
    expect(result.doomTollPeak).toBeGreaterThanOrEqual(result.doomTollFinal);
  });

  it('should have stronghold counts for all players', () => {
    const result = runSimulation(42, 4);
    expect(result.strongholdCounts.length).toBe(4);
    for (const count of result.strongholdCounts) {
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  it('should work with 2 players', () => {
    const result = runSimulation(42, 2);
    expect(result.strongholdCounts.length).toBe(2);
  });

  it('should work with 3 players', () => {
    const result = runSimulation(42, 3);
    expect(result.strongholdCounts.length).toBe(3);
  });
});

describe('simulateRound', () => {
  it('should advance the round counter', () => {
    const state = createGameState(4, 'competitive', 42);
    const rng = new SeededRandom(42);
    const startRound = state.round;
    simulateRound(state, rng);
    expect(state.round).toBeGreaterThan(startRound);
  });

  it('should not execute if game is over', () => {
    const state = createGameState(4, 'competitive', 42);
    state.gameEndReason = 'doom_complete';
    const rng = new SeededRandom(42);
    const roundBefore = state.round;
    simulateRound(state, rng);
    expect(state.round).toBe(roundBefore);
  });
});

describe('simulatePlayerAction', () => {
  it('should exhaust player actions', () => {
    const state = createGameState(4, 'competitive', 42);
    const rng = new SeededRandom(42);
    state.players[0].actionsRemaining = 2;
    simulatePlayerAction(state, 0, rng);
    expect(state.players[0].actionsRemaining).toBe(0);
  });

  it('should do nothing for player with no actions', () => {
    const state = createGameState(4, 'competitive', 42);
    const rng = new SeededRandom(42);
    state.players[0].actionsRemaining = 0;
    const nodeBefore = state.players[0].fellowship.currentNode;
    simulatePlayerAction(state, 0, rng);
    expect(state.players[0].fellowship.currentNode).toBe(nodeBefore);
  });
});

describe('runBatchSimulation', () => {
  it('should run the specified number of simulations', () => {
    const result = runBatchSimulation(5);
    expect(result.simulations).toBe(5);
  });

  it('should compute averages', () => {
    const result = runBatchSimulation(10);
    expect(result.avgRounds).toBeGreaterThan(0);
    expect(result.avgDoomPeak).toBeGreaterThanOrEqual(0);
    expect(result.shadowkingWinRate).toBeGreaterThanOrEqual(0);
    expect(result.shadowkingWinRate).toBeLessThanOrEqual(1);
  });

  it('should handle count of 0', () => {
    const result = runBatchSimulation(0);
    expect(result.simulations).toBe(0);
    expect(result.avgRounds).toBe(0);
    expect(result.shadowkingWinRate).toBe(0);
  });

  it('should produce consistent results for same start seed', () => {
    const result1 = runBatchSimulation(5, 100);
    const result2 = runBatchSimulation(5, 100);
    expect(result1.avgRounds).toBe(result2.avgRounds);
    expect(result1.shadowkingWinRate).toBe(result2.shadowkingWinRate);
  });
});
