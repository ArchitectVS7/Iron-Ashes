/**
 * Report tests (Stage 4d) — the PASS/FAIL + dominance + free-rider verdict logic
 * on synthetic sweep rows, so the report's judgments are themselves trustworthy.
 */

import { describe, expect, it } from 'vitest';
import { summarize, renderMarkdown } from '../../src/v2/sim/report.js';
import type { SweepRow } from '../../src/v2/sim/sweep.js';
import type { GameMetrics } from '../../src/v2/sim/metrics.js';
import type { ArchetypeId } from '../../src/v2/sim/archetypes.js';

function mkMetrics(p: Partial<GameMetrics> & { winner: number | null }): GameMetrics {
  return {
    gameEndReason: p.winner === null ? 'doom_complete' : 'territory_victory',
    winner: p.winner,
    rounds: p.rounds ?? 13,
    actReached: 'MARCH',
    shadowkingWin: p.shadowkingWin ?? (p.winner === null),
    territoryWin: p.winner !== null,
    gambitWin: false,
    allBrokenDraw: false,
    gambitSeized: p.gambitSeized ?? false,
    rescueCount: p.rescueCount ?? 3,
    brokenCount: p.brokenCount ?? 0,
    territoryPerSeat: p.territoryPerSeat ?? [0, 0, 0, 0],
    meanPledgePerSeat: p.meanPledgePerSeat ?? [1, 1, 1, 1],
    isBloodPact: false,
    traitorWin: false,
    traitorExposed: false,
    accusationsResolved: 0,
    accusationsCorrect: 0,
    dkKills: p.dkKills ?? 0,
    ashedNodes: p.ashedNodes ?? 0,
    pledgeRounds: p.pledgeRounds ?? 10,
    pledgeFullBlocks: p.pledgeFullBlocks ?? 0,
  };
}

function mkRow(seats: ArchetypeId[], m: GameMetrics): SweepRow {
  return { seed: 0, playerCount: seats.length, mode: 'competitive', matchupId: 'test', seatArchetypes: seats, steps: 10, hitGuard: false, metrics: m };
}

const SEATS: ArchetypeId[] = ['aggressor', 'turtle', 'opportunist', 'cooperator'];

describe('summarize', () => {
  it('passes the Shadowking-win check at 20% and fails it at 50%', () => {
    const balanced: SweepRow[] = Array.from({ length: 10 }, (_, i) =>
      mkRow(SEATS, mkMetrics({ winner: i < 2 ? null : i % 4 })),
    );
    const sumOk = summarize(balanced);
    expect(sumOk.checks.find(c => c.name.startsWith('Shadowking'))!.measured).toBeCloseTo(0.2);
    expect(sumOk.checks.find(c => c.name.startsWith('Shadowking'))!.pass).toBe(true);

    const tooHard: SweepRow[] = Array.from({ length: 10 }, (_, i) => mkRow(SEATS, mkMetrics({ winner: i < 5 ? null : i % 4 })));
    expect(summarize(tooHard).checks.find(c => c.name.startsWith('Shadowking'))!.pass).toBe(false);
  });

  it('flags a dominant archetype', () => {
    // 'aggressor' (seat 0) wins every game → its per-seat win rate dwarfs even share.
    const rows: SweepRow[] = Array.from({ length: 40 }, () => mkRow(SEATS, mkMetrics({ winner: 0 })));
    const s = summarize(rows);
    expect(s.dominancePass).toBe(false);
    expect(s.dominantArchetype).toBe('aggressor');
  });

  it('reports a balanced field as no-dominance', () => {
    const rows: SweepRow[] = Array.from({ length: 40 }, (_, i) => mkRow(SEATS, mkMetrics({ winner: i % 4 })));
    expect(summarize(rows).dominancePass).toBe(true);
  });

  it('detects free-riding being rewarded (winners pledge less)', () => {
    // Winner seat 0 pledges 0; the field pledges 3 → free-riding pays.
    const rows: SweepRow[] = Array.from({ length: 12 }, () =>
      mkRow(SEATS, mkMetrics({ winner: 0, meanPledgePerSeat: [0, 3, 3, 3] })),
    );
    expect(summarize(rows).freeRider.freeRidingRewarded).toBe(true);
  });

  it('computes the Stage-5 diagnostics (conditional rescue rate, gambler-free gambit, per-count)', () => {
    // 12 games: 6 with a gambler (3 seized), 6 without (1 seized); breaks/rescues controlled.
    const withG: ArchetypeId[] = ['gambler', 'turtle', 'opportunist', 'cooperator'];
    const rows: SweepRow[] = [
      ...Array.from({ length: 6 }, (_, i) => mkRow(withG, mkMetrics({ winner: 0, gambitSeized: i < 3, brokenCount: 2, rescueCount: 1 }))),
      ...Array.from({ length: 6 }, (_, i) => mkRow(SEATS, mkMetrics({ winner: 1, gambitSeized: i < 1, brokenCount: 0, rescueCount: 0 }))),
    ];
    const d = summarize(rows).diagnostics;
    // gambler-free subset: 1 of 6 seized.
    expect(d.gambitFireRateNoGambler).toBeCloseTo(1 / 6);
    // conditional rescue rate = total rescues (6) / total breaks (12) = 0.5.
    expect(d.conditionalRescueRate).toBeCloseTo(0.5);
    expect(d.perCount[4].games).toBe(12);
  });

  it('renders markdown with the target table and verdicts', () => {
    const rows: SweepRow[] = Array.from({ length: 10 }, (_, i) => mkRow(SEATS, mkMetrics({ winner: i < 2 ? null : i % 4 })));
    const md = renderMarkdown(summarize(rows), {
      runId: 'test-run', baseSeed: 1, seedCount: 10, playerCounts: [4], modes: ['competitive'], matchupCount: 1,
    });
    expect(md).toContain('§9 targets');
    expect(md).toContain('Shadowking win rate');
    expect(md).toMatch(/PASS|FAIL/);
  });
});
