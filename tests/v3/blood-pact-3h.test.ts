/**
 * Stage 3h — Blood Pact v3 elimination interactions (ALGORITHM §10 + §13, §12 #5).
 *
 * Wires the v3 elimination layer to the cloned Blood-Pact module. Three claims, all driven through
 * the real engine functions (never a parallel rules path):
 *
 *   1. An ELIMINATED traitor STILL WINS on a LATER doom_complete / attrition (§12 #5) — their
 *      bargain was the ash. The win-check reads `bloodPactHolder` regardless of `isEliminated`.
 *   2. The Wraith afterlife is "especially charged" for an eliminated traitor (§10): it takes
 *      PRECEDENCE within WRAITH_INPUT_CAP and nudges the board leader HARDER (WRAITH_TRAITOR_NUDGE)
 *      — steering the dark toward doom. It buys no EXTRA input slot (cap is unchanged).
 *   3. Competitive mode (flag OFF) is BYTE-IDENTICAL: no traitor exists, so the wraith plan stays
 *      pure ascending-seat (§12 #24) and the loyal nudge magnitude is unchanged.
 *
 * Re-tune (a v3 5e-equivalent) is DEFERRED — these tests pin CORRECTNESS + DETERMINISM only.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { resolveDeposals, checkEndConditions } from '../../src/v3/sequencer.js';
import {
  planWraithInputs,
  applyWraithNudges,
  boardLeaderSeat,
} from '../../src/v3/index.js';
import {
  WRAITH_GRUDGE_NUDGE,
  WRAITH_TRAITOR_NUDGE,
  withTunables,
} from '../../src/v3/tunables.js';
import { playHeadlessGame } from '../../src/v3/sim/driver.js';
import type { GameState } from '../../src/v3/types.js';

/** Strip a single seat of all owned nodes → zero living strongholds → deposable at DAWN past Whisper. */
function stripSeat(s: GameState, seat: number): void {
  for (const ns of Object.values(s.board.state.nodes)) {
    if (ns.owner === seat) ns.owner = null;
  }
}

/** Give `seat` every Holding so it is the unique production leader among the living. */
function makeLeader(s: GameState, seat: number): void {
  for (const id of s.board.definition.holdingIds) {
    const ns = s.board.state.nodes[id];
    if (!ns.ashed) ns.owner = seat;
  }
}

/** A blood_pact game with the pact pinned to `traitor` (humanCount = all → assignable, then forced). */
function bloodPactGame(playerCount: number, seed: number, traitor: number): GameState {
  const s = createGame(playerCount, 'blood_pact', seed, playerCount);
  s.bloodPactHolder = traitor;
  s.players.forEach(p => { p.hasBloodPact = p.index === traitor; });
  s.bloodPactExposed = false;
  return s;
}

// ─── 1. The eliminated traitor still wins (§12 #5) ────────────────

describe('Stage 3h — an ELIMINATED traitor still wins on a later doom/attrition (§12 #5)', () => {
  it('traitor eliminated EARLY, then a LATER doom_complete → the dead traitor takes the win', () => {
    const s = bloodPactGame(3, 11, 0);
    s.act = 'MARCH'; // depose unlocked past Whisper (§12 #13)

    // Seat 0 (the traitor) is eliminated at a Dawn — and the game does NOT end (2 rivals live on).
    stripSeat(s, 0);
    resolveDeposals(s);
    expect(s.players[0].isEliminated).toBe(true);
    expect(s.players.filter(p => !p.isEliminated).map(p => p.index)).toEqual([1, 2]);
    expect(checkEndConditions(s)).toBeNull(); // play continues

    // Many Dawns later the dark completes the doom (the Keystone ashes).
    s.board.state.nodes[s.board.definition.keystoneId].ashed = true;
    const result = checkEndConditions(s);
    expect(result).not.toBeNull();
    expect(s.gameEndReason).toBe('doom_complete');
    expect(s.winner).toBe(0); // the ASH was the bargain — the dead traitor collects (§12 #5)
  });

  it('traitor eliminated EARLY, then a LATER attrition (all fall) → the dead traitor wins', () => {
    const s = bloodPactGame(3, 12, 0);
    s.act = 'MARCH';

    // Seat 0 (traitor) falls first; game continues with seats 1 & 2.
    stripSeat(s, 0);
    resolveDeposals(s);
    expect(checkEndConditions(s)).toBeNull();

    // Later the last two rivals are wiped out → attrition (zero living, §12 #2).
    stripSeat(s, 1);
    stripSeat(s, 2);
    resolveDeposals(s);
    const result = checkEndConditions(s);
    expect(result).not.toBeNull();
    expect(s.gameEndReason).toBe('attrition');
    expect(s.players.every(p => p.isEliminated)).toBe(true);
    expect(s.winner).toBe(0); // the traitor who died FIRST still collects the dark win
  });

  it('an EXPOSED dead traitor forfeits the later doom (winner is nobody, the dark proper)', () => {
    const s = bloodPactGame(3, 13, 0);
    s.act = 'MARCH';
    s.bloodPactExposed = true; // correctly accused before dying

    stripSeat(s, 0);
    resolveDeposals(s);
    s.board.state.nodes[s.board.definition.keystoneId].ashed = true;
    checkEndConditions(s);
    expect(s.gameEndReason).toBe('doom_complete');
    expect(s.winner).toBeNull(); // exposure forfeits the doom win even posthumously (§10)
  });
});

// ─── 2. The wraith afterlife is especially charged for the dead traitor (§10) ──

describe('Stage 3h — the dead traitor\'s wraith is especially charged toward doom (§10), within cap', () => {
  it('the traitor wraith takes PRECEDENCE within WRAITH_INPUT_CAP (jumps the queue)', () => {
    const s = bloodPactGame(3, 21, 2); // traitor is the HIGH seat 2
    s.players.forEach(p => { p.isEliminated = true; });
    s.shadowking.strikePool = []; // no ammo ⇒ every wraith nudges
    s.shadowking.wraiths = [
      { seat: 0, eliminatedRound: 1 },
      { seat: 1, eliminatedRound: 1 },
      { seat: 2, eliminatedRound: 1 },
    ];

    withTunables({ WRAITH_INPUT_CAP: 1 }, () => {
      const plan = planWraithInputs(s);
      expect(plan.length).toBe(1);          // still ONE input — no extra slot bought (within cap)
      expect(plan[0].seat).toBe(2);         // …but it is the TRAITOR's, not low-seat 0
      expect(plan[0].isTraitor).toBe(true);
    });
  });

  it('with the cap > 1 the traitor leads, then the rest follow ascending-seat (§12 #24)', () => {
    const s = bloodPactGame(4, 22, 3); // traitor = high seat 3
    s.players.forEach(p => { p.isEliminated = true; });
    s.shadowking.strikePool = [];
    s.shadowking.wraiths = [
      { seat: 0, eliminatedRound: 1 },
      { seat: 1, eliminatedRound: 1 },
      { seat: 2, eliminatedRound: 1 },
      { seat: 3, eliminatedRound: 1 },
    ];

    withTunables({ WRAITH_INPUT_CAP: 2 }, () => {
      const plan = planWraithInputs(s);
      expect(plan.length).toBe(2);                 // cap honoured TOTAL
      expect(plan.map(d => d.seat)).toEqual([3, 0]); // traitor first, then ascending
      expect(plan.map(d => d.isTraitor)).toEqual([true, false]);
    });
  });

  it('the traitor wraith nudges the leader HARDER (WRAITH_TRAITOR_NUDGE > the loyal nudge)', () => {
    expect(WRAITH_TRAITOR_NUDGE).toBeGreaterThan(WRAITH_GRUDGE_NUDGE);

    const s = bloodPactGame(4, 23, 0); // traitor = seat 0
    s.players[0].isEliminated = true;
    s.shadowking.grudge = [0, 0, 0, 0];
    s.shadowking.strikePool = [];      // no ammo ⇒ the wraith nudges
    s.shadowking.wraiths = [{ seat: 0, eliminatedRound: 1 }];
    makeLeader(s, 2);
    expect(boardLeaderSeat(s)).toBe(2);

    const plan = planWraithInputs(s);
    expect(plan[0].isTraitor).toBe(true);
    applyWraithNudges(s, plan);

    // The LEADER (the dark's existing precedence, P0-8) is intensified — by the TRAITOR magnitude.
    expect(s.shadowking.grudge[2]).toBe(WRAITH_TRAITOR_NUDGE);
  });
});

// ─── 3. Competitive mode is byte-identical (flag OFF) ─────────────

describe('Stage 3h — competitive mode is BYTE-IDENTICAL (no traitor, ascending-seat, loyal nudge)', () => {
  it('the wraith plan stays pure ascending-seat with isTraitor all false', () => {
    const s = createGame(4, 'competitive', 31);
    s.shadowking.strikePool = [];
    s.shadowking.wraiths = [
      { seat: 2, eliminatedRound: 1 },
      { seat: 0, eliminatedRound: 1 },
      { seat: 1, eliminatedRound: 1 },
    ];

    withTunables({ WRAITH_INPUT_CAP: 2 }, () => {
      const plan = planWraithInputs(s);
      expect(plan.map(d => d.seat)).toEqual([0, 1]);          // ascending — no traitor reorder
      expect(plan.every(d => d.isTraitor === false)).toBe(true);
    });
  });

  it('the loyal nudge magnitude is unchanged (WRAITH_GRUDGE_NUDGE, never the traitor value)', () => {
    const s = createGame(4, 'competitive', 32);
    s.shadowking.grudge = [0, 0, 0, 0];
    s.shadowking.strikePool = [];
    s.shadowking.wraiths = [{ seat: 0, eliminatedRound: 1 }];
    makeLeader(s, 3);
    expect(boardLeaderSeat(s)).toBe(3);

    const plan = planWraithInputs(s);
    expect(plan[0].isTraitor).toBe(false);
    applyWraithNudges(s, plan);
    expect(s.shadowking.grudge[3]).toBe(WRAITH_GRUDGE_NUDGE); // not WRAITH_TRAITOR_NUDGE
  });

  it('a full competitive headless game is deterministic across two identical runs (no new RNG)', () => {
    const run = () => playHeadlessGame({ seed: 99, playerCount: 4, mode: 'competitive' }).finalState;
    const a = run();
    const b = run();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // And the competitive game never enters the traitor branch.
    expect(a.bloodPactHolder).toBeNull();
  });
});
