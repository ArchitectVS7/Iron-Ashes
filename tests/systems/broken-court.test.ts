/**
 * Tests for the Broken Court State System (F-007)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createGameState } from '../../src/engine/game-loop.js';
import { GameState } from '../../src/models/game-state.js';
import {
  checkBrokenStatus,
  enterBrokenCourt,
  isAllBroken,
  canPerformAction,
  canRescue,
  performRescue,
  hasBeenRescuedThisRound,
} from '../../src/systems/broken-court.js';
import { canVote } from '../../src/systems/voting.js';

// ─── Test Helpers ─────────────────────────────────────────────────

/** Create a base GameState with the given player count and a fixed seed. */
function makeState(playerCount: number = 2, seed: number = 42): GameState {
  return createGameState(playerCount, 'competitive', seed);
}

/** Give a player a set number of fate cards with a fixed value. */
function giveFateCards(
  state: GameState,
  playerIndex: number,
  count: number,
  value: number = 1,
): void {
  state.players[playerIndex].fateCards = Array(count).fill(value);
}

// ─── checkBrokenStatus ────────────────────────────────────────────

describe('checkBrokenStatus()', () => {
  it('returns false when penaltyCards = 0 and warBanners = 0', () => {
    const state = makeState(2);
    const player = state.players[0];
    player.penaltyCards = 0;
    player.warBanners = 0;
    expect(checkBrokenStatus(player)).toBe(false);
  });

  it('returns false when penaltyCards = 0 and warBanners > 0', () => {
    const state = makeState(2);
    const player = state.players[0];
    player.penaltyCards = 0;
    player.warBanners = 3;
    expect(checkBrokenStatus(player)).toBe(false);
  });

  it('returns true when penaltyCards >= warBanners and penaltyCards > 0', () => {
    const state = makeState(2);
    const player = state.players[0];
    player.penaltyCards = 3;
    player.warBanners = 3;
    expect(checkBrokenStatus(player)).toBe(true);
  });

  it('returns true when penaltyCards > warBanners', () => {
    const state = makeState(2);
    const player = state.players[0];
    player.penaltyCards = 5;
    player.warBanners = 2;
    expect(checkBrokenStatus(player)).toBe(true);
  });

  it('returns false when penaltyCards < warBanners', () => {
    const state = makeState(2);
    const player = state.players[0];
    player.penaltyCards = 2;
    player.warBanners = 5;
    expect(checkBrokenStatus(player)).toBe(false);
  });

  it('returns true when penaltyCards = 1 and warBanners = 0', () => {
    const state = makeState(2);
    const player = state.players[0];
    player.penaltyCards = 1;
    player.warBanners = 0;
    expect(checkBrokenStatus(player)).toBe(true);
  });
});

// ─── enterBrokenCourt ─────────────────────────────────────────────

describe('enterBrokenCourt()', () => {
  it('sets isBroken = true on the player', () => {
    const state = makeState(2);
    state.players[0].isBroken = false;
    enterBrokenCourt(state, 0);
    expect(state.players[0].isBroken).toBe(true);
  });

  it('caps actionsRemaining at ACTIONS_PER_TURN_BROKEN (1)', () => {
    const state = makeState(2);
    state.players[0].actionsRemaining = 2;
    enterBrokenCourt(state, 0);
    expect(state.players[0].actionsRemaining).toBe(1);
  });

  it('does not raise actionsRemaining if already 0', () => {
    const state = makeState(2);
    state.players[0].actionsRemaining = 0;
    enterBrokenCourt(state, 0);
    expect(state.players[0].actionsRemaining).toBe(0);
  });

  it('increments stats.timesBroken', () => {
    const state = makeState(2);
    expect(state.players[0].stats.timesBroken).toBe(0);
    enterBrokenCourt(state, 0);
    expect(state.players[0].stats.timesBroken).toBe(1);
  });

  it('accumulates timesBroken across multiple calls', () => {
    const state = makeState(2);
    enterBrokenCourt(state, 0);
    state.players[0].isBroken = false; // simulate recovery
    enterBrokenCourt(state, 0);
    expect(state.players[0].stats.timesBroken).toBe(2);
  });

  it('advances the doom toll by 1', () => {
    const state = makeState(2);
    const before = state.doomToll;
    enterBrokenCourt(state, 0);
    expect(state.doomToll).toBe(before + 1);
  });

  it('appends an entry to actionLog', () => {
    const state = makeState(2);
    const before = state.actionLog.length;
    enterBrokenCourt(state, 0);
    expect(state.actionLog.length).toBe(before + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('enter-broken-court');
  });

  it('does nothing if playerIndex is out of bounds', () => {
    const state = makeState(2);
    const doomBefore = state.doomToll;
    // Should not throw or mutate
    expect(() => enterBrokenCourt(state, 99)).not.toThrow();
    expect(state.doomToll).toBe(doomBefore);
  });
});

// ─── isAllBroken ──────────────────────────────────────────────────

describe('isAllBroken()', () => {
  it('returns false when no players are broken', () => {
    const state = makeState(2);
    expect(isAllBroken(state)).toBe(false);
  });

  it('returns false when only some players are broken', () => {
    const state = makeState(2);
    state.players[0].isBroken = true;
    state.players[1].isBroken = false;
    expect(isAllBroken(state)).toBe(false);
  });

  it('returns true when all players are broken (2-player)', () => {
    const state = makeState(2);
    state.players[0].isBroken = true;
    state.players[1].isBroken = true;
    expect(isAllBroken(state)).toBe(true);
  });

  it('returns true when all players are broken (3-player)', () => {
    const state = makeState(3);
    state.players.forEach(p => { p.isBroken = true; });
    expect(isAllBroken(state)).toBe(true);
  });

  it('returns true when all players are broken (4-player)', () => {
    const state = makeState(4);
    state.players.forEach(p => { p.isBroken = true; });
    expect(isAllBroken(state)).toBe(true);
  });

  it('returns false when one of four players is not broken', () => {
    const state = makeState(4);
    state.players[0].isBroken = true;
    state.players[1].isBroken = true;
    state.players[2].isBroken = true;
    state.players[3].isBroken = false;
    expect(isAllBroken(state)).toBe(false);
  });
});

// ─── canPerformAction ─────────────────────────────────────────────

describe('canPerformAction() — non-broken player', () => {
  let state: GameState;

  beforeEach(() => {
    state = makeState(2);
    state.players[0].isBroken = false;
  });

  it('allows move', () => {
    expect(canPerformAction(state.players[0], 'move')).toBe(true);
  });

  it('allows claim', () => {
    expect(canPerformAction(state.players[0], 'claim')).toBe(true);
  });

  it('allows recruit', () => {
    expect(canPerformAction(state.players[0], 'recruit')).toBe(true);
  });

  it('allows combat', () => {
    expect(canPerformAction(state.players[0], 'combat')).toBe(true);
  });

  it('allows rescue', () => {
    expect(canPerformAction(state.players[0], 'rescue')).toBe(true);
  });
});

describe('canPerformAction() — broken player', () => {
  let state: GameState;

  beforeEach(() => {
    state = makeState(2);
    state.players[0].isBroken = true;
  });

  it('allows move (broken players may still move)', () => {
    expect(canPerformAction(state.players[0], 'move')).toBe(true);
  });

  it('disallows claim', () => {
    expect(canPerformAction(state.players[0], 'claim')).toBe(false);
  });

  it('disallows recruit', () => {
    expect(canPerformAction(state.players[0], 'recruit')).toBe(false);
  });

  it('disallows combat (broken cannot initiate)', () => {
    expect(canPerformAction(state.players[0], 'combat')).toBe(false);
  });

  it('disallows rescue (broken cannot rescue others)', () => {
    expect(canPerformAction(state.players[0], 'rescue')).toBe(false);
  });
});

// ─── canRescue ────────────────────────────────────────────────────

describe('canRescue()', () => {
  let state: GameState;

  beforeEach(() => {
    state = makeState(2);
    // player 0: healthy rescuer
    state.players[0].isBroken = false;
    state.players[0].actionsRemaining = 2;
    giveFateCards(state, 0, 5);
    // player 1: broken target
    state.players[1].isBroken = true;
  });

  it('returns true for a valid rescue scenario', () => {
    expect(canRescue(state.players[0], state.players[1], state)).toBe(true);
  });

  it('returns false when rescuer and target are the same player', () => {
    // Make player 1 the rescuer and target simultaneously
    state.players[1].isBroken = false; // give rescuer non-broken status
    state.players[1].actionsRemaining = 2;
    expect(canRescue(state.players[1], state.players[1], state)).toBe(false);
  });

  it('returns false when rescuer is broken', () => {
    state.players[0].isBroken = true;
    expect(canRescue(state.players[0], state.players[1], state)).toBe(false);
  });

  it('returns false when rescuer has 0 actions remaining', () => {
    state.players[0].actionsRemaining = 0;
    expect(canRescue(state.players[0], state.players[1], state)).toBe(false);
  });

  it('returns false when target is NOT broken', () => {
    state.players[1].isBroken = false;
    expect(canRescue(state.players[0], state.players[1], state)).toBe(false);
  });

  it('returns false when target was already rescued this round', () => {
    // Inject a rescue log entry for target (player 1) in the current round
    state.actionLog.push({
      round: state.round,
      phase: state.phase,
      playerIndex: 1, // target index
      action: 'rescue',
      details: 'already rescued this round',
    });
    expect(canRescue(state.players[0], state.players[1], state)).toBe(false);
  });
});

// ─── performRescue ────────────────────────────────────────────────

describe('performRescue()', () => {
  let state: GameState;

  beforeEach(() => {
    state = makeState(2);
    // Set up a valid rescue scenario
    state.players[0].isBroken = false;
    state.players[0].actionsRemaining = 2;
    giveFateCards(state, 0, 5);
    state.players[1].isBroken = true;
    state.players[1].penaltyCards = 4;
    state.players[1].warBanners = 1;
  });

  it('returns true on a valid rescue', () => {
    expect(performRescue(state, 0, 1, 3)).toBe(true);
  });

  it('transfers fate cards from rescuer', () => {
    const before = state.players[0].fateCards.length;
    performRescue(state, 0, 1, 3);
    expect(state.players[0].fateCards.length).toBe(before - 3);
  });

  it('sets target warBanners to donation amount', () => {
    performRescue(state, 0, 1, 3);
    expect(state.players[1].warBanners).toBe(3);
  });

  it('clears target penaltyCards to 0', () => {
    performRescue(state, 0, 1, 3);
    expect(state.players[1].penaltyCards).toBe(0);
  });

  it('sets target isBroken = false', () => {
    performRescue(state, 0, 1, 3);
    expect(state.players[1].isBroken).toBe(false);
  });

  it('decrements rescuer actionsRemaining by 1', () => {
    const before = state.players[0].actionsRemaining;
    performRescue(state, 0, 1, 3);
    expect(state.players[0].actionsRemaining).toBe(before - 1);
  });

  it('increments rescuer stats.rescuesGiven', () => {
    const before = state.players[0].stats.rescuesGiven;
    performRescue(state, 0, 1, 3);
    expect(state.players[0].stats.rescuesGiven).toBe(before + 1);
  });

  it('increments target stats.rescuesReceived', () => {
    const before = state.players[1].stats.rescuesReceived;
    performRescue(state, 0, 1, 3);
    expect(state.players[1].stats.rescuesReceived).toBe(before + 1);
  });

  it('logs the rescue action to actionLog', () => {
    const before = state.actionLog.length;
    performRescue(state, 0, 1, 3);
    expect(state.actionLog.length).toBe(before + 1);
    const entry = state.actionLog[state.actionLog.length - 1];
    expect(entry.action).toBe('rescue');
    expect(entry.playerIndex).toBe(1); // target index logged for tracking
  });

  it('returns false when donation is below minimum (< 2)', () => {
    expect(performRescue(state, 0, 1, 1)).toBe(false);
  });

  it('returns false when donation is above maximum (> 5)', () => {
    expect(performRescue(state, 0, 1, 6)).toBe(false);
  });

  it('allows the minimum donation of exactly 2', () => {
    expect(performRescue(state, 0, 1, 2)).toBe(true);
  });

  it('allows the maximum donation of exactly 5', () => {
    giveFateCards(state, 0, 5); // ensure enough cards
    expect(performRescue(state, 0, 1, 5)).toBe(true);
  });

  it('returns false when rescuer has fewer cards than the donation', () => {
    giveFateCards(state, 0, 1); // only 1 card
    expect(performRescue(state, 0, 1, 3)).toBe(false);
  });

  it('returns false when target is not broken (canRescue fails)', () => {
    state.players[1].isBroken = false;
    expect(performRescue(state, 0, 1, 3)).toBe(false);
  });

  it('returns false when rescuer is broken (canRescue fails)', () => {
    state.players[0].isBroken = true;
    expect(performRescue(state, 0, 1, 3)).toBe(false);
  });

  it('returns false for invalid player indices', () => {
    expect(performRescue(state, 0, 99, 3)).toBe(false);
    expect(performRescue(state, 99, 1, 3)).toBe(false);
  });
});

// ─── hasBeenRescuedThisRound ─────────────────────────────────────

describe('hasBeenRescuedThisRound()', () => {
  it('returns false when no rescue has occurred this round', () => {
    const state = makeState(2);
    expect(hasBeenRescuedThisRound(state, 1)).toBe(false);
  });

  it('returns true after a rescue has been logged for that player this round', () => {
    const state = makeState(2);
    state.actionLog.push({
      round: state.round,
      phase: state.phase,
      playerIndex: 1,
      action: 'rescue',
      details: 'rescued',
    });
    expect(hasBeenRescuedThisRound(state, 1)).toBe(true);
  });

  it('returns false for a different player in the same round', () => {
    const state = makeState(2);
    state.actionLog.push({
      round: state.round,
      phase: state.phase,
      playerIndex: 1,
      action: 'rescue',
      details: 'rescued',
    });
    expect(hasBeenRescuedThisRound(state, 0)).toBe(false);
  });

  it('returns false for a rescue logged in a previous round', () => {
    const state = makeState(2);
    state.actionLog.push({
      round: state.round - 1, // previous round
      phase: state.phase,
      playerIndex: 1,
      action: 'rescue',
      details: 'old rescue',
    });
    expect(hasBeenRescuedThisRound(state, 1)).toBe(false);
  });
});

// ─── Second rescue in same round fails ────────────────────────────

describe('Second rescue attempt in the same round is rejected', () => {
  it('returns false on the second performRescue attempt for the same target', () => {
    const state = makeState(3);
    // Player 0 and player 2 are healthy rescuers
    state.players[0].isBroken = false;
    state.players[0].actionsRemaining = 2;
    giveFateCards(state, 0, 5);

    state.players[2].isBroken = false;
    state.players[2].actionsRemaining = 2;
    giveFateCards(state, 2, 5);

    // Player 1 is broken
    state.players[1].isBroken = true;
    state.players[1].penaltyCards = 3;
    state.players[1].warBanners = 1;

    // First rescue succeeds
    const first = performRescue(state, 0, 1, 2);
    expect(first).toBe(true);
    expect(state.players[1].isBroken).toBe(false);

    // Break player 1 again to make them a valid target again for canRescue
    // (simulating state — but hasBeenRescuedThisRound should block a second rescue)
    state.players[1].isBroken = true;
    state.players[1].penaltyCards = 3;

    // Second rescue in the same round must fail
    const second = performRescue(state, 2, 1, 2);
    expect(second).toBe(false);
  });
});

// ─── CRITICAL: Broken Court NEVER prevents Voting Phase participation ──

describe('CRITICAL: Broken Court state NEVER prevents Voting Phase participation', () => {
  it('broken player retains full voting rights (canVote)', () => {
    const state = makeState(3);
    state.players[0].isBroken = true;
    giveFateCards(state, 0, 3);

    const result = canVote(state.players[0], state);

    // isBroken has ZERO effect on vote eligibility
    expect(result.canCounter).toBe(true);
    expect(result.mustAutoAbstain).toBe(false);
  });

  it('broken player with 0 fate cards auto-abstains (cards, not broken status, decides)', () => {
    const state = makeState(2);
    state.players[0].isBroken = true;
    state.players[0].fateCards = [];

    const result = canVote(state.players[0], state);

    // Cannot counter because no cards — not because of broken status
    expect(result.canCounter).toBe(false);
    expect(result.mustAutoAbstain).toBe(true);
  });

  it('a player broken via enterBrokenCourt still has full voting rights', () => {
    const state = makeState(2);
    giveFateCards(state, 0, 3);

    // Enter broken court
    enterBrokenCourt(state, 0);
    expect(state.players[0].isBroken).toBe(true);

    // Must still be able to vote
    const result = canVote(state.players[0], state);
    expect(result.canCounter).toBe(true);
    expect(result.mustAutoAbstain).toBe(false);
  });
});

// ─── Draw condition ───────────────────────────────────────────────

describe('Draw condition: isAllBroken', () => {
  it('is the draw condition when every player is simultaneously broken', () => {
    const state = makeState(3);

    // None broken at start
    expect(isAllBroken(state)).toBe(false);

    // Break all players via enterBrokenCourt
    enterBrokenCourt(state, 0);
    enterBrokenCourt(state, 1);
    expect(isAllBroken(state)).toBe(false); // still one healthy

    enterBrokenCourt(state, 2);
    expect(isAllBroken(state)).toBe(true); // draw condition triggered
  });
});
