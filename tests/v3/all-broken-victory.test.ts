/**
 * Stage 3a — elimination end-conditions (§6, the all_broken successor).
 *
 * The Broken Court is retired (§8). A Warlord with zero living strongholds is `deposed`
 * and eliminated AT DAWN in seat order (resolveDeposals). End-conditions, loss preempts
 * win:
 *   - Attrition (zero living Warlords) ⇒ Shadowking wins (the all_broken successor;
 *     competitive ⇒ no player winner; Blood Pact ⇒ the traitor wins unless exposed).
 *   - Last Warlord standing ⇒ that player wins.
 *   - Whisper protects against hopelessness — no deposal can resolve pre-March (§12 #13).
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { runDawnPhase, resolveDeposals } from '../../src/v3/sequencer.js';
import { computeMetrics } from '../../src/v3/sim/metrics.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import type { GameState } from '../../src/v3/types.js';

/** Strip every player of all owned nodes so each holds zero living strongholds. */
function stripAllStrongholds(state: GameState): void {
  for (const ns of Object.values(state.board.state.nodes)) {
    ns.owner = null;
  }
}

/** Strip a single seat of all owned nodes (zero living strongholds). */
function stripSeat(state: GameState, seat: number): void {
  for (const ns of Object.values(state.board.state.nodes)) {
    if (ns.owner === seat) ns.owner = null;
  }
}

describe('Stage 3a — attrition is a Shadowking win (all_broken successor)', () => {
  it('competitive: zero living Warlords at Dawn ends as a Shadowking win, no player winner', () => {
    const state = createGame(2, 'competitive', 42);
    state.act = 'MARCH'; // depose is unlocked past Whisper (§12 #13)
    stripAllStrongholds(state);
    const { state: after } = runDawnPhase(state, new SeededRandom(42));

    expect(after.gameEndReason).toBe('attrition');
    expect(after.winner).toBeNull();
    expect(after.players.every(p => p.isEliminated)).toBe(true);

    const m = computeMetrics(after);
    expect(m.shadowkingWin).toBe(true);
    expect(m.attritionWin).toBe(true);
    expect(m.territoryWin).toBe(false);
    expect(m.gambitWin).toBe(false);
  });

  it('blood_pact: the unexposed traitor takes the dark win on attrition', () => {
    const state = createGame(2, 'blood_pact', 7);
    expect(state.bloodPactHolder).not.toBeNull();
    state.act = 'MARCH';
    state.bloodPactExposed = false;
    stripAllStrongholds(state);
    const { state: after } = runDawnPhase(state, new SeededRandom(7));

    expect(after.gameEndReason).toBe('attrition');
    expect(after.winner).toBe(state.bloodPactHolder);
    expect(computeMetrics(after).shadowkingWin).toBe(true);
  });

  it('blood_pact: an exposed traitor does NOT win on attrition', () => {
    const state = createGame(2, 'blood_pact', 7);
    state.act = 'MARCH';
    state.bloodPactExposed = true;
    stripAllStrongholds(state);
    const { state: after } = runDawnPhase(state, new SeededRandom(7));

    expect(after.gameEndReason).toBe('attrition');
    expect(after.winner).toBeNull();
  });
});

describe('Stage 3a — last Warlord standing (§6)', () => {
  it('one living Warlord remaining wins at Dawn', () => {
    const state = createGame(3, 'competitive', 11);
    state.act = 'MARCH';
    // Depose seats 1 and 2 (strip them); seat 0 keeps its Keep.
    stripSeat(state, 1);
    stripSeat(state, 2);
    const { state: after } = runDawnPhase(state, new SeededRandom(11));

    expect(after.players[1].isEliminated).toBe(true);
    expect(after.players[2].isEliminated).toBe(true);
    expect(after.players[0].isEliminated).toBe(false);
    expect(after.gameEndReason).toBe('last_standing');
    expect(after.winner).toBe(0);
  });
});

describe('Stage 3a — Whisper hopelessness protection (§12 #13)', () => {
  it('a zero-stronghold Warlord is NOT deposed in Whisper', () => {
    const state = createGame(2, 'competitive', 5);
    expect(state.act).toBe('WHISPER');
    stripSeat(state, 1);
    const events = resolveDeposals(state);
    expect(events.length).toBe(0);
    expect(state.players[1].isEliminated).toBe(false);
  });

  it('the same Warlord IS deposed once the Act reaches March', () => {
    const state = createGame(2, 'competitive', 5);
    state.act = 'MARCH';
    stripSeat(state, 1);
    resolveDeposals(state);
    expect(state.players[1].isEliminated).toBe(true);
    expect(state.players[1].eliminatedRound).toBe(state.round);
  });
});

describe('Stage 3a — deposal resolves ONLY at Dawn, in seat order (§7 D5, §12 #1)', () => {
  it('simultaneous last-two deposals both resolve, then attrition (§12 #2)', () => {
    const state = createGame(2, 'competitive', 99);
    state.act = 'RECKONING';
    stripAllStrongholds(state);
    const { state: after } = runDawnPhase(state, new SeededRandom(99));
    // Both deposed simultaneously → attrition, not a last-standing for either.
    expect(after.players[0].isEliminated).toBe(true);
    expect(after.players[1].isEliminated).toBe(true);
    expect(after.gameEndReason).toBe('attrition');
  });
});
