/**
 * Resource System — War Banners (F-002)
 *
 * War Banners are the single unified resource. They pay for movement,
 * Stronghold claiming, and add to combat strength. Artificers generate
 * them; Forge Keeps multiply output. Banners do not persist between rounds.
 */

import { Player } from '../models/player.js';
import { BoardDefinition } from '../models/board.js';

// ─── Resource Constants ───────────────────────────────────────────

/** Banners produced per Artificer at a standard node per turn. */
export const BANNER_PER_PRODUCER = 1;

/** Banners produced per Artificer at a Forge Keep per turn. */
export const BANNER_PER_PRODUCER_AT_FORGE = 3;

/** War Banner cost to move through one node. */
export const BANNER_COST_MOVE = 1;

/** War Banner cost to claim a Stronghold. */
export const BANNER_COST_CLAIM = 1;

// ─── Banner Production ───────────────────────────────────────────

/**
 * Calculate how many War Banners a player would generate this turn.
 *
 * Production depends on:
 *   - Number of Artificers (role === 'producer') in the Fellowship
 *   - Whether the Fellowship is at a Forge Keep (×3) or elsewhere (×1)
 *
 * An Artificer at a Forge Keep produces 3 Banners instead of 1.
 * This is positional — based on Fellowship location, not node ownership.
 */
export function calculateBannerProduction(
  player: Player,
  boardDefinition: BoardDefinition,
): number {
  const { fellowship } = player;
  const producerCount = fellowship.characters
    .filter(c => c.role === 'producer').length;

  if (producerCount === 0) return 0;

  const currentNode = boardDefinition.nodes[fellowship.currentNode];
  const isAtForge = currentNode?.type === 'forge';
  const ratePerProducer = isAtForge
    ? BANNER_PER_PRODUCER_AT_FORGE
    : BANNER_PER_PRODUCER;

  return producerCount * ratePerProducer;
}

/**
 * Generate War Banners for a player (adds to their current count).
 * Called during the cleanup/production phase of each round.
 *
 * Returns the number of banners generated.
 */
export function generateBanners(
  player: Player,
  boardDefinition: BoardDefinition,
): number {
  const produced = calculateBannerProduction(player, boardDefinition);
  player.warBanners += produced;
  return produced;
}

// ─── Banner Spending ─────────────────────────────────────────────

/**
 * Spend a given number of War Banners. Returns true if successful.
 *
 * Fails (returns false) if the player doesn't have enough banners
 * or the amount is invalid. Tracks spending in player stats.
 */
export function spendBanners(
  player: Player,
  amount: number,
): boolean {
  if (amount <= 0 || amount > player.warBanners) return false;
  player.warBanners -= amount;
  player.stats.warBannersSpent += amount;
  return true;
}

/**
 * Calculate the movement cost in War Banners for a path.
 *
 * Movement costs 1 Banner per node traversed (edges, not nodes visited).
 */
export function calculateMovementCost(pathLength: number): number {
  return Math.max(0, pathLength) * BANNER_COST_MOVE;
}

/**
 * Check if a player can afford to move a given number of nodes.
 */
export function canAffordMovement(
  player: Player,
  nodeCount: number,
): boolean {
  return player.warBanners >= calculateMovementCost(nodeCount);
}

/**
 * Spend War Banners for movement (1 per node traversed).
 * Returns true if the player had enough banners.
 */
export function spendBannersForMovement(
  player: Player,
  nodeCount: number,
): boolean {
  const cost = calculateMovementCost(nodeCount);
  if (cost === 0) return false;
  return spendBanners(player, cost);
}

/**
 * Check if a player can afford to claim a Stronghold.
 */
export function canAffordClaim(player: Player): boolean {
  return player.warBanners >= BANNER_COST_CLAIM;
}

/**
 * Spend War Banners to claim a Stronghold (costs 1).
 * Returns true if the player had enough banners.
 */
export function spendBannersForClaim(
  player: Player,
): boolean {
  return spendBanners(player, BANNER_COST_CLAIM);
}

/**
 * Check if a player can afford a given combat spend.
 */
export function canAffordCombatSpend(
  player: Player,
  amount: number,
): boolean {
  return amount > 0 && amount <= player.warBanners;
}

/**
 * Spend War Banners for combat strength (additive to base strength).
 * The player chooses how many to spend (0 to all).
 * Returns true if the player had enough banners.
 */
export function spendBannersForCombat(
  player: Player,
  amount: number,
): boolean {
  return spendBanners(player, amount);
}

// ─── End-of-Round Cleanup ────────────────────────────────────────

/**
 * Discard all unspent War Banners at end of round.
 *
 * War Banners do not persist between rounds — this enforces the
 * spend-or-lose tension that makes resource management meaningful.
 *
 * Returns the number of banners discarded.
 */
export function discardUnspentBanners(player: Player): number {
  const discarded = player.warBanners;
  player.warBanners = 0;
  return discarded;
}
