#!/usr/bin/env node
/**
 * tune-v3-relock.mjs — the v3 board re-lock search (T-239).
 *
 * WHY THIS EXISTS. The M2.5/M2.6/sixth-review topology work voided the §9 balance lock, and the
 * T-238 reading on the shipped board (48-edge lattice + T-236 serpentine spoke) left the dark at
 * **26.6 / 29.2% pooled** against the 18–22% band — a residual concentrated at 3p/4p (2p already
 * reads 18.9 / 19.7%, inside the band). This script is the coordinate-search that finds the
 * smallest doom-pacing change that pulls pooled dark-win back into band WITHOUT re-breaking the
 * other §9 checks, so the result can be frozen as the NEW lock.
 *
 * It is the v3 counterpart of the v2 `tune-5*.mjs` family and follows the same contract:
 * propose overrides → run the REAL reducer + REAL AI over a deterministic sweep → rank by
 * `tuningLoss`. It never writes tunables; a human reads the table and edits
 * `HERALD_OFF_REBALANCE` (the shipped herald-OFF overlay — the sweep's `tunables` layer sits
 * ON TOP of it, so a candidate's unlisted levers keep their shipped values).
 *
 * USER AUTHORIZATION (2026-07-21): tunable-VALUE edits are authorized for this re-lock only —
 * "rebalance and lock so we can be closer to spec than before". Outside a re-locking task the
 * standing rule is unchanged: band misses are RECORDED, never tuned.
 *
 * Levers in scope (§13 [T-236] sanctioned doom pacing, plus the overlay's own shape dials):
 *   SPREAD_AMOUNT_BASE     blight per landed strike (2.6) — the continuous dark-strength dial
 *   BLIGHT_TO_ASH          Dawns a blighted node survives (3) — the ash clock
 *   DAWN_BLIGHT_ADVANCE    passive advance each Dawn (1)
 *   DOOM_COST_{WHISPER,MARCH,RECKONING}   pledge thresholds per Act (6 / 14 / 17.5)
 *   DOOM_COST_PLAYER_DIVISOR / _PER_PLAYER / _PIVOT   the per-count shape (4.5 / 6.6 / 3)
 *
 * Usage: node scripts/tune-v3-relock.mjs [baseSeed] [seedCount] [--round N]
 *   Defaults: baseSeed 20260622, seedCount 16 (a fast search cell; the CONFIRM run is always
 *   the full canonical 2-seed n=40 sweep via `npm run sim:v3`, never this script).
 *
 * Imports the COMPILED dist/ — run `tsc` (or `npm run sim:v3` once) first.
 */

import { SeededRandom } from '../dist/utils/seeded-random.js';
import { runSweep } from '../dist/v3/sim/sweep.js';
import { standardMatchups } from '../dist/v3/sim/matchups.js';
import { summarize, tuningLoss } from '../dist/v3/sim/report.js';

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith('--'));
const roundArg = args.find(a => a.startsWith('--round'));
const round = Number(roundArg?.split('=')[1] ?? positional[2] ?? 1) || 1;

const baseSeed = Number(positional[0] ?? 20260622) || 20260622;
const seedCount = Number(positional[1] ?? 16) || 16;

const rng = new SeededRandom(baseSeed);
const seeds = Array.from({ length: seedCount }, () => rng.int(0, 0x7fffffff));
const playerCounts = [2, 3, 4];
const modes = ['competitive'];
const matchups = standardMatchups();

// ── Candidate rounds ──────────────────────────────────────────────
// `{}` = the shipped HERALD_OFF_REBALANCE overlay unchanged (the T-238 reading).
// Round 1 = single-lever probes (learn sign + magnitude on THIS board — the doom levers are
// NOT monotone: a higher threshold means fewer landed strikes but also fewer full blocks, and
// full blocks feed the dark's patience ratchet).
const ROUNDS = {
  1: [
    { label: 'baseline (T-238)', tunables: {} },
    { label: 'spread 2.6→2.2', tunables: { SPREAD_AMOUNT_BASE: 2.2 } },
    { label: 'spread 2.6→1.8', tunables: { SPREAD_AMOUNT_BASE: 1.8 } },
    { label: 'spread 2.6→1.4', tunables: { SPREAD_AMOUNT_BASE: 1.4 } },
    { label: 'ash 3→4', tunables: { BLIGHT_TO_ASH: 4 } },
    { label: 'dawn 1→0', tunables: { DAWN_BLIGHT_ADVANCE: 0 } },
    { label: 'tilt 6.6→5.0', tunables: { DOOM_COST_PER_PLAYER: 5.0 } },
    { label: 'tilt 6.6→8.0', tunables: { DOOM_COST_PER_PLAYER: 8.0 } },
    { label: 'march 14→11', tunables: { DOOM_COST_MARCH: 11 } },
    { label: 'march 14→17', tunables: { DOOM_COST_MARCH: 17 } },
    { label: 'reck 17.5→14', tunables: { DOOM_COST_RECKONING: 14 } },
    { label: 'reck 17.5→21', tunables: { DOOM_COST_RECKONING: 21 } },
  ],
  // Round 2 = combinations. Round-1 findings that shape it:
  //  · SPREAD is the clean continuous dial (2.6→26.6%, 2.2→25.2%, 1.8→22.1%, 1.4→21.7% — it
  //    saturates below ~1.8, so it alone cannot reach 20% without going inert).
  //  · BLIGHT_TO_ASH 4 (8.5%) and DAWN_BLIGHT_ADVANCE 0 (1.5%) are far too coarse — both crash
  //    the doom path off the board. Neither is a re-lock lever on this topology.
  //  · The residual is SHAPE, not level: 3p runs 34.3% against 2p 18.0% / 4p 27.5%.
  //  · DOOM_COST_MARCH is the 3p/4p shape lever (14→11 cools 3p 34.3→32.5 and 4p 27.5→22.0 with
  //    2p untouched; 14→17 HEATS 3p to 41.6 — the patience ratchet, non-monotone as warned).
  //  · The tilt moves 2p/4p only (pivot 3): 6.6→5.0 sends 2p to 45.9%, 6.6→8.0 drops it to 12.0%.
  2: [
    { label: 'baseline (T-238)', tunables: {} },
    { label: 'spr2.0', tunables: { SPREAD_AMOUNT_BASE: 2.0 } },
    { label: 'spr2.0 mar11', tunables: { SPREAD_AMOUNT_BASE: 2.0, DOOM_COST_MARCH: 11 } },
    { label: 'spr2.2 mar11', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_MARCH: 11 } },
    { label: 'spr2.4 mar11', tunables: { SPREAD_AMOUNT_BASE: 2.4, DOOM_COST_MARCH: 11 } },
    { label: 'spr2.0 mar12', tunables: { SPREAD_AMOUNT_BASE: 2.0, DOOM_COST_MARCH: 12 } },
    { label: 'spr2.2 mar12', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_MARCH: 12 } },
    { label: 'spr2.2 mar11 rck15', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_MARCH: 11, DOOM_COST_RECKONING: 15 } },
    { label: 'spr2.2 mar11 piv3.5', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_MARCH: 11, DOOM_COST_PIVOT: 3.5 } },
    { label: 'spr2.2 mar11 div5', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_MARCH: 11, DOOM_COST_PLAYER_DIVISOR: 5.0 } },
    { label: 'spr2.2 div5', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_PLAYER_DIVISOR: 5.0 } },
    { label: 'spr2.0 mar11 tilt7.5', tunables: { SPREAD_AMOUNT_BASE: 2.0, DOOM_COST_MARCH: 11, DOOM_COST_PER_PLAYER: 7.5 } },
  ],
  // Round 3 = refine the round-2 loss-0 shortlist, and RUN IT ON BOTH CANONICAL SEEDS (the 2p cell
  // is coarse at n=16 — it only takes a handful of discrete values — so a candidate picked on one
  // seed's 2p reading would be overfitted). Round-2 shortlist:
  //   spr2.0 mar11        pooled 20.2  (13.6 / 27.3 / 19.8, spread 13.7)
  //   spr2.2 mar11 div5   pooled 18.9  (12.0 / 23.4 / 21.4, spread 11.4 — tightest 3p)
  //   spr2.2 mar11        pooled 22.8  (18.0 / 29.1 / 21.3, spread 11.1 — best 2p, pooled high)
  // Watch the gambit row: DOOM_COST_MARCH 14→11 lifts deliberate fire ~14.5→17.2% (band ≤20%),
  // and pivot 3.5 blew through it at 21.5% — so the pivot lever stays out.
  3: [
    { label: 'spr2.0 mar11', tunables: { SPREAD_AMOUNT_BASE: 2.0, DOOM_COST_MARCH: 11 } },
    { label: 'spr2.1 mar11', tunables: { SPREAD_AMOUNT_BASE: 2.1, DOOM_COST_MARCH: 11 } },
    { label: 'spr2.2 mar11', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_MARCH: 11 } },
    { label: 'spr2.1 mar11 div5', tunables: { SPREAD_AMOUNT_BASE: 2.1, DOOM_COST_MARCH: 11, DOOM_COST_PLAYER_DIVISOR: 5.0 } },
    { label: 'spr2.2 mar11 div5', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_MARCH: 11, DOOM_COST_PLAYER_DIVISOR: 5.0 } },
    { label: 'spr2.3 mar11 div5', tunables: { SPREAD_AMOUNT_BASE: 2.3, DOOM_COST_MARCH: 11, DOOM_COST_PLAYER_DIVISOR: 5.0 } },
    { label: 'spr2.2 mar11 div4.75', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_MARCH: 11, DOOM_COST_PLAYER_DIVISOR: 4.75 } },
    { label: 'spr2.1 mar12', tunables: { SPREAD_AMOUNT_BASE: 2.1, DOOM_COST_MARCH: 12 } },
  ],
  // Round 4. Round-3 cross-seed findings (the reason there IS a round 4):
  //  · Seed 20260628 runs ~4 pp HOTTER than 20260622 on every candidate, so a candidate tuned to
  //    hit 20% on s622 sits at ~24% on s628. Only a candidate that lands both inside 18–22 locks.
  //  · Inside the `div5` family SPREAD saturates (2.1→2.3 moves pooled by <0.6 pp), so spread alone
  //    cannot close the remaining seed gap.
  //  · DOOM_COST_MARCH 11 lifts deliberate gambit fire to 19.4–19.8% on s628 — against a 20% band
  //    ceiling. Too little headroom to lock on, so round 4 re-tests keeping MARCH at/near shipped.
  // New dials (both already in the shipped overlay, both doom-pacing):
  //   SURGE_SPREAD_MULT  the Reckoning surge multiplier (1.5) — cools the late doom burst
  //   DK_PER_PLAYER      the third Death Knight at 4p (0.5) — cools the 4p cell specifically
  4: [
    { label: 'spr2.2 mar11 div5', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_MARCH: 11, DOOM_COST_PLAYER_DIVISOR: 5.0 } },
    { label: 'spr2.2 m11 d5 surge1', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_MARCH: 11, DOOM_COST_PLAYER_DIVISOR: 5.0, SURGE_SPREAD_MULT: 1.0 } },
    { label: 'spr2.2 m11 d5 dk0', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_MARCH: 11, DOOM_COST_PLAYER_DIVISOR: 5.0, DK_PER_PLAYER: 0 } },
    { label: 'spr2.2 m11 d5 sg1 dk0', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_MARCH: 11, DOOM_COST_PLAYER_DIVISOR: 5.0, SURGE_SPREAD_MULT: 1.0, DK_PER_PLAYER: 0 } },
    { label: 'spr2.0 m12 d5 sg1', tunables: { SPREAD_AMOUNT_BASE: 2.0, DOOM_COST_MARCH: 12, DOOM_COST_PLAYER_DIVISOR: 5.0, SURGE_SPREAD_MULT: 1.0 } },
    { label: 'spr2.2 m13 d5 sg1', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_MARCH: 13, DOOM_COST_PLAYER_DIVISOR: 5.0, SURGE_SPREAD_MULT: 1.0 } },
    { label: 'spr2.2 m14 d5 sg1', tunables: { SPREAD_AMOUNT_BASE: 2.2, DOOM_COST_PLAYER_DIVISOR: 5.0, SURGE_SPREAD_MULT: 1.0 } },
    { label: 'spr2.4 m14 d5 sg1', tunables: { SPREAD_AMOUNT_BASE: 2.4, DOOM_COST_PLAYER_DIVISOR: 5.0, SURGE_SPREAD_MULT: 1.0 } },
  ],
};

const CANDIDATES = ROUNDS[round];
if (!CANDIDATES) {
  console.error(`No candidate round ${round} defined — edit ROUNDS in ${import.meta.url}`);
  process.exit(1);
}

const pct = x => (x * 100).toFixed(1).padStart(5);
const measured = (s, name) => s.checks.find(c => c.name === name)?.measured ?? 0;

const hdr = 'candidate'.padEnd(22) + ' pooled   2p    3p    4p  |spr| round gambit  doom  capt  top   loss';
console.log(`\n=== v3 re-lock search (round ${round}) === baseSeed=${baseSeed} seeds=${seedCount} ` +
  `counts=${playerCounts.join('/')} matchups=${matchups.length} · target: pooled dark 18–22%\n`);
console.log(hdr);
console.log('-'.repeat(hdr.length));

const results = [];
for (const cand of CANDIDATES) {
  const rows = runSweep({ seeds, playerCounts, modes, matchups, tunables: cand.tunables });
  const s = summarize(rows);
  const d = s.diagnostics;
  const pc = d.perCount;
  const counts = [2, 3, 4].map(c => pc[c]?.shadowkingWinRate ?? 0);
  const spread = Math.max(...counts) - Math.min(...counts);
  const pooled = measured(s, 'Shadowking win rate');
  const rounds_ = measured(s, 'Mean game length (rounds)');
  const gambit = measured(s, 'Deliberate gambit fire (gambler-free, ~1-in-6-to-8)');
  const doom = (s.endReasonCounts.doom_complete ?? 0) / s.totalGames;
  const loss = tuningLoss(s);
  results.push({ ...cand, pooled, counts, spread, loss });
  console.log(
    cand.label.padEnd(22) +
    `${pct(pooled)} ${pct(counts[0])} ${pct(counts[1])} ${pct(counts[2])} ${pct(spread)} ` +
    `${rounds_.toFixed(2).padStart(5)} ${pct(gambit)} ${pct(doom)} ` +
    `${(d.capturesPerGame ?? 0).toFixed(2).padStart(5)} ${pct(d.topArchetypeWinRateNoGambler ?? 0)} ` +
    `${loss.toFixed(3).padStart(7)}`,
  );
}

console.log('\nRanked by |pooled − 20%| (the re-lock objective; loss also shown):');
for (const r of [...results].sort((a, b) => Math.abs(a.pooled - 0.20) - Math.abs(b.pooled - 0.20))) {
  console.log(`  ${r.label.padEnd(22)} pooled ${pct(r.pooled)}  Δ-from-20 ${((r.pooled - 0.20) * 100).toFixed(1).padStart(5)} pp  loss ${r.loss.toFixed(3)}`);
}
console.log('\nCONFIRM any winner with the full canonical sweep before locking:');
console.log('  npm run sim:v3 -- 20260622 40 && npm run sim:v3 -- 20260628 40 (+ --bloodpact)\n');
