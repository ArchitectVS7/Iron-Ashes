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
  readonly diagnostics: SweepDiagnostics;
}

/** Stage-5 tuning diagnostics — context behind the headline §9 bands. */
export interface SweepDiagnostics {
  /** Mean Broken transitions per game (the rescue target is gated on breaks). */
  readonly breakRatePerGame: number;
  /** Rescues per break-opportunity — separates "nobody breaks" from "nobody rescues". */
  readonly conditionalRescueRate: number;
  /** Mean Death Knights killed per game (combat lethality vs the dark). */
  readonly dkKillRate: number;
  /** Mean nodes ashed by game end (doom progress). */
  readonly meanAshedNodes: number;
  /** Fraction of pledge rounds that fully blocked the strike. */
  readonly pledgeFullBlockRate: number;
  /** Fraction of games where any Gambit was seized. */
  readonly gambitSeizeRate: number;
  /** Fraction of games won via the Gambit. */
  readonly gambitWinRate: number;
  /** THE honest gambit-fire number: seize rate over matchups with NO dedicated gambler. */
  readonly gambitFireRateNoGambler: number;
  /** End-Act distribution (which Act games finish in). */
  readonly perActEnd: Readonly<Record<string, number>>;
  /** Primary metrics split by player count (strictness check). */
  readonly perCount: Readonly<Record<number, PerCountStats>>;
}

export interface PerCountStats {
  readonly games: number;
  readonly shadowkingWinRate: number;
  readonly meanRounds: number;
  readonly meanRescues: number;
  readonly gambitFireRate: number;
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

  // ── Stage-5 diagnostics ──
  const sum = (f: (r: SweepRow) => number): number => rows.reduce((s, r) => s + f(r), 0);
  const totalBreaks = sum(r => r.metrics.brokenCount);
  const totalRescues = sum(r => r.metrics.rescueCount);
  const totalPledgeRounds = sum(r => r.metrics.pledgeRounds);
  const totalFullBlocks = sum(r => r.metrics.pledgeFullBlocks);

  const noGambler = rows.filter(r => !r.seatArchetypes.includes('gambler'));
  const perActEnd: Record<string, number> = {};
  for (const r of rows) perActEnd[r.metrics.actReached] = (perActEnd[r.metrics.actReached] ?? 0) + 1;

  const perCount: Record<number, PerCountStats> = {};
  for (const pc of [...new Set(rows.map(r => r.playerCount))].sort()) {
    const g = rows.filter(r => r.playerCount === pc);
    perCount[pc] = {
      games: g.length,
      shadowkingWinRate: g.length ? g.filter(r => r.metrics.shadowkingWin).length / g.length : 0,
      meanRounds: mean(g.map(r => r.metrics.rounds)),
      meanRescues: mean(g.map(r => r.metrics.rescueCount)),
      gambitFireRate: g.length ? g.filter(r => r.metrics.gambitSeized).length / g.length : 0,
    };
  }

  const diagnostics: SweepDiagnostics = {
    breakRatePerGame: mean(rows.map(r => r.metrics.brokenCount)),
    conditionalRescueRate: totalBreaks > 0 ? totalRescues / totalBreaks : 0,
    dkKillRate: mean(rows.map(r => r.metrics.dkKills)),
    meanAshedNodes: mean(rows.map(r => r.metrics.ashedNodes)),
    pledgeFullBlockRate: totalPledgeRounds > 0 ? totalFullBlocks / totalPledgeRounds : 0,
    gambitSeizeRate: total ? rows.filter(r => r.metrics.gambitSeized).length / total : 0,
    gambitWinRate: total ? rows.filter(r => r.metrics.gambitWin).length / total : 0,
    gambitFireRateNoGambler: noGambler.length ? noGambler.filter(r => r.metrics.gambitSeized).length / noGambler.length : 0,
    perActEnd,
    perCount,
  };

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
    diagnostics,
  };
}

function mkCheck(name: string, measured: number, band: { lo: number; hi: number }): TargetCheck {
  return { name, measured, lo: band.lo, hi: band.hi, pass: inBand(measured, band.lo, band.hi) };
}

// ─── Blood Pact summary (§10) ─────────────────────────────────────

export interface BloodPactSummary {
  readonly games: number;
  readonly traitorWinRate: number;
  readonly traitorExposureRate: number;
  readonly accusationsPerGame: number;
  readonly accusationAccuracy: number; // correct / resolved
}

/** Traitor-side stats over the blood_pact rows only (empty-safe). */
export function summarizeBloodPact(rows: readonly SweepRow[]): BloodPactSummary {
  const bp = rows.filter(r => r.metrics.isBloodPact);
  const games = bp.length;
  const resolved = bp.reduce((s, r) => s + r.metrics.accusationsResolved, 0);
  const correct = bp.reduce((s, r) => s + r.metrics.accusationsCorrect, 0);
  return {
    games,
    traitorWinRate: games ? bp.filter(r => r.metrics.traitorWin).length / games : 0,
    traitorExposureRate: games ? bp.filter(r => r.metrics.traitorExposed).length / games : 0,
    accusationsPerGame: games ? resolved / games : 0,
    accusationAccuracy: resolved ? correct / resolved : 0,
  };
}

export function renderBloodPactMarkdown(bp: BloodPactSummary, meta: ReportMeta): string {
  const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
  return `# Blood Pact Sweep — ${meta.runId}

**${bp.games} traitor games** · base seed ${meta.baseSeed} (${meta.seedCount} seeds) ·
player counts ${meta.playerCounts.join('/')}. An AI seat holds the Pact (sim-only affordance).

| Metric | Value |
|---|---|
| Traitor win rate (reaches doom unexposed) | ${pct(bp.traitorWinRate)} |
| Traitor exposure rate (correctly accused) | ${pct(bp.traitorExposureRate)} |
| Accusations resolved per game | ${bp.accusationsPerGame.toFixed(2)} |
| Accusation accuracy (correct / resolved) | ${pct(bp.accusationAccuracy)} |

> Balance reading: the traitor should win sometimes but not freely, and accusations should
> catch them more often than random — both are Stage-5 tuning targets, not yet tuned.
`;
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
  const d = summary.diagnostics;
  const actRows = Object.entries(d.perActEnd).sort()
    .map(([k, v]) => `| ${k} | ${v} | ${pct(v / summary.totalGames)} |`).join('\n');
  const countRows = Object.entries(d.perCount)
    .map(([k, s]) => `| ${k}p | ${s.games} | ${pct(s.shadowkingWinRate)} | ${s.meanRounds.toFixed(1)} | ${s.meanRescues.toFixed(2)} | ${pct(s.gambitFireRate)} |`).join('\n');

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

## Tuning diagnostics (Stage 5)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambit fire rate — gambler-free subset | ${pct(d.gambitFireRateNoGambler)} | the HONEST gambit number (judge the §9 band on this) |
| Gambit seize / win rate (all matchups) | ${pct(d.gambitSeizeRate)} / ${pct(d.gambitWinRate)} | aggregate, inflated by the gambler archetype |
| Breaks per game | ${d.breakRatePerGame.toFixed(2)} | rescue target is gated on this |
| Conditional rescue rate (rescues / break) | ${pct(d.conditionalRescueRate)} | ~0 with breaks present ⇒ nobody bothers; low breaks ⇒ raise lethality |
| DK kills per game | ${d.dkKillRate.toFixed(2)} | combat lethality vs the dark / pushback supply |
| Mean nodes ashed (doom progress) | ${d.meanAshedNodes.toFixed(2)} | how close the dark got |
| Pledge full-block rate | ${pct(d.pledgeFullBlockRate)} | high ⇒ table over-blocks ⇒ dark too weak |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Rescues | Gambit fire |
|---|---|---|---|---|---|
${countRows}

## End Act
| Act | Count | Share |
|---|---|---|
${actRows}

${summary.hitGuardCount > 0 ? `\n> ⚠️ ${summary.hitGuardCount} game(s) hit the step guard without terminating — investigate.\n` : ''}`;
}
