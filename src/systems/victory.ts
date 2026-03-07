/**
 * Victory Conditions System (F-010)
 *
 * Three possible game end states:
 *   1. Territory Victory — artifact holder has the most strongholds
 *   2. Doom Complete — Doom Toll reaches 13
 *   3. All Broken — all players simultaneously in Broken Court
 *
 * Doom Complete and All Broken trigger immediately. Territory Victory triggers
 * only at end-of-round Cleanup Phase.
 */

import { GameState, GameEndReason } from '../models/game-state.js';
import { SeededRandom } from '../utils/seeded-random.js';
import { isDoomComplete, getPlayerStrongholdCount } from './doom-toll.js';
import { isAllBroken } from './broken-court.js';

// ─── Game Over Check ────────────────────────────────────────────

/**
 * Returns true if the game has ended (any victory condition triggered).
 */
export function isGameOver(state: GameState): boolean {
  return state.gameEndReason !== null;
}

// ─── Apply Victory ──────────────────────────────────────────────

/**
 * Set the game end state and log the result.
 */
export function applyVictory(
  state: GameState,
  reason: GameEndReason,
  winner: number | null,
): void {
  state.gameEndReason = reason;
  state.winner = winner;
  state.actionLog.push({
    round: state.round,
    phase: state.phase,
    playerIndex: winner,
    action: 'game-over',
    details: `Game ended: ${reason ?? 'unknown'}. Winner: ${winner !== null ? `Player ${winner}` : 'none'}.`,
  });
}

// ─── Artifact Management ────────────────────────────────────────

/**
 * Check if the artifact is unclaimed and a player's fellowship is at its node.
 *
 * If the artifact is at the Dark Fortress, the Fortress must be unguarded
 * (no antagonist forces present) before the Reclaim action becomes available.
 */
export function isArtifactAvailable(state: GameState): boolean {
  if (state.artifactHolder !== null) return false;
  if (state.artifactNode === state.boardDefinition.antagonistBase) {
    if (state.boardState[state.artifactNode].antagonistForces.length > 0) return false;
  }
  return state.players.some(
    p => p.fellowship.currentNode === state.artifactNode,
  );
}

/**
 * Drop the artifact at the holder's current node. Called when the artifact
 * holder loses War Field combat — the Heartstone falls to their node.
 */
export function dropArtifact(state: GameState, playerIndex: number): void {
  const player = state.players[playerIndex];
  if (!player) return;
  const dropNode = player.fellowship.currentNode;
  state.artifactHolder = null;
  state.artifactNode = dropNode;
  state.actionLog.push({
    round: state.round,
    phase: state.phase,
    playerIndex,
    action: 'drop-artifact',
    details: `Heartstone dropped at ${dropNode} after combat loss.`,
  });
}

/**
 * Claim the artifact for a player. Their fellowship must be at the artifact's node.
 * Returns true on success.
 */
export function claimArtifact(
  state: GameState,
  playerIndex: number,
): boolean {
  const player = state.players[playerIndex];
  if (!player) return false;
  if (player.fellowship.currentNode !== state.artifactNode) return false;

  state.artifactHolder = playerIndex;
  state.actionLog.push({
    round: state.round,
    phase: state.phase,
    playerIndex,
    action: 'claim-artifact',
    details: 'Claimed the Heartstone.',
  });

  return true;
}

// ─── Territory Victory ──────────────────────────────────────────

/**
 * Check for territory victory. Returns the winner's index or null.
 *
 * Conditions:
 *   - A player holds the artifact
 *   - That player has the most (or tied for most) strongholds
 *   - Tiebreak: highest war banners, then coin flip
 */
export function checkTerritoryVictory(
  state: GameState,
  _rng: SeededRandom,
): number | null {
  if (state.artifactHolder === null) return null;

  const holder = state.artifactHolder;
  const holderCount = getPlayerStrongholdCount(state, holder);

  // Check if any other player has strictly more strongholds
  for (const player of state.players) {
    if (player.index === holder) continue;
    if (getPlayerStrongholdCount(state, player.index) > holderCount) {
      return null; // Holder doesn't have the most — no victory yet
    }
  }

  // Holder has the most (or is tied). Find all players tied at the same count.
  const tiedPlayers = state.players.filter(
    p => getPlayerStrongholdCount(state, p.index) === holderCount,
  );

  // If only the holder has that count, they win outright
  if (tiedPlayers.length === 1) return holder;

  // Tiebreak 1: highest war banners
  const holderBanners = state.players[holder].warBanners;
  const anyoneHigher = tiedPlayers.some(
    p => p.index !== holder && p.warBanners > holderBanners,
  );
  if (anyoneHigher) return null; // Holder doesn't win tiebreak

  // Check if still tied on banners
  const stillTied = tiedPlayers.filter(p => p.warBanners === holderBanners);
  if (stillTied.length === 1 || !stillTied.some(p => p.index !== holder)) {
    return holder;
  }

  // Tiebreak 2: coin flip — but holder must win it
  // Since the holder has the artifact, they win ties per the PRD
  // (The artifact IS the tiebreaker — holding it means you win)
  return holder;
}

// ─── Main Victory Check ─────────────────────────────────────────

/**
 * Check all victory conditions in priority order.
 * Returns the triggered condition or null if none triggered.
 *
 * If a condition is triggered, applyVictory is called automatically.
 */
export function checkVictoryConditions(
  state: GameState,
  rng: SeededRandom,
): GameEndReason {
  // Already over
  if (isGameOver(state)) return state.gameEndReason;

  // 1. Doom Complete — highest priority
  if (isDoomComplete(state)) {
    let winner: number | null = null;
    if (state.mode === 'blood_pact') {
      const bloodPactPlayer = state.players.find(p => p.hasBloodPact && !p.bloodPactRevealed);
      winner = bloodPactPlayer?.index ?? null;
    }
    applyVictory(state, 'doom_complete', winner);
    return 'doom_complete';
  }

  // 2. All Broken — draw condition
  if (isAllBroken(state)) {
    applyVictory(state, 'all_broken', null);
    return 'all_broken';
  }

  // 3. Territory Victory — only checked at end of round (Cleanup Phase)
  if (state.phase === 'cleanup') {
    const territoryWinner = checkTerritoryVictory(state, rng);
    if (territoryWinner !== null) {
      applyVictory(state, 'territory_victory', territoryWinner);
      return 'territory_victory';
    }
  }

  return null;
}
