/**
 * Stage 3g — Kill the Dark (§5.6, §13 P0-6/P0-7, §12 #17/#18/#21).
 *
 * The heart spawns at the Reckoning crossing with a public HP track; ASSAULT_HEART accrues
 * visible hits; the dark retaliates the raid-leader (largest cumulative committer; ties → lowest
 * seat) by name. On HP→0 the dark falls: the loss clock is removed, forces banished, the raid
 * force displaced off the Keystone, the raid-leader's home node un-producing, the hero shielded
 * from deposal that Dawn, and a single named Dawn (overriding ROUND_CAP) resolves the scramble.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import {
  computePostDarkWinner,
  computeRaidLeader,
  executeAssaultHeart,
  resolveHeartCollapse,
  spawnHeartAtReckoning,
} from '../../src/v3/heart.js';
import {
  applyReckoningAutoPressure,
} from '../../src/v3/elimination.js';
import {
  resolveDeposals,
  runDawnPhase,
} from '../../src/v3/sequencer.js';
import { computeTerritoryWinner } from '../../src/v3/gambit.js';
import { WARLORD_POWER, getTunables, withTunables, ROUND_CAP } from '../../src/v3/tunables.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import type { GameState, HeartState } from '../../src/v3/types.js';

// ─── Fixtures ─────────────────────────────────────────────────────

/** A game forced into Reckoning with the heart risen at the crossing. */
function reckoningWithHeart(playerCount = 3, seed = 7): GameState {
  const s = createGame(playerCount, 'competitive', seed);
  s.act = 'RECKONING';
  spawnHeartAtReckoning(s);
  return s;
}

/** Place a player's Warlord on a node (mirrors the on-board piece). */
function placeWarlord(state: GameState, seat: number, nodeId: string): void {
  for (const ns of Object.values(state.board.state.nodes)) {
    ns.pieces = ns.pieces.filter(p => !(p.owner === seat && p.type === 'warlord'));
  }
  state.players[seat].warlordNodeId = nodeId;
  state.board.state.nodes[nodeId].pieces.push({
    id: `warlord-${seat}`, type: 'warlord', owner: seat, power: WARLORD_POWER, nodeId,
  });
  const cp = state.players[seat].court.find(c => c.archetype === 'warlord');
  if (cp) cp.node = nodeId;
}

/** Clear a seat of all owned nodes (→ zero living strongholds). */
function stripSeat(state: GameState, seat: number): void {
  for (const ns of Object.values(state.board.state.nodes)) {
    if (ns.owner === seat) ns.owner = null;
  }
}

/** Sum of all dark forces' presence on the board (global + per-node). */
function totalDarkForces(state: GameState): number {
  let n = state.shadowking.forces.length;
  for (const ns of Object.values(state.board.state.nodes)) n += ns.shadowkingForces.length;
  return n;
}

// ─── Heart spawn (§5.6) ───────────────────────────────────────────

describe('Stage 3g — the heart spawns at the Reckoning crossing (§5.6)', () => {
  it('rises at the Keystone with HEART_HP, only in Reckoning, idempotently', () => {
    const s = createGame(3, 'competitive', 1);
    expect(spawnHeartAtReckoning(s)).toEqual([]);   // Whisper: no heart
    expect(s.shadowking.heart).toBeNull();

    s.act = 'RECKONING';
    const ev = spawnHeartAtReckoning(s);
    expect(ev.length).toBeGreaterThan(0);
    expect(s.shadowking.heart).not.toBeNull();
    expect(s.shadowking.heart?.nodeId).toBe(s.board.definition.keystoneId);
    expect(s.shadowking.heart?.hp).toBe(getTunables().HEART_HP);
    expect(s.shadowking.heart?.exposed).toBe(true);

    // Idempotent — a second call does not respawn / reset HP.
    s.shadowking.heart!.hp = 3;
    expect(spawnHeartAtReckoning(s)).toEqual([]);
    expect(s.shadowking.heart?.hp).toBe(3);
  });

  it('spawns through the Dawn pipeline once Reckoning is reached', () => {
    const s = reckoningCleanDawn();
    expect(s.shadowking.heart).toBeNull();
    s.act = 'RECKONING';
    runDawnPhase(s, new SeededRandom(s.seed));
    expect(s.shadowking.heart).not.toBeNull();
  });
});

/** A 4p game safe to run a Dawn on (≥2 strongholds each so no premature deposal). */
function reckoningCleanDawn(): GameState {
  return createGame(4, 'competitive', 3);
}

// ─── ASSAULT_HEART: accrual + liveness (§5.6, §13 P0-6) ───────────

describe('Stage 3g — ASSAULT_HEART accrues hits and liveness suppresses auto-pressure', () => {
  it('lands a visible hit (cards + on-board force) and accrues the cumulative commit', () => {
    const s = reckoningWithHeart();
    const key = s.board.definition.keystoneId;
    placeWarlord(s, 0, key);
    s.players[0].hand = [4, 3, 9];
    const hp0 = s.shadowking.heart!.hp;

    const res = executeAssaultHeart(s, 0, [4, 3]);
    expect(res.actionConsumed).toBe(true);
    const hit = 4 + 3 + WARLORD_POWER;
    expect(s.shadowking.heart!.hp).toBe(hp0 - hit);
    expect(s.shadowking.heart!.committedBySeat[0]).toBe(hit);
    expect(s.players[0].hand).toEqual([9]);          // committed cards discarded
  });

  it('requires the Warlord at the heart and a minimum commit', () => {
    const s = reckoningWithHeart();
    const key = s.board.definition.keystoneId;
    s.players[0].hand = [5];
    // Warlord not at the Keystone → illegal.
    expect(() => executeAssaultHeart(s, 0, [5])).toThrow(/must stand at the heart/);

    placeWarlord(s, 0, key);
    // Below the minimum commit → illegal.
    expect(() => executeAssaultHeart(s, 0, [])).toThrow(/at least/);
  });

  it('a live assault sets the round flag and suppresses the Reckoning auto-pressure', () => {
    const s = reckoningWithHeart();
    const key = s.board.definition.keystoneId;
    placeWarlord(s, 0, key);
    s.players[0].hand = [6];

    expect(s.shadowking.heartAssaultLiveThisRound).toBe(false);
    executeAssaultHeart(s, 0, [6]);
    expect(s.shadowking.heartAssaultLiveThisRound).toBe(true);

    // Live → no auto-pressure. Flip the flag off → the dark strips again (the executioner).
    // NB: Stage 5b ships RECKONING_AUTOPRESSURE_NODES=0 by default; inject 1 to exercise the strip.
    expect(withTunables({ RECKONING_AUTOPRESSURE_NODES: 1 }, () => applyReckoningAutoPressure(s))).toEqual([]);
    s.shadowking.heartAssaultLiveThisRound = false;
    expect(withTunables({ RECKONING_AUTOPRESSURE_NODES: 1 }, () => applyReckoningAutoPressure(s)).length).toBeGreaterThan(0);
  });
});

// ─── Raid-leader = largest committer (§12 #21) ────────────────────

describe('Stage 3g — the raid-leader is the largest cumulative committer (§12 #21)', () => {
  it('computeRaidLeader picks the largest commit; ties → lowest seat', () => {
    const mk = (committed: number[]): HeartState => ({
      nodeId: 'keystone', hp: 1, exposed: true, committedBySeat: committed, raidLeader: null,
    });
    expect(computeRaidLeader(mk([0, 0, 0]))).toBeNull();
    expect(computeRaidLeader(mk([3, 5, 5]))).toBe(1);     // strict max
    expect(computeRaidLeader(mk([5, 5, 0]))).toBe(0);     // tie → lowest seat
    expect(computeRaidLeader(mk([0, 2, 9]))).toBe(2);
  });

  it('the dark retaliates the cumulative raid-leader BY NAME — even when a lesser seat strikes', () => {
    // A high-HP heart so two assaults can land without breaking it.
    withTunables({ HEART_HP: 100 }, () => {
      const s = reckoningWithHeart();
      const key = s.board.definition.keystoneId;
      placeWarlord(s, 0, key);
      placeWarlord(s, 1, key);
      s.players[0].hand = [9];
      s.players[1].hand = [1];

      executeAssaultHeart(s, 0, [9]);                     // seat 0 commits big → leader
      expect(s.shadowking.heart!.raidLeader).toBe(0);

      const g0 = s.shadowking.grudge[0];
      const res = executeAssaultHeart(s, 1, [1]);         // seat 1 commits small
      expect(s.shadowking.heart!.raidLeader).toBe(0);     // leader unchanged
      // Retaliation still lands on seat 0 (the leader), not the actor.
      expect(s.shadowking.grudge[0]).toBeGreaterThan(g0);
      expect(res.events.some(e => e.type === 'SK_VOICE_LINE' && e.trigger === 'heart_retaliation')).toBe(true);
    });
  });
});

// ─── Heart collapse: displacement + un-producing penalty (§13 P0-7) ──

describe('Stage 3g — heart collapse displaces the raid force + un-producing penalty (§13 P0-7)', () => {
  it('banishes forces, removes the loss clock, displaces off the Keystone, schedules the Dawn', () => {
    const s = reckoningWithHeart();
    const key = s.board.definition.keystoneId;
    const keep0 = s.board.definition.keepIds[0];
    s.board.state.nodes[keep0].owner = 0;
    placeWarlord(s, 0, key);                               // raid force on the crossing
    s.shadowking.heart!.committedBySeat[0] = 20;
    s.shadowking.heart!.raidLeader = 0;
    s.shadowking.heart!.hp = 0;                            // killing blow already landed
    expect(totalDarkForces(s)).toBeGreaterThan(0);

    const ev = resolveHeartCollapse(s);

    expect(s.shadowking.darkDefeated).toBe(true);
    expect(totalDarkForces(s)).toBe(0);                   // all black forces banished
    // Displaced off the Keystone — no player piece remains on the crossing.
    expect(s.board.state.nodes[key].pieces.length).toBe(0);
    expect(s.players[0].warlordNodeId).not.toBe(key);
    // The raid-leader's home node is recorded un-producing.
    expect(s.shadowking.unproducingNodes).toContain(keep0);
    // The single named Dawn is scheduled (overrides ROUND_CAP).
    expect(s.shadowking.postDarkResolutionRound).toBe(s.round + getTunables().POST_DARK_ROUNDS);
    expect(ev.some(e => e.type === 'SK_VOICE_LINE' && e.trigger === 'heart_collapsed')).toBe(true);

    // Idempotent — a second call does nothing.
    expect(resolveHeartCollapse(s)).toEqual([]);
  });

  it('computePostDarkWinner penalizes the raid-leader (not auto-win)', () => {
    const s = reckoningWithHeart(2, 11);
    // Wipe both seats to a clean slate. Seat 0 leads on one Forge; seat 1 holds one Keep.
    stripSeat(s, 0); stripSeat(s, 1);
    const f0 = s.board.definition.forgeIds[0];
    const keep1 = s.board.definition.keepIds[1];
    s.board.state.nodes[f0].owner = 0;                    // FORGE_WEIGHT > 1 → seat 0 leads
    s.board.state.nodes[keep1].owner = 1;

    expect(computeTerritoryWinner(s)).toBe(0);            // leader wins the normal count

    // The collapse marks seat 0 the raid-leader and its Forge home un-producing.
    s.shadowking.heart!.raidLeader = 0;
    s.shadowking.heart!.hp = 0;
    resolveHeartCollapse(s);
    expect(s.shadowking.unproducingNodes).toEqual([f0]);
    // With the spent-force home un-producing, the scramble flips to seat 1 — the hero is
    // penalized in the win currency, not auto-victorious.
    expect(computeTerritoryWinner(s)).toBe(0);
    expect(computePostDarkWinner(s)).toBe(1);
  });
});

// ─── Hero shield on the kill Dawn (§12 #17) ───────────────────────

describe('Stage 3g — the raid-leader is shielded from deposal the Dawn the dark dies (§12 #17)', () => {
  it('shields the raid-leader but not other zero-stronghold seats', () => {
    const s = reckoningWithHeart(3, 5);
    const key = s.board.definition.keystoneId;
    placeWarlord(s, 0, key);
    s.shadowking.heart!.committedBySeat[0] = 15;
    s.shadowking.heart!.raidLeader = 0;
    s.shadowking.heart!.hp = 0;

    // Seat 0 (the hero) AND seat 2 are both stronghold-less this Dawn.
    stripSeat(s, 0);
    stripSeat(s, 2);

    resolveHeartCollapse(s);                              // sets the one-Dawn shield
    expect(s.shadowking.heroShieldSeat).toBe(0);
    expect(s.shadowking.heroShieldRound).toBe(s.round);

    resolveDeposals(s);
    expect(s.players[0].isEliminated).toBe(false);        // shielded
    expect(s.players[2].isEliminated).toBe(true);         // not shielded → deposed
  });
});

// ─── Single-Dawn override of ROUND_CAP (§12 #18) ──────────────────

describe('Stage 3g — the post-dark resolution is a single named Dawn overriding ROUND_CAP (§12 #18)', () => {
  it('resolves the scramble at the named Dawn even before ROUND_CAP', () => {
    const s = createGame(3, 'competitive', 9);
    s.act = 'RECKONING';
    s.shadowking.darkDefeated = true;
    s.shadowking.postDarkResolutionRound = s.round;       // resolve THIS Dawn
    expect(s.round).toBeLessThan(ROUND_CAP);

    const { state } = runDawnPhase(s, new SeededRandom(s.seed));
    expect(state.gameEndReason).toBe('territory_victory');
    expect(state.winner).not.toBeNull();
  });

  it('suppresses the normal ROUND_CAP territory ending until the named Dawn', () => {
    const s = createGame(3, 'competitive', 9);
    s.act = 'RECKONING';
    s.round = ROUND_CAP;                                   // would normally end here
    s.shadowking.darkDefeated = true;
    s.shadowking.postDarkResolutionRound = ROUND_CAP + 1;  // but the named Dawn is later

    const { state } = runDawnPhase(s, new SeededRandom(s.seed));
    expect(state.gameEndReason).toBeNull();                // ROUND_CAP override → still playing
    expect(state.round).toBe(ROUND_CAP + 1);
  });

  it('a sim tunable override flows through (POST_DARK_ROUNDS injectable)', () => {
    withTunables({ POST_DARK_ROUNDS: 3 }, () => {
      const s = reckoningWithHeart(2, 4);
      placeWarlord(s, 0, s.board.definition.keystoneId);
      s.shadowking.heart!.raidLeader = 0;
      s.shadowking.heart!.hp = 0;
      resolveHeartCollapse(s);
      expect(s.shadowking.postDarkResolutionRound).toBe(s.round + 3);
    });
  });
});
