/**
 * Headless game driver (Stage 4a) — the single canonical AI-vs-AI game loop.
 *
 * This is the one implementation of "drive a full game to a terminal state
 * through the reducer", parameterized by a per-seat AI policy. It replaces the
 * loop that was duplicated in tests/v2/ai-player.test.ts's `playFullGame`, and
 * it is the foundation the Monte-Carlo sweep (sim/sweep.ts) runs on.
 *
 * Determinism: every decision routes through the pure `f(state, seed, policy)`
 * choosers and the one `applyCommand` reducer — same config ⇒ byte-identical
 * final state (the §7.12 invariant). With no `seatPolicies`, every seat uses
 * DEFAULT_AI_POLICY, reproducing the legacy `playFullGame` bit-for-bit.
 */

import { createGame } from '../setup.js';
import { applyCommand } from '../reducer.js';
import { runAIPledge, runAITurn, DEFAULT_AI_POLICY, type AIPolicy } from '../ai-player.js';
import { chooseAccusation, chooseAccusationVote } from '../blood-pact.js';
import { withTunables, type Tunables } from '../tunables.js';
import { territoryOf } from './metrics.js';
import type { Command } from '../commands.js';
import type { GameMode, GameState } from '../types.js';

/** Per-seat AI policy assignment (index = seat). Missing seats use the default. */
export type SeatPolicies = ReadonlyArray<AIPolicy>;

export interface GameRunConfig {
  readonly seed: number;
  readonly playerCount: number;
  readonly mode: GameMode;
  /** Seat → policy. Any unspecified seat uses DEFAULT_AI_POLICY. */
  readonly seatPolicies?: SeatPolicies;
  /** Hard step cap so a bug can never hang a sweep. Default 5000. */
  readonly maxSteps?: number;
  /**
   * SIM-ONLY: force an AI seat to hold the Blood Pact (blood_pact mode). Real
   * play forbids this (§10 — only a human is the traitor), but the headless sim
   * needs it to measure traitor win-rate. Ignored in competitive mode.
   */
  readonly bloodPactSeat?: number;
  /** Per-run tunable overrides (Stage-5 balance search). Unspecified = defaults. */
  readonly tunables?: Partial<Tunables>;
  /**
   * TABLE-WIDE bounded-rationality / human-error rate (Stage 5k), 0..1. Applied to EVERY seat that
   * does not already set its own `errorRate` (per-seat policies win). An AI-REALISM axis, not a §9
   * lever. Unspecified / 0 ⇒ flawless play and byte-identical to the locked build (no policy is
   * rewrapped, so the default seat keeps its exact object identity / baseline brain).
   */
  readonly errorRate?: number;
}

export interface GameRunResult {
  readonly finalState: GameState;
  readonly steps: number;
  /** True if the run hit `maxSteps` before terminating (a bug signal). */
  readonly hitGuard: boolean;
  /**
   * The territory leader (most living forge-weighted production, lowest-seat tiebreak among the
   * non-eliminated) snapshotted the first time the game reaches the MARCH act — the mid-game
   * marker for the snowball↔turtle signal. null if the game ended before MARCH. Derived in the
   * driver because it needs a live mid-game snapshot, not the final state.
   */
  readonly midGameLeader: number | null;
}

const DEFAULT_MAX_STEPS = 5000;

/**
 * Play one full AI-vs-AI game and return the terminal state + run stats.
 * Pure `f(config)` — no `Math.random`, no `Date.now`; the AI seed is the game seed.
 */
export function playHeadlessGame(cfg: GameRunConfig): GameRunResult {
  // Scope the tunable overrides for the whole game (leak-safe; default = current values).
  return withTunables(cfg.tunables ?? {}, () => runHeadlessGame(cfg));
}

function runHeadlessGame(cfg: GameRunConfig): GameRunResult {
  const { seed, playerCount, mode } = cfg;
  const maxSteps = cfg.maxSteps ?? DEFAULT_MAX_STEPS;
  // Table-wide bounded-rationality (Stage 5k): layer `errorRate` onto any seat that doesn't set its
  // own. Only rewrap when the table rate is a POSITIVE number AND the seat hasn't specified one —
  // so at 0/undefined every policy keeps its exact object identity (the DEFAULT seat stays on the
  // baseline brain and the game is byte-identical to the locked build).
  const tableError = cfg.errorRate;
  const policyFor = (seat: number): AIPolicy => {
    const base = cfg.seatPolicies?.[seat] ?? DEFAULT_AI_POLICY;
    return tableError && tableError > 0 && base.errorRate === undefined
      ? { ...base, errorRate: tableError }
      : base;
  };

  const apply = (state: GameState, cmd: Command): GameState => applyCommand(state, cmd).state;

  // humanCount 0 → every seat is AI-controlled.
  let state = createGame(playerCount, mode, seed, 0);

  // Sim-only: assign the Blood Pact to an AI seat (real play forbids it, §10).
  if (mode === 'blood_pact' && cfg.bloodPactSeat !== undefined && state.players[cfg.bloodPactSeat]) {
    state.players.forEach(p => { p.hasBloodPact = p.index === cfg.bloodPactSeat; });
    state.bloodPactHolder = cfg.bloodPactSeat;
  }

  let steps = 0;
  let accusedThroughRound = 0;
  let midGameLeader: number | null = null;

  while (state.gameEndReason === null && steps < maxSteps) {
    steps++;
    // Snapshot the mid-game territory leader the first time the game reaches MARCH (the snowball
    // signal denominator). WHISPER=early, MARCH=mid, RECKONING=late — so the MARCH leader is the
    // honest "who was ahead at mid-game" the report compares against the eventual winner.
    if (midGameLeader === null && state.act === 'MARCH') {
      midGameLeader = territoryLeader(state);
    }
    switch (state.phase) {
      case 'THREAT':
        state = apply(state, { type: 'ADVANCE_PHASE' });
        break;

      case 'PLEDGE': {
        for (const p of state.players) {
          if (p.isEliminated) continue; // eliminated players have no pledge rights (§6)
          if (!state.pledgeBuffer.some(e => e.playerIndex === p.index)) {
            state = runAIPledge(state, p.index, seed, policyFor(p.index)).state;
          }
        }
        state = apply(state, { type: 'ADVANCE_PHASE' });
        break;
      }

      case 'ACTION': {
        // Blood Pact: once per round, let the AIs run the deduction surface
        // (accusation) using the pure choosers — this is how the traitor gets caught.
        if (state.mode === 'blood_pact' && state.round > accusedThroughRound) {
          accusedThroughRound = state.round;
          state = runAIAccusations(state, seed);
          if (state.gameEndReason !== null) break;
        }
        // Each active player runs its full turn; the reducer advances the pointer.
        const active = state.activePlayerIndex;
        state = runAITurn(state, active, seed, policyFor(active)).state;
        if (state.gameEndReason === null &&
            state.phase === 'ACTION' &&
            state.activePlayerIndex === active &&
            state.players[active].actionsRemaining > 0) {
          // Pointer didn't move and the player still has actions — force-pass to
          // guarantee progress (defensive; runAITurn shouldn't leave this state).
          state = apply(state, { type: 'PLAYER_ACTION', playerIndex: active, action: { type: 'PASS' } });
        }
        // When all players are done, advance to DAWN.
        if (state.gameEndReason === null &&
            state.phase === 'ACTION' &&
            state.turnOrderPosition >= state.turnOrder.length) {
          state = apply(state, { type: 'ADVANCE_PHASE' });
        }
        break;
      }

      case 'DAWN':
        // Dawn auto-runs inside ADVANCE_PHASE from ACTION; nothing to do here.
        state = apply(state, { type: 'ADVANCE_PHASE' });
        break;
    }
  }

  return { finalState: state, steps, hitGuard: state.gameEndReason === null, midGameLeader };
}

/** The living seat with the most forge-weighted production (lowest-seat tiebreak), or null if none
 *  are alive. The snowball-signal leader snapshot. Pure. */
function territoryLeader(state: GameState): number | null {
  let bestSeat: number | null = null;
  let bestTerr = -1;
  for (const p of state.players) {
    if (p.isEliminated) continue;
    const terr = territoryOf(state, p.index);
    if (terr > bestTerr) { bestTerr = terr; bestSeat = p.index; }
  }
  return bestSeat;
}

/**
 * Drive one round of AI accusation (Blood Pact). The first AI with a clear
 * suspect opens an accusation; the other required voters weigh in via the pure
 * `chooseAccusationVote`. Everything routes through `applyCommand`; lockout /
 * already-open errors are swallowed (a no-op round). Pure `f(state, seed)`.
 */
function runAIAccusations(state: GameState, seed: number): GameState {
  if (state.bloodPactExposed) return state;
  const apply = (s: GameState, cmd: Command): GameState => applyCommand(s, cmd).state;

  for (const p of state.players) {
    if (state.gameEndReason !== null || state.bloodPactExposed) break;
    const accused = chooseAccusation(state, p.index, seed);
    if (accused === null) continue;

    try {
      state = apply(state, { type: 'INITIATE_ACCUSATION', accuserIndex: p.index, accusedIndex: accused });
    } catch {
      continue; // lockout / already-open — skip this accuser
    }

    let guard = 0;
    while (state.accusationState && state.gameEndReason === null && guard < 8) {
      guard++;
      const acc = state.accusationState;
      const pending = state.players.find(
        q => q.index !== acc.accused && !acc.votes.some(v => v.playerIndex === q.index),
      );
      if (!pending) break;
      const agree = chooseAccusationVote(state, pending.index, seed);
      state = apply(state, { type: 'ACCUSATION_VOTE', playerIndex: pending.index, agree });
    }
    break; // at most one accusation attempt per round
  }
  return state;
}
