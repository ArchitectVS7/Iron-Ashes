/**
 * Tests for Victory Conditions System (F-010)
 */

import { describe, it, expect } from 'vitest';
import { createGameState } from '../../src/engine/game-loop.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import {
  checkVictoryConditions,
  checkTerritoryVictory,
  applyVictory,
  claimArtifact,
  dropArtifact,
  isArtifactAvailable,
  isGameOver,
} from '../../src/systems/victory.js';
import { DOOM_TOLL_MAX } from '../../src/models/game-state.js';

function makeState(playerCount = 4, seed = 42) {
  return createGameState(playerCount, 'competitive', seed);
}

const rng = new SeededRandom(99);

describe('isGameOver', () => {
  it('should return false initially', () => {
    const state = makeState();
    expect(isGameOver(state)).toBe(false);
  });

  it('should return true after victory applied', () => {
    const state = makeState();
    applyVictory(state, 'doom_complete', null);
    expect(isGameOver(state)).toBe(true);
  });
});

describe('applyVictory', () => {
  it('should set gameEndReason and winner', () => {
    const state = makeState();
    applyVictory(state, 'territory_victory', 2);
    expect(state.gameEndReason).toBe('territory_victory');
    expect(state.winner).toBe(2);
  });

  it('should log the victory', () => {
    const state = makeState();
    const logBefore = state.actionLog.length;
    applyVictory(state, 'all_broken', null);
    expect(state.actionLog.length).toBe(logBefore + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('game-over');
  });
});

describe('claimArtifact', () => {
  it('should succeed when player is at artifact node', () => {
    const state = makeState();
    state.players[0].fellowship.currentNode = state.artifactNode;
    expect(claimArtifact(state, 0)).toBe(true);
    expect(state.artifactHolder).toBe(0);
  });

  it('should fail when player is not at artifact node', () => {
    const state = makeState();
    expect(claimArtifact(state, 0)).toBe(false);
    expect(state.artifactHolder).toBeNull();
  });

  it('should fail for invalid player index', () => {
    const state = makeState();
    expect(claimArtifact(state, 99)).toBe(false);
  });

  it('should log the claim', () => {
    const state = makeState();
    state.players[1].fellowship.currentNode = state.artifactNode;
    const logBefore = state.actionLog.length;
    claimArtifact(state, 1);
    expect(state.actionLog.length).toBe(logBefore + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('claim-artifact');
  });
});

describe('isArtifactAvailable', () => {
  it('should return true when unclaimed and player present', () => {
    const state = makeState();
    state.players[0].fellowship.currentNode = state.artifactNode;
    expect(isArtifactAvailable(state)).toBe(true);
  });

  it('should return false when no player at artifact node', () => {
    const state = makeState();
    expect(isArtifactAvailable(state)).toBe(false);
  });

  it('should return false when already claimed', () => {
    const state = makeState();
    state.players[0].fellowship.currentNode = state.artifactNode;
    state.artifactHolder = 0;
    expect(isArtifactAvailable(state)).toBe(false);
  });

  it('should return false when Dark Fortress is guarded by antagonist forces', () => {
    const state = makeState();
    // Artifact starts at dark-fortress; place a force there
    state.boardState[state.boardDefinition.antagonistBase].antagonistForces = ['lieutenant-1'];
    state.players[0].fellowship.currentNode = state.artifactNode;
    expect(isArtifactAvailable(state)).toBe(false);
  });

  it('should return true when Dark Fortress is unguarded and player present', () => {
    const state = makeState();
    // Artifact at dark-fortress, no forces there, player present
    state.boardState[state.boardDefinition.antagonistBase].antagonistForces = [];
    state.players[0].fellowship.currentNode = state.artifactNode;
    expect(isArtifactAvailable(state)).toBe(true);
  });
});

describe('dropArtifact', () => {
  it('should drop artifact to holder current node', () => {
    const state = makeState();
    state.artifactHolder = 0;
    state.artifactNode = state.boardDefinition.antagonistBase;
    state.players[0].fellowship.currentNode = 's09';
    dropArtifact(state, 0);
    expect(state.artifactHolder).toBeNull();
    expect(state.artifactNode).toBe('s09');
  });

  it('should log the drop', () => {
    const state = makeState();
    state.artifactHolder = 2;
    state.players[2].fellowship.currentNode = 'forge-ne';
    const logBefore = state.actionLog.length;
    dropArtifact(state, 2);
    expect(state.actionLog.length).toBe(logBefore + 1);
    expect(state.actionLog[state.actionLog.length - 1].action).toBe('drop-artifact');
  });

  it('should do nothing for invalid player index', () => {
    const state = makeState();
    state.artifactHolder = 0;
    const nodeBefore = state.artifactNode;
    dropArtifact(state, 99);
    expect(state.artifactHolder).toBe(0);
    expect(state.artifactNode).toBe(nodeBefore);
  });
});

describe('checkTerritoryVictory', () => {
  it('should return null when no one holds artifact', () => {
    const state = makeState();
    expect(checkTerritoryVictory(state, rng)).toBeNull();
  });

  it('should return holder when they have the most strongholds', () => {
    const state = makeState();
    state.artifactHolder = 0;
    // Give player 0 extra strongholds
    state.boardState['s01'].claimedBy = 0;
    state.boardState['s02'].claimedBy = 0;
    expect(checkTerritoryVictory(state, rng)).toBe(0);
  });

  it('should return null when another player has more strongholds', () => {
    const state = makeState();
    state.artifactHolder = 0;
    // Give player 1 more strongholds
    state.boardState['s01'].claimedBy = 1;
    state.boardState['s02'].claimedBy = 1;
    state.boardState['s03'].claimedBy = 1;
    expect(checkTerritoryVictory(state, rng)).toBeNull();
  });

  it('should resolve tiebreak by banners in favor of holder', () => {
    const state = makeState();
    state.artifactHolder = 0;
    // Both have same strongholds (just starting keeps), holder has more banners
    state.players[0].warBanners = 10;
    state.players[1].warBanners = 5;
    expect(checkTerritoryVictory(state, rng)).toBe(0);
  });

  it('should return null when tied player has more banners', () => {
    const state = makeState();
    state.artifactHolder = 0;
    state.players[0].warBanners = 2;
    state.players[1].warBanners = 10;
    // Give player 1 same stronghold count
    // Both start with 1 keep each — they're tied on strongholds
    expect(checkTerritoryVictory(state, rng)).toBeNull();
  });

  it('should favor artifact holder on full tie (artifact is the tiebreaker)', () => {
    const state = makeState();
    state.artifactHolder = 0;
    // All players have equal strongholds (1 keep each) and equal banners
    for (const p of state.players) p.warBanners = 5;
    expect(checkTerritoryVictory(state, rng)).toBe(0);
  });
});

describe('checkVictoryConditions', () => {
  it('should return null when no condition met', () => {
    const state = makeState();
    expect(checkVictoryConditions(state, rng)).toBeNull();
    expect(isGameOver(state)).toBe(false);
  });

  it('should detect doom complete at toll 13', () => {
    const state = makeState();
    state.doomToll = DOOM_TOLL_MAX;
    const result = checkVictoryConditions(state, rng);
    expect(result).toBe('doom_complete');
    expect(state.gameEndReason).toBe('doom_complete');
    expect(state.winner).toBeNull();
  });

  it('should award victory to blood pact holder on doom complete', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.doomToll = DOOM_TOLL_MAX;
    state.players[2].hasBloodPact = true;
    const result = checkVictoryConditions(state, rng);
    expect(result).toBe('doom_complete');
    expect(state.winner).toBe(2);
  });

  it('should not award win to Blood Pact holder if revealed mid-game (win condition converted)', () => {
    const state = createGameState(4, 'blood_pact', 42);
    state.players[0].hasBloodPact = true;
    state.players[0].bloodPactRevealed = true; // convicted mid-game
    state.doomToll = DOOM_TOLL_MAX;
    const rng2 = new SeededRandom(1);
    checkVictoryConditions(state, rng2);
    expect(state.gameEndReason).toBe('doom_complete');
    expect(state.winner).toBeNull();
  });

  it('should detect all broken as draw', () => {
    const state = makeState();
    for (const p of state.players) {
      p.isBroken = true;
    }
    const result = checkVictoryConditions(state, rng);
    expect(result).toBe('all_broken');
    expect(state.winner).toBeNull();
  });

  it('should detect territory victory during cleanup phase', () => {
    const state = makeState();
    state.phase = 'cleanup';
    state.artifactHolder = 1;
    state.boardState['s03'].claimedBy = 1;
    state.boardState['s04'].claimedBy = 1;
    const result = checkVictoryConditions(state, rng);
    expect(result).toBe('territory_victory');
    expect(state.winner).toBe(1);
  });

  it('should not trigger territory victory during action phase', () => {
    const state = makeState();
    state.phase = 'action';
    state.artifactHolder = 1;
    state.boardState['s03'].claimedBy = 1;
    state.boardState['s04'].claimedBy = 1;
    const result = checkVictoryConditions(state, rng);
    expect(result).toBeNull();
    expect(state.gameEndReason).toBeNull();
  });

  it('should not trigger territory victory during shadowking phase', () => {
    const state = makeState();
    // state.phase is 'shadowking' by default
    state.artifactHolder = 0;
    state.boardState['s01'].claimedBy = 0;
    state.boardState['s02'].claimedBy = 0;
    const result = checkVictoryConditions(state, rng);
    expect(result).toBeNull();
    expect(state.gameEndReason).toBeNull();
  });

  it('doom complete has higher priority than all broken', () => {
    const state = makeState();
    state.doomToll = DOOM_TOLL_MAX;
    for (const p of state.players) p.isBroken = true;
    const result = checkVictoryConditions(state, rng);
    expect(result).toBe('doom_complete');
  });

  it('should not re-trigger after game already over', () => {
    const state = makeState();
    applyVictory(state, 'all_broken', null);
    state.doomToll = DOOM_TOLL_MAX; // Would trigger doom_complete otherwise
    const result = checkVictoryConditions(state, rng);
    expect(result).toBe('all_broken'); // Returns existing, doesn't overwrite
  });

  it('should trigger victory immediately when conditions met', () => {
    const state = makeState();
    state.doomToll = DOOM_TOLL_MAX;
    checkVictoryConditions(state, rng);
    expect(state.gameEndReason).toBe('doom_complete');
    expect(isGameOver(state)).toBe(true);
  });
});
