/**
 * Metrics tests (Stage 4d) — computeMetrics reads the REAL game, not a
 * re-implementation. Verified against full games + controlled event injection.
 */

import { describe, expect, it } from 'vitest';
import { playHeadlessGame } from '../../src/v2/sim/driver.js';
import { computeMetrics } from '../../src/v2/sim/metrics.js';

describe('computeMetrics', () => {
  it('derives consistent outcome flags from a real finished game', () => {
    const { finalState } = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    const m = computeMetrics(finalState);
    expect(m.gameEndReason).not.toBeNull();
    expect(m.rounds).toBeGreaterThan(0);
    expect(m.territoryPerSeat).toHaveLength(4);
    expect(m.meanPledgePerSeat).toHaveLength(4);
    // The outcome flags are mutually consistent with the end reason. A Shadowking win is
    // EITHER the Keystone assault (doom_complete) OR attrition (all_broken) (§A).
    expect(m.shadowkingWin).toBe(m.gameEndReason === 'doom_complete' || m.gameEndReason === 'all_broken');
    expect(m.territoryWin).toBe(m.gameEndReason === 'territory_victory');
    expect(m.allBrokenWin).toBe(m.gameEndReason === 'all_broken');
    // Exactly one win CATEGORY fires; allBrokenWin is a sub-type of shadowkingWin, not a 4th.
    expect([m.shadowkingWin, m.territoryWin, m.gambitWin].filter(Boolean).length).toBe(1);
    if (m.allBrokenWin) expect(m.shadowkingWin).toBe(true);
  });

  it('counts RESCUE and Broken events from the action log', () => {
    const { finalState } = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    const before = computeMetrics(finalState).rescueCount;
    finalState.actionLog.push({ type: 'PLAYER_ACTED', playerIndex: 0, action: 'RESCUE', details: {} });
    finalState.actionLog.push({ type: 'PLAYER_ACTED', playerIndex: 1, action: 'PASS', details: { broken: true } });
    const after = computeMetrics(finalState);
    expect(after.rescueCount).toBe(before + 1);
    expect(after.brokenCount).toBeGreaterThanOrEqual(1);
  });

  it('is deterministic for a fixed final state', () => {
    const { finalState } = playHeadlessGame({ seed: 11, playerCount: 4, mode: 'competitive' });
    expect(computeMetrics(finalState)).toEqual(computeMetrics(finalState));
  });
});
