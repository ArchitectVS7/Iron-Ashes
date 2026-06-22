/**
 * Report (Stage 4d) — reduce sweep rows to PASS/FAIL verdicts vs the §9 targets,
 * win-rate-by-archetype (the "no dominant strategy" check), and the free-rider
 * verdict (§4.2 step 5). Pure functions → unit-testable; the CLI (scripts/sim.mjs)
 * renders the markdown. NO boilerplate "recommended next steps" (the v1 anti-pattern).
 */

import type { ArchetypeId } from './archetypes.js';
import type { SweepRow } from './sweep.js';

// ─── §9 target bands ──────────────────────────────────────────────
export const TARGETS = {
  shadowkingWinRate: { lo: 0.18, hi: 0.22, label: 'Shadowking win rate' },
  meanRounds: { lo: 10, hi: 16, label: 'Mean game length (rounds)' },
  gambitFireRate: { lo: 0.10, hi: 0.20, label: 'Gambit fire rate (~1-in-6-to-8)' },
  meanRescues: { lo: 2, hi: 4, label: 'Rescues per game' },
} as const;

export interface TargetCheck {
  readonly name: string;
  readonly measured: number;
  readonly lo: number;
  readonly hi: number;
  readonly pass: boolean;
}

export interface ArchetypeWinRate {
  readonly id: ArchetypeId;
  readonly seatAppearances: number;
  readonly seatWins: number;
  readonly winRate: number;
}

export interface SweepSummary {
  readonly totalGames: number;
  readonly hitGuardCount: number;
  readonly checks: readonly TargetCheck[];
  readonly winRateByArchetype: readonly ArchetypeWinRate[];
  readonly evenShare: number;
  readonly dominancePass: boolean;
  readonly dominantArchetype: ArchetypeId | null;
  readonly freeRider: {
    readonly winnerMeanPledge: number;
    readonly fieldMeanPledge: number;
    readonly freeRidingRewarded: boolean;
  };
  readonly endReasonCounts: Readonly<Record<string, number>>;
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const inBand = (x: number, lo: number, hi: number): boolean => x >= lo && x <= hi;

export function summarize(rows: readonly SweepRow[]): SweepSummary {
  const total = rows.length;

  const shadowkingWinRate = total ? rows.filter(r => r.metrics.shadowkingWin).length / total : 0;
  const meanRounds = mean(rows.map(r => r.metrics.rounds));
  const gambitFireRate = total ? rows.filter(r => r.metrics.gambitSeized).length / total : 0;
  const meanRescues = mean(rows.map(r => r.metrics.rescueCount));

  const checks: TargetCheck[] = [
    mkCheck(TARGETS.shadowkingWinRate.label, shadowkingWinRate, TARGETS.shadowkingWinRate),
    mkCheck(TARGETS.meanRounds.label, meanRounds, TARGETS.meanRounds),
    mkCheck(TARGETS.gambitFireRate.label, gambitFireRate, TARGETS.gambitFireRate),
    mkCheck(TARGETS.meanRescues.label, meanRescues, TARGETS.meanRescues),
  ];

  // ── Win-rate by archetype (per-seat granularity, so homogeneous tables don't lie) ──
  const appear = new Map<ArchetypeId, number>();
  const wins = new Map<ArchetypeId, number>();
  let winningGames = 0;
  let seatAppearances = 0;
  for (const r of rows) {
    r.seatArchetypes.forEach((id, seat) => {
      appear.set(id, (appear.get(id) ?? 0) + 1);
      seatAppearances++;
      if (r.metrics.winner === seat) wins.set(id, (wins.get(id) ?? 0) + 1);
    });
    if (r.metrics.winner !== null) winningGames++;
  }
  const winRateByArchetype: ArchetypeWinRate[] = [...appear.keys()].sort().map(id => {
    const seatAppear = appear.get(id) ?? 0;
    const seatWins = wins.get(id) ?? 0;
    return { id, seatAppearances: seatAppear, seatWins, winRate: seatAppear ? seatWins / seatAppear : 0 };
  });

  // Even share = expected per-seat win rate if wins were uniform across seats.
  const evenShare = seatAppearances ? winningGames / seatAppearances : 0;
  // Dominance: an archetype with enough appearances whose win rate far exceeds even.
  let dominantArchetype: ArchetypeId | null = null;
  for (const a of winRateByArchetype) {
    if (a.seatAppearances >= Math.max(20, total * 0.05) && a.winRate > evenShare * 1.8) {
      if (dominantArchetype === null || a.winRate > (winRateByArchetype.find(x => x.id === dominantArchetype)?.winRate ?? 0)) {
        dominantArchetype = a.id;
      }
    }
  }

  // ── Free-rider verdict: do winners pledge LESS than the field they beat? ──
  const winnerPledges: number[] = [];
  const fieldPledges: number[] = [];
  for (const r of rows) {
    const w = r.metrics.winner;
    if (w === null) continue;
    r.metrics.meanPledgePerSeat.forEach((mp, seat) => {
      if (seat === w) winnerPledges.push(mp);
      else fieldPledges.push(mp);
    });
  }
  const winnerMeanPledge = mean(winnerPledges);
  const fieldMeanPledge = mean(fieldPledges);

  // ── End-reason tally ──
  const endReasonCounts: Record<string, number> = {};
  for (const r of rows) {
    const k = r.metrics.gameEndReason ?? 'unfinished';
    endReasonCounts[k] = (endReasonCounts[k] ?? 0) + 1;
  }

  return {
    totalGames: total,
    hitGuardCount: rows.filter(r => r.hitGuard).length,
    checks,
    winRateByArchetype,
    evenShare,
    dominancePass: dominantArchetype === null,
    dominantArchetype,
    freeRider: {
      winnerMeanPledge,
      fieldMeanPledge,
      // Free-riding is "rewarded" if winners systematically pledged notably less.
      freeRidingRewarded: fieldMeanPledge > 0 && winnerMeanPledge < fieldMeanPledge * 0.8,
    },
    endReasonCounts,
  };
}

function mkCheck(name: string, measured: number, band: { lo: number; hi: number }): TargetCheck {
  return { name, measured, lo: band.lo, hi: band.hi, pass: inBand(measured, band.lo, band.hi) };
}

// ─── Markdown rendering (pure; CLI supplies the run metadata) ─────

export interface ReportMeta {
  readonly runId: string;
  readonly baseSeed: number;
  readonly seedCount: number;
  readonly playerCounts: readonly number[];
  readonly modes: readonly string[];
  readonly matchupCount: number;
}

export function renderMarkdown(summary: SweepSummary, meta: ReportMeta): string {
  const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
  const verdict = (p: boolean): string => (p ? '✅ PASS' : '❌ FAIL');

  const checkRows = summary.checks.map(c => {
    const isRate = c.hi <= 1;
    const m = isRate ? pct(c.measured) : c.measured.toFixed(2);
    const band = isRate ? `${pct(c.lo)}–${pct(c.hi)}` : `${c.lo}–${c.hi}`;
    return `| ${c.name} | ${m} | ${band} | ${verdict(c.pass)} |`;
  }).join('\n');

  const archRows = summary.winRateByArchetype.map(a =>
    `| ${a.id} | ${a.seatAppearances} | ${a.seatWins} | ${pct(a.winRate)} |`,
  ).join('\n');

  const endRows = Object.entries(summary.endReasonCounts).sort()
    .map(([k, v]) => `| ${k} | ${v} | ${pct(v / summary.totalGames)} |`).join('\n');

  const fr = summary.freeRider;

  return `# Balance Sweep Report — ${meta.runId}

**${summary.totalGames} games** · base seed ${meta.baseSeed} (${meta.seedCount} seeds) ·
player counts ${meta.playerCounts.join('/')} · modes ${meta.modes.join('/')} ·
${meta.matchupCount} matchups. Driven through the REAL reducer + REAL AI (deterministic).

## §9 targets
| Metric | Measured | Target | Verdict |
|---|---|---|---|
${checkRows}

## No-dominant-strategy check
Even per-seat win share ≈ **${pct(summary.evenShare)}**. ${verdict(summary.dominancePass)}${
    summary.dominantArchetype ? ` — **${summary.dominantArchetype}** dominates.` : ' — no archetype dominates.'}

| Archetype | Seat-games | Wins | Win rate |
|---|---|---|---|
${archRows}

## Free-rider verdict (§4.2 step 5)
Winners' mean pledge **${fr.winnerMeanPledge.toFixed(2)}** vs the field's **${fr.fieldMeanPledge.toFixed(2)}**.
${fr.freeRidingRewarded ? '❌ Free-riding appears REWARDED (winners pledge notably less).' : '✅ Free-riding is not rewarded (winners pledge at least their share).'}

## Game endings
| Reason | Count | Share |
|---|---|---|
${endRows}

${summary.hitGuardCount > 0 ? `\n> ⚠️ ${summary.hitGuardCount} game(s) hit the step guard without terminating — investigate.\n` : ''}`;
}
