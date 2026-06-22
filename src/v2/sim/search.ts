/**
 * Coordinate-descent search harness (Stage 5b) — the mechanical core of the
 * balance tuning. Propose candidate tunable-sets for one lever, run each through
 * the same sweep, and rank by `tuningLoss` (lower = closer to all §9 bands with
 * both guardrails held). The human reviews the ranking and picks; then moves to
 * the next lever. Deterministic for a fixed sweep config.
 *
 * Lives in its own module so `sweep.ts` stays free of a `report.ts` dependency
 * (avoids a runtime import cycle).
 */

import type { Tunables } from '../tunables.js';
import { runSweep, type SweepConfig } from './sweep.js';
import { summarize, tuningLoss, type SweepSummary } from './report.js';

export interface TunableCandidate {
  readonly label: string;
  readonly tunables: Partial<Tunables>;
}

export interface CandidateResult {
  readonly label: string;
  readonly tunables: Partial<Tunables>;
  readonly summary: SweepSummary;
  readonly loss: number;
}

/** Run each candidate through `base` and return them ranked best-loss-first. */
export function runTunableCandidates(
  base: Omit<SweepConfig, 'tunables'>,
  candidates: readonly TunableCandidate[],
): CandidateResult[] {
  return candidates
    .map((c): CandidateResult => {
      const summary = summarize(runSweep({ ...base, tunables: c.tunables }));
      return { label: c.label, tunables: c.tunables, summary, loss: tuningLoss(summary) };
    })
    .sort((a, b) => a.loss - b.loss);
}
