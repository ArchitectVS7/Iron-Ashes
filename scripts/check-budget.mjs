#!/usr/bin/env node
/**
 * check-budget.mjs — the V3.1 bundle-budget gate (`npm run budget`, M2 exit metric).
 *
 * Asserts the shipped browser payload stays ≤ 3 MB (ROADMAP-V3.1-UI.md §M2 exit metric:
 * "vite build bundle + assets ≤ 3 MB"). Runs a CLEAN `vite build` itself and measures the
 * resulting `dist/`, then exits non-zero if the total exceeds the budget.
 *
 * Why run the build here (critical): `dist/` is shared between `tsc` (`npm run build`, emits
 * compiled `.js` for the whole repo — ~3 MB of noise) and `vite` (the real browser bundle).
 * A clean `vite build` sets `emptyOutDir` by default, so it WIPES any stale `tsc` output first
 * and leaves only the true shipped payload. Measuring `dist/` after `tsc` would falsely fail;
 * measuring it right after `vite build` is the honest number.
 *
 * What `dist/` captures (no double-counting): the vite bundle PLUS every committed UI asset that
 * ships — self-hosted fonts are copied into `dist/assets`, and the `?raw` SVG icons/frames are
 * inlined into the v3 JS chunk. So the `dist/` byte total = "vite build output + committed UI
 * assets". It also includes the small v2 bundle (the shared vite config has two rollup inputs,
 * main + v3); that is part of the honest shipped total and stays counted.
 *
 * Zero dependencies beyond node builtins + the already-installed `vite` devDep.
 * Exit 0 = under budget; exit 1 = build failed or over budget.
 */

import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const DIST = resolve(ROOT, 'dist');

// 3 MB budget (3 MiB — the roadmap says "≤ 3 MB"; use the binary MiB for headroom).
const BUDGET_BYTES = 3 * 1024 * 1024;

function fmt(bytes) {
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

// ─── 1. clean vite build (emptyOutDir wipes any stale tsc output first) ─────────────────────────

console.log('\n=== budget: building the browser bundle (vite build) ===\n');
const build = spawnSync('npx', ['vite', 'build'], { cwd: ROOT, stdio: 'inherit' });
if (build.status !== 0) {
  console.error('\n✗ budget: `vite build` failed — cannot measure the bundle.');
  process.exit(1);
}

// ─── 2. walk dist/ and sum every file ───────────────────────────────────────────────────────────

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push({ path: p, size: st.size });
  }
  return out;
}

let files;
try {
  files = walk(DIST);
} catch (e) {
  console.error(`\n✗ budget: could not read dist/ after build: ${e.message}`);
  process.exit(1);
}

const total = files.reduce((s, f) => s + f.size, 0);

// ─── 3. report ──────────────────────────────────────────────────────────────────────────────────

console.log('\n=== budget: shipped payload (dist/) ===\n');
const top = [...files].sort((a, b) => b.size - a.size).slice(0, 10);
for (const f of top) {
  console.log(`  ${fmt(f.size).padStart(10)}  ${relative(DIST, f.path)}`);
}
console.log(`  ${'—'.repeat(10)}`);
console.log(`  total:  ${fmt(total)}  (${files.length} files)`);
console.log(`  budget: ${fmt(BUDGET_BYTES)}`);

const over = total > BUDGET_BYTES;
if (over) {
  console.error(`\n✗ OVER BUDGET by ${fmt(total - BUDGET_BYTES)} — trim assets or the bundle.\n`);
  process.exit(1);
}
console.log(`\n✓ under budget — ${fmt(BUDGET_BYTES - total)} of headroom.\n`);
process.exit(0);
