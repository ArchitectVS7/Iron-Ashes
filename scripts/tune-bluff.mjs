#!/usr/bin/env node
/**
 * tune-bluff.mjs — Stage B: VALIDATE the sealed pledge (the user's "find a creative way
 * to test this").
 *
 * The seal used to be a sim no-op. Stage B gave the AI a bail-out / volunteer's-dilemma
 * channel (bailoutTrust + BAILOUT_BASE_PCT), so sealing now has something to bite on:
 *   • OPEN ('off')          → the table coordinates: ONE designated rival covers the claimant.
 *   • SEALED ('gambit_claimant'/'all') → each rival volunteers INDEPENDENTLY (a bluff):
 *     under-provision when everyone hopes someone else covers, waste when several do.
 *
 * The test: does flipping the seal MEASURABLY change the Gambit outcome (claimant win
 * rate / seize rate / SK-win) WITH the bail-out AI active? If yes, the seal earns its
 * keep as a real volunteer's dilemma. If the arms are identical, the seal is inert even
 * with bail-out — an honest negative finding (then reconsider keeping it).
 *
 * Usage: node scripts/tune-bluff.mjs [baseSeed] [seedCount]
 */
import { SeededRandom } from '../dist/utils/seeded-random.js';
import { runSweep } from '../dist/v2/sim/sweep.js';
import { standardMatchups } from '../dist/v2/sim/matchups.js';
import { summarize, tuningLoss } from '../dist/v2/sim/report.js';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const baseSeed = Number(args[0] ?? 20260622) || 20260622;
const seedCount = Number(args[1] ?? 40) || 40;
const rng = new SeededRandom(baseSeed);
const seeds = Array.from({ length: seedCount }, () => rng.int(0, 0x7fffffff));
const playerCounts = [2, 3, 4];
const modes = ['competitive'];
const matchups = standardMatchups();

const ARMS = [
  { label: "open ('off')", tunables: { SEALED_CORE_PLEDGE: 'off' } },
  { label: "sealed claimant (LOCKED)", tunables: { SEALED_CORE_PLEDGE: 'gambit_claimant' } },
  { label: "sealed all", tunables: { SEALED_CORE_PLEDGE: 'all' } },
  // Control: claimant-sealed but bail-out OFF would need an AI change; instead compare
  // open-vs-sealed above — both run the SAME bail-out AI, so any delta IS the seal's effect.
];

const pct = x => (x * 100).toFixed(1).padStart(5);
const measured = (s, n) => s.checks.find(c => c.name && c.name.includes(n))?.measured ?? 0;
const hdr = 'arm'.padEnd(26) + ' SKwin gmbFire gmbSeize gmbWIN(claimant) rounds  loss';
console.log(`\n=== Stage B sealed-pledge validation === baseSeed=${baseSeed} seeds=${seedCount} matchups=${matchups.length}`);
console.log('(all arms run the SAME bail-out AI; a delta between open and sealed IS the seal\'s effect)\n');
console.log(hdr); console.log('-'.repeat(hdr.length));
const rows = [];
for (const arm of ARMS) {
  const s = summarize(runSweep({ seeds, playerCounts, modes, matchups, tunables: arm.tunables }));
  const d = s.diagnostics;
  const row = {
    label: arm.label,
    sk: measured(s, 'Shadowking win rate'),
    gmbFire: d.gambitFireRateNoGambler,
    gmbSeize: d.gambitSeizeRate,
    gmbWin: d.gambitWinRate,
    rounds: measured(s, 'Mean game length'),
    loss: tuningLoss(s),
  };
  rows.push(row);
  console.log(arm.label.padEnd(26) + ' ' + pct(row.sk) + '  ' + pct(row.gmbFire) + '  ' + pct(row.gmbSeize) +
    '   ' + pct(row.gmbWin) + '       ' + row.rounds.toFixed(1).padStart(5) + ' ' + row.loss.toFixed(1).padStart(5));
}

const open = rows.find(r => r.label.startsWith('open'));
const sealed = rows.find(r => r.label.startsWith('sealed claimant'));
const dWin = (sealed.gmbWin - open.gmbWin) * 100;
const dSeize = (sealed.gmbSeize - open.gmbSeize) * 100;
const dSK = (sealed.sk - open.sk) * 100;
console.log('\n--- seal effect (sealed-claimant − open), bail-out AI active ---');
console.log(`  Δ gambit claimant WIN rate: ${dWin >= 0 ? '+' : ''}${dWin.toFixed(1)}pp`);
console.log(`  Δ gambit seize rate:        ${dSeize >= 0 ? '+' : ''}${dSeize.toFixed(1)}pp`);
console.log(`  Δ SK win rate:              ${dSK >= 0 ? '+' : ''}${dSK.toFixed(1)}pp`);
const MEANINGFUL = Math.abs(dWin) >= 1.0 || Math.abs(dSeize) >= 1.0 || Math.abs(dSK) >= 1.0;
console.log(MEANINGFUL
  ? '  ✅ The seal MEASURABLY shifts the Gambit outcome — it is a real volunteer\'s dilemma in-sim (keep + human-playtest the felt drama).'
  : '  ⚠️ The seal moves nothing even with bail-out active — inert in-sim; the only validated channel is the human one (flag UNTESTED, reconsider at human playtest).');
