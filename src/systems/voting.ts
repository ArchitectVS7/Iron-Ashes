/**
 * Voting Phase System — The Voting Phase (F-006)
 *
 * Implements vote submission, resolution, and Behavior Card effect mapping
 * for the Voting Phase. All active players (including Broken Court players)
 * retain full voting rights.
 *
 * DESIGN COMMITMENT: Broken Court state NEVER prevents Voting Phase
 * participation. This is enforced by canVote always returning a valid
 * voting state for any player regardless of isBroken.
 *
 * All randomness goes through SeededRandom. No Math.random().
 */

import {
  GameState,
  BehaviorCardType,
  VoteChoice,
} from '../models/game-state.js';
import { Player } from '../models/player.js';
import {
  getVoteCost,
  onNonUnanimousVote,
  onUnanimousVoteWithCards,
} from './doom-toll.js';

// ─── Types ────────────────────────────────────────────────────────

/** The resolved effect of a Behavior Card after voting. */
export type BehaviorCardEffect =
  | { readonly type: 'spawn'; readonly blocked: boolean }
  | { readonly type: 'move'; readonly blocked: boolean }
  | { readonly type: 'claim'; readonly blocked: boolean }
  | { readonly type: 'assault'; readonly blocked: boolean }
  | { readonly type: 'escalate'; readonly doomAdvance: number };

/** The result of a fully resolved Voting Phase. */
export interface VoteResult {
  readonly unanimous: boolean;
  readonly counters: number;
  readonly abstains: number;
  readonly blocked: boolean;
  readonly cardEffect: BehaviorCardEffect;
}

// ─── Internal helpers ─────────────────────────────────────────────

/** Append a system-level entry to the action log. */
function log(state: GameState, action: string, details: string): void {
  state.actionLog.push({
    round: state.round,
    phase: state.phase,
    playerIndex: null,
    action,
    details,
  });
}

// ─── Vote Submission ──────────────────────────────────────────────

/**
 * Determine whether a player can vote counter or must auto-abstain.
 *
 * Broken Court players retain FULL voting rights — isBroken has NO effect
 * on voting eligibility. Only fate card count determines the outcome.
 *
 * @returns canCounter   true if the player has enough fate cards to counter
 * @returns mustAutoAbstain  true if the player cannot afford to counter
 */
export function canVote(
  player: Player,
  state: GameState,
): { canCounter: boolean; mustAutoAbstain: boolean } {
  const cost = getVoteCost(state);
  const totalFateCards = player.fateCards.length;
  const canCounter = totalFateCards >= cost;
  return {
    canCounter,
    mustAutoAbstain: !canCounter,
  };
}

/**
 * Submit a vote for the given player.
 *
 * If the player chooses 'counter' but cannot afford it, their vote is
 * forced to 'abstain'. Fate Cards are deducted from the front of the
 * fateCards array when a counter vote is accepted.
 *
 * Stats are updated: votesCast++ for counter, votesAbstained++ for abstain.
 *
 * @returns true if the vote was recorded
 */
export function submitVote(
  state: GameState,
  playerIndex: number,
  choice: VoteChoice,
): boolean {
  const player = state.players[playerIndex];
  if (!player) return false;

  const cost = getVoteCost(state);
  const { canCounter } = canVote(player, state);

  let resolvedChoice: VoteChoice = choice;

  if (choice === 'counter') {
    if (canCounter) {
      // Deduct fate cards (remove 'cost' cards from the front of the array)
      player.fateCards.splice(0, cost);
      player.stats.votesCast++;
    } else {
      // Cannot afford counter — force abstain
      resolvedChoice = 'abstain';
      player.stats.votesAbstained++;
    }
  } else {
    player.stats.votesAbstained++;
  }

  state.votes[playerIndex] = resolvedChoice;
  return true;
}

// ─── Vote Status ──────────────────────────────────────────────────

/**
 * Returns true when every player slot has a non-null vote recorded.
 */
export function allVotesSubmitted(state: GameState): boolean {
  return state.votes.every(v => v !== null);
}

// ─── Auto-Abstain ─────────────────────────────────────────────────

/**
 * Auto-abstain all players who cannot afford the counter cost.
 *
 * Sets their vote to 'abstain' and increments their votesAbstained stat.
 * Players who have already voted (non-null) are not affected.
 *
 * @returns the indices of players who were auto-abstained
 */
export function autoAbstainPlayers(state: GameState): number[] {
  const abstained: number[] = [];
  for (const player of state.players) {
    if (state.votes[player.index] !== null) continue;
    const { mustAutoAbstain } = canVote(player, state);
    if (mustAutoAbstain) {
      state.votes[player.index] = 'abstain';
      player.stats.votesAbstained++;
      abstained.push(player.index);
    }
  }
  return abstained;
}

// ─── Behavior Card Effect Table ───────────────────────────────────

/**
 * Map a Behavior Card type and blocked status to the concrete card effect.
 *
 * ESCALATE is special: it cannot be fully blocked. A blocked ESCALATE
 * still advances Doom by 1 (vs. 2 for an unblocked ESCALATE).
 */
export function getBehaviorCardEffect(
  cardType: BehaviorCardType,
  blocked: boolean,
): BehaviorCardEffect {
  switch (cardType) {
    case 'spawn':
      return { type: 'spawn', blocked };
    case 'move':
      return { type: 'move', blocked };
    case 'claim':
      return { type: 'claim', blocked };
    case 'assault':
      return { type: 'assault', blocked };
    case 'escalate':
      // blocked = doom +1, not blocked = doom +2
      return { type: 'escalate', doomAdvance: blocked ? 1 : 2 };
  }
}

// ─── Vote Resolution ──────────────────────────────────────────────

/**
 * Resolve the Voting Phase and produce a VoteResult.
 *
 * Resolution rules:
 *   1. Count counters and abstains from state.votes.
 *   2. A vote is unanimous when ALL votes are 'counter' (all players
 *      paid the cost, verified by the fact that submitVote deducts cards
 *      before recording a counter vote).
 *   3. Non-unanimous: call onNonUnanimousVote (doom +1).
 *   4. Unanimous AND 3+ active players: call onUnanimousVoteWithCards (doom -1).
 *   5. ESCALATE is always doom +1 (blocked) or doom +2 (not blocked).
 *
 * Mutates state (doom toll, actionLog). Requires all votes to be set.
 */
export function resolveVotes(state: GameState): VoteResult {
  const votes = state.votes;

  let counters = 0;
  let abstains = 0;

  for (const vote of votes) {
    if (vote === 'counter') {
      counters++;
    } else {
      abstains++;
    }
  }

  const totalVoters = votes.length;
  const unanimous = counters === totalVoters && abstains === 0;
  const blocked = unanimous;

  // Determine doom toll side effects from vote outcome
  if (!unanimous) {
    onNonUnanimousVote(state);
  } else if (unanimous && totalVoters >= 3) {
    onUnanimousVoteWithCards(state);
  }

  // Resolve behavior card effect
  const cardType = state.currentBehaviorCard?.type ?? 'spawn';
  const cardEffect = getBehaviorCardEffect(cardType, blocked);

  // Apply doom advance for ESCALATE regardless of block status
  if (cardEffect.type === 'escalate') {
    // advanceDoomToll is called via combat.ts — import from doom-toll
    // The effect's doomAdvance tells the executor how much to advance.
    // We log the escalate outcome here; actual doom advancement is the
    // caller's responsibility after inspecting cardEffect.doomAdvance.
    log(
      state,
      'vote-resolved',
      `ESCALATE resolved: doom will advance by ${cardEffect.doomAdvance} (${blocked ? 'blocked' : 'unblocked'}).`,
    );
  } else {
    log(
      state,
      'vote-resolved',
      `${cardType.toUpperCase()} card ${blocked ? 'BLOCKED' : 'NOT BLOCKED'} — ` +
        `${counters} counter(s), ${abstains} abstain(s).`,
    );
  }

  return {
    unanimous,
    counters,
    abstains,
    blocked,
    cardEffect,
  };
}
