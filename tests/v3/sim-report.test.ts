/**
 * Report tests (Stage 4d) — the PASS/FAIL + dominance + free-rider verdict logic
 * on synthetic sweep rows, so the report's judgments are themselves trustworthy.
 */

import { describe, expect, it } from 'vitest';
import { summarize, renderMarkdown } from '../../src/v3/sim/report.js';
import type { SweepRow } from '../../src/v3/sim/sweep.js';
import type { GameMetrics } from '../../src/v3/sim/metrics.js';
import type { ArchetypeId } from '../../src/v3/sim/archetypes.js';

function mkMetrics(p: Partial<GameMetrics> & { winner: number | null }): GameMetrics {
  return {
    gameEndReason: p.winner === null ? 'doom_complete' : 'territory_victory',
    winner: p.winner,
    rounds: p.rounds ?? 13,
    actReached: 'MARCH',
    shadowkingWin: p.shadowkingWin ?? (p.winner === null),
    territoryWin: p.winner !== null,
    gambitWin: p.gambitWin ?? false,
    lastStandingWin: p.lastStandingWin ?? false,
    attritionWin: p.attritionWin ?? false,
    gambitSeized: p.gambitSeized ?? false,
    gambitSeizeDeliberate: p.gambitSeizeDeliberate ?? false,
    gambitSeizeIncidental: p.gambitSeizeIncidental ?? false,
    gambitWinDeliberate: p.gambitWinDeliberate ?? false,
    eliminations: p.eliminations ?? 0,
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
    playerActions: p.playerActions ?? 26,
    heraldCaptures: p.heraldCaptures ?? 0,
    captures: p.captures ?? 0,
    ransoms: p.ransoms ?? 0,
    heartAssaults: p.heartAssaults ?? 0,
    heartKilled: p.heartKilled ?? false,
    darkWinPath: p.darkWinPath ?? (p.winner === null ? 'doom_complete' : null),
    eliminationRounds: p.eliminationRounds ?? [],
    eliminationActs: p.eliminationActs ?? [],
    earliestEliminationRound: p.earliestEliminationRound ?? null,
    discoveryFlips: p.discoveryFlips ?? { recruit: 0, blight_seed: 0, death_knight: 0 },
  } as GameMetrics;
}

function mkRow(seats: ArchetypeId[], m: GameMetrics, midGameLeader: number | null = null): SweepRow {
  return { seed: 0, playerCount: seats.length, mode: 'competitive', matchupId: 'test', seatArchetypes: seats, steps: 10, hitGuard: false, metrics: m, midGameLeader };
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

  it('computes the Stage-5 diagnostics (eliminations, gambler-free gambit, per-count)', () => {
    // 12 games: 6 with a gambler (3 seized), 6 without (1 seized); eliminations controlled.
    const withG: ArchetypeId[] = ['gambler', 'turtle', 'opportunist', 'cooperator'];
    const rows: SweepRow[] = [
      ...Array.from({ length: 6 }, (_, i) => mkRow(withG, mkMetrics({ winner: 0, gambitSeized: i < 3, eliminations: 2 }))),
      ...Array.from({ length: 6 }, (_, i) => mkRow(SEATS, mkMetrics({ winner: 1, gambitSeized: i < 1, eliminations: 0 }))),
    ];
    const d = summarize(rows).diagnostics;
    // gambler-free subset: 1 of 6 seized.
    expect(d.gambitFireRateNoGambler).toBeCloseTo(1 / 6);
    // eliminations per game = total eliminations (12) / 12 games = 1.0.
    expect(d.eliminationsPerGame).toBeCloseTo(1);
    expect(d.perCount[4].games).toBe(12);
  });

  it('splits gambler-free gambit-fire into deliberate vs incidental (Stage 5f)', () => {
    // 8 gambler-free games: 2 deliberate seizes (one a deliberate WIN), 4 pure incidental, 2 no fire.
    const rows: SweepRow[] = [
      ...Array.from({ length: 1 }, () => mkRow(SEATS, mkMetrics({
        winner: 0, gambitWin: true, gambitSeized: true, gambitSeizeDeliberate: true, gambitWinDeliberate: true,
      }))),
      ...Array.from({ length: 1 }, () => mkRow(SEATS, mkMetrics({
        winner: 1, gambitSeized: true, gambitSeizeDeliberate: true,
      }))),
      ...Array.from({ length: 4 }, () => mkRow(SEATS, mkMetrics({
        winner: 2, gambitSeized: true, gambitSeizeIncidental: true,
      }))),
      ...Array.from({ length: 2 }, () => mkRow(SEATS, mkMetrics({ winner: 3 }))),
    ];
    const d = summarize(rows).diagnostics;
    expect(d.gambitFireRateNoGambler).toBeCloseTo(6 / 8); // 6 of 8 games saw a seize
    expect(d.gambitFireDeliberateNoGambler).toBeCloseTo(2 / 8);
    expect(d.gambitFireIncidentalNoGambler).toBeCloseTo(4 / 8); // pure-incidental games only
    expect(d.gambitDeliberateShareNoGambler).toBeCloseTo((2 / 8) / (6 / 8)); // deliberate share of fire
    expect(d.gambitWinDeliberateNoGambler).toBeCloseTo(1 / 8);
    expect(d.gambitDeliberateConversionNoGambler).toBeCloseTo((1 / 8) / (2 / 8)); // deliberate win/fire
  });

  it('renders markdown with the target table and verdicts', () => {
    const rows: SweepRow[] = Array.from({ length: 10 }, (_, i) => mkRow(SEATS, mkMetrics({ winner: i < 2 ? null : i % 4 })));
    const md = renderMarkdown(summarize(rows), {
      runId: 'test-run', baseSeed: 1, seedCount: 10, playerCounts: [4], modes: ['competitive'], matchupCount: 1,
    });
    expect(md).toContain('§9 targets');
    expect(md).toContain('Shadowking win rate');
    expect(md).toMatch(/PASS|FAIL/);
    // The V3-4b diagnostics section is rendered too.
    expect(md).toContain('V3-4b diagnostics');
    expect(md).toContain('Kill-the-Dark fire rate');
    expect(md).toContain('Mid-game leader win rate');
  });
});

describe('summarize — V3-4b diagnostics', () => {
  it('computes capture/ransom fire rates and the capture→ransom-back attachment proxy', () => {
    const rows: SweepRow[] = [
      ...Array.from({ length: 4 }, () => mkRow(SEATS, mkMetrics({ winner: 0, captures: 2, ransoms: 1 }))),
      ...Array.from({ length: 4 }, () => mkRow(SEATS, mkMetrics({ winner: 1 }))), // no captures
    ];
    const d = summarize(rows).diagnostics;
    expect(d.capturesPerGame).toBeCloseTo(8 / 8); // 8 captures over 8 games
    expect(d.ransomsPerGame).toBeCloseTo(4 / 8);
    expect(d.captureToRansomRate).toBeCloseTo(4 / 8); // 4 ransoms / 8 captures
  });

  it('measures Kill-the-Dark fire rate and the dark-win-by-path split', () => {
    const rows: SweepRow[] = [
      mkRow(SEATS, mkMetrics({ winner: null, shadowkingWin: true, darkWinPath: 'doom_complete', heartKilled: false })),
      mkRow(SEATS, mkMetrics({ winner: null, shadowkingWin: true, attritionWin: true, darkWinPath: 'attrition' })),
      mkRow(SEATS, mkMetrics({ winner: 0, heartKilled: true })), // table broke the heart, then a player won
      mkRow(SEATS, mkMetrics({ winner: 1, lastStandingWin: true })),
    ];
    const d = summarize(rows).diagnostics;
    expect(d.killTheDarkRate).toBeCloseTo(1 / 4);
    expect(d.darkWinByPath.doom_complete).toBeCloseTo(1 / 4);
    expect(d.darkWinByPath.attrition).toBeCloseTo(1 / 4);
    expect(d.darkWinByPath.last_standing).toBeCloseTo(1 / 4);
  });

  it('computes the spectator dead-time proxy + the early-death flag (ROUND_CAP × DEAD_TIME_FLOOR)', () => {
    const rows: SweepRow[] = [
      mkRow(SEATS, mkMetrics({ winner: 0, earliestEliminationRound: 3, eliminationActs: ['MARCH'] })),  // 3/14 ≈ 0.21 → early
      mkRow(SEATS, mkMetrics({ winner: 0, earliestEliminationRound: 12, eliminationActs: ['RECKONING'] })), // 12/14 → late
      mkRow(SEATS, mkMetrics({ winner: 0, earliestEliminationRound: null })), // nobody died
    ];
    const d = summarize(rows).diagnostics;
    // dead-time proxy averages only the two games WITH an elimination.
    expect(d.deadTimeProxy).toBeCloseTo(((3 / 14) + (12 / 14)) / 2);
    expect(d.meanEarliestEliminationRound).toBeCloseTo((3 + 12) / 2);
    // one of THREE games flagged early (3 < 14 × 0.5 = 7).
    expect(d.earlyDeathFlagRate).toBeCloseTo(1 / 3);
    expect(d.eliminationActMix.MARCH).toBe(1);
    expect(d.eliminationActMix.RECKONING).toBe(1);
  });

  it('reads the snowball signal: did the mid-game leader win?', () => {
    const rows: SweepRow[] = [
      mkRow(SEATS, mkMetrics({ winner: 0 }), 0), // leader 0 won
      mkRow(SEATS, mkMetrics({ winner: 1 }), 0), // leader 0 lost (comeback)
      mkRow(SEATS, mkMetrics({ winner: 2 }), 2), // leader 2 won
      mkRow(SEATS, mkMetrics({ winner: null }), 3), // no winner → excluded from the subset
    ];
    const d = summarize(rows).diagnostics;
    expect(d.midGameLeaderWinRate).toBeCloseTo(2 / 3);
    expect(d.comebackRate).toBeCloseTo(1 / 3);
  });

  it('flags a dominant archetype against the ~30% per-seat win-rate guard', () => {
    // aggressor (seat 0) wins every game → its per-seat win rate is 100% > 30%.
    const dom: SweepRow[] = Array.from({ length: 40 }, () => mkRow(SEATS, mkMetrics({ winner: 0 })));
    expect(summarize(dom).diagnostics.archetypeWinRateGuardPass).toBe(false);
    expect(summarize(dom).diagnostics.topArchetypeWinRate).toBeCloseTo(1);
    // a balanced field stays under the guard.
    const bal: SweepRow[] = Array.from({ length: 40 }, (_, i) => mkRow(SEATS, mkMetrics({ winner: i % 4 })));
    expect(summarize(bal).diagnostics.archetypeWinRateGuardPass).toBe(true);
  });
});
