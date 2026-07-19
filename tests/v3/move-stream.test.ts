/**
 * Full-game presentation-stream guard (T-102).
 *
 * T-101's `moves.test.ts` unit-tests `diffObservable` on hand-built projection pairs. This file is
 * the FULL-GAME complement: it drives complete AI-vs-AI games through the reducer, captures every
 * `applyCommand` boundary, and runs each transition through `diffObservable` for every viewerSeat —
 * asserting three distinct properties over 2 fixed seeds of complete games:
 *
 *   A. Determinism — running the same game twice yields a byte-identical serialized move stream.
 *   B. Fog       — for every viewerSeat, the serialized stream never contains a redacted token's
 *                  hidden content or the seed value. (Leak-safety is BY CONSTRUCTION — `diffObservable`
 *                  reads only two already-fogged `observableState` projections, whose unflipped tokens
 *                  are stripped to `{ sigil, flipped:false }` and whose `seed` is `SEED_REDACTED` — so
 *                  these string assertions are the exact, sufficient encoding of "no leak".)
 *   C. Coverage  — every command type OBSERVED across the games produced a non-crashing `Move[]`, and
 *                  every emitted move is within that command's `MOVE_EXPECTATIONS` superset.
 *
 * Capture mechanism: `vi.spyOn(reducer, 'applyCommand')` wraps the ONE mutation entry point. The
 * reducer is non-recursive and every decider (driver + ai-player + blood-pact) calls it through the
 * same module namespace, so each command is logged exactly once with its immutable before/after
 * state (the reducer clones its input, so stored snapshots never mutate underfoot).
 *
 * Seeds: `314159` and `161803` — both large and digit-distinctive (so the fog seed-string check is
 * collision-proof against a move stream of only small integers + digit-free node ids), and both
 * proven to drive the AI into opening an accusation under the Blood-Pact archetype table, so the
 * `INITIATE_ACCUSATION` / `ACCUSATION_VOTE` command paths (and their Moves) are genuinely exercised.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import * as reducer from '../../src/v3/reducer.js';
import { playHeadlessGame, type SeatPolicies } from '../../src/v3/sim/driver.js';
import { observableState, SEED_REDACTED } from '../../src/v3/observable.js';
import { ARCHETYPES } from '../../src/v3/sim/archetypes.js';
import { diffObservable, MOVE_EXPECTATIONS, type Move } from '../../src/ui-v3/moves.js';
import type { Command } from '../../src/v3/commands.js';
import type { GameMode, GameState } from '../../src/v3/types.js';

// ─── Fixed seeds & config ─────────────────────────────────────────

const SEEDS = [314159, 161803] as const;

/** Distinct-behaviour seat brains for the Blood-Pact games. The saboteur sits at seat 0 (the AI
 *  traitor), which is what pushes suspicion past the evidence bar so accusations actually open —
 *  the same archetype table the balance sim uses to measure exposure. */
const BP_POLICIES: SeatPolicies = [
  ARCHETYPES.saboteur.policy,
  ARCHETYPES.cooperator.policy,
  ARCHETYPES.opportunist.policy,
  ARCHETYPES.turtle.policy,
];

interface GameConfig {
  readonly seed: number;
  readonly playerCount: number;
  readonly mode: GameMode;
  readonly bloodPactSeat?: number;
  readonly seatPolicies?: SeatPolicies;
}

/** A competitive 4-player game at `seed` (default AI brains). */
const competitive = (seed: number): GameConfig => ({ seed, playerCount: 4, mode: 'competitive' });

/** A 4-player Blood-Pact game at `seed` with the AI traitor at seat 0 and the archetype table. */
const bloodPact = (seed: number): GameConfig => ({
  seed,
  playerCount: 4,
  mode: 'blood_pact',
  bloodPactSeat: 0,
  seatPolicies: BP_POLICIES,
});

// ─── Capture harness ──────────────────────────────────────────────

interface Step {
  readonly cmd: Command;
  readonly before: GameState;
  readonly after: GameState;
}

interface CapturedGame {
  readonly steps: Step[];
  readonly finalState: GameState;
}

/** Play one full headless game, logging every `applyCommand` boundary via a spy. */
function captureGame(cfg: GameConfig): CapturedGame {
  const real = reducer.applyCommand; // save the original BEFORE spying
  const steps: Step[] = [];
  const spy = vi
    .spyOn(reducer, 'applyCommand')
    .mockImplementation((state: GameState, command: Command) => {
      const result = real(state, command); // real, non-recursive ⇒ one log entry per command
      steps.push({ cmd: command, before: state, after: result.state });
      return result;
    });
  try {
    const { finalState, hitGuard } = playHeadlessGame({
      seed: cfg.seed,
      playerCount: cfg.playerCount,
      mode: cfg.mode,
      bloodPactSeat: cfg.bloodPactSeat,
      seatPolicies: cfg.seatPolicies,
    });
    if (hitGuard) {
      throw new Error(`game ${JSON.stringify(cfg)} hit the step guard (never terminated)`);
    }
    return { steps, finalState };
  } finally {
    spy.mockRestore();
  }
}

/** The Move stream one viewerSeat would see across the whole game. */
function seatStream(steps: readonly Step[], seat: number): Move[] {
  const out: Move[] = [];
  for (const { before, after } of steps) {
    out.push(...diffObservable(observableState(before, seat), observableState(after, seat)));
  }
  return out;
}

/** Serialize the per-seat streams for every seat — the byte-identity unit. */
function serialize(steps: readonly Step[], seatCount: number): string {
  return JSON.stringify(Array.from({ length: seatCount }, (_, s) => seatStream(steps, s)));
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Capture-harness sanity ───────────────────────────────────────

describe('capture harness', () => {
  it('the spy intercepts the driver and logs a non-empty, complete game', () => {
    const { steps, finalState } = captureGame(competitive(SEEDS[0]));
    expect(steps.length).toBeGreaterThan(0); // if 0, the spy did not intercept the driver's calls
    expect(finalState.gameEndReason).not.toBeNull();
  });
});

// ─── Property A: Determinism ──────────────────────────────────────

describe('T-102 · determinism', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed} · determinism — two runs yield byte-identical serialized move streams`, () => {
      const a = captureGame(competitive(seed));
      const b = captureGame(competitive(seed));
      const seatCount = a.finalState.players.length;
      expect(b.finalState.players.length).toBe(seatCount);

      const sa = serialize(a.steps, seatCount);
      const sb = serialize(b.steps, seatCount);
      expect(sa).toBe(sb);
      // Non-trivial: a degenerate empty stream must not pass vacuously.
      expect(sa.length).toBeGreaterThan(2);
    });
  }
});

// ─── Property B: Fog ──────────────────────────────────────────────

describe('T-102 · fog', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed} · fog — no serialized stream leaks redacted content or the seed, any viewerSeat`, () => {
      // Cover both modes so revealed/redacted content is exercised under competitive AND blood_pact
      // (the latter also surfaces the accusation Moves).
      const games = [captureGame(competitive(seed)), captureGame(bloodPact(seed))];
      const seedStr = String(seed);
      for (const { steps, finalState } of games) {
        for (let seat = 0; seat < finalState.players.length; seat++) {
          const json = JSON.stringify(seatStream(steps, seat));
          expect(json).not.toContain(SEED_REDACTED); // redaction sentinel never copied into a Move
          expect(json).not.toContain(seedStr); // the real seed never surfaces (deciders never see it)
          expect(json.length).toBeGreaterThan(2); // the seat actually produced moves
        }
      }
    });
  }
});

// ─── Property C: Coverage ─────────────────────────────────────────

/** The command types an AI-driven game can issue. The 3 interactive/human-only commands
 *  (`LAST_STAND_COMMIT`, `SET_BEQUEST`, `SET_WRAITH_INPUT`) are never emitted by the sim/AI. */
const AI_REACHABLE: readonly Command['type'][] = [
  'ADVANCE_PHASE',
  'SUBMIT_PLEDGE',
  'PLAYER_ACTION',
  'INITIATE_ACCUSATION',
  'ACCUSATION_VOTE',
];
const HUMAN_ONLY: readonly Command['type'][] = [
  'LAST_STAND_COMMIT',
  'SET_BEQUEST',
  'SET_WRAITH_INPUT',
];

describe('T-102 · coverage', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed} · coverage — every observed command type yields a valid non-crashing Move[]`, () => {
      // Pool a competitive AND a Blood-Pact game so the accusation commands are observed too.
      const games = [captureGame(competitive(seed)), captureGame(bloodPact(seed))];
      const observed = new Set<string>();

      for (const { steps, finalState } of games) {
        const seatCount = finalState.players.length;
        for (const step of steps) {
          observed.add(step.cmd.type);
          const allowed = new Set(MOVE_EXPECTATIONS[step.cmd.type]);
          for (let seat = 0; seat < seatCount; seat++) {
            // Non-crashing + total: diffObservable returns an array for every (step, seat).
            const moves = diffObservable(
              observableState(step.before, seat),
              observableState(step.after, seat),
            );
            expect(Array.isArray(moves)).toBe(true);
            for (const m of moves) {
              expect(allowed.has(m.type), `${m.type} not allowed for ${step.cmd.type}`).toBe(true);
            }
          }
        }
      }

      // Every AI-reachable command type must actually appear across the pooled games.
      for (const t of AI_REACHABLE) {
        expect(observed.has(t), `expected command ${t} to be observed`).toBe(true);
      }
      // The interactive-only commands are never issued by the sim/AI — document, don't require.
      for (const t of HUMAN_ONLY) {
        expect(observed.has(t), `human-only command ${t} should not be observed`).toBe(false);
      }
      // Everything observed is a known command with an expectation entry.
      for (const t of observed) {
        expect(Object.keys(MOVE_EXPECTATIONS)).toContain(t);
      }
    });
  }
});
