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

// ─── Stage V3-4b: new-verb fire counts + defeat/discovery signals ──

describe('computeMetrics — V3-4b verb fire counts', () => {
  it('counts captures (RAID with a capture detail), ransoms, and heart assaults', () => {
    const { finalState } = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    const b = computeMetrics(finalState);
    finalState.actionLog.push(
      { type: 'PLAYER_ACTED', playerIndex: 0, action: 'RAID', details: { capture: 'm-1', owner: 1 } },
      { type: 'PLAYER_ACTED', playerIndex: 0, action: 'RAID', details: { rout: 'm-2', owner: 1 } }, // ROUT ≠ capture
      { type: 'PLAYER_ACTED', playerIndex: 0, action: 'RANSOM', details: { captive: 'm-1' } },
      { type: 'PLAYER_ACTED', playerIndex: 0, action: 'ASSAULT_HEART', details: { hit: 4 } },
    );
    const a = computeMetrics(finalState);
    expect(a.captures).toBe(b.captures + 1); // the ROUT must NOT count as a capture
    expect(a.ransoms).toBe(b.ransoms + 1);
    expect(a.heartAssaults).toBe(b.heartAssaults + 1);
  });

  it('records each elimination round + the Act in force, reconstructed from the chronological log', () => {
    const { finalState } = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    const before = computeMetrics(finalState).eliminationRounds.length;
    finalState.actionLog.push(
      { type: 'ACT_ESCALATED', previousAct: 'MARCH', newAct: 'RECKONING' },
      { type: 'PLAYER_ELIMINATED', playerIndex: 2, round: 12 },
    );
    const m = computeMetrics(finalState);
    expect(m.eliminationRounds.length).toBe(before + 1);
    expect(m.eliminationRounds.at(-1)).toBe(12);
    expect(m.eliminationActs.at(-1)).toBe('RECKONING');
    expect(m.earliestEliminationRound).toBe(Math.min(...m.eliminationRounds));
  });

  it('tallies the Discovery-flip outcome mix by kind', () => {
    const { finalState } = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    const b = computeMetrics(finalState).discoveryFlips;
    finalState.actionLog.push(
      { type: 'DISCOVERY_FLIPPED', nodeId: 'h1', playerIndex: 0, kind: 'recruit', retainerName: 'X' },
      { type: 'DISCOVERY_FLIPPED', nodeId: 'h2', playerIndex: 0, kind: 'death_knight', retainerName: null },
    );
    const a = computeMetrics(finalState).discoveryFlips;
    expect(a.recruit).toBe(b.recruit + 1);
    expect(a.death_knight).toBe(b.death_knight + 1);
    expect(a.blight_seed).toBe(b.blight_seed);
  });

  it('reads heartKilled from darkDefeated and classifies the dark-win path', () => {
    const { finalState } = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    finalState.shadowking.darkDefeated = true;
    expect(computeMetrics(finalState).heartKilled).toBe(true);

    finalState.gameEndReason = 'doom_complete';
    expect(computeMetrics(finalState).darkWinPath).toBe('doom_complete');
    finalState.gameEndReason = 'attrition';
    expect(computeMetrics(finalState).darkWinPath).toBe('attrition');
    finalState.gameEndReason = 'territory_victory';
    expect(computeMetrics(finalState).darkWinPath).toBeNull();
  });

  it('earliestEliminationRound is null when nobody was deposed', () => {
    const { finalState } = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'competitive' });
    finalState.actionLog = finalState.actionLog.filter(e => e.type !== 'PLAYER_ELIMINATED');
    const m = computeMetrics(finalState);
    expect(m.eliminationRounds).toHaveLength(0);
    expect(m.earliestEliminationRound).toBeNull();
  });
});
