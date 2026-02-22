/**
 * Player Data Model
 *
 * Tracks per-player state: resources, Fellowship, combat penalties,
 * Broken Court status, and game statistics.
 */

import { Fellowship } from './characters.js';

/** Whether a player is human or AI-controlled. */
export type PlayerType = 'human' | 'ai';

/** AI difficulty levels. */
export type AIDifficulty = 'apprentice' | 'knight_commander' | 'arch_regent';

/** Per-player game state. */
export interface Player {
  /** Player index (0-3). */
  readonly index: number;
  /** Human or AI. */
  readonly type: PlayerType;
  /** AI difficulty (only relevant if type is 'ai'). */
  readonly aiDifficulty: AIDifficulty | null;

  /** The player's Fellowship on the board. */
  fellowship: Fellowship;

  /** Current War Banner count (reset each round). */
  warBanners: number;
  /** Fate Cards in hand. */
  fateCards: number[];
  /** Total accumulated Penalty Cards (persist until rescued). */
  penaltyCards: number;

  /** Whether this player is in Broken Court state. */
  isBroken: boolean;
  /** Whether this player holds the Blood Pact (traitor card). */
  hasBloodPact: boolean;
  /** Whether the Blood Pact has been revealed (accusation or game end). */
  bloodPactRevealed: boolean;

  /** Number of actions remaining this turn (2 normal, 1 if Broken). */
  actionsRemaining: number;

  /** Cumulative stats for post-game summary. */
  stats: PlayerStats;
}

/** Per-player statistics tracked for the post-game summary (F-017). */
export interface PlayerStats {
  strongholdsClaimed: number;
  fellowsRecruited: number;
  warBannersSpent: number;
  combatsWon: number;
  combatsLost: number;
  timesBroken: number;
  rescuesGiven: number;
  rescuesReceived: number;
  votesCast: number;
  votesAbstained: number;
}

/** Create initial player stats (all zeroes). */
export function createInitialStats(): PlayerStats {
  return {
    strongholdsClaimed: 0,
    fellowsRecruited: 0,
    warBannersSpent: 0,
    combatsWon: 0,
    combatsLost: 0,
    timesBroken: 0,
    rescuesGiven: 0,
    rescuesReceived: 0,
    votesCast: 0,
    votesAbstained: 0,
  };
}

/** Create a player with initial state. */
export function createPlayer(
  index: number,
  type: PlayerType,
  fellowship: Fellowship,
  aiDifficulty: AIDifficulty | null = null,
): Player {
  return {
    index,
    type,
    aiDifficulty,
    fellowship,
    warBanners: 0,
    fateCards: [],
    penaltyCards: 0,
    isBroken: false,
    hasBloodPact: false,
    bloodPactRevealed: false,
    actionsRemaining: 2,
    stats: createInitialStats(),
  };
}
