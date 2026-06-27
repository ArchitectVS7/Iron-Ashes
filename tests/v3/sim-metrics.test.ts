/**
 * Metrics tests (Stage 4d) — computeMetrics reads the REAL game, not a
 * re-implementation. Verified against full games + controlled event injection.
 */

import { describe, expect, it } from 'vitest';
import { playHeadlessGame } from '../../src/v3/sim/driver.js';
import { computeMetrics } from '../../src/v3/sim/metrics.js';

describe('computeMetrics', () => {
  it('derives consistent outcome flags from a real finished game', () => {
    const { finalState } = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    const m = computeMetrics(finalState);
    expect(m.gameEndReason).not.toBeNull();
    expect(m.rounds).toBeGreaterThan(0);
    expect(m.territoryPerSeat).toHaveLength(4);
    expect(m.meanPledgePerSeat).toHaveLength(4);
    // The outcome flags are mutually consistent with the end reason. A Shadowking win is
    // EITHER the Keystone assault (doom_complete) OR attrition (zero living Warlords, §6).
    expect(m.shadowkingWin).toBe(m.gameEndReason === 'doom_complete' || m.gameEndReason === 'attrition');
    expect(m.territoryWin).toBe(m.gameEndReason === 'territory_victory');
    expect(m.lastStandingWin).toBe(m.gameEndReason === 'last_standing');
    expect(m.attritionWin).toBe(m.gameEndReason === 'attrition');
    // Exactly one win CATEGORY fires; attritionWin is a sub-type of shadowkingWin, not a 5th.
    expect([m.shadowkingWin, m.territoryWin, m.gambitWin, m.lastStandingWin].filter(Boolean).length).toBe(1);
    if (m.attritionWin) expect(m.shadowkingWin).toBe(true);
  });

  it('counts PLAYER_ELIMINATED events from the action log', () => {
    const { finalState } = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    const before = computeMetrics(finalState).eliminations;
    finalState.actionLog.push({ type: 'PLAYER_ELIMINATED', playerIndex: 1, round: finalState.round });
    const after = computeMetrics(finalState);
    expect(after.eliminations).toBe(before + 1);
  });

  it('is deterministic for a fixed final state', () => {
    const { finalState } = playHeadlessGame({ seed: 11, playerCount: 4, mode: 'competitive' });
    expect(computeMetrics(finalState)).toEqual(computeMetrics(finalState));
  });
});
