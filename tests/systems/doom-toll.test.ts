/**
 * Tests for the Doom Toll System (F-005)
 */

import { describe, it, expect } from 'vitest';
import { createGameState } from '../../src/engine/game-loop.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import {
  GameState,
  AntagonistForce,
  DOOM_TOLL_FINAL_PHASE_THRESHOLD,
  DOOM_TOLL_MAX,
  MINION_MAX_COUNT,
  MINION_POWER,
  VOTE_COST_STANDARD,
  VOTE_COST_FINAL_PHASE,
} from '../../src/models/game-state.js';
import { getForgeNodes } from '../../src/models/board.js';
import {
  isInFinalPhase,
  getBehaviorCardDrawCount,
  getVoteCost,
  isDoomComplete,
  onNonUnanimousVote,
  onFateDeckReshuffle,
  onBlightWraithClaimsForge,
  onArchRegentEntersBrokenCourt,
  onDeathKnightDefeated,
  onForgeReclaimedFromBlight,
  onUnanimousVoteWithCards,
  performBlightAutoSpread,
  getPlayerStrongholdCount,
  getLeadingPlayer,
  checkBlightForgeCapture,
} from '../../src/systems/doom-toll.js';

// ─── Test Helpers ─────────────────────────────────────────────────

/** Create a base GameState with 2 players and a fixed seed. */
function makeState(seed: number = 42): GameState {
  return createGameState(2, 'competitive', seed);
}

/** Directly set doomToll (and sync isFinalPhase) via type assertion. */
function setDoomToll(state: GameState, value: number): void {
  state.doomToll = value;
  (state as GameState & { isFinalPhase: boolean }).isFinalPhase =
    value >= DOOM_TOLL_FINAL_PHASE_THRESHOLD;
}

/** Create a minion force at the given node. */
function makeMinion(id: string, nodeId: string): AntagonistForce {
  return { id, type: 'minion', powerLevel: MINION_POWER, currentNode: nodeId };
}

// ─── isInFinalPhase ───────────────────────────────────────────────

describe('isInFinalPhase()', () => {
  it('should return false when doomToll is 0', () => {
    const state = makeState();
    setDoomToll(state, 0);
    expect(isInFinalPhase(state)).toBe(false);
  });

  it('should return false when doomToll is 9 (one below threshold)', () => {
    const state = makeState();
    setDoomToll(state, DOOM_TOLL_FINAL_PHASE_THRESHOLD - 1);
    expect(isInFinalPhase(state)).toBe(false);
  });

  it('should return true when doomToll is exactly at threshold (10)', () => {
    const state = makeState();
    setDoomToll(state, DOOM_TOLL_FINAL_PHASE_THRESHOLD);
    expect(isInFinalPhase(state)).toBe(true);
  });

  it('should return true when doomToll is 11', () => {
    const state = makeState();
    setDoomToll(state, 11);
    expect(isInFinalPhase(state)).toBe(true);
  });

  it('should return true when doomToll is 13 (max)', () => {
    const state = makeState();
    setDoomToll(state, DOOM_TOLL_MAX);
    expect(isInFinalPhase(state)).toBe(true);
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])('should return false at toll %i', toll => {
    const state = makeState();
    setDoomToll(state, toll);
    expect(isInFinalPhase(state)).toBe(false);
  });

  it.each([10, 11, 12, 13])('should return true at toll %i', toll => {
    const state = makeState();
    setDoomToll(state, toll);
    expect(isInFinalPhase(state)).toBe(true);
  });
});

// ─── getBehaviorCardDrawCount ─────────────────────────────────────

describe('getBehaviorCardDrawCount()', () => {
  it('should return 1 when not in final phase (toll 0)', () => {
    const state = makeState();
    setDoomToll(state, 0);
    expect(getBehaviorCardDrawCount(state)).toBe(1);
  });

  it('should return 1 when toll is 9', () => {
    const state = makeState();
    setDoomToll(state, 9);
    expect(getBehaviorCardDrawCount(state)).toBe(1);
  });

  it('should return 2 when toll is 10 (final phase)', () => {
    const state = makeState();
    setDoomToll(state, 10);
    expect(getBehaviorCardDrawCount(state)).toBe(2);
  });

  it('should return 2 when toll is 13', () => {
    const state = makeState();
    setDoomToll(state, 13);
    expect(getBehaviorCardDrawCount(state)).toBe(2);
  });
});

// ─── getVoteCost ──────────────────────────────────────────────────

describe('getVoteCost()', () => {
  it('should return VOTE_COST_STANDARD (1) when not in final phase', () => {
    const state = makeState();
    setDoomToll(state, 0);
    expect(getVoteCost(state)).toBe(VOTE_COST_STANDARD);
  });

  it('should return VOTE_COST_STANDARD at toll 9', () => {
    const state = makeState();
    setDoomToll(state, 9);
    expect(getVoteCost(state)).toBe(VOTE_COST_STANDARD);
  });

  it('should return VOTE_COST_FINAL_PHASE (2) at toll 10', () => {
    const state = makeState();
    setDoomToll(state, 10);
    expect(getVoteCost(state)).toBe(VOTE_COST_FINAL_PHASE);
  });

  it('should return VOTE_COST_FINAL_PHASE at toll 13', () => {
    const state = makeState();
    setDoomToll(state, 13);
    expect(getVoteCost(state)).toBe(VOTE_COST_FINAL_PHASE);
  });
});

// ─── isDoomComplete ───────────────────────────────────────────────

describe('isDoomComplete()', () => {
  it('should return false when doomToll is 0', () => {
    const state = makeState();
    setDoomToll(state, 0);
    expect(isDoomComplete(state)).toBe(false);
  });

  it('should return false when doomToll is 12', () => {
    const state = makeState();
    setDoomToll(state, 12);
    expect(isDoomComplete(state)).toBe(false);
  });

  it('should return true when doomToll is 13 (max)', () => {
    const state = makeState();
    setDoomToll(state, DOOM_TOLL_MAX);
    expect(isDoomComplete(state)).toBe(true);
  });

  it.each([0, 1, 2, 5, 9, 12])('should return false at toll %i', toll => {
    const state = makeState();
    setDoomToll(state, toll);
    expect(isDoomComplete(state)).toBe(false);
  });

  it('should return true only at toll 13', () => {
    const state = makeState();
    setDoomToll(state, 13);
    expect(isDoomComplete(state)).toBe(true);
  });
});

// ─── Advance Trigger Functions ────────────────────────────────────

describe('onNonUnanimousVote()', () => {
  it('should advance doomToll by 1', () => {
    const state = makeState();
    setDoomToll(state, 3);
    onNonUnanimousVote(state);
    expect(state.doomToll).toBe(4);
  });

  it('should append an entry to actionLog', () => {
    const state = makeState();
    const logLengthBefore = state.actionLog.length;
    onNonUnanimousVote(state);
    expect(state.actionLog.length).toBe(logLengthBefore + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('doom-advance');
  });

  it('should cap at DOOM_TOLL_MAX when already near max', () => {
    const state = makeState();
    setDoomToll(state, DOOM_TOLL_MAX);
    onNonUnanimousVote(state);
    expect(state.doomToll).toBe(DOOM_TOLL_MAX);
  });
});

describe('onFateDeckReshuffle()', () => {
  it('should advance doomToll by 1', () => {
    const state = makeState();
    setDoomToll(state, 5);
    onFateDeckReshuffle(state);
    expect(state.doomToll).toBe(6);
  });

  it('should append an entry to actionLog', () => {
    const state = makeState();
    const logLengthBefore = state.actionLog.length;
    onFateDeckReshuffle(state);
    expect(state.actionLog.length).toBe(logLengthBefore + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('doom-advance');
  });
});

describe('onBlightWraithClaimsForge()', () => {
  it('should advance doomToll by 1', () => {
    const state = makeState();
    setDoomToll(state, 2);
    onBlightWraithClaimsForge(state);
    expect(state.doomToll).toBe(3);
  });

  it('should append an entry to actionLog', () => {
    const state = makeState();
    const logLengthBefore = state.actionLog.length;
    onBlightWraithClaimsForge(state);
    expect(state.actionLog.length).toBe(logLengthBefore + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('doom-advance');
  });
});

describe('onArchRegentEntersBrokenCourt()', () => {
  it('should advance doomToll by 1', () => {
    const state = makeState();
    setDoomToll(state, 1);
    onArchRegentEntersBrokenCourt(state);
    expect(state.doomToll).toBe(2);
  });

  it('should append an entry to actionLog', () => {
    const state = makeState();
    const logLengthBefore = state.actionLog.length;
    onArchRegentEntersBrokenCourt(state);
    expect(state.actionLog.length).toBe(logLengthBefore + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('doom-advance');
  });
});

// ─── Recede Trigger Functions ─────────────────────────────────────

describe('onDeathKnightDefeated()', () => {
  it('should recede doomToll by 1', () => {
    const state = makeState();
    setDoomToll(state, 6);
    onDeathKnightDefeated(state);
    expect(state.doomToll).toBe(5);
  });

  it('should floor at 0', () => {
    const state = makeState();
    setDoomToll(state, 0);
    onDeathKnightDefeated(state);
    expect(state.doomToll).toBe(0);
  });

  it('should append a doom-recede entry to actionLog', () => {
    const state = makeState();
    setDoomToll(state, 5);
    const logLengthBefore = state.actionLog.length;
    onDeathKnightDefeated(state);
    expect(state.actionLog.length).toBe(logLengthBefore + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('doom-recede');
  });
});

describe('onForgeReclaimedFromBlight()', () => {
  it('should recede doomToll by 1', () => {
    const state = makeState();
    setDoomToll(state, 8);
    onForgeReclaimedFromBlight(state);
    expect(state.doomToll).toBe(7);
  });

  it('should append a doom-recede entry to actionLog', () => {
    const state = makeState();
    setDoomToll(state, 5);
    const logLengthBefore = state.actionLog.length;
    onForgeReclaimedFromBlight(state);
    expect(state.actionLog.length).toBe(logLengthBefore + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('doom-recede');
  });
});

describe('onUnanimousVoteWithCards()', () => {
  it('should recede doomToll by 1', () => {
    const state = makeState();
    setDoomToll(state, 11);
    onUnanimousVoteWithCards(state);
    expect(state.doomToll).toBe(10);
  });

  it('should append a doom-recede entry to actionLog', () => {
    const state = makeState();
    setDoomToll(state, 5);
    const logLengthBefore = state.actionLog.length;
    onUnanimousVoteWithCards(state);
    expect(state.actionLog.length).toBe(logLengthBefore + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('doom-recede');
  });

  it('should floor at 0 if doomToll is already 0', () => {
    const state = makeState();
    setDoomToll(state, 0);
    onUnanimousVoteWithCards(state);
    expect(state.doomToll).toBe(0);
  });
});

// ─── getPlayerStrongholdCount ─────────────────────────────────────

describe('getPlayerStrongholdCount()', () => {
  it('should count only nodes claimed by the specified player', () => {
    const state = makeState();
    // createGameState with 2 players claims keep-0 (player 0) and keep-1 (player 1).
    // Player 0 starts with keep-0.
    expect(getPlayerStrongholdCount(state, 0)).toBeGreaterThanOrEqual(1);
  });

  it('should return 1 for player 0 at game start (only their starting keep)', () => {
    const state = makeState();
    expect(getPlayerStrongholdCount(state, 0)).toBe(1);
  });

  it('should return 1 for player 1 at game start (only their starting keep)', () => {
    const state = makeState();
    expect(getPlayerStrongholdCount(state, 1)).toBe(1);
  });

  it('should increase when a node is claimed by the player', () => {
    const state = makeState();
    const before = getPlayerStrongholdCount(state, 0);
    // Manually claim an unclaimed node for player 0.
    state.boardState['s01'].claimedBy = 0;
    expect(getPlayerStrongholdCount(state, 0)).toBe(before + 1);
  });

  it('should not count nodes claimed by other players', () => {
    const state = makeState();
    // Player 0 claims s01; count for player 1 should not increase.
    state.boardState['s01'].claimedBy = 0;
    const p1Count = getPlayerStrongholdCount(state, 1);
    expect(p1Count).toBe(1); // still just keep-1
  });

  it('should return 0 for a player index with no claimed nodes', () => {
    const state = makeState();
    // Player index 99 has no claimed nodes.
    expect(getPlayerStrongholdCount(state, 99)).toBe(0);
  });
});

// ─── getLeadingPlayer ────────────────────────────────────────────

describe('getLeadingPlayer()', () => {
  it('should return the player with the most strongholds', () => {
    const state = makeState();
    // Give player 0 two extra claims so they lead.
    state.boardState['s01'].claimedBy = 0;
    state.boardState['s02'].claimedBy = 0;
    expect(getLeadingPlayer(state)).toBe(0);
  });

  it('should return the other player when they have more strongholds', () => {
    const state = makeState();
    state.boardState['s03'].claimedBy = 1;
    state.boardState['s04'].claimedBy = 1;
    expect(getLeadingPlayer(state)).toBe(1);
  });

  it('should break ties by warBanners', () => {
    const state = makeState();
    // Both players have 1 stronghold each at game start.
    state.players[0].warBanners = 3;
    state.players[1].warBanners = 10;
    // Tied on strongholds; player 1 has more banners → leads.
    expect(getLeadingPlayer(state)).toBe(1);
  });

  it('should return player 0 on full tie (same strongholds, same banners)', () => {
    const state = makeState();
    state.players[0].warBanners = 5;
    state.players[1].warBanners = 5;
    // Both have 1 stronghold, 5 banners → player 0 wins by lowest index.
    expect(getLeadingPlayer(state)).toBe(0);
  });

  it('should work with 3+ players', () => {
    const state = createGameState(3, 'competitive', 42);
    // Give player 2 three extra claims.
    state.boardState['s01'].claimedBy = 2;
    state.boardState['s02'].claimedBy = 2;
    state.boardState['s05'].claimedBy = 2;
    expect(getLeadingPlayer(state)).toBe(2);
  });
});

// ─── checkBlightForgeCapture ──────────────────────────────────────

describe('checkBlightForgeCapture()', () => {
  it('should return empty array when no minions are on forge nodes', () => {
    const state = makeState();
    // Only lieutenants are on the antagonist base by default.
    expect(checkBlightForgeCapture(state)).toEqual([]);
  });

  it('should return empty array when a minion is on a non-forge node', () => {
    const state = makeState();
    state.antagonistForces.push(makeMinion('minion-x', 's01'));
    expect(checkBlightForgeCapture(state)).toEqual([]);
  });

  it('should detect a minion on a player-claimed forge node', () => {
    const state = makeState();
    const forgeNodes = getForgeNodes(state.boardDefinition);
    const targetForge = forgeNodes[0]; // e.g. 'forge-ne'

    // Claim the forge for player 0.
    state.boardState[targetForge].claimedBy = 0;
    // Place a minion there.
    state.antagonistForces.push(makeMinion('minion-y', targetForge));

    const captured = checkBlightForgeCapture(state);
    expect(captured).toContain(targetForge);
    expect(captured.length).toBe(1);
  });

  it('should NOT flag a minion on an unclaimed forge node', () => {
    const state = makeState();
    const forgeNodes = getForgeNodes(state.boardDefinition);
    const targetForge = forgeNodes[0];

    // Ensure forge is unclaimed.
    state.boardState[targetForge].claimedBy = null;
    state.antagonistForces.push(makeMinion('minion-z', targetForge));

    const captured = checkBlightForgeCapture(state);
    expect(captured).not.toContain(targetForge);
  });

  it('should detect multiple captured forges in a single call', () => {
    const state = makeState();
    const forgeNodes = getForgeNodes(state.boardDefinition);

    // Claim and occupy two forges.
    state.boardState[forgeNodes[0]].claimedBy = 0;
    state.boardState[forgeNodes[1]].claimedBy = 1;
    state.antagonistForces.push(makeMinion('minion-a', forgeNodes[0]));
    state.antagonistForces.push(makeMinion('minion-b', forgeNodes[1]));

    const captured = checkBlightForgeCapture(state);
    expect(captured.length).toBe(2);
    expect(captured).toContain(forgeNodes[0]);
    expect(captured).toContain(forgeNodes[1]);
  });

  it('should not flag a lieutenant (only minions trigger forge capture)', () => {
    const state = makeState();
    const forgeNodes = getForgeNodes(state.boardDefinition);
    const targetForge = forgeNodes[0];

    state.boardState[targetForge].claimedBy = 0;
    // Place a lieutenant, not a minion.
    state.antagonistForces.push({
      id: 'lieutenant-extra',
      type: 'lieutenant',
      powerLevel: 10,
      currentNode: targetForge,
    });

    const captured = checkBlightForgeCapture(state);
    expect(captured).not.toContain(targetForge);
  });
});

// ─── performBlightAutoSpread ──────────────────────────────────────

describe('performBlightAutoSpread()', () => {
  const rng = new SeededRandom(42);

  it('should return null when there are no minions', () => {
    const state = makeState();
    // Remove all forces so no minions exist.
    state.antagonistForces = [];
    expect(performBlightAutoSpread(state, rng)).toBeNull();
  });

  it('should return null when minion count is already at MINION_MAX_COUNT', () => {
    const state = makeState();
    // Fill up to MINION_MAX_COUNT minions.
    state.antagonistForces = [];
    for (let i = 0; i < MINION_MAX_COUNT; i++) {
      state.antagonistForces.push(makeMinion(`minion-${i + 1}`, 's09'));
    }
    expect(performBlightAutoSpread(state, rng)).toBeNull();
  });

  it('should place a new minion at an adjacent unoccupied standard node', () => {
    const state = makeState();
    state.antagonistForces = [];
    // Place one minion at 's09' which connects to 'forge-ne', 'dark-fortress', 's17'.
    // 's17' is standard and (initially) unoccupied.
    state.antagonistForces.push(makeMinion('minion-1', 's09'));

    const result = performBlightAutoSpread(state, rng);
    expect(result).not.toBeNull();
    // The placed node must be a standard node adjacent to s09.
    // s09 connects to: forge-ne (forge), dark-fortress (antagonist_base), s17 (standard)
    // Only s17 is standard and unoccupied → must be s17.
    expect(result).toBe('s17');
  });

  it('should increase antagonistForces count by 1', () => {
    const state = makeState();
    state.antagonistForces = [makeMinion('minion-1', 's09')];
    const before = state.antagonistForces.length;
    performBlightAutoSpread(state, rng);
    expect(state.antagonistForces.length).toBe(before + 1);
  });

  it('should register the new force in boardState.antagonistForces', () => {
    const state = makeState();
    state.antagonistForces = [makeMinion('minion-1', 's09')];
    const target = performBlightAutoSpread(state, rng);
    expect(target).not.toBeNull();
    if (target !== null) {
      expect(state.boardState[target].antagonistForces.length).toBeGreaterThan(0);
    }
  });

  it('should append a blight-auto-spread log entry', () => {
    const state = makeState();
    state.antagonistForces = [makeMinion('minion-1', 's09')];
    const logBefore = state.actionLog.length;
    performBlightAutoSpread(state, rng);
    expect(state.actionLog.length).toBe(logBefore + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('blight-auto-spread');
  });

  it('should return null when all adjacent standard nodes are occupied by forces', () => {
    const state = makeState();
    // s17 connects to: s09, s10, hall (neutral_center).
    // Place a minion at s17 and fill all its standard neighbors with forces.
    // s09 and s10 are standard. Let's block them.
    state.antagonistForces = [
      makeMinion('minion-1', 's17'),
      makeMinion('minion-2', 's09'),
      makeMinion('minion-3', 's10'),
      // hall is neutral_center so it will be filtered out.
    ];
    // With s09 and s10 occupied and hall not standard, there is no valid spread target.
    const result = performBlightAutoSpread(state, rng);
    expect(result).toBeNull();
  });

  it('should not spread to non-standard nodes (forge, antagonist_base, neutral_center)', () => {
    const state = makeState();
    // s09 connects to: forge-ne (forge), dark-fortress (antagonist_base), s17 (standard).
    // Place minion at s09 and block its only standard neighbor (s17).
    // Also block s17's other standard neighbors (s10) so the s17 minion can't spread either.
    // s17 connects to: s09 (occupied), s10 (standard), hall (neutral_center).
    // s10 connects to: forge-se (forge), dark-fortress (antagonist_base), s17 (occupied).
    state.antagonistForces = [
      makeMinion('minion-1', 's09'),   // only standard neighbor is s17
      makeMinion('minion-2', 's17'),   // blocks s17; its standard neighbors are s09 (blocked) and s10
      makeMinion('minion-3', 's10'),   // blocks s10; its standard neighbors are s17 (blocked)
    ];
    // Now no minion has an unoccupied standard adjacent node.
    const result = performBlightAutoSpread(state, rng);
    expect(result).toBeNull();
  });

  it('should not spread to a node already occupied by a force', () => {
    const state = makeState();
    // s12 connects to: forge-nw (forge), dark-fortress (antagonist_base), s18 (standard).
    // s18 connects to: s11 (standard), s12 (occupied by minion-1), hall (neutral_center).
    // s11 connects to: forge-sw (forge), dark-fortress (antagonist_base), s18 (occupied by minion-2).
    // Block all reachable standard nodes so nothing can spread.
    state.antagonistForces = [
      makeMinion('minion-1', 's12'),  // standard neighbor: s18 → will be blocked
      makeMinion('minion-2', 's18'),  // standard neighbors: s11, s12 (blocked) → s11 will be blocked
      makeMinion('minion-3', 's11'),  // standard neighbors: s18 (blocked) → no valid targets
    ];
    const result = performBlightAutoSpread(state, rng);
    expect(result).toBeNull();
  });

  it('should prefer the minion closest to the leading player keep', () => {
    const state = makeState();

    // Player 0 leads (just needs one keep → keep-0 at distance from any minion).
    // Place two minions at different distances from keep-0.
    // keep-0 connects to s01 and s02.
    // A minion at s01 is distance 1 from keep-0.
    // A minion at s09 is much further.
    // Minion at s01 should spread (it is closest to keep-0).
    state.antagonistForces = [
      makeMinion('minion-far', 's09'),   // far from keep-0
      makeMinion('minion-near', 's01'),  // distance 1 from keep-0
    ];

    const result = performBlightAutoSpread(state, rng);
    // s01 neighbors: keep-0 (standard), forge-nw (forge), s16 (standard).
    // keep-0 is claimed (claimedBy 0) so it IS occupied by a player but NOT by forces.
    // Our occupancy check only filters nodes with antagonist forces, not player fellowships.
    // So keep-0 is a valid standard target from s01.
    expect(result).not.toBeNull();

    // The new minion should have been placed at a neighbor of s01, NOT s09.
    // Confirm it was the near minion that spread by checking which node was chosen.
    const newForce = state.antagonistForces.find(
      f => f.id !== 'minion-far' && f.id !== 'minion-near',
    );
    expect(newForce).toBeDefined();
    // Verify the target is adjacent to s01, not s09.
    const s01Neighbors = state.boardDefinition.nodes['s01'].connections;
    expect(s01Neighbors).toContain(newForce!.currentNode);
  });
});
