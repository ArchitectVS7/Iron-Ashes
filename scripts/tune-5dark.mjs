#!/usr/bin/env node
/**
 * tune-5dark.mjs — coordinate-descent retune AFTER the Dark Engagement patch.
 *
 * The mechanic patch (design-history/DESIGN-V2-DARK-ENGAGEMENT.md) lifted SK-win 20.2%→23.9%
 * (above the 18-22 band) by adding engaged + scaled Death Knights. This search
 * finds the smallest knob change that pulls pooled SK-win back to ~20% WHILE
 * preserving the gains: DK-kills > 0, the narrowed per-count gradient, guards PASS.
 *
 * Levers (all weaken the dark slightly, in the wired seam):
 *   SPREAD_AMOUNT_BASE   landed-strike damage (5) — uniform doom-win lever
 *   DOOM_COST_PER_PLAYER per-player tilt (6) — strength at high counts
 *   DK_PER_PLAYER        DK army scaling (1) — engagement pressure at high counts
 *
 * Same method/output as tune-5c.mjs. Imports COMPILED dist/ (run tsc / npm run sim first).
 * Usage: node scripts/tune-5dark.mjs [baseSeed] [seedCount]
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
// baseline {} = the new post-patch engine (SPREAD 5, tilt 6, DK_PER_PLAYER 1).
const CANDIDATES = [
  { label: 'baseline (post-patch)', tunables: {} },
  { label: 'spread4 (dkpp1)', tunables: { SPREAD_AMOUNT_BASE: 4 } },
  { label: 'spread4 + dkpp0', tunables: { SPREAD_AMOUNT_BASE: 4, DK_PER_PLAYER: 0 } },
];

const pct = x => (x * 100).toFixed(1).padStart(5);
const measured = (s, name) => s.checks.find(c => c.name === name)?.measured ?? 0;
const hdr = 'candidate'.padEnd(24) + ' pooled  2p    3p    4p   |spr| round gambit resc  dkkill guard  loss';
console.log(`\n=== 5-dark retune === baseSeed=${baseSeed} seeds=${seedCount} matchups=${matchups.length} counts=${playerCounts.join('/')}\n`);
console.log(hdr);
console.log('-'.repeat(hdr.length));

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
  const dkk = s.diagnostics.dkKillRate ?? 0;
  const inBand = pooled >= 0.18 && pooled <= 0.22;
  const guard = (s.dominancePass && !s.freeRider?.freeRidingRewarded && s.hitGuardCount === 0) ? 'PASS' : 'FAIL';
  results.push({ label: cand.label, pooled, loss, guard, inBand, dkk });
  console.log(
    cand.label.padEnd(24) +
    ' ' + pct(pooled) +
    ' ' + pct(counts[0]) + ' ' + pct(counts[1]) + ' ' + pct(counts[2]) +
    '  ' + pct(spread) +
    ' ' + rounds.toFixed(1).padStart(5) +
    '  ' + pct(s.diagnostics.gambitFireRateNoGambler) +
    ' ' + rescues.toFixed(2).padStart(5) +
    '  ' + dkk.toFixed(2).padStart(5) +
    '  ' + guard.padEnd(5) +
    '  ' + loss.toFixed(1).padStart(7),
  );
}

console.log('\nIn-band (18-22%) + guards PASS, ranked by loss:');
for (const r of results.filter(r => r.inBand && r.guard === 'PASS').sort((a, b) => a.loss - b.loss)) {
  console.log(`  ${r.loss.toFixed(1).padStart(8)}  ${r.label}  (pooled ${(r.pooled * 100).toFixed(1)}%, dkKills ${r.dkk.toFixed(2)})`);
}
