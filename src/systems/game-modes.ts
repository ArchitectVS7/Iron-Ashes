/**
 * Game Modes System (F-011)
 *
 * Three modes that share the same board, rules, and Behavior Card system:
 *   - Competitive: standard territory control victory
 *   - Blood Pact (Traitor): one player secretly wants doom
 *   - Cooperative: all players win together or all lose
 *
 * Mode selection changes only win/loss conditions and hidden information.
 */

import {
  GameState,
  GameMode,
  BehaviorCardType,
  VoteChoice,
  COOPERATIVE_BEHAVIOR_DECK_COMPOSITION,
  ACCUSATION_PENALTY_CARDS,
  ACCUSATION_ACCUSER_REFUND,
  ACCUSATION_ACCUSED_GAIN,
  ACCUSATION_LOCKOUT_ROUNDS,
  ACCUSATION_COOLDOWN_ROUNDS,
  ACCUSATION_MIN_PLAYERS,
  DOOM_TOLL_ACCUSATION_RECEDE,
  SUSPICION_LOG_ROUNDS,
} from '../models/game-state.js';
import { SeededRandom } from '../utils/seeded-random.js';
import { recedeDoomToll, drawFateCards } from './combat.js';

// ─── Blood Pact Assignment ──────────────────────────────────────

/**
 * Assign the Blood Pact card to a random human player.
 * AI players never receive the Blood Pact (PRD constraint).
 *
 * Only applicable in 'blood_pact' mode.
 * Mutates state by setting one player's hasBloodPact = true.
 * Returns the index of the Blood Pact holder, or -1 if no valid target.
 */
export function assignBloodPact(state: GameState, rng: SeededRandom): number {
  if (state.mode !== 'blood_pact') return -1;

  const humanPlayers = state.players.filter(p => p.type === 'human');
  if (humanPlayers.length === 0) return -1;

  const chosen = rng.pick(humanPlayers);
  chosen.hasBloodPact = true;
  return chosen.index;
}

// ─── Blood Pact Accusation ──────────────────────────────────────

/** Cost per accusing player to make a Blood Pact accusation. */
export const ACCUSATION_COST = 2;

/**
 * Check if a Blood Pact accusation can be made.
 *
 * Requirements:
 *   - Game is in blood_pact mode
 *   - All non-target active Arch-Regents must participate (unanimous)
 *   - Each accuser must have >= ACCUSATION_COST fate cards
 *
 * Returns the list of accuser indices if valid, or null if not.
 */
export function canAccuse(
  state: GameState,
  targetIndex: number,
): number[] | null {
  if (state.mode !== 'blood_pact') return null;
  if (state.players.length < ACCUSATION_MIN_PLAYERS) return null;
  if (state.accusationCooldownRounds > 0) return null;

  const target = state.players[targetIndex];
  if (!target) return null;
  if (target.accusationLockoutRounds > 0) return null;

  const accusers = state.players.filter(p => p.index !== targetIndex);
  // All accusers must be able to afford
  const allCanAfford = accusers.every(p => p.fateCards.length >= ACCUSATION_COST);
  if (!allCanAfford) return null;

  return accusers.map(p => p.index);
}

/**
 * Perform a Blood Pact accusation.
 *
 * All accusers spend ACCUSATION_COST fate cards each.
 * If the target has the Blood Pact, it is revealed.
 * If the target does NOT have the Blood Pact, the accusation fails
 * (cards are still spent — failed accusations are costly).
 *
 * Returns true if the target was the Blood Pact holder.
 */
export function performAccusation(
  state: GameState,
  targetIndex: number,
): boolean {
  const accuserIndices = canAccuse(state, targetIndex);
  if (!accuserIndices) return false;

  // Spend fate cards from each accuser
  for (const idx of accuserIndices) {
    const accuser = state.players[idx];
    accuser.fateCards.splice(0, ACCUSATION_COST);
  }

  const target = state.players[targetIndex];
  const isTraitor = target.hasBloodPact;

  if (isTraitor) {
    target.bloodPactRevealed = true;
    // Remove up to ACCUSATION_PENALTY_CARDS from traitor
    target.fateCards.splice(0, Math.min(ACCUSATION_PENALTY_CARDS, target.fateCards.length));
    // Doom Toll recedes
    recedeDoomToll(state, DOOM_TOLL_ACCUSATION_RECEDE);
    // Refund 1 card to each accuser
    for (const idx of accuserIndices) {
      const accuser = state.players[idx];
      const refunded = drawFateCards(state, ACCUSATION_ACCUSER_REFUND);
      accuser.fateCards.push(...refunded);
    }
    state.actionLog.push({
      round: state.round,
      phase: state.phase,
      playerIndex: null,
      action: 'blood-pact-accusation',
      details: `Player ${targetIndex} accused and revealed as the Blood Pact holder! Traitor loses ${ACCUSATION_PENALTY_CARDS} Fate Cards (min 0), Doom Toll recedes by ${DOOM_TOLL_ACCUSATION_RECEDE}, each accuser refunded ${ACCUSATION_ACCUSER_REFUND} card.`,
    });
  } else {
    // Refund 1 card to each accuser (symmetric cost: net −1 whether right or wrong)
    for (const idx of accuserIndices) {
      const accuser = state.players[idx];
      const refunded = drawFateCards(state, ACCUSATION_ACCUSER_REFUND);
      accuser.fateCards.push(...refunded);
    }
    // Give accused 1 card (political vindication)
    const gained = drawFateCards(state, ACCUSATION_ACCUSED_GAIN);
    target.fateCards.push(...gained);
    // Set lockout on accused
    target.accusationLockoutRounds = ACCUSATION_LOCKOUT_ROUNDS;
    state.actionLog.push({
      round: state.round,
      phase: state.phase,
      playerIndex: null,
      action: 'blood-pact-accusation',
      details: `Player ${targetIndex} accused but is NOT the Blood Pact holder. Each accuser refunded ${ACCUSATION_ACCUSER_REFUND} card (net cost: 1). Accused gains ${ACCUSATION_ACCUSED_GAIN} Fate Card and is immune to accusation for ${ACCUSATION_LOCKOUT_ROUNDS} round(s).`,
    });
  }

  // Set global cooldown regardless of outcome
  state.accusationCooldownRounds = ACCUSATION_COOLDOWN_ROUNDS;

  return isTraitor;
}

// ─── Cooperative Mode Checks ────────────────────────────────────

/**
 * In cooperative mode, PvP War Field combat is disabled.
 * Returns true if two players may initiate combat against each other.
 */
export function isPvPCombatAllowed(state: GameState): boolean {
  return state.mode !== 'cooperative';
}

/**
 * Check if the game mode uses the Blood Pact card.
 */
export function hasBloodPactCard(mode: GameMode): boolean {
  return mode === 'blood_pact';
}

/**
 * Get the display name for a game mode.
 */
export function getModeName(mode: GameMode): string {
  switch (mode) {
    case 'competitive': return 'Competitive';
    case 'blood_pact': return 'Blood Pact';
    case 'cooperative': return 'Cooperative';
  }
}

/**
 * Get the cooperative mode's harder Behavior Deck composition.
 *
 * Compared to the default deck:
 *   - More ESCALATE (3 vs 1) and ASSAULT (4 vs 3)
 *   - Fewer SPAWN (5 vs 6) and CLAIM (2 vs 4)
 *   - Same MOVE count (6)
 *
 * This is used automatically by createGameState when mode === 'cooperative'.
 */
export function getCooperativeDeckComposition(): Record<BehaviorCardType, number> {
  return { ...COOPERATIVE_BEHAVIOR_DECK_COMPOSITION };
}

/**
 * Advance accusation cooldown timers by one round.
 * Called at end of each round during cleanup.
 */
export function advanceAccusationCooldowns(state: GameState): void {
  state.accusationCooldownRounds = Math.max(0, state.accusationCooldownRounds - 1);
  for (const player of state.players) {
    player.accusationLockoutRounds = Math.max(0, player.accusationLockoutRounds - 1);
  }
}

// ─── Suspicion Log ───────────────────────────────────────────────

/**
 * A single round's entry in the Blood Pact Suspicion Log for one player.
 *
 * UI display only — no effect on game state or AI behavior.
 */
export interface SuspicionLogEntry {
  readonly round: number;
  readonly vote: VoteChoice;
  readonly wasSoleAbstainer: boolean;
}

/**
 * Return the Suspicion Log for a given player: their last SUSPICION_LOG_ROUNDS
 * rounds of Voting Phase records, derived from the action log.
 *
 * Each entry records:
 *   - The round number
 *   - The player's vote: 'counter' or 'abstain'
 *   - Whether they were the only abstainer that round
 *
 * Populated by 'vote-round-record' entries written by resolveVotes().
 * Returns entries in ascending round order.
 *
 * Accessible only from the Blood Pact Accusation screen.
 * The accused player has no access to their own log's presentation.
 * No card count data is exposed.
 */
export function getSuspicionLog(
  state: GameState,
  subjectIndex: number,
): SuspicionLogEntry[] {
  const voteRecords = state.actionLog.filter(e => e.action === 'vote-round-record');

  // Unique rounds in ascending order
  const allRounds = [...new Set(voteRecords.map(e => e.round))].sort((a, b) => a - b);
  const recentRounds = allRounds.slice(-SUSPICION_LOG_ROUNDS);

  return recentRounds.map(round => {
    const roundRecords = voteRecords.filter(e => e.round === round);
    const subjectRecord = roundRecords.find(e => e.playerIndex === subjectIndex);
    const vote = (subjectRecord?.details ?? 'abstain') as VoteChoice;
    const abstainCount = roundRecords.filter(e => e.details === 'abstain').length;
    const wasSoleAbstainer = vote === 'abstain' && abstainCount === 1;
    return { round, vote, wasSoleAbstainer };
  });
}
