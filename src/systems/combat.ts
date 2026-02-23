/**
 * Combat System — The War Field (F-004)
 *
 * Handles player-vs-player combat, player-vs-Shadowking-force combat,
 * Fate Card drawing and resolution, Doom Toll tracking, and Broken Court
 * status management.
 *
 * All randomness goes through SeededRandom. No Math.random().
 */

import { GameState, DOOM_TOLL_MAX, DOOM_TOLL_MIN, DOOM_TOLL_FINAL_PHASE_THRESHOLD } from '../models/game-state.js';
import { Player } from '../models/player.js';
import { SeededRandom } from '../utils/seeded-random.js';
import { getFellowshipPower, hasDiplomaticProtection } from './characters.js';

// ─── Doom Toll Helpers ────────────────────────────────────────────

/**
 * Advance the Doom Toll by a given amount, capped at DOOM_TOLL_MAX (13).
 * Updates isFinalPhase when the threshold is crossed.
 *
 * Mutates state in place.
 */
export function advanceDoomToll(state: GameState, amount: number): void {
  state.doomToll = Math.min(state.doomToll + amount, DOOM_TOLL_MAX);
  (state as GameState & { isFinalPhase: boolean }).isFinalPhase =
    state.doomToll >= DOOM_TOLL_FINAL_PHASE_THRESHOLD;
}

/**
 * Decrease the Doom Toll by a given amount, floored at DOOM_TOLL_MIN (0).
 * Updates isFinalPhase accordingly.
 *
 * Mutates state in place.
 */
export function recedeDoomToll(state: GameState, amount: number): void {
  state.doomToll = Math.max(state.doomToll - amount, DOOM_TOLL_MIN);
  (state as GameState & { isFinalPhase: boolean }).isFinalPhase =
    state.doomToll >= DOOM_TOLL_FINAL_PHASE_THRESHOLD;
}

// ─── Combat Strength ─────────────────────────────────────────────

/**
 * Calculate the base combat strength of a player.
 *
 * Base strength = total Fellowship power (sum of all character Power Levels)
 * plus current War Banners.
 */
export function calculateBaseStrength(player: Player): number {
  return getFellowshipPower(player.fellowship) + player.warBanners;
}

// ─── Fate Card Drawing ────────────────────────────────────────────

/**
 * The leader role has a fixed Power Level of 8.
 * Attacker draws ceil(leaderPower / 4) = ceil(8 / 4) = 2 cards.
 * Defender draws one fewer (min 1), so 1 card.
 */
const LEADER_POWER = 8;
const ATTACKER_FATE_DRAW = Math.ceil(LEADER_POWER / 4); // 2
const DEFENDER_FATE_DRAW = Math.max(1, ATTACKER_FATE_DRAW - 1); // 1

/**
 * Return the number of Fate Cards an attacker draws.
 * Always ceil(8/4) = 2.
 */
export function calculateFateCardDraw(_player: Player): number {
  return ATTACKER_FATE_DRAW;
}

/**
 * Draw `count` cards from the Fate Deck.
 *
 * Cards are popped from the end of state.fateDeck (end = top of deck).
 * If the deck runs out mid-draw:
 *   - Shuffle state.fateDiscard into a new fateDeck using a deterministic
 *     sub-seed derived from state.seed XOR state.round.
 *   - Advance Doom Toll by 1 (reshuffling is a sign of desperate times).
 *   - Continue drawing from the new deck.
 *
 * Returns the array of drawn card values (in draw order).
 */
export function drawFateCards(state: GameState, count: number): number[] {
  const drawn: number[] = [];

  for (let i = 0; i < count; i++) {
    if (state.fateDeck.length === 0) {
      // Reshuffle discard into deck using deterministic sub-seed.
      const subSeed = state.seed ^ (state.round * 0x9e3779b9);
      const rng = new SeededRandom(subSeed);
      state.fateDeck = rng.shuffle([...state.fateDiscard]);
      state.fateDiscard = [];
      // Reshuffling advances the Doom Toll.
      advanceDoomToll(state, 1);
    }

    // Pop from end (top of deck). If still empty after reshuffle (edge case
    // where discard was also empty), push 0 as a safe fallback.
    const card = state.fateDeck.pop();
    drawn.push(card ?? 0);
  }

  return drawn;
}

// ─── Combat Result ────────────────────────────────────────────────

/** The result of resolving a single combat encounter. */
export interface CombatResult {
  readonly attackerStrength: number;
  readonly defenderStrength: number;
  readonly attackerCardValue: number;
  readonly defenderCardValue: number;
  readonly margin: number;
  readonly winner: 'attacker' | 'defender';
  readonly penaltyCards: number;
}

// ─── Player-vs-Player Combat ──────────────────────────────────────

/**
 * Resolve combat between two players.
 *
 * Steps:
 *   1. Calculate base strength for attacker and defender.
 *   2. Attacker draws 2 Fate Cards, picks one (attackerCardChoice index).
 *   3. Defender draws 1 Fate Card (forced to index 0).
 *   4. Add chosen card values to base strengths (total floored at 0).
 *   5. Higher total wins; ties go to defender.
 *   6. Loser gains penaltyCards equal to the margin.
 *   7. Update combat stats (combatsWon / combatsLost).
 *   8. Check if loser is now Broken (penaltyCards >= warBanners):
 *      - If newly broken: set isBroken=true, increment stats.timesBroken,
 *        advance Doom Toll by 1.
 *   9. Discard unchosen Fate Cards to fateDiscard.
 *
 * Mutates state and both players in place.
 */
export function resolvePlayerCombat(
  state: GameState,
  attackerIndex: number,
  defenderIndex: number,
  attackerCardChoice: number,
  defenderCardChoice: number,
  rng: SeededRandom,
): CombatResult {
  const attacker = state.players[attackerIndex];
  const defender = state.players[defenderIndex];

  const attackerBase = calculateBaseStrength(attacker);
  const defenderBase = calculateBaseStrength(defender);

  // Draw fate cards for each side.
  const attackerCards = drawFateCards(state, ATTACKER_FATE_DRAW);
  const defenderCards = drawFateCards(state, DEFENDER_FATE_DRAW);

  // Clamp card choice indices to valid range.
  const aSafeChoice = Math.min(attackerCardChoice, attackerCards.length - 1);
  const dSafeChoice = Math.min(defenderCardChoice, defenderCards.length - 1);

  const attackerCardValue = attackerCards[aSafeChoice];
  const defenderCardValue = defenderCards[dSafeChoice];

  // Total strengths (floored at 0).
  const attackerTotal = Math.max(0, attackerBase + attackerCardValue);
  const defenderTotal = Math.max(0, defenderBase + defenderCardValue);

  // Ties go to defender.
  const winner: 'attacker' | 'defender' = attackerTotal > defenderTotal
    ? 'attacker'
    : 'defender';

  const margin = Math.abs(attackerTotal - defenderTotal);
  const loser = winner === 'attacker' ? defender : attacker;
  const loserIsAttacker = winner === 'defender';

  // Apply penalty cards to loser.
  const wasAlreadyBroken = loser.isBroken;
  loser.penaltyCards += margin;

  // Update combat stats.
  if (winner === 'attacker') {
    attacker.stats.combatsWon += 1;
    defender.stats.combatsLost += 1;
  } else {
    defender.stats.combatsWon += 1;
    attacker.stats.combatsLost += 1;
  }

  // Check if loser is newly broken.
  if (!wasAlreadyBroken && loser.penaltyCards >= loser.warBanners) {
    loser.isBroken = true;
    loser.stats.timesBroken += 1;
    advanceDoomToll(state, 1);
  }

  // Discard unchosen fate cards to fateDiscard.
  for (let i = 0; i < attackerCards.length; i++) {
    if (i !== aSafeChoice) {
      state.fateDiscard.push(attackerCards[i]);
    }
  }
  for (let i = 0; i < defenderCards.length; i++) {
    if (i !== dSafeChoice) {
      state.fateDiscard.push(defenderCards[i]);
    }
  }

  // Suppress unused parameter warning — rng passed for future use / signature
  // consistency with resolveShadowkingCombat.
  void rng;

  return {
    attackerStrength: attackerTotal,
    defenderStrength: defenderTotal,
    attackerCardValue,
    defenderCardValue,
    margin,
    winner,
    penaltyCards: margin,
  };
}

// ─── Player-vs-Shadowking Combat ──────────────────────────────────

/**
 * Resolve combat between a player and a Shadowking antagonist force.
 *
 * The player is always the attacker. Shadowking forces have a fixed
 * strength (no Fate Cards, no War Banners):
 *   - Lieutenant: 10
 *   - Minion:      6
 *
 * Steps:
 *   1. Player draws 2 Fate Cards, picks one (cardChoice index).
 *   2. Player total = base strength + card value (floored at 0).
 *   3. Force strength is fixed. Ties go to the defender (Shadowking force).
 *   4. If player wins: remove force from state.antagonistForces.
 *      If it was a lieutenant, recede Doom Toll by 1.
 *   5. If player loses: apply penalty cards, check Broken status.
 *   6. Discard unchosen fate cards to fateDiscard.
 *
 * Mutates state and player in place.
 */
export function resolveShadowkingCombat(
  state: GameState,
  playerIndex: number,
  forceId: string,
  cardChoice: number,
  rng: SeededRandom,
): CombatResult {
  const player = state.players[playerIndex];

  const forceIndex = state.antagonistForces.findIndex(f => f.id === forceId);
  if (forceIndex === -1) {
    throw new Error(`Shadowking force '${forceId}' not found in state.`);
  }
  const force = state.antagonistForces[forceIndex];

  const playerBase = calculateBaseStrength(player);

  // Player draws 2 fate cards as the attacker.
  const playerCards = drawFateCards(state, ATTACKER_FATE_DRAW);

  const safeChoice = Math.min(cardChoice, playerCards.length - 1);
  const chosenCardValue = playerCards[safeChoice];

  const playerTotal = Math.max(0, playerBase + chosenCardValue);
  const forceTotal = force.powerLevel;

  // Ties go to defender (Shadowking force).
  const winner: 'attacker' | 'defender' = playerTotal > forceTotal
    ? 'attacker'
    : 'defender';

  const margin = Math.abs(playerTotal - forceTotal);

  if (winner === 'attacker') {
    // Player wins — remove force from state.
    state.antagonistForces.splice(forceIndex, 1);
    player.stats.combatsWon += 1;
    // Lieutenant kill recedes Doom Toll by 1.
    if (force.type === 'lieutenant') {
      recedeDoomToll(state, 1);
    }
  } else {
    // Force wins — penalise player.
    const wasAlreadyBroken = player.isBroken;
    player.penaltyCards += margin;
    player.stats.combatsLost += 1;

    if (!wasAlreadyBroken && player.penaltyCards >= player.warBanners) {
      player.isBroken = true;
      player.stats.timesBroken += 1;
      advanceDoomToll(state, 1);
    }
  }

  // Discard unchosen fate cards to fateDiscard.
  for (let i = 0; i < playerCards.length; i++) {
    if (i !== safeChoice) {
      state.fateDiscard.push(playerCards[i]);
    }
  }

  // Suppress unused parameter warning.
  void rng;

  return {
    attackerStrength: playerTotal,
    defenderStrength: forceTotal,
    attackerCardValue: chosenCardValue,
    defenderCardValue: 0,
    margin,
    winner,
    penaltyCards: winner === 'defender' ? margin : 0,
  };
}

// ─── Combat Precondition Checks ───────────────────────────────────

/**
 * Check whether a player may initiate any combat.
 *
 * Requirements:
 *   - Player is not in Broken Court state.
 *   - Player has at least one action remaining.
 */
export function canInitiateCombat(player: Player): boolean {
  if (player.isBroken) return false;
  if (player.actionsRemaining <= 0) return false;
  return true;
}

/**
 * Check whether an attacker can initiate combat against a specific defender.
 *
 * Requirements:
 *   1. Attacker can initiate combat (canInitiateCombat).
 *   2. Defender's fellowship is on the same node as the attacker's.
 *   3. Defender does NOT have diplomatic protection.
 */
export function canInitiateCombatAgainstPlayer(
  attacker: Player,
  defender: Player,
  allPlayers: Player[],
): boolean {
  if (!canInitiateCombat(attacker)) return false;
  if (attacker.fellowship.currentNode !== defender.fellowship.currentNode) return false;
  if (hasDiplomaticProtection(defender, allPlayers)) return false;
  return true;
}
