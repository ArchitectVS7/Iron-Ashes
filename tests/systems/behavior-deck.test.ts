/**
 * Tests for the Behavior Deck System (F-007)
 *
 * Covers: deck creation, card composition, draw mechanics, auto-reshuffle,
 * deck initialization, and inspection helpers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBehaviorDeck,
  drawBehaviorCard,
  initializeBehaviorDeck,
  countCardTypes,
} from '../../src/systems/behavior-deck.js';
import { createGameState } from '../../src/engine/game-loop.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import {
  GameState,
  BehaviorCard,
  DEFAULT_BEHAVIOR_DECK_COMPOSITION,
  COOPERATIVE_BEHAVIOR_DECK_COMPOSITION,
} from '../../src/models/game-state.js';

// ─── Test Helpers ─────────────────────────────────────────────────

function makeState(seed: number = 42): GameState {
  return createGameState(2, 'competitive', seed);
}

function makeRng(seed: number = 42): SeededRandom {
  return new SeededRandom(seed);
}

// ─── createBehaviorDeck ───────────────────────────────────────────

describe('createBehaviorDeck()', () => {
  it('creates 20 cards with the default composition', () => {
    const deck = createBehaviorDeck();
    expect(deck.length).toBe(20);
  });

  it('default composition has correct card type counts', () => {
    const deck = createBehaviorDeck();
    const types = countCardTypes(deck);
    expect(types.spawn).toBe(6);
    expect(types.move).toBe(6);
    expect(types.claim).toBe(4);
    expect(types.assault).toBe(3);
    expect(types.escalate).toBe(1);
  });

  it('cooperative composition has correct card type counts', () => {
    const deck = createBehaviorDeck(COOPERATIVE_BEHAVIOR_DECK_COMPOSITION);
    const types = countCardTypes(deck);
    expect(types.spawn).toBe(5);
    expect(types.move).toBe(6);
    expect(types.claim).toBe(2);
    expect(types.assault).toBe(4);
    expect(types.escalate).toBe(3);
    expect(deck.length).toBe(20);
  });

  it('creates cards with unique IDs', () => {
    const deck = createBehaviorDeck();
    const ids = deck.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(deck.length);
  });

  it('card IDs follow the {type}-{n} pattern', () => {
    const deck = createBehaviorDeck();
    for (const card of deck) {
      expect(card.id).toMatch(/^(spawn|move|claim|assault|escalate)-\d+$/);
    }
  });

  it('returns an empty array for a zero-count composition', () => {
    const deck = createBehaviorDeck({ spawn: 0, move: 0, claim: 0, assault: 0, escalate: 0 });
    expect(deck.length).toBe(0);
  });

  it('accepts a custom single-type composition', () => {
    const deck = createBehaviorDeck({ escalate: 3 });
    expect(deck.length).toBe(3);
    expect(deck.every(c => c.type === 'escalate')).toBe(true);
  });

  it('indexes each type starting from 1', () => {
    const deck = createBehaviorDeck({ spawn: 3 });
    const ids = deck.map(c => c.id);
    expect(ids).toContain('spawn-1');
    expect(ids).toContain('spawn-2');
    expect(ids).toContain('spawn-3');
    expect(ids).not.toContain('spawn-0');
  });
});

// ─── drawBehaviorCard ─────────────────────────────────────────────

describe('drawBehaviorCard()', () => {
  let state: GameState;
  let rng: SeededRandom;

  beforeEach(() => {
    state = makeState();
    rng = makeRng();
    initializeBehaviorDeck(state, rng);
  });

  it('sets currentBehaviorCard after drawing', () => {
    expect(state.currentBehaviorCard).toBeNull();
    drawBehaviorCard(state, rng);
    expect(state.currentBehaviorCard).not.toBeNull();
  });

  it('reduces the draw pile by one', () => {
    const before = state.behaviorDeck.length;
    drawBehaviorCard(state, rng);
    expect(state.behaviorDeck.length).toBe(before - 1);
  });

  it('moves the previous current card to discard on subsequent draws', () => {
    drawBehaviorCard(state, rng);
    const firstCard = state.currentBehaviorCard!;
    drawBehaviorCard(state, rng);
    expect(state.behaviorDiscard).toContainEqual(firstCard);
  });

  it('accumulates discard correctly over multiple draws', () => {
    for (let i = 0; i < 5; i++) {
      drawBehaviorCard(state, rng);
    }
    // After 5 draws: 4 cards in discard (each draw moves previous current to discard)
    expect(state.behaviorDiscard.length).toBe(4);
  });

  it('auto-reshuffles discard pile when draw pile is exhausted', () => {
    // Drain the entire draw pile
    const totalCards = state.behaviorDeck.length;
    for (let i = 0; i <= totalCards; i++) {
      drawBehaviorCard(state, rng);
    }
    // At this point the deck was exhausted and reshuffled; we drew one more
    // so deck should have (totalCards - 1) cards again
    expect(state.behaviorDeck.length).toBe(totalCards - 1);
    expect(state.currentBehaviorCard).not.toBeNull();
  });

  it('discard is cleared after auto-reshuffle', () => {
    const totalCards = state.behaviorDeck.length;
    // Draw all cards to empty the draw pile
    for (let i = 0; i <= totalCards; i++) {
      drawBehaviorCard(state, rng);
    }
    // One card is now the current; rest should be in the new draw pile
    const deckCount = state.behaviorDeck.length;
    const discardCount = state.behaviorDiscard.length;
    // Total should be totalCards (one is current)
    expect(deckCount + discardCount + 1).toBe(totalCards);
  });

  it('throws when both draw pile and discard are empty', () => {
    state.behaviorDeck = [];
    state.behaviorDiscard = [];
    state.currentBehaviorCard = null;
    expect(() => drawBehaviorCard(state, rng)).toThrow();
  });

  it('drawn card has a valid BehaviorCardType', () => {
    const validTypes = new Set(['spawn', 'move', 'claim', 'assault', 'escalate']);
    const card = drawBehaviorCard(state, rng);
    expect(validTypes.has(card.type)).toBe(true);
  });
});

// ─── initializeBehaviorDeck ───────────────────────────────────────

describe('initializeBehaviorDeck()', () => {
  it('populates behaviorDeck with the expected card count', () => {
    const state = makeState();
    const rng = makeRng();
    initializeBehaviorDeck(state, rng);
    const expectedTotal = Object.values(DEFAULT_BEHAVIOR_DECK_COMPOSITION).reduce(
      (sum, n) => sum + n,
      0,
    );
    expect(state.behaviorDeck.length).toBe(expectedTotal);
  });

  it('clears the discard pile', () => {
    const state = makeState();
    const rng = makeRng();
    state.behaviorDiscard = [{ id: 'spawn-1', type: 'spawn' }];
    initializeBehaviorDeck(state, rng);
    expect(state.behaviorDiscard.length).toBe(0);
  });

  it('clears currentBehaviorCard', () => {
    const state = makeState();
    const rng = makeRng();
    state.currentBehaviorCard = { id: 'escalate-1', type: 'escalate' };
    initializeBehaviorDeck(state, rng);
    expect(state.currentBehaviorCard).toBeNull();
  });

  it('produces a different order with a different seed', () => {
    const state1 = makeState(1);
    const state2 = makeState(2);
    initializeBehaviorDeck(state1, new SeededRandom(1));
    initializeBehaviorDeck(state2, new SeededRandom(999));
    const order1 = state1.behaviorDeck.map(c => c.id).join(',');
    const order2 = state2.behaviorDeck.map(c => c.id).join(',');
    // Different seeds produce different orderings (probabilistic, overwhelmingly likely)
    expect(order1).not.toBe(order2);
  });

  it('is reproducible with the same seed', () => {
    const state1 = makeState(42);
    const state2 = makeState(42);
    initializeBehaviorDeck(state1, new SeededRandom(42));
    initializeBehaviorDeck(state2, new SeededRandom(42));
    const order1 = state1.behaviorDeck.map(c => c.id).join(',');
    const order2 = state2.behaviorDeck.map(c => c.id).join(',');
    expect(order1).toBe(order2);
  });

  it('accepts a custom composition (cooperative)', () => {
    const state = makeState();
    const rng = makeRng();
    initializeBehaviorDeck(state, rng, COOPERATIVE_BEHAVIOR_DECK_COMPOSITION);
    const types = countCardTypes(state.behaviorDeck);
    expect(types.escalate).toBe(3);
    expect(types.assault).toBe(4);
  });
});

// ─── countCardTypes ───────────────────────────────────────────────

describe('countCardTypes()', () => {
  it('counts zero for all types on an empty deck', () => {
    const counts = countCardTypes([]);
    expect(counts.spawn).toBe(0);
    expect(counts.move).toBe(0);
    expect(counts.claim).toBe(0);
    expect(counts.assault).toBe(0);
    expect(counts.escalate).toBe(0);
  });

  it('counts a single-type deck correctly', () => {
    const deck: BehaviorCard[] = [
      { id: 'spawn-1', type: 'spawn' },
      { id: 'spawn-2', type: 'spawn' },
    ];
    const counts = countCardTypes(deck);
    expect(counts.spawn).toBe(2);
    expect(counts.move).toBe(0);
  });

  it('counts a mixed deck correctly', () => {
    const deck = createBehaviorDeck();
    const counts = countCardTypes(deck);
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    expect(total).toBe(deck.length);
  });
});
