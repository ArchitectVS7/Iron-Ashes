#!/usr/bin/env node
/**
 * sim.mjs — run a deterministic balance/strategy sweep and write a report.
 *
 * The sim LIBRARY is pure TS under src/v2/sim/ (gated by verify); this runner is
 * a plain Node ESM script (so it may use fs/timestamps without touching the §7
 * determinism invariant that governs src/v2). It imports the COMPILED library
 * from dist/ — so `npm run sim` builds first (`tsc && node scripts/sim.mjs`).
 *
 * Usage: node scripts/sim.mjs [baseSeed] [seedCount] [--quick] [--report-only]
 *   baseSeed       default 20260622   (seed list is derived deterministically from it)
 *   seedCount      default 40         (games per matchup-cell)
 *   --quick        small set (fast smoke of the whole pipeline)
 *   --report-only  print the report but never fail on a band miss (exploratory tuning)
 *
 * Exit code: non-zero if any game fails to terminate (a real bug) OR the 18–22%
 * Shadowking win-rate band is broken on the full competitive sweep (the game's
 * central promise). The fast CI tripwire for the band is tests/v2/balance-lock.test.ts.
 *
 * Determinism: the seed LIST is generated via SeededRandom(baseSeed) — never
 * Math.random — so a given (baseSeed, seedCount) reproduces the same sweep.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SeededRandom } from '../dist/utils/seeded-random.js';
import { runSweep } from '../dist/v2/sim/sweep.js';
import { standardMatchups, MIXED_CANONICAL, bloodPactMatchups } from '../dist/v2/sim/matchups.js';
import { summarize, renderMarkdown, summarizeBloodPact, renderBloodPactMarkdown, TARGETS } from '../dist/v2/sim/report.js';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const quick = args.includes('--quick');
const bloodpact = args.includes('--bloodpact');
const reportOnly = args.includes('--report-only');
const positional = args.filter(a => !a.startsWith('--'));

const baseSeed = Number(positional[0] ?? 20260622) || 20260622;
const seedCount = Number(positional[1] ?? (quick ? 6 : 40)) || (quick ? 6 : 40);

// Deterministic seed list from the base seed (no Math.random).
const rng = new SeededRandom(baseSeed);
const seeds = Array.from({ length: seedCount }, () => rng.int(0, 0x7fffffff));

const playerCounts = quick ? [4] : [2, 3, 4];
const modes = bloodpact ? ['blood_pact'] : ['competitive'];
const matchups = bloodpact ? bloodPactMatchups() : (quick ? [MIXED_CANONICAL] : standardMatchups());

console.log(`\n=== ${bloodpact ? 'blood-pact' : 'balance'} sweep === baseSeed=${baseSeed} seeds=${seedCount} ` +
  `counts=${playerCounts.join('/')} matchups=${matchups.length}${quick ? ' [quick]' : ''}`);

const t0 = Date.now();
const rows = runSweep({ seeds, playerCounts, modes, matchups });
const elapsedMs = Date.now() - t0;

const runId = `s${baseSeed}-n${seedCount}${bloodpact ? '-bp' : ''}${quick ? '-quick' : ''}`;
const meta = { runId, baseSeed, seedCount, playerCounts, modes, matchupCount: matchups.length };

const outDir = resolve(ROOT, 'sim-results', runId);
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'rows.json'), JSON.stringify(rows, null, 2) + '\n');

let md;
let hitGuard;
let bandFail = false; // the 18–22% Shadowking band — the game's central promise
if (bloodpact) {
  const bp = summarizeBloodPact(rows);
  hitGuard = rows.filter(r => r.hitGuard).length;
  md = renderBloodPactMarkdown(bp, meta);
  writeFileSync(resolve(outDir, 'summary.json'), JSON.stringify(bp, null, 2) + '\n');
  writeFileSync(resolve(outDir, 'BLOOD_PACT.md'), md);
} else {
  const summary = summarize(rows);
  hitGuard = summary.hitGuardCount;
  md = renderMarkdown(summary, meta);
  writeFileSync(resolve(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  writeFileSync(resolve(outDir, 'REPORT.md'), md);

  // Assert the central balance promise on the canonical competitive sweep. --quick
  // ([4]-only, mixed-only) doesn't pool to the band, and --report-only is for
  // exploratory tuning where a miss is expected — both are exempt. Blood-pact has
  // its own targets (traitor win/exposure), validated separately, not here.
  if (!quick && !reportOnly) {
    const sk = summary.checks.find(c => c.name === TARGETS.shadowkingWinRate.label);
    bandFail = sk ? !sk.pass : false;
    if (bandFail) {
      console.error(
        `\n✗ BALANCE LOCK BROKEN — Shadowking win rate ${(sk.measured * 100).toFixed(1)}% is outside ` +
          `the §9 band ${(sk.lo * 100).toFixed(0)}–${(sk.hi * 100).toFixed(0)}%. ` +
          `A tunable change has broken the game's central promise. (Re-run with --report-only to bypass.)`,
      );
    }
  }
}

console.log(`\n${rows.length} games in ${(elapsedMs / 1000).toFixed(1)}s → sim-results/${runId}/`);
console.log('\n' + md);

// Exit non-zero on a non-termination guard (a real bug) OR a broken balance lock
// (the 18–22% Shadowking band). Both are failures the sim must surface to CI.
process.exit(hitGuard > 0 || bandFail ? 1 : 0);
