#!/usr/bin/env node
/**
 * tune-oaths.mjs — restore SK-win to band after the Oaths spine.
 *
 * Oaths added social density (sworn ~6.6/game, broken ~4.2) but weakened the dark
 * to 15.4% (the banner dividends + non-aggression make players stronger). Search the
 * dark-strength + oath-economy levers to land SK-win 18-22 while KEEPING the drama
 * (oaths sworn ≥ ~3, a real break rate), all_broken < 5%, guards PASS.
 *
 * Same method/output as tune-5d.mjs. Imports COMPILED dist/ (run tsc / npm run sim first).
 * Usage: node scripts/tune-oaths.mjs [baseSeed] [seedCount]
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
  { label: 'spr5 (div1, winner)', tunables: { SPREAD_AMOUNT_BASE: 5 } },
  { label: 'spr5 w3 (div1)', tunables: { SPREAD_AMOUNT_BASE: 5, LANDED_STRIKE_WOUNDS: 3 } },
  { label: 'spr6 div0 w3', tunables: { SPREAD_AMOUNT_BASE: 6, OATH_DIVIDEND: 0, LANDED_STRIKE_WOUNDS: 3 } },
];

const pct = x => (x * 100).toFixed(1).padStart(5);
const measured = (s, name) => s.checks.find(c => c.name === name)?.measured ?? 0;
const hdr = 'candidate'.padEnd(20) + ' pooled  rounds resc  break aBrk% sworn brok  SKwin guard loss';
console.log(`\n=== oaths retune === baseSeed=${baseSeed} seeds=${seedCount} matchups=${matchups.length}\n`);
console.log(hdr); console.log('-'.repeat(hdr.length));

const results = [];
for (const cand of CANDIDATES) {
  const rows = runSweep({ seeds, playerCounts, modes, matchups, tunables: cand.tunables });
  const s = summarize(rows);
  const loss = tuningLoss(s);
  const pooled = measured(s, 'Shadowking win rate');
  const rounds = measured(s, 'Mean game length (rounds)');
  const rescues = measured(s, 'Rescues per game');
  const breaks = s.diagnostics.breakRatePerGame ?? 0;
  const allBroken = (s.endReasonCounts?.all_broken ?? 0) / (s.totalGames || 1);
  const sworn = s.diagnostics.oathsSwornPerGame ?? 0;
  const broken = s.diagnostics.oathsBrokenPerGame ?? 0;
  const inBand = pooled >= 0.18 && pooled <= 0.22;
  const guard = (s.dominancePass && !s.freeRider?.freeRidingRewarded && s.hitGuardCount === 0) ? 'PASS' : 'FAIL';
  results.push({ label: cand.label, pooled, sworn, broken, allBroken, loss, guard, inBand });
  console.log(cand.label.padEnd(20) + ' ' + pct(pooled) + '  ' + rounds.toFixed(1).padStart(5) +
    '  ' + rescues.toFixed(2).padStart(5) + ' ' + breaks.toFixed(2).padStart(5) + ' ' + pct(allBroken) +
    ' ' + sworn.toFixed(2).padStart(5) + ' ' + broken.toFixed(2).padStart(5) +
    '  ' + (inBand ? ' in ' : 'OUT') + '  ' + guard.padEnd(4) + ' ' + loss.toFixed(1).padStart(6));
}

console.log('\nIn-band + all_broken<5% + guards + oaths-alive (sworn≥3), by loss:');
for (const r of results.filter(r => r.inBand && r.allBroken < 0.05 && r.guard === 'PASS' && r.sworn >= 3).sort((a,b)=>a.loss-b.loss)) {
  console.log(`  ${r.label}  (SK ${(r.pooled*100).toFixed(1)}%, sworn ${r.sworn.toFixed(1)}, broken ${r.broken.toFixed(1)})`);
}
