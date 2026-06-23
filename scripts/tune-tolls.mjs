#!/usr/bin/env node
/**
 * tune-tolls.mjs — Stage T (Forge-as-Gate tolls). Confirm the toll fires and that
 * SK-win stays in band + the per-count ladder + guards hold. Tolls move banners
 * between players (zero-sum) + add march friction, so the SK-win drift is uncertain;
 * compensate with the usual dark-strength levers if it drifts out.
 * Usage: node scripts/tune-tolls.mjs [baseSeed] [seedCount]
 */
import { SeededRandom } from '../dist/utils/seeded-random.js';
import { runSweep } from '../dist/v2/sim/sweep.js';
import { standardMatchups } from '../dist/v2/sim/matchups.js';
import { summarize, tuningLoss } from '../dist/v2/sim/report.js';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const baseSeed = Number(args[0] ?? 20260622) || 20260622;
const seedCount = Number(args[1] ?? 24) || 24;
const rng = new SeededRandom(baseSeed);
const seeds = Array.from({ length: seedCount }, () => rng.int(0, 0x7fffffff));
const playerCounts = [2, 3, 4];
const modes = ['competitive'];
const matchups = standardMatchups();

const CANDIDATES = [
  { label: 'toll1 (spr5)', tunables: { FORGE_TOLL_COST: 1 } },
  { label: 'toll1 spr6', tunables: { FORGE_TOLL_COST: 1, SPREAD_AMOUNT_BASE: 6 } },
  { label: 'toll2 spr6', tunables: { FORGE_TOLL_COST: 2, SPREAD_AMOUNT_BASE: 6 } },
];

const pct = x => (x * 100).toFixed(1).padStart(5);
const measured = (s, n) => s.checks.find(c => c.name === n)?.measured ?? 0;
const hdr = 'candidate'.padEnd(20) + ' pooled  2p   3p   4p  rounds tolls sworn  SKwin guard loss';
console.log(`\n=== tolls (Stage T) === baseSeed=${baseSeed} seeds=${seedCount} matchups=${matchups.length}\n`);
console.log(hdr); console.log('-'.repeat(hdr.length));
const results = [];
for (const cand of CANDIDATES) {
  const s = summarize(runSweep({ seeds, playerCounts, modes, matchups, tunables: cand.tunables }));
  const pc = s.diagnostics.perCount;
  const counts = [2, 3, 4].map(c => pc[c]?.shadowkingWinRate ?? 0);
  const pooled = measured(s, 'Shadowking win rate');
  const inBand = pooled >= 0.18 && pooled <= 0.22;
  const guard = (s.dominancePass && !s.freeRider?.freeRidingRewarded && s.hitGuardCount === 0) ? 'PASS' : 'FAIL';
  const spread = Math.max(...counts) - Math.min(...counts);
  results.push({ label: cand.label, pooled, inBand, guard, spread, loss: tuningLoss(s) });
  console.log(cand.label.padEnd(20) + ' ' + pct(pooled) + ' ' + pct(counts[0]) + ' ' + pct(counts[1]) + ' ' + pct(counts[2]) +
    '  ' + measured(s, 'Mean game length (rounds)').toFixed(1).padStart(5) +
    ' ' + (s.diagnostics.tollsPerGame ?? 0).toFixed(2).padStart(5) +
    ' ' + (s.diagnostics.oathsSwornPerGame ?? 0).toFixed(2).padStart(5) +
    '  ' + (inBand ? ' in ' : 'OUT') + '  ' + guard.padEnd(4) + ' ' + tuningLoss(s).toFixed(1).padStart(6));
}
console.log('\nIn-band + guards PASS + tolls firing (>0.3/game), by loss:');
for (const r of results.filter(r => r.inBand && r.guard === 'PASS').sort((a, b) => a.loss - b.loss)) {
  console.log(`  ${r.label}  (SK ${(r.pooled * 100).toFixed(1)}%, |spread| ${(r.spread * 100).toFixed(1)}pp)`);
}
