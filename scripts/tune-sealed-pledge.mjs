#!/usr/bin/env node
/**
 * tune-sealed-pledge.mjs — Stage S. Pull the gambler-free Gambit fire rate (28.5%)
 * into the 10-20 band via the risk-aware seize gate (sealing → self-cover requirement),
 * keeping SK-win 18-22 + guards + the oath/toll layers intact.
 * Usage: node scripts/tune-sealed-pledge.mjs [baseSeed] [seedCount]
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

const S = 'gambit_claimant';
// Tightening the gate fixes the gambit but raises SK-win (gambits were a player win-path),
// so pair sc4/sc5 with a SPREAD compensator to land BOTH bands centrally.
const CANDIDATES = [
  { label: 'seal sc3 (spr5)', tunables: { SEALED_CORE_PLEDGE: S, GAMBIT_SELF_COVER_CARDS: 3 } },
  { label: 'seal sc4 tilt5', tunables: { SEALED_CORE_PLEDGE: S, GAMBIT_SELF_COVER_CARDS: 4, DOOM_COST_PER_PLAYER: 5 } },
];

const pct = x => (x * 100).toFixed(1).padStart(5);
const measured = (s, n) => s.checks.find(c => c.name === n)?.measured ?? 0;
const hdr = 'candidate'.padEnd(18) + ' SKwin gamb(all) gamb(noG) gWin  rounds sworn  guard loss';
console.log(`\n=== sealed-pledge (Stage S) === baseSeed=${baseSeed} seeds=${seedCount}\n`);
console.log(hdr); console.log('-'.repeat(hdr.length));
const results = [];
for (const cand of CANDIDATES) {
  const s = summarize(runSweep({ seeds, playerCounts, modes, matchups, tunables: cand.tunables }));
  const sk = measured(s, 'Shadowking win rate');
  const gNoG = s.diagnostics.gambitFireRateNoGambler ?? 0;
  const skIn = sk >= 0.18 && sk <= 0.22;
  const gIn = gNoG >= 0.10 && gNoG <= 0.20;
  const guard = (s.dominancePass && !s.freeRider?.freeRidingRewarded && s.hitGuardCount === 0) ? 'PASS' : 'FAIL';
  results.push({ label: cand.label, sk, gNoG, skIn, gIn, guard, loss: tuningLoss(s) });
  console.log(cand.label.padEnd(18) +
    ' ' + pct(sk) + (skIn ? '*' : ' ') +
    '  ' + pct(s.diagnostics.gambitSeizeRate ?? 0) +
    '   ' + pct(gNoG) + (gIn ? '*' : ' ') +
    '  ' + pct(s.diagnostics.gambitWinRate ?? 0) +
    '  ' + measured(s, 'Mean game length (rounds)').toFixed(1).padStart(5) +
    ' ' + (s.diagnostics.oathsSwornPerGame ?? 0).toFixed(2).padStart(5) +
    '  ' + guard.padEnd(4) + ' ' + tuningLoss(s).toFixed(1).padStart(6));
}
console.log('\nSK in-band + gambit(noG) in 10-20 + guards PASS, by loss:');
for (const r of results.filter(r => r.skIn && r.gIn && r.guard === 'PASS').sort((a, b) => a.loss - b.loss)) {
  console.log(`  ${r.label}  (SK ${(r.sk * 100).toFixed(1)}%, gambit-noG ${(r.gNoG * 100).toFixed(1)}%)`);
}
