/**
 * Tests for Herald Diplomatic Action System (F-009)
 */

import { describe, it, expect } from 'vitest';
import { createGameState } from '../../src/engine/game-loop.js';
import {
  canPerformDiplomaticAction,
  getEligibleDiplomats,
  isDarkFortressClear,
  performDiplomaticAction,
} from '../../src/systems/herald-diplomacy.js';
import { GameState } from '../../src/models/game-state.js';

/** Helper: create a game state and move a player's fellowship to the dark fortress. */
function setupAtFortress(playerIndex: number = 0): GameState {
  const state = createGameState(4, 'competitive', 42);
  const player = state.players[playerIndex];
  player.fellowship.currentNode = state.boardDefinition.antagonistBase;
  player.actionsRemaining = 2;
  // Move starting lieutenants away from the dark fortress
  for (const force of state.antagonistForces) {
    force.currentNode = 's09';
  }
  return state;
}

describe('isDarkFortressClear', () => {
  it('should return true when no forces at dark fortress', () => {
    const state = setupAtFortress();
    expect(isDarkFortressClear(state)).toBe(true);
  });

  it('should return false when a lieutenant is at dark fortress', () => {
    const state = setupAtFortress();
    state.antagonistForces[0].currentNode = state.boardDefinition.antagonistBase;
    expect(isDarkFortressClear(state)).toBe(false);
  });

  it('should return false when a minion is at dark fortress', () => {
    const state = setupAtFortress();
    state.antagonistForces.push({
      id: 'minion-1',
      type: 'minion',
      powerLevel: 6,
      currentNode: state.boardDefinition.antagonistBase,
    });
    expect(isDarkFortressClear(state)).toBe(false);
  });
});

describe('getEligibleDiplomats', () => {
  it('should return diplomats that have not used their action', () => {
    const state = setupAtFortress();
    const player = state.players[0];
    const eligible = getEligibleDiplomats(player);
    expect(eligible.length).toBe(1);
    expect(eligible[0].role).toBe('diplomat');
    expect(eligible[0].diplomaticActionUsed).toBe(false);
  });

  it('should return empty when diplomat already used action', () => {
    const state = setupAtFortress();
    const player = state.players[0];
    const diplomat = player.fellowship.characters.find(c => c.role === 'diplomat')!;
    diplomat.diplomaticActionUsed = true;
    expect(getEligibleDiplomats(player).length).toBe(0);
  });

  it('should return multiple eligible diplomats', () => {
    const state = setupAtFortress();
    const player = state.players[0];
    // Add a second diplomat
    player.fellowship.characters.push({
      id: 'extra-diplomat',
      role: 'diplomat',
      powerLevel: 0,
      diplomaticActionUsed: false,
    });
    expect(getEligibleDiplomats(player).length).toBe(2);
  });
});

describe('canPerformDiplomaticAction', () => {
  it('should return true when all conditions met', () => {
    const state = setupAtFortress();
    expect(canPerformDiplomaticAction(state.players[0], state)).toBe(true);
  });

  it('should return false when not at dark fortress', () => {
    const state = setupAtFortress();
    state.players[0].fellowship.currentNode = 'keep-0';
    expect(canPerformDiplomaticAction(state.players[0], state)).toBe(false);
  });

  it('should return false when no diplomat in fellowship', () => {
    const state = setupAtFortress();
    state.players[0].fellowship.characters = state.players[0].fellowship.characters
      .filter(c => c.role !== 'diplomat');
    expect(canPerformDiplomaticAction(state.players[0], state)).toBe(false);
  });

  it('should return false when diplomat already used action', () => {
    const state = setupAtFortress();
    const diplomat = state.players[0].fellowship.characters.find(c => c.role === 'diplomat')!;
    diplomat.diplomaticActionUsed = true;
    expect(canPerformDiplomaticAction(state.players[0], state)).toBe(false);
  });

  it('should return false when death knight at dark fortress', () => {
    const state = setupAtFortress();
    state.antagonistForces[0].currentNode = state.boardDefinition.antagonistBase;
    expect(canPerformDiplomaticAction(state.players[0], state)).toBe(false);
  });

  it('should return false when no actions remaining', () => {
    const state = setupAtFortress();
    state.players[0].actionsRemaining = 0;
    expect(canPerformDiplomaticAction(state.players[0], state)).toBe(false);
  });

  it('should return false when player is broken', () => {
    const state = setupAtFortress();
    state.players[0].isBroken = true;
    expect(canPerformDiplomaticAction(state.players[0], state)).toBe(false);
  });
});

describe('performDiplomaticAction', () => {
  it('should reduce doom toll by 1', () => {
    const state = setupAtFortress();
    state.doomToll = 5;
    const diplomatId = state.players[0].fellowship.characters.find(c => c.role === 'diplomat')!.id;
    performDiplomaticAction(state, 0, diplomatId);
    expect(state.doomToll).toBe(4);
  });

  it('should mark diplomat as used', () => {
    const state = setupAtFortress();
    const diplomat = state.players[0].fellowship.characters.find(c => c.role === 'diplomat')!;
    performDiplomaticAction(state, 0, diplomat.id);
    expect(diplomat.diplomaticActionUsed).toBe(true);
  });

  it('should decrement actionsRemaining', () => {
    const state = setupAtFortress();
    const diplomatId = state.players[0].fellowship.characters.find(c => c.role === 'diplomat')!.id;
    performDiplomaticAction(state, 0, diplomatId);
    expect(state.players[0].actionsRemaining).toBe(1);
  });

  it('should log the action', () => {
    const state = setupAtFortress();
    const initialLogLength = state.actionLog.length;
    const diplomatId = state.players[0].fellowship.characters.find(c => c.role === 'diplomat')!.id;
    performDiplomaticAction(state, 0, diplomatId);
    expect(state.actionLog.length).toBe(initialLogLength + 1);
    const lastLog = state.actionLog[state.actionLog.length - 1];
    expect(lastLog.action).toBe('herald-diplomatic-action');
    expect(lastLog.playerIndex).toBe(0);
  });

  it('should return true on success', () => {
    const state = setupAtFortress();
    const diplomatId = state.players[0].fellowship.characters.find(c => c.role === 'diplomat')!.id;
    expect(performDiplomaticAction(state, 0, diplomatId)).toBe(true);
  });

  it('should return false for invalid diplomat ID', () => {
    const state = setupAtFortress();
    expect(performDiplomaticAction(state, 0, 'nonexistent')).toBe(false);
  });

  it('should return false for already-used diplomat', () => {
    const state = setupAtFortress();
    const diplomat = state.players[0].fellowship.characters.find(c => c.role === 'diplomat')!;
    diplomat.diplomaticActionUsed = true;
    expect(performDiplomaticAction(state, 0, diplomat.id)).toBe(false);
  });

  it('should not allow same diplomat to act twice', () => {
    const state = setupAtFortress();
    state.doomToll = 5;
    const diplomatId = state.players[0].fellowship.characters.find(c => c.role === 'diplomat')!.id;
    expect(performDiplomaticAction(state, 0, diplomatId)).toBe(true);
    // Move back to fortress and try again
    state.players[0].actionsRemaining = 2;
    expect(performDiplomaticAction(state, 0, diplomatId)).toBe(false);
    expect(state.doomToll).toBe(4); // Only reduced once
  });

  it('should return false for invalid player index', () => {
    const state = setupAtFortress();
    expect(performDiplomaticAction(state, 99, 'any')).toBe(false);
  });

  it('should return false for non-diplomat character ID', () => {
    const state = setupAtFortress();
    const warrior = state.players[0].fellowship.characters.find(c => c.role === 'warrior')!;
    expect(performDiplomaticAction(state, 0, warrior.id)).toBe(false);
  });

  it('should allow multiple heralds to each use action once', () => {
    const state = setupAtFortress();
    state.doomToll = 5;
    const player = state.players[0];
    player.fellowship.characters.push({
      id: 'extra-diplomat',
      role: 'diplomat',
      powerLevel: 0,
      diplomaticActionUsed: false,
    });

    const diplomat1 = player.fellowship.characters.find(c => c.role === 'diplomat')!;
    expect(performDiplomaticAction(state, 0, diplomat1.id)).toBe(true);
    expect(state.doomToll).toBe(4);

    player.actionsRemaining = 2;
    expect(performDiplomaticAction(state, 0, 'extra-diplomat')).toBe(true);
    expect(state.doomToll).toBe(3);
  });

  it('should not reduce doom toll below 0', () => {
    const state = setupAtFortress();
    state.doomToll = 0;
    const diplomatId = state.players[0].fellowship.characters.find(c => c.role === 'diplomat')!.id;
    performDiplomaticAction(state, 0, diplomatId);
    expect(state.doomToll).toBe(0);
  });
});
