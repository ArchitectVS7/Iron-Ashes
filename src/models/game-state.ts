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

/** Doom Toll constants. */
export const DOOM_TOLL_MAX = 13;
export const DOOM_TOLL_MIN = 0;
export const DOOM_TOLL_FINAL_PHASE_THRESHOLD = 10;

/** Actions per turn. */
export const ACTIONS_PER_TURN_NORMAL = 2;
export const ACTIONS_PER_TURN_BROKEN = 1;

/** Fate Card cost per vote. */
export const VOTE_COST_STANDARD = 1;
export const VOTE_COST_FINAL_PHASE = 2;

/** Antagonist force constants. */
export const LIEUTENANT_POWER = 10;
export const MINION_POWER = 6;
export const LIEUTENANT_START_COUNT = 2;
export const LIEUTENANT_MAX_COUNT = 4;
export const MINION_MAX_COUNT = 9;
