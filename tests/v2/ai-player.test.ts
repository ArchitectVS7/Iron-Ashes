/**
 * AI player tests (Stage 3c).
 *
 * Validates ALGORITHM §7.9: AI decisions are pure `f(state, seed)`, so an
 * AI-driven game is reproducible from the seed (§7.12). Also checks the
 * heuristic policy behaves sensibly and that every decision routes through the
 * ONE `applyCommand` reducer.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v2/setup.js';
import { applyCommand } from '../../src/v2/reducer.js';
import {
  choosePledge,
  chooseAction,
  runAIPledge,
  runAITurn,
  DEFAULT_AI_POLICY,
} from '../../src/v2/ai-player.js';
import { playHeadlessGame } from '../../src/v2/sim/driver.js';
import type { Command } from '../../src/v2/commands.js';
import type { GameState } from '../../src/v2/types.js';

// ─── Helpers ──────────────────────────────────────────────────────

function apply(state: GameState, cmd: Command): GameState {
  return applyCommand(state, cmd).state;
}

/** Advance THREAT → PLEDGE and set the telegraph. */
function toPledge(state: GameState): GameState {
  return apply(state, { type: 'ADVANCE_PHASE' });
}

/**
 * Drive a full AI-vs-AI game to a terminal state through the reducer.
 * Delegates to the canonical headless driver (src/v2/sim/driver.ts); with no
 * seat policies every seat uses DEFAULT_AI_POLICY, so this is byte-identical to
 * the loop that previously lived here (the §7.12 determinism anchor).
 */
function playFullGame(
  seed: number,
  playerCount = 4,
  mode: 'competitive' | 'blood_pact' = 'competitive',
): GameState {
  return playHeadlessGame({ seed, playerCount, mode }).finalState;
}

// ─── Pledge policy ────────────────────────────────────────────────

describe('AI pledge policy', () => {
  it('pledges nothing before a telegraph is set (THREAT phase)', () => {
    const state = createGame(4, 'competitive', 7, 0);
    expect(state.shadowking.telegraph).toBeNull();
    expect(choosePledge(state, 0, 7)).toBe(0);
  });

  it('never pledges more cards than are in hand', () => {
    const state = toPledge(createGame(4, 'competitive', 7, 0));
    for (const p of state.players) {
      const amount = choosePledge(state, p.index, 7);
      expect(amount).toBeGreaterThanOrEqual(0);
      expect(amount).toBeLessThanOrEqual(p.hand.length);
    }
  });

  it('pledges 0 when the hand is empty', () => {
    const state = toPledge(createGame(4, 'competitive', 7, 0));
    state.players[0].hand = [];
    expect(choosePledge(state, 0, 7)).toBe(0);
  });

  it('the struck player pledges at least as much as it would untargeted', () => {
    const state = toPledge(createGame(4, 'competitive', 7, 0));
    const telegraph = state.shadowking.telegraph!;
    // Force a known target and a comfortable hand for an apples-to-apples compare.
    state.players[0].hand = [3, 3, 3, 3, 3, 3];

    const targeted = { ...state, shadowking: { ...state.shadowking, telegraph: { ...telegraph, struckPlayerIndex: 0 } } };
    const untargeted = { ...state, shadowking: { ...state.shadowking, telegraph: { ...telegraph, struckPlayerIndex: 1 } } };

    // targetCover * C vs fairShare = C/n — with the default policy the target pays more.
    expect(choosePledge(targeted, 0, 7)).toBeGreaterThanOrEqual(choosePledge(untargeted, 0, 7));
  });

  it('keeps the configured hand reserve when not in danger', () => {
    const state = toPledge(createGame(4, 'competitive', 7, 0));
    const telegraph = state.shadowking.telegraph!;
    // Not the target; small hand so the reserve binds.
    const s = {
      ...state,
      shadowking: { ...state.shadowking, telegraph: { ...telegraph, struckPlayerIndex: 99 } },
    };
    s.players[0].hand = [1, 1];
    const amount = choosePledge(s, 0, 7, { ...DEFAULT_AI_POLICY, selfishness: 0 });
    expect(amount).toBeLessThanOrEqual(s.players[0].hand.length - DEFAULT_AI_POLICY.handReserve);
  });

  it('is a pure function — does not mutate the state', () => {
    const state = toPledge(createGame(4, 'competitive', 7, 0));
    const snapshot = JSON.stringify(state);
    choosePledge(state, 0, 7);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('is deterministic — same (state, seed) ⇒ same amount', () => {
    const state = toPledge(createGame(4, 'competitive', 7, 0));
    for (const p of state.players) {
      expect(choosePledge(state, p.index, 7)).toBe(choosePledge(state, p.index, 7));
    }
  });
});

// ─── Action policy ────────────────────────────────────────────────

/** Get a 4-player game into the ACTION phase with all pledges in. */
function toAction(seed: number): GameState {
  let state = createGame(4, 'competitive', seed, 0);
  state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE
  for (const p of state.players) {
    state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: p.index, amount: 0 });
  }
  state = apply(state, { type: 'ADVANCE_PHASE' }); // → ACTION
  return state;
}

describe('AI action policy', () => {
  it('is a pure function — does not mutate the state', () => {
    const state = toAction(7);
    const snapshot = JSON.stringify(state);
    chooseAction(state, state.activePlayerIndex, 7);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('is deterministic — same (state, seed) ⇒ same action', () => {
    const state = toAction(7);
    const me = state.activePlayerIndex;
    expect(chooseAction(state, me, 7)).toEqual(chooseAction(state, me, 7));
  });

  it('CLAIMs an unclaimed Holding the Warlord is standing on', () => {
    const state = toAction(7);
    const me = state.activePlayerIndex;
    // Put the Warlord on an adjacent unclaimed Holding and ensure banners.
    const holding = state.board.definition.holdingIds[0];
    state.players[me].warlordNodeId = holding;
    // Construct a CLAIMABLE precondition: unclaimed and not ashed. (The Stage-5c
    // spread tuning can ash this node during the opening strike — clear it so the
    // test exercises AI action priority, not board incidentals.)
    state.board.state.nodes[holding].owner = null;
    state.board.state.nodes[holding].ashed = false;
    state.board.state.nodes[holding].blightLevel = 0;
    state.players[me].banners = 3;
    expect(chooseAction(state, me, 7)).toEqual({ type: 'CLAIM' });
  });

  it('MARCHes toward a claimable when standing on nothing worth claiming', () => {
    const state = toAction(7);
    const me = state.activePlayerIndex;
    state.players[me].banners = 3; // can afford to move
    const action = chooseAction(state, me, 7);
    expect(action.type).toBe('MARCH');
    // The chosen step must be a real neighbour of the Warlord's node.
    const here = state.players[me].warlordNodeId;
    expect(state.board.definition.nodes[here].connections).toContain(action.targetNodeId);
  });

  it('PASSes when it has no banners to act with', () => {
    const state = toAction(7);
    const me = state.activePlayerIndex;
    state.players[me].banners = 0;
    expect(chooseAction(state, me, 7)).toEqual({ type: 'PASS' });
  });

  it('never proposes a MARCH the reducer would reject', () => {
    // Drive several AI turns and confirm no InvalidCommandError escapes.
    const state = toAction(11);
    expect(() => runAITurn(state, state.activePlayerIndex, 11)).not.toThrow();
  });
});

// ─── Drivers route through applyCommand ───────────────────────────

describe('AI drivers', () => {
  it('runAIPledge records a pledge in the buffer', () => {
    const state = toPledge(createGame(4, 'competitive', 7, 0));
    const result = runAIPledge(state, 0, 7);
    expect(result.state.pledgeBuffer.some(e => e.playerIndex === 0)).toBe(true);
  });

  it('runAITurn ends the active player\'s turn (advances the pointer or finishes)', () => {
    const state = toAction(7);
    const me = state.activePlayerIndex;
    const after = runAITurn(state, me, 7).state;
    const turnEnded =
      after.gameEndReason !== null ||
      after.phase !== 'ACTION' ||
      after.activePlayerIndex !== me ||
      after.turnOrderPosition >= after.turnOrder.length;
    expect(turnEnded).toBe(true);
  });

  it('runAITurn terminates (no hang) and consumes the player\'s actions', () => {
    const state = toAction(7);
    const me = state.activePlayerIndex;
    const before = state.players[me].actionsRemaining;
    expect(before).toBeGreaterThan(0);
    const after = runAITurn(state, me, 7).state;
    // Either the player acted (actions spent) or it passed (pointer moved).
    expect(after.activePlayerIndex !== me || after.players[me].actionsRemaining < before).toBe(true);
  });
});

// ─── Full-game determinism (§7.9 / §7.12) ─────────────────────────

describe('AI-driven game determinism', () => {
  it('reaches a terminal state within the round cap', () => {
    const final = playFullGame(7);
    expect(final.gameEndReason).not.toBeNull();
  });

  it('same seed ⇒ byte-identical final state (the §7.12 invariant)', () => {
    const a = playFullGame(7);
    const b = playFullGame(7);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different seeds generally diverge', () => {
    const a = playFullGame(7);
    const b = playFullGame(99);
    // Not a hard guarantee, but two unrelated seeds should not produce identical
    // full action logs — a strong signal the seed actually threads through the AI.
    expect(JSON.stringify(a.actionLog)).not.toBe(JSON.stringify(b.actionLog));
  });

  it('runs for 2- and 3-player counts too', () => {
    expect(playFullGame(7, 2).gameEndReason).not.toBeNull();
    expect(playFullGame(7, 3).gameEndReason).not.toBeNull();
  });

  it('a blood_pact game also terminates deterministically', () => {
    // humanCount 0 ⇒ no human to hold the Pact; still must run & be reproducible.
    const a = playFullGame(7, 4, 'blood_pact');
    const b = playFullGame(7, 4, 'blood_pact');
    expect(a.gameEndReason).not.toBeNull();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
