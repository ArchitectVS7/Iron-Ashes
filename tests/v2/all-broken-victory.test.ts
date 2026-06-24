/**
 * Stage A — all-broken resolves as a SHADOWKING VICTORY, not a draw.
 *
 * When every Warlord is Broken at once, the dark has won by attrition. The terminal
 * state must (a) end with gameEndReason 'all_broken', (b) attribute the win like
 * doom_complete (competitive ⇒ no player winner; Blood Pact ⇒ the traitor wins unless
 * exposed), and (c) count as a Shadowking win in the sim metrics.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v2/setup.js';
import { runDawnPhase } from '../../src/v2/sequencer.js';
import { computeMetrics } from '../../src/v2/sim/metrics.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import type { GameState } from '../../src/v2/types.js';

/** Force every player into a fresh Broken state that recovery won't clear this Dawn. */
function breakEveryone(state: GameState): void {
  for (const p of state.players) {
    p.isBroken = true;
    p.brokenSince = state.round;
    p.brokenRoundsConsecutive = 0; // ++ → 1 < BROKEN_MAX_ROUNDS ⇒ no recovery
  }
}

describe('Stage A — all-broken is a Shadowking win', () => {
  it('competitive: all-broken ends as a Shadowking win with no player winner', () => {
    const state = createGame(2, 'competitive', 42);
    breakEveryone(state);
    const { state: after } = runDawnPhase(state, new SeededRandom(42));

    expect(after.gameEndReason).toBe('all_broken');
    expect(after.winner).toBeNull();

    const m = computeMetrics(after);
    expect(m.shadowkingWin).toBe(true);
    expect(m.allBrokenWin).toBe(true);
    expect(m.territoryWin).toBe(false);
    expect(m.gambitWin).toBe(false);
  });

  it('blood_pact: the unexposed traitor takes the dark win on all-broken', () => {
    const state = createGame(2, 'blood_pact', 7);
    expect(state.bloodPactHolder).not.toBeNull();
    state.bloodPactExposed = false;
    breakEveryone(state);
    const { state: after } = runDawnPhase(state, new SeededRandom(7));

    expect(after.gameEndReason).toBe('all_broken');
    expect(after.winner).toBe(state.bloodPactHolder);
    expect(computeMetrics(after).shadowkingWin).toBe(true);
  });

  it('blood_pact: an exposed traitor does NOT win on all-broken', () => {
    const state = createGame(2, 'blood_pact', 7);
    state.bloodPactExposed = true;
    breakEveryone(state);
    const { state: after } = runDawnPhase(state, new SeededRandom(7));

    expect(after.gameEndReason).toBe('all_broken');
    expect(after.winner).toBeNull();
  });
});
