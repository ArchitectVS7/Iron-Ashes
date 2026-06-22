/**
 * Monte-Carlo sweep (Stage 4c) — run the matchups across many seeds and reduce
 * each game to metrics. Deterministic: seeds are explicit data, seat assignment
 * is pure, and `playHeadlessGame` is reproducible — so `runSweep` is `f(config)`.
 */

import type { GameMode } from '../types.js';
import { playHeadlessGame } from './driver.js';
import { policyOf, type ArchetypeId } from './archetypes.js';
import { computeMetrics, type GameMetrics } from './metrics.js';
import type { Matchup } from './matchups.js';

export interface SweepConfig {
  readonly seeds: readonly number[];
  readonly playerCounts: readonly number[];
  readonly modes: readonly GameMode[];
  readonly matchups: readonly Matchup[];
  readonly maxStepsPerGame?: number;
}

export interface SweepRow {
  readonly seed: number;
  readonly playerCount: number;
  readonly mode: GameMode;
  readonly matchupId: string;
  readonly seatArchetypes: readonly ArchetypeId[];
  readonly steps: number;
  readonly hitGuard: boolean;
  readonly metrics: GameMetrics;
}

/** Run the full cross-product (seeds × playerCounts × modes × matchups). */
export function runSweep(cfg: SweepConfig): SweepRow[] {
  const rows: SweepRow[] = [];
  for (const matchup of cfg.matchups) {
    for (const playerCount of cfg.playerCounts) {
      const seatArchetypes = matchup.seatsFor(playerCount);
      const seatPolicies = seatArchetypes.map(policyOf);
      // Blood Pact: the traitor is the saboteur seat if present, else seat 0.
      const sabSeat = seatArchetypes.indexOf('saboteur');
      const bloodPactSeat = sabSeat >= 0 ? sabSeat : 0;
      for (const mode of cfg.modes) {
        for (const seed of cfg.seeds) {
          const run = playHeadlessGame({
            seed, playerCount, mode, seatPolicies, maxSteps: cfg.maxStepsPerGame,
            bloodPactSeat,
          });
          rows.push({
            seed, playerCount, mode,
            matchupId: matchup.id,
            seatArchetypes,
            steps: run.steps,
            hitGuard: run.hitGuard,
            metrics: computeMetrics(run.finalState),
          });
        }
      }
    }
  }
  return rows;
}
