/**
 * Blood Pact sim tests (Stage 4f).
 *
 * The saboteur suppresses its pledge ONLY when it actually holds the Pact; the
 * sim's AI-traitor affordance + accusation driving produce terminating games and
 * traitor/accusation metrics so Stage 5 can balance the deduction surface.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { applyCommand } from '../../src/v3/reducer.js';
import { choosePledge } from '../../src/v3/ai-player.js';
import { ARCHETYPES } from '../../src/v3/sim/archetypes.js';
import { playHeadlessGame } from '../../src/v3/sim/driver.js';
import { runSweep } from '../../src/v3/sim/sweep.js';
import { bloodPactMatchups } from '../../src/v3/sim/matchups.js';
import { summarizeBloodPact } from '../../src/v3/sim/report.js';
import { computeMetrics } from '../../src/v3/sim/metrics.js';
import type { GameState } from '../../src/v3/types.js';

const apply = (s: GameState, c: Parameters<typeof applyCommand>[1]): GameState => applyCommand(s, c).state;

describe('saboteur', () => {
  it('suppresses its pledge only when it actually holds the Blood Pact', () => {
    let state = createGame(4, 'blood_pact', 42, 4);
    state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE
    // Pick a non-struck seat with a comfortable hand.
    const struck = state.shadowking.telegraph!.struckPlayerIndex ?? -1;
    const seat = (struck + 1) % 4;
    state.players[seat].hand = [2, 2, 2, 2, 2, 2];

    // Seed 1 lands on a SABOTAGE round (the cover-vs-sabotage blend coin floats 0.979 ≥
    // SABOTEUR_COVER), so the traitor suppresses rather than blends — that is the branch this
    // test exercises. (A COVER round would instead push the pledge UP to the medium tier to
    // pass as loyal; that path is covered by the sweep tests + the Stage-5m balance sim.)
    state.players[seat].hasBloodPact = true;
    const asTraitor = choosePledge(state, seat, 1, ARCHETYPES.saboteur.policy);
    state.players[seat].hasBloodPact = false;
    const asLoyal = choosePledge(state, seat, 1, ARCHETYPES.saboteur.policy);

    expect(asTraitor).toBeLessThan(asLoyal); // hides a thin pledge when it's the traitor
  });
});

describe('blood_pact sim', () => {
  it('an AI-held Pact game terminates and reports traitor metrics', () => {
    const r = playHeadlessGame({ seed: 7, playerCount: 4, mode: 'blood_pact', bloodPactSeat: 0,
      seatPolicies: [ARCHETYPES.saboteur.policy, ARCHETYPES.cooperator.policy, ARCHETYPES.opportunist.policy, ARCHETYPES.turtle.policy] });
    expect(r.hitGuard).toBe(false);
    expect(r.finalState.gameEndReason).not.toBeNull();
    expect(r.finalState.bloodPactHolder).toBe(0);
    const m = computeMetrics(r.finalState);
    expect(m.isBloodPact).toBe(true);
    // Outcome flags are consistent: a traitor win implies a Shadowking win — the dark ate the
    // Keystone (doom_complete) OR deposed the whole table (attrition). The eliminated/standing
    // traitor takes EITHER unless exposed (§6/§12 #5). (Was doom_complete-only pre-3e, when no
    // elimination could fire — Reckoning auto-pressure now makes attrition reachable.)
    if (m.traitorWin) expect(['doom_complete', 'attrition']).toContain(m.gameEndReason);
  });

  it('a blood_pact sweep terminates everywhere and the deduction surface is exercised', () => {
    const rows = runSweep({
      seeds: [1, 2, 3, 4, 5, 6],
      playerCounts: [4],
      modes: ['blood_pact'],
      matchups: bloodPactMatchups(),
    });
    expect(rows.length).toBe(6 * bloodPactMatchups().length);
    for (const r of rows) {
      expect(r.hitGuard).toBe(false);
      expect(r.metrics.isBloodPact).toBe(true);
    }
    const bp = summarizeBloodPact(rows);
    expect(bp.games).toBe(rows.length);
    // Accusations happen across the sweep (the AIs use the suspicion log).
    const totalAccusations = rows.reduce((s, r) => s + r.metrics.accusationsResolved, 0);
    expect(totalAccusations).toBeGreaterThan(0);
    // Rates are well-formed probabilities.
    for (const v of [bp.traitorWinRate, bp.traitorExposureRate, bp.accusationAccuracy]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
