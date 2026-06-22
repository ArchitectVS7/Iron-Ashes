#!/usr/bin/env node
/**
 * verify.mjs — the v2 handover verify gate.
 *
 * Runs the three gates and (by default) WRITES the real results into
 * docs/handoff/state.json so "green" is a machine-written fact, not an
 * agent's claim:
 *   1. tsc --noEmit                       (typecheck)
 *   2. eslint src/v2 tests/v2             (lint — scoped to the v2 redesign,
 *                                          NOT the whole repo; v1 lint debt must
 *                                          not gate the in-progress engine)
 *   3. vitest run tests/v2 (JSON report)  (the v2 suite only — the full `npm test`
 *                                          includes ~50 intentionally-RED v1 tests)
 *
 * Each gate runs under a SUITE_TIMEOUT_MS hard timeout via spawnSync, so an
 * infinite-loop/hang FAILS LOUDLY (status: "timeout") instead of being silently
 * reportable as green. Vitest writes JSON to a temp file (--outputFile) — never
 * piped through `tail`, which buffers in this environment.
 *
 * Modes:
 *   node scripts/verify.mjs            → run gates + WRITE state.json. Exit 0 iff all pass.
 *   node scripts/verify.mjs --check    → run gates, exit code only, NO write (hooks/CI).
 *
 * Zero dependencies (child_process, crypto, fs, path only).
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SUITE_TIMEOUT_MS = 120_000;
const ROOT = process.cwd();
const STATE_PATH = resolve(ROOT, 'docs/handoff/state.json');
const SOURCE_DIRS = ['src/v2', 'tests/v2'];
const CHECK_ONLY = process.argv.includes('--check');

// ─── helpers ──────────────────────────────────────────────────────

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

/** sha256 over sorted (path-relative + content) of src/v2 + tests/v2 .ts files.
 *  Content-based freshness anchor — stable across commits/amends, unlike a commit SHA. */
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

function runGate(label, cmd, args) {
  process.stdout.write(`▸ ${label} … `);
  const r = spawnSync(cmd, args, { cwd: ROOT, timeout: SUITE_TIMEOUT_MS, encoding: 'utf8' });
  const timedOut = r.signal === 'SIGTERM' || (r.error && r.error.code === 'ETIMEDOUT');
  if (timedOut) {
    console.log(`TIMEOUT (>${SUITE_TIMEOUT_MS / 1000}s) ✗  [likely a hang]`);
    return { status: 'timeout', stdout: r.stdout || '', stderr: r.stderr || '' };
  }
  const ok = r.status === 0;
  console.log(ok ? 'pass ✓' : `FAIL ✗ (exit ${r.status})`);
  return { status: ok ? 'pass' : 'fail', stdout: r.stdout || '', stderr: r.stderr || '', exit: r.status };
}

function gitDirty() {
  const r = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  return (r.stdout || '').trim().length > 0;
}

function gitCommit() {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  return (r.stdout || '').trim() || null;
}

// ─── run the gates ────────────────────────────────────────────────

console.log(`\n=== verify (v2) ${CHECK_ONLY ? '[--check, no write]' : ''} ===`);

const typecheck = runGate('typecheck (tsc --noEmit)', 'npx', ['tsc', '--noEmit']);
const lint = runGate('lint (eslint src/v2 tests/v2)', 'npx', ['eslint', 'src/v2', 'tests/v2']);

const tmpJson = resolve(ROOT, 'docs/handoff/.vitest-report.json');
const testGate = runGate('tests (vitest run tests/v2)', 'npx', [
  'vitest', 'run', 'tests/v2', '--reporter=json', `--outputFile=${tmpJson}`,
]);

// Parse real counts from the JSON report (authority for pass/fail is still the exit code).
let tests = { files: null, passed: null, failed: null, status: testGate.status };
if (testGate.status !== 'timeout' && existsSync(tmpJson)) {
  try {
    const j = JSON.parse(readFileSync(tmpJson, 'utf8'));
    tests = {
      // testResults is one entry per test FILE; numTotalTestSuites counts describe blocks.
      files: Array.isArray(j.testResults) ? j.testResults.length : (j.numTotalTestFiles ?? null),
      passed: j.numPassedTests ?? null,
      failed: j.numFailedTests ?? null,
      status: (j.numFailedTests ?? 1) === 0 && testGate.status === 'pass' ? 'pass' : 'fail',
    };
  } catch {
    tests.status = testGate.status; // keep exit-code verdict
  }
  try { spawnSync('rm', ['-f', tmpJson], { cwd: ROOT }); } catch { /* best effort */ }
}

const allPass = typecheck.status === 'pass' && lint.status === 'pass' && tests.status === 'pass';

// ─── write state.json (unless --check) ────────────────────────────

if (!CHECK_ONLY) {
  const dir = resolve(ROOT, 'docs/handoff');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let state = {};
  if (existsSync(STATE_PATH)) {
    try { state = JSON.parse(readFileSync(STATE_PATH, 'utf8')); } catch { state = {}; }
  }

  // Preserve agent-written narrative fields; (over)write only the machine block.
  state.schemaVersion ??= 1;
  state.currentStage ??= 'unknown';
  state.currentStageTitle ??= '';
  state.status ??= 'in-progress';
  state.nextAction ??= '';
  state.specRefs ??= [];
  state.invariants ??= [];
  state.gotchas ??= [];
  state.openRisks ??= [];

  state.lastVerified = {
    // NOTE: timestamp is informational; freshness is enforced by sourceHash, not time.
    timestamp: new Date().toISOString(),
    commit: gitCommit(),
    sourceHash: sourceHash(),
    typecheck: typecheck.status,
    lint: lint.status,
    tests,
  };
  state.dirty = gitDirty();

  // Lightweight required-keys validation against the schema contract (no ajv dependency).
  const required = ['schemaVersion', 'currentStage', 'status', 'nextAction', 'lastVerified', 'dirty'];
  const missing = required.filter((k) => !(k in state));
  if (missing.length) {
    console.error(`✗ state.json would be missing required keys: ${missing.join(', ')}`);
    process.exit(2);
  }

  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
  console.log(`\n${allPass ? '✓' : '✗'} wrote ${STATE_PATH.replace(ROOT + '/', '')}` +
    ` (tests: ${tests.passed}/${(tests.passed ?? 0) + (tests.failed ?? 0)} passed, dirty=${state.dirty})`);
}

console.log(allPass ? '\n✓ verify PASSED\n' : '\n✗ verify FAILED\n');
process.exit(allPass ? 0 : 1);
