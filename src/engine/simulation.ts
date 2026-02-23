/**
 * Balance Testing & Simulation (Phase 19)
 *
 * A simulation framework that runs automated games with simple AI
 * to gather statistics for balance testing. The AI is intentionally
 * simple — it's a framework, not a real opponent.
 */

import { GameState, GameEndReason } from '../models/game-state.js';
import { SeededRandom } from '../utils/seeded-random.js';
import { findNearest, getDistance } from '../utils/pathfinding.js';
import { getStandardNodes } from '../models/board.js';
import { createGameState, advancePhase, startRound, advanceActionTurn } from './game-loop.js';
import { spendBannersForMovement, spendBannersForClaim, canAffordMovement, canAffordClaim } from '../systems/resources.js';
import { submitVote, resolveVotes, autoAbstainPlayers, canVote } from '../systems/voting.js';
import { resolveBehaviorCard } from '../systems/shadowking.js';
import { checkVictoryConditions, isGameOver } from '../systems/victory.js';
import { performBlightAutoSpread, isInFinalPhase } from '../systems/doom-toll.js';
import { checkBrokenStatus, enterBrokenCourt } from '../systems/broken-court.js';

// ─── Simulation Result Types ────────────────────────────────────

export interface SimulationResult {
  readonly seed: number;
  readonly rounds: number;
  readonly winner: number | null;
  readonly gameEndReason: GameEndReason;
  readonly doomTollFinal: number;
  readonly doomTollPeak: number;
  readonly strongholdCounts: number[];
  readonly combatsTotal: number;
  readonly rescueEvents: number;
}

export interface BatchResult {
  readonly simulations: number;
  readonly shadowkingWinRate: number;
  readonly avgRounds: number;
  readonly avgDoomPeak: number;
  readonly avgRescueEvents: number;
  readonly avgCombats: number;
  readonly avgTerritorySpread: number;
  readonly heartstoneClaimedRate: number;
}

// ─── Simple AI Player Action ────────────────────────────────────

/**
 * Simple AI: attempt to move toward and claim unclaimed strongholds.
 * Consumes all actions for the player.
 */
export function simulatePlayerAction(
  state: GameState,
  playerIndex: number,
  rng: SeededRandom,
): void {
  const player = state.players[playerIndex];
  if (!player || player.actionsRemaining <= 0) return;

  const definition = state.boardDefinition;
  const currentNode = player.fellowship.currentNode;

  // Find unclaimed standard nodes
  const unclaimedNodes = getStandardNodes(definition).filter(
    nodeId => state.boardState[nodeId].claimedBy === null,
  );

  if (unclaimedNodes.length > 0 && player.warBanners > 0) {
    // Find nearest unclaimed node
    const nearest = findNearest(definition, currentNode, unclaimedNodes);
    if (nearest && nearest.distance > 0 && canAffordMovement(player, nearest.distance)) {
      // Move there
      spendBannersForMovement(player, nearest.distance);
      player.fellowship.currentNode = nearest.nodeId;
      player.actionsRemaining -= 1;

      // Try to claim if we arrived at an unclaimed node
      if (state.boardState[nearest.nodeId].claimedBy === null && canAffordClaim(player)) {
        spendBannersForClaim(player);
        state.boardState[nearest.nodeId].claimedBy = playerIndex;
        player.stats.strongholdsClaimed += 1;
        player.actionsRemaining -= 1;
      }
    }
  }

  // Exhaust remaining actions (pass)
  player.actionsRemaining = 0;
}

// ─── Simulate One Round ─────────────────────────────────────────

/**
 * Execute a complete round of the game.
 */
export function simulateRound(state: GameState, rng: SeededRandom): void {
  if (isGameOver(state)) return;

  // 1. Shadowking Phase — draw behavior card
  startRound(state);

  // 2. Voting Phase
  advancePhase(state); // shadowking → voting
  autoAbstainPlayers(state);
  for (const player of state.players) {
    if (state.votes[player.index] === null) {
      const voteInfo = canVote(player, state);
      const choice = voteInfo.canCounter ? 'counter' : 'abstain';
      submitVote(state, player.index, choice as 'counter' | 'abstain');
    }
  }
  const voteResult = resolveVotes(state);

  // 3. Resolve behavior card
  if (state.currentBehaviorCard) {
    resolveBehaviorCard(state, rng, voteResult.blocked);
  }

  // Final Phase auto-spread
  if (isInFinalPhase(state)) {
    performBlightAutoSpread(state, rng);
  }

  // Check victory
  checkVictoryConditions(state, rng);
  if (isGameOver(state)) return;

  // 4. Action Phase
  advancePhase(state); // voting → action
  for (let i = 0; i < state.players.length; i++) {
    simulatePlayerAction(state, i, rng);
    // Check broken status
    const player = state.players[i];
    if (!player.isBroken && checkBrokenStatus(player)) {
      enterBrokenCourt(state, i);
    }
    checkVictoryConditions(state, rng);
    if (isGameOver(state)) return;
  }

  // 5. Cleanup Phase
  advancePhase(state); // action → cleanup
  advancePhase(state); // cleanup → next round's shadowking (handles banner discard/generate)
}

// ─── Run Single Simulation ──────────────────────────────────────

const MAX_ROUNDS = 50;

/**
 * Run a complete game simulation and return results.
 */
export function runSimulation(seed: number, playerCount: number = 4): SimulationResult {
  const rng = new SeededRandom(seed);
  const state = createGameState(playerCount, 'competitive', seed);

  let doomPeak = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    simulateRound(state, rng);
    if (state.doomToll > doomPeak) {
      doomPeak = state.doomToll;
    }
    if (isGameOver(state)) break;
  }

  // If game didn't end naturally, force end
  if (!isGameOver(state)) {
    state.gameEndReason = 'doom_complete';
    state.winner = null;
  }

  // Gather stats
  const strongholdCounts = state.players.map(p => p.stats.strongholdsClaimed);
  const combatsTotal = state.players.reduce(
    (sum, p) => sum + p.stats.combatsWon + p.stats.combatsLost, 0,
  );
  const rescueEvents = state.players.reduce(
    (sum, p) => sum + p.stats.rescuesGiven, 0,
  );

  return {
    seed,
    rounds: state.round,
    winner: state.winner,
    gameEndReason: state.gameEndReason,
    doomTollFinal: state.doomToll,
    doomTollPeak: doomPeak,
    strongholdCounts,
    combatsTotal,
    rescueEvents,
  };
}

// ─── Batch Simulation ───────────────────────────────────────────

/**
 * Run multiple simulations and aggregate statistics.
 */
export function runBatchSimulation(
  count: number,
  startSeed: number = 1,
): BatchResult {
  const results: SimulationResult[] = [];

  for (let i = 0; i < count; i++) {
    results.push(runSimulation(startSeed + i));
  }

  const shadowkingWins = results.filter(r => r.gameEndReason === 'doom_complete').length;
  const totalRounds = results.reduce((s, r) => s + r.rounds, 0);
  const totalDoomPeak = results.reduce((s, r) => s + r.doomTollPeak, 0);
  const totalRescues = results.reduce((s, r) => s + r.rescueEvents, 0);
  const totalCombats = results.reduce((s, r) => s + r.combatsTotal, 0);

  // Territory spread: max - min stronghold count per game
  const spreads = results.map(r => {
    const max = Math.max(...r.strongholdCounts, 0);
    const min = Math.min(...r.strongholdCounts, 0);
    return max - min;
  });
  const totalSpread = spreads.reduce((s, v) => s + v, 0);

  // Heartstone claimed rate — check if any player won territory victory
  const heartstoneClaimed = results.filter(
    r => r.gameEndReason === 'territory_victory',
  ).length;

  return {
    simulations: count,
    shadowkingWinRate: count > 0 ? shadowkingWins / count : 0,
    avgRounds: count > 0 ? totalRounds / count : 0,
    avgDoomPeak: count > 0 ? totalDoomPeak / count : 0,
    avgRescueEvents: count > 0 ? totalRescues / count : 0,
    avgCombats: count > 0 ? totalCombats / count : 0,
    avgTerritorySpread: count > 0 ? totalSpread / count : 0,
    heartstoneClaimedRate: count > 0 ? heartstoneClaimed / count : 0,
  };
}
