#!/usr/bin/env node
/**
 * tune-herald.mjs — Stage H (the big re-tune). Heralds at defaults dropped SK-win to
 * 14.8% (Parley pushback + deep-hand pledging weaken the dark) and left the political
 * build under-winning (23.9% vs martial 33.5%). Recover SK-win 18-22, get the two
 * builds to parity (neither win rate dominates), keep gambit(noG) ≤20 + guards + the
 * oath/toll layers. Levers: SPREAD (dark), HERALD_HAND_BONUS (political pledge power),
 * HERALD_COMBAT_PENALTY (political combat/parity), HERALD_PUSHBACK (anti-dark verb).
 * Usage: node scripts/tune-herald.mjs [baseSeed] [seedCount]
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
  { label: 'spr7 hand1 (winner)', tunables: { SPREAD_AMOUNT_BASE: 7, HERALD_HAND_BONUS: 1 } },
  { label: 'spr7 (hand2)', tunables: { SPREAD_AMOUNT_BASE: 7 } },
  { label: 'spr7 hand1 pen0', tunables: { SPREAD_AMOUNT_BASE: 7, HERALD_HAND_BONUS: 1, HERALD_COMBAT_PENALTY: 0 } },
];

const pct = x => (x * 100).toFixed(1).padStart(5);
const measured = (s, n) => s.checks.find(c => c.name === n)?.measured ?? 0;
const hdr = 'candidate'.padEnd(20) + ' SKwin gamb(noG) pol% polWin marWin parity guard loss';
console.log(`\n=== herald (Stage H) === baseSeed=${baseSeed} seeds=${seedCount}\n`);
console.log(hdr); console.log('-'.repeat(hdr.length));
const results = [];
for (const cand of CANDIDATES) {
  const s = summarize(runSweep({ seeds, playerCounts, modes, matchups, tunables: cand.tunables }));
  const d = s.diagnostics;
  const sk = measured(s, 'Shadowking win rate');
  const gNoG = d.gambitFireRateNoGambler ?? 0;
  const pol = d.politicalWinRate ?? 0, mar = d.martialWinRate ?? 0;
  const ratio = pol > 0 && mar > 0 ? Math.max(pol, mar) / Math.min(pol, mar) : 99;
  const skIn = sk >= 0.18 && sk <= 0.22;
  const parityOK = ratio <= 1.3; // neither build wins >1.3x the other
  const guard = (s.dominancePass && !s.freeRider?.freeRidingRewarded && s.hitGuardCount === 0) ? 'PASS' : 'FAIL';
  results.push({ label: cand.label, sk, gNoG, skIn, parityOK, ratio, guard, loss: tuningLoss(s) });
  console.log(cand.label.padEnd(20) +
    ' ' + pct(sk) + (skIn ? '*' : ' ') + '  ' + pct(gNoG) + (gNoG <= 0.20 ? '*' : ' ') +
    '  ' + pct(d.politicalSeatShare ?? 0) + ' ' + pct(pol) + ' ' + pct(mar) +
    '  ' + ratio.toFixed(2) + (parityOK ? '*' : ' ') +
    '  ' + guard.padEnd(4) + ' ' + tuningLoss(s).toFixed(1).padStart(6));
}
console.log('\nSK in-band + gambit(noG)≤20 + build parity (≤1.3x) + guards, by loss:');
for (const r of results.filter(r => r.skIn && r.gNoG <= 0.20 && r.parityOK && r.guard === 'PASS').sort((a, b) => a.loss - b.loss)) {
  console.log(`  ${r.label}  (SK ${(r.sk * 100).toFixed(1)}%, parity ${r.ratio.toFixed(2)}x)`);
}
