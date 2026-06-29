/**
 * Report (Stage 4d) — reduce sweep rows to PASS/FAIL verdicts vs the §9 targets,
 * win-rate-by-archetype (the "no dominant strategy" check), and the free-rider
 * verdict (§4.2 step 5). Pure functions → unit-testable; the CLI (scripts/sim.mjs)
 * renders the markdown. NO boilerplate "recommended next steps" (the v1 anti-pattern).
 */

import type { Act } from '../types.js';
import { ROUND_CAP } from '../tunables.js';
import type { ArchetypeId } from './archetypes.js';
import type { SweepRow } from './sweep.js';

/** Sim-side spectator dead-time floor (NOT an engine tunable): a seat eliminated before this
 *  fraction of ROUND_CAP is flagged as too-early "dead time" for a human in that seat (§13). */
export const DEAD_TIME_FLOOR = 0.5;

/** No-archetype-dominates guard threshold: a per-seat win rate above this flags a dominant strategy. */
export const ARCHETYPE_WINRATE_GUARD = 0.30;

// ─── §9 target bands ──────────────────────────────────────────────
export const TARGETS = {
  shadowkingWinRate: { lo: 0.18, hi: 0.22, label: 'Shadowking win rate' },
  meanRounds: { lo: 10, hi: 16, label: 'Mean game length (rounds)' },
  gambitFireRate: { lo: 0.10, hi: 0.20, label: 'Gambit fire rate (gambler-free, ~1-in-6-to-8)' },
  // The rescue band is retired with the Broken Court (§8). An elimination-tempo band is set
  // from scratch in Stage V3-5 (ALGORITHM §9 re-balance note) — left out of the hard checks
  // for 3a; eliminationsPerGame is reported as a pure diagnostic until then.
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
  /** Mean Warlords eliminated (deposed) per game (§6 — the elimination-tempo signal). */
  readonly eliminationsPerGame: number;
  /** Fraction of games that ended with a last-Warlord-standing win (§6). */
  readonly lastStandingWinRate: number;
  /** Mean Death Knights killed per game (combat lethality vs the dark). */
  readonly dkKillRate: number;
  /** Mean Oaths sworn per game (the social-density signal). */
  readonly oathsSwornPerGame: number;
  /** Mean Oaths broken per game (betrayal drama). */
  readonly oathsBrokenPerGame: number;
  /** Fraction of resolved Oaths that ended in betrayal (broken / (broken+matured)). */
  readonly oathBreakShare: number;
  /** Mean Forge tolls paid per game (positional-leverage signal). */
  readonly tollsPerGame: number;
  /** Mean Heralds recruited per game (§ Herald — political-build uptake). */
  readonly heraldsPerGame: number;
  /** Mean Heralds captured per game (§HL — the lone-runner interception drama). */
  readonly heraldCapturesPerGame: number;
  /** Fraction of seats that finished in the political stance. */
  readonly politicalSeatShare: number;
  /** Win rate of political-stance seats (build-parity check). */
  readonly politicalWinRate: number;
  /** Win rate of martial-stance seats (build-parity check). */
  readonly martialWinRate: number;
  /** Mean nodes ashed by game end (doom progress). */
  readonly meanAshedNodes: number;
  /** Mean ACTION decisions per game (session-length / decision-density proxy — C2). */
  readonly meanPlayerActions: number;
  /** Mean ACTION decisions per round (density proxy for the 30–45 min scope target — C2). */
  readonly meanActionsPerRound: number;
  /** Share of Shadowking wins that came via attrition (zero living Warlords) vs the
   *  Keystone assault. Soft guard: the dark should win mostly by the assault. */
  readonly attritionWinShare: number;
  /** Fraction of pledge rounds that fully blocked the strike. */
  readonly pledgeFullBlockRate: number;
  /** Fraction of games where any Gambit was seized. */
  readonly gambitSeizeRate: number;
  /** Fraction of games won via the Gambit. */
  readonly gambitWinRate: number;
  /** THE honest gambit-fire number: seize rate over matchups with NO dedicated gambler. */
  readonly gambitFireRateNoGambler: number;

  // ── Stage 5f: deliberate-vs-incidental gambit-fire split (gambit INVESTIGATION, no fix) ──
  /** Gambler-free DELIBERATE fire rate: fraction of gambler-free games with ≥1 deliberate seize
   *  (the Warlord marched onto the Keystone via the Gambit path). The honest "went for the throne". */
  readonly gambitFireDeliberateNoGambler: number;
  /** Gambler-free INCIDENTAL fire rate: fraction of gambler-free games where a seize fired ONLY
   *  from an incidental occupation (no deliberate claim that game). */
  readonly gambitFireIncidentalNoGambler: number;
  /** Of the gambler-free fire (gambitFireRateNoGambler), the share whose games had a deliberate
   *  seize. Answers "what % of the ~39% fire is deliberate vs incidental". */
  readonly gambitDeliberateShareNoGambler: number;
  /** All-matchup deliberate / incidental fire rates (context; inflated by the gambler archetype). */
  readonly gambitFireDeliberateAll: number;
  readonly gambitFireIncidentalAll: number;
  /** Gambler-free Gambit WIN rate (fraction of gambler-free games won via the Gambit). */
  readonly gambitWinRateNoGambler: number;
  /** Gambler-free DELIBERATE gambit-win rate — for the fire-a-lot-win-rarely comparison (Q3). */
  readonly gambitWinDeliberateNoGambler: number;
  /** Gambler-free deliberate conversion: deliberate gambit-win / deliberate fire (Q3 headline). */
  readonly gambitDeliberateConversionNoGambler: number;
  /** Gambler-free top per-seat archetype win rate (Q2 — is dominance gambler-driven?). */
  readonly topArchetypeWinRateNoGambler: number;
  /** End-Act distribution (which Act games finish in). */
  readonly perActEnd: Readonly<Record<string, number>>;
  /** Primary metrics split by player count (strictness check). */
  readonly perCount: Readonly<Record<number, PerCountStats>>;

  // ── Stage V3-4b diagnostics (the new-verb fire rates + the v3 defeat/snowball signals) ──
  /** Mean retainers CAPTURED per game (§5.2 capture-economy fire rate; 0 ⇒ the verb never fires). */
  readonly capturesPerGame: number;
  /** Mean RANSOMs paid per game (§5.3). */
  readonly ransomsPerGame: number;
  /** Capture→ransom-back attachment proxy: ransoms / captures (§13; ~how often a captive is bought back). */
  readonly captureToRansomRate: number;
  /** Mean ASSAULT_HEART actions per game (§5.6 kill-the-dark commit fire rate). */
  readonly heartAssaultsPerGame: number;
  /** Fraction of games where the dark's heart was broken — the Kill-the-Dark FIRE rate (§5.6). */
  readonly killTheDarkRate: number;
  /** Dark-win split by PATH as a share of ALL games (§6): Keystone assault vs deposed-table attrition,
   *  plus the last-standing PLAYER ending for context. */
  readonly darkWinByPath: Readonly<{ doom_complete: number; attrition: number; last_standing: number }>;
  /** Mean earliest-elimination round over games with a deposal (the dead-time numerator). */
  readonly meanEarliestEliminationRound: number;
  /** Spectator dead-time proxy: mean(earliest elimination round / ROUND_CAP) over games with a deposal. */
  readonly deadTimeProxy: number;
  /** Fraction of ALL games where someone died before ROUND_CAP × DEAD_TIME_FLOOR (the flag). */
  readonly earlyDeathFlagRate: number;
  /** Elimination-timing distribution — count of deposals by the Act they fell in. */
  readonly eliminationActMix: Readonly<Record<Act, number>>;
  /** Snowball signal: among games with a winner AND a mid-game (MARCH) leader, fraction the
   *  mid-game leader went on to WIN (high ⇒ snowball; low ⇒ turtle/comeback). */
  readonly midGameLeaderWinRate: number;
  /** Comeback-from-behind rate: 1 − midGameLeaderWinRate over the same subset. */
  readonly comebackRate: number;
  /** Discovery-flip outcome mix as shares of all flips (§5.1). */
  readonly discoveryFlipMix: Readonly<Record<string, number>>;
  /** The single highest per-seat archetype win rate among archetypes with enough appearances. */
  readonly topArchetypeWinRate: number;
  /** Whether NO archetype exceeds the ARCHETYPE_WINRATE_GUARD (~30%) — the no-dominant-strategy guard. */
  readonly archetypeWinRateGuardPass: boolean;
}

export interface PerCountStats {
  readonly games: number;
  readonly shadowkingWinRate: number;
  readonly meanRounds: number;
  readonly meanEliminations: number;
  readonly gambitFireRate: number;
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Political/martial build split + per-build win rates (§ Herald build-parity check). */
function stanceStats(rows: readonly SweepRow[]): { politicalSeatShare: number; politicalWinRate: number; martialWinRate: number } {
  let polGames = 0, polWins = 0, marGames = 0, marWins = 0, seats = 0, polSeats = 0;
  for (const r of rows) {
    const stances = r.metrics.stancePerSeat ?? [];
    for (let seat = 0; seat < stances.length; seat++) {
      seats++;
      const won = r.metrics.winner === seat ? 1 : 0;
      if (stances[seat] === 'political') { polSeats++; polGames++; polWins += won; }
      else { marGames++; marWins += won; }
    }
  }
  return {
    politicalSeatShare: seats ? polSeats / seats : 0,
    politicalWinRate: polGames ? polWins / polGames : 0,
    martialWinRate: marGames ? marWins / marGames : 0,
  };
}
const inBand = (x: number, lo: number, hi: number): boolean => x >= lo && x <= hi;

export function summarize(rows: readonly SweepRow[]): SweepSummary {
  const total = rows.length;

  const shadowkingWinRate = total ? rows.filter(r => r.metrics.shadowkingWin).length / total : 0;
  const meanRounds = mean(rows.map(r => r.metrics.rounds));
  // The §9 gambit check judges the HONEST gambler-free fire rate (excluding matchups
  // with a dedicated gambler archetype, which gambles by identity and inflates the
  // pooled number into a permanent FAIL). The pooled seize rate stays a diagnostic.
  const noGamblerRows = rows.filter(r => !r.seatArchetypes.includes('gambler'));
  const gambitFireRate = noGamblerRows.length
    ? noGamblerRows.filter(r => r.metrics.gambitSeized).length / noGamblerRows.length : 0;

  const checks: TargetCheck[] = [
    mkCheck(TARGETS.shadowkingWinRate.label, shadowkingWinRate, TARGETS.shadowkingWinRate),
    mkCheck(TARGETS.meanRounds.label, meanRounds, TARGETS.meanRounds),
    mkCheck(TARGETS.gambitFireRate.label, gambitFireRate, TARGETS.gambitFireRate),
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
      meanEliminations: mean(g.map(r => r.metrics.eliminations)),
      gambitFireRate: g.length ? g.filter(r => r.metrics.gambitSeized).length / g.length : 0,
    };
  }

  const totalOathsBroken = sum(r => r.metrics.oathsBroken);
  const totalOathsMatured = sum(r => r.metrics.oathsMatured);

  // ── Stage V3-4b: new-verb fire rates + defeat/snowball signals ──
  const totalCaptures = sum(r => r.metrics.captures);
  const totalRansoms = sum(r => r.metrics.ransoms);
  const elimGames = rows.filter(r => r.metrics.earliestEliminationRound !== null);
  const eliminationActMix: Record<Act, number> = { WHISPER: 0, MARCH: 0, RECKONING: 0 };
  for (const r of rows) for (const a of r.metrics.eliminationActs) eliminationActMix[a] += 1;

  const flipTotals: Record<string, number> = { recruit: 0, blight_seed: 0, death_knight: 0 };
  for (const r of rows) for (const k of Object.keys(flipTotals)) flipTotals[k] += r.metrics.discoveryFlips[k as keyof typeof r.metrics.discoveryFlips];
  const flipSum = flipTotals.recruit + flipTotals.blight_seed + flipTotals.death_knight;
  const discoveryFlipMix: Record<string, number> = {
    recruit: flipSum ? flipTotals.recruit / flipSum : 0,
    blight_seed: flipSum ? flipTotals.blight_seed / flipSum : 0,
    death_knight: flipSum ? flipTotals.death_knight / flipSum : 0,
  };

  // Snowball signal: did the mid-game (MARCH) territory leader go on to win?
  const snowballRows = rows.filter(r => r.metrics.winner !== null && r.midGameLeader !== null);
  const midGameLeaderWinRate = snowballRows.length
    ? snowballRows.filter(r => r.metrics.winner === r.midGameLeader).length / snowballRows.length : 0;

  // No-dominant-strategy guard (~30% per-seat win rate, among archetypes with enough appearances).
  const minAppear = Math.max(20, total * 0.05);
  const eligible = winRateByArchetype.filter(a => a.seatAppearances >= minAppear);
  const topArchetypeWinRate = eligible.reduce((m, a) => Math.max(m, a.winRate), 0);

  // ── Stage 5f: deliberate-vs-incidental gambit-fire split (investigation, no fix) ──
  const rate = (subset: readonly SweepRow[], pred: (r: SweepRow) => boolean): number =>
    subset.length ? subset.filter(pred).length / subset.length : 0;
  const gambitFireDeliberateNoGambler = rate(noGambler, r => r.metrics.gambitSeizeDeliberate);
  // INCIDENTAL fire rate counts games where a seize fired but NO deliberate seize did (pure incidental).
  const gambitFireIncidentalNoGambler = rate(noGambler,
    r => r.metrics.gambitSeized && !r.metrics.gambitSeizeDeliberate);
  const gambitFireRateNoGamblerVal = rate(noGambler, r => r.metrics.gambitSeized);
  const gambitFireDeliberateAll = rate(rows, r => r.metrics.gambitSeizeDeliberate);
  const gambitFireIncidentalAll = rate(rows,
    r => r.metrics.gambitSeized && !r.metrics.gambitSeizeDeliberate);
  const gambitWinRateNoGambler = rate(noGambler, r => r.metrics.gambitWin);
  const gambitWinDeliberateNoGambler = rate(noGambler, r => r.metrics.gambitWinDeliberate);
  // Gambler-free top per-seat archetype win rate (recompute over the gambler-free subset).
  const ngAppear = new Map<ArchetypeId, number>();
  const ngWins = new Map<ArchetypeId, number>();
  for (const r of noGambler) {
    r.seatArchetypes.forEach((id, seat) => {
      ngAppear.set(id, (ngAppear.get(id) ?? 0) + 1);
      if (r.metrics.winner === seat) ngWins.set(id, (ngWins.get(id) ?? 0) + 1);
    });
  }
  const ngMinAppear = Math.max(20, noGambler.length * 0.05);
  let topArchetypeWinRateNoGambler = 0;
  for (const [id, ap] of ngAppear) {
    if (ap >= ngMinAppear) topArchetypeWinRateNoGambler = Math.max(topArchetypeWinRateNoGambler, (ngWins.get(id) ?? 0) / ap);
  }

  const diagnostics: SweepDiagnostics = {
    eliminationsPerGame: mean(rows.map(r => r.metrics.eliminations)),
    lastStandingWinRate: total ? rows.filter(r => r.metrics.lastStandingWin).length / total : 0,
    dkKillRate: mean(rows.map(r => r.metrics.dkKills)),
    oathsSwornPerGame: mean(rows.map(r => r.metrics.oathsSworn)),
    oathsBrokenPerGame: mean(rows.map(r => r.metrics.oathsBroken)),
    oathBreakShare: (totalOathsBroken + totalOathsMatured) > 0
      ? totalOathsBroken / (totalOathsBroken + totalOathsMatured) : 0,
    tollsPerGame: mean(rows.map(r => r.metrics.tollsPaid)),
    heraldsPerGame: mean(rows.map(r => r.metrics.heraldsRecruited)),
    heraldCapturesPerGame: mean(rows.map(r => r.metrics.heraldCaptures)),
    ...stanceStats(rows),
    meanAshedNodes: mean(rows.map(r => r.metrics.ashedNodes)),
    meanPlayerActions: mean(rows.map(r => r.metrics.playerActions)),
    meanActionsPerRound: mean(rows.map(r => r.metrics.rounds > 0 ? r.metrics.playerActions / r.metrics.rounds : 0)),
    attritionWinShare: (() => {
      const skWins = rows.filter(r => r.metrics.shadowkingWin).length;
      return skWins ? rows.filter(r => r.metrics.attritionWin).length / skWins : 0;
    })(),
    pledgeFullBlockRate: totalPledgeRounds > 0 ? totalFullBlocks / totalPledgeRounds : 0,
    gambitSeizeRate: total ? rows.filter(r => r.metrics.gambitSeized).length / total : 0,
    gambitWinRate: total ? rows.filter(r => r.metrics.gambitWin).length / total : 0,
    gambitFireRateNoGambler: gambitFireRateNoGamblerVal,
    gambitFireDeliberateNoGambler,
    gambitFireIncidentalNoGambler,
    gambitDeliberateShareNoGambler: gambitFireRateNoGamblerVal > 0
      ? gambitFireDeliberateNoGambler / gambitFireRateNoGamblerVal : 0,
    gambitFireDeliberateAll,
    gambitFireIncidentalAll,
    gambitWinRateNoGambler,
    gambitWinDeliberateNoGambler,
    gambitDeliberateConversionNoGambler: gambitFireDeliberateNoGambler > 0
      ? gambitWinDeliberateNoGambler / gambitFireDeliberateNoGambler : 0,
    topArchetypeWinRateNoGambler,
    perActEnd,
    perCount,

    capturesPerGame: mean(rows.map(r => r.metrics.captures)),
    ransomsPerGame: mean(rows.map(r => r.metrics.ransoms)),
    captureToRansomRate: totalCaptures > 0 ? totalRansoms / totalCaptures : 0,
    heartAssaultsPerGame: mean(rows.map(r => r.metrics.heartAssaults)),
    killTheDarkRate: total ? rows.filter(r => r.metrics.heartKilled).length / total : 0,
    darkWinByPath: {
      doom_complete: total ? rows.filter(r => r.metrics.darkWinPath === 'doom_complete').length / total : 0,
      attrition: total ? rows.filter(r => r.metrics.darkWinPath === 'attrition').length / total : 0,
      last_standing: total ? rows.filter(r => r.metrics.lastStandingWin).length / total : 0,
    },
    meanEarliestEliminationRound: elimGames.length
      ? mean(elimGames.map(r => r.metrics.earliestEliminationRound as number)) : 0,
    deadTimeProxy: elimGames.length
      ? mean(elimGames.map(r => (r.metrics.earliestEliminationRound as number) / ROUND_CAP)) : 0,
    earlyDeathFlagRate: total
      ? rows.filter(r => r.metrics.earliestEliminationRound !== null
          && (r.metrics.earliestEliminationRound as number) < ROUND_CAP * DEAD_TIME_FLOOR).length / total : 0,
    eliminationActMix,
    midGameLeaderWinRate,
    comebackRate: snowballRows.length ? 1 - midGameLeaderWinRate : 0,
    discoveryFlipMix,
    topArchetypeWinRate,
    archetypeWinRateGuardPass: topArchetypeWinRate <= ARCHETYPE_WINRATE_GUARD,
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

// ─── Tuning loss (Stage 5 — the scalar the coordinate-descent minimizes) ──

/**
 * A scalar "how far from balanced" score: squared normalized band violations,
 * plus a heavy penalty for breaking a guardrail (no-dominance / free-rider) or a
 * non-terminating game. 0 = every band passed and both guardrails held. Lower is
 * better — the search proposes overrides, this ranks them.
 */
export function tuningLoss(s: SweepSummary): number {
  let loss = 0;
  for (const c of s.checks) {
    if (c.pass) continue;
    const dist = c.measured < c.lo ? c.lo - c.measured : c.measured - c.hi;
    const scale = c.hi <= 1 ? 0.1 : (c.hi - c.lo); // normalize rate bands vs count bands
    loss += (dist / scale) ** 2;
  }
  if (!s.dominancePass) loss += 100;
  if (s.freeRider.freeRidingRewarded) loss += 100;
  if (s.hitGuardCount > 0) loss += 1000;
  return loss;
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
    .map(([k, s]) => `| ${k}p | ${s.games} | ${pct(s.shadowkingWinRate)} | ${s.meanRounds.toFixed(1)} | ${s.meanEliminations.toFixed(2)} | ${pct(s.gambitFireRate)} |`).join('\n');

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
| Eliminations per game | ${d.eliminationsPerGame.toFixed(2)} | elimination tempo (§6); band set from scratch in V3-5 |
| Last-standing win rate | ${pct(d.lastStandingWinRate)} | share of games decided by the last Warlord standing |
| DK kills per game | ${d.dkKillRate.toFixed(2)} | combat lethality vs the dark / pushback supply |
| Oaths sworn / broken per game | ${d.oathsSwornPerGame.toFixed(2)} / ${d.oathsBrokenPerGame.toFixed(2)} | social density (sworn) + betrayal drama (${pct(d.oathBreakShare)} of oaths broken) |
| Forge tolls per game | ${d.tollsPerGame.toFixed(2)} | chokepoint leverage (rival-Forge passage tax) |
| Heralds/game · political share | ${d.heraldsPerGame.toFixed(2)} · ${pct(d.politicalSeatShare)} | build-identity uptake (§ Herald) |
| Herald captures/game | ${d.heraldCapturesPerGame.toFixed(2)} | §HL lone-runner interception drama (0 ⇒ the runner risk never bites) |
| Build win rate (political / martial) | ${pct(d.politicalWinRate)} / ${pct(d.martialWinRate)} | parity check — neither build should dominate |
| Mean nodes ashed (doom progress) | ${d.meanAshedNodes.toFixed(2)} | how close the dark got |
| Pledge full-block rate | ${pct(d.pledgeFullBlockRate)} | high ⇒ table over-blocks ⇒ dark too weak |
| Decisions per game · per round | ${d.meanPlayerActions.toFixed(1)} · ${d.meanActionsPerRound.toFixed(2)} | session-length proxy (30–45 min scope — C2); flag if density drifts high |
| Attrition share of SK wins | ${pct(d.attritionWinShare)} | soft guard — dark should win by the Keystone assault, not attrition; high ⇒ investigate |

## Per-player-count (strictness)
| Count | Games | SK win | Rounds | Eliminations | Gambit fire |
|---|---|---|---|---|---|
${countRows}

## V3-4b diagnostics — new-verb fire rates + defeat/snowball signals
| Diagnostic | Value | Reading |
|---|---|---|
| Captures / Ransoms per game | ${d.capturesPerGame.toFixed(2)} / ${d.ransomsPerGame.toFixed(2)} | capture-economy + ransom fire rates (0 ⇒ the verb never fires in sweeps) |
| Capture→ransom-back rate | ${pct(d.captureToRansomRate)} | §13 attachment proxy (ransoms / captures) |
| Heart assaults per game | ${d.heartAssaultsPerGame.toFixed(2)} | ASSAULT_HEART commit fire rate (§5.6) |
| Kill-the-Dark fire rate | ${pct(d.killTheDarkRate)} | share of games where the table broke the heart |
| Dark win by path (doom / attrition) | ${pct(d.darkWinByPath.doom_complete)} / ${pct(d.darkWinByPath.attrition)} | the §6 dark-win split; last-standing player ending ${pct(d.darkWinByPath.last_standing)} |
| Mean earliest elimination · dead-time proxy | ${d.meanEarliestEliminationRound.toFixed(1)} · ${pct(d.deadTimeProxy)} | spectator dead-time = earliest deposal / ROUND_CAP(${ROUND_CAP}) |
| Early-death flag rate (< ${Math.round(ROUND_CAP * DEAD_TIME_FLOOR)} rounds) | ${pct(d.earlyDeathFlagRate)} | games where a seat died before ROUND_CAP × ${DEAD_TIME_FLOOR} (a human there is a spectator too long) |
| Eliminations by Act (W/M/R) | ${d.eliminationActMix.WHISPER} / ${d.eliminationActMix.MARCH} / ${d.eliminationActMix.RECKONING} | elimination-timing distribution |
| Mid-game leader win rate · comeback | ${pct(d.midGameLeaderWinRate)} · ${pct(d.comebackRate)} | snowball↔turtle: does the MARCH-act leader win? |
| Discovery flips (recruit/blight/DK) | ${pct(d.discoveryFlipMix.recruit)} / ${pct(d.discoveryFlipMix.blight_seed)} / ${pct(d.discoveryFlipMix.death_knight)} | §5.1 flip outcome mix |
| Top archetype win rate (≤ ${pct(ARCHETYPE_WINRATE_GUARD)} guard) | ${pct(d.topArchetypeWinRate)} | ${verdict(d.archetypeWinRateGuardPass)} — no single strategy should dominate |

## Gambit investigation (Stage 5f — deliberate vs incidental)
| Diagnostic | Value | Reading |
|---|---|---|
| Gambler-free fire rate (DELIBERATE / INCIDENTAL) | ${pct(d.gambitFireDeliberateNoGambler)} / ${pct(d.gambitFireIncidentalNoGambler)} | split of the ${pct(d.gambitFireRateNoGambler)} honest fire — deliberate = a Gambit-path claim; incidental = a piece sat the Keystone for another reason |
| Deliberate share of gambler-free fire | ${pct(d.gambitDeliberateShareNoGambler)} | what % of the honest fire is a real Gambit claim |
| All-matchup fire (DELIBERATE / INCIDENTAL) | ${pct(d.gambitFireDeliberateAll)} / ${pct(d.gambitFireIncidentalAll)} | context (inflated by the gambler archetype) |
| Gambler-free Gambit WIN / DELIBERATE-WIN rate | ${pct(d.gambitWinRateNoGambler)} / ${pct(d.gambitWinDeliberateNoGambler)} | does it fire a lot but win rarely? |
| Deliberate conversion (win / deliberate-fire) | ${pct(d.gambitDeliberateConversionNoGambler)} | Q3 — deliberate fire that actually converts to a Gambit win |
| Top archetype win rate — gambler-free | ${pct(d.topArchetypeWinRateNoGambler)} | Q2 — is the dominance FAIL gambler-driven? (vs ${pct(d.topArchetypeWinRate)} with gambler) |

## End Act
| Act | Count | Share |
|---|---|---|
${actRows}

${summary.hitGuardCount > 0 ? `\n> ⚠️ ${summary.hitGuardCount} game(s) hit the step guard without terminating — investigate.\n` : ''}`;
}
