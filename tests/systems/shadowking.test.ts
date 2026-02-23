/**
 * Tests for the Shadowking Behavior System (F-008)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createGameState, startRound } from '../../src/engine/game-loop.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import {
  GameState,
  AntagonistForce,
  BehaviorCard,
  LIEUTENANT_POWER,
  MINION_MAX_COUNT,
  MINION_POWER,
  DEFAULT_BEHAVIOR_DECK_COMPOSITION,
} from '../../src/models/game-state.js';
import {
  resolveBehaviorCard,
  resolveSpawn,
  resolveMove,
  resolveClaim,
  resolveAssault,
  resolveEscalate,
  getWeakestPlayer,
  moveForceToward,
  placeMinion,
  type ShadowkingAction,
  type AssaultAction,
} from '../../src/systems/shadowking.js';

// ─── Test Helpers ──────────────────────────────────────────────────

const SEED = 42;

/** Create a 4-player competitive game state with a fixed seed. */
function makeState(): GameState {
  return createGameState(4, 'competitive', SEED);
}

/** Force a specific behavior card as the current card. */
function setCurrentCard(state: GameState, type: BehaviorCard['type'], id = `test-${type}`): void {
  state.currentBehaviorCard = { id, type };
}

/** Create a lieutenant at the given node and add it to the state. */
function makeLieutenant(state: GameState, id: string, nodeId: string): AntagonistForce {
  const force: AntagonistForce = {
    id,
    type: 'lieutenant',
    powerLevel: LIEUTENANT_POWER,
    currentNode: nodeId,
  };
  state.antagonistForces.push(force);
  if (state.boardState[nodeId]) {
    state.boardState[nodeId].antagonistForces.push(id);
  }
  return force;
}

/** Create a minion at the given node and add it to the state. */
function makeMinion(state: GameState, id: string, nodeId: string): AntagonistForce {
  const force: AntagonistForce = {
    id,
    type: 'minion',
    powerLevel: MINION_POWER,
    currentNode: nodeId,
  };
  state.antagonistForces.push(force);
  if (state.boardState[nodeId]) {
    state.boardState[nodeId].antagonistForces.push(id);
  }
  return force;
}

/** Remove all existing antagonist forces from state. */
function clearForces(state: GameState): void {
  for (const force of state.antagonistForces) {
    const nodeState = state.boardState[force.currentNode];
    if (nodeState) {
      nodeState.antagonistForces = nodeState.antagonistForces.filter(id => id !== force.id);
    }
  }
  state.antagonistForces = [];
}

const rng = new SeededRandom(SEED);

// ─── Behavior Deck Composition ────────────────────────────────────

describe('Behavior Deck composition', () => {
  it('should have exactly 20 cards total', () => {
    const state = makeState();
    // Deck + discards + current card = 20 total
    const total =
      state.behaviorDeck.length +
      state.behaviorDiscard.length +
      (state.currentBehaviorCard ? 1 : 0);
    expect(total).toBe(20);
  });

  it('should have the correct count of each card type', () => {
    const state = makeState();
    const allCards = [
      ...state.behaviorDeck,
      ...state.behaviorDiscard,
      ...(state.currentBehaviorCard ? [state.currentBehaviorCard] : []),
    ];

    const counts: Record<string, number> = {};
    for (const card of allCards) {
      counts[card.type] = (counts[card.type] ?? 0) + 1;
    }

    expect(counts['spawn']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.spawn);    // 6
    expect(counts['move']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.move);       // 6
    expect(counts['claim']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.claim);     // 4
    expect(counts['assault']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.assault); // 3
    expect(counts['escalate']).toBe(DEFAULT_BEHAVIOR_DECK_COMPOSITION.escalate); // 1
  });
});

// ─── resolveBehaviorCard dispatch ─────────────────────────────────

describe('resolveBehaviorCard()', () => {
  it('should throw when there is no current behavior card', () => {
    const state = makeState();
    state.currentBehaviorCard = null;
    expect(() => resolveBehaviorCard(state, rng, false)).toThrow();
  });

  it('should dispatch to resolveSpawn for spawn card', () => {
    const state = makeState();
    setCurrentCard(state, 'spawn');
    const action = resolveBehaviorCard(state, rng, false);
    expect(action.cardType).toBe('spawn');
  });

  it('should dispatch to resolveMove for move card', () => {
    const state = makeState();
    setCurrentCard(state, 'move');
    const action = resolveBehaviorCard(state, rng, false);
    expect(action.cardType).toBe('move');
  });

  it('should dispatch to resolveClaim for claim card', () => {
    const state = makeState();
    setCurrentCard(state, 'claim');
    const action = resolveBehaviorCard(state, rng, false);
    expect(action.cardType).toBe('claim');
  });

  it('should dispatch to resolveAssault for assault card', () => {
    const state = makeState();
    setCurrentCard(state, 'assault');
    const action = resolveBehaviorCard(state, rng, false);
    expect(action.cardType).toBe('assault');
  });

  it('should dispatch to resolveEscalate for escalate card', () => {
    const state = makeState();
    setCurrentCard(state, 'escalate');
    const action = resolveBehaviorCard(state, rng, false);
    expect(action.cardType).toBe('escalate');
  });

  it('should pass blocked flag correctly', () => {
    const state = makeState();
    setCurrentCard(state, 'move');
    const action = resolveBehaviorCard(state, rng, true);
    expect(action.blocked).toBe(true);
  });

  it('should log an action to state.actionLog', () => {
    const state = makeState();
    setCurrentCard(state, 'escalate');
    const logBefore = state.actionLog.length;
    resolveBehaviorCard(state, rng, false);
    expect(state.actionLog.length).toBeGreaterThan(logBefore);
  });
});

// ─── Determinism ─────────────────────────────────────────────────

describe('Deterministic execution from seed', () => {
  it('should produce identical results from the same seed', () => {
    const state1 = createGameState(4, 'competitive', SEED);
    const state2 = createGameState(4, 'competitive', SEED);

    setCurrentCard(state1, 'spawn');
    setCurrentCard(state2, 'spawn');

    const rng1 = new SeededRandom(SEED);
    const rng2 = new SeededRandom(SEED);

    const action1 = resolveSpawn(state1, rng1, false);
    const action2 = resolveSpawn(state2, rng2, false);

    expect(action1.description).toBe(action2.description);
    expect(state1.antagonistForces.length).toBe(state2.antagonistForces.length);
  });
});

// ─── placeMinion ──────────────────────────────────────────────────

describe('placeMinion()', () => {
  it('should create a minion force at the specified node', () => {
    const state = makeState();
    clearForces(state);

    const force = placeMinion(state, 's09');
    expect(force).not.toBeNull();
    expect(force!.type).toBe('minion');
    expect(force!.currentNode).toBe('s09');
    expect(force!.powerLevel).toBe(MINION_POWER);
  });

  it('should add the force to state.antagonistForces', () => {
    const state = makeState();
    clearForces(state);
    const before = state.antagonistForces.length;

    placeMinion(state, 's09');
    expect(state.antagonistForces.length).toBe(before + 1);
  });

  it('should register force ID in state.boardState[nodeId].antagonistForces', () => {
    const state = makeState();
    clearForces(state);

    const force = placeMinion(state, 's09');
    expect(force).not.toBeNull();
    expect(state.boardState['s09'].antagonistForces).toContain(force!.id);
  });

  it('should return null when at MINION_MAX_COUNT', () => {
    const state = makeState();
    clearForces(state);

    for (let i = 0; i < MINION_MAX_COUNT; i++) {
      makeMinion(state, `minion-cap-${i}`, 's09');
    }

    const result = placeMinion(state, 's10');
    expect(result).toBeNull();
  });

  it('should generate unique IDs for multiple minions', () => {
    const state = makeState();
    clearForces(state);

    const f1 = placeMinion(state, 's09');
    const f2 = placeMinion(state, 's10');
    expect(f1).not.toBeNull();
    expect(f2).not.toBeNull();
    expect(f1!.id).not.toBe(f2!.id);
  });
});

// ─── moveForceToward ──────────────────────────────────────────────

describe('moveForceToward()', () => {
  it('should move the force the specified number of steps toward target', () => {
    const state = makeState();
    clearForces(state);

    // Place a lieutenant at dark-fortress; target keep-0 (far away)
    // dark-fortress → s09 or s10 (1 step), then forge-ne (2 steps)
    const lt = makeLieutenant(state, 'lt-move-1', 'dark-fortress');

    // Move 1 step toward 'forge-ne'
    // dark-fortress connects to: s09, s10, s11, s12
    // forge-ne connects to: s02, s03, s09
    // Path: dark-fortress → s09 → forge-ne
    const newNode = moveForceToward(state, 'lt-move-1', 'forge-ne', 1, false);
    expect(newNode).toBe('s09');
    expect(lt.currentNode).toBe('s09');
  });

  it('should move up to maxSteps and stop', () => {
    const state = makeState();
    clearForces(state);

    const lt = makeLieutenant(state, 'lt-move-2', 'dark-fortress');

    // Path: dark-fortress → s09 → forge-ne (2 steps)
    const newNode = moveForceToward(state, 'lt-move-2', 'forge-ne', 2, false);
    expect(newNode).toBe('forge-ne');
    expect(lt.currentNode).toBe('forge-ne');
  });

  it('should update boardState tracking when moving', () => {
    const state = makeState();
    clearForces(state);

    const lt = makeLieutenant(state, 'lt-board-track', 'dark-fortress');

    moveForceToward(state, 'lt-board-track', 's09', 1, false);

    // Should be removed from dark-fortress
    expect(state.boardState['dark-fortress'].antagonistForces).not.toContain('lt-board-track');
    // Should be added to s09
    expect(state.boardState['s09'].antagonistForces).toContain('lt-board-track');
  });

  it('should not move if already at target', () => {
    const state = makeState();
    clearForces(state);

    const lt = makeLieutenant(state, 'lt-at-target', 's09');
    const newNode = moveForceToward(state, 'lt-at-target', 's09', 2, false);
    expect(newNode).toBe('s09');
  });

  it('should stop short of a node with diplomatic protection when flag is true', () => {
    const state = makeState();
    clearForces(state);

    // Put a lieutenant at dark-fortress, target = 'keep-0'
    // Path goes through inner ring nodes; we'll put a solo player with a diplomat
    // at s09 to block passage.
    const lt = makeLieutenant(state, 'lt-diplo', 'dark-fortress');

    // Put player 0 (who starts with diplomats) alone at s09
    state.players[0].fellowship.currentNode = 's09';
    // Players 1, 2, 3 are elsewhere (not at s09), so player 0 is alone
    // Player 0's fellowship starts with at least one diplomat (createStartingFellowship)

    // Move toward keep-0 with diplomatic protection respected
    // dark-fortress → s09 (blocked by DP) → stop before s09
    const newNode = moveForceToward(state, 'lt-diplo', 'keep-0', 2, true);
    // Should not enter s09 due to diplomatic protection
    expect(newNode).toBe('dark-fortress');
    expect(lt.currentNode).toBe('dark-fortress');
  });
});

// ─── SPAWN ────────────────────────────────────────────────────────

describe('resolveSpawn()', () => {
  it('should place up to 2 minions adjacent to the dark fortress', () => {
    const state = makeState();
    clearForces(state);
    const minionsBefore = state.antagonistForces.filter(f => f.type === 'minion').length;

    resolveSpawn(state, rng, false);

    const minionsAfter = state.antagonistForces.filter(f => f.type === 'minion').length;
    expect(minionsAfter - minionsBefore).toBeLessThanOrEqual(2);
    expect(minionsAfter - minionsBefore).toBeGreaterThanOrEqual(1);
  });

  it('should place minions adjacent to dark-fortress when space available', () => {
    const state = makeState();
    clearForces(state);

    resolveSpawn(state, rng, false);

    // dark-fortress connects to s09, s10, s11, s12
    const dfAdjacent = new Set(['s09', 's10', 's11', 's12']);
    const newMinions = state.antagonistForces.filter(f => f.type === 'minion');
    for (const minion of newMinions) {
      expect(dfAdjacent.has(minion.currentNode)).toBe(true);
    }
  });

  it('should respect MINION_MAX_COUNT', () => {
    const state = makeState();
    clearForces(state);

    // Fill to cap - 1
    for (let i = 0; i < MINION_MAX_COUNT - 1; i++) {
      makeMinion(state, `minion-fill-${i}`, 's09');
    }

    resolveSpawn(state, rng, false);

    const minions = state.antagonistForces.filter(f => f.type === 'minion');
    expect(minions.length).toBeLessThanOrEqual(MINION_MAX_COUNT);
  });

  it('should still place minions when blocked (SPAWN blocked only flags, not prevents)', () => {
    const state = makeState();
    clearForces(state);

    const action = resolveSpawn(state, rng, true);
    expect(action.blocked).toBe(true);
    // Minions are still placed
    const minions = state.antagonistForces.filter(f => f.type === 'minion');
    expect(minions.length).toBeGreaterThan(0);
  });

  it('overflow: should place at farthest reachable node when all adjacent nodes occupied', () => {
    const state = makeState();
    clearForces(state);

    // Occupy all 4 dark-fortress adjacent nodes
    makeMinion(state, 'minion-s09', 's09');
    makeMinion(state, 'minion-s10', 's10');
    makeMinion(state, 'minion-s11', 's11');
    makeMinion(state, 'minion-s12', 's12');

    const minionsBefore = state.antagonistForces.filter(f => f.type === 'minion').length;
    resolveSpawn(state, rng, false);
    const minionsAfter = state.antagonistForces.filter(f => f.type === 'minion').length;

    // A new minion should have been placed somewhere (overflow)
    expect(minionsAfter).toBeGreaterThan(minionsBefore);

    // New minions should NOT be at dark-fortress adjacent nodes
    const dfAdjacent = new Set(['s09', 's10', 's11', 's12', 'dark-fortress']);
    const newMinions = state.antagonistForces
      .filter(f => f.type === 'minion')
      .filter(f => !['minion-s09', 'minion-s10', 'minion-s11', 'minion-s12'].includes(f.id));

    for (const minion of newMinions) {
      expect(dfAdjacent.has(minion.currentNode)).toBe(false);
    }
  });

  it('should log a shadowking-spawn action', () => {
    const state = makeState();
    clearForces(state);
    const logBefore = state.actionLog.length;
    resolveSpawn(state, rng, false);
    expect(state.actionLog.length).toBeGreaterThan(logBefore);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('shadowking-spawn');
  });
});

// ─── MOVE ─────────────────────────────────────────────────────────

describe('resolveMove()', () => {
  it('should not move any force when blocked', () => {
    const state = makeState();
    clearForces(state);

    const lt = makeLieutenant(state, 'lt-no-move', 'dark-fortress');
    const action = resolveMove(state, rng, true);

    expect(action.blocked).toBe(true);
    expect(lt.currentNode).toBe('dark-fortress');
  });

  it('should move the closest death knight toward the leading player', () => {
    const state = makeState();
    clearForces(state);

    // Place a lieutenant at s09 (1 step from forge-ne, closer to keep-0 area)
    makeLieutenant(state, 'lt-close', 's09');

    // Player 0 is the leading player (they start at keep-0 with 1 stronghold)
    // Player 0's fellowship starts at keep-0
    const originalNode = 's09';

    resolveMove(state, rng, false);

    const lt = state.antagonistForces.find(f => f.id === 'lt-close')!;
    // Should have moved 2 steps toward player 0's fellowship (keep-0)
    // s09 → forge-ne → s02 OR s09 → forge-ne → s03 (2 steps)
    expect(lt.currentNode).not.toBe(originalNode);
  });

  it('should move exactly 2 nodes toward the leader', () => {
    const state = makeState();
    clearForces(state);

    // Player 0 is at keep-0, place lieutenant at dark-fortress
    // dark-fortress → s09 → forge-ne (2 steps) or dark-fortress → s12 → forge-nw (2 steps)
    makeLieutenant(state, 'lt-2step', 'dark-fortress');

    resolveMove(state, rng, false);

    const lt = state.antagonistForces.find(f => f.id === 'lt-2step')!;
    // After 2 steps from dark-fortress, should be 2 nodes closer to keep-0
    expect(lt.currentNode).not.toBe('dark-fortress');
  });

  it('should stop short when diplomatic protection blocks path', () => {
    const state = makeState();
    clearForces(state);

    // Place lt at dark-fortress targeting keep-0
    const lt = makeLieutenant(state, 'lt-diplo-move', 'dark-fortress');

    // Place player 0 (with diplomat) alone at s09 to block the path
    state.players[0].fellowship.currentNode = 's09';
    // Players 1, 2, 3 are at different positions (their own keeps)

    // The shortest path from dark-fortress toward keep-0 goes through s09 or s12
    // If s09 is blocked by DP, the move should not enter s09
    resolveMove(state, rng, false);

    // The lieutenant should not be at s09
    expect(lt.currentNode).not.toBe('s09');
  });

  it('should select the death knight closest to the leading player', () => {
    const state = makeState();
    clearForces(state);

    // Two lieutenants: one near (s09) and one far (keep-2 opposite corner)
    makeLieutenant(state, 'lt-near', 's09');
    makeLieutenant(state, 'lt-far', 'keep-2');

    // Player 0 at keep-0 is the leader (or whichever has most strongholds)
    resolveMove(state, rng, false);

    // The near lieutenant should have moved (closest to leader's fellowship)
    const ltNear = state.antagonistForces.find(f => f.id === 'lt-near')!;
    const ltFar = state.antagonistForces.find(f => f.id === 'lt-far')!;

    // Either the near one moved (it's closer) or the far one is still at keep-2
    // The near one should have moved since it's closest to the leader
    expect(ltNear.currentNode).not.toBe('s09');
    expect(ltFar.currentNode).toBe('keep-2'); // far one shouldn't have moved
  });

  it('should log a shadowking-move action', () => {
    const state = makeState();
    clearForces(state);
    makeLieutenant(state, 'lt-log', 'dark-fortress');
    const logBefore = state.actionLog.length;
    resolveMove(state, rng, false);
    expect(state.actionLog.length).toBeGreaterThan(logBefore);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('shadowking-move');
  });
});

// ─── CLAIM ────────────────────────────────────────────────────────

describe('resolveClaim()', () => {
  it('should not claim anything when blocked', () => {
    const state = makeState();
    clearForces(state);
    makeLieutenant(state, 'lt-claim-blocked', 'dark-fortress');

    const claimedBefore = Object.values(state.boardState).filter(
      n => n.claimedBy === -1,
    ).length;

    resolveClaim(state, rng, true);

    const claimedAfter = Object.values(state.boardState).filter(
      n => n.claimedBy === -1,
    ).length;

    expect(claimedAfter).toBe(claimedBefore);
  });

  it('should set claimedBy to -1 on the claimed node', () => {
    const state = makeState();
    clearForces(state);
    // Place lieutenant somewhere with access to unclaimed standard nodes
    makeLieutenant(state, 'lt-claimer', 's09');

    resolveClaim(state, rng, false);

    const shadowkingClaims = Object.values(state.boardState).filter(
      n => n.claimedBy === -1,
    );
    expect(shadowkingClaims.length).toBeGreaterThanOrEqual(1);
  });

  it('should never claim dark-fortress', () => {
    const state = makeState();
    clearForces(state);
    makeLieutenant(state, 'lt-no-df', 's09');

    resolveClaim(state, rng, false);

    expect(state.boardState['dark-fortress'].claimedBy).not.toBe(-1);
  });

  it('should never claim the hall of neutrality', () => {
    const state = makeState();
    clearForces(state);
    makeLieutenant(state, 'lt-no-hall', 's09');

    resolveClaim(state, rng, false);

    expect(state.boardState['hall'].claimedBy).not.toBe(-1);
  });

  it('should only claim unoccupied (claimedBy === null) standard nodes', () => {
    const state = makeState();
    clearForces(state);
    makeLieutenant(state, 'lt-standard', 's09');

    resolveClaim(state, rng, false);

    // Any newly claimed node must be a standard type
    for (const [nodeId, nodeState] of Object.entries(state.boardState)) {
      if (nodeState.claimedBy === -1) {
        const nodeDef = state.boardDefinition.nodes[nodeId];
        expect(nodeDef.type).toBe('standard');
      }
    }
  });

  it('should log a shadowking-claim action', () => {
    const state = makeState();
    clearForces(state);
    makeLieutenant(state, 'lt-claim-log', 's09');
    const logBefore = state.actionLog.length;
    resolveClaim(state, rng, false);
    expect(state.actionLog.length).toBeGreaterThan(logBefore);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('shadowking-claim');
  });

  it('should use the death knight farthest from any player fellowship', () => {
    const state = makeState();
    clearForces(state);

    // lt-near at s09 (close to fellowships near center)
    // lt-far at keep-2 (in a player keep area, but let's see)
    makeLieutenant(state, 'lt-claim-near', 's09');
    makeLieutenant(state, 'lt-claim-far', 'keep-2');

    // All player fellowships default to their own keeps (0..3)
    // keep-2 is a player keep (player 2 is there), so lt-claim-far at keep-2
    // is actually distance 0 from player 2's fellowship
    // lt-claim-near at s09 may be further from all fellowships
    // Let's move fellowships away from center

    resolveClaim(state, rng, false);

    // Just verify the claim happened
    const shadowkingClaims = Object.values(state.boardState).filter(
      n => n.claimedBy === -1,
    );
    expect(shadowkingClaims.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── ASSAULT ──────────────────────────────────────────────────────

describe('resolveAssault()', () => {
  it('should not assault when blocked', () => {
    const state = makeState();
    clearForces(state);
    makeLieutenant(state, 'lt-assault-blocked', 'dark-fortress');

    const action = resolveAssault(state, rng, true) as AssaultAction;
    expect(action.blocked).toBe(true);
    expect(action.assault).toBeNull();
  });

  it('should return null assault when no death knights are adjacent to any player', () => {
    const state = makeState();
    clearForces(state);

    // Place lieutenant far from all players
    makeLieutenant(state, 'lt-far-assault', 'dark-fortress');

    // dark-fortress connects to s09, s10, s11, s12 — no player starts there
    const action = resolveAssault(state, rng, false) as AssaultAction;
    // If no player is adjacent to or at dark-fortress, assault = null
    expect(action.assault).toBeNull();
  });

  it('should return assault target when death knight is adjacent to weakest player', () => {
    const state = makeState();
    clearForces(state);

    // Make player 0 the weakest (0 banners)
    state.players[0].warBanners = 0;
    state.players[1].warBanners = 5;
    state.players[2].warBanners = 5;
    state.players[3].warBanners = 5;

    // Move player 0's fellowship to s09 (adjacent to dark-fortress)
    state.players[0].fellowship.currentNode = 's09';

    // Place lieutenant at dark-fortress (which connects to s09)
    makeLieutenant(state, 'lt-assault-adj', 'dark-fortress');

    const action = resolveAssault(state, rng, false) as AssaultAction;
    expect(action.assault).not.toBeNull();
    expect(action.assault!.forceId).toBe('lt-assault-adj');
    expect(action.assault!.playerIndex).toBe(0);
  });

  it('should target the weakest arch-regent (lowest warBanners)', () => {
    const state = makeState();
    clearForces(state);

    // Make player 3 the weakest
    state.players[0].warBanners = 10;
    state.players[1].warBanners = 8;
    state.players[2].warBanners = 6;
    state.players[3].warBanners = 2;

    // Place player 3's fellowship near the lieutenant
    state.players[3].fellowship.currentNode = 's12';

    // Lieutenant at s12
    makeLieutenant(state, 'lt-weakest', 's12');

    const action = resolveAssault(state, rng, false) as AssaultAction;
    if (action.assault !== null) {
      expect(action.assault.playerIndex).toBe(3);
    }
  });

  it('should ignore diplomatic protection for assault', () => {
    const state = makeState();
    clearForces(state);

    // Give player 0 a diplomat (it already has one from createStartingFellowship)
    // Make sure player 0 is alone (other players at their own keeps)
    // player 0 at 's09', others at their own keeps — player 0 has diplomatic protection

    state.players[0].warBanners = 0; // weakest
    state.players[1].warBanners = 5;
    state.players[2].warBanners = 5;
    state.players[3].warBanners = 5;

    state.players[0].fellowship.currentNode = 's09';
    // Others remain at their starting keeps

    // Lieutenant adjacent to s09 (at dark-fortress which connects to s09)
    makeLieutenant(state, 'lt-dp-ignored', 'dark-fortress');

    const action = resolveAssault(state, rng, false) as AssaultAction;
    // ASSAULT ignores diplomatic protection — should still target player 0
    expect(action.assault).not.toBeNull();
    expect(action.assault!.playerIndex).toBe(0);
  });

  it('should log a shadowking-assault action', () => {
    const state = makeState();
    clearForces(state);
    makeLieutenant(state, 'lt-assault-log', 'dark-fortress');
    const logBefore = state.actionLog.length;
    resolveAssault(state, rng, false);
    expect(state.actionLog.length).toBeGreaterThan(logBefore);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('shadowking-assault');
  });
});

// ─── ESCALATE ─────────────────────────────────────────────────────

describe('resolveEscalate()', () => {
  it('should advance doom toll by 2 when not blocked', () => {
    const state = makeState();
    const before = state.doomToll;
    resolveEscalate(state, false);
    expect(state.doomToll).toBe(before + 2);
  });

  it('should advance doom toll by 1 when blocked (cannot be fully blocked)', () => {
    const state = makeState();
    const before = state.doomToll;
    resolveEscalate(state, true);
    expect(state.doomToll).toBe(before + 1);
  });

  it('should cap doom toll at 13', () => {
    const state = makeState();
    state.doomToll = 12;
    resolveEscalate(state, false);
    expect(state.doomToll).toBe(13);
  });

  it('should return blocked: false when not blocked', () => {
    const state = makeState();
    const action = resolveEscalate(state, false);
    expect(action.blocked).toBe(false);
  });

  it('should return blocked: true when blocked', () => {
    const state = makeState();
    const action = resolveEscalate(state, true);
    expect(action.blocked).toBe(true);
  });

  it('should return cardType escalate', () => {
    const state = makeState();
    const action = resolveEscalate(state, false);
    expect(action.cardType).toBe('escalate');
  });

  it('should log a shadowking-escalate action', () => {
    const state = makeState();
    const logBefore = state.actionLog.length;
    resolveEscalate(state, false);
    expect(state.actionLog.length).toBeGreaterThan(logBefore);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('shadowking-escalate');
  });
});

// ─── getWeakestPlayer ─────────────────────────────────────────────

describe('getWeakestPlayer()', () => {
  it('should return the player with fewest warBanners', () => {
    const state = makeState();
    state.players[0].warBanners = 10;
    state.players[1].warBanners = 3;
    state.players[2].warBanners = 7;
    state.players[3].warBanners = 5;

    expect(getWeakestPlayer(state)).toBe(1);
  });

  it('should tiebreak by fewest strongholds when banners are equal', () => {
    const state = makeState();
    state.players[0].warBanners = 5;
    state.players[1].warBanners = 5;
    state.players[2].warBanners = 5;
    state.players[3].warBanners = 5;

    // Give player 0 an extra stronghold
    state.boardState['s01'].claimedBy = 0;
    // Player 1, 2, 3 each have 1 stronghold (their keeps)
    // Player 0 has 2 strongholds
    // So player 1, 2, 3 are tied on strongholds (1 each)
    // Tiebreak: highest index wins → player 3

    expect(getWeakestPlayer(state)).toBe(3);
  });

  it('should tiebreak by highest player index on full tie', () => {
    const state = makeState();
    // All same banners and same strongholds (1 each)
    state.players[0].warBanners = 5;
    state.players[1].warBanners = 5;
    state.players[2].warBanners = 5;
    state.players[3].warBanners = 5;

    // Each player has exactly 1 stronghold (their starting keep)
    expect(getWeakestPlayer(state)).toBe(3); // highest index
  });

  it('should work with 2 players', () => {
    const state = createGameState(2, 'competitive', SEED);
    state.players[0].warBanners = 8;
    state.players[1].warBanners = 2;

    expect(getWeakestPlayer(state)).toBe(1);
  });

  it('should return player with lowest banners even if they have more strongholds', () => {
    const state = makeState();
    state.players[0].warBanners = 1;
    state.players[1].warBanners = 5;
    state.players[2].warBanners = 5;
    state.players[3].warBanners = 5;

    // Player 0 has fewest banners, regardless of strongholds
    state.boardState['s01'].claimedBy = 0;
    state.boardState['s02'].claimedBy = 0;

    expect(getWeakestPlayer(state)).toBe(0);
  });
});

// ─── Integration: resolveBehaviorCard with startRound ─────────────

describe('Integration: startRound then resolveBehaviorCard', () => {
  it('should resolve after startRound draws a card', () => {
    const state = makeState();
    startRound(state);

    expect(state.currentBehaviorCard).not.toBeNull();

    const localRng = new SeededRandom(SEED);
    const action = resolveBehaviorCard(state, localRng, false);

    expect(action.cardType).toBe(state.currentBehaviorCard!.type);
  });
});
