#!/usr/bin/env node
/**
 * tune-confirm-placeholders.mjs — C2 (close-loose-ends wave).
 *
 * Confirmation sweep for the 6 [TUNABLE] levers that were NEVER given a dedicated
 * coordinate-descent search (they live at "reasonable defaults"):
 *   PLEDGE_SHIELD_AMOUNT, PLEDGE_FAVOR_GRUDGE_REDUCTION, DK_MARCH_DISTANCE,
 *   SURGE_SPREAD_MULT, GAMBIT_ADJACENT_STRIKE_MULT, RESCUE_DEBT_MIN_PLEDGE.
 *
 * Purpose is NOT to re-optimize — it is to prove each default is NON-DEGENERATE:
 * perturbing it ±1 should not collapse a §9 band or flip a guard. If a lever DOES
 * move SK-win materially or flip a guard, that is a real finding (a load-bearing
 * untuned knob) and gets fixed/tuned, not relabeled. A flat response confirms the
 * default is safe (and the lever is low-impact).
 *
 * Usage: node scripts/tune-confirm-placeholders.mjs [baseSeed] [seedCount]
 */
import { SeededRandom } from '../dist/utils/seeded-random.js';
import { runSweep } from '../dist/v2/sim/sweep.js';
import { standardMatchups } from '../dist/v2/sim/matchups.js';
import { summarize, tuningLoss } from '../dist/v2/sim/report.js';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const baseSeed = Number(args[0] ?? 20260622) || 20260622;
const seedCount = Number(args[1] ?? 16) || 16;
const rng = new SeededRandom(baseSeed);
const seeds = Array.from({ length: seedCount }, () => rng.int(0, 0x7fffffff));
const playerCounts = [2, 3, 4];
const modes = ['competitive'];
const matchups = standardMatchups();

// Each lever: its default + the perturbations to probe (clamped to legal/meaningful).
const LEVERS = [
  { key: 'PLEDGE_SHIELD_AMOUNT', def: 1, probes: [0, 2] },
  { key: 'PLEDGE_FAVOR_GRUDGE_REDUCTION', def: 1, probes: [0, 2] },
  { key: 'DK_MARCH_DISTANCE', def: 2, probes: [1, 3] },
  { key: 'SURGE_SPREAD_MULT', def: 2, probes: [1, 3] },
  { key: 'GAMBIT_ADJACENT_STRIKE_MULT', def: 1, probes: [2] },
  { key: 'RESCUE_DEBT_MIN_PLEDGE', def: 2, probes: [1, 3] },
];

const pct = x => (x * 100).toFixed(1).padStart(5);
const measured = (s, n) => s.checks.find(c => c.name === n)?.measured ?? 0;
const evalRun = (tunables) => {
  const s = summarize(runSweep({ seeds, playerCounts, modes, matchups, tunables }));
  const pooled = measured(s, 'Shadowking win rate');
  const guard = (s.dominancePass && !s.freeRider?.freeRidingRewarded && s.hitGuardCount === 0) ? 'PASS' : 'FAIL';
  const d = s.diagnostics;
  // Broad fingerprint: if a lever is WIRED+live, perturbing it moves at least ONE of these.
  // If every metric is byte-identical, the lever is inert in the sim (dead, or never-binding).
  const fp = [pooled, s.evenShare, d.meanAshedNodes, d.dkKillRate, d.breakRatePerGame,
    d.oathsSwornPerGame, measured(s, 'Rescues per game'), d.gambitSeizeRate].map(x => x.toFixed(4)).join('|');
  return { pooled, inBand: pooled >= 0.18 && pooled <= 0.22, guard, loss: tuningLoss(s), fp };
};

console.log(`\n=== C2 placeholder-tunable confirmation === baseSeed=${baseSeed} seeds=${seedCount} matchups=${matchups.length}`);
const base = evalRun({});
console.log(`\nBASELINE (all locked defaults): SK ${pct(base.pooled)}  ${base.inBand ? ' in ' : 'OUT'}  guard ${base.guard}  loss ${base.loss.toFixed(1)}`);
console.log('\nlever                              value   SKwin  band guard   loss   ΔSKwin  verdict');
console.log('-'.repeat(88));

const SK_DEGENERATE = 0.04; // >4pp swing from a single ±1 step ⇒ load-bearing, investigate
const findings = [];
const inertLevers = [];
for (const lever of LEVERS) {
  // default row
  console.log(`${lever.key.padEnd(32)} ${String(lever.def).padStart(5)}(def) ${pct(base.pooled)}  ${base.inBand ? ' in ' : 'OUT'} ${base.guard.padEnd(5)} ${base.loss.toFixed(1).padStart(6)}    —     baseline`);
  let anyEffect = false;
  for (const v of lever.probes) {
    const r = evalRun({ [lever.key]: v });
    const dSK = r.pooled - base.pooled;
    const moved = r.fp !== base.fp; // ANY tracked metric changed
    if (moved) anyEffect = true;
    const degenerate = Math.abs(dSK) > SK_DEGENERATE || r.guard !== 'PASS';
    if (degenerate) findings.push({ lever: lever.key, v, dSK, guard: r.guard });
    console.log(`${''.padEnd(32)} ${String(v).padStart(10)} ${pct(r.pooled)}  ${r.inBand ? ' in ' : 'OUT'} ${r.guard.padEnd(5)} ${r.loss.toFixed(1).padStart(6)} ${(dSK >= 0 ? '+' : '') + (dSK * 100).toFixed(1).padStart(5)}pp  ${degenerate ? '⚠️ INVESTIGATE' : (moved ? 'safe (moves a metric)' : 'INERT (no metric moved)')}`);
  }
  if (!anyEffect) inertLevers.push(lever.key);
}

console.log('\n--- verdict ---');
if (inertLevers.length) {
  console.log(`⚠️ ${inertLevers.length} lever(s) are INERT in the sim (no tracked metric moved across ±1):`);
  console.log(`   ${inertLevers.join(', ')}`);
  console.log('   → wired-but-never-binding OR dead. Record as a flagged follow-up (do not claim "validated").');
}
if (findings.length === 0) {
  console.log('✅ NON-DEGENERATE: no ±1 perturbation moved SK-win >4pp or flipped a guard (safe to keep the defaults).');
  console.log('   "reasonable default" → "measured": record in stage5-tuning-log §C2 (incl. any INERT flags above).');
} else {
  console.log(`⚠️ ${findings.length} load-bearing response(s) found — these levers are NOT low-impact, investigate/tune:`);
  for (const f of findings) console.log(`   ${f.lever}=${f.v}: ΔSK ${(f.dSK * 100).toFixed(1)}pp, guard ${f.guard}`);
}
