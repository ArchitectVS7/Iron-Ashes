/**
 * Game Loop — Turn Structure & Round Lifecycle
 *
 * Entry point for creating a new game session and advancing the round
 * through its four phases: shadowking → voting → action → cleanup.
 *
 * All randomness goes through SeededRandom. No Math.random().
 */

import {
  GameState,
  GameMode,
  GamePhase,
  BehaviorCard,
  BehaviorCardType,
  AntagonistForce,
  DEFAULT_BEHAVIOR_DECK_COMPOSITION,
  COOPERATIVE_BEHAVIOR_DECK_COMPOSITION,
  DOOM_TOLL_MIN,
  DOOM_TOLL_FINAL_PHASE_THRESHOLD,
  THREE_PLAYER_STARTING_DOOM_TOLL,
  ACTIONS_PER_TURN_NORMAL,
  ACTIONS_PER_TURN_BROKEN,
  LIEUTENANT_POWER,
  LIEUTENANT_START_COUNT,
} from '../models/game-state.js';
import {
  KNOWN_LANDS,
  createInitialBoardState,
  selectWandererNodes,
} from '../models/board.js';
import { createPlayer } from '../models/player.js';
import { createStartingFellowship } from '../models/characters.js';
import { SeededRandom } from '../utils/seeded-random.js';
import { generateBanners, discardUnspentBanners, replenishFateCards } from '../systems/resources.js';
import { generateWandererPool } from '../systems/characters.js';

// ─── Behavior Deck ────────────────────────────────────────────────

/**
 * Create a shuffled Behavior Deck from a given composition.
 *
 * Each card type gets a sequential ID prefix (e.g. "spawn-1", "move-3").
 * Default composition: 20 cards (6 spawn, 6 move, 4 claim, 3 assault, 1 escalate).
 * Cooperative composition: 20 cards (5 spawn, 6 move, 2 claim, 4 assault, 3 escalate).
 *
 * @param rng         - Seeded random for shuffle determinism
 * @param composition - Card type counts (defaults to DEFAULT_BEHAVIOR_DECK_COMPOSITION)
 */
export function createBehaviorDeck(
  rng: SeededRandom,
  composition: Record<BehaviorCardType, number> = DEFAULT_BEHAVIOR_DECK_COMPOSITION,
): BehaviorCard[] {
  const cards: BehaviorCard[] = [];

  for (const [cardType, count] of Object.entries(composition) as Array<
    [BehaviorCardType, number]
  >) {
    for (let i = 1; i <= count; i++) {
      cards.push({ id: `${cardType}-${i}`, type: cardType });
    }
  }

  return rng.shuffle(cards);
}

// ─── Fate Deck ────────────────────────────────────────────────────

/**
 * Create a shuffled Fate Deck with the specified value distribution.
 *
 * Distribution (50 cards total):
 *   - 25 blanks (value 0, explicit blank)
 *   - 4 zeros (value 0, non-blank zeros)
 *   - 6 ones (value 1)
 *   - 7 twos (value 2)
 *   - 5 threes (value 3)
 *   - 2 fours (value 4)
 *   - 1 negative one (value -1)
 */
export function createFateDeck(rng: SeededRandom): number[] {
  const deck: number[] = [
    // 25 blanks treated as 0
    ...Array(25).fill(0),
    // 4 explicit zero cards
    ...Array(4).fill(0),
    // 6 ones
    ...Array(6).fill(1),
    // 7 twos
    ...Array(7).fill(2),
    // 5 threes
    ...Array(5).fill(3),
    // 2 fours
    ...Array(2).fill(4),
    // 1 negative one
    -1,
  ];

  return rng.shuffle(deck);
}

// ─── Game Initialization ─────────────────────────────────────────

/**
 * Create the initial GameState for a new session.
 *
 * @param playerCount - Number of players (2-4)
 * @param mode        - Game mode
 * @param seed        - RNG seed for determinism
 */
export function createGameState(
  playerCount: number,
  mode: GameMode,
  seed: number,
): GameState {
  if (playerCount < 2 || playerCount > 4) {
    throw new Error(`playerCount must be 2-4, got ${playerCount}`);
  }

  const rng = new SeededRandom(seed);
  const boardDefinition = KNOWN_LANDS;

  // Select and place wanderer tokens
  const wandererNodeIds = selectWandererNodes(boardDefinition, rng);
  const _wandererPool = generateWandererPool(rng);

  // Build the board state with starting keep ownership + wanderers
  const boardState = createInitialBoardState(boardDefinition, wandererNodeIds);

  // Create players — only create for the number of players actually playing.
  // Courts are assigned 0..playerCount-1; unused courts have no player.
  const players = [];
  for (let i = 0; i < playerCount; i++) {
    const keepId = boardDefinition.startingKeeps[i];
    const fellowship = createStartingFellowship(i, keepId, `court-${i}`);
    const player = createPlayer(i, 'human', fellowship);
    // Set initial actionsRemaining based on (non-)broken status
    player.actionsRemaining = ACTIONS_PER_TURN_NORMAL;
    players.push(player);
  }

  // For courts without players (5th+ keeps in a 2/3 player game),
  // pre-claim those keeps to nobody (they stay null from createInitialBoardState).
  // Only the active player courts (0..playerCount-1) have their keeps pre-claimed
  // by createInitialBoardState, so unclaimed courts (playerCount..3) remain null.

  // Create shuffled decks — cooperative mode uses a harder composition
  const deckComposition = mode === 'cooperative'
    ? COOPERATIVE_BEHAVIOR_DECK_COMPOSITION
    : DEFAULT_BEHAVIOR_DECK_COMPOSITION;
  const behaviorDeck = createBehaviorDeck(rng, deckComposition);
  const fateDeck = createFateDeck(rng);

  // Randomly assign a fixed turn order for the session's Action Phases.
  // Done last so it does not affect prior RNG-dependent outputs (wanderers, decks).
  const turnOrder = rng.shuffle(Array.from({ length: playerCount }, (_, i) => i));

  // Place starting lieutenants at the antagonist base
  const antagonistForces: AntagonistForce[] = [];
  for (let i = 1; i <= LIEUTENANT_START_COUNT; i++) {
    antagonistForces.push({
      id: `lieutenant-${i}`,
      type: 'lieutenant',
      powerLevel: LIEUTENANT_POWER,
      currentNode: boardDefinition.antagonistBase,
    });
  }

  // Map wanderer roles to wanderer nodes (1:1 correspondence)
  // This is stored implicitly via boardState.hasWanderer; the wandererPool
  // ordering matches selectWandererNodes ordering and is used during recruit.
  // We log the mapping in actionLog for determinism audits (not needed here).

  const doomToll = playerCount === 3 ? THREE_PLAYER_STARTING_DOOM_TOLL : DOOM_TOLL_MIN;

  const state: GameState = {
    boardDefinition,
    boardState,
    players,
    mode,
    round: 1,
    phase: 'shadowking',
    activePlayerIndex: 0,
    doomToll,
    isFinalPhase: doomToll >= DOOM_TOLL_FINAL_PHASE_THRESHOLD,
    antagonistForces,
    behaviorDeck,
    behaviorDiscard: [],
    currentBehaviorCard: null,
    fateDeck,
    fateDiscard: [],
    artifactNode: boardDefinition.antagonistBase,
    artifactHolder: null,
    turnOrder,
    votes: Array(playerCount).fill(null) as (null)[],
    accusationCooldownRounds: 0,
    gameEndReason: null,
    winner: null,
    seed,
    actionLog: [],
  };

  // Generate starting banners for all players (round 1 production)
  for (const player of state.players) {
    generateBanners(player, boardDefinition);
  }

  // Deal starting Fate Card hands (3 cards per player)
  for (const player of state.players) {
    replenishFateCards(player, state);
  }

  return state;
}

// ─── Phase Advancement ────────────────────────────────────────────

const PHASE_ORDER: readonly GamePhase[] = ['shadowking', 'voting', 'action', 'cleanup'];

/**
 * Advance the game state to the next phase.
 *
 * Phase order per round:
 *   shadowking → voting → action → cleanup → (next round) shadowking
 *
 * Side effects by transition:
 *   - voting start:  reset all player votes to null
 *   - action start:  set activePlayerIndex=0, set actionsRemaining per player
 *   - cleanup→shadowking: increment round, discard banners, generate new banners
 *
 * Mutates and returns the state.
 */
export function advancePhase(state: GameState): GameState {
  const currentIndex = PHASE_ORDER.indexOf(state.phase);
  const nextIndex = (currentIndex + 1) % PHASE_ORDER.length;
  const nextPhase = PHASE_ORDER[nextIndex];

  // Cleanup → Shadowking transition (new round)
  if (state.phase === 'cleanup' && nextPhase === 'shadowking') {
    startCleanup(state);
    state.round += 1;
  }

  state.phase = nextPhase;

  // Apply phase-entry side effects
  if (nextPhase === 'voting') {
    state.votes = state.players.map(() => null);
  } else if (nextPhase === 'action') {
    state.activePlayerIndex = state.turnOrder[0];
    for (const player of state.players) {
      player.actionsRemaining = player.isBroken
        ? ACTIONS_PER_TURN_BROKEN
        : ACTIONS_PER_TURN_NORMAL;
    }
  }

  return state;
}

// ─── Action Turn Management ───────────────────────────────────────

/**
 * Check whether all players have exhausted their actions for this round.
 */
export function isActionPhaseComplete(state: GameState): boolean {
  return state.players.every(p => p.actionsRemaining <= 0);
}

/**
 * Advance to the next player's action turn.
 *
 * If all players are done, advance the phase to cleanup.
 * Otherwise, advance activePlayerIndex to the next player (wrapping if
 * needed, though in practice players exhaust their actions before we wrap).
 *
 * Mutates and returns the state.
 */
export function advanceActionTurn(state: GameState): GameState {
  if (state.phase !== 'action') {
    return state;
  }

  if (isActionPhaseComplete(state)) {
    advancePhase(state);
    return state;
  }

  // Walk through turnOrder to find the next player who still has actions remaining
  const order = state.turnOrder;
  const orderLen = order.length;
  const currentPos = order.indexOf(state.activePlayerIndex);
  let nextPos = (currentPos + 1) % orderLen;
  let checked = 0;
  while (state.players[order[nextPos]].actionsRemaining <= 0 && checked < orderLen) {
    nextPos = (nextPos + 1) % orderLen;
    checked++;
  }

  state.activePlayerIndex = order[nextPos];
  return state;
}

// ─── Round Lifecycle ──────────────────────────────────────────────

/**
 * Begin a new round: draw a Behavior Card and set phase to shadowking.
 *
 * If the behavior deck is empty, shuffle the discard pile back in.
 *
 * Mutates and returns the state.
 */
export function startRound(state: GameState): GameState {
  // Reshuffle discard into deck if needed
  if (state.behaviorDeck.length === 0 && state.behaviorDiscard.length > 0) {
    // Shuffle using a deterministic fork — we don't have an rng reference here,
    // so we create a new one derived from the seed + round for reproducibility.
    const rng = new SeededRandom(state.seed ^ (state.round * 0x9e3779b9));
    state.behaviorDeck = rng.shuffle([...state.behaviorDiscard]);
    state.behaviorDiscard = [];
  }

  // Draw the top behavior card
  const drawn = state.behaviorDeck.pop() ?? null;
  if (drawn !== null) {
    if (state.currentBehaviorCard !== null) {
      state.behaviorDiscard.push(state.currentBehaviorCard);
    }
    state.currentBehaviorCard = drawn;
  }

  state.phase = 'shadowking';
  return state;
}

/**
 * Execute end-of-round cleanup: discard unspent banners and generate new ones.
 *
 * Called automatically as part of the cleanup→shadowking phase transition
 * in advancePhase. Also callable directly for testing.
 *
 * Mutates and returns the state.
 */
export function startCleanup(state: GameState): GameState {
  for (const player of state.players) {
    discardUnspentBanners(player);
    generateBanners(player, state.boardDefinition);
    replenishFateCards(player, state);
  }
  return state;
}

// ─── Turn Indicator & Round Counter ──────────────────────────────

/** Display-friendly phase labels for the turn indicator. */
const PHASE_LABELS: Record<GamePhase, string> = {
  shadowking: 'Shadowking Phase',
  voting: 'Voting Phase',
  action: 'Action Phase',
  cleanup: 'Cleanup Phase',
};

/**
 * Summary of the current turn state, suitable for driving a turn indicator UI.
 */
export interface TurnIndicator {
  /** Current round number (1-based). */
  readonly round: number;
  /** Current phase of the round. */
  readonly phase: GamePhase;
  /** Human-readable phase label. */
  readonly phaseLabel: string;
  /** Index of the active player (only meaningful during 'action' phase). */
  readonly activePlayerIndex: number;
  /** Whether it is the action phase. */
  readonly isActionPhase: boolean;
  /** Whether it is the voting phase. */
  readonly isVotingPhase: boolean;
}

/**
 * Get the current turn indicator state.
 *
 * Provides all information needed to render a turn indicator and round counter:
 *   - Current round number
 *   - Current phase and human-readable label
 *   - Active player index (during action phase)
 *   - Convenience booleans for phase queries
 */
export function getTurnIndicator(state: GameState): TurnIndicator {
  return {
    round: state.round,
    phase: state.phase,
    phaseLabel: PHASE_LABELS[state.phase],
    activePlayerIndex: state.activePlayerIndex,
    isActionPhase: state.phase === 'action',
    isVotingPhase: state.phase === 'voting',
  };
}

/**
 * Get the current round number.
 */
export function getRoundNumber(state: GameState): number {
  return state.round;
}

/**
 * Get the current phase label as a human-readable string.
 */
export function getPhaseLabel(state: GameState): string {
  return PHASE_LABELS[state.phase];
}
