#!/usr/bin/env node
/**
 * tune-5c.mjs — coordinate-descent search for Stage 5c (tune the dark).
 *
 * Runs a list of candidate `tunables` overrides through the SAME sweep the
 * sim uses, and prints a compact table: pooled SK-win, per-count SK-win
 * (2p/3p/4p), mean rounds, gambit (gambler-free), rescues, guardrails, and the
 * tuningLoss. The goal of 5c: pooled SK-win 18-22%, each count within ~±5pp of
 * pooled, rounds 10-16, guards PASS.
 *
 * Imports the COMPILED library from dist/ (run `tsc` first, or `npm run sim`
 * once this session). Determinism: seed list from SeededRandom(baseSeed).
 *
 * Usage: node scripts/tune-5c.mjs [baseSeed] [seedCount]
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
// Each: { label, tunables }. Keep small; coordinate-descent by hand from output.
const HB = { DOOM_COST_WHISPER: 6, DOOM_COST_MARCH: 9, DOOM_COST_RECKONING: 12 };  // high base
const CANDIDATES = [
  { label: 'baseline', tunables: {} },
  // Top-3 from the plane search — confirm stability on a second seed.
  { label: 'tilt6+spread5+baseUp', tunables: { DOOM_COST_PER_PLAYER: 6, SPREAD_AMOUNT_BASE: 5, DOOM_COST_WHISPER: 4, DOOM_COST_MARCH: 6, DOOM_COST_RECKONING: 9 } },
  { label: 'HB + tilt6 + spread5', tunables: { ...HB, DOOM_COST_PER_PLAYER: 6, SPREAD_AMOUNT_BASE: 5 } },
  { label: 'HB + tilt4 + spread4', tunables: { ...HB, DOOM_COST_PER_PLAYER: 4, SPREAD_AMOUNT_BASE: 4 } },
];

const pct = x => (x * 100).toFixed(1).padStart(5);
const hdr = 'candidate'.padEnd(26) + ' pooled  2p    3p    4p   |spread| rounds gambit resc  guard  loss';
console.log(`\n=== 5c tuning search === baseSeed=${baseSeed} seeds=${seedCount} matchups=${matchups.length} counts=${playerCounts.join('/')}\n`);
console.log(hdr);
console.log('-'.repeat(hdr.length));

const measured = (s, name) => s.checks.find(c => c.name === name)?.measured ?? 0;

const results = [];
for (const cand of CANDIDATES) {
  const rows = runSweep({ seeds, playerCounts, modes, matchups, tunables: cand.tunables });
  const s = summarize(rows);
  const pc = s.diagnostics.perCount;
  const counts = [2, 3, 4].map(c => pc[c]?.shadowkingWinRate ?? 0);
  const spread = Math.max(...counts) - Math.min(...counts);
  const loss = tuningLoss(s);
  const pooled = measured(s, 'Shadowking win rate');
  const rounds = measured(s, 'Mean game length (rounds)');
  const rescues = measured(s, 'Rescues per game');
  const guard = (s.dominancePass && !s.freeRider?.freeRidingRewarded && s.hitGuardCount === 0) ? 'PASS' : 'FAIL';
  results.push({ label: cand.label, pooled, loss, guard });
  console.log(
    cand.label.padEnd(26) +
    ' ' + pct(pooled) +
    ' ' + pct(counts[0]) + ' ' + pct(counts[1]) + ' ' + pct(counts[2]) +
    '  ' + pct(spread) +
    '  ' + rounds.toFixed(1).padStart(5) +
    '  ' + pct(s.diagnostics.gambitFireRateNoGambler) +
    ' ' + rescues.toFixed(2).padStart(5) +
    '  ' + guard.padEnd(5) +
    '  ' + loss.toFixed(1).padStart(7),
  );
}

console.log('\nRanked by loss (best first):');
for (const r of [...results].sort((a, b) => a.loss - b.loss)) {
  console.log(`  ${r.loss.toFixed(1).padStart(8)}  ${r.guard}  ${r.label}  (pooled ${(r.pooled * 100).toFixed(1)}%)`);
}
