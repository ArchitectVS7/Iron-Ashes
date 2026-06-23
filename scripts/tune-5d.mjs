#!/usr/bin/env node
/**
 * tune-5d.mjs — coordinate-descent search for the rescue/break economy (Stage 5d).
 *
 * Goal: rescues 2–4/game (currently ~0) without breaking the rest. Levers:
 *   LANDED_STRIKE_WOUNDS    the dark's break-vector (more breaks → more rescue chances)
 *   BREAK_THRESHOLD         lower ⇒ more breaks
 *   RESCUE_COST             lower ⇒ cheaper rescue
 *   RESCUE_TRIBUTE_BANNERS  win-currency payoff (design, not the sim's rescue trigger)
 *   SPREAD_AMOUNT_BASE      OFFSET — the break-vector strengthens the dark; trim to hold band
 *
 * Watch: SK-win 18–22, all_broken < ~5%, rescues 2–4, guards PASS.
 * Same method/output as tune-5dark.mjs. Imports COMPILED dist/ (run tsc / npm run sim first).
 * Usage: node scripts/tune-5d.mjs [baseSeed] [seedCount]
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

// ── Candidate grid ────────────────────────────────────────────────
// Round 2: pair more breaks (bt↓, wounds↑) with a STRONGER base dark (SPREAD↑, to
// offset the steer-thrash that breaks cause) and FASTER recovery (BROKEN_MAX_ROUNDS↓,
// to cut all_broken draws). R = cheaper + win-currency rescue.
// Round 3: find the best SAFE sweet spot — SK 18-22, all_broken<5%, max rescues.
// bt5 keeps all_broken low; tune SPREAD so SK lands in band; probe wounds for rescues.
// Confirm the safe finalists at 40 seeds × 2 seeds.
const R = { RESCUE_COST: 1, RESCUE_TRIBUTE_BANNERS: 2 };
const CANDIDATES = [
  { label: 'baseline (levers off)', tunables: {} },
  { label: 'w2 bt5 mr2 (winner)', tunables: { LANDED_STRIKE_WOUNDS: 2, BREAK_THRESHOLD: 5, BROKEN_MAX_ROUNDS: 2, ...R } },
  { label: 'w2 bt6 mr2 (safer)', tunables: { LANDED_STRIKE_WOUNDS: 2, BREAK_THRESHOLD: 6, BROKEN_MAX_ROUNDS: 2, ...R } },
];

const pct = x => (x * 100).toFixed(1).padStart(5);
const measured = (s, name) => s.checks.find(c => c.name === name)?.measured ?? 0;
const hdr = 'candidate'.padEnd(22) + ' pooled  2p   3p   4p  rounds  resc  break aBrk% cRes% SKwin guard loss';
console.log(`\n=== 5d rescue-economy search === baseSeed=${baseSeed} seeds=${seedCount} matchups=${matchups.length}\n`);
console.log(hdr);
console.log('-'.repeat(hdr.length));

const results = [];
for (const cand of CANDIDATES) {
  const rows = runSweep({ seeds, playerCounts, modes, matchups, tunables: cand.tunables });
  const s = summarize(rows);
  const pc = s.diagnostics.perCount;
  const counts = [2, 3, 4].map(c => pc[c]?.shadowkingWinRate ?? 0);
  const loss = tuningLoss(s);
  const pooled = measured(s, 'Shadowking win rate');
  const rounds = measured(s, 'Mean game length (rounds)');
  const rescues = measured(s, 'Rescues per game');
  const breaks = s.diagnostics.breakRatePerGame ?? 0;
  const cRes = s.diagnostics.conditionalRescueRate ?? 0;
  const allBroken = (s.endReasonCounts?.all_broken ?? 0) / (s.totalGames || 1);
  const inBand = pooled >= 0.18 && pooled <= 0.22;
  const guard = (s.dominancePass && !s.freeRider?.freeRidingRewarded && s.hitGuardCount === 0) ? 'PASS' : 'FAIL';
  results.push({ label: cand.label, pooled, rescues, allBroken, loss, guard, inBand });
  console.log(
    cand.label.padEnd(22) +
    ' ' + pct(pooled) + ' ' + pct(counts[0]) + ' ' + pct(counts[1]) + ' ' + pct(counts[2]) +
    '  ' + rounds.toFixed(1).padStart(5) +
    '  ' + rescues.toFixed(2).padStart(5) +
    ' ' + breaks.toFixed(2).padStart(5) +
    ' ' + pct(allBroken) +
    ' ' + pct(cRes) +
    '  ' + (inBand ? ' in ' : 'OUT') +
    '  ' + guard.padEnd(4) +
    ' ' + loss.toFixed(1).padStart(6),
  );
}

console.log('\nRescues 2-4 + SK-win in-band + all_broken<5% + guards PASS:');
for (const r of results.filter(r => r.rescues >= 2 && r.rescues <= 4 && r.inBand && r.allBroken < 0.05 && r.guard === 'PASS').sort((a, b) => a.loss - b.loss)) {
  console.log(`  ${r.label}  (rescues ${r.rescues.toFixed(2)}, SK ${(r.pooled * 100).toFixed(1)}%, aBrk ${(r.allBroken * 100).toFixed(1)}%)`);
}
