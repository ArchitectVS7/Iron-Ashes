#!/usr/bin/env node
/**
 * handoff-check.mjs — the handover assertion gate.
 *
 * Proves a handover is REAL. Reads docs/handoff/state.json + live git/source and
 * exits non-zero unless ALL of:
 *   1. typecheck / lint / tests all recorded as "pass" in lastVerified
 *   2. recomputed source hash === lastVerified.sourceHash
 *        → verify.mjs actually ran on the CURRENT code (no edit-after-verify)
 *   3. `git status --porcelain` is empty
 *        → nothing uncommitted (catches the "committed nothing" failure)
 *   4. currentStage === the first unchecked box in ROADMAP-V3 §4
 *        → the machine state hasn't drifted from the human plan
 *
 * Run at START of a step (inherit a clean baseline) and at END (DoD step 6).
 * Used by the pre-commit hook and CI in --check chains via verify.mjs.
 *
 * Zero dependencies. Exit 0 = handover is clean; exit 1 = a named assertion failed.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const STATE_PATH = resolve(ROOT, 'docs/handoff/state.json');
const ROADMAP_PATH = resolve(ROOT, 'docs/ROADMAP-V3.md');
const SOURCE_DIRS = ['src/v2', 'tests/v2', 'src/v3', 'tests/v3'];

const failures = [];
function assert(ok, label, remedy) {
  if (ok) { console.log(`  ✓ ${label}`); }
  else { console.log(`  ✗ ${label}`); failures.push({ label, remedy }); }
}

// ─── source hash (MUST match verify.mjs byte-for-byte) ────────────

function listTsFiles(dir) {
  const abs = resolve(ROOT, dir);
  if (!existsSync(abs)) return [];
  const out = [];
  for (const entry of readdirSync(abs)) {
    const p = join(abs, entry);
    if (statSync(p).isDirectory()) out.push(...listTsFiles(join(dir, entry)));
    else if (entry.endsWith('.ts')) out.push(p);
  }
  return out;
}
function sourceHash() {
  const files = SOURCE_DIRS.flatMap(listTsFiles).sort();
  const h = createHash('sha256');
  for (const f of files) {
    h.update(f.replace(ROOT, ''));
    h.update('\0');
    h.update(readFileSync(f));
    h.update('\0');
  }
  return h.digest('hex');
}

/** First unchecked stage box in ROADMAP-V3 §4: lines like
 *  "- [ ] **Stage V3-6 — …", a "  - [ ] **3i. …" sub-box, a
 *  "  - [ ] **V3.1-M0 …" V3.1 presentation-sprint sub-box, a
 *  "  - [ ] **V3.1-M2.5 …" decimal-milestone sub-box (M2.5 topology change), or a
 *  "  - [ ] **V3.1-M2-CHECKPOINT …" per-milestone user-review checkpoint box. */
function firstUncheckedStage() {
  if (!existsSync(ROADMAP_PATH)) return null;
  const text = readFileSync(ROADMAP_PATH, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(
      /^\s*-\s*\[ \]\s*\*\*(?:Stage\s+)?(V3\.1-M\d+(?:\.\d+)?(?:-CHECKPOINT)?|V3-[\d.]+|\d+[a-z])/,
    );
    if (m) return m[1]; // e.g. "V3.1-M2.5" / "V3.1-M2-CHECKPOINT" (or "V3.1-M0" / "V3-6" / a "3i" sub-box)
  }
  return null;
}

// ─── run assertions ───────────────────────────────────────────────

console.log('\n=== handoff:check ===');

if (!existsSync(STATE_PATH)) {
  console.error('✗ docs/handoff/state.json not found — run `npm run verify` first.');
  process.exit(1);
}

let state;
try { state = JSON.parse(readFileSync(STATE_PATH, 'utf8')); }
catch (e) { console.error(`✗ state.json is not valid JSON: ${e.message}`); process.exit(1); }

const lv = state.lastVerified ?? {};

assert(lv.typecheck === 'pass', 'typecheck recorded pass', 'run `npm run verify`');
assert(lv.lint === 'pass', 'lint recorded pass', 'run `npm run verify`');
assert(lv.tests?.status === 'pass' && (lv.tests?.failed ?? 1) === 0,
  `tests recorded pass (${lv.tests?.passed ?? '?'} passed, ${lv.tests?.failed ?? '?'} failed)`,
  'fix failing tests, then `npm run verify`');

assert(lv.sourceHash === sourceHash(),
  'verify ran on the CURRENT source (sourceHash matches)',
  'src/v2 or tests/v2 changed since last verify — run `npm run verify`');

assert(gitClean(), 'working tree is clean (nothing uncommitted)',
  'commit your work (the redesign + state.json + ROADMAP), then `npm run verify`');

const roadmapStage = firstUncheckedStage();
assert(roadmapStage !== null && roadmapStage === state.currentStage,
  `state.currentStage (${state.currentStage}) matches ROADMAP §4 next box (${roadmapStage ?? 'none'})`,
  'reconcile state.json currentStage with the first unchecked ROADMAP §4 box');

function gitClean() {
  const r = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  return (r.stdout || '').trim().length === 0;
}

// ─── verdict ──────────────────────────────────────────────────────

if (failures.length === 0) {
  console.log('\n✓ handover is clean — verified, committed, on the current source.\n');
  process.exit(0);
}
console.log(`\n✗ handover NOT clean — ${failures.length} check(s) failed:`);
for (const f of failures) console.log(`    • ${f.label}\n      → ${f.remedy}`);
console.log('');
process.exit(1);
