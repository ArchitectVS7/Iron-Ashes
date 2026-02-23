/**
 * Tests for the Voting Phase System (F-006)
 */

import { describe, it, expect } from 'vitest';
import { createGameState } from '../../src/engine/game-loop.js';
import {
  GameState,
  DOOM_TOLL_FINAL_PHASE_THRESHOLD,
  VoteChoice,
} from '../../src/models/game-state.js';
import {
  canVote,
  submitVote,
  allVotesSubmitted,
  resolveVotes,
  getBehaviorCardEffect,
  autoAbstainPlayers,
} from '../../src/systems/voting.js';

// ─── Test Helpers ─────────────────────────────────────────────────

/** Create a base GameState with the given player count and a fixed seed. */
function makeState(playerCount: number = 2, seed: number = 42): GameState {
  return createGameState(playerCount, 'competitive', seed);
}

/** Directly set doomToll (and sync isFinalPhase) via type assertion. */
function setDoomToll(state: GameState, value: number): void {
  state.doomToll = value;
  (state as GameState & { isFinalPhase: boolean }).isFinalPhase =
    value >= DOOM_TOLL_FINAL_PHASE_THRESHOLD;
}

/** Give a player a set number of fate cards with a fixed value. */
function giveFateCards(state: GameState, playerIndex: number, count: number, value: number = 1): void {
  state.players[playerIndex].fateCards = Array(count).fill(value);
}

/** Set the current behavior card type on the state. */
function setCurrentCard(state: GameState, type: 'spawn' | 'move' | 'claim' | 'assault' | 'escalate'): void {
  state.currentBehaviorCard = { id: `${type}-test`, type };
}

/** Set all votes on the state to the given choice. */
function _setAllVotes(state: GameState, choice: VoteChoice | null): void {
  for (let i = 0; i < state.votes.length; i++) {
    state.votes[i] = choice;
  }
}

// ─── canVote ──────────────────────────────────────────────────────

describe('canVote()', () => {
  it('Broken Court state NEVER prevents Voting Phase participation', () => {
    const state = makeState(2);
    // Set player 0 to broken and give them enough fate cards
    state.players[0].isBroken = true;
    giveFateCards(state, 0, 2);

    const result = canVote(state.players[0], state);

    // A broken player with fate cards CAN counter — isBroken is irrelevant
    expect(result.canCounter).toBe(true);
    expect(result.mustAutoAbstain).toBe(false);
  });

  it('should return canCounter: true when player has enough fate cards (standard cost)', () => {
    const state = makeState(2);
    setDoomToll(state, 0); // standard phase, cost = 1
    giveFateCards(state, 0, 3);

    const result = canVote(state.players[0], state);
    expect(result.canCounter).toBe(true);
    expect(result.mustAutoAbstain).toBe(false);
  });

  it('should return canCounter: true when player has exactly the vote cost', () => {
    const state = makeState(2);
    setDoomToll(state, 0); // cost = 1
    giveFateCards(state, 0, 1);

    const result = canVote(state.players[0], state);
    expect(result.canCounter).toBe(true);
  });

  it('should return mustAutoAbstain: true when player has 0 fate cards', () => {
    const state = makeState(2);
    setDoomToll(state, 0);
    state.players[0].fateCards = [];

    const result = canVote(state.players[0], state);
    expect(result.canCounter).toBe(false);
    expect(result.mustAutoAbstain).toBe(true);
  });

  it('should require 2 fate cards in Final Phase', () => {
    const state = makeState(2);
    setDoomToll(state, 10); // Final Phase, cost = 2
    giveFateCards(state, 0, 1); // only 1 card — not enough

    const result = canVote(state.players[0], state);
    expect(result.canCounter).toBe(false);
    expect(result.mustAutoAbstain).toBe(true);
  });

  it('should allow counter with exactly 2 cards in Final Phase', () => {
    const state = makeState(2);
    setDoomToll(state, 10); // Final Phase, cost = 2
    giveFateCards(state, 0, 2);

    const result = canVote(state.players[0], state);
    expect(result.canCounter).toBe(true);
    expect(result.mustAutoAbstain).toBe(false);
  });
});

// ─── submitVote ───────────────────────────────────────────────────

describe('submitVote()', () => {
  it('should deduct fate cards when counter vote is cast', () => {
    const state = makeState(2);
    setDoomToll(state, 0); // cost = 1
    giveFateCards(state, 0, 3);

    submitVote(state, 0, 'counter');

    expect(state.players[0].fateCards.length).toBe(2);
    expect(state.votes[0]).toBe('counter');
  });

  it('should deduct 2 fate cards in Final Phase', () => {
    const state = makeState(2);
    setDoomToll(state, 10); // cost = 2
    giveFateCards(state, 0, 4);

    submitVote(state, 0, 'counter');

    expect(state.players[0].fateCards.length).toBe(2);
    expect(state.votes[0]).toBe('counter');
  });

  it('should not deduct fate cards when abstaining', () => {
    const state = makeState(2);
    setDoomToll(state, 0);
    giveFateCards(state, 0, 3);

    submitVote(state, 0, 'abstain');

    expect(state.players[0].fateCards.length).toBe(3);
    expect(state.votes[0]).toBe('abstain');
  });

  it('should force abstain when player cannot afford counter', () => {
    const state = makeState(2);
    setDoomToll(state, 0); // cost = 1
    state.players[0].fateCards = []; // no cards

    submitVote(state, 0, 'counter');

    // vote is forced to abstain
    expect(state.votes[0]).toBe('abstain');
    // no fate cards deducted (there were none)
    expect(state.players[0].fateCards.length).toBe(0);
  });

  it('should increment votesCast stat on counter', () => {
    const state = makeState(2);
    giveFateCards(state, 0, 3);

    const before = state.players[0].stats.votesCast;
    submitVote(state, 0, 'counter');
    expect(state.players[0].stats.votesCast).toBe(before + 1);
  });

  it('should increment votesAbstained stat on abstain', () => {
    const state = makeState(2);
    giveFateCards(state, 0, 3);

    const before = state.players[0].stats.votesAbstained;
    submitVote(state, 0, 'abstain');
    expect(state.players[0].stats.votesAbstained).toBe(before + 1);
  });

  it('should increment votesAbstained stat when forced to abstain', () => {
    const state = makeState(2);
    state.players[0].fateCards = []; // no cards

    const before = state.players[0].stats.votesAbstained;
    submitVote(state, 0, 'counter'); // will be forced to abstain
    expect(state.players[0].stats.votesAbstained).toBe(before + 1);
  });

  it('should return true when vote is accepted', () => {
    const state = makeState(2);
    giveFateCards(state, 0, 2);

    expect(submitVote(state, 0, 'abstain')).toBe(true);
  });

  it('should return false for invalid player index', () => {
    const state = makeState(2);
    expect(submitVote(state, 99, 'counter')).toBe(false);
  });
});

// ─── allVotesSubmitted ────────────────────────────────────────────

describe('allVotesSubmitted()', () => {
  it('should return false when all votes are null', () => {
    const state = makeState(2);
    // Votes start as null after phase advance
    state.votes = [null, null];
    expect(allVotesSubmitted(state)).toBe(false);
  });

  it('should return false when any vote is null', () => {
    const state = makeState(2);
    state.votes = ['counter', null];
    expect(allVotesSubmitted(state)).toBe(false);
  });

  it('should return false when the first vote is null', () => {
    const state = makeState(2);
    state.votes = [null, 'abstain'];
    expect(allVotesSubmitted(state)).toBe(false);
  });

  it('should return true when all votes are set', () => {
    const state = makeState(2);
    state.votes = ['counter', 'abstain'];
    expect(allVotesSubmitted(state)).toBe(true);
  });

  it('should return true when all votes are counter', () => {
    const state = makeState(3);
    state.votes = ['counter', 'counter', 'counter'];
    expect(allVotesSubmitted(state)).toBe(true);
  });

  it('should return true when all votes are abstain', () => {
    const state = makeState(2);
    state.votes = ['abstain', 'abstain'];
    expect(allVotesSubmitted(state)).toBe(true);
  });
});

// ─── resolveVotes ─────────────────────────────────────────────────

describe('resolveVotes()', () => {
  it('should block behavior card on unanimous counter vote', () => {
    const state = makeState(2);
    setCurrentCard(state, 'spawn');
    // Give both players cards and submit counter votes
    giveFateCards(state, 0, 3);
    giveFateCards(state, 1, 3);
    submitVote(state, 0, 'counter');
    submitVote(state, 1, 'counter');

    const result = resolveVotes(state);

    expect(result.unanimous).toBe(true);
    expect(result.blocked).toBe(true);
    expect(result.counters).toBe(2);
    expect(result.abstains).toBe(0);
    expect(result.cardEffect).toEqual({ type: 'spawn', blocked: true });
  });

  it('should not block behavior card on non-unanimous vote', () => {
    const state = makeState(2);
    setCurrentCard(state, 'assault');
    giveFateCards(state, 0, 3);
    // Player 0 counters, player 1 abstains
    submitVote(state, 0, 'counter');
    submitVote(state, 1, 'abstain');

    const result = resolveVotes(state);

    expect(result.unanimous).toBe(false);
    expect(result.blocked).toBe(false);
    expect(result.cardEffect).toEqual({ type: 'assault', blocked: false });
  });

  it('should advance doom toll +1 on non-unanimous vote', () => {
    const state = makeState(2);
    setCurrentCard(state, 'move');
    setDoomToll(state, 3);
    submitVote(state, 0, 'abstain');
    submitVote(state, 1, 'abstain');

    resolveVotes(state);

    expect(state.doomToll).toBe(4);
  });

  it('should not advance doom toll on unanimous counter vote (2 players)', () => {
    const state = makeState(2);
    setCurrentCard(state, 'claim');
    setDoomToll(state, 5);
    giveFateCards(state, 0, 2);
    giveFateCards(state, 1, 2);
    submitVote(state, 0, 'counter');
    submitVote(state, 1, 'counter');

    resolveVotes(state);

    // With 2 players, unanimous does not trigger onUnanimousVoteWithCards (needs 3+)
    // Also doom does not advance (it was unanimous)
    expect(state.doomToll).toBe(5);
  });

  it('should recede doom toll -1 on unanimous vote with 3+ active players', () => {
    const state = makeState(3);
    setCurrentCard(state, 'spawn');
    setDoomToll(state, 7);
    giveFateCards(state, 0, 2);
    giveFateCards(state, 1, 2);
    giveFateCards(state, 2, 2);
    submitVote(state, 0, 'counter');
    submitVote(state, 1, 'counter');
    submitVote(state, 2, 'counter');

    resolveVotes(state);

    // Doom should recede by 1 (from 7 to 6)
    expect(state.doomToll).toBe(6);
  });

  it('should produce doom +1 for ESCALATE when blocked (unanimous)', () => {
    const state = makeState(3);
    setCurrentCard(state, 'escalate');
    setDoomToll(state, 5);
    giveFateCards(state, 0, 2);
    giveFateCards(state, 1, 2);
    giveFateCards(state, 2, 2);
    submitVote(state, 0, 'counter');
    submitVote(state, 1, 'counter');
    submitVote(state, 2, 'counter');

    const result = resolveVotes(state);

    // ESCALATE cannot be fully blocked — cardEffect shows doomAdvance: 1
    expect(result.cardEffect).toEqual({ type: 'escalate', doomAdvance: 1 });
    // Unanimous with 3 players: doom recedes -1 from onUnanimousVoteWithCards
    // (Note: the ESCALATE doom advance is the caller's responsibility)
    expect(result.blocked).toBe(true);
  });

  it('should produce doom +2 for ESCALATE when not blocked', () => {
    const state = makeState(2);
    setCurrentCard(state, 'escalate');
    setDoomToll(state, 4);
    submitVote(state, 0, 'abstain');
    submitVote(state, 1, 'abstain');

    const result = resolveVotes(state);

    expect(result.cardEffect).toEqual({ type: 'escalate', doomAdvance: 2 });
    expect(result.blocked).toBe(false);
  });

  it('should log a vote-resolved entry to actionLog', () => {
    const state = makeState(2);
    setCurrentCard(state, 'spawn');
    submitVote(state, 0, 'abstain');
    submitVote(state, 1, 'abstain');

    const logBefore = state.actionLog.length;
    resolveVotes(state);

    expect(state.actionLog.length).toBeGreaterThan(logBefore);
  });

  it('should count counters and abstains correctly in mixed vote', () => {
    const state = makeState(3);
    setCurrentCard(state, 'move');
    giveFateCards(state, 0, 2);
    submitVote(state, 0, 'counter');
    submitVote(state, 1, 'abstain');
    submitVote(state, 2, 'abstain');

    const result = resolveVotes(state);

    expect(result.counters).toBe(1);
    expect(result.abstains).toBe(2);
    expect(result.unanimous).toBe(false);
  });
});

// ─── getBehaviorCardEffect ────────────────────────────────────────

describe('getBehaviorCardEffect()', () => {
  it('should return spawn effect unblocked', () => {
    const effect = getBehaviorCardEffect('spawn', false);
    expect(effect).toEqual({ type: 'spawn', blocked: false });
  });

  it('should return spawn effect blocked', () => {
    const effect = getBehaviorCardEffect('spawn', true);
    expect(effect).toEqual({ type: 'spawn', blocked: true });
  });

  it('should return move effect unblocked', () => {
    const effect = getBehaviorCardEffect('move', false);
    expect(effect).toEqual({ type: 'move', blocked: false });
  });

  it('should return move effect blocked', () => {
    const effect = getBehaviorCardEffect('move', true);
    expect(effect).toEqual({ type: 'move', blocked: true });
  });

  it('should return claim effect unblocked', () => {
    const effect = getBehaviorCardEffect('claim', false);
    expect(effect).toEqual({ type: 'claim', blocked: false });
  });

  it('should return claim effect blocked', () => {
    const effect = getBehaviorCardEffect('claim', true);
    expect(effect).toEqual({ type: 'claim', blocked: true });
  });

  it('should return assault effect unblocked', () => {
    const effect = getBehaviorCardEffect('assault', false);
    expect(effect).toEqual({ type: 'assault', blocked: false });
  });

  it('should return assault effect blocked', () => {
    const effect = getBehaviorCardEffect('assault', true);
    expect(effect).toEqual({ type: 'assault', blocked: true });
  });

  it('should return escalate with doomAdvance 2 when unblocked', () => {
    const effect = getBehaviorCardEffect('escalate', false);
    expect(effect).toEqual({ type: 'escalate', doomAdvance: 2 });
  });

  it('should return escalate with doomAdvance 1 when blocked (cannot be fully blocked)', () => {
    const effect = getBehaviorCardEffect('escalate', true);
    expect(effect).toEqual({ type: 'escalate', doomAdvance: 1 });
  });
});

// ─── autoAbstainPlayers ───────────────────────────────────────────

describe('autoAbstainPlayers()', () => {
  it('should auto-abstain players with 0 fate cards', () => {
    const state = makeState(2);
    setDoomToll(state, 0); // cost = 1
    state.players[0].fateCards = [];
    state.players[1].fateCards = [];

    const abstained = autoAbstainPlayers(state);

    expect(abstained).toContain(0);
    expect(abstained).toContain(1);
    expect(state.votes[0]).toBe('abstain');
    expect(state.votes[1]).toBe('abstain');
  });

  it('should not auto-abstain players who have enough fate cards', () => {
    const state = makeState(2);
    setDoomToll(state, 0); // cost = 1
    giveFateCards(state, 0, 2);
    state.players[1].fateCards = [];

    const abstained = autoAbstainPlayers(state);

    expect(abstained).not.toContain(0);
    expect(abstained).toContain(1);
    expect(state.votes[0]).toBeNull(); // still null — not auto-abstained
    expect(state.votes[1]).toBe('abstain');
  });

  it('should not overwrite votes already submitted', () => {
    const state = makeState(2);
    state.players[0].fateCards = [];
    state.votes[0] = 'counter'; // already voted

    autoAbstainPlayers(state);

    // Should not overwrite the already-submitted vote
    expect(state.votes[0]).toBe('counter');
  });

  it('should update votesAbstained stat for auto-abstained players', () => {
    const state = makeState(2);
    state.players[0].fateCards = [];
    state.players[1].fateCards = [];

    const beforeP0 = state.players[0].stats.votesAbstained;
    const beforeP1 = state.players[1].stats.votesAbstained;

    autoAbstainPlayers(state);

    expect(state.players[0].stats.votesAbstained).toBe(beforeP0 + 1);
    expect(state.players[1].stats.votesAbstained).toBe(beforeP1 + 1);
  });

  it('should return empty array when all players have sufficient cards', () => {
    const state = makeState(2);
    giveFateCards(state, 0, 3);
    giveFateCards(state, 1, 3);

    const abstained = autoAbstainPlayers(state);
    expect(abstained).toEqual([]);
  });
});

// ─── Stats Tracking ───────────────────────────────────────────────

describe('Stats tracking', () => {
  it('should track votesCast correctly across multiple counter votes', () => {
    const state = makeState(2);
    giveFateCards(state, 0, 5);

    expect(state.players[0].stats.votesCast).toBe(0);
    submitVote(state, 0, 'counter');
    // Reset vote to allow re-voting in this test (simulate next round)
    state.votes[0] = null;
    giveFateCards(state, 0, 2);
    submitVote(state, 0, 'counter');

    expect(state.players[0].stats.votesCast).toBe(2);
  });

  it('should track votesAbstained correctly across multiple abstains', () => {
    const state = makeState(2);

    expect(state.players[1].stats.votesAbstained).toBe(0);
    submitVote(state, 1, 'abstain');
    state.votes[1] = null;
    submitVote(state, 1, 'abstain');

    expect(state.players[1].stats.votesAbstained).toBe(2);
  });

  it('should not increment votesCast when counter is forced to abstain', () => {
    const state = makeState(2);
    state.players[0].fateCards = [];

    submitVote(state, 0, 'counter'); // forced to abstain

    expect(state.players[0].stats.votesCast).toBe(0);
    expect(state.players[0].stats.votesAbstained).toBe(1);
  });
});

// ─── CRITICAL: Broken Court never prevents Voting Phase participation ─

describe('Broken Court state NEVER prevents Voting Phase participation', () => {
  it('should allow broken court player to counter-vote with fate cards', () => {
    // 1. Create a game state with 3 players
    const state = makeState(3);
    setCurrentCard(state, 'assault');

    // 2. Set player 1 to isBroken = true
    state.players[1].isBroken = true;

    // 3. Give them fate cards
    giveFateCards(state, 1, 3);

    // 4. Verify canVote returns canCounter: true
    const voteInfo = canVote(state.players[1], state);
    expect(voteInfo.canCounter).toBe(true);
    expect(voteInfo.mustAutoAbstain).toBe(false);

    // 5. Verify submitVote('counter') succeeds
    const accepted = submitVote(state, 1, 'counter');
    expect(accepted).toBe(true);
    expect(state.votes[1]).toBe('counter');

    // 6. Verify the broken player's vote counts in resolution
    giveFateCards(state, 0, 2);
    giveFateCards(state, 2, 2);
    submitVote(state, 0, 'counter');
    submitVote(state, 2, 'counter');

    const result = resolveVotes(state);

    // All three players (including the broken one) voted counter → unanimous
    expect(result.counters).toBe(3);
    expect(result.unanimous).toBe(true);
    expect(result.blocked).toBe(true);
  });

  it('broken court player vote is counted in non-unanimous resolution', () => {
    const state = makeState(3);
    setCurrentCard(state, 'spawn');
    setDoomToll(state, 3);

    // Set player 2 to broken
    state.players[2].isBroken = true;
    giveFateCards(state, 2, 2);

    // Players 0 and 1 abstain; broken player 2 counters
    submitVote(state, 0, 'abstain');
    submitVote(state, 1, 'abstain');
    submitVote(state, 2, 'counter'); // broken player's vote is counted

    const result = resolveVotes(state);

    // Vote is non-unanimous (2 abstains vs 1 counter)
    expect(result.counters).toBe(1);
    expect(result.abstains).toBe(2);
    expect(result.unanimous).toBe(false);
    // The broken player's counter still counted in the tally
  });
});
