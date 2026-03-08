/**
 * Behavior Deck System — Shadowking Phase (F-007)
 *
 * Manages the Shadowking's Behavior Card deck: creation from composition,
 * shuffling, and drawing. When the draw pile is exhausted, the discard pile
 * is reshuffled to form a new draw pile (no infinite-escalate exploit).
 *
 * All randomness goes through SeededRandom. No Math.random().
 *
 * Default composition (balanced post-fix):
 *   6 SPAWN · 6 MOVE · 4 CLAIM · 3 ASSAULT · 1 ESCALATE = 20 cards
 *
 * Cooperative composition:
 *   5 SPAWN · 6 MOVE · 2 CLAIM · 4 ASSAULT · 3 ESCALATE = 20 cards
 */

import {
  GameState,
  BehaviorCard,
  BehaviorCardType,
  DEFAULT_BEHAVIOR_DECK_COMPOSITION,
} from '../models/game-state.js';
import { SeededRandom } from '../utils/seeded-random.js';

// ─── Deck Creation ────────────────────────────────────────────────

/**
 * Build an ordered (unshuffled) Behavior Card deck from a composition map.
 *
 * Cards are grouped by type in the order: spawn → move → claim → assault → escalate.
 * Each card receives a unique ID of the form `{type}-{n}` (1-indexed within its type).
 *
 * @param composition - Map of BehaviorCardType → count. Missing types are treated as 0.
 * @returns A new BehaviorCard array with exactly Σ(counts) cards.
 */
export function createBehaviorDeck(
  composition: Partial<Record<BehaviorCardType, number>> = DEFAULT_BEHAVIOR_DECK_COMPOSITION,
): BehaviorCard[] {
  const typeOrder: BehaviorCardType[] = ['spawn', 'move', 'claim', 'assault', 'escalate'];
  const deck: BehaviorCard[] = [];

  for (const type of typeOrder) {
    const count = composition[type] ?? 0;
    for (let i = 1; i <= count; i++) {
      deck.push({ id: `${type}-${i}`, type });
    }
  }

  return deck;
}

// ─── Draw ──────────────────────────────────────────────────────────

/**
 * Draw the top card from `state.behaviorDeck` and set it as `state.currentBehaviorCard`.
 *
 * Auto-reshuffle: if the draw pile is empty, the discard pile is shuffled
 * back into it using `rng` before drawing. This prevents exhaustion from
 * halting Shadowking phase resolution.
 *
 * Side-effects on state:
 *   - Pops the top card from `state.behaviorDeck`
 *   - Adds the previously-current card to `state.behaviorDiscard` (if any)
 *   - Sets `state.currentBehaviorCard` to the drawn card
 *
 * Throws if both the draw pile and discard pile are empty (should never happen
 * in a properly initialized game, but guards against corrupted state).
 */
export function drawBehaviorCard(state: GameState, rng: SeededRandom): BehaviorCard {
  // Move previously resolved card to discard
  if (state.currentBehaviorCard !== null) {
    state.behaviorDiscard.push(state.currentBehaviorCard);
    state.currentBehaviorCard = null;
  }

  // Auto-reshuffle discard into draw pile when draw pile is exhausted
  if (state.behaviorDeck.length === 0) {
    if (state.behaviorDiscard.length === 0) {
      throw new Error(
        'Behavior Deck is exhausted: both draw pile and discard pile are empty.',
      );
    }
    state.behaviorDeck = rng.shuffle([...state.behaviorDiscard]);
    state.behaviorDiscard = [];
  }

  // Draw from the top (end of array is the top — O(1) pop)
  const drawn = state.behaviorDeck.pop()!;
  state.currentBehaviorCard = drawn;
  return drawn;
}

// ─── Initialization ───────────────────────────────────────────────

/**
 * Initialize (or re-initialize) the Behavior Deck in `state`.
 *
 * Builds a fresh deck from the given composition, shuffles it with `rng`,
 * and resets the discard pile and current card.
 *
 * Call this once during game setup (or at the start of each mode's setup phase).
 *
 * @param state      - Game state to mutate.
 * @param rng        - Seeded RNG (uses the game's session seed for reproducibility).
 * @param composition - Card composition to use (defaults to the standard post-fix deck).
 */
export function initializeBehaviorDeck(
  state: GameState,
  rng: SeededRandom,
  composition: Partial<Record<BehaviorCardType, number>> = DEFAULT_BEHAVIOR_DECK_COMPOSITION,
): void {
  const deck = createBehaviorDeck(composition);
  rng.shuffle(deck);
  state.behaviorDeck = deck;
  state.behaviorDiscard = [];
  state.currentBehaviorCard = null;
}

// ─── Inspection Helpers ───────────────────────────────────────────

/**
 * Count cards of each type remaining in the draw pile.
 *
 * Useful for balance simulation and HUD display (e.g., escalate probability).
 */
export function countCardTypes(
  deck: readonly BehaviorCard[],
): Record<BehaviorCardType, number> {
  const counts: Record<BehaviorCardType, number> = {
    spawn: 0,
    move: 0,
    claim: 0,
    assault: 0,
    escalate: 0,
  };

  for (const card of deck) {
    counts[card.type]++;
  }

  return counts;
}
