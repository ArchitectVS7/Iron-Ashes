#!/usr/bin/env node
/**
 * tune-allbroken.mjs — Stage A (all-broken → Shadowking victory).
 *
 * Reclassifying all_broken from draw→SK-win added a flat ~+2.3pp to pooled SK-win
 * (now 22.0% @ defaults — at the ceiling). Recenter to ~20% with headroom for the
 * 2-seed lock, WITHOUT breaking the per-count ladder, the gambit-free band, or the
 * all-broken-share guard (the dark should still win mostly by the Keystone assault).
 *
 * Usage: node scripts/tune-allbroken.mjs [baseSeed] [seedCount]
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
  { label: 'spr7 (current)', tunables: {} },
  { label: 'spr6+doomPP6', tunables: { SPREAD_AMOUNT_BASE: 6, DOOM_COST_PER_PLAYER: 6 } },
  { label: 'spr6+doomPP7', tunables: { SPREAD_AMOUNT_BASE: 6, DOOM_COST_PER_PLAYER: 7 } },
  { label: 'spr6+doomPP8', tunables: { SPREAD_AMOUNT_BASE: 6, DOOM_COST_PER_PLAYER: 8 } },
  { label: 'spr6 only', tunables: { SPREAD_AMOUNT_BASE: 6 } },
];

const pct = x => (x * 100).toFixed(1).padStart(5);
const measured = (s, n) => s.checks.find(c => c.name === n)?.measured ?? 0;
const measuredLike = (s, sub) => s.checks.find(c => c.name.includes(sub))?.measured ?? 0;
const hdr = 'candidate'.padEnd(18) + ' pooled  2p   3p   4p  rounds gmbF rescu abShare SKwin guard loss';
console.log(`\n=== Stage A all-broken recenter === baseSeed=${baseSeed} seeds=${seedCount} matchups=${matchups.length}\n`);
console.log(hdr); console.log('-'.repeat(hdr.length));
const results = [];
for (const cand of CANDIDATES) {
  const s = summarize(runSweep({ seeds, playerCounts, modes, matchups, tunables: cand.tunables }));
  const pc = s.diagnostics.perCount;
  const counts = [2, 3, 4].map(c => pc[c]?.shadowkingWinRate ?? 0);
  const pooled = measured(s, 'Shadowking win rate');
  const gmbF = s.diagnostics.gambitFireRateNoGambler;
  const inBand = pooled >= 0.18 && pooled <= 0.22;
  const gmbOk = gmbF >= 0.10 && gmbF <= 0.20;
  const guard = (s.dominancePass && !s.freeRider?.freeRidingRewarded && s.hitGuardCount === 0) ? 'PASS' : 'FAIL';
  results.push({ label: cand.label, pooled, inBand, gmbOk, guard, abShare: s.diagnostics.allBrokenWinShare, loss: tuningLoss(s) });
  console.log(cand.label.padEnd(18) + ' ' + pct(pooled) + ' ' + pct(counts[0]) + ' ' + pct(counts[1]) + ' ' + pct(counts[2]) +
    '  ' + measured(s, 'Mean game length (rounds)').toFixed(1).padStart(5) +
    ' ' + pct(gmbF) + ' ' + measuredLike(s, 'Rescues per game').toFixed(2).padStart(5) +
    ' ' + pct(s.diagnostics.allBrokenWinShare) +
    '  ' + (inBand ? ' in ' : 'OUT') + '  ' + guard.padEnd(4) + ' ' + tuningLoss(s).toFixed(1).padStart(6));
}
console.log('\nIn-band (target ~20 for headroom) + gambit-free in 10-20 + guards PASS, by loss:');
for (const r of results.filter(r => r.inBand && r.gmbOk && r.guard === 'PASS').sort((a, b) => a.loss - b.loss)) {
  console.log(`  ${r.label}  (SK ${(r.pooled * 100).toFixed(1)}%, all-broken share ${(r.abShare * 100).toFixed(1)}%)`);
}
