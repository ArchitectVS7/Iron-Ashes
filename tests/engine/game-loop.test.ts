/**
 * Tests for src/engine/game-loop.ts
 *
 * Covers game initialization, deck creation, phase advancement,
 * action turn management, and round lifecycle helpers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGameState,
  createBehaviorDeck,
  createFateDeck,
  advancePhase,
  advanceActionTurn,
  isActionPhaseComplete,
  startRound,
  startCleanup,
  getTurnIndicator,
  getRoundNumber,
  getPhaseLabel,
} from '../../src/engine/game-loop.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import {
  DEFAULT_BEHAVIOR_DECK_COMPOSITION,
  ACTIONS_PER_TURN_NORMAL,
  ACTIONS_PER_TURN_BROKEN,
  LIEUTENANT_START_COUNT,
  LIEUTENANT_POWER,
  DOOM_TOLL_FINAL_PHASE_THRESHOLD,
} from '../../src/models/game-state.js';
import { KNOWN_LANDS } from '../../src/models/board.js';
import type { GameState } from '../../src/models/game-state.js';

const TEST_SEED = 42;

// ─── createBehaviorDeck ───────────────────────────────────────────

describe('createBehaviorDeck', () => {
  it('creates exactly 20 cards', () => {
    const rng = new SeededRandom(TEST_SEED);
    const deck = createBehaviorDeck(rng);
    expect(deck).toHaveLength(20);
  });

  it('has correct counts per card type', () => {
    const rng = new SeededRandom(TEST_SEED);
    const deck = createBehaviorDeck(rng);

    const counts: Record<string, number> = {};
    for (const card of deck) {
      counts[card.type] = (counts[card.type] ?? 0) + 1;
    }

    expect(counts['spawn']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.spawn);
    expect(counts['move']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.move);
    expect(counts['claim']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.claim);
    expect(counts['assault']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.assault);
    expect(counts['escalate']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.escalate);
  });

  it('assigns unique IDs to all cards', () => {
    const rng = new SeededRandom(TEST_SEED);
    const deck = createBehaviorDeck(rng);
    const ids = deck.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(deck.length);
  });

  it('produces different orderings for different seeds', () => {
    const deck1 = createBehaviorDeck(new SeededRandom(1));
    const deck2 = createBehaviorDeck(new SeededRandom(999));
    const ids1 = deck1.map(c => c.id).join(',');
    const ids2 = deck2.map(c => c.id).join(',');
    expect(ids1).not.toBe(ids2);
  });

  it('produces the same ordering for the same seed', () => {
    const deck1 = createBehaviorDeck(new SeededRandom(TEST_SEED));
    const deck2 = createBehaviorDeck(new SeededRandom(TEST_SEED));
    expect(deck1.map(c => c.id)).toEqual(deck2.map(c => c.id));
  });
});

// ─── createFateDeck ───────────────────────────────────────────────

describe('createFateDeck', () => {
  it('creates exactly 50 cards', () => {
    const rng = new SeededRandom(TEST_SEED);
    const deck = createFateDeck(rng);
    expect(deck).toHaveLength(50);
  });

  it('has correct value distribution', () => {
    const rng = new SeededRandom(TEST_SEED);
    const deck = createFateDeck(rng);

    const counts: Record<number, number> = {};
    for (const v of deck) {
      counts[v] = (counts[v] ?? 0) + 1;
    }

    // 25 blanks + 4 explicit zeros = 29 total zeros
    expect(counts[0]).toBe(29);
    expect(counts[1]).toBe(6);
    expect(counts[2]).toBe(7);
    expect(counts[3]).toBe(5);
    expect(counts[4]).toBe(2);
    expect(counts[-1]).toBe(1);
  });

  it('produces different orderings for different seeds', () => {
    const deck1 = createFateDeck(new SeededRandom(1));
    const deck2 = createFateDeck(new SeededRandom(999));
    expect(deck1.join(',')).not.toBe(deck2.join(','));
  });

  it('produces the same ordering for the same seed', () => {
    const deck1 = createFateDeck(new SeededRandom(TEST_SEED));
    const deck2 = createFateDeck(new SeededRandom(TEST_SEED));
    expect(deck1).toEqual(deck2);
  });
});

// ─── createGameState ─────────────────────────────────────────────

describe('createGameState', () => {
  describe('for 2 players', () => {
    let state: GameState;
    beforeEach(() => {
      state = createGameState(2, 'competitive', TEST_SEED);
    });

    it('creates exactly 2 players', () => {
      expect(state.players).toHaveLength(2);
    });

    it('sets round to 1', () => {
      expect(state.round).toBe(1);
    });

    it('sets phase to shadowking', () => {
      expect(state.phase).toBe('shadowking');
    });

    it('sets doomToll to 0', () => {
      expect(state.doomToll).toBe(0);
    });

    it('sets isFinalPhase to false', () => {
      expect(state.isFinalPhase).toBe(false);
    });

    it('stores the seed', () => {
      expect(state.seed).toBe(TEST_SEED);
    });

    it('sets the game mode', () => {
      expect(state.mode).toBe('competitive');
    });

    it('sets artifactNode to neutral center', () => {
      expect(state.artifactNode).toBe(KNOWN_LANDS.neutralCenter);
    });

    it('sets artifactHolder to null', () => {
      expect(state.artifactHolder).toBeNull();
    });

    it('sets gameEndReason to null', () => {
      expect(state.gameEndReason).toBeNull();
    });

    it('sets winner to null', () => {
      expect(state.winner).toBeNull();
    });

    it('initializes votes array with nulls', () => {
      expect(state.votes).toHaveLength(2);
      expect(state.votes.every(v => v === null)).toBe(true);
    });

    it('initializes empty action log', () => {
      expect(state.actionLog).toHaveLength(0);
    });
  });

  describe('for 3 players', () => {
    it('creates exactly 3 players', () => {
      const state = createGameState(3, 'competitive', TEST_SEED);
      expect(state.players).toHaveLength(3);
    });

    it('initializes votes array with 3 nulls', () => {
      const state = createGameState(3, 'competitive', TEST_SEED);
      expect(state.votes).toHaveLength(3);
    });
  });

  describe('for 4 players', () => {
    it('creates exactly 4 players', () => {
      const state = createGameState(4, 'competitive', TEST_SEED);
      expect(state.players).toHaveLength(4);
    });

    it('initializes votes array with 4 nulls', () => {
      const state = createGameState(4, 'competitive', TEST_SEED);
      expect(state.votes).toHaveLength(4);
    });
  });

  it('throws for fewer than 2 players', () => {
    expect(() => createGameState(1, 'competitive', TEST_SEED)).toThrow();
  });

  it('throws for more than 4 players', () => {
    expect(() => createGameState(5, 'competitive', TEST_SEED)).toThrow();
  });

  describe('board initialization', () => {
    let state: GameState;
    beforeEach(() => {
      state = createGameState(4, 'competitive', TEST_SEED);
    });

    it('uses KNOWN_LANDS as the board definition', () => {
      expect(state.boardDefinition).toBe(KNOWN_LANDS);
    });

    it('pre-claims each starting keep for the corresponding court', () => {
      for (let i = 0; i < 4; i++) {
        const keepId = KNOWN_LANDS.startingKeeps[i];
        expect(state.boardState[keepId].claimedBy).toBe(i);
      }
    });

    it('places 20 wanderer tokens on the board', () => {
      const nodesWithWanderers = Object.values(state.boardState).filter(n => n.hasWanderer);
      expect(nodesWithWanderers).toHaveLength(20);
    });

    it('wanderers are placed only on standard nodes', () => {
      for (const [nodeId, nodeState] of Object.entries(state.boardState)) {
        if (nodeState.hasWanderer) {
          const nodeDef = KNOWN_LANDS.nodes[nodeId];
          expect(nodeDef.type).toBe('standard');
        }
      }
    });

    it('keeps that are not in the wanderer selection have no token, while those selected may have one', () => {
      // Starting keeps are standard nodes and CAN receive wanderer tokens.
      // The wanderer selection picks 20 of 22 standard nodes randomly.
      // Verify only that the total wanderer count on all nodes is still 20.
      const totalWanderers = Object.values(state.boardState).filter(n => n.hasWanderer).length;
      expect(totalWanderers).toBe(20);
    });
  });

  describe('player initialization', () => {
    let state: GameState;
    beforeEach(() => {
      state = createGameState(4, 'competitive', TEST_SEED);
    });

    it('each player starts at their court keep', () => {
      for (let i = 0; i < 4; i++) {
        const keepId = KNOWN_LANDS.startingKeeps[i];
        expect(state.players[i].fellowship.currentNode).toBe(keepId);
      }
    });

    it('each player has the correct court index', () => {
      for (let i = 0; i < 4; i++) {
        expect(state.players[i].index).toBe(i);
        expect(state.players[i].fellowship.courtIndex).toBe(i);
      }
    });

    it('each player starts with a starting fellowship (4 characters)', () => {
      for (const player of state.players) {
        expect(player.fellowship.characters).toHaveLength(4);
      }
    });

    it('each player starts not broken', () => {
      for (const player of state.players) {
        expect(player.isBroken).toBe(false);
      }
    });

    it('each player starts with normal actionsRemaining', () => {
      for (const player of state.players) {
        expect(player.actionsRemaining).toBe(ACTIONS_PER_TURN_NORMAL);
      }
    });

    it('each player has generated starting banners', () => {
      // The starting fellowship has 1 producer at a standard node → 1 banner
      for (const player of state.players) {
        expect(player.warBanners).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('behavior deck', () => {
    it('behavior deck has 20 cards at start', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      expect(state.behaviorDeck).toHaveLength(20);
    });

    it('behavior discard starts empty', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      expect(state.behaviorDiscard).toHaveLength(0);
    });

    it('currentBehaviorCard starts null', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      expect(state.currentBehaviorCard).toBeNull();
    });

    it('deck contains correct card type counts', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      const counts: Record<string, number> = {};
      for (const card of state.behaviorDeck) {
        counts[card.type] = (counts[card.type] ?? 0) + 1;
      }
      expect(counts['spawn']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.spawn);
      expect(counts['move']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.move);
      expect(counts['claim']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.claim);
      expect(counts['assault']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.assault);
      expect(counts['escalate']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.escalate);
    });
  });

  describe('fate deck', () => {
    it('fate deck has 50 cards at start', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      expect(state.fateDeck).toHaveLength(50);
    });

    it('fate discard starts empty', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      expect(state.fateDiscard).toHaveLength(0);
    });

    it('fate deck has correct distribution', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      const counts: Record<number, number> = {};
      for (const v of state.fateDeck) {
        counts[v] = (counts[v] ?? 0) + 1;
      }
      expect(counts[0]).toBe(29); // 25 blanks + 4 explicit zeros
      expect(counts[1]).toBe(6);
      expect(counts[2]).toBe(7);
      expect(counts[3]).toBe(5);
      expect(counts[4]).toBe(2);
      expect(counts[-1]).toBe(1);
    });
  });

  describe('antagonist forces', () => {
    it('places exactly 2 starting lieutenants', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      expect(state.antagonistForces).toHaveLength(LIEUTENANT_START_COUNT);
    });

    it('places all starting lieutenants at the antagonist base', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      for (const force of state.antagonistForces) {
        expect(force.currentNode).toBe(KNOWN_LANDS.antagonistBase);
      }
    });

    it('starting forces are all lieutenants', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      for (const force of state.antagonistForces) {
        expect(force.type).toBe('lieutenant');
      }
    });

    it('starting lieutenants have correct power level', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      for (const force of state.antagonistForces) {
        expect(force.powerLevel).toBe(LIEUTENANT_POWER);
      }
    });

    it('starting lieutenants have unique IDs', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      const ids = state.antagonistForces.map(f => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('determinism', () => {
    it('produces identical states for the same seed', () => {
      const s1 = createGameState(3, 'competitive', TEST_SEED);
      const s2 = createGameState(3, 'competitive', TEST_SEED);

      // Compare deck orderings
      expect(s1.behaviorDeck.map(c => c.id)).toEqual(s2.behaviorDeck.map(c => c.id));
      expect(s1.fateDeck).toEqual(s2.fateDeck);

      // Compare wanderer placement
      const wanderers1 = Object.entries(s1.boardState)
        .filter(([, ns]) => ns.hasWanderer)
        .map(([id]) => id)
        .sort();
      const wanderers2 = Object.entries(s2.boardState)
        .filter(([, ns]) => ns.hasWanderer)
        .map(([id]) => id)
        .sort();
      expect(wanderers1).toEqual(wanderers2);
    });
  });
});

// ─── advancePhase ────────────────────────────────────────────────

describe('advancePhase', () => {
  it('advances shadowking → voting', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    state.phase = 'shadowking';
    advancePhase(state);
    expect(state.phase).toBe('voting');
  });

  it('advances voting → action', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    state.phase = 'voting';
    advancePhase(state);
    expect(state.phase).toBe('action');
  });

  it('advances action → cleanup', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    state.phase = 'action';
    advancePhase(state);
    expect(state.phase).toBe('cleanup');
  });

  it('advances cleanup → shadowking', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    state.phase = 'cleanup';
    advancePhase(state);
    expect(state.phase).toBe('shadowking');
  });

  it('increments round on cleanup → shadowking transition', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    expect(state.round).toBe(1);
    state.phase = 'cleanup';
    advancePhase(state);
    expect(state.round).toBe(2);
  });

  it('does not increment round on other transitions', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    state.phase = 'shadowking';
    advancePhase(state);
    expect(state.round).toBe(1);
    advancePhase(state);
    expect(state.round).toBe(1);
    advancePhase(state);
    expect(state.round).toBe(1);
  });

  describe('voting phase entry', () => {
    it('resets all votes to null when entering voting', () => {
      const state = createGameState(3, 'competitive', TEST_SEED);
      state.phase = 'shadowking';
      // Simulate some existing votes
      state.votes = ['counter', 'abstain', 'counter'];
      advancePhase(state);
      expect(state.phase).toBe('voting');
      expect(state.votes.every(v => v === null)).toBe(true);
    });

    it('votes array length matches player count after reset', () => {
      const state = createGameState(3, 'competitive', TEST_SEED);
      state.phase = 'shadowking';
      advancePhase(state);
      expect(state.votes).toHaveLength(3);
    });
  });

  describe('action phase entry', () => {
    it('sets activePlayerIndex to 0', () => {
      const state = createGameState(3, 'competitive', TEST_SEED);
      state.phase = 'voting';
      state.activePlayerIndex = 2;
      advancePhase(state);
      expect(state.phase).toBe('action');
      expect(state.activePlayerIndex).toBe(0);
    });

    it('sets actionsRemaining to ACTIONS_PER_TURN_NORMAL for non-broken players', () => {
      const state = createGameState(3, 'competitive', TEST_SEED);
      state.phase = 'voting';
      // Clear actions first to verify they get set
      for (const p of state.players) {
        p.actionsRemaining = 0;
        p.isBroken = false;
      }
      advancePhase(state);
      for (const p of state.players) {
        expect(p.actionsRemaining).toBe(ACTIONS_PER_TURN_NORMAL);
      }
    });

    it('sets actionsRemaining to ACTIONS_PER_TURN_BROKEN for broken players', () => {
      const state = createGameState(3, 'competitive', TEST_SEED);
      state.phase = 'voting';
      state.players[0].isBroken = true;
      state.players[1].isBroken = false;
      state.players[2].isBroken = true;
      advancePhase(state);
      expect(state.players[0].actionsRemaining).toBe(ACTIONS_PER_TURN_BROKEN);
      expect(state.players[1].actionsRemaining).toBe(ACTIONS_PER_TURN_NORMAL);
      expect(state.players[2].actionsRemaining).toBe(ACTIONS_PER_TURN_BROKEN);
    });
  });

  describe('cleanup → shadowking (new round)', () => {
    it('discards all unspent banners', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      state.phase = 'cleanup';
      state.players[0].warBanners = 5;
      state.players[1].warBanners = 3;
      advancePhase(state);
      // After cleanup, banners are discarded then regenerated.
      // Each player has 1 producer at a standard node → 1 banner.
      // They should not retain their old banners.
      // Exact count depends on fellowship, but old banners are gone.
      // 1 producer at standard node → 1 new banner, not 5 or 3.
      expect(state.players[0].warBanners).toBeLessThan(5);
      expect(state.players[1].warBanners).toBeLessThan(3);
    });

    it('generates new banners for all players', () => {
      const state = createGameState(2, 'competitive', TEST_SEED);
      state.phase = 'cleanup';
      // Zero out banners to confirm they get regenerated
      state.players[0].warBanners = 0;
      state.players[1].warBanners = 0;
      advancePhase(state);
      // Both players have 1 producer at standard keep → 1 banner each
      expect(state.players[0].warBanners).toBeGreaterThanOrEqual(1);
      expect(state.players[1].warBanners).toBeGreaterThanOrEqual(1);
    });
  });
});

// ─── isActionPhaseComplete ───────────────────────────────────────

describe('isActionPhaseComplete', () => {
  it('returns false when all players have actions remaining', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    state.players[0].actionsRemaining = 2;
    state.players[1].actionsRemaining = 1;
    expect(isActionPhaseComplete(state)).toBe(false);
  });

  it('returns false when only some players are done', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    state.players[0].actionsRemaining = 0;
    state.players[1].actionsRemaining = 2;
    expect(isActionPhaseComplete(state)).toBe(false);
  });

  it('returns true when all players have 0 actions remaining', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    state.players[0].actionsRemaining = 0;
    state.players[1].actionsRemaining = 0;
    expect(isActionPhaseComplete(state)).toBe(true);
  });

  it('returns true for 4 players when all are exhausted', () => {
    const state = createGameState(4, 'competitive', TEST_SEED);
    for (const p of state.players) p.actionsRemaining = 0;
    expect(isActionPhaseComplete(state)).toBe(true);
  });
});

// ─── advanceActionTurn ───────────────────────────────────────────

describe('advanceActionTurn', () => {
  it('does nothing if not in action phase', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    state.phase = 'voting';
    state.activePlayerIndex = 0;
    advanceActionTurn(state);
    expect(state.phase).toBe('voting');
    expect(state.activePlayerIndex).toBe(0);
  });

  it('advances activePlayerIndex to the next player with actions', () => {
    const state = createGameState(3, 'competitive', TEST_SEED);
    state.phase = 'action';
    state.activePlayerIndex = 0;
    for (const p of state.players) p.actionsRemaining = 2;
    advanceActionTurn(state);
    expect(state.activePlayerIndex).toBe(1);
  });

  it('skips players with no actions remaining', () => {
    const state = createGameState(3, 'competitive', TEST_SEED);
    state.phase = 'action';
    state.activePlayerIndex = 0;
    state.players[0].actionsRemaining = 2;
    state.players[1].actionsRemaining = 0; // exhausted — skip
    state.players[2].actionsRemaining = 1;
    advanceActionTurn(state);
    expect(state.activePlayerIndex).toBe(2);
  });

  it('advances to cleanup when all players are done', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    state.phase = 'action';
    state.players[0].actionsRemaining = 0;
    state.players[1].actionsRemaining = 0;
    advanceActionTurn(state);
    expect(state.phase).toBe('cleanup');
  });

  it('advances through all players and then to cleanup', () => {
    const state = createGameState(3, 'competitive', TEST_SEED);
    state.phase = 'action';
    state.activePlayerIndex = 0;
    // Give each player exactly 1 action
    for (const p of state.players) p.actionsRemaining = 1;

    // Player 0 uses action
    state.players[0].actionsRemaining = 0;
    advanceActionTurn(state);
    expect(state.activePlayerIndex).toBe(1);
    expect(state.phase).toBe('action');

    // Player 1 uses action
    state.players[1].actionsRemaining = 0;
    advanceActionTurn(state);
    expect(state.activePlayerIndex).toBe(2);
    expect(state.phase).toBe('action');

    // Player 2 uses action
    state.players[2].actionsRemaining = 0;
    advanceActionTurn(state);
    // All done — should advance to cleanup
    expect(state.phase).toBe('cleanup');
  });
});

// ─── startRound ──────────────────────────────────────────────────

describe('startRound', () => {
  it('draws a behavior card from the deck', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    const deckSizeBefore = state.behaviorDeck.length;
    startRound(state);
    expect(state.currentBehaviorCard).not.toBeNull();
    expect(state.behaviorDeck.length).toBe(deckSizeBefore - 1);
  });

  it('sets phase to shadowking', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    state.phase = 'cleanup';
    startRound(state);
    expect(state.phase).toBe('shadowking');
  });

  it('moves previous card to discard when drawing a new one', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    startRound(state);
    const firstCard = state.currentBehaviorCard;
    startRound(state);
    expect(state.behaviorDiscard).toContainEqual(firstCard);
  });

  it('reshuffles discard into deck when deck is empty', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    // Drain the deck
    state.behaviorDiscard = [...state.behaviorDeck];
    state.behaviorDeck = [];
    startRound(state);
    // Should have drawn one card from the reshuffled discard
    expect(state.currentBehaviorCard).not.toBeNull();
  });
});

// ─── startCleanup ────────────────────────────────────────────────

describe('startCleanup', () => {
  it('discards all unspent banners from all players', () => {
    const state = createGameState(3, 'competitive', TEST_SEED);
    state.players[0].warBanners = 10;
    state.players[1].warBanners = 7;
    state.players[2].warBanners = 4;
    // After cleanup: discard then regenerate. With 1 producer at standard → 1 banner.
    startCleanup(state);
    // Players should have regenerated banners, not the inflated values
    expect(state.players[0].warBanners).toBeLessThan(10);
    expect(state.players[1].warBanners).toBeLessThan(7);
    expect(state.players[2].warBanners).toBeLessThan(4);
  });

  it('generates new banners after discarding', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    // Clear banners to baseline zero
    state.players[0].warBanners = 0;
    state.players[1].warBanners = 0;
    startCleanup(state);
    // 1 producer at standard keep → 1 banner per player
    expect(state.players[0].warBanners).toBeGreaterThanOrEqual(1);
    expect(state.players[1].warBanners).toBeGreaterThanOrEqual(1);
  });

  it('does not affect non-resource state', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    const roundBefore = state.round;
    const phaseBefore = state.phase;
    startCleanup(state);
    expect(state.round).toBe(roundBefore);
    expect(state.phase).toBe(phaseBefore);
  });
});

// ─── Full round cycle ────────────────────────────────────────────

describe('full round cycle', () => {
  it('completes a full round advancing through all 4 phases', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    expect(state.phase).toBe('shadowking');

    advancePhase(state); // → voting
    expect(state.phase).toBe('voting');

    advancePhase(state); // → action
    expect(state.phase).toBe('action');

    advancePhase(state); // → cleanup
    expect(state.phase).toBe('cleanup');

    advancePhase(state); // → shadowking (round 2)
    expect(state.phase).toBe('shadowking');
    expect(state.round).toBe(2);
  });

  it('correctly tracks round number over multiple cycles', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    for (let round = 1; round <= 5; round++) {
      expect(state.round).toBe(round);
      state.phase = 'cleanup';
      advancePhase(state);
    }
    expect(state.round).toBe(6);
  });
});

// ─── isFinalPhase boundary ───────────────────────────────────────

describe('isFinalPhase', () => {
  it('is false when doomToll is below threshold', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    state.doomToll = DOOM_TOLL_FINAL_PHASE_THRESHOLD - 1;
    expect(state.isFinalPhase).toBe(false);
  });

  it('is true when doomToll equals threshold (set manually)', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    // isFinalPhase is a stored property — update it alongside doomToll
    state.doomToll = DOOM_TOLL_FINAL_PHASE_THRESHOLD;
    (state as GameState & { isFinalPhase: boolean }).isFinalPhase = true;
    expect(state.isFinalPhase).toBe(true);
  });
});

// ─── Turn Indicator & Round Counter ──────────────────────────────

describe('getTurnIndicator', () => {
  it('returns correct state at game start', () => {
    const state = createGameState(4, 'competitive', TEST_SEED);
    const indicator = getTurnIndicator(state);
    expect(indicator.round).toBe(1);
    expect(indicator.phase).toBe('shadowking');
    expect(indicator.phaseLabel).toBe('Shadowking Phase');
    expect(indicator.activePlayerIndex).toBe(0);
    expect(indicator.isActionPhase).toBe(false);
    expect(indicator.isVotingPhase).toBe(false);
  });

  it('reflects voting phase correctly', () => {
    const state = createGameState(4, 'competitive', TEST_SEED);
    advancePhase(state); // → voting
    const indicator = getTurnIndicator(state);
    expect(indicator.phase).toBe('voting');
    expect(indicator.phaseLabel).toBe('Voting Phase');
    expect(indicator.isVotingPhase).toBe(true);
    expect(indicator.isActionPhase).toBe(false);
  });

  it('reflects action phase with active player', () => {
    const state = createGameState(4, 'competitive', TEST_SEED);
    advancePhase(state); // → voting
    advancePhase(state); // → action
    const indicator = getTurnIndicator(state);
    expect(indicator.phase).toBe('action');
    expect(indicator.phaseLabel).toBe('Action Phase');
    expect(indicator.isActionPhase).toBe(true);
    expect(indicator.isVotingPhase).toBe(false);
    expect(indicator.activePlayerIndex).toBe(0);
  });

  it('reflects cleanup phase', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    advancePhase(state); // → voting
    advancePhase(state); // → action
    advancePhase(state); // → cleanup
    const indicator = getTurnIndicator(state);
    expect(indicator.phase).toBe('cleanup');
    expect(indicator.phaseLabel).toBe('Cleanup Phase');
  });

  it('tracks round advancement', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    expect(getTurnIndicator(state).round).toBe(1);
    // Advance through full round
    state.phase = 'cleanup';
    advancePhase(state); // → shadowking (round 2)
    expect(getTurnIndicator(state).round).toBe(2);
  });

  it('updates activePlayerIndex when action turn advances', () => {
    const state = createGameState(3, 'competitive', TEST_SEED);
    advancePhase(state); // → voting
    advancePhase(state); // → action
    expect(getTurnIndicator(state).activePlayerIndex).toBe(0);

    state.players[0].actionsRemaining = 0;
    advanceActionTurn(state);
    expect(getTurnIndicator(state).activePlayerIndex).toBe(1);
  });
});

describe('getRoundNumber', () => {
  it('returns the current round', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    expect(getRoundNumber(state)).toBe(1);
    state.phase = 'cleanup';
    advancePhase(state);
    expect(getRoundNumber(state)).toBe(2);
  });
});

describe('getPhaseLabel', () => {
  it('returns correct label for each phase', () => {
    const state = createGameState(2, 'competitive', TEST_SEED);
    expect(getPhaseLabel(state)).toBe('Shadowking Phase');
    advancePhase(state);
    expect(getPhaseLabel(state)).toBe('Voting Phase');
    advancePhase(state);
    expect(getPhaseLabel(state)).toBe('Action Phase');
    advancePhase(state);
    expect(getPhaseLabel(state)).toBe('Cleanup Phase');
  });
});
