/**
 * Sweep tests (Stage 4c) — a FAST smoke sweep proving the matchup→sweep wiring
 * and its determinism. The expensive full sweep is the 4e CLI script, not a test.
 */

import { describe, expect, it } from 'vitest';
import { runSweep } from '../../src/v2/sim/sweep.js';
import { MIXED_CANONICAL, homogeneous, roundRobin, oneVsField, standardMatchups } from '../../src/v2/sim/matchups.js';

describe('runSweep', () => {
  it('produces one measured row per (seed × count × mode × matchup) cell', () => {
    const rows = runSweep({
      seeds: [1, 2, 3],
      playerCounts: [4],
      modes: ['competitive'],
      matchups: [MIXED_CANONICAL, homogeneous('aggressor')],
    });
    expect(rows).toHaveLength(3 * 1 * 1 * 2);
    for (const r of rows) {
      expect(r.hitGuard).toBe(false);
      expect(r.metrics.gameEndReason).not.toBeNull();
      expect(r.seatArchetypes).toHaveLength(4);
    }
  });

  it('is deterministic — same config ⇒ identical rows', () => {
    const cfg = { seeds: [5, 6], playerCounts: [4] as const, modes: ['competitive'] as const, matchups: [MIXED_CANONICAL] };
    expect(JSON.stringify(runSweep(cfg))).toBe(JSON.stringify(runSweep(cfg)));
  });

  it('matchups assign seats deterministically and within the roster', () => {
    expect(roundRobin('aggressor', 'turtle').seatsFor(4)).toEqual(['aggressor', 'turtle', 'aggressor', 'turtle']);
    expect(oneVsField('gambler').seatsFor(3)).toEqual(['gambler', 'baseline', 'baseline']);
    expect(homogeneous('cooperator').seatsFor(2)).toEqual(['cooperator', 'cooperator']);
    expect(standardMatchups().length).toBeGreaterThan(5);
  });
});
