/**
 * UGT harness stdio server — the Node IO SHELL around the pure
 * src/v3/harness/harness-core.ts dispatch core.
 *
 * Protocol: one JSON request per stdin line → one JSON response per stdout
 * line, strictly in order. Blank lines are skipped. Exits 0 on stdin close.
 *
 * All protocol behavior (ops, errors, hashing, fog projection) lives in the
 * typechecked, vitest-covered core; Node globals (process, readline) live
 * ONLY here. This shell adds NO game logic — it is parse → dispatch → write.
 *
 * Unlike nexus-dominion (which loads the core from source via a TS resolve
 * hook), this repo follows scripts/sim-v3.mjs: import the COMPILED core from
 * dist/. So this shell is invoked via `npm run harness`, which runs `tsc`
 * first (see package.json).
 *
 *   npm run harness            # tsc && node harness/ugt-harness.mjs
 *   node harness/ugt-harness.mjs   # after dist/ is built
 */
import { createInterface } from 'node:readline';
import {
  createRegistry,
  dispatch,
  parseRequestLine,
} from '../dist/v3/harness/harness-core.js';

const registry = createRegistry();

const rl = createInterface({ input: process.stdin, terminal: false });

// dispatch and parseRequestLine are synchronous, so responses are written in
// the exact order lines arrive — one response line per non-blank request line.
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (trimmed === '') return;
  const parsed = parseRequestLine(trimmed);
  const response = parsed.ok
    ? dispatch(parsed.request, registry)
    : parsed.response;
  process.stdout.write(JSON.stringify(response) + '\n');
});

rl.on('close', () => {
  process.exit(0);
});
