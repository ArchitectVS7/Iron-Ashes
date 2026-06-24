#!/usr/bin/env node
/**
 * tune-5e.mjs — Stage 5e (Blood Pact accusation). Tune the hidden-traitor game into band:
 *   traitor win 12–20%, exposure 40–70%, accuracy >=45%, <=2.5 accusations/game.
 *
 * Primary lever: `saboteurCover` (the cover-vs-sabotage bluff — higher = blends more = harder to
 * catch = wins more). Secondary: `ACCUSATION_WRONG_PENALTY` (the accuser's gamble). Runs the
 * --bloodpact sweep (saboteur seat holds the Pact). Competitive mode is unaffected (knobs gate on
 * hasBloodPact) — a separate sanity check confirms byte-identical.
 *
 * Usage: node scripts/tune-5e.mjs [baseSeed] [seedCount]
 */
import { SeededRandom } from '../dist/utils/seeded-random.js';
import { runSweep } from '../dist/v2/sim/sweep.js';
import { bloodPactMatchups } from '../dist/v2/sim/matchups.js';
import { summarizeBloodPact } from '../dist/v2/sim/report.js';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const baseSeed = Number(args[0] ?? 20260622) || 20260622;
const seedCount = Number(args[1] ?? 40) || 40;
const rng = new SeededRandom(baseSeed);
const seeds = Array.from({ length: seedCount }, () => rng.int(0, 0x7fffffff));
const playerCounts = [2, 3, 4];
const modes = ['blood_pact'];
const matchups = bloodPactMatchups();

// 3D grid: SABOTEUR_COVER (bluff) × ACCUSE_MIN_SCORE (evidence bar) × BLOOD_PACT_SPREAD_BONUS
// (the dark burns hotter with a traitor → gives the traitor a doom path). All tunables.
const COVERS = [0.742, 0.745, 0.748, 0.752];
const BARS = [4];
const BONUSES = [1];

const pct = x => (x * 100).toFixed(1).padStart(5);
console.log(`\n=== Stage 5e Blood Pact (3D: cover × bar × dark-bonus) === baseSeed=${baseSeed} seeds=${seedCount} matchups=${matchups.length}`);
console.log('Target: trWIN 12-20, expose 40-70, accur >=45 (above ~30 random), acc/game <=2.5\n');
const hdr = 'cover bar bonus  trWIN  expose  accur  acc/g   verdict';
console.log(hdr); console.log('-'.repeat(hdr.length));
const passes = [];
for (const cover of COVERS) for (const bar of BARS) for (const bonus of BONUSES) {
  const s = summarizeBloodPact(runSweep({
    seeds, playerCounts, modes, matchups,
    tunables: { SABOTEUR_COVER: cover, ACCUSE_MIN_SCORE: bar, BLOOD_PACT_SPREAD_BONUS: bonus },
  }));
  const winOk = s.traitorWinRate >= 0.12 && s.traitorWinRate <= 0.20;
  const expOk = s.traitorExposureRate >= 0.40 && s.traitorExposureRate <= 0.70;
  const accOk = s.accusationAccuracy >= 0.45;
  const freqOk = s.accusationsPerGame <= 2.5;
  const nPass = [winOk, expOk, accOk, freqOk].filter(Boolean).length;
  const verdict = nPass === 4 ? 'ALL PASS ✅' :
    [winOk ? '' : 'win', expOk ? '' : 'expose', accOk ? '' : 'accur', freqOk ? '' : 'freq'].filter(Boolean).join(',');
  if (nPass === 4) passes.push({ cover, bar, bonus, s });
  console.log(`${cover.toFixed(2)}  ${bar}   ${bonus}    ${pct(s.traitorWinRate)}  ${pct(s.traitorExposureRate)}  ${pct(s.accusationAccuracy)}  ${s.accusationsPerGame.toFixed(2).padStart(5)}   ${verdict}`);
}
console.log('\nALL-PASS cells (closest to mid-band wins):');
for (const p of passes) console.log(`  cover ${p.cover}, bar ${p.bar}, bonus ${p.bonus} → win ${pct(p.s.traitorWinRate)} expose ${pct(p.s.traitorExposureRate)} accur ${pct(p.s.accusationAccuracy)} freq ${p.s.accusationsPerGame.toFixed(2)}`);
if (!passes.length) console.log('  (none yet — read the grid for the closest compromise)');
