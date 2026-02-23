import { describe, it, expect, beforeEach } from 'vitest';
import {
  WANDERER_COMPOSITION,
  generateWandererPool,
  canRecruit,
  performRecruit,
  hasDiplomaticProtection,
  getFellowshipPower,
  hasRole,
  countRole,
  canAddToFellowship,
} from '../../src/systems/characters.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import {
  createStartingFellowship,
  createCharacter,
  MAX_FELLOWSHIP_SIZE,
  Fellowship,
  CharacterRole,
  POWER_LEVELS,
} from '../../src/models/characters.js';
import { createPlayer, Player } from '../../src/models/player.js';
import {
  KNOWN_LANDS,
  BoardState,
  createInitialBoardState,
  selectWandererNodes,
} from '../../src/models/board.js';

// ─── Test Helpers ─────────────────────────────────────────────────

function makePlayer(nodeId: string, courtIndex: number = 0): Player {
  const fellowship = createStartingFellowship(courtIndex, nodeId, `court-${courtIndex}`);
  return createPlayer(courtIndex, 'human', fellowship);
}

/** Create a board state with wanderer tokens placed deterministically. */
function makeBoardState(seed: number = 42): BoardState {
  const rng = new SeededRandom(seed);
  const wandererNodeIds = selectWandererNodes(KNOWN_LANDS, rng);
  return createInitialBoardState(KNOWN_LANDS, wandererNodeIds);
}

// ─── Wanderer Pool ────────────────────────────────────────────────

describe('WANDERER_COMPOSITION constant', () => {
  it('should specify 8 warriors', () => {
    expect(WANDERER_COMPOSITION.warrior).toBe(8);
  });

  it('should specify 6 diplomats', () => {
    expect(WANDERER_COMPOSITION.diplomat).toBe(6);
  });

  it('should specify 6 producers', () => {
    expect(WANDERER_COMPOSITION.producer).toBe(6);
  });

  it('should total 20 wanderer tokens', () => {
    const total = WANDERER_COMPOSITION.warrior + WANDERER_COMPOSITION.diplomat + WANDERER_COMPOSITION.producer;
    expect(total).toBe(20);
  });
});

describe('generateWandererPool()', () => {
  it('should return exactly 20 roles', () => {
    const rng = new SeededRandom(1);
    const pool = generateWandererPool(rng);
    expect(pool).toHaveLength(20);
  });

  it('should contain exactly 8 warriors', () => {
    const rng = new SeededRandom(1);
    const pool = generateWandererPool(rng);
    expect(pool.filter(r => r === 'warrior')).toHaveLength(8);
  });

  it('should contain exactly 6 diplomats', () => {
    const rng = new SeededRandom(1);
    const pool = generateWandererPool(rng);
    expect(pool.filter(r => r === 'diplomat')).toHaveLength(6);
  });

  it('should contain exactly 6 producers', () => {
    const rng = new SeededRandom(1);
    const pool = generateWandererPool(rng);
    expect(pool.filter(r => r === 'producer')).toHaveLength(6);
  });

  it('should not contain leader roles', () => {
    const rng = new SeededRandom(1);
    const pool = generateWandererPool(rng);
    expect(pool.filter(r => r === 'leader')).toHaveLength(0);
  });

  it('should be deterministic from the same seed', () => {
    const pool1 = generateWandererPool(new SeededRandom(999));
    const pool2 = generateWandererPool(new SeededRandom(999));
    expect(pool1).toEqual(pool2);
  });

  it('should produce different orderings from different seeds', () => {
    const pool1 = generateWandererPool(new SeededRandom(1));
    const pool2 = generateWandererPool(new SeededRandom(2));
    // Both have same composition but almost certainly different order.
    // We verify at least one position differs.
    const hasDifference = pool1.some((role, i) => role !== pool2[i]);
    expect(hasDifference).toBe(true);
  });

  it('should only contain valid non-leader roles', () => {
    const rng = new SeededRandom(777);
    const pool = generateWandererPool(rng);
    const validRoles: CharacterRole[] = ['warrior', 'diplomat', 'producer'];
    for (const role of pool) {
      expect(validRoles).toContain(role);
    }
  });
});

// ─── canRecruit() ─────────────────────────────────────────────────

describe('canRecruit()', () => {
  let boardState: BoardState;

  beforeEach(() => {
    boardState = makeBoardState(42);
  });

  it('should return false when player is broken', () => {
    const player = makePlayer('keep-0');
    player.isBroken = true;
    expect(canRecruit(player, boardState, KNOWN_LANDS)).toBe(false);
  });

  it('should return false when player has no actions remaining', () => {
    const player = makePlayer('keep-0');
    player.actionsRemaining = 0;
    expect(canRecruit(player, boardState, KNOWN_LANDS)).toBe(false);
  });

  it('should return false when fellowship has no diplomat', () => {
    const player = makePlayer('keep-0');
    // Remove the diplomat from the starting fellowship.
    player.fellowship.characters = player.fellowship.characters.filter(
      c => c.role !== 'diplomat',
    );
    expect(canRecruit(player, boardState, KNOWN_LANDS)).toBe(false);
  });

  it('should return false when no adjacent node has a wanderer', () => {
    // Place the player at a node and manually clear all wanderer tokens
    // from adjacent nodes.
    const player = makePlayer('keep-0');
    // keep-0 connects to s01 and s02 — clear both.
    boardState['s01'].hasWanderer = false;
    boardState['s02'].hasWanderer = false;
    expect(canRecruit(player, boardState, KNOWN_LANDS)).toBe(false);
  });

  it('should return true when all conditions are met', () => {
    const player = makePlayer('keep-0');
    // Ensure at least one adjacent node has a wanderer.
    boardState['s01'].hasWanderer = true;
    expect(canRecruit(player, boardState, KNOWN_LANDS)).toBe(true);
  });

  it('should return true regardless of which adjacent node has the wanderer', () => {
    const player = makePlayer('keep-0');
    boardState['s01'].hasWanderer = false;
    boardState['s02'].hasWanderer = true;
    expect(canRecruit(player, boardState, KNOWN_LANDS)).toBe(true);
  });

  it('should check actionsRemaining of exactly 1', () => {
    const player = makePlayer('keep-0');
    player.actionsRemaining = 1;
    boardState['s01'].hasWanderer = true;
    expect(canRecruit(player, boardState, KNOWN_LANDS)).toBe(true);
  });
});

// ─── performRecruit() ─────────────────────────────────────────────

describe('performRecruit()', () => {
  let boardState: BoardState;

  beforeEach(() => {
    boardState = makeBoardState(42);
    // Guarantee s01 has a wanderer for our tests.
    boardState['s01'].hasWanderer = true;
  });

  it('should add a character with the given role to the fellowship', () => {
    const player = makePlayer('keep-0');
    const initialCount = player.fellowship.characters.length;
    const result = performRecruit(player, 's01', 'warrior', boardState);
    expect(result).toBe(true);
    expect(player.fellowship.characters).toHaveLength(initialCount + 1);
    const newChar = player.fellowship.characters[player.fellowship.characters.length - 1];
    expect(newChar.role).toBe('warrior');
  });

  it('should remove the wanderer token from the target node', () => {
    const player = makePlayer('keep-0');
    performRecruit(player, 's01', 'warrior', boardState);
    expect(boardState['s01'].hasWanderer).toBe(false);
  });

  it('should decrement actionsRemaining by 1', () => {
    const player = makePlayer('keep-0');
    player.actionsRemaining = 2;
    performRecruit(player, 's01', 'warrior', boardState);
    expect(player.actionsRemaining).toBe(1);
  });

  it('should increment stats.fellowsRecruited by 1', () => {
    const player = makePlayer('keep-0');
    const before = player.stats.fellowsRecruited;
    performRecruit(player, 's01', 'warrior', boardState);
    expect(player.stats.fellowsRecruited).toBe(before + 1);
  });

  it('should return false when target node has no wanderer', () => {
    const player = makePlayer('keep-0');
    boardState['s01'].hasWanderer = false;
    const result = performRecruit(player, 's01', 'warrior', boardState);
    expect(result).toBe(false);
  });

  it('should return false when target node does not exist in board state', () => {
    const player = makePlayer('keep-0');
    const result = performRecruit(player, 'nonexistent-node', 'warrior', boardState);
    expect(result).toBe(false);
  });

  it('should return false and not add a character when fellowship is at MAX_FELLOWSHIP_SIZE', () => {
    const player = makePlayer('keep-0');
    // Fill fellowship to max.
    while (player.fellowship.characters.length < MAX_FELLOWSHIP_SIZE) {
      player.fellowship.characters.push(createCharacter(`filler-${player.fellowship.characters.length}`, 'warrior'));
    }
    expect(player.fellowship.characters).toHaveLength(MAX_FELLOWSHIP_SIZE);

    const result = performRecruit(player, 's01', 'warrior', boardState);
    expect(result).toBe(false);
    expect(player.fellowship.characters).toHaveLength(MAX_FELLOWSHIP_SIZE);
  });

  it('should still remove the wanderer token when fellowship is at MAX_FELLOWSHIP_SIZE', () => {
    const player = makePlayer('keep-0');
    while (player.fellowship.characters.length < MAX_FELLOWSHIP_SIZE) {
      player.fellowship.characters.push(createCharacter(`filler-${player.fellowship.characters.length}`, 'warrior'));
    }
    performRecruit(player, 's01', 'warrior', boardState);
    // Wanderer is revealed even if character cannot be added.
    expect(boardState['s01'].hasWanderer).toBe(false);
  });

  it('should not decrement actionsRemaining when recruitment fails due to full fellowship', () => {
    const player = makePlayer('keep-0');
    while (player.fellowship.characters.length < MAX_FELLOWSHIP_SIZE) {
      player.fellowship.characters.push(createCharacter(`filler-${player.fellowship.characters.length}`, 'warrior'));
    }
    player.actionsRemaining = 2;
    performRecruit(player, 's01', 'warrior', boardState);
    // Actions should remain unchanged since recruit returned false.
    expect(player.actionsRemaining).toBe(2);
  });

  it('should give the recruited character the correct power level', () => {
    const player = makePlayer('keep-0');
    performRecruit(player, 's01', 'diplomat', boardState);
    const recruited = player.fellowship.characters[player.fellowship.characters.length - 1];
    expect(recruited.powerLevel).toBe(POWER_LEVELS['diplomat']);
  });

  it('should work for all valid wanderer roles', () => {
    const roles: Array<'warrior' | 'diplomat' | 'producer'> = ['warrior', 'diplomat', 'producer'];
    for (const role of roles) {
      const player = makePlayer('keep-0');
      boardState['s01'].hasWanderer = true;
      const result = performRecruit(player, 's01', role, boardState);
      expect(result).toBe(true);
      const recruited = player.fellowship.characters[player.fellowship.characters.length - 1];
      expect(recruited.role).toBe(role);
    }
  });
});

// ─── hasDiplomaticProtection() ────────────────────────────────────

describe('hasDiplomaticProtection()', () => {
  it('should return true when diplomat is present and no other fellowship is on the same node', () => {
    const player = makePlayer('keep-0', 0);
    const otherPlayer = makePlayer('keep-1', 1);
    expect(hasDiplomaticProtection(player, [player, otherPlayer])).toBe(true);
  });

  it('should return false when no diplomat in fellowship', () => {
    const player = makePlayer('keep-0', 0);
    player.fellowship.characters = player.fellowship.characters.filter(
      c => c.role !== 'diplomat',
    );
    const otherPlayer = makePlayer('keep-1', 1);
    expect(hasDiplomaticProtection(player, [player, otherPlayer])).toBe(false);
  });

  it('should return false when another fellowship is on the same node', () => {
    const player = makePlayer('keep-0', 0);
    const otherPlayer = makePlayer('keep-0', 1); // Same node!
    expect(hasDiplomaticProtection(player, [player, otherPlayer])).toBe(false);
  });

  it('should return true when alone with a diplomat (single player list)', () => {
    const player = makePlayer('s01', 0);
    expect(hasDiplomaticProtection(player, [player])).toBe(true);
  });

  it('should not be affected by players on different nodes', () => {
    const player = makePlayer('s01', 0);
    const player2 = makePlayer('s02', 1);
    const player3 = makePlayer('keep-0', 2);
    expect(hasDiplomaticProtection(player, [player, player2, player3])).toBe(true);
  });

  it('should return false when multiple other fellowships are on the same node', () => {
    const player = makePlayer('hall', 0);
    const player2 = makePlayer('hall', 1);
    const player3 = makePlayer('hall', 2);
    expect(hasDiplomaticProtection(player, [player, player2, player3])).toBe(false);
  });

  it('should only count a player against themselves (self not counted as "other")', () => {
    const player = makePlayer('keep-0', 0);
    // Only player in the list — should be protected.
    expect(hasDiplomaticProtection(player, [player])).toBe(true);
  });
});

// ─── Fellowship Queries ───────────────────────────────────────────

describe('getFellowshipPower()', () => {
  it('should sum all character power levels', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    // Starting fellowship: leader(8) + warrior(6) + diplomat(0) + producer(3) = 17
    expect(getFellowshipPower(fellowship)).toBe(17);
  });

  it('should return 0 for an empty fellowship', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    fellowship.characters = [];
    expect(getFellowshipPower(fellowship)).toBe(0);
  });

  it('should correctly include newly recruited characters', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    const basePower = getFellowshipPower(fellowship);
    fellowship.characters.push(createCharacter('extra-warrior', 'warrior'));
    expect(getFellowshipPower(fellowship)).toBe(basePower + POWER_LEVELS['warrior']);
  });

  it('should match expected power levels per role', () => {
    const fellowship: Fellowship = {
      courtIndex: 0,
      characters: [
        createCharacter('w1', 'warrior'),   // 6
        createCharacter('w2', 'warrior'),   // 6
        createCharacter('d1', 'diplomat'),  // 0
        createCharacter('p1', 'producer'),  // 3
      ],
      currentNode: 'keep-0',
    };
    expect(getFellowshipPower(fellowship)).toBe(6 + 6 + 0 + 3);
  });
});

describe('hasRole()', () => {
  it('should return true when fellowship has the specified role', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    expect(hasRole(fellowship, 'leader')).toBe(true);
    expect(hasRole(fellowship, 'warrior')).toBe(true);
    expect(hasRole(fellowship, 'diplomat')).toBe(true);
    expect(hasRole(fellowship, 'producer')).toBe(true);
  });

  it('should return false after removing that role', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    fellowship.characters = fellowship.characters.filter(c => c.role !== 'diplomat');
    expect(hasRole(fellowship, 'diplomat')).toBe(false);
  });

  it('should return false for empty fellowship', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    fellowship.characters = [];
    expect(hasRole(fellowship, 'warrior')).toBe(false);
  });
});

describe('countRole()', () => {
  it('should return 1 for each role in the starting fellowship', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    expect(countRole(fellowship, 'leader')).toBe(1);
    expect(countRole(fellowship, 'warrior')).toBe(1);
    expect(countRole(fellowship, 'diplomat')).toBe(1);
    expect(countRole(fellowship, 'producer')).toBe(1);
  });

  it('should return 0 for a role not in the fellowship', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    fellowship.characters = fellowship.characters.filter(c => c.role !== 'warrior');
    expect(countRole(fellowship, 'warrior')).toBe(0);
  });

  it('should return the correct count when multiple characters share a role', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    fellowship.characters.push(createCharacter('extra-warrior-1', 'warrior'));
    fellowship.characters.push(createCharacter('extra-warrior-2', 'warrior'));
    expect(countRole(fellowship, 'warrior')).toBe(3);
  });

  it('should return 0 for empty fellowship', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    fellowship.characters = [];
    expect(countRole(fellowship, 'leader')).toBe(0);
  });
});

describe('canAddToFellowship()', () => {
  it('should return true for an undersized fellowship', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    // Starting fellowship has 4 characters; max is 8.
    expect(canAddToFellowship(fellowship)).toBe(true);
  });

  it('should return false when fellowship is at MAX_FELLOWSHIP_SIZE', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    while (fellowship.characters.length < MAX_FELLOWSHIP_SIZE) {
      fellowship.characters.push(createCharacter(`filler-${fellowship.characters.length}`, 'warrior'));
    }
    expect(fellowship.characters).toHaveLength(MAX_FELLOWSHIP_SIZE);
    expect(canAddToFellowship(fellowship)).toBe(false);
  });

  it('should return true at MAX_FELLOWSHIP_SIZE - 1', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    while (fellowship.characters.length < MAX_FELLOWSHIP_SIZE - 1) {
      fellowship.characters.push(createCharacter(`filler-${fellowship.characters.length}`, 'warrior'));
    }
    expect(canAddToFellowship(fellowship)).toBe(true);
  });

  it('should return true for an empty fellowship', () => {
    const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
    fellowship.characters = [];
    expect(canAddToFellowship(fellowship)).toBe(true);
  });
});
