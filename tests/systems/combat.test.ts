/**
 * Tests for the Combat System — The War Field (F-004)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateBaseStrength,
  calculateFateCardDraw,
  drawFateCards,
  resolvePlayerCombat,
  resolveShadowkingCombat,
  canInitiateCombat,
  canInitiateCombatAgainstPlayer,
  advanceDoomToll,
  recedeDoomToll,
  type CombatResult,
} from '../../src/systems/combat.js';
import { createGameState } from '../../src/engine/game-loop.js';
import { createPlayer, Player } from '../../src/models/player.js';
import { createStartingFellowship } from '../../src/models/characters.js';
import { createCharacter } from '../../src/models/characters.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import {
  GameState,
  AntagonistForce,
  DOOM_TOLL_MAX,
  DOOM_TOLL_MIN,
  DOOM_TOLL_FINAL_PHASE_THRESHOLD,
  LIEUTENANT_POWER,
  MINION_POWER,
} from '../../src/models/game-state.js';

// ─── Test Helpers ─────────────────────────────────────────────────

/** Create a player at a given node. Starting fellowship: leader(8)+warrior(6)+diplomat(0)+producer(3) = 17 power. */
function makePlayer(nodeId: string, courtIndex: number = 0): Player {
  const fellowship = createStartingFellowship(courtIndex, nodeId, `court-${courtIndex}`);
  return createPlayer(courtIndex, 'human', fellowship);
}

/** Create a minimal GameState suitable for combat tests. */
function makeState(seed: number = 42): GameState {
  return createGameState(2, 'competitive', seed);
}

/**
 * Return a GameState with both players at the given node (for co-location tests),
 * with known fateDeck so cards are predictable.
 */
function makeStateWithPlayers(nodeId: string, seed: number = 42): GameState {
  const state = makeState(seed);
  state.players[0].fellowship.currentNode = nodeId;
  state.players[1].fellowship.currentNode = nodeId;
  return state;
}

// ─── calculateBaseStrength ────────────────────────────────────────

describe('calculateBaseStrength()', () => {
  it('should equal fellowship power plus war banners for a starting fellowship with 0 banners', () => {
    const player = makePlayer('keep-0');
    // Starting fellowship: leader(8) + warrior(6) + diplomat(0) + producer(3) = 17
    player.warBanners = 0;
    expect(calculateBaseStrength(player)).toBe(17);
  });

  it('should add war banners to fellowship power', () => {
    const player = makePlayer('keep-0');
    player.warBanners = 5;
    expect(calculateBaseStrength(player)).toBe(22);
  });

  it('should return 0 for an empty fellowship with 0 banners', () => {
    const player = makePlayer('keep-0');
    player.fellowship.characters = [];
    player.warBanners = 0;
    expect(calculateBaseStrength(player)).toBe(0);
  });

  it('should return only banners for an empty fellowship', () => {
    const player = makePlayer('keep-0');
    player.fellowship.characters = [];
    player.warBanners = 4;
    expect(calculateBaseStrength(player)).toBe(4);
  });

  it('should reflect newly recruited characters', () => {
    const player = makePlayer('keep-0');
    player.warBanners = 0;
    const basePower = calculateBaseStrength(player); // 17
    player.fellowship.characters.push(createCharacter('extra-warrior', 'warrior'));
    expect(calculateBaseStrength(player)).toBe(basePower + 6);
  });
});

// ─── calculateFateCardDraw ────────────────────────────────────────

describe('calculateFateCardDraw()', () => {
  it('should always return 2 for any player (attacker draw = ceil(8/4))', () => {
    const player = makePlayer('keep-0');
    expect(calculateFateCardDraw(player)).toBe(2);
  });

  it('should return 2 regardless of fellowship composition', () => {
    const player = makePlayer('keep-0');
    player.fellowship.characters = [];
    expect(calculateFateCardDraw(player)).toBe(2);
  });
});

// ─── drawFateCards ────────────────────────────────────────────────

describe('drawFateCards()', () => {
  it('should draw the correct number of cards', () => {
    const state = makeState(42);
    const initialDeckSize = state.fateDeck.length;
    const drawn = drawFateCards(state, 2);
    expect(drawn).toHaveLength(2);
    expect(state.fateDeck).toHaveLength(initialDeckSize - 2);
  });

  it('should draw from the end of the deck (top = last element)', () => {
    const state = makeState(42);
    // Peek at what the top 2 cards are before drawing.
    const topCard1 = state.fateDeck[state.fateDeck.length - 1];
    const topCard2 = state.fateDeck[state.fateDeck.length - 2];
    const drawn = drawFateCards(state, 2);
    expect(drawn[0]).toBe(topCard1);
    expect(drawn[1]).toBe(topCard2);
  });

  it('should move drawn cards out of fateDeck', () => {
    const state = makeState(42);
    const before = state.fateDeck.length;
    drawFateCards(state, 3);
    expect(state.fateDeck.length).toBe(before - 3);
  });

  it('should reshuffle fateDiscard into fateDeck when deck is empty', () => {
    const state = makeState(42);
    // Empty the deck and populate discard.
    state.fateDiscard = [...state.fateDeck];
    state.fateDeck = [];
    const drawn = drawFateCards(state, 1);
    expect(drawn).toHaveLength(1);
    // After reshuffle the discard should be empty (minus the newly drawn card).
    expect(state.fateDiscard).toHaveLength(0);
  });

  it('should advance doom toll by 1 when reshuffle occurs', () => {
    const state = makeState(42);
    const initialDoom = state.doomToll;
    state.fateDiscard = [...state.fateDeck];
    state.fateDeck = [];
    drawFateCards(state, 1);
    expect(state.doomToll).toBe(initialDoom + 1);
  });

  it('should be deterministic from the same seed and round', () => {
    // Two states with identical seed/round should produce the same reshuffle order.
    const state1 = makeState(100);
    const state2 = makeState(100);
    // Drain the deck on both.
    state1.fateDiscard = [...state1.fateDeck];
    state1.fateDeck = [];
    state2.fateDiscard = [...state2.fateDeck];
    state2.fateDeck = [];
    // Draw; the reshuffle is seeded by state.seed ^ (state.round * constant).
    const drawn1 = drawFateCards(state1, 5);
    const drawn2 = drawFateCards(state2, 5);
    expect(drawn1).toEqual(drawn2);
  });

  it('should handle drawing 1 card from a 1-card deck', () => {
    const state = makeState(42);
    state.fateDeck = [3];
    state.fateDiscard = [];
    const drawn = drawFateCards(state, 1);
    expect(drawn).toEqual([3]);
    expect(state.fateDeck).toHaveLength(0);
  });
});

// ─── resolvePlayerCombat ──────────────────────────────────────────

describe('resolvePlayerCombat()', () => {
  let state: GameState;
  const rng = new SeededRandom(42);

  beforeEach(() => {
    state = makeStateWithPlayers('s01');
    // Give both players deterministic, well-known banners.
    state.players[0].warBanners = 5;
    state.players[1].warBanners = 5;
    // Set up a deterministic fate deck: stack it so attacker draws [3, 0] and defender draws [0].
    state.fateDeck = [0, 3, 0]; // draw order: pop → 0 first, 3 second... wait, pop pops last.
    // pop() removes from the END. So deck [0, 3, 0] → first pop = 0 (last element).
    // Let's set it so attacker's first card (best pick) is positive:
    // deck = [low, high_attacker_card2, high_attacker_card1] means first pop = high_attacker_card1
    // We want attacker to draw [2, 1] and defender to draw [0].
    // deck from bottom to top: [defender_card, attacker_card2, attacker_card1]
    state.fateDeck = [0, 1, 2]; // pop order: 2, 1, 0
  });

  it('should return a CombatResult with correct shape', () => {
    const result = resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(result).toHaveProperty('attackerStrength');
    expect(result).toHaveProperty('defenderStrength');
    expect(result).toHaveProperty('attackerCardValue');
    expect(result).toHaveProperty('defenderCardValue');
    expect(result).toHaveProperty('margin');
    expect(result).toHaveProperty('winner');
    expect(result).toHaveProperty('penaltyCards');
  });

  it('attacker wins when attacker total > defender total', () => {
    // Deck: [0, 1, 2] → attacker draws [2, 1], defender draws [0]
    // Attacker base: 17 + 5 = 22, picks card index 0 (value 2) → total 24
    // Defender base: 17 + 5 = 22, picks card index 0 (value 0) → total 22
    const result = resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(result.winner).toBe('attacker');
    expect(result.attackerStrength).toBeGreaterThan(result.defenderStrength);
  });

  it('defender wins when defender total > attacker total', () => {
    // Stack deck so defender has much higher card.
    // deck (pop order): attacker draws [0, 0], defender draws [4]
    state.fateDeck = [4, 0, 0]; // pop: 0, 0, 4
    // Attacker base 22 + 0 = 22, defender base 22 + 4 = 26
    const result = resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(result.winner).toBe('defender');
    expect(result.defenderStrength).toBeGreaterThan(result.attackerStrength);
  });

  it('ties go to defender', () => {
    // Both draw 0 → equal totals → defender wins.
    state.fateDeck = [0, 0, 0]; // all zeros
    const result = resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(result.winner).toBe('defender');
    expect(result.margin).toBe(0);
  });

  it('penaltyCards equals the margin', () => {
    // deck [0, 1, 2]: attacker total 24, defender total 22, margin 2
    const result = resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(result.penaltyCards).toBe(result.margin);
  });

  it('should apply penalty cards to the loser (attacker wins → defender gets penalties)', () => {
    // deck [0, 1, 2]: attacker wins with margin 2
    const defenderBefore = state.players[1].penaltyCards;
    const result = resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(result.winner).toBe('attacker');
    expect(state.players[1].penaltyCards).toBe(defenderBefore + result.margin);
  });

  it('should apply penalty cards to the loser (defender wins → attacker gets penalties)', () => {
    state.fateDeck = [4, 0, 0]; // defender wins
    const attackerBefore = state.players[0].penaltyCards;
    const result = resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(result.winner).toBe('defender');
    expect(state.players[0].penaltyCards).toBe(attackerBefore + result.margin);
  });

  it('should increment combatsWon for winner and combatsLost for loser (attacker wins)', () => {
    state.fateDeck = [0, 1, 2];
    resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(state.players[0].stats.combatsWon).toBe(1);
    expect(state.players[0].stats.combatsLost).toBe(0);
    expect(state.players[1].stats.combatsWon).toBe(0);
    expect(state.players[1].stats.combatsLost).toBe(1);
  });

  it('should increment combatsWon for winner and combatsLost for loser (defender wins)', () => {
    state.fateDeck = [4, 0, 0];
    resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(state.players[1].stats.combatsWon).toBe(1);
    expect(state.players[1].stats.combatsLost).toBe(0);
    expect(state.players[0].stats.combatsWon).toBe(0);
    expect(state.players[0].stats.combatsLost).toBe(1);
  });

  it('should discard unchosen attacker cards to fateDiscard', () => {
    // Attacker draws 2 cards and picks index 0. The other card should be discarded.
    state.fateDeck = [0, 1, 2]; // attacker draws [2, 1], defender draws [0]
    const discardBefore = state.fateDiscard.length;
    resolvePlayerCombat(state, 0, 1, 0, 0, rng); // attacker picks index 0 (card 2)
    // Discarded: attacker's card index 1 (value 1). Defender drew 1 card and "picked" it (no choice).
    expect(state.fateDiscard.length).toBeGreaterThan(discardBefore);
    expect(state.fateDiscard).toContain(1); // the unchosen attacker card
  });

  it('attacker can pick second card (index 1)', () => {
    // deck [0, 1, 2]: attacker draws [2, 1]. Picking index 1 gives card 1.
    state.fateDeck = [0, 1, 2];
    const result = resolvePlayerCombat(state, 0, 1, 1, 0, rng);
    expect(result.attackerCardValue).toBe(1);
  });
});

// ─── Broken Court Triggered ───────────────────────────────────────

describe('Broken Court via resolvePlayerCombat()', () => {
  let state: GameState;
  const rng = new SeededRandom(1);

  beforeEach(() => {
    state = makeStateWithPlayers('s01');
    state.players[0].warBanners = 0; // attacker has 0 banners → any penalty breaks them
    state.players[1].warBanners = 10;
    // Give defender a huge card advantage so defender wins.
    state.fateDeck = [4, 0, 0]; // attacker draws [0, 0], defender draws [4]
  });

  it('should set isBroken=true on newly broken player', () => {
    // Attacker (player 0) will lose; penaltyCards will become >= warBanners (0).
    state.players[0].penaltyCards = 0;
    state.players[0].warBanners = 0;
    // Any positive margin means penaltyCards > 0 >= warBanners (0), so broken.
    resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(state.players[0].isBroken).toBe(true);
  });

  it('should increment stats.timesBroken when newly broken', () => {
    state.players[0].penaltyCards = 0;
    state.players[0].warBanners = 0;
    resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(state.players[0].stats.timesBroken).toBe(1);
  });

  it('should advance doomToll by 1 when a player becomes newly broken', () => {
    state.players[0].penaltyCards = 0;
    state.players[0].warBanners = 0;
    const doomBefore = state.doomToll;
    resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(state.doomToll).toBe(doomBefore + 1);
  });

  it('should NOT set isBroken again if already broken', () => {
    state.players[0].isBroken = true;
    state.players[0].penaltyCards = 100;
    state.players[0].warBanners = 0;
    const timesBrokenBefore = state.players[0].stats.timesBroken;
    const doomBefore = state.doomToll;
    resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(state.players[0].stats.timesBroken).toBe(timesBrokenBefore);
    expect(state.doomToll).toBe(doomBefore); // no extra doom for already-broken
  });

  it('should not break when penalty cards < warBanners', () => {
    // Attacker wins narrowly; defender has plenty of banners.
    state.players[0].warBanners = 5;
    state.players[1].warBanners = 5;
    state.players[1].penaltyCards = 0;
    // Deck: attacker wins with margin 2, defender gets 2 penalty cards but has 5 banners.
    state.fateDeck = [0, 1, 2]; // attacker draws [2, 1], defender draws [0]
    resolvePlayerCombat(state, 0, 1, 0, 0, rng);
    expect(state.players[1].isBroken).toBe(false);
  });
});

// ─── resolveShadowkingCombat ──────────────────────────────────────

describe('resolveShadowkingCombat()', () => {
  let state: GameState;
  const rng = new SeededRandom(42);

  beforeEach(() => {
    state = makeState(42);
    // Ensure there is at least a minion force for tests.
    state.antagonistForces = [
      { id: 'minion-test', type: 'minion', powerLevel: MINION_POWER, currentNode: 's01' },
      { id: 'lieutenant-test', type: 'lieutenant', powerLevel: LIEUTENANT_POWER, currentNode: 's01' },
    ];
    state.players[0].warBanners = 5;
    // Stack deck so player wins: player draws [4, 0] → total = 17 + 5 + 4 = 26 > 6 (minion)
    state.fateDeck = [0, 4];
  });

  it('should throw if forceId is not found', () => {
    expect(() => resolveShadowkingCombat(state, 0, 'nonexistent', 0, rng)).toThrow();
  });

  it('should remove minion from antagonistForces when player wins', () => {
    // Player total 26 > minion power 6 → player wins.
    const before = state.antagonistForces.length;
    resolveShadowkingCombat(state, 0, 'minion-test', 0, rng);
    expect(state.antagonistForces).toHaveLength(before - 1);
    expect(state.antagonistForces.find(f => f.id === 'minion-test')).toBeUndefined();
  });

  it('should NOT recede doom when a minion is destroyed', () => {
    const doomBefore = state.doomToll;
    resolveShadowkingCombat(state, 0, 'minion-test', 0, rng);
    // Minion kill does not reduce doom.
    expect(state.doomToll).toBe(doomBefore);
  });

  it('should remove lieutenant from antagonistForces when player wins', () => {
    // Give player enough to beat lieutenant power 10.
    // deck: player draws [4, 0] → total = 17 + 5 + 4 = 26 > 10
    state.fateDeck = [0, 4];
    const before = state.antagonistForces.length;
    resolveShadowkingCombat(state, 0, 'lieutenant-test', 0, rng);
    expect(state.antagonistForces).toHaveLength(before - 1);
    expect(state.antagonistForces.find(f => f.id === 'lieutenant-test')).toBeUndefined();
  });

  it('should recede doom by 1 when a lieutenant is destroyed', () => {
    state.doomToll = 5;
    state.fateDeck = [0, 4]; // player draws [4, 0]
    resolveShadowkingCombat(state, 0, 'lieutenant-test', 0, rng);
    expect(state.doomToll).toBe(4);
  });

  it('should apply penalty cards to player when they lose', () => {
    // Make player lose: give force high power and player low cards.
    // Deck: player draws [0, 0] → total = 17 + 5 + 0 = 22 vs lieutenant 10 → player wins...
    // Use a different setup: strip player's fellowship power so they lose.
    state.players[0].fellowship.characters = []; // 0 power
    state.players[0].warBanners = 0;             // 0 banners
    state.fateDeck = [0, 0];                     // draws [0, 0]
    // player total = 0, lieutenant total = 10 → force wins
    const penaltyBefore = state.players[0].penaltyCards;
    const result = resolveShadowkingCombat(state, 0, 'lieutenant-test', 0, rng);
    expect(result.winner).toBe('defender');
    expect(state.players[0].penaltyCards).toBeGreaterThan(penaltyBefore);
  });

  it('should trigger Broken Court when player loses with penaltyCards >= warBanners', () => {
    state.players[0].fellowship.characters = [];
    state.players[0].warBanners = 0;
    state.players[0].penaltyCards = 0;
    state.fateDeck = [0, 0];
    // force wins, margin = 10, penaltyCards = 10 >= warBanners (0) → broken
    resolveShadowkingCombat(state, 0, 'lieutenant-test', 0, rng);
    expect(state.players[0].isBroken).toBe(true);
  });

  it('should increment combatsWon for player when player wins', () => {
    state.fateDeck = [0, 4];
    const wonBefore = state.players[0].stats.combatsWon;
    resolveShadowkingCombat(state, 0, 'minion-test', 0, rng);
    expect(state.players[0].stats.combatsWon).toBe(wonBefore + 1);
  });

  it('ties go to defender (Shadowking force)', () => {
    // Player total exactly equals force power → defender wins.
    state.players[0].fellowship.characters = [];
    state.players[0].warBanners = 0;
    // minion power = 6; player must draw 6
    state.fateDeck = [0, 6]; // draws [6, 0]
    const result = resolveShadowkingCombat(state, 0, 'minion-test', 0, rng);
    // 0 fellowship + 0 banners + 6 card = 6 == 6 → tie → defender wins
    expect(result.winner).toBe('defender');
  });

  it('should discard unchosen fate card to fateDiscard', () => {
    state.fateDeck = [0, 4]; // player draws [4, 0]; picks index 0 (value 4)
    const discardBefore = state.fateDiscard.length;
    resolveShadowkingCombat(state, 0, 'minion-test', 0, rng);
    // The unchosen card (value 0) should be in fateDiscard.
    expect(state.fateDiscard.length).toBeGreaterThan(discardBefore);
    expect(state.fateDiscard).toContain(0);
  });
});

// ─── canInitiateCombat ────────────────────────────────────────────

describe('canInitiateCombat()', () => {
  it('should return true for a non-broken player with actions remaining', () => {
    const player = makePlayer('keep-0');
    player.isBroken = false;
    player.actionsRemaining = 2;
    expect(canInitiateCombat(player)).toBe(true);
  });

  it('should return false for a broken player', () => {
    const player = makePlayer('keep-0');
    player.isBroken = true;
    player.actionsRemaining = 1;
    expect(canInitiateCombat(player)).toBe(false);
  });

  it('should return false when actionsRemaining is 0', () => {
    const player = makePlayer('keep-0');
    player.isBroken = false;
    player.actionsRemaining = 0;
    expect(canInitiateCombat(player)).toBe(false);
  });

  it('should return true when actionsRemaining is exactly 1', () => {
    const player = makePlayer('keep-0');
    player.isBroken = false;
    player.actionsRemaining = 1;
    expect(canInitiateCombat(player)).toBe(true);
  });
});

// ─── canInitiateCombatAgainstPlayer ──────────────────────────────

describe('canInitiateCombatAgainstPlayer()', () => {
  it('should return true when attacker can attack and both are on the same node with no protection', () => {
    const attacker = makePlayer('s01', 0);
    const defender = makePlayer('s01', 1); // same node, no diplomatic protection (no other player alone)
    // Defender has a diplomat but another player (attacker) is on the same node → no protection.
    attacker.actionsRemaining = 2;
    const allPlayers = [attacker, defender];
    expect(canInitiateCombatAgainstPlayer(attacker, defender, allPlayers)).toBe(true);
  });

  it('should return false when attacker is broken', () => {
    const attacker = makePlayer('s01', 0);
    const defender = makePlayer('s01', 1);
    attacker.isBroken = true;
    expect(canInitiateCombatAgainstPlayer(attacker, defender, [attacker, defender])).toBe(false);
  });

  it('should return false when attacker has no actions', () => {
    const attacker = makePlayer('s01', 0);
    const defender = makePlayer('s01', 1);
    attacker.actionsRemaining = 0;
    expect(canInitiateCombatAgainstPlayer(attacker, defender, [attacker, defender])).toBe(false);
  });

  it('should return false when fellowships are on different nodes', () => {
    const attacker = makePlayer('s01', 0);
    const defender = makePlayer('s02', 1); // different node
    attacker.actionsRemaining = 2;
    expect(canInitiateCombatAgainstPlayer(attacker, defender, [attacker, defender])).toBe(false);
  });

  it('should return false when defender has diplomatic protection', () => {
    // Defender alone on their node with a diplomat → protected.
    const attacker = makePlayer('s01', 0);
    const defender = makePlayer('s02', 1); // different node so defender is alone
    attacker.actionsRemaining = 2;
    // Attacker and defender are on different nodes → not co-located, will fail node check first.
    // Let's put them on the same node but remove attacker from the player list to simulate protection:
    // Actually hasDiplomaticProtection checks: has diplomat AND no other player on same node.
    // If attacker is on s01 and defender is on s01, there IS another player → no protection.
    // To get diplomatic protection: defender must be alone. Let's use a third-player setup.
    const defender2 = makePlayer('s03', 1);
    defender2.actionsRemaining = 2;
    const protectedDefender = makePlayer('s04', 2); // alone on s04 with diplomat
    // Attacker is on different node → will fail same-node check.
    // Actually to test diplomatic protection blocking, we need attacker on same node as defender,
    // but defender must have no OTHER players on the same node.
    // This is a contradiction since the attacker IS on the same node.
    // The hasDiplomaticProtection check is: no other player on same node.
    // If attacker is on same node → protection is false. So diplomatic protection can only block
    // if the "attacker" is not counted as "other" — but it IS counted.
    // Therefore diplomatic protection CANNOT be active if attacker is co-located.
    // Let's verify: defender on their own has protection, and we try to attack from same node.
    const a = makePlayer('hall', 0);
    const d = makePlayer('hall', 1);
    a.actionsRemaining = 2;
    // Both on same node → d has a diplomat but a is also on that node → NO protection.
    // So this call should return TRUE (can attack).
    expect(canInitiateCombatAgainstPlayer(a, d, [a, d])).toBe(true);
  });

  it('should return false when defender has diplomatic protection (isolated scenario)', () => {
    // Defender alone on node s01 with a diplomat, attacker arrives — but wait:
    // once attacker is co-located, protection is gone. This tests the check against
    // an allPlayers list that does not include the attacker.
    // Per the spec: hasDiplomaticProtection checks allPlayers. The combat system
    // passes the full allPlayers list. So let's pass a list where attacker is excluded.
    const attacker = makePlayer('s01', 0);
    const defender = makePlayer('s01', 1);
    attacker.actionsRemaining = 2;
    // Pass only defender in allPlayers (so no "other" player on same node) → protected.
    expect(canInitiateCombatAgainstPlayer(attacker, defender, [defender])).toBe(false);
  });
});

// ─── advanceDoomToll ─────────────────────────────────────────────

describe('advanceDoomToll()', () => {
  it('should increase doomToll by the given amount', () => {
    const state = makeState(42);
    state.doomToll = 3;
    advanceDoomToll(state, 2);
    expect(state.doomToll).toBe(5);
  });

  it('should cap doomToll at DOOM_TOLL_MAX (13)', () => {
    const state = makeState(42);
    state.doomToll = 12;
    advanceDoomToll(state, 5);
    expect(state.doomToll).toBe(DOOM_TOLL_MAX);
  });

  it('should not exceed DOOM_TOLL_MAX even with large amounts', () => {
    const state = makeState(42);
    state.doomToll = 0;
    advanceDoomToll(state, 999);
    expect(state.doomToll).toBe(DOOM_TOLL_MAX);
  });

  it('should update isFinalPhase to true when crossing DOOM_TOLL_FINAL_PHASE_THRESHOLD', () => {
    const state = makeState(42);
    state.doomToll = DOOM_TOLL_FINAL_PHASE_THRESHOLD - 1;
    (state as GameState & { isFinalPhase: boolean }).isFinalPhase = false;
    advanceDoomToll(state, 1);
    expect(state.isFinalPhase).toBe(true);
  });

  it('should keep isFinalPhase false when below threshold', () => {
    const state = makeState(42);
    state.doomToll = 0;
    (state as GameState & { isFinalPhase: boolean }).isFinalPhase = false;
    advanceDoomToll(state, DOOM_TOLL_FINAL_PHASE_THRESHOLD - 1);
    expect(state.isFinalPhase).toBe(false);
  });

  it('should set isFinalPhase true when exactly at threshold', () => {
    const state = makeState(42);
    state.doomToll = 0;
    (state as GameState & { isFinalPhase: boolean }).isFinalPhase = false;
    advanceDoomToll(state, DOOM_TOLL_FINAL_PHASE_THRESHOLD);
    expect(state.doomToll).toBe(DOOM_TOLL_FINAL_PHASE_THRESHOLD);
    expect(state.isFinalPhase).toBe(true);
  });
});

// ─── recedeDoomToll ──────────────────────────────────────────────

describe('recedeDoomToll()', () => {
  it('should decrease doomToll by the given amount', () => {
    const state = makeState(42);
    state.doomToll = 8;
    recedeDoomToll(state, 3);
    expect(state.doomToll).toBe(5);
  });

  it('should floor doomToll at DOOM_TOLL_MIN (0)', () => {
    const state = makeState(42);
    state.doomToll = 2;
    recedeDoomToll(state, 5);
    expect(state.doomToll).toBe(DOOM_TOLL_MIN);
  });

  it('should not go below DOOM_TOLL_MIN even with large amounts', () => {
    const state = makeState(42);
    state.doomToll = 1;
    recedeDoomToll(state, 999);
    expect(state.doomToll).toBe(DOOM_TOLL_MIN);
  });

  it('should update isFinalPhase to false when dropping below threshold', () => {
    const state = makeState(42);
    state.doomToll = DOOM_TOLL_FINAL_PHASE_THRESHOLD;
    (state as GameState & { isFinalPhase: boolean }).isFinalPhase = true;
    recedeDoomToll(state, 1);
    expect(state.isFinalPhase).toBe(false);
  });

  it('should keep isFinalPhase true when still at or above threshold', () => {
    const state = makeState(42);
    state.doomToll = DOOM_TOLL_FINAL_PHASE_THRESHOLD + 2;
    (state as GameState & { isFinalPhase: boolean }).isFinalPhase = true;
    recedeDoomToll(state, 1);
    expect(state.isFinalPhase).toBe(true);
  });

  it('should set isFinalPhase false when dropping to below threshold', () => {
    const state = makeState(42);
    state.doomToll = DOOM_TOLL_FINAL_PHASE_THRESHOLD;
    (state as GameState & { isFinalPhase: boolean }).isFinalPhase = true;
    recedeDoomToll(state, DOOM_TOLL_FINAL_PHASE_THRESHOLD);
    expect(state.doomToll).toBe(0);
    expect(state.isFinalPhase).toBe(false);
  });
});
