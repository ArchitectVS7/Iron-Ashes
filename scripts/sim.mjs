#!/usr/bin/env node
/**
 * sim.mjs — run a deterministic balance/strategy sweep and write a report.
 *
 * The sim LIBRARY is pure TS under src/v2/sim/ (gated by verify); this runner is
 * a plain Node ESM script (so it may use fs/timestamps without touching the §7
 * determinism invariant that governs src/v2). It imports the COMPILED library
 * from dist/ — so `npm run sim` builds first (`tsc && node scripts/sim.mjs`).
 *
 * Usage: node scripts/sim.mjs [baseSeed] [seedCount] [--quick]
 *   baseSeed   default 20260622   (seed list is derived deterministically from it)
 *   seedCount  default 40         (games per matchup-cell)
 *   --quick    small set (fast smoke of the whole pipeline)
 *
 * Determinism: the seed LIST is generated via SeededRandom(baseSeed) — never
 * Math.random — so a given (baseSeed, seedCount) reproduces the same sweep.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SeededRandom } from '../dist/utils/seeded-random.js';
import { runSweep } from '../dist/v2/sim/sweep.js';
import { standardMatchups, MIXED_CANONICAL, bloodPactMatchups } from '../dist/v2/sim/matchups.js';
import { summarize, renderMarkdown, summarizeBloodPact, renderBloodPactMarkdown } from '../dist/v2/sim/report.js';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const quick = args.includes('--quick');
const bloodpact = args.includes('--bloodpact');
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
}

console.log(`\n${rows.length} games in ${(elapsedMs / 1000).toFixed(1)}s → sim-results/${runId}/`);
console.log('\n' + md);

// Exit non-zero only if a game failed to terminate (a real bug). Target PASS/FAIL
// is reported but does NOT fail the process (untuned defaults are expected to miss).
process.exit(hitGuard > 0 ? 1 : 0);
