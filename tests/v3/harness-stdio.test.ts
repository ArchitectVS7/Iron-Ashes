/* Harness stdio smoke test — the INTEGRATION layer the in-process harness-core
   test does not cover: it spawns harness/ugt-harness.mjs as a real child process
   and drives a scripted session through actual stdio (one JSON request per stdin
   line → one JSON response per stdout line, strictly in order).

   Coverage: create → state → run_ai → save → load → hash equality, that blank
   lines are skipped, and that a malformed line yields a structured BAD_REQUEST
   error rather than crashing the shell. Requests are sent one-at-a-time (each
   response awaited before the next request) because the `load` payload is the
   output of the `save` response — the session cannot be pre-scripted into a
   single pipe. */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { spawn, execFileSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface, type Interface } from 'node:readline';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();
const HARNESS = resolve(ROOT, 'harness/ugt-harness.mjs');
const DIST_CORE = resolve(ROOT, 'dist/v3/harness/harness-core.js');

// Self-contained: build dist/ once if the gate did not already. `npm run harness`
// runs `tsc` first in production; here we ensure the compiled core exists so the
// spawned shell can import it.
beforeAll(() => {
  if (!existsSync(DIST_CORE)) {
    execFileSync('npx', ['tsc'], { cwd: ROOT, stdio: 'inherit' });
  }
  expect(existsSync(DIST_CORE)).toBe(true);
}, 120000);

/** A live shell process with an interactive one-request-at-a-time driver. */
interface Shell {
  child: ChildProcessWithoutNullStreams;
  rl: Interface;
  /** Send a raw stdin line (verbatim, newline appended) and await the next response line. */
  sendRaw(line: string): Promise<Record<string, unknown>>;
  /** JSON-encode an object as one request line and await the next response line. */
  send(obj: unknown): Promise<Record<string, unknown>>;
  /** Write a raw line WITHOUT awaiting a response (for blank lines that produce none). */
  writeRaw(line: string): void;
  /** End stdin and await process exit; resolves with the exit code. */
  end(): Promise<number | null>;
}

function startShell(): Shell {
  const child = spawn(process.execPath, [HARNESS], {
    cwd: ROOT,
    stdio: ['pipe', 'pipe', 'inherit'],
  }) as ChildProcessWithoutNullStreams;
  const rl = createInterface({ input: child.stdout, terminal: false });

  const pending: Array<(v: Record<string, unknown>) => void> = [];
  const buffered: Record<string, unknown>[] = [];
  rl.on('line', (line) => {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const resolveFn = pending.shift();
    if (resolveFn) resolveFn(parsed);
    else buffered.push(parsed);
  });

  const nextResponse = (): Promise<Record<string, unknown>> =>
    new Promise((res) => {
      const early = buffered.shift();
      if (early) res(early);
      else pending.push(res);
    });

  return {
    child,
    rl,
    sendRaw(line: string) {
      child.stdin.write(line + '\n');
      return nextResponse();
    },
    send(obj: unknown) {
      child.stdin.write(JSON.stringify(obj) + '\n');
      return nextResponse();
    },
    writeRaw(line: string) {
      child.stdin.write(line + '\n');
    },
    end() {
      return new Promise((res) => {
        child.on('exit', (code) => res(code));
        child.stdin.end();
      });
    },
  };
}

let shell: Shell | undefined;

afterEach(() => {
  // Kill any leaked child so a failed assertion never orphans a process.
  if (shell && shell.child.exitCode === null && !shell.child.killed) {
    shell.child.kill();
  }
  shell = undefined;
});

describe('harness stdio shell', () => {
  it(
    'drives create → state → run_ai → save → load over real stdio with hash equality',
    async () => {
      shell = startShell();

      // 1. create
      const created = await shell.send({
        op: 'create',
        id: 1,
        config: { seed: 20260716, playerCount: 3, mode: 'competitive' },
      });
      expect(created.id).toBe(1);
      expect(created.ok).toBe(true);
      expect(typeof created.gameId).toBe('string');
      expect(typeof created.stateHash).toBe('string');
      const gameId = created.gameId as string;

      // 2. state — default is the fog-respecting observable projection (seed redacted).
      const stateResp = await shell.send({ op: 'state', id: 2, gameId });
      expect(stateResp.id).toBe(2);
      expect(stateResp.ok).toBe(true);
      expect(typeof stateResp.stateHash).toBe('string');
      const observable = stateResp.observable as Record<string, unknown>;
      expect(observable).toBeDefined();
      expect(observable.seed).toBe('REDACTED');

      // 3. run_ai — a fresh game stops at the human-gated THREAT phase.
      const ran = await shell.send({ op: 'run_ai', id: 3, gameId });
      expect(ran.id).toBe(3);
      expect(ran.ok).toBe(true);
      expect(ran.waitingFor).toBe('threat');
      expect(typeof ran.stateHash).toBe('string');

      // 4. save — capture the payload and the saved hash.
      const saved = await shell.send({ op: 'save', id: 4, gameId });
      expect(saved.id).toBe(4);
      expect(saved.ok).toBe(true);
      const payload = saved.payload as Record<string, unknown>;
      expect(payload).toBeDefined();
      const savedHash = saved.stateHash as string;

      // 5. load — a NEW game whose hash equals the saved hash (round-trip fidelity).
      const loaded = await shell.send({ op: 'load', id: 5, payload });
      expect(loaded.id).toBe(5);
      expect(loaded.ok).toBe(true);
      expect(typeof loaded.gameId).toBe('string');
      expect(loaded.gameId).not.toBe(gameId);
      expect(loaded.stateHash).toBe(savedHash);

      // 6. blank line is skipped (produces NO response): write a blank line, then a
      //    valid request, and confirm the next response is the valid request's.
      shell.writeRaw('');
      shell.writeRaw('   ');
      const afterBlank = await shell.send({ op: 'state', id: 6, gameId });
      expect(afterBlank.id).toBe(6);
      expect(afterBlank.ok).toBe(true);

      // 7. malformed line → structured error (not a crash).
      const bad = await shell.sendRaw('{nope');
      expect(bad.ok).toBe(false);
      const error = bad.error as Record<string, unknown>;
      expect(error.kind).toBe('BAD_REQUEST');

      // 8. stdin close → clean exit 0.
      const code = await shell.end();
      expect(code).toBe(0);
    },
    30000,
  );
});
