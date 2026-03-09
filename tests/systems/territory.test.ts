/**
 * Tests for Territory System — Stronghold Claiming (F-003)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createGameState } from '../../src/engine/game-loop.js';
import {
  canClaimNode,
  claimNode,
  getClaimedNodes,
  getNodeOwner,
  isClaimableNodeType,
} from '../../src/systems/territory.js';
import { generateBanners } from '../../src/systems/resources.js';

function makeState(playerCount = 4, seed = 42) {
  return createGameState(playerCount, 'competitive', seed);
}

// ─── isClaimableNodeType ──────────────────────────────────────────────────────

describe('isClaimableNodeType', () => {
  it('returns true for standard nodes', () => {
    const state = makeState();
    // s01 is a standard node (outer pathway)
    expect(isClaimableNodeType(state, 's01')).toBe(true);
  });

  it('returns true for forge nodes', () => {
    const state = makeState();
    expect(isClaimableNodeType(state, 'forge-nw')).toBe(true);
  });

  it('returns false for antagonist_base (dark fortress)', () => {
    const state = makeState();
    const dfId = state.boardDefinition.antagonistBase;
    expect(isClaimableNodeType(state, dfId)).toBe(false);
  });

  it('returns false for neutral_center (Hall of Neutrality)', () => {
    const state = makeState();
    const hallId = state.boardDefinition.neutralCenter;
    expect(isClaimableNodeType(state, hallId)).toBe(false);
  });

  it('returns false for unknown node IDs', () => {
    const state = makeState();
    expect(isClaimableNodeType(state, 'nonexistent-node')).toBe(false);
  });
});

// ─── getNodeOwner ─────────────────────────────────────────────────────────────

describe('getNodeOwner', () => {
  it('returns null for unclaimed nodes', () => {
    const state = makeState();
    expect(getNodeOwner(state, 's01')).toBeNull();
  });

  it('returns the court index for pre-claimed starting keeps', () => {
    const state = makeState();
    // Each starting keep is pre-claimed by its owning court (0-3)
    const keeps = state.boardDefinition.startingKeeps;
    keeps.forEach((keepId, courtIndex) => {
      expect(getNodeOwner(state, keepId)).toBe(courtIndex);
    });
  });

  it('returns null for a nonexistent node ID', () => {
    const state = makeState();
    expect(getNodeOwner(state, 'ghost-node')).toBeNull();
  });
});

// ─── getClaimedNodes ──────────────────────────────────────────────────────────

describe('getClaimedNodes', () => {
  it('returns only the starting keep for a player with no extra claims', () => {
    const state = makeState();
    // Player 0 starts owning keep-0 only
    const owned = getClaimedNodes(state, 0);
    expect(owned).toEqual(['keep-0']);
  });

  it('includes newly claimed nodes after claimNode', () => {
    const state = makeState();
    const player = state.players[0];
    generateBanners(player, state.boardDefinition);
    // Use a standard unclaimed node adjacent to the keep
    const targetId = 's01';
    state.boardState[targetId].claimedBy = null; // ensure unclaimed
    claimNode(state, player, targetId);
    const owned = getClaimedNodes(state, 0);
    expect(owned).toContain('keep-0');
    expect(owned).toContain('s01');
  });
});

// ─── canClaimNode ─────────────────────────────────────────────────────────────

describe('canClaimNode', () => {
  it('returns true when all preconditions are met', () => {
    const state = makeState();
    const player = state.players[0];
    generateBanners(player, state.boardDefinition);
    const nodeId = 's01'; // unclaimed standard node
    state.boardState[nodeId].claimedBy = null;
    expect(canClaimNode(state, player, nodeId)).toBe(true);
  });

  it('returns false when node is already claimed', () => {
    const state = makeState();
    const player = state.players[0];
    generateBanners(player, state.boardDefinition);
    // Starting keep is pre-claimed by player 0 — trying to re-claim it fails
    const keepId = state.boardDefinition.startingKeeps[1]; // player 1's keep
    state.boardState[keepId].claimedBy = 1;
    expect(canClaimNode(state, player, keepId)).toBe(false);
  });

  it('returns false for non-claimable node types', () => {
    const state = makeState();
    const player = state.players[0];
    generateBanners(player, state.boardDefinition);
    const dfId = state.boardDefinition.antagonistBase;
    state.boardState[dfId].claimedBy = null; // paranoia: force unclaimed
    expect(canClaimNode(state, player, dfId)).toBe(false);
  });

  it('returns false when player has no War Banners', () => {
    const state = makeState();
    const player = state.players[0];
    player.warBanners = 0; // Ensure no banners
    const nodeId = 's01';
    state.boardState[nodeId].claimedBy = null;
    expect(canClaimNode(state, player, nodeId)).toBe(false);
  });

  it('returns false for unknown node ID', () => {
    const state = makeState();
    const player = state.players[0];
    generateBanners(player, state.boardDefinition);
    expect(canClaimNode(state, player, 'ghost-node')).toBe(false);
  });
});

// ─── claimNode ────────────────────────────────────────────────────────────────

describe('claimNode', () => {
  it('marks the node as owned by the player', () => {
    const state = makeState();
    const player = state.players[0];
    generateBanners(player, state.boardDefinition);
    const nodeId = 's01';
    state.boardState[nodeId].claimedBy = null;
    claimNode(state, player, nodeId);
    expect(state.boardState[nodeId].claimedBy).toBe(0);
  });

  it('deducts War Banners by BANNER_COST_CLAIM (1)', () => {
    const state = makeState();
    const player = state.players[0];
    generateBanners(player, state.boardDefinition);
    const bannersBefore = player.warBanners;
    const nodeId = 's01';
    state.boardState[nodeId].claimedBy = null;
    claimNode(state, player, nodeId);
    expect(player.warBanners).toBe(bannersBefore - 1);
  });

  it('increments player stats.strongholdsClaimed', () => {
    const state = makeState();
    const player = state.players[0];
    generateBanners(player, state.boardDefinition);
    const before = player.stats.strongholdsClaimed;
    const nodeId = 's01';
    state.boardState[nodeId].claimedBy = null;
    claimNode(state, player, nodeId);
    expect(player.stats.strongholdsClaimed).toBe(before + 1);
  });

  it('throws when precondition is not met', () => {
    const state = makeState();
    const player = state.players[0];
    player.warBanners = 0; // Cannot afford
    const nodeId = 's01';
    state.boardState[nodeId].claimedBy = null;
    expect(() => claimNode(state, player, nodeId)).toThrow();
  });

  it('allows sequential claims when player has enough Banners', () => {
    const state = makeState();
    const player = state.players[0];
    generateBanners(player, state.boardDefinition);
    // Give extra banners for a second claim
    player.warBanners += 5;
    const ids = ['s01', 's02'];
    for (const id of ids) {
      state.boardState[id].claimedBy = null;
      claimNode(state, player, id);
    }
    expect(getClaimedNodes(state, 0)).toContain('s01');
    expect(getClaimedNodes(state, 0)).toContain('s02');
  });
});
