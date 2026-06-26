/**
 * Balance lock (Assessment June-25 #2) — the 18–22% Shadowking win-rate band,
 * the game's CENTRAL PROMISE, asserted as a test so any tunable change that
 * breaks it turns pre-push + CI red. Previously the band was only *reported*:
 * `scripts/sim.mjs` exited non-zero solely on non-termination guards, so a
 * balance regression could ship with CI green. (`npm run sim` now also fails
 * on a band miss — this test is the fast tripwire that runs in every CI gate.)
 *
 * Deterministic by construction: the seed list is derived from a fixed base
 * seed via SeededRandom (never Math.random), and runSweep is pure over the real
 * reducer — so this config reproduces the SAME pooled rate on every run; it is a
 * regression lock, not a flaky sample. This 5-seed × standard-matchup × [2,3,4]
 * proxy reads 20.2% today, identical to the canonical 40-seed lock
 * (docs/handoff/stage5-tuning-log.md §5f). The full sweep stays in `npm run sim`.
 */

import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import { runSweep } from '../../src/v2/sim/sweep.js';
import { standardMatchups } from '../../src/v2/sim/matchups.js';
import { summarize, TARGETS } from '../../src/v2/sim/report.js';

/** Canonical lock base seed (docs/handoff/stage5-tuning-log.md §5f). */
const LOCK_BASE_SEED = 20260622;
/** 5 seeds × 3 counts × standardMatchups() = 525 games (~8s); reads 20.2%. */
const LOCK_SEED_COUNT = 5;

/** Deterministic seed list — same derivation as scripts/sim.mjs (no Math.random). */
function lockSeeds(): number[] {
  const rng = new SeededRandom(LOCK_BASE_SEED);
  return Array.from({ length: LOCK_SEED_COUNT }, () => rng.int(0, 0x7fffffff));
}

describe('balance lock — Shadowking win-rate band (§9, 18–22%)', () => {
  it(
    'keeps the pooled Shadowking win rate inside 18–22% at the locked tunables',
    () => {
      const rows = runSweep({
        seeds: lockSeeds(),
        playerCounts: [2, 3, 4], // pooled target — per-count is a gradient by design (§9)
        modes: ['competitive'],
        matchups: standardMatchups(),
      });
      const summary = summarize(rows);
      const sk = summary.checks.find(c => c.name === TARGETS.shadowkingWinRate.label);
      expect(sk).toBeDefined();

      // The band IS the promise: a tunable change that pushes this out of [18,22]
      // is a central-balance regression and MUST fail CI, not be silently reported.
      expect(sk!.measured, `pooled SK win rate ${(sk!.measured * 100).toFixed(1)}% outside §9 band`)
        .toBeGreaterThanOrEqual(TARGETS.shadowkingWinRate.lo);
      expect(sk!.measured, `pooled SK win rate ${(sk!.measured * 100).toFixed(1)}% outside §9 band`)
        .toBeLessThanOrEqual(TARGETS.shadowkingWinRate.hi);
      expect(sk!.pass).toBe(true);

      // A non-terminating game would poison the rate — guard against silent hangs.
      expect(summary.hitGuardCount).toBe(0);
    },
    60_000, // ~8s locally; generous headroom for slower CI runners
  );
});
