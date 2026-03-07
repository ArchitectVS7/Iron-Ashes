/**
 * Tests for Game Modes System (F-011)
 */

import { describe, it, expect } from 'vitest';
import { createGameState } from '../../src/engine/game-loop.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import {
  assignBloodPact,
  canAccuse,
  performAccusation,
  isPvPCombatAllowed,
  hasBloodPactCard,
  getModeName,
  getCooperativeDeckComposition,
  advanceAccusationCooldowns,
  getSuspicionLog,
  ACCUSATION_COST,
} from '../../src/systems/game-modes.js';
import {
  DEFAULT_BEHAVIOR_DECK_COMPOSITION,
  COOPERATIVE_BEHAVIOR_DECK_COMPOSITION,
  ACCUSATION_COOLDOWN_ROUNDS,
  ACCUSATION_LOCKOUT_ROUNDS,
  ACCUSATION_PENALTY_CARDS,
  DOOM_TOLL_ACCUSATION_RECEDE,
  SUSPICION_LOG_ROUNDS,
} from '../../src/models/game-state.js';

describe('assignBloodPact', () => {
  it('should assign blood pact to a human player in blood_pact mode', () => {
    const state = createGameState(4, 'blood_pact', 42);
    const rng = new SeededRandom(99);
    const holder = assignBloodPact(state, rng);
    expect(holder).toBeGreaterThanOrEqual(0);
    expect(holder).toBeLessThan(4);
    expect(state.players[holder].hasBloodPact).toBe(true);
  });

  it('should return -1 in competitive mode', () => {
    const state = createGameState(4, 'competitive', 42);
    const rng = new SeededRandom(99);
    expect(assignBloodPact(state, rng)).toBe(-1);
  });

  it('should return -1 in cooperative mode', () => {
    const state = createGameState(4, 'cooperative', 42);
    const rng = new SeededRandom(99);
    expect(assignBloodPact(state, rng)).toBe(-1);
  });

  it('should only assign to one player', () => {
    const state = createGameState(4, 'blood_pact', 42);
    const rng = new SeededRandom(99);
    assignBloodPact(state, rng);
    const holders = state.players.filter(p => p.hasBloodPact);
    expect(holders.length).toBe(1);
  });

  it('should be deterministic from seed', () => {
    const state1 = createGameState(4, 'blood_pact', 42);
    const state2 = createGameState(4, 'blood_pact', 42);
    const holder1 = assignBloodPact(state1, new SeededRandom(99));
    const holder2 = assignBloodPact(state2, new SeededRandom(99));
    expect(holder1).toBe(holder2);
  });
});

describe('ACCUSATION_COST', () => {
  it('should be 2 fate cards per accuser', () => {
    expect(ACCUSATION_COST).toBe(2);
  });
});

describe('canAccuse', () => {
  it('should return accuser indices when all can afford', () => {
    const state = createGameState(4, 'blood_pact', 42);
    for (const p of state.players) {
      p.fateCards = [1, 2, 3];
    }
    const accusers = canAccuse(state, 2);
    expect(accusers).not.toBeNull();
    expect(accusers!.sort()).toEqual([0, 1, 3]);
  });

  it('should return null if any accuser lacks cards', () => {
    const state = createGameState(4, 'blood_pact', 42);
    for (const p of state.players) {
      p.fateCards = [1, 2, 3];
    }
    state.players[0].fateCards = [1]; // Only 1, needs 2
    expect(canAccuse(state, 2)).toBeNull();
  });

  it('should return null in competitive mode', () => {
    const state = createGameState(4, 'competitive', 42);
    for (const p of state.players) p.fateCards = [1, 2, 3];
    expect(canAccuse(state, 0)).toBeNull();
  });

  it('should return null for invalid target index', () => {
    const state = createGameState(4, 'blood_pact', 42);
    expect(canAccuse(state, 99)).toBeNull();
  });
});

describe('performAccusation', () => {
  it('should reveal blood pact holder and return true', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    const result = performAccusation(state, 2);
    expect(result).toBe(true);
    expect(state.players[2].bloodPactRevealed).toBe(true);
  });

  it('should spend cards from all accusers on correct accusation (net cost 1 after refund)', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    performAccusation(state, 2);
    // Accusers (0, 1, 3) each spent 2 cards then got 1 refunded → net 1 spent, 2 remaining
    expect(state.players[0].fateCards.length).toBe(2);
    expect(state.players[1].fateCards.length).toBe(2);
    expect(state.players[3].fateCards.length).toBe(2);
    // Target loses ACCUSATION_PENALTY_CARDS (3), started with 3 → 0 remaining
    expect(state.players[2].fateCards.length).toBe(0);
  });

  it('should return false for wrong target but refund accusers (net cost 1)', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    const result = performAccusation(state, 1); // Wrong target
    expect(result).toBe(false);
    expect(state.players[1].bloodPactRevealed).toBe(false);
    // Accusers (0, 2, 3) spent 2 then got 1 back → net 1 spent, 2 remaining
    expect(state.players[0].fateCards.length).toBe(2);
    expect(state.players[2].fateCards.length).toBe(2);
    expect(state.players[3].fateCards.length).toBe(2);
  });

  it('should log the accusation', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    const logBefore = state.actionLog.length;
    performAccusation(state, 2);
    expect(state.actionLog.length).toBe(logBefore + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('blood-pact-accusation');
  });

  it('should return false when canAccuse fails', () => {
    const state = createGameState(4, 'competitive', 42);
    expect(performAccusation(state, 0)).toBe(false);
  });
});

describe('isPvPCombatAllowed', () => {
  it('should be true in competitive mode', () => {
    const state = createGameState(2, 'competitive', 42);
    expect(isPvPCombatAllowed(state)).toBe(true);
  });

  it('should be true in blood_pact mode', () => {
    const state = createGameState(2, 'blood_pact', 42);
    expect(isPvPCombatAllowed(state)).toBe(true);
  });

  it('should be false in cooperative mode', () => {
    const state = createGameState(2, 'cooperative', 42);
    expect(isPvPCombatAllowed(state)).toBe(false);
  });
});

describe('hasBloodPactCard', () => {
  it('should return true only for blood_pact mode', () => {
    expect(hasBloodPactCard('blood_pact')).toBe(true);
    expect(hasBloodPactCard('competitive')).toBe(false);
    expect(hasBloodPactCard('cooperative')).toBe(false);
  });
});

describe('getModeName', () => {
  it('should return display names', () => {
    expect(getModeName('competitive')).toBe('Competitive');
    expect(getModeName('blood_pact')).toBe('Blood Pact');
    expect(getModeName('cooperative')).toBe('Cooperative');
  });
});

// ─── Cooperative Mode Harder Deck ─────────────────────────────────

describe('Cooperative Behavior Deck', () => {
  it('should have the same total cards as the default deck (20)', () => {
    const defaultTotal = Object.values(DEFAULT_BEHAVIOR_DECK_COMPOSITION).reduce((a, b) => a + b, 0);
    const coopTotal = Object.values(COOPERATIVE_BEHAVIOR_DECK_COMPOSITION).reduce((a, b) => a + b, 0);
    expect(defaultTotal).toBe(20);
    expect(coopTotal).toBe(20);
  });

  it('should have more ESCALATE cards than the default deck', () => {
    expect(COOPERATIVE_BEHAVIOR_DECK_COMPOSITION.escalate).toBeGreaterThan(
      DEFAULT_BEHAVIOR_DECK_COMPOSITION.escalate,
    );
  });

  it('should have more ASSAULT cards than the default deck', () => {
    expect(COOPERATIVE_BEHAVIOR_DECK_COMPOSITION.assault).toBeGreaterThan(
      DEFAULT_BEHAVIOR_DECK_COMPOSITION.assault,
    );
  });

  it('should have fewer CLAIM cards than the default deck', () => {
    expect(COOPERATIVE_BEHAVIOR_DECK_COMPOSITION.claim).toBeLessThan(
      DEFAULT_BEHAVIOR_DECK_COMPOSITION.claim,
    );
  });

  it('should use cooperative deck when creating a cooperative game', () => {
    const state = createGameState(4, 'cooperative', 42);
    // Cooperative deck: 5 spawn, 6 move, 2 claim, 4 assault, 3 escalate
    const typeCounts: Record<string, number> = {};
    for (const card of [...state.behaviorDeck, ...state.behaviorDiscard]) {
      typeCounts[card.type] = (typeCounts[card.type] ?? 0) + 1;
    }
    expect(typeCounts['escalate']).toBe(COOPERATIVE_BEHAVIOR_DECK_COMPOSITION.escalate);
    expect(typeCounts['assault']).toBe(COOPERATIVE_BEHAVIOR_DECK_COMPOSITION.assault);
    expect(typeCounts['spawn']).toBe(COOPERATIVE_BEHAVIOR_DECK_COMPOSITION.spawn);
    expect(typeCounts['claim']).toBe(COOPERATIVE_BEHAVIOR_DECK_COMPOSITION.claim);
  });

  it('should use default deck for competitive mode', () => {
    const state = createGameState(4, 'competitive', 42);
    const typeCounts: Record<string, number> = {};
    for (const card of [...state.behaviorDeck, ...state.behaviorDiscard]) {
      typeCounts[card.type] = (typeCounts[card.type] ?? 0) + 1;
    }
    expect(typeCounts['escalate']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.escalate);
    expect(typeCounts['assault']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.assault);
  });

  it('getCooperativeDeckComposition returns a copy of the cooperative composition', () => {
    const composition = getCooperativeDeckComposition();
    expect(composition).toEqual(COOPERATIVE_BEHAVIOR_DECK_COMPOSITION);
    // Should be a copy, not the same reference
    composition.escalate = 99;
    expect(COOPERATIVE_BEHAVIOR_DECK_COMPOSITION.escalate).not.toBe(99);
  });
});

// ─── Accusation Mid-Game Resolution (Fix 6) ───────────────────────

describe('accusation mid-game resolution (Fix 6)', () => {
  it('canAccuse returns null in 2-player blood_pact game', () => {
    const state = createGameState(2, 'blood_pact', 42);
    for (const p of state.players) p.fateCards = [1, 2, 3];
    expect(canAccuse(state, 0)).toBeNull();
    expect(canAccuse(state, 1)).toBeNull();
  });

  it('canAccuse returns null when accusationCooldownRounds > 0', () => {
    const state = createGameState(4, 'blood_pact', 42);
    for (const p of state.players) p.fateCards = [1, 2, 3];
    state.accusationCooldownRounds = 1;
    expect(canAccuse(state, 2)).toBeNull();
  });

  it('canAccuse returns null when target accusationLockoutRounds > 0', () => {
    const state = createGameState(4, 'blood_pact', 42);
    for (const p of state.players) p.fateCards = [1, 2, 3];
    state.players[2].accusationLockoutRounds = 1;
    expect(canAccuse(state, 2)).toBeNull();
  });

  it('successful accusation: traitor with 5 cards loses 3, leaving 2', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    state.players[2].fateCards = [1, 2, 3, 4, 5];
    performAccusation(state, 2);
    expect(state.players[2].fateCards.length).toBe(2);
  });

  it('successful accusation: traitor with only 2 cards → 0 remaining (clamped at 0)', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    state.players[2].fateCards = [1, 2];
    performAccusation(state, 2);
    expect(state.players[2].fateCards.length).toBe(0);
  });

  it('successful accusation: Doom Toll recedes by 1', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    state.doomToll = 5;
    performAccusation(state, 2);
    expect(state.doomToll).toBe(5 - DOOM_TOLL_ACCUSATION_RECEDE);
  });

  it('successful accusation: each accuser nets 1 card spent (started 3, spent 2, refund 1 → hand size 2)', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    performAccusation(state, 2);
    expect(state.players[0].fateCards.length).toBe(2);
    expect(state.players[1].fateCards.length).toBe(2);
    expect(state.players[3].fateCards.length).toBe(2);
  });

  it('successful accusation: accusationCooldownRounds set to ACCUSATION_COOLDOWN_ROUNDS', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    performAccusation(state, 2);
    expect(state.accusationCooldownRounds).toBe(ACCUSATION_COOLDOWN_ROUNDS);
  });

  it('failed accusation: accused gains 1 Fate Card', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    const beforeCount = state.players[1].fateCards.length;
    performAccusation(state, 1); // Wrong target — player 2 has pact
    expect(state.players[1].fateCards.length).toBe(beforeCount + 1);
  });

  it('failed accusation: accused accusationLockoutRounds set to ACCUSATION_LOCKOUT_ROUNDS', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    performAccusation(state, 1); // Wrong target
    expect(state.players[1].accusationLockoutRounds).toBe(ACCUSATION_LOCKOUT_ROUNDS);
  });

  it('failed accusation: accusationCooldownRounds set to ACCUSATION_COOLDOWN_ROUNDS', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[2].hasBloodPact = true;
    for (const p of state.players) p.fateCards = [1, 2, 3];
    performAccusation(state, 1); // Wrong target
    expect(state.accusationCooldownRounds).toBe(ACCUSATION_COOLDOWN_ROUNDS);
  });

  it('advanceAccusationCooldowns: decrements global cooldown and player lockout, clamps at 0', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.accusationCooldownRounds = 2;
    state.players[0].accusationLockoutRounds = 1;
    state.players[1].accusationLockoutRounds = 0;
    advanceAccusationCooldowns(state);
    expect(state.accusationCooldownRounds).toBe(1);
    expect(state.players[0].accusationLockoutRounds).toBe(0);
    expect(state.players[1].accusationLockoutRounds).toBe(0); // clamped
    advanceAccusationCooldowns(state);
    expect(state.accusationCooldownRounds).toBe(0);
    advanceAccusationCooldowns(state);
    expect(state.accusationCooldownRounds).toBe(0); // stays at 0
  });
});

// ─── getSuspicionLog ──────────────────────────────────────────────

/** Push vote-round-record entries directly into the action log — simulates resolveVotes() output. */
function recordVotes(
  state: ReturnType<typeof createGameState>,
  round: number,
  votes: Array<{ playerIndex: number; vote: 'counter' | 'abstain' }>,
): void {
  for (const { playerIndex, vote } of votes) {
    state.actionLog.push({
      round,
      phase: 'voting',
      playerIndex,
      action: 'vote-round-record',
      details: vote,
    });
  }
}

describe('getSuspicionLog()', () => {
  it('returns an empty array when no rounds have been played', () => {
    const state = createGameState(4, 'blood_pact', 42);
    expect(getSuspicionLog(state, 0)).toEqual([]);
  });

  it('returns one entry for a single round', () => {
    const state = createGameState(4, 'blood_pact', 42);
    recordVotes(state, 1, [
      { playerIndex: 0, vote: 'counter' },
      { playerIndex: 1, vote: 'abstain' },
      { playerIndex: 2, vote: 'counter' },
      { playerIndex: 3, vote: 'counter' },
    ]);
    const log = getSuspicionLog(state, 0);
    expect(log).toHaveLength(1);
    expect(log[0].round).toBe(1);
    expect(log[0].vote).toBe('counter');
    expect(log[0].wasSoleAbstainer).toBe(false);
  });

  it('correctly records a counter vote', () => {
    const state = createGameState(4, 'blood_pact', 42);
    recordVotes(state, 1, [
      { playerIndex: 0, vote: 'counter' },
      { playerIndex: 1, vote: 'counter' },
      { playerIndex: 2, vote: 'counter' },
      { playerIndex: 3, vote: 'counter' },
    ]);
    const log = getSuspicionLog(state, 2);
    expect(log[0].vote).toBe('counter');
    expect(log[0].wasSoleAbstainer).toBe(false);
  });

  it('correctly records an abstain vote', () => {
    const state = createGameState(4, 'blood_pact', 42);
    recordVotes(state, 1, [
      { playerIndex: 0, vote: 'counter' },
      { playerIndex: 1, vote: 'counter' },
      { playerIndex: 2, vote: 'abstain' },
      { playerIndex: 3, vote: 'counter' },
    ]);
    const log = getSuspicionLog(state, 2);
    expect(log[0].vote).toBe('abstain');
  });

  it('marks wasSoleAbstainer true when the subject is the only abstainer', () => {
    const state = createGameState(4, 'blood_pact', 42);
    recordVotes(state, 1, [
      { playerIndex: 0, vote: 'counter' },
      { playerIndex: 1, vote: 'counter' },
      { playerIndex: 2, vote: 'abstain' },  // sole abstainer
      { playerIndex: 3, vote: 'counter' },
    ]);
    const log = getSuspicionLog(state, 2);
    expect(log[0].wasSoleAbstainer).toBe(true);
  });

  it('marks wasSoleAbstainer false when multiple players abstained', () => {
    const state = createGameState(4, 'blood_pact', 42);
    recordVotes(state, 1, [
      { playerIndex: 0, vote: 'abstain' },
      { playerIndex: 1, vote: 'counter' },
      { playerIndex: 2, vote: 'abstain' },  // two abstainers
      { playerIndex: 3, vote: 'counter' },
    ]);
    const log = getSuspicionLog(state, 0);
    expect(log[0].wasSoleAbstainer).toBe(false);
  });

  it('returns entries in ascending round order', () => {
    const state = createGameState(4, 'blood_pact', 42);
    recordVotes(state, 3, [{ playerIndex: 0, vote: 'counter' }, { playerIndex: 1, vote: 'counter' }]);
    recordVotes(state, 1, [{ playerIndex: 0, vote: 'abstain' }, { playerIndex: 1, vote: 'counter' }]);
    recordVotes(state, 2, [{ playerIndex: 0, vote: 'counter' }, { playerIndex: 1, vote: 'counter' }]);
    const log = getSuspicionLog(state, 0);
    expect(log.map(e => e.round)).toEqual([1, 2, 3]);
  });

  it(`returns at most ${SUSPICION_LOG_ROUNDS} entries when more rounds exist`, () => {
    const state = createGameState(4, 'blood_pact', 42);
    for (let r = 1; r <= SUSPICION_LOG_ROUNDS + 3; r++) {
      recordVotes(state, r, [
        { playerIndex: 0, vote: 'counter' },
        { playerIndex: 1, vote: 'counter' },
      ]);
    }
    const log = getSuspicionLog(state, 0);
    expect(log).toHaveLength(SUSPICION_LOG_ROUNDS);
  });

  it('returns the most recent rounds when trimmed', () => {
    const state = createGameState(4, 'blood_pact', 42);
    for (let r = 1; r <= SUSPICION_LOG_ROUNDS + 2; r++) {
      recordVotes(state, r, [{ playerIndex: 0, vote: 'counter' }, { playerIndex: 1, vote: 'counter' }]);
    }
    const log = getSuspicionLog(state, 0);
    const firstRound = log[0].round;
    expect(firstRound).toBe(3); // rounds 1 and 2 should be dropped
  });

  it('defaults to abstain for a player with no record in a round', () => {
    const state = createGameState(4, 'blood_pact', 42);
    // Only log player 1's vote — player 0 has no entry
    recordVotes(state, 1, [{ playerIndex: 1, vote: 'counter' }]);
    const log = getSuspicionLog(state, 0);
    expect(log[0].vote).toBe('abstain');
  });
});
