/**
 * Archetype tests (Stage 4b).
 *
 * Confirms: (1) the baseline archetype is DEFAULT_AI_POLICY and the dispatcher's
 * default path is byte-identical to passing no policy; (2) each archetype's
 * distinctive decision branch actually fires; (3) the choosers stay deterministic;
 * and (4) — the safety net — mixed-archetype games drive to a terminal state with
 * NO illegal action crashing the reducer, across many seeds / counts / modes.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { chooseAction, choosePledge, DEFAULT_AI_POLICY, type AIPolicy } from '../../src/v3/ai-player.js';
import { ARCHETYPES, ARCHETYPE_IDS, policyOf } from '../../src/v3/sim/archetypes.js';
import { playHeadlessGame, type SeatPolicies } from '../../src/v3/sim/driver.js';
import { WARLORD_POWER } from '../../src/v3/tunables.js';
import { applyCommand } from '../../src/v3/reducer.js';
import { addCourtPiece } from '../../src/v3/court.js';
import type { GameState, HeartState } from '../../src/v3/types.js';
import type { Command } from '../../src/v3/commands.js';
import type { AIPolicy as Policy } from '../../src/v3/ai-player.js';
import { stripStartingRetainers } from './fixtures.js';

function apply(state: GameState, cmd: Command): GameState {
  return applyCommand(state, cmd).state;
}

/** Force the game into the ACTION phase with `seat` active so a chosen action can be applied. */
function enterAction(state: GameState, seat: number): void {
  state.phase = 'ACTION';
  state.activePlayerIndex = seat;
  state.players[seat].actionsRemaining = 2;
}

function placeWarlord(state: GameState, idx: number, nodeId: string): void {
  for (const ns of Object.values(state.board.state.nodes)) {
    ns.pieces = ns.pieces.filter(p => !(p.owner === idx && p.type === 'warlord'));
  }
  state.players[idx].warlordNodeId = nodeId;
  state.board.state.nodes[nodeId].pieces.push({
    id: `warlord-${idx}`, type: 'warlord', owner: idx, power: WARLORD_POWER, nodeId,
  });
}

// ─── Baseline preservation ────────────────────────────────────────

describe('baseline archetype is the untouched default', () => {
  it('baseline policy is DEFAULT_AI_POLICY (same reference → identity guard)', () => {
    expect(ARCHETYPES.baseline.policy).toBe(DEFAULT_AI_POLICY);
  });

  it('dispatching with the baseline policy === passing no policy (byte-identical game)', () => {
    const baselineSeats: SeatPolicies = [policyOf('baseline'), policyOf('baseline'), policyOf('baseline'), policyOf('baseline')];
    const withPolicies = playHeadlessGame({ seed: 13, playerCount: 4, mode: 'competitive', seatPolicies: baselineSeats });
    const without = playHeadlessGame({ seed: 13, playerCount: 4, mode: 'competitive' });
    expect(JSON.stringify(withPolicies.finalState)).toBe(JSON.stringify(without.finalState));
  });
});

// ─── Distinctive branches fire ────────────────────────────────────

describe('archetype decision branches', () => {
  it('aggressor RAIDs a co-located leader it can beat', () => {
    const state = createGame(2, 'competitive', 42);
    const node = state.board.definition.holdingIds[0];
    placeWarlord(state, 0, node);
    placeWarlord(state, 1, node);
    state.crownHolder = 1; // rival is the leader → effective aggression saturates to 1
    const action = chooseAction(state, 0, 7, ARCHETYPES.aggressor.policy);
    expect(action).toEqual({ type: 'RAID', targetPlayerIndex: 1 });
  });

  // 'cooperator RESCUEs an adjacent Broken ally' removed (§8): RESCUE is retired with the
  // Broken Court. The cooperator's coop verb returns as ally-RANSOM when capture lands (3d).

  it('gambler marches toward the Keystone instead of claiming', () => {
    const state = createGame(4, 'competitive', 42);
    placeWarlord(state, 0, 'forge-nw'); // an unclaimed Forge adjacent to approach-nw → keystone
    state.players[0].banners = 5;
    const policy: AIPolicy = { ...ARCHETYPES.gambler.policy, gambitAmbition: 1 };
    const action = chooseAction(state, 0, 7, policy);
    expect(action.type).toBe('MARCH');
    // The step is toward the Keystone (the quadrant's Approach), not a stay-and-claim.
    expect(state.board.definition.nodes['forge-nw'].connections).toContain(action.targetNodeId);
  });

  it('cooperator pledges more than the baseline (generosity)', () => {
    let state = createGame(4, 'competitive', 42);
    state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE, telegraph set
    const struck = state.shadowking.telegraph!.struckPlayerIndex ?? -1;
    const seat = (struck + 1) % 4; // a non-targeted seat (fair-share path)
    state.players[seat].hand = [2, 2, 2, 2, 2, 2];
    const coop = choosePledge(state, seat, 7, ARCHETYPES.cooperator.policy);
    const base = choosePledge(state, seat, 7, DEFAULT_AI_POLICY);
    expect(coop).toBeGreaterThan(base);
  });

  it('a capture-biased raider ELECTS CAPTURE when it stands on a winnable rival retainer (V3-4b)', () => {
    const state = stripStartingRetainers(createGame(2, 'competitive', 42)); // bare-Warlord fixture (T2-1)
    state.act = 'MARCH'; // past WHISPER → no last-retainer protection
    const node = state.board.definition.holdingIds[0];
    placeWarlord(state, 0, node);
    placeWarlord(state, 1, node);
    addCourtPiece(state, 1, 'marshal', node); // rival has a capturable retainer here
    state.players[0].hand = [9, 9, 9];         // strong → predicted margin clears the capture gate
    state.players[1].hand = [];                // weak defender (no commit / Last Stand)
    enterAction(state, 0);
    const policy: Policy = { ...ARCHETYPES.aggressor.policy, captureBias: 1, aggression: 1 };
    const action = chooseAction(state, 0, 7, policy);
    expect(action.type).toBe('RAID');
    expect(action.targetPlayerIndex).toBe(1);
    expect(action.raidEffect).toBe('CAPTURE_PIECE');
    expect(action.pieceId).toBe('marshal-1-0');
    // The reducer accepts it (throw-safe election) and the captive lands in the roster.
    const after = applyCommand(state, { type: 'PLAYER_ACTION', playerIndex: 0, action }).state;
    expect(after.captives.some(c => c.pieceId === 'marshal-1-0' && c.captorSeat === 0)).toBe(true);
  });

  it('a heart-biased archetype ASSAULTs the exposed dark heart in Reckoning (V3-4b)', () => {
    const state = createGame(2, 'competitive', 42);
    state.act = 'RECKONING';
    const ks = state.board.definition.keystoneId;
    const heart: HeartState = { nodeId: ks, hp: 12, exposed: true, committedBySeat: [0, 0], raidLeader: null };
    state.shadowking.heart = heart;
    placeWarlord(state, 0, ks);
    state.players[0].hand = [5, 5];
    enterAction(state, 0);
    const policy: Policy = { ...ARCHETYPES.gambler.policy, heartBias: 1 };
    const action = chooseAction(state, 0, 7, policy);
    expect(action.type).toBe('ASSAULT_HEART');
    const after = applyCommand(state, { type: 'PLAYER_ACTION', playerIndex: 0, action }).state;
    expect(after.shadowking.heart!.hp).toBeLessThan(12); // a real hit landed
  });

  it('a ransom-biased archetype RANSOMs its own captured retainer back when affordable (V3-4b)', () => {
    const state = createGame(2, 'competitive', 42);
    state.act = 'MARCH';
    // Seat 0 owns a marshal currently captive of seat 1.
    addCourtPiece(state, 0, 'marshal', state.board.definition.holdingIds[0]);
    const cp = state.players[0].court.find(c => c.archetype === 'marshal')!;
    cp.captiveOf = 1;
    state.captives.push({ pieceId: cp.id, ownerSeat: 0, captorSeat: 1, capturedRound: state.round, recaptureImmuneUntil: 0 });
    state.players[0].hand = [3, 3];
    state.players[0].banners = 9;
    const policy: Policy = { ...ARCHETYPES.turtle.policy, ransomBias: 1 };
    const action = chooseAction(state, 0, 7, policy);
    expect(action.type).toBe('RANSOM');
    expect(action.pieceId).toBe(cp.id);
  });

  it('choosers stay deterministic for a fixed archetype', () => {
    const state = createGame(4, 'competitive', 42);
    for (const id of ARCHETYPE_IDS) {
      const a = chooseAction(state, state.activePlayerIndex, 7, policyOf(id));
      const b = chooseAction(state, state.activePlayerIndex, 7, policyOf(id));
      expect(a).toEqual(b);
    }
  });
});

// ─── Safety net: mixed-archetype games terminate, no illegal actions ──

describe('archetype games never crash the reducer', () => {
  function seatsFor(ids: string[], count: number): SeatPolicies {
    return Array.from({ length: count }, (_, s) => policyOf(ids[s % ids.length] as never));
  }

  it('every homogeneous archetype table drives to a terminal state (4p, 10 seeds)', { timeout: 30000 }, () => {
    for (const id of ARCHETYPE_IDS) {
      for (let seed = 0; seed < 10; seed++) {
        const r = playHeadlessGame({ seed, playerCount: 4, mode: 'competitive', seatPolicies: seatsFor([id], 4) });
        expect(r.hitGuard).toBe(false);
        expect(r.finalState.gameEndReason).not.toBeNull();
      }
    }
  });

  it('a mixed table terminates across counts and modes', { timeout: 30000 }, () => {
    const mix = ['aggressor', 'turtle', 'opportunist', 'cooperator'];
    for (const mode of ['competitive', 'blood_pact'] as const) {
      for (const count of [2, 3, 4] as const) {
        for (let seed = 0; seed < 8; seed++) {
          const r = playHeadlessGame({ seed, playerCount: count, mode, seatPolicies: seatsFor(mix, count) });
          expect(r.hitGuard).toBe(false);
          expect(r.finalState.gameEndReason).not.toBeNull();
        }
      }
    }
  });

  it('a gambler-heavy table still terminates (Gambit pursuit is legal)', { timeout: 30000 }, () => {
    for (let seed = 0; seed < 10; seed++) {
      const r = playHeadlessGame({ seed, playerCount: 4, mode: 'competitive', seatPolicies: seatsFor(['gambler'], 4) });
      expect(r.hitGuard).toBe(false);
      expect(r.finalState.gameEndReason).not.toBeNull();
    }
  });
});
