/* Harness core tests — the JSON-lines protocol contract the UGT trial drives.
   The harness is a ZERO-LOGIC transport over the real v3 engine: these tests assert
   determinism (same seed / save-load / scripted replay hash identically) and that every
   malformed input returns a structured error rather than throwing. */

import { describe, it, expect } from 'vitest';
import {
  createRegistry,
  dispatch,
  parseRequestLine,
  stateHash,
  type Request,
  type SavePayload,
} from '../../src/v3/harness/harness-core.js';
import { sha256 } from '../../src/v3/harness/sha256.js';

const CONFIG = { seed: 20260716, playerCount: 3, mode: 'competitive' as const };

function create(registry: ReturnType<typeof createRegistry>, seed = CONFIG.seed): Record<string, unknown> {
  return dispatch({ op: 'create', id: 1, config: { ...CONFIG, seed } } as Request, registry);
}

function gameIdOf(resp: Record<string, unknown>): string {
  return resp.gameId as string;
}

describe('sha256 primitive', () => {
  it('matches the known NIST vector for "abc"', () => {
    expect(sha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
  it('hashes the empty string to the known vector', () => {
    expect(sha256('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});

describe('harness-core protocol', () => {
  it('create: same seed → identical stateHash; different seed → different', () => {
    const r1 = create(createRegistry());
    const r2 = create(createRegistry());
    const r3 = create(createRegistry(), CONFIG.seed + 1);
    expect(r1.ok).toBe(true);
    expect(r1.stateHash).toBe(r2.stateHash);
    expect(r1.stateHash).not.toBe(r3.stateHash);
  });

  it('create: missing seed / bad playerCount / bad mode refused loudly', () => {
    const noSeed = dispatch(
      { op: 'create', id: 2, config: { playerCount: 3, mode: 'competitive' } } as unknown as Request,
      createRegistry(),
    );
    expect(noSeed.ok).toBe(false);
    expect((noSeed.error as { kind: string }).kind).toBe('BAD_REQUEST');

    const badCount = dispatch(
      { op: 'create', id: 3, config: { seed: 1, playerCount: 9, mode: 'competitive' } } as Request,
      createRegistry(),
    );
    expect(badCount.ok).toBe(false);
    expect((badCount.error as { kind: string }).kind).toBe('BAD_REQUEST');

    const badMode = dispatch(
      { op: 'create', id: 4, config: { seed: 1, playerCount: 3, mode: 'chess' } } as unknown as Request,
      createRegistry(),
    );
    expect(badMode.ok).toBe(false);
    expect((badMode.error as { kind: string }).kind).toBe('BAD_REQUEST');
  });

  it('save → load round-trip reproduces an identical stateHash', () => {
    const registry = createRegistry();
    const created = create(registry);
    const gameId = gameIdOf(created);
    // Advance a few AI steps so the saved state is non-trivial.
    dispatch({ op: 'run_ai', id: 10, gameId } as Request, registry);

    const saved = dispatch({ op: 'save', id: 11, gameId } as Request, registry);
    expect(saved.ok).toBe(true);
    const loaded = dispatch(
      { op: 'load', id: 12, payload: saved.payload as SavePayload } as Request,
      registry,
    );
    expect(loaded.ok).toBe(true);
    expect(loaded.stateHash).toBe(saved.stateHash);
    // The loaded game is a distinct registry entry.
    expect(gameIdOf(loaded)).not.toBe(gameId);
  });

  it('scripted create → run_ai → command → run_ai is deterministic across two registries', () => {
    const script = (registry: ReturnType<typeof createRegistry>): string[] => {
      const hashes: string[] = [];
      const created = create(registry);
      const gameId = gameIdOf(created);
      hashes.push(created.stateHash as string);

      // 1. run_ai from a fresh game stops at the THREAT gate.
      const a = dispatch({ op: 'run_ai', id: 20, gameId } as Request, registry);
      expect(a.waitingFor).toBe('threat');
      hashes.push(a.stateHash as string);

      // 2. THREAT → PLEDGE via a raw command.
      const b = dispatch(
        { op: 'command', id: 21, gameId, command: { type: 'ADVANCE_PHASE' } } as Request,
        registry,
      );
      expect(b.ok).toBe(true);
      hashes.push(b.stateHash as string);

      // 3. run_ai now waits on the living human's pledge.
      const c = dispatch({ op: 'run_ai', id: 22, gameId } as Request, registry);
      expect(c.waitingFor).toBe('human_pledge');
      hashes.push(c.stateHash as string);

      // 4. Human pledges 0, then run_ai resolves the pledge + drives AI turns to the next gate.
      const d = dispatch(
        {
          op: 'command',
          id: 23,
          gameId,
          command: { type: 'SUBMIT_PLEDGE', playerIndex: 0, amount: 0 },
        } as Request,
        registry,
      );
      expect(d.ok).toBe(true);
      hashes.push(d.stateHash as string);

      const e = dispatch({ op: 'run_ai', id: 24, gameId } as Request, registry);
      expect(e.ok).toBe(true);
      expect(['human_action', 'human_pledge', 'threat', 'bequest', 'last_stand', 'terminal'])
        .toContain(e.waitingFor);
      hashes.push(e.stateHash as string);
      return hashes;
    };

    const h1 = script(createRegistry());
    const h2 = script(createRegistry());
    expect(h1).toEqual(h2);
    // The sequence actually moved the state (not all identical).
    expect(new Set(h1).size).toBeGreaterThan(1);
  });

  it('state default view fogs seed + unflipped tokens; full view is omniscient', () => {
    const registry = createRegistry();
    const created = create(registry);
    const gameId = gameIdOf(created);

    const fogged = dispatch({ op: 'state', id: 30, gameId } as Request, registry);
    const observable = fogged.observable as { seed: unknown; board: { state: { nodes: Record<string, { hiddenToken: { sigil?: string; kind?: unknown; flipped: boolean } | null }> } } };
    expect(observable.seed).toBe('REDACTED');

    const full = dispatch({ op: 'state', id: 31, gameId, full: true } as Request, registry);
    const raw = full.state as { seed: unknown; board: { state: { nodes: Record<string, { hiddenToken: { kind?: unknown; flipped: boolean } | null }> } } };
    expect(typeof raw.seed).toBe('number');
    expect(raw.seed).not.toBe('REDACTED');

    // Find an unflipped token in the omniscient view and confirm the fog stripped its `kind`.
    const rawNodes = raw.board.state.nodes;
    const obsNodes = observable.board.state.nodes;
    const nodeId = Object.keys(rawNodes).find(
      (id) => rawNodes[id].hiddenToken !== null && rawNodes[id].hiddenToken!.flipped === false,
    );
    expect(nodeId).toBeDefined();
    expect(rawNodes[nodeId!].hiddenToken).toHaveProperty('kind');
    expect(obsNodes[nodeId!].hiddenToken).not.toHaveProperty('kind');
    expect(obsNodes[nodeId!].hiddenToken).toHaveProperty('sigil');
  });

  it('unknown op and unknown game id are typed errors, never throws', () => {
    const registry = createRegistry();
    const bad = dispatch({ op: 'warp' } as unknown as Request, registry);
    expect(bad.ok).toBe(false);
    expect((bad.error as { kind: string }).kind).toBe('BAD_REQUEST');

    for (const op of ['command', 'state', 'save', 'run_ai'] as const) {
      const missing = dispatch(
        { op, id: 40, gameId: 'g999', command: { type: 'ADVANCE_PHASE' } } as Request,
        registry,
      );
      expect(missing.ok).toBe(false);
      expect((missing.error as { kind: string }).kind).toBe('UNKNOWN_GAME');
    }
  });

  it('illegal command returns ILLEGAL_COMMAND and never throws', () => {
    const registry = createRegistry();
    const created = create(registry);
    const gameId = gameIdOf(created);
    // A fresh game is in THREAT — a SUBMIT_PLEDGE is illegal there; the engine rejects it and the
    // harness surfaces that rejection as a structured error (no exception escapes dispatch).
    let resp: Record<string, unknown> = {};
    expect(() => {
      resp = dispatch(
        {
          op: 'command',
          id: 50,
          gameId,
          command: { type: 'SUBMIT_PLEDGE', playerIndex: 0, amount: 0 },
        } as Request,
        registry,
      );
    }).not.toThrow();
    expect(resp.ok).toBe(false);
    expect((resp.error as { kind: string }).kind).toBe('ILLEGAL_COMMAND');

    // A malformed command object is likewise caught, not thrown.
    const garbage = dispatch(
      { op: 'command', id: 51, gameId, command: { type: 'NONSENSE' } } as unknown as Request,
      registry,
    );
    expect(garbage.ok).toBe(false);
    expect((garbage.error as { kind: string }).kind).toBe('ILLEGAL_COMMAND');
  });

  it('create → run_ai runs on the 21-node board at every {2,3,4}p × mode cell (T-226)', () => {
    // The harness is a transport over the real engine; a fresh create + run_ai exercises setup +
    // the AI/Shadowking board navigation on the new board without a crash. Every cell must return
    // ok and stop at a legal gate (a fresh game halts at THREAT before any human input).
    const legalGates = ['human_action', 'human_pledge', 'threat', 'bequest', 'last_stand', 'terminal'];
    for (const playerCount of [2, 3, 4]) {
      for (const mode of ['competitive', 'blood_pact'] as const) {
        const registry = createRegistry();
        const created = dispatch(
          { op: 'create', id: 1, config: { seed: 20260720, playerCount, mode } } as Request,
          registry,
        );
        expect(created.ok, `create ${playerCount}p ${mode}`).toBe(true);
        const ran = dispatch({ op: 'run_ai', id: 2, gameId: gameIdOf(created) } as Request, registry);
        expect(ran.ok, `run_ai ${playerCount}p ${mode}`).toBe(true);
        expect(legalGates, `waitingFor ${playerCount}p ${mode}`).toContain(ran.waitingFor);
      }
    }
  });

  it('parseRequestLine: rejects non-JSON and op-less lines, accepts a valid line', () => {
    expect(parseRequestLine('{nope').ok).toBe(false);
    expect(parseRequestLine('{"noOp":1}').ok).toBe(false);
    expect(parseRequestLine('{"op":"state","gameId":"g1"}').ok).toBe(true);
  });

  it('stateHash equals the direct sha-256 of the serialized state (no hidden normalization)', () => {
    const registry = createRegistry();
    const created = create(registry);
    const full = dispatch(
      { op: 'state', id: 60, gameId: gameIdOf(created), full: true } as Request,
      registry,
    );
    // The full view IS the serialized GameState — hashing it reproduces the response hash.
    const recomputed = sha256(JSON.stringify(full.state));
    expect(recomputed).toBe(created.stateHash);
    expect(recomputed).toBe(stateHash(full.state as never));
  });
});
