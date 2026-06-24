#!/usr/bin/env node
/**
 * tune-herald-piece.mjs — Stage HL (the literal Herald lone-runner).
 *
 * The literal piece RAISED political uptake (the AI re-recruits after captures) → more
 * deep-hand pledging → dark too weak (SK-win 15.3% @ Stage-A defaults). Recenter to ~20%
 * WITHOUT breaking the 2p-hardest ladder (Stage A), the gambit-free band, or the parity/
 * no-dominant guards — and keep the interception drama alive (captures > 0).
 *
 * Usage: node scripts/tune-herald-piece.mjs [baseSeed] [seedCount]
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
  { label: 'spr7 (r2 base)', tunables: { SPREAD_AMOUNT_BASE: 7 } },
  { label: 'spr7 recruit3', tunables: { SPREAD_AMOUNT_BASE: 7, HERALD_RECRUIT_COST: 3 } },
  { label: 'spr7 recruit4', tunables: { SPREAD_AMOUNT_BASE: 7, HERALD_RECRUIT_COST: 4 } },
  { label: 'spr6 recruit3', tunables: { SPREAD_AMOUNT_BASE: 6, HERALD_RECRUIT_COST: 3 } },
  { label: 'spr8 recruit3', tunables: { SPREAD_AMOUNT_BASE: 8, HERALD_RECRUIT_COST: 3 } },
];

const pct = x => (x * 100).toFixed(1).padStart(5);
const measured = (s, n) => s.checks.find(c => c.name && c.name.includes(n))?.measured ?? 0;
const hdr = 'candidate'.padEnd(16) + ' pooled  2p   3p   4p  rounds gmbF rescu herald cap  SKwin guard loss';
console.log(`\n=== Stage HL Herald-piece recenter === baseSeed=${baseSeed} seeds=${seedCount} matchups=${matchups.length}\n`);
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
  const cap = s.diagnostics.heraldCapturesPerGame;
  results.push({ label: cand.label, pooled, inBand, gmbOk, guard, cap, loss: tuningLoss(s) });
  console.log(cand.label.padEnd(16) + ' ' + pct(pooled) + ' ' + pct(counts[0]) + ' ' + pct(counts[1]) + ' ' + pct(counts[2]) +
    '  ' + measured(s, 'Mean game length').toFixed(1).padStart(5) +
    ' ' + pct(gmbF) + ' ' + measured(s, 'Rescues per game').toFixed(2).padStart(5) +
    ' ' + (s.diagnostics.heraldsPerGame ?? 0).toFixed(2).padStart(5) + ' ' + cap.toFixed(2).padStart(4) +
    '  ' + (inBand ? ' in ' : 'OUT') + '  ' + guard.padEnd(4) + ' ' + tuningLoss(s).toFixed(1).padStart(6));
}
console.log('\nIn-band + gambit-free 10-20 + guards PASS + captures>0 (drama alive), by loss:');
for (const r of results.filter(r => r.inBand && r.gmbOk && r.guard === 'PASS' && r.cap > 0).sort((a, b) => a.loss - b.loss)) {
  console.log(`  ${r.label}  (SK ${(r.pooled * 100).toFixed(1)}%, captures ${r.cap.toFixed(2)}/game)`);
}
