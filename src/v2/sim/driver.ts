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
}

export interface GameRunResult {
  readonly finalState: GameState;
  readonly steps: number;
  /** True if the run hit `maxSteps` before terminating (a bug signal). */
  readonly hitGuard: boolean;
}

const DEFAULT_MAX_STEPS = 5000;

/**
 * Play one full AI-vs-AI game and return the terminal state + run stats.
 * Pure `f(config)` — no `Math.random`, no `Date.now`; the AI seed is the game seed.
 */
export function playHeadlessGame(cfg: GameRunConfig): GameRunResult {
  const { seed, playerCount, mode } = cfg;
  const maxSteps = cfg.maxSteps ?? DEFAULT_MAX_STEPS;
  const policyFor = (seat: number): AIPolicy => cfg.seatPolicies?.[seat] ?? DEFAULT_AI_POLICY;

  const apply = (state: GameState, cmd: Command): GameState => applyCommand(state, cmd).state;

  // humanCount 0 → every seat is AI-controlled.
  let state = createGame(playerCount, mode, seed, 0);
  let steps = 0;

  while (state.gameEndReason === null && steps < maxSteps) {
    steps++;
    switch (state.phase) {
      case 'THREAT':
        state = apply(state, { type: 'ADVANCE_PHASE' });
        break;

      case 'PLEDGE': {
        for (const p of state.players) {
          if (!state.pledgeBuffer.some(e => e.playerIndex === p.index)) {
            state = runAIPledge(state, p.index, seed, policyFor(p.index)).state;
          }
        }
        state = apply(state, { type: 'ADVANCE_PHASE' });
        break;
      }

      case 'ACTION': {
        // Each active player runs its full turn; the reducer advances the pointer.
        const active = state.activePlayerIndex;
        state = runAITurn(state, active, seed, policyFor(active)).state;
        if (state.phase === 'ACTION' &&
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

  return { finalState: state, steps, hitGuard: state.gameEndReason === null };
}
