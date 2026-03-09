/**
 * Tests for the Rescue System (F-005)
 *
 * Covers: cost calculation, canRescue validation, rescue execution,
 * stat tracking, self-rescue in Cooperative mode, and query helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRescueCost,
  canRescue,
  canSelfRescue,
  getRescueErrors,
  getRescuableTargets,
  getRescueCostMap,
  rescue,
  selfRescue,
} from '../../src/systems/rescue.js';
import { createGameState } from '../../src/engine/game-loop.js';
import { GameState } from '../../src/models/game-state.js';

// ─── Helpers ──────────────────────────────────────────────────────

function makeState(playerCount: number = 2, mode: 'competitive' | 'cooperative' | 'blood_pact' = 'competitive'): GameState {
  return createGameState(playerCount, mode, 42);
}

function breakPlayer(state: GameState, playerIndex: number, penaltyCards: number = 3): void {
  const p = state.players[playerIndex];
  p.penaltyCards = penaltyCards;
  p.isBroken = true;
  p.actionsRemaining = 1;
}

function setWarBanners(state: GameState, playerIndex: number, banners: number): void {
  state.players[playerIndex].warBanners = banners;
}

// ─── calculateRescueCost ──────────────────────────────────────────

describe('calculateRescueCost()', () => {
  it('costs ceil(penaltyCards / 2) — even penalty count', () => {
    const state = makeState();
    breakPlayer(state, 1, 4);
    expect(calculateRescueCost(state.players[1])).toBe(2);
  });

  it('costs ceil(penaltyCards / 2) — odd penalty count', () => {
    const state = makeState();
    breakPlayer(state, 1, 3);
    expect(calculateRescueCost(state.players[1])).toBe(2);
  });

  it('minimum cost is 1 even for 1 penalty card', () => {
    const state = makeState();
    breakPlayer(state, 1, 1);
    expect(calculateRescueCost(state.players[1])).toBe(1);
  });
});

// ─── getRescueErrors ─────────────────────────────────────────────

describe('getRescueErrors()', () => {
  it('returns empty array for a fully legal rescue', () => {
    const state = makeState();
    breakPlayer(state, 1, 4);
    setWarBanners(state, 0, 10);
    state.players[0].actionsRemaining = 2;
    expect(getRescueErrors(0, 1, state)).toEqual([]);
  });

  it('flags rescuer_is_target when indices match', () => {
    const state = makeState();
    breakPlayer(state, 0, 4);
    expect(getRescueErrors(0, 0, state)).toContain('rescuer_is_target');
  });

  it('flags rescuer_is_broken when rescuer is Broken', () => {
    const state = makeState();
    breakPlayer(state, 0, 4);
    breakPlayer(state, 1, 4);
    setWarBanners(state, 0, 10);
    const errors = getRescueErrors(0, 1, state);
    expect(errors).toContain('rescuer_is_broken');
  });

  it('flags target_not_broken when target is healthy', () => {
    const state = makeState();
    setWarBanners(state, 0, 10);
    state.players[0].actionsRemaining = 2;
    const errors = getRescueErrors(0, 1, state);
    expect(errors).toContain('target_not_broken');
  });

  it('flags insufficient_banners when rescuer cannot pay', () => {
    const state = makeState();
    breakPlayer(state, 1, 6); // cost = 3
    setWarBanners(state, 0, 2);
    state.players[0].actionsRemaining = 2;
    const errors = getRescueErrors(0, 1, state);
    expect(errors).toContain('insufficient_banners');
  });

  it('flags no_actions_remaining when rescuer is out of actions', () => {
    const state = makeState();
    breakPlayer(state, 1, 2); // cost = 1
    setWarBanners(state, 0, 10);
    state.players[0].actionsRemaining = 0;
    const errors = getRescueErrors(0, 1, state);
    expect(errors).toContain('no_actions_remaining');
  });
});

// ─── canRescue ───────────────────────────────────────────────────

describe('canRescue()', () => {
  it('returns true for a valid rescue', () => {
    const state = makeState();
    breakPlayer(state, 1, 4);
    setWarBanners(state, 0, 5);
    state.players[0].actionsRemaining = 2;
    expect(canRescue(0, 1, state)).toBe(true);
  });

  it('returns false when rescuer is also Broken', () => {
    const state = makeState();
    breakPlayer(state, 0, 3);
    breakPlayer(state, 1, 3);
    setWarBanners(state, 0, 5);
    expect(canRescue(0, 1, state)).toBe(false);
  });
});

// ─── rescue() ────────────────────────────────────────────────────

describe('rescue()', () => {
  it('deducts War Banners from rescuer', () => {
    const state = makeState();
    breakPlayer(state, 1, 4); // cost = 2
    setWarBanners(state, 0, 6);
    state.players[0].actionsRemaining = 2;

    rescue(0, 1, state);

    expect(state.players[0].warBanners).toBe(4);
  });

  it('spends one action from the rescuer', () => {
    const state = makeState();
    breakPlayer(state, 1, 4); // cost = 2
    setWarBanners(state, 0, 6);
    state.players[0].actionsRemaining = 2;

    rescue(0, 1, state);

    expect(state.players[0].actionsRemaining).toBe(1);
  });

  it('reduces target penalty cards by the cost', () => {
    const state = makeState();
    breakPlayer(state, 1, 4); // cost = 2
    setWarBanners(state, 0, 6);
    state.players[0].actionsRemaining = 2;

    const result = rescue(0, 1, state);

    expect(state.players[1].penaltyCards).toBe(2);
    expect(result.penaltyCardsRemoved).toBe(2);
  });

  it('clears Broken status when penalty cards fall below warBanners', () => {
    const state = makeState();
    breakPlayer(state, 1, 2); // cost = 1
    setWarBanners(state, 0, 10);
    setWarBanners(state, 1, 5); // 2 penalty < 5 banners → recovers
    state.players[0].actionsRemaining = 2;

    const result = rescue(0, 1, state);

    expect(state.players[1].isBroken).toBe(false);
    expect(result.targetRecovered).toBe(true);
  });

  it('does NOT clear Broken status if penalties remain >= warBanners', () => {
    const state = makeState();
    breakPlayer(state, 1, 6); // cost = 3 → reduces to 3
    setWarBanners(state, 0, 10);
    setWarBanners(state, 1, 2); // 3 penalty >= 2 banners → still broken
    state.players[0].actionsRemaining = 2;

    const result = rescue(0, 1, state);

    expect(state.players[1].isBroken).toBe(true);
    expect(result.targetRecovered).toBe(false);
  });

  it('restores actionsRemaining to 2 on target recovery', () => {
    const state = makeState();
    breakPlayer(state, 1, 2); // cost = 1
    setWarBanners(state, 0, 10);
    setWarBanners(state, 1, 5);
    state.players[0].actionsRemaining = 2;

    rescue(0, 1, state);

    expect(state.players[1].actionsRemaining).toBe(2);
  });

  it('increments rescuedGiven on rescuer and rescuesReceived on target', () => {
    const state = makeState();
    breakPlayer(state, 1, 2);
    setWarBanners(state, 0, 10);
    setWarBanners(state, 1, 5);
    state.players[0].actionsRemaining = 2;

    rescue(0, 1, state);

    expect(state.players[0].stats.rescuesGiven).toBe(1);
    expect(state.players[1].stats.rescuesReceived).toBe(1);
  });

  it('throws if rescue is illegal', () => {
    const state = makeState();
    // target is not Broken
    setWarBanners(state, 0, 10);
    state.players[0].actionsRemaining = 2;
    expect(() => rescue(0, 1, state)).toThrow(/Rescue illegal/);
  });
});

// ─── canSelfRescue / selfRescue ───────────────────────────────────

describe('canSelfRescue()', () => {
  it('returns true in cooperative mode for a Broken player with a Fate Card', () => {
    const state = makeState(2, 'cooperative');
    breakPlayer(state, 0, 3);
    state.players[0].fateCards = [1];
    expect(canSelfRescue(0, state)).toBe(true);
  });

  it('returns false in competitive mode', () => {
    const state = makeState(2, 'competitive');
    breakPlayer(state, 0, 3);
    state.players[0].fateCards = [1];
    expect(canSelfRescue(0, state)).toBe(false);
  });

  it('returns false if player has no Fate Cards', () => {
    const state = makeState(2, 'cooperative');
    breakPlayer(state, 0, 3);
    state.players[0].fateCards = [];
    expect(canSelfRescue(0, state)).toBe(false);
  });
});

describe('selfRescue()', () => {
  it('discards one Fate Card', () => {
    const state = makeState(2, 'cooperative');
    breakPlayer(state, 0, 3);
    state.players[0].fateCards = [1, 2];

    selfRescue(0, state);

    expect(state.players[0].fateCards.length).toBe(1);
  });

  it('removes exactly 1 penalty card', () => {
    const state = makeState(2, 'cooperative');
    breakPlayer(state, 0, 3);
    state.players[0].fateCards = [1];

    selfRescue(0, state);

    expect(state.players[0].penaltyCards).toBe(2);
  });

  it('throws if not cooperative mode', () => {
    const state = makeState(2, 'competitive');
    breakPlayer(state, 0, 3);
    state.players[0].fateCards = [1];
    expect(() => selfRescue(0, state)).toThrow();
  });
});

// ─── Query Helpers ────────────────────────────────────────────────

describe('getRescuableTargets()', () => {
  it('returns indices of all rescuable players', () => {
    const state = makeState(2);
    breakPlayer(state, 1, 2);
    setWarBanners(state, 0, 5);
    state.players[0].actionsRemaining = 2;

    expect(getRescuableTargets(0, state)).toEqual([1]);
  });

  it('returns empty array when no targets are rescuable', () => {
    const state = makeState(2);
    setWarBanners(state, 0, 5);
    state.players[0].actionsRemaining = 2;

    expect(getRescuableTargets(0, state)).toEqual([]);
  });
});

describe('getRescueCostMap()', () => {
  it('maps each Broken player to their individual rescue cost', () => {
    const state = makeState(2);
    breakPlayer(state, 0, 6); // cost = 3
    breakPlayer(state, 1, 2); // cost = 1

    const map = getRescueCostMap(state);

    expect(map.get(0)).toBe(3);
    expect(map.get(1)).toBe(1);
    expect(map.size).toBe(2);
  });

  it('returns empty map when no one is Broken', () => {
    const state = makeState(2);
    expect(getRescueCostMap(state).size).toBe(0);
  });
});
