/**
 * Core Game State — the single source of truth for all game data.
 *
 * All systems read from and write to this state. It must be fully
 * serializable for server-side persistence and rejoin support.
 */

import { BoardDefinition, BoardState } from './board.js';
import { Player } from './player.js';

/** The phases of a single round, in execution order. */
export type GamePhase =
  | 'shadowking'   // Shadowking draws and resolves Behavior Card
  | 'voting'       // All players vote COUNTER or ABSTAIN simultaneously
  | 'action'       // Players take actions in turn order
  | 'cleanup';     // End-of-round cleanup (discard unspent Banners, generate new)

/** Game modes that determine win conditions and hidden information. */
export type GameMode =
  | 'competitive'  // Standard — territory control victory
  | 'blood_pact'   // Traitor — one player secretly wants doom
  | 'cooperative';  // All players win together or all lose

/** How the game ended. */
export type GameEndReason =
  | 'territory_victory'  // A player holds the artifact + most strongholds
  | 'doom_complete'      // Doom track reached maximum
  | 'all_broken'         // All players simultaneously in Broken state
  | null;                // Game still in progress

/** Behavior Card types in the antagonist deck. */
export type BehaviorCardType = 'spawn' | 'move' | 'claim' | 'assault' | 'escalate';

/** A single Behavior Card. */
export interface BehaviorCard {
  readonly id: string;
  readonly type: BehaviorCardType;
}

/** An antagonist force piece on the board. */
export interface AntagonistForce {
  readonly id: string;
  readonly type: 'lieutenant' | 'minion';
  readonly powerLevel: number;
  currentNode: string;
}

/** Vote choice for the Voting Phase. */
export type VoteChoice = 'counter' | 'abstain';

/** The complete game state. */
export interface GameState {
  /** The board graph definition (immutable during play). */
  readonly boardDefinition: BoardDefinition;
  /** Runtime board node ownership and occupation. */
  boardState: BoardState;

  /** All players (2-4). */
  players: Player[];
  /** The game mode for this session. */
  readonly mode: GameMode;

  /** Current round number (1-based). */
  round: number;
  /** Current phase within the round. */
  phase: GamePhase;
  /** Index of the player whose action turn it is (during 'action' phase). */
  activePlayerIndex: number;
  /** Fixed turn order for Action Phases — player indices in session-assigned order (set at setup, never changes). */
  readonly turnOrder: readonly number[];

  /** Doom track position (0-13). 13 = game over. */
  doomToll: number;
  /** Whether the game is in Final Phase (doom toll >= 10). */
  readonly isFinalPhase: boolean;

  /** Antagonist forces on the board. */
  antagonistForces: AntagonistForce[];
  /** The Behavior Card deck (draw pile). */
  behaviorDeck: BehaviorCard[];
  /** Discarded Behavior Cards. */
  behaviorDiscard: BehaviorCard[];
  /** The current Behavior Card being resolved (null between rounds). */
  currentBehaviorCard: BehaviorCard | null;

  /** Fate Card draw pile (values). */
  fateDeck: number[];
  /** Fate Card discard pile. */
  fateDiscard: number[];

  /** Node ID where the core artifact currently is. */
  artifactNode: string;
  /** Player index holding the artifact, or null. */
  artifactHolder: number | null;

  /** Votes submitted this round (indexed by player). */
  votes: (VoteChoice | null)[];

  /** Rounds remaining before any new accusation can be initiated (0 = available). */
  accusationCooldownRounds: number;

  /** How the game ended, or null if still in progress. */
  gameEndReason: GameEndReason;
  /** Index of the winning player, or null. */
  winner: number | null;

  /** The random seed for this session. */
  readonly seed: number;

  /** Action log for post-game summary and Blood Pact reveal. */
  actionLog: ActionLogEntry[];
}

/** A single logged game action for the post-game summary. */
export interface ActionLogEntry {
  readonly round: number;
  readonly phase: GamePhase;
  readonly playerIndex: number | null;
  readonly action: string;
  readonly details: string;
}

/** Default Behavior Deck composition (post-balance-fix). */
export const DEFAULT_BEHAVIOR_DECK_COMPOSITION: Record<BehaviorCardType, number> = {
  spawn: 6,
  move: 6,    // Increased from 5 to 6 (balance fix)
  claim: 4,
  assault: 3,
  escalate: 1, // Reduced from 2 to 1 (balance fix)
};

/**
 * Harder Behavior Deck for Cooperative Mode.
 *
 * More aggressive: additional ESCALATE and ASSAULT cards replace
 * SPAWN and CLAIM slots. Total remains 20 cards.
 *
 * Changes from default:
 *   - ESCALATE 1→3 (more doom pressure without a traitor to drive it)
 *   - ASSAULT 3→4 (more direct combat against players)
 *   - SPAWN 6→5 (slight reduction)
 *   - CLAIM 4→2 (fewer territory grabs — players aren't competing)
 *   - MOVE 6→6 (unchanged)
 */
export const COOPERATIVE_BEHAVIOR_DECK_COMPOSITION: Record<BehaviorCardType, number> = {
  spawn: 5,
  move: 6,
  claim: 2,
  assault: 4,
  escalate: 3,
};

/** Doom Toll constants. */
export const DOOM_TOLL_MAX = 13;
export const DOOM_TOLL_MIN = 0;
export const DOOM_TOLL_FINAL_PHASE_THRESHOLD = 10;
/** Starting Doom Toll for 3-player games — thinner voting coalition from turn one. */
export const THREE_PLAYER_STARTING_DOOM_TOLL = 2;
/** Minimum Doom Toll advance per Final Phase round (2 Behavior Cards × 1 each). Used for Estimated Rounds Remaining HUD display. */
export const FINAL_PHASE_MIN_DOOM_ADVANCE = 2;

/** Actions per turn. */
export const ACTIONS_PER_TURN_NORMAL = 2;
export const ACTIONS_PER_TURN_BROKEN = 1;

/** Fate Card cost per vote. */
export const VOTE_COST_STANDARD = 1;
export const VOTE_COST_FINAL_PHASE = 2;

/** Fate Card hand management constants. */
export const FATE_CARD_STARTING_HAND = 3;
export const FATE_CARD_BASE_HAND_LIMIT = 3;
export const FATE_CARD_MAX_HAND_LIMIT = 6;

/** Fate Card deck warning thresholds for persistent HUD display. */
export const FATE_DECK_AMBER_THRESHOLD = 10;
export const FATE_DECK_RED_THRESHOLD = 5;

/** Maximum possible Fate Card swing in a single combat (card range −1 to +4). */
export const COMBAT_MAX_CARD_SWING = 5;
/** Base strength margin at or above which Fate Cards cannot reverse the outcome. */
export const COMBAT_DECIDED_THRESHOLD = 6;

/** Penalty Card ratio thresholds for the VULNERABLE HUD indicator (no mechanical effect). */
export const VULNERABLE_YELLOW_THRESHOLD = 0.5;   // penaltyCards / warBanners ≥ 50%
export const VULNERABLE_RED_THRESHOLD = 0.75;     // penaltyCards / warBanners ≥ 75%

/** Doom Toll reduction granted by the Herald Diplomatic Action (Fix D: was 1). */
export const HERALD_DIPLOMATIC_DOOM_REDUCTION = 2;

/** Blood Pact accusation constants. */
export const ACCUSATION_PENALTY_CARDS = 3;     // Fate cards traitor loses on successful accusation
export const ACCUSATION_ACCUSER_REFUND = 1;    // Cards refunded per accuser on success AND failure (symmetric net cost: 1)
export const ACCUSATION_ACCUSED_GAIN = 1;      // Cards gained by wrongly accused player
export const ACCUSATION_LOCKOUT_ROUNDS = 1;    // Rounds a player can't be re-accused after failed attempt
export const ACCUSATION_COOLDOWN_ROUNDS = 2;   // Rounds before any new accusation can be initiated
export const ACCUSATION_MIN_PLAYERS = 3;       // Min players for accusation (2-player: not available)
export const DOOM_TOLL_ACCUSATION_RECEDE = 1;  // Doom Toll decrease on successful accusation

/** Number of rounds shown in the Blood Pact Suspicion Log (no mechanical effect). */
export const SUSPICION_LOG_ROUNDS = 5;

/** Antagonist force constants. */
export const LIEUTENANT_POWER = 10;
export const MINION_POWER = 6;
export const LIEUTENANT_START_COUNT = 2;
export const LIEUTENANT_MAX_COUNT = 4;
export const MINION_MAX_COUNT = 9;
