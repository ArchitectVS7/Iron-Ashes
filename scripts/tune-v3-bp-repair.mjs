#!/usr/bin/env node
/**
 * tune-v3-bp-repair.mjs — the Blood-Pact re-pair grid for the T-239 re-lock.
 *
 * WHY. The traitor rides the SAME doom clock as the Shadowking, so any doom-pacing change to the
 * herald-OFF overlay moves the traitor economy with it. The T-239 competitive re-lock (SPREAD
 * 2.6→2.2, DOOM_COST_MARCH 14→11, DOOM_COST_PLAYER_DIVISOR 4.5→5.0) cooled traitor win to
 * 12.5 / 18.1% against the ~20% design target — exactly the coupling the T2-3 overlay comment
 * recorded the last time the clock moved. This grid re-pairs the two BP dials:
 *
 *   BLOOD_PACT_SPREAD_BONUS  the traitor's doom-path multiplier (1.2) — a STEP function
 *                            historically, so it sets the coarse level
 *   SABOTEUR_COVER           the bluff dial (0.735) — does the fine work on exposure
 *
 * Targets (§10 / the v2-era BP lock): traitor win ~20%, exposure ~70%, accuracy ~71%+.
 *
 * Usage: node scripts/tune-v3-bp-repair.mjs [seedCount]   (both canonical seeds, always)
 * Imports the COMPILED dist/ — run `tsc` first.
 */

import { SeededRandom } from '../dist/utils/seeded-random.js';
import { runSweep } from '../dist/v3/sim/sweep.js';
import { bloodPactMatchups } from '../dist/v3/sim/matchups.js';
import { summarizeBloodPact } from '../dist/v3/sim/report.js';

const seedCount = Number(process.argv[2] ?? 40) || 40;
const BASE_SEEDS = [20260622, 20260628];
const playerCounts = [2, 3, 4];
const matchups = bloodPactMatchups();

const CANDIDATES = [
  { label: 'cover0.735 (current)', tunables: {} },
  { label: 'cover0.750', tunables: { SABOTEUR_COVER: 0.750 } },
  { label: 'cover0.755', tunables: { SABOTEUR_COVER: 0.755 } },
  { label: 'cover0.760', tunables: { SABOTEUR_COVER: 0.760 } },
  { label: 'cover0.765', tunables: { SABOTEUR_COVER: 0.765 } },
];

const pct = x => (x * 100).toFixed(1).padStart(5);
console.log(`\n=== v3 Blood-Pact re-pair === seeds=${BASE_SEEDS.join('+')} n=${seedCount} ` +
  `counts=${playerCounts.join('/')} matchups=${matchups.length} · target: win ~20%, exposure ~70%\n`);
console.log('candidate'.padEnd(20) + '  win622 exp622 acc622 | win628 exp628 acc628 | winMean');
console.log('-'.repeat(84));

for (const cand of CANDIDATES) {
  const per = BASE_SEEDS.map(base => {
    const rng = new SeededRandom(base);
    const seeds = Array.from({ length: seedCount }, () => rng.int(0, 0x7fffffff));
    const rows = runSweep({ seeds, playerCounts, modes: ['blood_pact'], matchups, tunables: cand.tunables });
    return summarizeBloodPact(rows);
  });
  const winMean = (per[0].traitorWinRate + per[1].traitorWinRate) / 2;
  console.log(
    cand.label.padEnd(20) +
    `  ${pct(per[0].traitorWinRate)} ${pct(per[0].traitorExposureRate)} ${pct(per[0].accusationAccuracy)} |` +
    ` ${pct(per[1].traitorWinRate)} ${pct(per[1].traitorExposureRate)} ${pct(per[1].accusationAccuracy)} |` +
    ` ${pct(winMean)}`,
  );
}
console.log('\nThe competitive sweep is UNAFFECTED by these dials (blood_pact mode only).\n');
