import { describe, it, expect, beforeEach } from 'vitest';
import {
  BANNER_PER_PRODUCER,
  BANNER_PER_PRODUCER_AT_FORGE,
  BANNER_COST_MOVE,
  BANNER_COST_CLAIM,
  calculateBannerProduction,
  calculateMovementCost,
  canAffordMovement,
  canAffordClaim,
  canAffordCombatSpend,
  generateBanners,
  spendBanners,
  spendBannersForMovement,
  spendBannersForClaim,
  spendBannersForCombat,
  discardUnspentBanners,
} from '../../src/systems/resources.js';
import { createPlayer, Player } from '../../src/models/player.js';
import { createStartingFellowship } from '../../src/models/characters.js';
import { createCharacter } from '../../src/models/characters.js';
import { KNOWN_LANDS, BoardDefinition } from '../../src/models/board.js';

/** Create a player at the given node with a starting Fellowship. */
function makePlayer(nodeId: string, courtIndex: number = 0): Player {
  const fellowship = createStartingFellowship(courtIndex, nodeId, `court-${courtIndex}`);
  return createPlayer(courtIndex, 'human', fellowship);
}

/** Create a player with extra Artificers at the given node. */
function makePlayerWithProducers(
  nodeId: string,
  producerCount: number,
  courtIndex: number = 0,
): Player {
  const player = makePlayer(nodeId, courtIndex);
  // Starting fellowship already has 1 producer; add more if needed
  for (let i = 1; i < producerCount; i++) {
    player.fellowship.characters.push(
      createCharacter(`extra-producer-${i}`, 'producer'),
    );
  }
  return player;
}

/** Create a player with no Artificers. */
function makePlayerNoProducers(nodeId: string, courtIndex: number = 0): Player {
  const player = makePlayer(nodeId, courtIndex);
  player.fellowship.characters = player.fellowship.characters
    .filter(c => c.role !== 'producer');
  return player;
}

describe('Resource Constants', () => {
  it('should define correct production rates', () => {
    expect(BANNER_PER_PRODUCER).toBe(1);
    expect(BANNER_PER_PRODUCER_AT_FORGE).toBe(3);
  });

  it('should define correct spending costs', () => {
    expect(BANNER_COST_MOVE).toBe(1);
    expect(BANNER_COST_CLAIM).toBe(1);
  });
});

describe('Banner Production', () => {
  describe('calculateBannerProduction()', () => {
    it('should produce 1 banner per Artificer at a standard node', () => {
      const player = makePlayer('keep-0');
      // Starting fellowship has 1 Artificer
      expect(calculateBannerProduction(player, KNOWN_LANDS)).toBe(1);
    });

    it('should produce 3 banners per Artificer at a Forge Keep', () => {
      const player = makePlayer('forge-ne');
      expect(calculateBannerProduction(player, KNOWN_LANDS)).toBe(3);
    });

    it('should produce 0 banners with no Artificers', () => {
      const player = makePlayerNoProducers('keep-0');
      expect(calculateBannerProduction(player, KNOWN_LANDS)).toBe(0);
    });

    it('should scale with multiple Artificers at a standard node', () => {
      const player = makePlayerWithProducers('keep-0', 3);
      expect(calculateBannerProduction(player, KNOWN_LANDS)).toBe(3);
    });

    it('should scale with multiple Artificers at a Forge Keep', () => {
      const player = makePlayerWithProducers('forge-ne', 2);
      // 2 Artificers × 3 = 6
      expect(calculateBannerProduction(player, KNOWN_LANDS)).toBe(6);
    });

    it('should produce 3 per Artificer at any Forge Keep', () => {
      for (const forgeId of ['forge-ne', 'forge-se', 'forge-sw', 'forge-nw']) {
        const player = makePlayer(forgeId);
        expect(calculateBannerProduction(player, KNOWN_LANDS)).toBe(3);
      }
    });

    it('should produce 1 per Artificer at the dark fortress', () => {
      const player = makePlayer('dark-fortress');
      expect(calculateBannerProduction(player, KNOWN_LANDS)).toBe(1);
    });

    it('should produce 1 per Artificer at the hall of neutrality', () => {
      const player = makePlayer('hall');
      expect(calculateBannerProduction(player, KNOWN_LANDS)).toBe(1);
    });

    it('should not depend on node ownership (positional only)', () => {
      // Player at a Forge Keep claimed by someone else still gets ×3
      const player = makePlayer('forge-ne', 1); // Court 1 at forge-ne
      expect(calculateBannerProduction(player, KNOWN_LANDS)).toBe(3);
    });
  });

  describe('generateBanners()', () => {
    it('should add produced banners to player count', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 5;
      const produced = generateBanners(player, KNOWN_LANDS);
      expect(produced).toBe(1);
      expect(player.warBanners).toBe(6);
    });

    it('should accumulate across multiple calls', () => {
      const player = makePlayer('forge-ne');
      generateBanners(player, KNOWN_LANDS);
      generateBanners(player, KNOWN_LANDS);
      expect(player.warBanners).toBe(6); // 3 + 3
    });

    it('should return the number generated', () => {
      const player = makePlayerWithProducers('forge-ne', 2);
      const produced = generateBanners(player, KNOWN_LANDS);
      expect(produced).toBe(6);
    });

    it('should generate 0 for a player with no Artificers', () => {
      const player = makePlayerNoProducers('keep-0');
      const produced = generateBanners(player, KNOWN_LANDS);
      expect(produced).toBe(0);
      expect(player.warBanners).toBe(0);
    });
  });
});

describe('Banner Spending', () => {
  describe('spendBanners()', () => {
    it('should deduct banners from player', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 10;
      expect(spendBanners(player, 3)).toBe(true);
      expect(player.warBanners).toBe(7);
    });

    it('should track spending in player stats', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 10;
      spendBanners(player, 3);
      expect(player.stats.warBannersSpent).toBe(3);
    });

    it('should accumulate stats across multiple spends', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 10;
      spendBanners(player, 2);
      spendBanners(player, 3);
      expect(player.stats.warBannersSpent).toBe(5);
    });

    it('should fail if player has insufficient banners', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 2;
      expect(spendBanners(player, 5)).toBe(false);
      expect(player.warBanners).toBe(2); // unchanged
      expect(player.stats.warBannersSpent).toBe(0); // unchanged
    });

    it('should fail for zero amount', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 5;
      expect(spendBanners(player, 0)).toBe(false);
      expect(player.warBanners).toBe(5);
    });

    it('should fail for negative amount', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 5;
      expect(spendBanners(player, -1)).toBe(false);
      expect(player.warBanners).toBe(5);
    });

    it('should succeed when spending exactly all banners', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 5;
      expect(spendBanners(player, 5)).toBe(true);
      expect(player.warBanners).toBe(0);
    });
  });

  describe('Movement spending', () => {
    it('should calculate correct movement cost', () => {
      expect(calculateMovementCost(0)).toBe(0);
      expect(calculateMovementCost(1)).toBe(1);
      expect(calculateMovementCost(3)).toBe(3);
      expect(calculateMovementCost(5)).toBe(5);
    });

    it('should handle negative path length gracefully', () => {
      expect(calculateMovementCost(-1)).toBe(0);
    });

    it('canAffordMovement should check banner count', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 3;
      expect(canAffordMovement(player, 3)).toBe(true);
      expect(canAffordMovement(player, 4)).toBe(false);
    });

    it('spendBannersForMovement should deduct correct amount', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 5;
      expect(spendBannersForMovement(player, 3)).toBe(true);
      expect(player.warBanners).toBe(2);
      expect(player.stats.warBannersSpent).toBe(3);
    });

    it('spendBannersForMovement should fail if too expensive', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 2;
      expect(spendBannersForMovement(player, 3)).toBe(false);
      expect(player.warBanners).toBe(2);
    });

    it('spendBannersForMovement should fail for zero movement', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 5;
      expect(spendBannersForMovement(player, 0)).toBe(false);
    });
  });

  describe('Claiming spending', () => {
    it('canAffordClaim should check banner count', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 1;
      expect(canAffordClaim(player)).toBe(true);
      player.warBanners = 0;
      expect(canAffordClaim(player)).toBe(false);
    });

    it('spendBannersForClaim should cost exactly 1 banner', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 5;
      expect(spendBannersForClaim(player)).toBe(true);
      expect(player.warBanners).toBe(4);
      expect(player.stats.warBannersSpent).toBe(1);
    });

    it('spendBannersForClaim should fail with 0 banners', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 0;
      expect(spendBannersForClaim(player)).toBe(false);
      expect(player.warBanners).toBe(0);
    });
  });

  describe('Combat spending', () => {
    it('canAffordCombatSpend should check banner count', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 5;
      expect(canAffordCombatSpend(player, 5)).toBe(true);
      expect(canAffordCombatSpend(player, 6)).toBe(false);
      expect(canAffordCombatSpend(player, 0)).toBe(false);
    });

    it('spendBannersForCombat should deduct chosen amount', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 10;
      expect(spendBannersForCombat(player, 4)).toBe(true);
      expect(player.warBanners).toBe(6);
      expect(player.stats.warBannersSpent).toBe(4);
    });

    it('spendBannersForCombat should fail if insufficient', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 3;
      expect(spendBannersForCombat(player, 5)).toBe(false);
      expect(player.warBanners).toBe(3);
    });

    it('should allow spending all banners in combat', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 7;
      expect(spendBannersForCombat(player, 7)).toBe(true);
      expect(player.warBanners).toBe(0);
    });
  });
});

describe('End-of-Round Cleanup', () => {
  describe('discardUnspentBanners()', () => {
    it('should set banner count to 0', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 10;
      discardUnspentBanners(player);
      expect(player.warBanners).toBe(0);
    });

    it('should return the number of banners discarded', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 7;
      expect(discardUnspentBanners(player)).toBe(7);
    });

    it('should return 0 when no banners to discard', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 0;
      expect(discardUnspentBanners(player)).toBe(0);
    });

    it('should not affect stats', () => {
      const player = makePlayer('keep-0');
      player.warBanners = 10;
      player.stats.warBannersSpent = 5;
      discardUnspentBanners(player);
      expect(player.stats.warBannersSpent).toBe(5); // unchanged
    });
  });
});

describe('Full Round Resource Cycle', () => {
  it('should complete a full generate → spend → discard cycle', () => {
    const player = makePlayer('forge-ne');
    // 1 Artificer at a Forge Keep
    expect(player.warBanners).toBe(0);

    // Generate banners
    const produced = generateBanners(player, KNOWN_LANDS);
    expect(produced).toBe(3);
    expect(player.warBanners).toBe(3);

    // Spend on movement (2 nodes)
    expect(spendBannersForMovement(player, 2)).toBe(true);
    expect(player.warBanners).toBe(1);

    // Spend on claiming
    expect(spendBannersForClaim(player)).toBe(true);
    expect(player.warBanners).toBe(0);

    // Discard at end of round (already 0)
    expect(discardUnspentBanners(player)).toBe(0);

    // Stats reflect all spending
    expect(player.stats.warBannersSpent).toBe(3);
  });

  it('should discard unspent banners at end of round', () => {
    const player = makePlayerWithProducers('forge-ne', 3);

    // Generate lots of banners
    generateBanners(player, KNOWN_LANDS);
    expect(player.warBanners).toBe(9); // 3 producers × 3

    // Spend some
    spendBannersForMovement(player, 2);
    expect(player.warBanners).toBe(7);

    // Discard unspent
    const discarded = discardUnspentBanners(player);
    expect(discarded).toBe(7);
    expect(player.warBanners).toBe(0);

    // Only spent banners tracked in stats (not discarded)
    expect(player.stats.warBannersSpent).toBe(2);
  });

  it('should not persist banners between rounds', () => {
    const player = makePlayer('keep-0');

    // Round 1: generate and partially spend
    generateBanners(player, KNOWN_LANDS);
    expect(player.warBanners).toBe(1);
    discardUnspentBanners(player);
    expect(player.warBanners).toBe(0);

    // Round 2: starts fresh
    generateBanners(player, KNOWN_LANDS);
    expect(player.warBanners).toBe(1); // not 2
  });

  it('should handle a player with 0 banners participating in the round', () => {
    const player = makePlayerNoProducers('keep-0');

    // Generate 0 banners (no Artificers)
    generateBanners(player, KNOWN_LANDS);
    expect(player.warBanners).toBe(0);

    // Cannot move or claim
    expect(canAffordMovement(player, 1)).toBe(false);
    expect(canAffordClaim(player)).toBe(false);
    expect(spendBannersForMovement(player, 1)).toBe(false);
    expect(spendBannersForClaim(player)).toBe(false);

    // Discard (nothing to discard)
    expect(discardUnspentBanners(player)).toBe(0);
  });

  it('should work with the Known Lands board at different node types', () => {
    // Standard node
    const playerAtStandard = makePlayer('s01');
    expect(calculateBannerProduction(playerAtStandard, KNOWN_LANDS)).toBe(1);

    // Forge Keep
    const playerAtForge = makePlayer('forge-se');
    expect(calculateBannerProduction(playerAtForge, KNOWN_LANDS)).toBe(3);

    // Dark Fortress (not a forge)
    const playerAtDF = makePlayer('dark-fortress');
    expect(calculateBannerProduction(playerAtDF, KNOWN_LANDS)).toBe(1);

    // Hall of Neutrality (not a forge)
    const playerAtHall = makePlayer('hall');
    expect(calculateBannerProduction(playerAtHall, KNOWN_LANDS)).toBe(1);
  });
});
